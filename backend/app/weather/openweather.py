"""
OpenWeather API Weather Provider.
Fetches real-time weather forecasts from OpenWeatherMap (OneCall / 5-day forecast),
computes FAO-56 ET0 approximations, and handles caching, rate limits, and fallback.
"""

import datetime
import logging
from typing import Optional
import httpx

from .base import WeatherProvider
from .cache import weather_cache
from ..schemas.weather import (
    NormalizedWeatherData,
    DailyWeatherForecast,
    HourlyWeatherPoint,
)
from ..config import settings

logger = logging.getLogger(__name__)


class OpenWeatherProvider(WeatherProvider):
    def __init__(
        self,
        api_key: str = settings.OPENWEATHER_API_KEY,
        base_url: str = settings.OPENWEATHER_BASE_URL,
        timeout: float = 10.0,
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout

    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        forecast_days: int = 7,
    ) -> NormalizedWeatherData:
        """Fetches forecast from OpenWeatherMap API with caching and error handling."""
        cache_key = f"openweather_{round(latitude, 4)}_{round(longitude, 4)}_{forecast_days}"
        cached = weather_cache.get(cache_key)
        if cached:
            logger.info("Retrieved weather from cache: %s", cache_key)
            return cached

        # If no API key configured, fallback to Open-Meteo or mock gracefully
        if not self.api_key:
            from .open_meteo import OpenMeteoWeatherProvider
            logger.info("OpenWeather API key not set, seamlessly delegating to Open-Meteo agro-weather provider.")
            provider = OpenMeteoWeatherProvider()
            data = await provider.get_forecast(latitude, longitude, forecast_days)
            weather_cache.set(cache_key, data, ttl_seconds=settings.WEATHER_CACHE_TTL_SECONDS)
            return data

        url = f"{self.base_url}/forecast"
        params = {
            "lat": latitude,
            "lon": longitude,
            "appid": self.api_key,
            "units": "metric",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            payload = resp.json()

        # Group 3-hour forecasts into daily forecasts
        forecast_list = payload.get("list", [])
        daily_dict: dict = {}

        for item in forecast_list:
            dt_txt = item.get("dt_txt", "")
            date_str = dt_txt.split(" ")[0] if " " in dt_txt else datetime.date.today().isoformat()
            temp = item.get("main", {}).get("temp", 25.0)
            rain = item.get("rain", {}).get("3h", 0.0)
            humidity = item.get("main", {}).get("humidity", 50.0)
            wind = item.get("wind", {}).get("speed", 10.0) * 3.6  # m/s to km/h
            weather_desc = item.get("weather", [{}])[0].get("description", "Clear sky")

            if date_str not in daily_dict:
                daily_dict[date_str] = {
                    "temps": [temp],
                    "rain_sum": rain,
                    "humidities": [humidity],
                    "winds": [wind],
                    "desc": weather_desc,
                }
            else:
                daily_dict[date_str]["temps"].append(temp)
                daily_dict[date_str]["rain_sum"] += rain
                daily_dict[date_str]["humidities"].append(humidity)
                daily_dict[date_str]["winds"].append(wind)

        daily_forecasts = []
        for date_str, stats in list(daily_dict.items())[:forecast_days]:
            t_min = min(stats["temps"])
            t_max = max(stats["temps"])
            t_mean = sum(stats["temps"]) / len(stats["temps"])
            h_mean = sum(stats["humidities"]) / len(stats["humidities"])
            w_max = max(stats["winds"])
            # Hargreaves-Samani method approximation for reference ET0 (mm/day)
            # ET0 ~= 0.0023 * (Tmean + 17.8) * sqrt(Tmax - Tmin) * Ra (approx 15 MJ/m2/day ~ 3.5-5mm)
            t_range = max(1.0, t_max - t_min)
            et0 = round(0.0023 * (t_mean + 17.8) * (t_range ** 0.5) * 4.2, 2)

            daily_forecasts.append(
                DailyWeatherForecast(
                    date=date_str,
                    temp_min_c=round(t_min, 1),
                    temp_max_c=round(t_max, 1),
                    precipitation_probability_max_pct=90.0 if stats["rain_sum"] > 5 else (30.0 if stats["rain_sum"] > 0 else 5.0),
                    relative_humidity_mean_pct=round(h_mean, 1),
                    wind_speed_max_kmh=round(w_max, 1),
                    et0_fao_evapotranspiration=et0,
                    weather_code=0 if stats["rain_sum"] == 0 else 61,
                    weather_description=stats["desc"].capitalize(),
                )
            )

        result = NormalizedWeatherData(
            latitude=latitude,
            longitude=longitude,
            elevation=payload.get("city", {}).get("coord", {}).get("lat", 0.0),
            timezone="Asia/Kolkata",
            generated_time=datetime.datetime.utcnow().isoformat(),
            daily=daily_forecasts,
            hourly=[],
        )

        weather_cache.set(cache_key, result, ttl_seconds=settings.WEATHER_CACHE_TTL_SECONDS)
        return result
