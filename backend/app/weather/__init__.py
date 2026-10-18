"""Weather package for SmartKisan with multi-provider support."""

from .base import WeatherProvider
from .open_meteo import OpenMeteoWeatherProvider
from .mock_provider import MockWeatherProvider
from .openweather import OpenWeatherProvider
from ..config import settings


def get_weather_provider(provider_type: str = settings.WEATHER_PROVIDER) -> WeatherProvider:
    """Factory to retrieve configured weather provider."""
    p = provider_type.lower()
    if p == "mock":
        return MockWeatherProvider(scenario="optimal")
    elif p == "openweather":
        return OpenWeatherProvider()
    else:
        return OpenMeteoWeatherProvider()
