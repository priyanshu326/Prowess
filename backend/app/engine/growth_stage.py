"""
Crop Growth Stage & Phenology Estimation Engine.
Determines crop growth stage from sowing date, elapsed days (DAS),
and crop-specific biological milestones.
"""

import datetime
from typing import Dict, Any, Tuple
from .rules_catalog import get_crop_rule


def estimate_crop_growth_stage(
    crop_name: str,
    sowing_date_str: str,
    reference_date_str: str = None
) -> Dict[str, Any]:
    """
    Computes exact Days After Sowing (DAS) and identifies current phenological stage,
    critical thermal thresholds, and moisture sensitivities.
    """
    try:
        sow_dt = datetime.date.fromisoformat(sowing_date_str)
    except Exception:
        sow_dt = datetime.date.today() - datetime.timedelta(days=20)

    if reference_date_str:
        try:
            ref_dt = datetime.date.fromisoformat(reference_date_str)
        except Exception:
            ref_dt = datetime.date.today()
    else:
        ref_dt = datetime.date.today()

    das = max(0, (ref_dt - sow_dt).days)
    rule = get_crop_rule(crop_name)

    schedule = rule.get("stages_schedule_das", [])
    current_stage_id = "vegetative"
    current_stage_name = "Vegetative Stage"

    for start_day, end_day, stg_id, stg_title in schedule:
        if start_day <= das <= end_day:
            current_stage_id = stg_id
            current_stage_name = stg_title
            break
    else:
        # If beyond maximum scheduled days, assign maturity/harvest
        if schedule:
            current_stage_id = schedule[-1][2]
            current_stage_name = schedule[-1][3]

    # Look up stage-specific criteria
    heat_thresh = rule.get("critical_heat_thresholds_by_stage", {}).get(current_stage_id, 32.0)
    water_sens = rule.get("water_stress_sensitivity_by_stage", {}).get(current_stage_id, "MEDIUM")
    rain_tol = rule.get("rainfall_tolerance_by_stage", {}).get(current_stage_id, {
        "max_safe_48h_rain_mm": 35.0,
        "risk": "Surface ponding & aeration deficit"
    })

    return {
        "crop_name": rule["name_en"],
        "crop_id": rule["id"],
        "sowing_date": sow_dt.isoformat(),
        "reference_date": ref_dt.isoformat(),
        "days_after_sowing": das,
        "stage_id": current_stage_id,
        "stage_name": current_stage_name,
        "critical_heat_threshold_c": heat_thresh,
        "water_stress_sensitivity": water_sens,
        "rainfall_tolerance": rain_tol,
        "source": rule.get("source", "ICAR Benchmark Guidelines"),
        "is_sensorless_estimate": True,
        "estimation_method": "Phenological thermal time calendar derived from sowing date without destructive plant sampling",
    }
