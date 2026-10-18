"""
Actionable Recommendations API Router.
Generates prioritized, explainable advice and optional multilingual
AI explanations for a registered farm.
"""

import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...db import repository
from ...schemas.smartkisan import RecommendationsResponse
from ...engine.risk_engine import evaluate_all_risks
from ...engine.recommendations import generate_actionable_recommendations
from ...engine.ai_explanation import generate_deterministic_explanation, generate_gemini_explanation
from ...weather.open_meteo import OpenMeteoWeatherProvider

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])
weather_provider = OpenMeteoWeatherProvider()


@router.get(
    "/{farm_id}",
    response_model=RecommendationsResponse,
    summary="Generate Actionable Agronomic Recommendations",
)
async def get_recommendations_for_farm(
    farm_id: str,
    lang: str = Query(default="hi", description="Preferred explanation language (hi or en)"),
    use_ai: bool = Query(default=True, description="Attempt optional Gemini explanation if key available"),
    db: Session = Depends(get_db),
):
    """
    Generates actionable, explainable agronomic recommendations.
    Includes:
    - Prioritized action steps (with timing window and cost/resource impact)
    - Deterministic multilingual summary (Hindi and English)
    - Optional Gemini AI conversational explanation strictly grounded in validated findings
    """
    farm = repository.get_farm_profile(db, farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm '{farm_id}' not found. Please register via POST /api/v1/farm-profile first.",
        )

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

    weather_data = None
    try:
        weather_data = await weather_provider.get_forecast(
            latitude=farm.latitude,
            longitude=farm.longitude,
            forecast_days=7,
        )
    except Exception:
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

    recommendations = generate_actionable_recommendations(
        farm_id=farm.farm_id,
        farm_profile=farm_dict,
        risk_assessments=assessments,
    )

    crop_title = farm.crop_name.capitalize()
    growth_stage = assessments[0].growth_stage if assessments else "Vegetative"
    das = assessments[0].days_after_sowing if assessments else 0

    multilingual_summary = generate_deterministic_explanation(
        crop_name=crop_title,
        growth_stage=growth_stage,
        risk_assessments=assessments,
        recommendations=recommendations,
    )

    ai_explanation: Optional[str] = None
    ai_status = "deterministic_fallback"

    if use_ai:
        ai_result = await generate_gemini_explanation(
            farm_id=farm.farm_id,
            crop_name=crop_title,
            growth_stage=growth_stage,
            risk_assessments=assessments,
            recommendations=recommendations,
            lang=lang,
        )
        if ai_result:
            ai_explanation = ai_result
            ai_status = "active_gemini"

    return RecommendationsResponse(
        status="success",
        farm_id=farm.farm_id,
        crop=crop_title,
        growth_stage=growth_stage,
        days_after_sowing=das,
        recommendations=recommendations,
        multilingual_summary=multilingual_summary,
        ai_explanation=ai_explanation,
        ai_layer_status=ai_status,
        confidence=confidence,
        generated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )
