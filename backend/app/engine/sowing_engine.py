"""
Core Sowing Risk Intelligence Engine.
Evaluates post-sowing heavy rain, seed washout, rot, dry spells, and candidate window ranking.
"""

import datetime
from typing import List, Tuple
from ..crops.config import CropConfig
from ..schemas.sowing import (
    SowingAnalysisRequest,
    SowingAnalysisResponse,
    RiskFactor,
    CandidateSowingWindow,
    SeedWashoutRotRisk,
)
from ..schemas.weather import NormalizedWeatherData
from .uncertainty import evaluate_forecast_uncertainty


def analyze_sowing_risk(
    req: SowingAnalysisRequest,
    weather: NormalizedWeatherData,
    crop: CropConfig,
) -> SowingAnalysisResponse:
    daily = weather.daily
    hourly = weather.hourly

    # Determine evaluation start index
    target_idx = 0
    if req.expected_sowing_date:
        for idx, d in enumerate(daily):
            if d.date == req.expected_sowing_date:
                target_idx = idx
                break

    # 1. Evaluate Heavy Rainfall Risk (48h post sowing)
    post_48h_days = daily[target_idx : target_idx + 2]
    rain_48h_sum = sum(d.precipitation_sum_mm for d in post_48h_days)
    max_rain_prob_48h = max((d.precipitation_probability_max_pct or 0.0) for d in post_48h_days) if post_48h_days else 0.0

    risk_factors: List[RiskFactor] = []
    total_risk_score = 0.0

    heavy_threshold = crop.sowing.heavy_rain_risk_threshold_mm
    washout_prob = 0.0
    rot_prob = 0.0

    if rain_48h_sum >= heavy_threshold:
        rain_severity = "CRITICAL"
        rain_pts = min(75.0, 35.0 + (rain_48h_sum - heavy_threshold) * 1.2)
        washout_prob = min(95.0, 50.0 + (rain_48h_sum - heavy_threshold) * 1.5)
        rot_prob = min(90.0, 45.0 + (rain_48h_sum - heavy_threshold) * 1.2)
        desc_en = f"Heavy rainfall ({rain_48h_sum:.1f}mm in 48h) exceeds safe seedbed threshold ({heavy_threshold}mm). Severe seed displacement and furrow rotting risk."
        desc_hi = f"बुवाई के 48 घंटे में भारी बारिश ({rain_48h_sum:.1f} मिमी) बीज सुरक्षा सीमा ({heavy_threshold} मिमी) से अधिक है। बीज बहने व क्यारियों में सड़ने का गंभीर जोखिम।"
    elif rain_48h_sum >= heavy_threshold * 0.6:
        rain_severity = "MODERATE"
        rain_pts = 18.0
        washout_prob = 25.0
        rot_prob = 30.0
        desc_en = f"Moderate rainfall expected ({rain_48h_sum:.1f}mm in 48h). Risk of soil crusting if unseasonal."
        desc_hi = f"मध्यम वर्षा ({rain_48h_sum:.1f} मिमी) का अनुमान। मिट्टी की ऊपरी सतह सख्त (crusting) होने का खतरा।"
    else:
        rain_severity = "SAFE"
        rain_pts = 0.0
        washout_prob = 5.0
        rot_prob = 8.0
        desc_en = f"Clear or light rainfall ({rain_48h_sum:.1f}mm in 48h) ensures secure seedbed stability."
        desc_hi = f"मौसम साफ व वर्षा कम ({rain_48h_sum:.1f} मिमी), बीज के बहने का कोई तात्कालिक खतरा नहीं है।"

    total_risk_score += rain_pts
    risk_factors.append(
        RiskFactor(
            factor_name="Post-Sowing Heavy Rainfall",
            factor_category="HEAVY_RAINFALL",
            severity=rain_severity,
            contribution_pts=round(rain_pts, 1),
            description_en=desc_en,
            description_hi=desc_hi,
        )
    )

    # 2. Evaluate Consecutive Dry Days & Moisture Stress
    post_week = daily[target_idx : target_idx + 7]
    consecutive_dry = 0
    max_consecutive_dry = 0
    for day in post_week:
        if day.precipitation_sum_mm < 2.5:
            consecutive_dry += 1
            max_consecutive_dry = max(max_consecutive_dry, consecutive_dry)
        else:
            consecutive_dry = 0

    dry_tolerable = crop.sowing.max_consecutive_dry_days_tolerable
    if max_consecutive_dry > dry_tolerable:
        if not req.irrigation_availability:
            dry_severity = "CRITICAL"
            dry_pts = 28.0
            desc_dry_en = f"Extended dry spell ({max_consecutive_dry} consecutive dry days) without irrigation will cause seedling desiccation."
            desc_dry_hi = f"लंबे सूखे दिन ({max_consecutive_dry} दिन बिना बारिश) और सिंचाई का अभाव होने से अंकुर सूखने का गंभीर संकट।"
        else:
            dry_severity = "MODERATE"
            dry_pts = 8.0
            desc_dry_en = f"Dry spell forecast ({max_consecutive_dry} days), but mitigated by farmer tubewell/canal irrigation availability."
            desc_dry_hi = f"{max_consecutive_dry} दिन शुष्क मौसम, किंतु किसान के पास नलकूप/नहर सिंचाई उपलब्ध होने से जोखिम नियंत्रित है।"
    else:
        dry_severity = "SAFE"
        dry_pts = 0.0
        desc_dry_en = f"Moisture balance expected within tolerable germination window."
        desc_dry_hi = f"अंकुरण अवधि में नमी व वर्षा का संतुलन सामान्य बना रहेगा।"

    total_risk_score += dry_pts
    risk_factors.append(
        RiskFactor(
            factor_name="Dry Spell & Germination Moisture",
            factor_category="DRY_SPELL",
            severity=dry_severity,
            contribution_pts=round(dry_pts, 1),
            description_en=desc_dry_en,
            description_hi=desc_dry_hi,
        )
    )

    # 3. Soil Temperature Evaluation
    # Extract recent soil temp from hourly or estimate from min/max air temp
    recent_soil_temp = 22.0
    for h in hourly[:24]:
        if h.soil_temperature_0_7cm is not None:
            recent_soil_temp = h.soil_temperature_0_7cm
            break
    else:
        # Fallback approximation: 0.6 * air_min + 0.4 * air_max
        if daily:
            recent_soil_temp = 0.6 * daily[target_idx].temp_min_c + 0.4 * daily[target_idx].temp_max_c

    opt_min_t = crop.sowing.min_soil_temp_c
    opt_max_t = crop.sowing.max_soil_temp_c
    if recent_soil_temp < opt_min_t:
        temp_pts = min(20.0, (opt_min_t - recent_soil_temp) * 3.5)
        temp_sev = "MODERATE" if temp_pts < 12 else "CRITICAL"
        t_en = f"Soil temp ({recent_soil_temp:.1f}°C) is below minimum threshold ({opt_min_t}°C) for {crop.name_en}, slowing germination."
        t_hi = f"मिट्टी का तापमान ({recent_soil_temp:.1f}°C) {crop.name_hi} के न्यूनतम तापमान ({opt_min_t}°C) से कम है, अंकुरण धीमा होगा।"
    elif recent_soil_temp > opt_max_t:
        temp_pts = min(20.0, (recent_soil_temp - opt_max_t) * 3.5)
        temp_sev = "MODERATE" if temp_pts < 12 else "CRITICAL"
        t_en = f"Soil temp ({recent_soil_temp:.1f}°C) exceeds optimal upper limit ({opt_max_t}°C), causing thermal stress."
        t_hi = f"मिट्टी का तापमान ({recent_soil_temp:.1f}°C) {crop.name_hi} की उच्चतम सीमा ({opt_max_t}°C) से अधिक है।"
    else:
        temp_pts = 0.0
        temp_sev = "SAFE"
        t_en = f"Soil temperature ({recent_soil_temp:.1f}°C) is within ideal range ({opt_min_t}–{opt_max_t}°C)."
        t_hi = f"मिट्टी का तापमान ({recent_soil_temp:.1f}°C) आदर्श सीमा ({opt_min_t}–{opt_max_t}°C) में है।"

    total_risk_score += temp_pts
    risk_factors.append(
        RiskFactor(
            factor_name="Soil Germination Temperature",
            factor_category="SOIL_TEMPERATURE",
            severity=temp_sev,
            contribution_pts=round(temp_pts, 1),
            description_en=t_en,
            description_hi=t_hi,
        )
    )

    # 4. Candidate Sowing Windows Ranking across forecast period
    candidate_windows: List[CandidateSowingWindow] = []
    num_windows = max(1, len(daily) - 2)
    for start_i in range(min(num_windows, 10)):
        w_days = daily[start_i : start_i + 3]
        w_rain = sum(d.precipitation_sum_mm for d in w_days)
        w_max_prob = max((d.precipitation_probability_max_pct or 0.0) for d in w_days)

        w_risk = 0.0
        if w_rain > heavy_threshold:
            w_risk += 50.0
        elif w_rain > heavy_threshold * 0.5:
            w_risk += 25.0

        if w_max_prob > 70.0:
            w_risk += 15.0

        w_suitability = max(10.0, min(100.0, 100.0 - w_risk))
        if w_suitability >= 80:
            w_cat = "LOW"
            w_rat_en = f"Clear 3-day dry window ({w_rain:.1f}mm rain expected). Optimal for seedling anchoring."
            w_rat_hi = f"3 दिन शुष्क मौसम ({w_rain:.1f} मिमी बारिश)। बीज की जड़ें पकड़ने के लिए सबसे अनुकूल खिड़की।"
        elif w_suitability >= 55:
            w_cat = "MODERATE"
            w_rat_en = f"Slight rain risk ({w_rain:.1f}mm). Ensure seed treatment and check drainage."
            w_rat_hi = f"हल्की वर्षा की संभावना ({w_rain:.1f} मिमी)। बीज उपचार करें और जल निकासी सुनिश्चित रखें।"
        else:
            w_cat = "HIGH"
            w_rat_en = f"Heavy rain risk ({w_rain:.1f}mm). Sowing not recommended during this period."
            w_rat_hi = f"भारी बारिश की आशंका ({w_rain:.1f} मिमी)। इस अवधि में बुवाई की संस्तुति नहीं है।"

        candidate_windows.append(
            CandidateSowingWindow(
                start_date=w_days[0].date,
                end_date=w_days[-1].date,
                suitability_score=round(w_suitability, 1),
                risk_category=w_cat,
                rank=0,
                rationale_en=w_rat_en,
                rationale_hi=w_rat_hi,
            )
        )

    # Sort candidates by suitability descending
    candidate_windows.sort(key=lambda w: w.suitability_score, reverse=True)
    for r_idx, w in enumerate(candidate_windows):
        w.rank = r_idx + 1

    # 5. Final Categorization & Recommendation Action
    final_risk = min(100.0, max(0.0, total_risk_score))
    safety_score = round(100.0 - final_risk, 1)

    if final_risk <= 30.0:
        recommended_action = "SOW_NOW"
        risk_cat = "LOW"
        exp_en = f"Weather conditions for {crop.name_en} are favorable. Minimal rainfall risk in the next 48 hours ensures safe seed placement without washout."
        exp_hi = f"{crop.name_hi} की बुवाई के लिए मौसम अनुकूल है। अगले 48 घंटे में भारी बारिश का खतरा नहीं है, बीज बहने की संभावना नगण्य है।"
    elif final_risk <= 60.0:
        recommended_action = "CONDITIONAL"
        risk_cat = "MODERATE"
        exp_en = f"Moderate risk detected for {crop.name_en}. Proceed only with treated seeds and ensured field drainage. Monitor upcoming 24-hour weather radar."
        exp_hi = f"{crop.name_hi} के लिए मध्यम जोखिम है। केवल उपचारित बीज और जल निकासी की व्यवस्था होने पर ही बुवाई करें। आगामी 24 घंटे मौसम पर नजर रखें।"
    else:
        recommended_action = "WAIT"
        risk_cat = "VERY_HIGH" if final_risk >= 75.0 else "HIGH"
        exp_en = f"Unsafe sowing conditions! High risk of heavy rain ({rain_48h_sum:.1f}mm) or severe weather leading to seed washout and rot. Wait for candidate window starting {candidate_windows[0].start_date}."
        exp_hi = f"बुवाई के लिए प्रतिकूल मौसम! भारी बारिश ({rain_48h_sum:.1f} मिमी) से बीज बहने व सड़ने का गंभीर जोखिम है। {candidate_windows[0].start_date} से शुरू होने वाली खिड़की की प्रतीक्षा करें।"

    missing_vars = []
    if not hourly or all(h.soil_moisture_0_7cm is None for h in hourly):
        missing_vars.append("soil_moisture_0_7cm (derived from precip baseline)")

    uncertainty = evaluate_forecast_uncertainty(
        forecast_days_available=len(daily),
        target_offset_days=target_idx,
        missing_variables=missing_vars,
        is_stale_cache=weather.is_stale,
    )

    reassess_time = (
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=12)
    ).strftime("%Y-%m-%d %H:%M UTC")

    return SowingAnalysisResponse(
        crop_id=crop.id,
        crop_name_en=crop.name_en,
        crop_name_hi=crop.name_hi,
        recommended_action=recommended_action,
        risk_score=round(final_risk, 1),
        risk_category=risk_cat,
        sowing_safety_score=safety_score,
        candidate_windows=candidate_windows[:5],
        main_risk_factors=risk_factors,
        seed_washout_rot_risk=SeedWashoutRotRisk(
            washout_probability_pct=round(washout_prob, 1),
            rot_probability_pct=round(rot_prob, 1),
            estimated_resowing_cost_inr_per_acre=2400.0 if final_risk > 60 else 0.0,
            protective_guidance_en="Pause drilling if >25mm rain expected. If already sown, open drainage channels at boundary furrows.",
            protective_guidance_hi="यदि भारी बारिश की आशंका हो तो बुवाई रोकें। यदि बुवाई हो चुकी हो तो मेड़ पर जल निकासी नालियां तुरंत खोलें।",
        ),
        suggested_reassessment_time=reassess_time,
        explanation_en=exp_en,
        explanation_hi=exp_hi,
        uncertainty=uncertainty,
        analyzed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )
