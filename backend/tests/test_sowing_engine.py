"""
Automated unit tests for Sowing Risk Intelligence Engine.
Uses MockWeatherProvider across optimal, heavy rain, and dry spell conditions.
"""

import pytest
import asyncio
from app.crops.config import get_crop_config
from app.weather.mock_provider import MockWeatherProvider
from app.engine.sowing_engine import analyze_sowing_risk
from app.schemas.sowing import SowingAnalysisRequest


@pytest.mark.asyncio
async def test_sowing_optimal_conditions():
    crop = get_crop_config("wheat")
    assert crop is not None

    provider = MockWeatherProvider(scenario="optimal")
    weather = await provider.get_forecast(29.6857, 76.9905, 14)

    req = SowingAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="wheat",
        current_crop_stage="sowing",
        irrigation_availability=True,
    )

    result = analyze_sowing_risk(req, weather, crop)

    assert result.status == "success"
    assert result.recommended_action == "SOW_NOW"
    assert result.risk_category == "LOW"
    assert result.risk_score <= 30.0
    assert result.sowing_safety_score >= 70.0
    assert result.seed_washout_rot_risk.washout_probability_pct < 20.0
    assert len(result.candidate_windows) > 0
    assert result.explanation_hi is not None


@pytest.mark.asyncio
async def test_sowing_heavy_rain_triggers_wait():
    crop = get_crop_config("wheat")
    assert crop is not None

    provider = MockWeatherProvider(scenario="heavy_rain")
    weather = await provider.get_forecast(29.6857, 76.9905, 14)

    req = SowingAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="wheat",
        current_crop_stage="sowing",
        irrigation_availability=True,
    )

    result = analyze_sowing_risk(req, weather, crop)

    assert result.status == "success"
    assert result.recommended_action in ["WAIT", "CONDITIONAL"]
    assert result.risk_score >= 50.0
    assert result.seed_washout_rot_risk.washout_probability_pct > 30.0
    # Explanations contain actionable warnings
    assert "भारी बारिश" in result.explanation_hi or "जोखिम" in result.explanation_hi


@pytest.mark.asyncio
async def test_sowing_dry_spell_unirrigated_risk():
    crop = get_crop_config("mustard")
    assert crop is not None

    provider = MockWeatherProvider(scenario="dry_spell")
    weather = await provider.get_forecast(28.0, 75.0, 14)

    req = SowingAnalysisRequest(
        latitude=28.0,
        longitude=75.0,
        crop_name="mustard",
        current_crop_stage="sowing",
        irrigation_availability=False,  # Rainfed farmer
    )

    result = analyze_sowing_risk(req, weather, crop)
    # Without irrigation and with dry spell, risk increases
    dry_factor = next((f for f in result.main_risk_factors if f.factor_category == "DRY_SPELL"), None)
    assert dry_factor is not None
    assert dry_factor.severity in ["CRITICAL", "MODERATE"]
