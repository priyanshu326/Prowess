"""
What-If Scenario Simulation API router.
"""

from fastapi import APIRouter, HTTPException
from ...schemas.whatif import WhatIfAnalysisRequest, WhatIfAnalysisResponse
from ...crops.config import get_crop_config
from ...engine.whatif_engine import analyze_what_if_scenarios
from ...weather.open_meteo import OpenMeteoWeatherProvider

router = APIRouter(prefix="/api/v1", tags=["What-If Decision Comparison"])
weather_provider = OpenMeteoWeatherProvider()


@router.post(
    "/what-if",
    response_model=WhatIfAnalysisResponse,
    summary="Compare Acting Today vs Waiting 3 or 5 Days",
)
async def analyze_what_if(request: WhatIfAnalysisRequest):
    """
    Simulates dynamic outcomes of acting today versus waiting alternative windows.
    Returns:
    - Ranked comparison of candidate offsets
    - Risk & safety score differentials
    - Clear agronomic trade-offs in English and Hindi
    """
    crop = get_crop_config(request.crop_name)
    if not crop:
        raise HTTPException(
            status_code=400,
            detail=f"Crop '{request.crop_name}' is not supported.",
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
            detail=f"Unable to retrieve forecast for what-if simulation: {str(e)}",
        )

    return analyze_what_if_scenarios(request, weather_data, crop)
