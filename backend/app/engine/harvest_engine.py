"""
Core Harvest Risk Intelligence Engine.
Evaluates wet weather impact on harvesting, grain quality decay, combine machinery trafficability,
and prevents false early harvesting of immature crops.
"""

import datetime
from typing import List, Dict, Any, Tuple
from ..crops.config import CropConfig
from ..schemas.harvest import (
    HarvestAnalysisRequest,
    HarvestAnalysisResponse,
    CandidateHarvestWindow,
    GrainQualityRisk,
    FieldAccessRisk,
)
from ..schemas.weather import NormalizedWeatherData
from .uncertainty import evaluate_forecast_uncertainty


def analyze_harvest_risk(
    req: HarvestAnalysisRequest,
    weather: NormalizedWeatherData,
    crop: CropConfig,
) -> HarvestAnalysisResponse:
    daily = weather.daily
    hourly = weather.hourly

    # Determine evaluation target index
    target_idx = 0
    if req.expected_harvest_date:
        for idx, d in enumerate(daily):
            if d.date == req.expected_harvest_date:
                target_idx = idx
                break

    # 1. Maturity Stage Verification (Critical: Never recommend harvesting immature crops)
    normalized_stage = req.current_crop_stage.lower().strip()
    is_mature = normalized_stage in [s.lower() for s in crop.harvesting.mature_stages]

    maturity_warning = None
    if not is_mature:
        maturity_warning = (
            f"Crop is currently in '{req.current_crop_stage}' stage. It has not reached physiological maturity. "
            f"Harvesting now will cause severe yield loss (up to 35%), wrinkled grains, and heavy moisture penalties at the Mandi. "
            f"Mature stages for {crop.name_en} are: {', '.join(crop.harvesting.mature_stages)}."
        )

    # 2. Immediate 72-Hour Harvest Window Weather Analysis
    harvest_window_days = daily[target_idx : target_idx + 3]
    rain_72h_sum = sum(d.precipitation_sum_mm for d in harvest_window_days)
    max_rain_prob_72h = (
        max((d.precipitation_probability_max_pct or 0.0) for d in harvest_window_days)
        if harvest_window_days
        else 0.0
    )
    mean_rh_72h = (
        sum((d.relative_humidity_mean_pct or 60.0) for d in harvest_window_days) / len(harvest_window_days)
        if harvest_window_days
        else 60.0
    )
    max_wind_72h = (
        max(d.wind_speed_max_kmh for d in harvest_window_days)
        if harvest_window_days
        else 12.0
    )
    max_gust_72h = (
        max((d.wind_gusts_max_kmh or d.wind_speed_max_kmh * 1.3) for d in harvest_window_days)
        if harvest_window_days
        else 15.0
    )

    # Count consecutive wet days in the window
    consecutive_wet_days = 0
    current_wet_streak = 0
    for d in harvest_window_days:
        if d.precipitation_sum_mm >= 2.5:
            current_wet_streak += 1
            consecutive_wet_days = max(consecutive_wet_days, current_wet_streak)
        else:
            current_wet_streak = 0

    risk_factors: List[Dict[str, Any]] = []
    total_risk_score = 0.0

    # Risk Factor A: Wet Weather & Precipitation
    max_safe_rain = crop.harvesting.max_safe_rain_window_mm
    if rain_72h_sum > max_safe_rain * 3.0:
        rain_pts = min(40.0, 20.0 + (rain_72h_sum - max_safe_rain) * 1.2)
        rain_sev = "CRITICAL"
        r_desc_en = f"High rainfall ({rain_72h_sum:.1f}mm in 72h) will soak standing crops and saturate threshing floors."
        r_desc_hi = f"72 घंटे में तेज बारिश ({rain_72h_sum:.1f} मिमी) से खड़ी फसल भीगने व खलिहान में दाना खराब होने का भारी जोखिम।"
    elif rain_72h_sum > max_safe_rain:
        rain_pts = 18.0
        rain_sev = "MODERATE"
        r_desc_en = f"Rain forecast ({rain_72h_sum:.1f}mm) exceeds safe harvest threshold ({max_safe_rain:.1f}mm). Grain drying impaired."
        r_desc_hi = f"वर्षा अनुमान ({rain_72h_sum:.1f} मिमी) कटाई की सुरक्षित सीमा ({max_safe_rain:.1f} मिमी) से अधिक है।"
    else:
        rain_pts = 0.0
        rain_sev = "SAFE"
        r_desc_en = f"Dry conditions forecast ({rain_72h_sum:.1f}mm rain in 72h). Safe for cutting and threshing."
        r_desc_hi = f"मौसम पूरी तरह शुष्क ({rain_72h_sum:.1f} मिमी बारिश)। कटाई व गहाई हेतु उत्तम।"

    total_risk_score += rain_pts
    risk_factors.append({
        "factor_name": "Harvest Window Rainfall",
        "severity": rain_sev,
        "contribution_pts": round(rain_pts, 1),
        "description_en": r_desc_en,
        "description_hi": r_desc_hi,
    })

    # Risk Factor B: Relative Humidity & Drying Capability
    safe_rh = crop.harvesting.max_safe_rh_pct
    if mean_rh_72h > safe_rh + 15:
        rh_pts = 25.0
        rh_sev = "CRITICAL"
        rh_desc_en = f"Very high relative humidity ({mean_rh_72h:.0f}%) promotes rapid fungal mold, black point, and grain discoloration."
        rh_desc_hi = f"अत्यधिक नमी ({mean_rh_72h:.0f}%) के कारण दानों पर फफूंद, कालापन व चमक खत्म होने का खतरा।"
    elif mean_rh_72h > safe_rh:
        rh_pts = 12.0
        rh_sev = "MODERATE"
        rh_desc_en = f"Elevated relative humidity ({mean_rh_72h:.0f}%) slows down natural field drying."
        rh_desc_hi = f"हवा में अधिक नमी ({mean_rh_72h:.0f}%) होने से फसल का प्राकृतिक सूखापन धीमा रहेगा।"
    else:
        rh_pts = 0.0
        rh_sev = "SAFE"
        rh_desc_en = f"Optimal atmospheric drying conditions ({mean_rh_72h:.0f}% RH)."
        rh_desc_hi = f"हवा में आदर्श शुष्कता ({mean_rh_72h:.0f}% RH), दाना जल्दी सूखेगा।"

    total_risk_score += rh_pts
    risk_factors.append({
        "factor_name": "Relative Humidity & Grain Mold Risk",
        "severity": rh_sev,
        "contribution_pts": round(rh_pts, 1),
        "description_en": rh_desc_en,
        "description_hi": rh_desc_hi,
    })

    # Risk Factor C: Wind Gust & Lodging Risk
    safe_gust = crop.harvesting.max_safe_wind_gust_kmh
    if max_gust_72h > safe_gust * 1.3:
        wind_pts = 20.0
        wind_sev = "CRITICAL"
        w_desc_en = f"Severe wind gusts ({max_gust_72h:.1f} km/h) risk flattening (lodging) mature crop and shattering grains."
        w_desc_hi = f"तेज आंधी/झोंके ({max_gust_72h:.1f} किमी/घंटा) से पकी फसल गिरने (lodging) और बालियों से दाना झड़ने का खतरा।"
    elif max_gust_72h > safe_gust:
        wind_pts = 10.0
        wind_sev = "MODERATE"
        w_desc_en = f"Breezy conditions ({max_gust_72h:.1f} km/h gusts). Check crop stance before combine entry."
        w_desc_hi = f"हवा की गति सामान्य से अधिक ({max_gust_72h:.1f} किमी/घंटा)। कंबाइन चलाने से पहले फसल की स्थिति जांचें।"
    else:
        wind_pts = 0.0
        wind_sev = "SAFE"
        w_desc_en = f"Calm winds ({max_gust_72h:.1f} km/h gusts), minimal mechanical damage risk."
        w_desc_hi = f"शांत हवा ({max_gust_72h:.1f} किमी/घंटा), फसल गिरने का कोई डर नहीं।"

    total_risk_score += wind_pts
    risk_factors.append({
        "factor_name": "Wind Gust & Lodging Risk",
        "severity": wind_sev,
        "contribution_pts": round(wind_pts, 1),
        "description_en": w_desc_en,
        "description_hi": w_desc_hi,
    })

    # 3. Grain Quality & Moisture Impact Assessment
    safe_moist_limit = crop.harvesting.safe_grain_moisture_max_pct
    if rain_72h_sum > 10.0 or mean_rh_72h > 80:
        expected_moist = min(22.0, safe_moist_limit + 5.5)
        mold_risk = "SEVERE"
        mandi_discount = 250.0  # INR per quintal moisture deduction
        q_en = "High moisture grains face severe Mandi deductions (₹200-300/qtl) or outright rejection by procurement agencies."
        q_hi = "अधिक नमी वाले अनाज पर मंडी में भारी कटौती (₹200-300/क्विंटल) या खरीद एजेंसियों द्वारा अस्वीकृति का खतरा।"
    elif rain_72h_sum > 2.0 or mean_rh_72h > safe_rh:
        expected_moist = safe_moist_limit + 2.0
        mold_risk = "MODERATE"
        mandi_discount = 90.0
        q_en = "Moderate moisture. Sun dry grains for 24-48 hours on canvas sheets before bagging."
        q_hi = "मध्यम नमी। बोरियों में भरने से पहले तिरपाल पर 24-48 घंटे धूप में सुखाएं।"
    else:
        expected_moist = max(8.0, safe_moist_limit - 1.5)
        mold_risk = "MINIMAL"
        mandi_discount = 0.0
        q_en = f"Excellent dry grain quality. Expected moisture ({expected_moist:.1f}%) meets FCI/Mandi Grade-A standards."
        q_hi = f"उत्कृष्ट दाना गुणवत्ता। नमी ({expected_moist:.1f}%) ग्रेड-ए मंडी मानकों के पूर्णतः अनुकूल है।"

    grain_quality_risk = GrainQualityRisk(
        expected_grain_moisture_pct=round(expected_moist, 1),
        safe_storage_moisture_limit_pct=safe_moist_limit,
        mold_and_discoloration_risk=mold_risk,
        estimated_mandi_discount_inr_per_quintal=mandi_discount,
        quality_guidance_en=q_en,
        quality_guidance_hi=q_hi,
    )

    # 4. Field Access & Combine Harvester Trafficability
    if rain_72h_sum > 15.0 or consecutive_wet_days >= 2:
        trafficability = "POOR_COMBINE_SINK_RISK"
        lodging = "HIGH" if max_gust_72h > safe_gust else "MEDIUM"
        access_en = "Field soil is heavily saturated. Heavy combine harvesters risk tyre sinking, deep rutting, and chassis bogging."
        access_hi = "खेत में अत्यधिक कीचड़/नमी है। भारी कंबाइन हार्वेस्टर के पहिये धंसने और खेत खराब होने का गंभीर जोखिम।"
    elif rain_72h_sum > 3.0:
        trafficability = "MARGINAL"
        lodging = "MEDIUM"
        access_en = "Field damp. Test perimeter with tractor before engaging full combine harvester."
        access_hi = "खेत में हल्की नमी। पूरी कंबाइन ले जाने से पहले मेड़ के पास मिट्टी की मजबूती जांच लें।"
    else:
        trafficability = "GOOD"
        lodging = "LOW"
        access_en = "Firm ground. Smooth movement for combine harvesters, tractors, and grain trolleys."
        access_hi = "मिट्टी मजबूत व सूखी। कंबाइन, ट्रैक्टर व ट्रॉली के आवागमन के लिए बिल्कुल सुगम।"

    field_access_risk = FieldAccessRisk(
        machinery_trafficability=trafficability,
        lodging_risk=lodging,
        access_guidance_en=access_en,
        access_guidance_hi=access_hi,
    )

    # 5. Candidate Harvest Windows Ranking (3-day windows over forecast)
    candidate_windows: List[CandidateHarvestWindow] = []
    num_windows = max(1, len(daily) - 2)
    for start_i in range(min(num_windows, 10)):
        w_days = daily[start_i : start_i + 3]
        w_rain = sum(d.precipitation_sum_mm for d in w_days)
        w_dry_count = sum(1 for d in w_days if d.precipitation_sum_mm < 1.0)
        w_mean_rh = sum((d.relative_humidity_mean_pct or 60.0) for d in w_days) / len(w_days)

        w_penalty = (w_rain * 6.0) + (max(0.0, w_mean_rh - safe_rh) * 1.2)
        w_score = max(10.0, min(100.0, 100.0 - w_penalty))

        if w_score >= 80:
            w_cat = "LOW"
            w_rat_en = f"Optimal {w_dry_count} consecutive dry days with clear skies. Maximum grain weight preservation."
            w_rat_hi = f"{w_dry_count} लगातार सूखे दिन व खिली धूप। कटाई व त्वरित गहाई के लिए सर्वोत्तम अवसर।"
        elif w_score >= 55:
            w_cat = "MODERATE"
            w_rat_en = f"Acceptable window ({w_rain:.1f}mm rain, {w_mean_rh:.0f}% RH). Ensure tarpaulin protection ready."
            w_rat_hi = f"मध्यम खिड़की ({w_rain:.1f} मिमी बारिश, {w_mean_rh:.0f}% नमी)। तिरपाल का प्रबंध रखें।"
        else:
            w_cat = "HIGH"
            w_rat_en = f"High wet risk ({w_rain:.1f}mm rain, {w_mean_rh:.0f}% RH). Avoid harvesting."
            w_rat_hi = f"अधिक नमी व बारिश का जोखिम ({w_rain:.1f} मिमी बारिश)। कटाई टालना सुरक्षित रहेगा।"

        candidate_windows.append(
            CandidateHarvestWindow(
                start_date=w_days[0].date,
                end_date=w_days[-1].date,
                consecutive_dry_days=w_dry_count,
                drying_rh_mean_pct=round(w_mean_rh, 1),
                suitability_score=round(w_score, 1),
                risk_category=w_cat,
                rank=0,
                rationale_en=w_rat_en,
                rationale_hi=w_rat_hi,
            )
        )

    candidate_windows.sort(key=lambda w: w.suitability_score, reverse=True)
    for r_idx, w in enumerate(candidate_windows):
        w.rank = r_idx + 1

    # 6. Overall Recommended Action & Explanations
    final_risk = min(100.0, max(0.0, total_risk_score))
    safety_score = round(100.0 - final_risk, 1)

    if not is_mature:
        recommended_action = "MONITOR"
        risk_cat = "MODERATE" if final_risk <= 50 else "HIGH"
        exp_en = (
            f"Do NOT harvest now. {crop.name_en} is in '{req.current_crop_stage}' stage and needs more time to reach full maturity. "
            f"Wait until grain physiological maturity before cutting."
        )
        exp_hi = (
            f"अभी कटाई बिल्कुल न करें! फसल अभी '{req.current_crop_stage}' अवस्था में है और पकी नहीं है। "
            f"समय से पहले कटाई करने से दाने सिकुड़ जाएंगे और वजन कम होगा।"
        )
    elif final_risk <= 30.0:
        recommended_action = "HARVEST_IF_MATURE"
        risk_cat = "LOW"
        exp_en = (
            f"Golden window for harvesting {crop.name_en}! Weather is dry ({rain_72h_sum:.1f}mm) with good field trafficability. "
            f"Proceed with combine harvesting and direct threshing."
        )
        exp_hi = (
            f"{crop.name_hi} की कटाई के लिए सुनहरा अवसर! मौसम शुष्क ({rain_72h_sum:.1f} मिमी) व खेत की जमीन मजबूत है। "
            f"कंबाइन हार्वेस्टर से कटाई व गहाई तुरंत संपन्न करें।"
        )
    elif final_risk <= 60.0:
        recommended_action = "WAIT_FOR_DRY_WINDOW"
        risk_cat = "MODERATE"
        exp_en = (
            f"Marginal harvest weather. Rain threat ({rain_72h_sum:.1f}mm) risks grain dampness and mandi price cut. "
            f"Prefer candidate dry window starting {candidate_windows[0].start_date}."
        )
        exp_hi = (
            f"कटाई हेतु मौसम में जोखिम है। हल्की बारिश ({rain_72h_sum:.1f} मिमी) से दाने में नमी और मंडी में भाव घटने का खतरा है। "
            f"{candidate_windows[0].start_date} से शुरू होने वाली खिड़की में कटाई करना बेहतर होगा।"
        )
    else:
        recommended_action = "WAIT_FOR_DRY_WINDOW"
        risk_cat = "VERY_HIGH" if final_risk >= 75 else "HIGH"
        exp_en = (
            f"Adverse wet weather! Heavy rain ({rain_72h_sum:.1f}mm) and high humidity will cause severe mold and machinery sinking. "
            f"Wait for weather clearing window starting {candidate_windows[0].start_date}."
        )
        exp_hi = (
            f"खराब मौसम की चेतावनी! तेज बारिश ({rain_72h_sum:.1f} मिमी) और नमी से कंबाइन धंसने व दाने काले पड़ने का खतरा है। "
            f"मौसम खुलने की प्रतीक्षा करें ({candidate_windows[0].start_date} से)।"
        )

    missing_vars = []
    uncertainty = evaluate_forecast_uncertainty(
        forecast_days_available=len(daily),
        target_offset_days=target_idx,
        missing_variables=missing_vars,
        is_stale_cache=weather.is_stale,
    )

    reassess_time = (
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=12)
    ).strftime("%Y-%m-%d %H:%M UTC")

    return HarvestAnalysisResponse(
        crop_id=crop.id,
        crop_name_en=crop.name_en,
        crop_name_hi=crop.name_hi,
        recommended_action=recommended_action,
        risk_score=round(final_risk, 1),
        risk_category=risk_cat,
        harvest_safety_score=safety_score,
        is_crop_mature=is_mature,
        maturity_stage_evaluated=req.current_crop_stage,
        maturity_warning=maturity_warning,
        candidate_windows=candidate_windows[:5],
        grain_quality_risk=grain_quality_risk,
        field_access_risk=field_access_risk,
        main_risk_factors=risk_factors,
        suggested_reassessment_time=reassess_time,
        explanation_en=exp_en,
        explanation_hi=exp_hi,
        uncertainty=uncertainty,
        analyzed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )
