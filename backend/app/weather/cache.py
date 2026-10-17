"""
In-memory and persistent weather forecast cache.
Caches responses by rounded coordinates (0.01 deg ~ 1.1 km) to avoid redundant Open-Meteo API requests.
Supports returning stale cached data with explicit flag if live provider fails.
"""

import time
from typing import Dict, Optional, Tuple
from ..schemas.weather import NormalizedWeatherData


class WeatherCache:
    def __init__(self, ttl_seconds: int = 1800):
        self.ttl_seconds = ttl_seconds
        # Key: (round(lat, 2), round(lon, 2), forecast_days) -> (NormalizedWeatherData, timestamp)
        self._store: Dict[Tuple[float, float, int], Tuple[NormalizedWeatherData, float]] = {}

    def _make_key(self, lat: float, lon: float, days: int) -> Tuple[float, float, int]:
        return (round(lat, 2), round(lon, 2), days)

    def get(self, lat: float, lon: float, days: int = 14) -> Optional[NormalizedWeatherData]:
        key = self._make_key(lat, lon, days)
        if key not in self._store:
            return None

        data, timestamp = self._store[key]
        age = time.time() - timestamp
        if age <= self.ttl_seconds:
            # Fresh cache hit
            cached_copy = data.model_copy(deep=True)
            cached_copy.is_cached = True
            cached_copy.is_stale = False
            return cached_copy

        return None

    def get_stale(self, lat: float, lon: float, days: int = 14) -> Optional[NormalizedWeatherData]:
        """Return stale data if live request fails, marking is_stale=True."""
        key = self._make_key(lat, lon, days)
        if key in self._store:
            data, _ = self._store[key]
            stale_copy = data.model_copy(deep=True)
            stale_copy.is_cached = True
            stale_copy.is_stale = True
            return stale_copy
        return None

    def set(self, lat: float, lon: float, days: int, data: NormalizedWeatherData) -> None:
        key = self._make_key(lat, lon, days)
        self._store[key] = (data.model_copy(deep=True), time.time())

    def clear(self) -> None:
        self._store.clear()


weather_cache = WeatherCache(ttl_seconds=1800)
