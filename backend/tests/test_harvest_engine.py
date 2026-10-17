"""
Automated unit tests for Harvest Risk Intelligence Engine.
Tests mature vs immature crops, wet vs dry harvest windows, and combine trafficability.
"""

import pytest
from app.crops.config import get_crop_config
from app.weather.mock_provider import MockWeatherProvider
from app.engine.harvest_engine import analyze_harvest_risk
from app.schemas.harvest import HarvestAnalysisRequest


@pytest.mark.asyncio
async def test_harvest_optimal_dry_mature_crop():
    crop = get_crop_config("wheat")
    assert crop is not None

    provider = MockWeatherProvider(scenario="optimal")
    weather = await provider.get_forecast(29.6857, 76.9905, 14)

    req = HarvestAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="wheat",
        current_crop_stage="harvest_ready",
    )

    result = analyze_harvest_risk(req, weather, crop)

    assert result.status == "success"
    assert result.is_crop_mature is True
    assert result.recommended_action == "HARVEST_IF_MATURE"
    assert result.risk_score <= 30.0
    assert result.grain_quality_risk.mold_and_discoloration_risk == "MINIMAL"
    assert result.grain_quality_risk.estimated_mandi_discount_inr_per_quintal == 0.0
    assert result.field_access_risk.machinery_trafficability == "GOOD"


@pytest.mark.asyncio
async def test_harvest_immature_crop_never_harvests_early():
    """Critical Hackathon Criterion: Never recommend harvesting immature crops simply because forecast is wet."""
    crop = get_crop_config("wheat")
    assert crop is not None

    provider = MockWeatherProvider(scenario="heavy_rain")
    weather = await provider.get_forecast(29.6857, 76.9905, 14)

    req = HarvestAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="wheat",
        current_crop_stage="flowering",  # Immature stage!
    )

    result = analyze_harvest_risk(req, weather, crop)

    assert result.is_crop_mature is False
    assert result.recommended_action == "MONITOR"
    assert result.maturity_warning is not None
    assert "not reached physiological maturity" in result.maturity_warning
    assert "अभी कटाई बिल्कुल न करें" in result.explanation_hi


@pytest.mark.asyncio
async def test_harvest_heavy_rain_delays_mature_crop():
    crop = get_crop_config("rice")
    assert crop is not None

    provider = MockWeatherProvider(scenario="heavy_rain")
    weather = await provider.get_forecast(29.6857, 76.9905, 14)

    req = HarvestAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="rice",
        current_crop_stage="harvest_ready",
    )

    result = analyze_harvest_risk(req, weather, crop)

    assert result.is_crop_mature is True
    assert result.recommended_action == "WAIT_FOR_DRY_WINDOW"
    assert result.risk_score >= 50.0
    assert result.grain_quality_risk.mold_and_discoloration_risk in ["MODERATE", "SEVERE"]
    assert result.grain_quality_risk.estimated_mandi_discount_inr_per_quintal > 0
    assert result.field_access_risk.machinery_trafficability == "POOR_COMBINE_SINK_RISK"
