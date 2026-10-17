"""
Abstract Base Interface for Weather Providers.
Enables pluggable integration of Open-Meteo, IMD (India Meteorological Department), or mock providers.
"""

from abc import ABC, abstractmethod
from ..schemas.weather import NormalizedWeatherData


class WeatherProvider(ABC):
    """Abstract interface that all weather providers must implement."""

    @abstractmethod
    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        forecast_days: int = 14
    ) -> NormalizedWeatherData:
        """Fetch and normalize weather forecast for coordinates."""
        pass

    @abstractmethod
    async def health_check(self) -> dict:
        """Check provider connectivity and latency."""
        pass
