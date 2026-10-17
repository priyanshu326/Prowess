"""
Risk Assessment API Router.
Evaluates heat, rainfall/waterlogging, and potential water-stress risks for a farm
combining Open-Meteo forecasts, soil type, irrigation method, crop phenology,
and farmer-reported field observations.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...db import repository
from ...weather.open_meteo import OpenMeteoWeatherProvider
from ...engine.risk_engine import evaluate_all_risks
from ...schemas.smartkisan import SingleRiskAssessment, RiskAssessmentSummary

router = APIRouter(prefix="/api/v1/risk-assessment", tags=["Risk Assessment"])
weather_provider = OpenMeteoWeatherProvider()


@router.get(
    "/{farm_id}",
    response_model=RiskAssessmentSummary,
    summary="Evaluate Heat, Rainfall, and Water-Stress Risks for a Farm",
)
async def get_risk_assessment_for_farm(
    farm_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns heat, rainfall, and potential water-stress risk assessments for the specified farm.
    Combines live Open-Meteo weather forecasts, soil hydrology, crop phenological limits,
    and ground observations with transparent, non-arbitrary confidence ratings.
    """
    farm = repository.get_farm_profile(db, farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm '{farm_id}' was not found. Please register the farm profile via POST /api/v1/farm-profile first.",
        )

    # 1. Fetch latest field observation
    latest_obs_record = repository.get_latest_observation(db, farm_id)
    obs_dict = None
    if latest_obs_record:
        obs_dict = {
            "observation_date": latest_obs_record.observation_date,
            "crop_condition": latest_obs_record.crop_condition,
            "last_irrigation_date": latest_obs_record.last_irrigation_date,
            "last_irrigation_amount_mm": latest_obs_record.last_irrigation_amount_mm,
            "visible_symptoms": latest_obs_record.visible_symptoms or [],
            "soil_surface_status": latest_obs_record.soil_surface_status,
            "farmer_notes": latest_obs_record.farmer_notes,
        }

    # 2. Fetch normalized weather data for farm coordinates
    weather_data = None
    try:
        weather_data = await weather_provider.get_forecast(
            latitude=farm.latitude,
            longitude=farm.longitude,
            forecast_days=7,
        )
    except Exception:
        # Graceful degradation if weather provider unreachable
        weather_data = None

    farm_dict = {
        "farm_id": farm.farm_id,
        "crop_name": farm.crop_name,
        "latitude": farm.latitude,
        "longitude": farm.longitude,
        "soil_type": farm.soil_type,
        "sowing_date": farm.sowing_date,
        "irrigation_method": farm.irrigation_method,
    }

    # 3. Evaluate deterministic risk engine
    assessments, confidence = evaluate_all_risks(
        farm_id=farm_id,
        farm_profile=farm_dict,
        weather_data=weather_data,
        observation=obs_dict,
    )

    # 4. Log assessments to DB for audit history
    for a in assessments:
        try:
            repository.log_risk_assessment(db, a)
        except Exception:
            pass

    # 5. Determine overall headline risk level
    overall_level = "LOW"
    for a in assessments:
        if a.risk_level == "CRITICAL":
            overall_level = "CRITICAL"
            break
        elif a.risk_level == "HIGH" and overall_level != "CRITICAL":
            overall_level = "HIGH"
        elif a.risk_level == "MODERATE" and overall_level not in ["CRITICAL", "HIGH"]:
            overall_level = "MODERATE"

    headlines = {
        "CRITICAL": ("Critical Agronomic Risk Alert", "अति संवेदनशील कृषि जोखिम चेतावनी"),
        "HIGH": ("High Agronomic Caution Advisory", "उच्च कृषि सतर्कता सलाह"),
        "MODERATE": ("Moderate Weather Impact Advisory", "मध्यम मौसम प्रभाव - निगरानी सलाह"),
        "LOW": ("Favorable Growing Conditions", "फसल बढ़वार हेतु अनुकूल मौसम"),
    }
    hl_en, hl_hi = headlines.get(overall_level, ("Favorable Growing Conditions", "अनुकूल मौसम"))

    return RiskAssessmentSummary(
        status="success",
        farm_id=farm_id,
        crop=assessments[0].crop,
        growth_stage=assessments[0].growth_stage,
        days_after_sowing=assessments[0].days_after_sowing,
        overall_risk_level=overall_level,
        summary_headline=hl_en,
        summary_headline_hi=hl_hi,
        assessments=assessments,
        confidence=confidence,
        generated_at=assessments[0].generated_at,
    )
