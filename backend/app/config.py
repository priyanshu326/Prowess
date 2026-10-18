"""
Application settings and configuration.
Loads environment variables safely without hardcoded secrets.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "SmartKisan - AI-Powered Smart Irrigation Platform"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Google Gemini AI Configuration
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key for agronomic AI and voice chat")
    GEMINI_MODEL: str = Field(default="gemini-3.8-flash", description="Default Gemini model")

    # Security & JWT Authentication
    JWT_SECRET_KEY: str = "kisaan-smart-irrigation-super-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Weather Provider Configuration
    WEATHER_PROVIDER: str = "open_meteo"  # 'open_meteo' | 'openweather' | 'mock'
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    OPEN_METEO_TIMEOUT_SECONDS: float = 10.0
    OPEN_METEO_MAX_RETRIES: int = 3
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # Caching
    WEATHER_CACHE_TTL_SECONDS: int = 1800  # 30 mins
    ALLOW_STALE_CACHE_ON_FAILURE: bool = True

    # Database (Default: local SQLite; replace with postgresql://user:pass@host:5432/kisaan_irrigation for PostgreSQL)
    DATABASE_URL: str = "sqlite:///./kisaan_risk.db"

    # Economic & Agronomic Baseline Constants
    DEFAULT_DIESEL_PRICE_INR: float = 89.0  # ₹89 / Litre
    DEFAULT_ELECTRICITY_TARIFF_INR: float = 7.0  # ₹7 / kWh
    DIESEL_PUMP_LPH: float = 1.25  # Litres of diesel per operating hour for 7.5 HP engine
    ELECTRIC_PUMP_KW: float = 5.6  # kW power draw for 7.5 HP electric motor
    DEFAULT_PUMP_FLOW_RATE_LPH: float = 25000.0  # 25,000 Litres/hour
    TRADITIONAL_FLOOD_BASELINE_MM: float = 65.0  # Traditional unmanaged flood irrigation depth per event
    CO2_KG_PER_LITRE_DIESEL: float = 2.68  # kg CO2 emitted per litre of diesel

    # ML & Agronomic Evaluation
    ML_MODEL_ENABLED: bool = False


settings = Settings()
