"""
Weather forecast API router using Open-Meteo provider interface.
"""

from fastapi import APIRouter, Query, HTTPException
from ...schemas.weather import WeatherForecastResponse
from ...weather.open_meteo import OpenMeteoWeatherProvider

router = APIRouter(tags=["Weather"])
provider = OpenMeteoWeatherProvider()


@router.get(
    "/weather/forecast",
    response_model=WeatherForecastResponse,
    summary="Fetch Normalized Forecast for Coordinates",
)
async def get_forecast(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[29.6857]),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[76.9905]),
    forecast_days: int = Query(default=14, ge=1, le=16, description="Forecast horizon in days"),
):
    """
    Fetches real atmospheric, precipitation, and soil moisture data from Open-Meteo,
    normalizes the variables, applies caching, and returns standardized schema.
    """
    try:
        normalized = await provider.get_forecast(latitude, longitude, forecast_days)
        return WeatherForecastResponse(
            status="success",
            message="Weather forecast retrieved successfully",
            data=normalized,
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Weather service degraded or unreachable: {str(e)}",
        )
