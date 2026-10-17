"""
Open-Meteo Concrete Weather Provider.
Fetches real atmospheric, precipitation, and soil moisture data with retries, timeouts, and caching.
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


# WMO Weather interpretation codes
WMO_DESCRIPTIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


class OpenMeteoWeatherProvider(WeatherProvider):
    def __init__(
        self,
        base_url: str = settings.OPEN_METEO_BASE_URL,
        timeout: float = settings.OPEN_METEO_TIMEOUT_SECONDS,
        max_retries: int = settings.OPEN_METEO_MAX_RETRIES,
    ):
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries

    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        forecast_days: int = 14
    ) -> NormalizedWeatherData:
        """Fetch forecast with cache check, retry logic, and stale fallback."""
        # 1. Check cache first
        cached = weather_cache.get(latitude, longitude, forecast_days)
        if cached is not None:
            return cached

        # 2. Build Open-Meteo query parameters
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "forecast_days": min(16, max(1, forecast_days)),
            "timezone": "Asia/Kolkata",
            "daily": [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "precipitation_probability_max",
                "wind_speed_10m_max",
                "wind_gusts_10m_max",
                "relative_humidity_2m_mean",
                "et0_fao_evapotranspiration",
                "weather_code",
            ],
            "hourly": [
                "temperature_2m",
                "relative_humidity_2m",
                "precipitation",
                "precipitation_probability",
                "wind_speed_10m",
                "soil_temperature_0_to_7cm",
                "soil_moisture_0_to_7cm",
                "soil_moisture_7_to_28cm",
            ],
        }

        last_error: Optional[Exception] = None

        # 3. HTTP Request with retries
        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.get(self.base_url, params=params)
                    resp.raise_for_status()
                    data = resp.json()

                    normalized = self._normalize_response(data, latitude, longitude, forecast_days)
                    # Cache successful result
                    weather_cache.set(latitude, longitude, forecast_days, normalized)
                    return normalized

            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                logger.warning(
                    f"Open-Meteo fetch failed (attempt {attempt}/{self.max_retries}) for ({latitude}, {longitude}): {e}"
                )
                last_error = e

        # 4. If all retries failed, check for stale cache
        stale = weather_cache.get_stale(latitude, longitude, forecast_days)
        if stale is not None and settings.ALLOW_STALE_CACHE_ON_FAILURE:
            logger.info(f"Serving stale weather data for ({latitude}, {longitude}) due to upstream failure")
            return stale

        # 5. Degraded service error (never fabricate fake values silently!)
        raise RuntimeError(
            f"Weather data service temporarily unavailable from Open-Meteo after {self.max_retries} attempts: {last_error}"
        )

    def _normalize_response(
        self,
        raw: dict,
        lat: float,
        lon: float,
        days: int
    ) -> NormalizedWeatherData:
        daily_raw = raw.get("daily", {})
        hourly_raw = raw.get("hourly", {})

        # Normalize daily data
        daily_list = []
        dates = daily_raw.get("time", [])
        for i, dt in enumerate(dates):
            w_code = daily_raw.get("weather_code", [0])[i] if i < len(daily_raw.get("weather_code", [])) else 0
            daily_list.append(
                DailyWeatherForecast(
                    date=dt,
                    temp_min_c=float(daily_raw.get("temperature_2m_min", [18.0])[i] or 18.0),
                    temp_max_c=float(daily_raw.get("temperature_2m_max", [30.0])[i] or 30.0),
                    precipitation_sum_mm=float(daily_raw.get("precipitation_sum", [0.0])[i] or 0.0),
                    precipitation_probability_max_pct=float(daily_raw.get("precipitation_probability_max", [0.0])[i] or 0.0),
                    wind_speed_max_kmh=float(daily_raw.get("wind_speed_10m_max", [10.0])[i] or 10.0),
                    wind_gusts_max_kmh=float(daily_raw.get("wind_gusts_10m_max", [0.0])[i] or 0.0),
                    relative_humidity_mean_pct=float(daily_raw.get("relative_humidity_2m_mean", [60.0])[i] or 60.0),
                    et0_fao_evapotranspiration=(
                        float(daily_raw.get("et0_fao_evapotranspiration")[i])
                        if daily_raw.get("et0_fao_evapotranspiration") and daily_raw["et0_fao_evapotranspiration"][i] is not None
                        else 4.0
                    ),
                    weather_code=w_code,
                    weather_description=WMO_DESCRIPTIONS.get(w_code, "Partly cloudy"),
                )
            )

        # Normalize hourly data (first 72 hours for deep precision)
        hourly_list = []
        h_times = hourly_raw.get("time", [])
        max_hourly_pts = min(len(h_times), 72)
        for i in range(max_hourly_pts):
            hourly_list.append(
                HourlyWeatherPoint(
                    timestamp=h_times[i],
                    temp_c=float(hourly_raw.get("temperature_2m", [25.0])[i] or 25.0),
                    precipitation_mm=float(hourly_raw.get("precipitation", [0.0])[i] or 0.0),
                    precipitation_probability_pct=float(hourly_raw.get("precipitation_probability", [0.0])[i] or 0.0),
                    relative_humidity_pct=float(hourly_raw.get("relative_humidity_2m", [60.0])[i] or 60.0),
                    wind_speed_kmh=float(hourly_raw.get("wind_speed_10m", [10.0])[i] or 10.0),
                    soil_moisture_0_7cm=(
                        float(hourly_raw.get("soil_moisture_0_to_7cm")[i])
                        if hourly_raw.get("soil_moisture_0_to_7cm") and hourly_raw["soil_moisture_0_to_7cm"][i] is not None
                        else None
                    ),
                    soil_moisture_7_28cm=(
                        float(hourly_raw.get("soil_moisture_7_to_28cm")[i])
                        if hourly_raw.get("soil_moisture_7_to_28cm") and hourly_raw["soil_moisture_7_to_28cm"][i] is not None
                        else None
                    ),
                    soil_temperature_0_7cm=(
                        float(hourly_raw.get("soil_temperature_0_to_7cm")[i])
                        if hourly_raw.get("soil_temperature_0_to_7cm") and hourly_raw["soil_temperature_0_to_7cm"][i] is not None
                        else None
                    ),
                )
            )

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return NormalizedWeatherData(
            latitude=lat,
            longitude=lon,
            timezone=raw.get("timezone", "Asia/Kolkata"),
            elevation=raw.get("elevation", None),
            fetched_at=now_iso,
            is_cached=False,
            is_stale=False,
            data_provider="Open-Meteo (ECMWF & GFS)",
            forecast_days_count=len(daily_list),
            daily=daily_list,
            hourly=hourly_list,
        )

    async def health_check(self) -> dict:
        """Ping Open-Meteo test endpoint."""
        start = datetime.datetime.now()
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(
                    self.base_url,
                    params={"latitude": 28.6139, "longitude": 77.2090, "daily": "temperature_2m_max", "forecast_days": 1}
                )
                latency_ms = (datetime.datetime.now() - start).total_seconds() * 1000
                return {
                    "provider": "open_meteo",
                    "status": "UP" if res.status_code == 200 else "DEGRADED",
                    "latency_ms": round(latency_ms, 1),
                    "http_code": res.status_code,
                }
        except Exception as e:
            return {
                "provider": "open_meteo",
                "status": "DOWN",
                "latency_ms": None,
                "error": str(e),
            }
