"""
Unit Tests for SmartKisan Agronomic Decision Engine.
Verifies deterministic rules for:
1. Heat Stress against phenological limits
2. Rainfall & Waterlogging against soil drainage
3. Water-Stress Deficit against atmospheric demand (ET0) & irrigation history
4. Transparent non-arbitrary confidence rating
"""

import datetime
import pytest
from app.engine.risk_engine import (
    evaluate_heat_stress,
    evaluate_rainfall_waterlogging,
    evaluate_water_stress,
    compute_confidence_label,
)
from app.engine.growth_stage import estimate_crop_growth_stage
from app.engine.rules_catalog import get_soil_profile, get_irrigation_profile
from app.schemas.weather import NormalizedWeatherData, DailyWeatherForecast


def build_mock_weather(max_temps, rains, et0s):
    """Helper to generate deterministic weather forecast inputs."""
    daily = []
    for i in range(len(max_temps)):
        daily.append(
            DailyWeatherForecast(
                date=f"2026-10-{18+i:02d}",
                temp_min_c=18.0,
                temp_max_c=float(max_temps[i]),
                precipitation_sum_mm=float(rains[i]),
                precipitation_probability_max_pct=85.0 if rains[i] > 10 else 10.0,
                wind_speed_max_kmh=12.0,
                wind_gusts_max_kmh=18.0,
                relative_humidity_mean_pct=55.0,
                et0_fao_evapotranspiration=float(et0s[i]),
                weather_code=1,
                weather_description="Clear",
            )
        )
    return NormalizedWeatherData(
        latitude=29.6857,
        longitude=76.9905,
        timezone="Asia/Kolkata",
        fetched_at="2026-10-17T12:00:00Z",
        is_cached=False,
        is_stale=False,
        data_provider="Mock Test Provider",
        forecast_days_count=len(daily),
        daily=daily,
        hourly=[],
    )


def test_heat_stress_critical_rule():
    """Wheat at flowering stage with max temp exceeding 31°C by 3+ degrees -> CRITICAL."""
    crop_info = {
        "crop_name": "Wheat",
        "stage_name": "Booting & Flowering (बाली व फूल आना)",
        "critical_heat_threshold_c": 31.0,
        "days_after_sowing": 75,
        "water_stress_sensitivity": "CRITICAL",
        "rainfall_tolerance": {"max_safe_48h_rain_mm": 20.0},
    }

    # Forecast with extreme heat spike: 34.5°C, 35.0°C, 34.0°C
    weather = build_mock_weather(max_temps=[34.5, 35.0, 34.0], rains=[0, 0, 0], et0s=[5.2, 5.5, 5.0])
    assessment = evaluate_heat_stress(
        farm_id="farm_heat_test",
        crop_info=crop_info,
        weather_data=weather,
        observation=None,
        confidence="HIGH",
    )

    assert assessment.risk_level == "CRITICAL"
    assert "35.0°C" in assessment.evidence[0]
    assert "31.0°C" in assessment.evidence[1]
    assert "microclimate" in assessment.recommendation.lower() or "evening irrigation" in assessment.recommendation.lower()


def test_rainfall_waterlogging_on_heavy_clay():
    """Heavy rain (45mm in 48h) on clay loam soil with slow drainage -> CRITICAL waterlogging risk."""
    crop_info = {
        "crop_name": "Wheat",
        "stage_name": "Crown Root Initiation (क्राउन जड़ फुटाव)",
        "critical_heat_threshold_c": 27.0,
        "days_after_sowing": 20,
        "water_stress_sensitivity": "CRITICAL",
        "rainfall_tolerance": {"max_safe_48h_rain_mm": 35.0},
    }
    soil_profile = get_soil_profile("clay_loam")
    irrigation_profile = get_irrigation_profile("flood")

    # Forecast 48h rain = 25mm + 25mm = 50mm
    weather = build_mock_weather(max_temps=[24, 23, 25], rains=[25.0, 25.0, 5.0], et0s=[2.5, 2.0, 3.0])
    observation = {"soil_surface_status": "damp"}

    assessment = evaluate_rainfall_waterlogging(
        farm_id="farm_rain_test",
        crop_info=crop_info,
        soil_profile=soil_profile,
        irrigation_profile=irrigation_profile,
        weather_data=weather,
        observation=observation,
        confidence="HIGH",
    )

    assert assessment.risk_level == "CRITICAL"
    assert "50.0 mm" in assessment.evidence[0]
    assert "Clay Loam" in assessment.evidence[1]
    assert "drainage" in assessment.recommendation.lower()


def test_water_stress_deficit_rule():
    """Last irrigation 20 days ago + dry cracked soil + 0mm rain forecast -> CRITICAL moisture deficit."""
    crop_info = {
        "crop_name": "Wheat",
        "stage_name": "Crown Root Initiation (क्राउन जड़ फुटाव)",
        "critical_heat_threshold_c": 27.0,
        "days_after_sowing": 22,
        "water_stress_sensitivity": "CRITICAL",
        "rainfall_tolerance": {"max_safe_48h_rain_mm": 35.0},
    }
    soil_profile = get_soil_profile("sandy_loam")
    irrigation_profile = get_irrigation_profile("flood")

    # Zero rain, high ET0
    weather = build_mock_weather(max_temps=[28, 29, 29, 30, 30], rains=[0, 0, 0, 0, 0], et0s=[4.5, 4.5, 4.5, 4.5, 4.5])
    twenty_days_ago = (datetime.date.today() - datetime.timedelta(days=20)).isoformat()
    observation = {
        "crop_condition": "slight_wilting",
        "last_irrigation_date": twenty_days_ago,  # 20 days ago
        "soil_surface_status": "cracked_dry",
        "visible_symptoms": ["dry_crust_soil", "leaf_curling"],
    }

    assessment = evaluate_water_stress(
        farm_id="farm_water_test",
        crop_info=crop_info,
        soil_profile=soil_profile,
        irrigation_profile=irrigation_profile,
        weather_data=weather,
        observation=observation,
        confidence="HIGH",
    )

    assert assessment.risk_level in ["CRITICAL", "HIGH"]
    assert "20 days ago" in assessment.evidence[0]
    assert "irrigation" in assessment.recommendation.lower()


def test_confidence_rating_completeness():
    """Verifies that confidence is evaluated based on data completeness without arbitrary numbers."""
    farm_profile = {
        "soil_type": "clay_loam",
        "sowing_date": "2026-10-01",
    }
    recent_obs = {
        "observation_date": "2026-10-16",
        "crop_condition": "healthy",
    }
    old_obs = {
        "observation_date": "2026-09-01",  # > 40 days ago
        "crop_condition": "healthy",
    }
    weather = build_mock_weather([28], [0], [4.0])

    # 1. Full data + recent observation -> HIGH
    conf_high = compute_confidence_label(weather, recent_obs, farm_profile)
    assert conf_high == "HIGH"

    # 2. Full profile but stale observation -> MEDIUM
    conf_med = compute_confidence_label(weather, old_obs, farm_profile)
    assert conf_med == "MEDIUM"

    # 3. Weather unavailable or stale -> DEGRADED
    conf_degraded = compute_confidence_label(None, recent_obs, farm_profile)
    assert conf_degraded == "DEGRADED"
