"""
What-If Scenario Simulation Engine.
Quantifies comparative risk of sowing or harvesting today versus waiting 3 or 5 days.
Enables farmers to see tangible benefits of waiting out a rainstorm.
"""

import datetime
from typing import List
from ..crops.config import CropConfig
from ..schemas.whatif import (
    WhatIfAnalysisRequest,
    WhatIfAnalysisResponse,
    WhatIfScenarioComparison,
)
from ..schemas.sowing import SowingAnalysisRequest
from ..schemas.harvest import HarvestAnalysisRequest
from ..schemas.weather import NormalizedWeatherData
from .sowing_engine import analyze_sowing_risk
from .harvest_engine import analyze_harvest_risk


def analyze_what_if_scenarios(
    req: WhatIfAnalysisRequest,
    weather: NormalizedWeatherData,
    crop: CropConfig,
) -> WhatIfAnalysisResponse:
    daily = weather.daily
    offsets = req.candidate_offsets_days or [0, 3, 5]

    scenarios: List[WhatIfScenarioComparison] = []

    for offset in offsets:
        if offset >= len(daily):
            continue

        target_date = daily[offset].date
        # Approximate 3-day rainfall from offset
        end_idx = min(len(daily), offset + 3)
        window_days = daily[offset:end_idx]
        rain_sum = sum(d.precipitation_sum_mm for d in window_days)

        # Estimate soil moisture based on cumulative rain and default loam retention
        est_moisture = min(92.0, max(38.0, 52.0 + (rain_sum * 1.4)))

        if req.decision_mode == "sowing":
            sow_sub_req = SowingAnalysisRequest(
                latitude=req.latitude,
                longitude=req.longitude,
                crop_name=req.crop_name,
                current_crop_stage=req.current_crop_stage,
                expected_sowing_date=target_date,
                soil_type=req.soil_type,
                irrigation_availability=req.irrigation_availability,
            )
            sub_res = analyze_sowing_risk(sow_sub_req, weather, crop)
            r_score = sub_res.risk_score
            s_score = sub_res.sowing_safety_score
            r_cat = sub_res.risk_category
            action = sub_res.recommended_action
        else:
            harv_sub_req = HarvestAnalysisRequest(
                latitude=req.latitude,
                longitude=req.longitude,
                crop_name=req.crop_name,
                current_crop_stage=req.current_crop_stage,
                expected_harvest_date=target_date,
            )
            sub_res = analyze_harvest_risk(harv_sub_req, weather, crop)
            r_score = sub_res.risk_score
            s_score = sub_res.harvest_safety_score
            r_cat = sub_res.risk_category
            action = sub_res.recommended_action

        # Generate comparative trade-off description
        if offset == 0:
            if r_score > 60:
                trade_en = f"High immediate weather risk ({rain_sum:.1f}mm rain in 72h). Acting today carries elevated threat."
                trade_hi = f"आज कार्य करने पर अत्यधिक मौसम जोखिम ({rain_sum:.1f} मिमी बारिश)। नुकसान की आशंका अधिक।"
            else:
                trade_en = f"Immediate window is clear ({rain_sum:.1f}mm rain). Good opportunity without waiting."
                trade_hi = f"तत्काल खिड़की साफ है ({rain_sum:.1f} मिमी बारिश)। बिना प्रतीक्षा किए कार्य करने का सुगम अवसर।"
        else:
            if r_score < 40:
                trade_en = f"Waiting {offset} days allows storms to clear ({rain_sum:.1f}mm rain). Dramatically safer window."
                trade_hi = f"{offset} दिन प्रतीक्षा करने से मौसम साफ हो जाता है ({rain_sum:.1f} मिमी बारिश)। काफी सुरक्षित खिड़की।"
            elif r_score > 60:
                trade_en = f"Weather deteriorates in {offset} days ({rain_sum:.1f}mm rain). Do not delay until this period."
                trade_hi = f"{offset} दिन बाद मौसम अधिक बिगड़ रहा है ({rain_sum:.1f} मिमी बारिश)। इस समय तक न टालें।"
            else:
                trade_en = f"Moderate conditions in {offset} days ({rain_sum:.1f}mm rain, {est_moisture:.0f}% moisture)."
                trade_hi = f"{offset} दिन बाद सामान्य स्थिति ({rain_sum:.1f} मिमी वर्षा, {est_moisture:.0f}% नमी)।"

        scenarios.append(
            WhatIfScenarioComparison(
                offset_days=offset,
                target_date=target_date,
                risk_score=r_score,
                safety_score=s_score,
                risk_category=r_cat,
                recommended_action=action,
                forecast_rain_window_mm=round(rain_sum, 1),
                soil_moisture_estimate_pct=round(est_moisture, 1),
                rank=0,
                primary_tradeoff_en=trade_en,
                primary_tradeoff_hi=trade_hi,
            )
        )

    # Rank scenarios by lowest risk score (highest safety)
    scenarios.sort(key=lambda s: s.risk_score)
    for r_idx, s in enumerate(scenarios):
        s.rank = r_idx + 1

    best_scenario = scenarios[0]
    today_scenario = next((s for s in scenarios if s.offset_days == 0), best_scenario)

    if best_scenario.offset_days == 0:
        rationale_en = (
            f"Acting today ({today_scenario.target_date}) has the lowest risk ({today_scenario.risk_score}/100). "
            f"No benefit in delaying action as weather is already favorable."
        )
        rationale_hi = (
            f"आज ({today_scenario.target_date}) कार्य करने में सबसे कम जोखिम ({today_scenario.risk_score}/100) है। "
            f"मौसम पहले से अनुकूल है, इसलिए कार्य टालने की आवश्यकता नहीं है।"
        )
    else:
        risk_diff = today_scenario.risk_score - best_scenario.risk_score
        rationale_en = (
            f"Delaying by {best_scenario.offset_days} days to {best_scenario.target_date} reduces risk score by {risk_diff:.0f} points "
            f"(from {today_scenario.risk_score} down to {best_scenario.risk_score}). "
            f"This bypasses heavy rainfall and secures the seedbed/grain quality."
        )
        rationale_hi = (
            f"{best_scenario.offset_days} दिन प्रतीक्षा करके {best_scenario.target_date} को कार्य करने से जोखिम स्कोर {risk_diff:.0f} अंक घट जाता है "
            f"({today_scenario.risk_score} से घटकर {best_scenario.risk_score})। इससे फसल व बीज सुरक्षित रहेंगे।"
        )

    # Restore order by offset days for user clarity
    scenarios.sort(key=lambda s: s.offset_days)

    return WhatIfAnalysisResponse(
        crop_name=crop.name_en,
        decision_mode=req.decision_mode,
        analyzed_date=datetime.date.today().isoformat(),
        scenarios=scenarios,
        recommended_offset_days=best_scenario.offset_days,
        optimal_date=best_scenario.target_date,
        decision_rationale_en=rationale_en,
        decision_rationale_hi=rationale_hi,
    )
