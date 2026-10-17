"""
Sowing Risk Intelligence API router.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...schemas.sowing import SowingAnalysisRequest, SowingAnalysisResponse
from ...crops.config import get_crop_config
from ...engine.sowing_engine import analyze_sowing_risk
from ...weather.open_meteo import OpenMeteoWeatherProvider
from ...db.session import get_db
from ...db.repository import save_risk_analysis

router = APIRouter(prefix="/api/v1/sowing", tags=["Sowing Risk Intelligence"])
weather_provider = OpenMeteoWeatherProvider()


@router.post(
    "/analyze",
    response_model=SowingAnalysisResponse,
    summary="Evaluate Sowing Risk & Candidate Windows",
)
async def analyze_sowing(
    request: SowingAnalysisRequest,
    db: Session = Depends(get_db),
):
    """
    Evaluates:
    - Post-sowing heavy rainfall & seed displacement risk
    - Extended dry-spell & germination moisture stress
    - Soil temperature suitability (ICAR benchmarks)
    - Ranked candidate sowing windows across 14-day horizon
    - Localized bilingual advice (Hindi & English)
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
            detail=f"Unable to retrieve atmospheric forecast for sowing analysis: {str(e)}",
        )

    response = analyze_sowing_risk(request, weather_data, crop)

    # Persist analysis in SQLite / PostgreSQL
    try:
        field_id = f"field_{round(request.latitude, 3)}_{round(request.longitude, 3)}"
        save_risk_analysis(
            db=db,
            field_id=field_id,
            crop_name=crop.id,
            decision_mode="sowing",
            latitude=request.latitude,
            longitude=request.longitude,
            risk_score=response.risk_score,
            risk_category=response.risk_category,
            recommended_action=response.recommended_action,
            weather_summary=f"Safety: {response.sowing_safety_score}/100. Action: {response.recommended_action}.",
            full_response_json=response.model_dump(),
        )
    except Exception:
        # Non-fatal database persistence error shouldn't fail user request
        pass

    return response
