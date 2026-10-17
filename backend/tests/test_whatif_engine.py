"""
Automated unit tests for What-If scenario comparison engine.
"""

import pytest
from app.crops.config import get_crop_config
from app.weather.mock_provider import MockWeatherProvider
from app.engine.whatif_engine import analyze_what_if_scenarios
from app.schemas.whatif import WhatIfAnalysisRequest


@pytest.mark.asyncio
async def test_whatif_sowing_scenario_ranking():
    crop = get_crop_config("wheat")
    assert crop is not None

    # In heavy_rain scenario, Day 1-2 has heavy rain, while later days clear up
    provider = MockWeatherProvider(scenario="heavy_rain")
    weather = await provider.get_forecast(29.6857, 76.9905, 14)

    req = WhatIfAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="wheat",
        decision_mode="sowing",
        candidate_offsets_days=[0, 3, 5],
    )

    result = analyze_what_if_scenarios(req, weather, crop)

    assert result.status == "success"
    assert len(result.scenarios) == 3
    # The scenarios should be sorted by offset_days in final presentation
    assert [s.offset_days for s in result.scenarios] == [0, 3, 5]

    # Best recommendation should be to wait (offset 3 or 5)
    assert result.recommended_offset_days in [3, 5]
    assert result.decision_rationale_en is not None
    assert result.decision_rationale_hi is not None
