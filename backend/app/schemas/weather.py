"""
Weather data schemas for Open-Meteo and pluggable provider interface.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class DailyWeatherForecast(BaseModel):
    date: str = Field(..., description="ISO Date (YYYY-MM-DD)")
    temp_min_c: float
    temp_max_c: float
    precipitation_sum_mm: float
    precipitation_probability_max_pct: Optional[float] = 0.0
    wind_speed_max_kmh: float
    wind_gusts_max_kmh: Optional[float] = 0.0
    relative_humidity_mean_pct: Optional[float] = 60.0
    et0_fao_evapotranspiration: Optional[float] = None
    weather_code: Optional[int] = 0
    weather_description: Optional[str] = "Mainly clear"


class HourlyWeatherPoint(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 Timestamp")
    temp_c: float
    precipitation_mm: float
    precipitation_probability_pct: Optional[float] = 0.0
    relative_humidity_pct: float
    wind_speed_kmh: float
    soil_moisture_0_7cm: Optional[float] = None
    soil_moisture_7_28cm: Optional[float] = None
    soil_temperature_0_7cm: Optional[float] = None


class NormalizedWeatherData(BaseModel):
    latitude: float
    longitude: float
    timezone: str = "Asia/Kolkata"
    elevation: Optional[float] = None
    fetched_at: str
    is_cached: bool = False
    is_stale: bool = False
    data_provider: str = "Open-Meteo (ECMWF & GFS)"
    forecast_days_count: int
    daily: List[DailyWeatherForecast]
    hourly: List[HourlyWeatherPoint]


class WeatherForecastResponse(BaseModel):
    status: str = "success"
    message: str = "Weather forecast retrieved successfully"
    data: NormalizedWeatherData
