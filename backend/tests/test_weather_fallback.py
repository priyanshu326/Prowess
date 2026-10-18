"""
Weather Provider Degradation & Fallback Tests.
Verifies requirement: "If weather data is unavailable, the backend must still work."
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.weather.open_meteo import OpenMeteoWeatherProvider

client = TestClient(app)


def test_weather_endpoint_error_handling():
    """When Open-Meteo raises an exception, endpoint returns 503 with safe message."""
    with patch.object(OpenMeteoWeatherProvider, "get_forecast", side_effect=RuntimeError("Connection timeout to weather API")):
        response = client.get("/api/v1/weather", params={"latitude": 29.6857, "longitude": 76.9905})
        assert response.status_code == 503
        data = response.json()
        assert "degraded" in data["detail"].lower() or "unreachable" in data["detail"].lower()


def test_risk_assessment_resilience_when_weather_down():
    """
    When weather service is down, /api/v1/risk-assessment/{farm_id} does NOT crash!
    It returns safe climatological fallback assessments labeled 'DEGRADED'.
    """
    with patch.object(OpenMeteoWeatherProvider, "get_forecast", side_effect=RuntimeError("Open-Meteo 503 upstream")):
        response = client.get("/api/v1/risk-assessment/farm_karnal_01")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["confidence"] == "DEGRADED"

        # Assessments should still be populated
        assessments = data["assessments"]
        assert len(assessments) == 3
        for a in assessments:
            assert a["confidence"] == "DEGRADED"
            assert any("telemetry" in lim.lower() or "degraded" in lim.lower() or "weather" in lim.lower() for lim in a["limitations"])


def test_dashboard_resilience_when_weather_down():
    """When weather is down, consolidated dashboard still returns farm metadata and recommendations."""
    with patch.object(OpenMeteoWeatherProvider, "get_forecast", side_effect=RuntimeError("DNS resolution failed")):
        response = client.get("/api/v1/dashboard/farm_karnal_01")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["farm_id"] == "farm_karnal_01"
        assert "weather_forecast_summary" in data
        assert data["weather_forecast_summary"]["provider"] == "Degraded / Offline Fallback"
        assert len(data["recommendations"]) >= 1
