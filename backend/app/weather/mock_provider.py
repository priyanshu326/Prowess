"""
Mock Weather Provider for automated tests, offline demos, and stress tests.
"""

import datetime
from .base import WeatherProvider
from ..schemas.weather import (
    NormalizedWeatherData,
    DailyWeatherForecast,
    HourlyWeatherPoint,
)


class MockWeatherProvider(WeatherProvider):
    def __init__(self, scenario: str = "optimal"):
        """
        scenario: 'optimal' | 'heavy_rain' | 'dry_spell'
        """
        self.scenario = scenario

    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        forecast_days: int = 14
    ) -> NormalizedWeatherData:
        today = datetime.date.today()
        daily = []
        hourly = []

        for d in range(forecast_days):
            curr_date = today + datetime.timedelta(days=d)
            date_str = curr_date.isoformat()

            if self.scenario == "heavy_rain":
                # Day 1 & 2 have heavy monsoon deluge
                if d in (1, 2):
                    rain_mm = 45.0
                    rain_prob = 95.0
                    rh = 90.0
                    wind_speed = 38.0
                    w_code = 65  # Heavy rain
                    w_desc = "Heavy rain"
                else:
                    rain_mm = 5.0
                    rain_prob = 30.0
                    rh = 70.0
                    wind_speed = 15.0
                    w_code = 2
                    w_desc = "Partly cloudy"
            elif self.scenario == "dry_spell":
                rain_mm = 0.0
                rain_prob = 0.0
                rh = 35.0
                wind_speed = 12.0
                w_code = 0
                w_desc = "Clear dry sky"
            else:  # optimal
                rain_mm = 0.0 if d < 5 else 2.0
                rain_prob = 5.0 if d < 5 else 20.0
                rh = 55.0
                wind_speed = 12.0
                w_code = 1
                w_desc = "Mainly clear"

            daily.append(
                DailyWeatherForecast(
                    date=date_str,
                    temp_min_c=18.0,
                    temp_max_c=29.0,
                    precipitation_sum_mm=rain_mm,
                    precipitation_probability_max_pct=rain_prob,
                    wind_speed_max_kmh=wind_speed,
                    wind_gusts_max_kmh=wind_speed * 1.3,
                    relative_humidity_mean_pct=rh,
                    weather_code=w_code,
                    weather_description=w_desc,
                )
            )

        # 48 hourly points
        for h in range(48):
            dt_hour = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=h)
            rain_h = 3.5 if self.scenario == "heavy_rain" and (12 <= h <= 36) else 0.0
            hourly.append(
                HourlyWeatherPoint(
                    timestamp=dt_hour.isoformat(),
                    temp_c=24.0,
                    precipitation_mm=rain_h,
                    precipitation_probability_pct=90.0 if rain_h > 0 else 5.0,
                    relative_humidity_pct=88.0 if rain_h > 0 else 55.0,
                    wind_speed_kmh=25.0 if rain_h > 0 else 10.0,
                    soil_moisture_0_7cm=85.0 if self.scenario == "heavy_rain" else 58.0,
                    soil_moisture_7_28cm=80.0 if self.scenario == "heavy_rain" else 62.0,
                    soil_temperature_0_7cm=22.0,
                )
            )

        return NormalizedWeatherData(
            latitude=latitude,
            longitude=longitude,
            timezone="Asia/Kolkata",
            elevation=240.0,
            fetched_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            is_cached=False,
            is_stale=False,
            data_provider=f"Mock Weather Provider ({self.scenario})",
            forecast_days_count=len(daily),
            daily=daily,
            hourly=hourly,
        )

    async def health_check(self) -> dict:
        return {
            "provider": "mock",
            "status": "UP",
            "latency_ms": 1.0,
            "scenario": self.scenario,
        }
