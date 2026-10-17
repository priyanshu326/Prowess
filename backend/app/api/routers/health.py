"""
Health check endpoints for backend and weather provider status.
"""

from fastapi import APIRouter, Depends
from ...config import settings
from ...weather.open_meteo import OpenMeteoWeatherProvider

router = APIRouter(tags=["Health"])
weather_provider = OpenMeteoWeatherProvider()


@router.get("/health", summary="System Health & Provider Connectivity")
async def get_health():
    """
    Returns API health status, version, database configuration,
    and live Open-Meteo provider connectivity check.
    """
    provider_status = await weather_provider.health_check()
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": settings.DATABASE_URL.split("///")[0] if "///" in settings.DATABASE_URL else "configured",
        "weather_provider": provider_status,
    }
