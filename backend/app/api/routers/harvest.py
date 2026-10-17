"""
Harvest Risk Intelligence API router.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...schemas.harvest import HarvestAnalysisRequest, HarvestAnalysisResponse
from ...crops.config import get_crop_config
from ...engine.harvest_engine import analyze_harvest_risk
from ...weather.open_meteo import OpenMeteoWeatherProvider
from ...db.session import get_db
from ...db.repository import save_risk_analysis

router = APIRouter(prefix="/api/v1/harvest", tags=["Harvest Risk Intelligence"])
weather_provider = OpenMeteoWeatherProvider()


@router.post(
    "/analyze",
    response_model=HarvestAnalysisResponse,
    summary="Evaluate Harvest Risk, Grain Quality & Combine Trafficability",
)
async def analyze_harvest(
    request: HarvestAnalysisRequest,
    db: Session = Depends(get_db),
):
    """
    Evaluates:
    - 72-hour precipitation and wet window risk
    - Crop physiological maturity (prevents early harvesting of immature crops)
    - Grain moisture and potential Mandi discount
    - Field soil saturation & combine harvester track sinking risk
    - Ranked candidate dry harvesting windows
    - Actionable guidance in English and Hindi
    """
    crop = get_crop_config(request.crop_name)
    if not crop:
        raise HTTPException(
            status_code=400,
            detail=f"Crop '{request.crop_name}' is not supported. Supported crops: wheat, rice, maize, cotton, soybean, mustard.",
        )

    try:
        weather_data = await weather_provider.get_forecast(
            latitude=request.latitude,
            longitude=request.longitude,
            forecast_days=14,
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to retrieve atmospheric forecast for harvest analysis: {str(e)}",
        )

    response = analyze_harvest_risk(request, weather_data, crop)

    # Persist analysis in database
    try:
        field_id = f"field_{round(request.latitude, 3)}_{round(request.longitude, 3)}"
        save_risk_analysis(
            db=db,
            field_id=field_id,
            crop_name=crop.id,
            decision_mode="harvest",
            latitude=request.latitude,
            longitude=request.longitude,
            risk_score=response.risk_score,
            risk_category=response.risk_category,
            recommended_action=response.recommended_action,
            weather_summary=f"Safety: {response.harvest_safety_score}/100. Action: {response.recommended_action}.",
            full_response_json=response.model_dump(),
        )
    except Exception:
        pass

    return response
