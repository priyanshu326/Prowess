"""
Application settings and configuration.
Loads environment variables safely without hardcoded secrets.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Kisaan Sathi - Sowing & Harvest Risk Intelligence API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Weather Provider Configuration
    WEATHER_PROVIDER: str = "open_meteo"
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    OPEN_METEO_TIMEOUT_SECONDS: float = 10.0
    OPEN_METEO_MAX_RETRIES: int = 3

    # Caching
    WEATHER_CACHE_TTL_SECONDS: int = 1800  # 30 mins
    ALLOW_STALE_CACHE_ON_FAILURE: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./kisaan_risk.db"

    # ML & Agronomic Evaluation
    ML_MODEL_ENABLED: bool = False


settings = Settings()
