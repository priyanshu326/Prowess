"""
End-to-End API Integration Tests for SmartKisan:
Tests all 7 required endpoints:
1. GET /health
2. GET /api/v1/weather
3. POST /api/v1/farm-profile
4. POST /api/v1/observations
5. GET /api/v1/risk-assessment/{farm_id}
6. GET /api/v1/recommendations/{farm_id}
7. GET /api/v1/dashboard/{farm_id}
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db, SessionLocal
from app.db.seed import seed_demo_farms

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """Ensure database and seed data are initialized."""
    init_db()
    db = SessionLocal()
    seed_demo_farms(db)
    db.close()


def test_1_health_endpoint():
    """GET /health - verifies status, database, and weather provider check."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "weather_provider" in data
    assert "database" in data
    assert "ai_explanation_layer" in data


def test_2_weather_endpoint():
    """GET /api/v1/weather - verifies forecast retrieval, ET0, and units."""
    response = client.get("/api/v1/weather", params={"latitude": 29.6857, "longitude": 76.9905, "forecast_days": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    weather = data["data"]
    assert weather["latitude"] == pytest.approx(29.6857, abs=0.1)
    assert len(weather["daily"]) >= 5
    first_day = weather["daily"][0]
    assert "temp_max_c" in first_day
    assert "precipitation_sum_mm" in first_day
    assert "et0_fao_evapotranspiration" in first_day


def test_3_farm_profile_registration_and_retrieval():
    """POST & GET /api/v1/farm-profile - verifies farm registration."""
    farm_id = "test_farm_punjab_wheat_99"
    payload = {
        "farm_id": farm_id,
        "farmer_name": "जसपाल सिंह (Jaspal Singh)",
        "crop_name": "wheat",
        "latitude": 30.9010,
        "longitude": 75.8573,
        "village_district": "Ludhiana, Punjab",
        "soil_type": "loam",
        "sowing_date": "2026-10-05",
        "irrigation_method": "flood",
        "field_area_acres": 4.0,
    }

    # 1. Register profile
    post_res = client.post("/api/v1/farm-profile", json=payload)
    assert post_res.status_code == 201
    post_data = post_res.json()
    assert post_data["farm_id"] == farm_id
    assert post_data["crop_name"] == "wheat"

    # 2. Retrieve profile by ID
    get_res = client.get(f"/api/v1/farm-profile/{farm_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["farm_id"] == farm_id
    assert get_data["soil_type"] == "loam"
    assert get_data["sowing_date"] == "2026-10-05"


def test_4_record_field_observation():
    """POST & GET /api/v1/observations - verifies recording ground-truth symptoms."""
    farm_id = "farm_karnal_01"
    payload = {
        "farm_id": farm_id,
        "observation_date": "2026-10-17",
        "crop_condition": "healthy",
        "last_irrigation_date": "2026-10-10",
        "last_irrigation_amount_mm": 50.0,
        "visible_symptoms": ["active_tillering"],
        "soil_surface_status": "normal",
        "farmer_notes": "पौधे स्वस्थ हैं और कल्ले निकल रहे हैं।",
    }

    post_res = client.post("/api/v1/observations", json=payload)
    assert post_res.status_code == 201
    post_data = post_res.json()
    assert post_data["farm_id"] == farm_id
    assert post_data["crop_condition"] == "healthy"
    assert "observation_id" in post_data

    # Retrieve history
    hist_res = client.get(f"/api/v1/observations/{farm_id}")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert len(hist_data) >= 1
    assert hist_data[0]["farm_id"] == farm_id


def test_5_risk_assessment_schema_and_types():
    """
    GET /api/v1/risk-assessment/{farm_id} - verifies exact required schema:
    farm_id, crop, growth_stage, risk_type, risk_level, evidence, recommendation,
    confidence, data_sources, generated_at, limitations.
    """
    farm_id = "farm_karnal_01"
    response = client.get(f"/api/v1/risk-assessment/{farm_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["farm_id"] == farm_id
    assert data["crop"] == "Wheat"
    assert "growth_stage" in data
    assert "days_after_sowing" in data
    assert "overall_risk_level" in data
    assert "summary_headline" in data

    # Verify all 3 risk assessments exist
    assessments = data["assessments"]
    assert len(assessments) == 3
    risk_types = {a["risk_type"] for a in assessments}
    assert "heat_stress" in risk_types
    assert "rainfall_waterlogging" in risk_types
    assert "water_stress_deficit" in risk_types

    # Strict output schema validation on each assessment
    for a in assessments:
        assert a["farm_id"] == farm_id
        assert a["crop"] == "Wheat"
        assert len(a["growth_stage"]) > 0
        assert a["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert isinstance(a["evidence"], list) and len(a["evidence"]) >= 2
        assert isinstance(a["recommendation"], str) and len(a["recommendation"]) > 10
        assert a["confidence"] in ["HIGH", "MEDIUM", "LOW", "DEGRADED"]
        assert isinstance(a["data_sources"], list) and len(a["data_sources"]) >= 1
        assert "generated_at" in a
        assert isinstance(a["limitations"], list) and len(a["limitations"]) >= 1


def test_6_recommendations_actionable_and_explainable():
    """GET /api/v1/recommendations/{farm_id} - verifies prioritization and bilingual explanations."""
    farm_id = "farm_karnal_01"
    response = client.get(f"/api/v1/recommendations/{farm_id}", params={"lang": "hi"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["farm_id"] == farm_id
    assert len(data["recommendations"]) >= 1

    first_rec = data["recommendations"][0]
    assert "id" in first_rec
    assert "priority" in first_rec
    assert "timing_window" in first_rec
    assert "why" in first_rec
    assert "cost_or_resource_impact" in first_rec
    assert "action_hi" in first_rec
    assert "action_en" in first_rec

    # Multilingual summary checks
    summary = data["multilingual_summary"]
    assert "hi" in summary and len(summary["hi"]) > 10
    assert "en" in summary and len(summary["en"]) > 10
    assert data["ai_layer_status"] in ["active_gemini", "deterministic_fallback"]


def test_7_consolidated_dashboard():
    """GET /api/v1/dashboard/{farm_id} - verifies full unified payload."""
    farm_id = "farm_karnal_01"
    response = client.get(f"/api/v1/dashboard/{farm_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["farm_id"] == farm_id

    # Verify all components of dashboard
    assert "farm_profile" in data
    assert data["farm_profile"]["crop_name"] == "wheat"
    assert "weather_forecast_summary" in data
    assert "growth_stage_details" in data
    assert "risk_assessments" in data
    assert len(data["risk_assessments"]) == 3
    assert "recommendations" in data
    assert "multilingual_advisory" in data
    assert "methodology_audit" in data
    assert "zero_fabrication_safeguard" in data["methodology_audit"]
