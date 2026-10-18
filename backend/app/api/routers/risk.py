"""
Agricultural Risk Assessment API Router.
Evaluates Heat Stress, Rainfall/Waterlogging, and Potential Water-Stress Deficit
using transparent rule-based agronomic logic, Open-Meteo weather forecasts,
soil type hydrology, and farmer field observations.
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...db import repository
from ...schemas.smartkisan import RiskAssessmentSummary
from ...engine.risk_engine import evaluate_all_risks
from ...weather.open_meteo import OpenMeteoWeatherProvider

router = APIRouter(prefix="/api/v1/risk-assessment", tags=["Risk Assessment"])
weather_provider = OpenMeteoWeatherProvider()


@router.get(
    "/{farm_id}",
    response_model=RiskAssessmentSummary,
    summary="Get Multi-Factor Risk Assessment for a Farm",
)
async def get_risk_assessment_for_farm(
    farm_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns heat, rainfall, and potential water-stress risk assessments for the specified farm.
    Combines:
    1. Farm profile (crop, sowing date, soil type, irrigation method, GPS coordinates)
    2. Latest farmer observation (condition, last irrigation, symptoms, topsoil status)
    3. Open-Meteo atmospheric and precipitation forecast
    4. ICAR/CRIDA crop-specific biological thresholds and soil hydrology
    """
    farm = repository.get_farm_profile(db, farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm '{farm_id}' not found. Please register the farm profile via POST /api/v1/farm-profile first.",
        )

    # Fetch latest farmer observation
    latest_obs = repository.get_latest_observation(db, farm_id)
    obs_dict = None
    if latest_obs:
        obs_dict = {
            "observation_date": latest_obs.observation_date,
            "crop_condition": latest_obs.crop_condition,
            "last_irrigation_date": latest_obs.last_irrigation_date,
            "last_irrigation_amount_mm": latest_obs.last_irrigation_amount_mm,
            "visible_symptoms": latest_obs.visible_symptoms or [],
            "soil_surface_status": latest_obs.soil_surface_status,
            "farmer_notes": latest_obs.farmer_notes,
        }

    # Fetch weather forecast with graceful degradation
    weather_data = None
    try:
        weather_data = await weather_provider.get_forecast(
            latitude=farm.latitude,
            longitude=farm.longitude,
            forecast_days=7,
        )
    except Exception as e:
        # Weather service failure is caught and passed as None; risk engine handles degradation gracefully
        pass

    farm_dict = {
        "farm_id": farm.farm_id,
        "farmer_name": farm.farmer_name,
        "crop_name": farm.crop_name,
        "latitude": farm.latitude,
        "longitude": farm.longitude,
        "soil_type": farm.soil_type,
        "sowing_date": farm.sowing_date,
        "irrigation_method": farm.irrigation_method,
        "field_area_acres": farm.field_area_acres,
    }

    assessments, confidence = evaluate_all_risks(
        farm_id=farm.farm_id,
        farm_profile=farm_dict,
        weather_data=weather_data,
        observation=obs_dict,
    )

    # Log assessments to DB for auditing
    for item in assessments:
        try:
            repository.log_risk_assessment(db, item)
        except Exception:
            pass

    # Overall risk level determination
    risk_priority = {"CRITICAL": 4, "HIGH": 3, "MODERATE": 2, "LOW": 1}
    highest_level = "LOW"
    for a in assessments:
        if risk_priority.get(a.risk_level, 1) > risk_priority.get(highest_level, 1):
            highest_level = a.risk_level

    crop_title = farm.crop_name.capitalize()
    growth_stage = assessments[0].growth_stage if assessments else "Vegetative"
    das = assessments[0].days_after_sowing if assessments else 0

    if highest_level == "CRITICAL":
        headline = f"CRITICAL ALERT: Urgent intervention required for {crop_title} ({growth_stage})."
        headline_hi = f"अति संवेदनशील चेतावनी: {crop_title} ({growth_stage}) के लिए तुरंत आवश्यक कदम उठाएं।"
    elif highest_level == "HIGH":
        headline = f"HIGH RISK: Elevated agronomic stress detected for {crop_title} ({growth_stage})."
        headline_hi = f"उच्च जोखिम: {crop_title} ({growth_stage}) के लिए सावधानी बरतने की सलाह।"
    elif highest_level == "MODERATE":
        headline = f"MODERATE: Approaching operational thresholds for {crop_title} ({growth_stage})."
        headline_hi = f"मध्यम जोखिम: {crop_title} ({growth_stage}) की स्थिति सामान्य, निगरानी रखें।"
    else:
        headline = f"FAVORABLE: Optimal agronomic conditions for {crop_title} ({growth_stage})."
        headline_hi = f"अनुकूल मौसम: {crop_title} ({growth_stage}) के लिए स्थिति पूरी तरह सुरक्षित है।"

    return RiskAssessmentSummary(
        status="success",
        farm_id=farm.farm_id,
        crop=crop_title,
        growth_stage=growth_stage,
        days_after_sowing=das,
        overall_risk_level=highest_level,
        summary_headline=headline,
        summary_headline_hi=headline_hi,
        assessments=assessments,
        confidence=confidence,
        generated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )
