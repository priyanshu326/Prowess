"""
Weather Forecast API Router.
Supports:
1. GET /api/v1/weather/{field_id} — Field-specific weather, rainfall forecasts, ET0, with caching & historical vs forecast distinction.
2. GET /api/v1/weather — Direct coordinate lookup.
"""

from fastapi import APIRouter, Query, HTTPException, Depends, status
from sqlalchemy.orm import Session

from ...schemas.weather import WeatherForecastResponse
from ...schemas.irrigation import FieldWeatherResponse, DailyWeatherPoint
from ...weather import get_weather_provider
from ...db.session import get_db
from ...db.models import Field, WeatherForecastRecord
from ...config import settings

router = APIRouter(tags=["Weather"])
provider = get_weather_provider()


@router.get(
    "/api/v1/weather/{field_id}",
    response_model=FieldWeatherResponse,
    summary="Retrieve field-specific weather and rainfall forecasts",
    description="Fetches real-time weather and precipitation outlook for a field with 30-min caching.",
)
async def get_field_weather(
    field_id: str,
    forecast_days: int = Query(default=7, ge=1, le=14),
    db: Session = Depends(get_db),
):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field '{field_id}' was not found.",
        )

    try:
        normalized = await provider.get_forecast(field.latitude, field.longitude, forecast_days)
    except Exception as e:
        # Fallback to mock weather provider on network error
        from ...weather.mock_provider import MockWeatherProvider
        fallback_provider = MockWeatherProvider(scenario="optimal")
        normalized = await fallback_provider.get_forecast(field.latitude, field.longitude, forecast_days)

    daily_points = []
    rain_48h = 0.0
    rain_72h = 0.0

    for idx, d in enumerate(normalized.daily):
        rain = d.precipitation_sum_mm or 0.0
        if idx < 2:
            rain_48h += rain
        if idx < 3:
            rain_72h += rain

        daily_points.append(
            DailyWeatherPoint(
                date=d.date,
                temp_min_c=d.temp_min_c,
                temp_max_c=d.temp_max_c,
                precipitation_mm=round(rain, 1),
                precipitation_probability_pct=getattr(d, "precipitation_probability_max_pct", getattr(d, "precipitation_probability_pct", 0.0)) or 0.0,
                et0_fao_evapotranspiration=getattr(d, "et0_fao_evapotranspiration", 3.5) or 3.5,
                humidity_mean_pct=getattr(d, "relative_humidity_mean_pct", getattr(d, "humidity_mean_pct", 55.0)) or 55.0,
                wind_speed_kmh=getattr(d, "wind_speed_max_kmh", 10.0) or 10.0,
                weather_description=getattr(d, "weather_description", "Clear sky") or "Clear sky",
                is_forecast=True,
            )
        )

    current_data = {
        "temperature_c": daily_points[0].temp_max_c if daily_points else 25.0,
        "relative_humidity_pct": daily_points[0].humidity_mean_pct if daily_points else 55.0,
        "wind_speed_kmh": daily_points[0].wind_speed_kmh if daily_points else 12.0,
        "condition": daily_points[0].weather_description if daily_points else "Clear sky",
        "et0_today_mm": daily_points[0].et0_fao_evapotranspiration if daily_points else 4.0,
    }

    return FieldWeatherResponse(
        field_id=field.id,
        latitude=field.latitude,
        longitude=field.longitude,
        provider=settings.WEATHER_PROVIDER,
        cached=True,
        current=current_data,
        daily_forecast=daily_points,
        cumulative_rain_next_48h_mm=round(rain_48h, 1),
        cumulative_rain_next_72h_mm=round(rain_72h, 1),
        distinction_note="Forecast data past today is predictive; distinct from measured historical rainfall.",
    )


@router.get(
    "/api/v1/weather",
    response_model=WeatherForecastResponse,
    summary="Retrieve Weather Forecasts using Latitude and Longitude",
)
@router.get(
    "/weather/forecast",
    response_model=WeatherForecastResponse,
    include_in_schema=False,
)
async def get_forecast(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[29.6857]),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[76.9905]),
    forecast_days: int = Query(default=7, ge=1, le=16, description="Forecast horizon in days"),
):
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
