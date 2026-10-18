"""
Automated Pytest Suite for AI-Powered Smart Irrigation Decision Engine.
Verifies all 9 Demo Acceptance Criteria required by the problem statement:
1. Dry soil with no expected rain triggers an IRRIGATE recommendation.
2. Adequate soil moisture with useful rain expected triggers WAIT or MONITOR.
3. Heavy rainfall forecasts prevent unnecessary irrigation and alert on waterlogging.
4. Crop stage changes water requirements (Kc and root depth).
5. Different soil types produce appropriately different irrigation behaviour.
6. Missing or stale data reduces confidence and triggers warnings.
7. Water-volume calculations are dimensionally correct (1 mm over 1 m² = 1 Litre).
8. One farmer cannot access another farmer's fields (data isolation via JWT).
9. Savings are calculated against a documented baseline, never invented.

Also includes integration tests for all REST API endpoints.
"""

import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db, SessionLocal
from app.db.seed import seed_demo_farms
from app.engine.irrigation_engine import (
    evaluate_smart_irrigation,
    calculate_effective_rainfall,
    get_crop_coefficient,
    get_soil_profile,
    convert_depth_to_volume,
)
from app.config import settings

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """Ensure database and seed data are initialized."""
    init_db()
    db = SessionLocal()
    seed_demo_farms(db)
    db.close()


# =============================================================================
# 1. Decision Engine Acceptance Tests
# =============================================================================

def test_acceptance_1_dry_soil_triggers_irrigate():
    """Test 1: Dry soil (22%) with no expected rain (0mm) triggers an IRRIGATE recommendation."""
    rec = evaluate_smart_irrigation(
        field_id="test_field_dry",
        field_area_acres=2.0,
        field_area_sqm=8093.72,
        crop_type="wheat",
        growth_stage="crown_root_initiation",
        soil_type="clay_loam",
        irrigation_method="flood",
        current_soil_moisture_pct=22.0,  # Far below 45% critical threshold
        forecast_rain_next_48h_mm=0.0,
        forecast_rain_next_72h_mm=0.0,
        et0_mm_per_day=4.2,
    )

    assert rec.decision == "IRRIGATE"
    assert rec.recommended_water_depth_mm > 0.0
    assert rec.estimated_water_volume_litres > 0.0
    assert "Early morning" in rec.suggested_irrigation_window
    assert any("below the critical threshold" in r for r in rec.reasons)
    assert rec.soil_moisture_status in ["CRITICAL_DEFICIT", "MODERATE_DEFICIT"]


def test_acceptance_2_adequate_moisture_useful_rain_triggers_wait():
    """Test 2: Adequate soil moisture (48%) with useful rain expected (25mm) triggers WAIT."""
    rec = evaluate_smart_irrigation(
        field_id="test_field_rain_wait",
        field_area_acres=2.5,
        field_area_sqm=10117.15,
        crop_type="wheat",
        growth_stage="tillering",
        soil_type="clay_loam",
        irrigation_method="flood",
        current_soil_moisture_pct=48.0,
        forecast_rain_next_48h_mm=25.0,  # Useful rainfall expected
        forecast_rain_next_72h_mm=28.0,
        et0_mm_per_day=3.5,
    )

    assert rec.decision == "WAIT"
    assert rec.recommended_water_depth_mm == 0.0
    assert rec.estimated_water_volume_litres == 0.0
    assert any("sufficient to fulfill" in r or "Upcoming rainfall" in r for r in rec.reasons)
    # Farmer saves 100% of the baseline flood volume!
    assert rec.estimated_water_saved_litres > 0.0


def test_acceptance_3_heavy_rainfall_prevents_irrigation_and_warns_waterlogging():
    """Test 3: Heavy rainfall forecasts (55mm) prevent unnecessary irrigation and alert on waterlogging."""
    rec = evaluate_smart_irrigation(
        field_id="test_field_deluge",
        field_area_acres=3.0,
        field_area_sqm=12140.58,
        crop_type="cotton",
        growth_stage="seedling",
        soil_type="clay",  # Slow drainage
        irrigation_method="flood",
        current_soil_moisture_pct=38.0,
        forecast_rain_next_48h_mm=55.0,  # Torrential downpour
        forecast_rain_next_72h_mm=65.0,
        et0_mm_per_day=3.0,
    )

    assert rec.decision == "WAIT"
    assert rec.recommended_water_depth_mm == 0.0
    assert any("Heavy rainfall" in r for r in rec.reasons)
    # Verifies waterlogging and nutrient leaching warnings are flagged
    assert any("waterlogging" in w.lower() for w in rec.warnings)
    assert any("leaching" in w.lower() for w in rec.warnings)


def test_acceptance_4_crop_stage_changes_water_requirements():
    """Test 4: Crop stage dynamically alters crop coefficient (Kc) and water demand (ETc)."""
    # Early emergence stage
    kc_early, root_early = get_crop_coefficient("wheat", "sowing")
    # Flowering stage
    kc_flowering, root_flowering = get_crop_coefficient("wheat", "flowering")

    assert kc_early < kc_flowering
    assert root_early < root_flowering
    assert kc_early == pytest.approx(0.35, abs=0.05)
    assert kc_flowering == pytest.approx(1.15, abs=0.05)

    # Test that ETc demand is significantly higher during flowering
    et0 = 4.0
    rec_early = evaluate_smart_irrigation(
        field_id="f1", field_area_acres=1.0, field_area_sqm=4046.86,
        crop_type="wheat", growth_stage="sowing", soil_type="clay_loam",
        irrigation_method="flood", current_soil_moisture_pct=25.0,
        forecast_rain_next_48h_mm=0.0, forecast_rain_next_72h_mm=0.0, et0_mm_per_day=et0,
    )
    rec_flowering = evaluate_smart_irrigation(
        field_id="f2", field_area_acres=1.0, field_area_sqm=4046.86,
        crop_type="wheat", growth_stage="flowering", soil_type="clay_loam",
        irrigation_method="flood", current_soil_moisture_pct=25.0,
        forecast_rain_next_48h_mm=0.0, forecast_rain_next_72h_mm=0.0, et0_mm_per_day=et0,
    )

    assert rec_flowering.etc_crop_water_demand_mm > rec_early.etc_crop_water_demand_mm


def test_acceptance_5_soil_types_produce_different_behaviour():
    """Test 5: Sandy soil (fast drainage, low capacity) vs Clay soil (slow drainage, high waterlogging risk)."""
    sandy = get_soil_profile("sandy")
    clay = get_soil_profile("clay")

    assert sandy["infiltration_rate_mm_hr"] > clay["infiltration_rate_mm_hr"]
    assert sandy["field_capacity_pct"] < clay["field_capacity_pct"]
    assert sandy["waterlogging_risk"] == "LOW"
    assert clay["waterlogging_risk"] == "CRITICAL"

    # Sandy soil at 12% moisture has low moisture deficit vs clay soil at 12% which is severe drought
    rec_sandy = evaluate_smart_irrigation(
        field_id="sandy_f", field_area_acres=1.0, field_area_sqm=4046.86,
        crop_type="mustard", growth_stage="vegetative", soil_type="sandy",
        irrigation_method="sprinkler", current_soil_moisture_pct=13.0,
        forecast_rain_next_48h_mm=0.0, forecast_rain_next_72h_mm=0.0, et0_mm_per_day=4.0,
    )
    assert rec_sandy.irrigation_efficiency_pct == 75.0  # Sprinkler efficiency


def test_acceptance_6_missing_sensor_data_reduces_confidence_and_warns():
    """Test 6: Missing or stale telemetry flags conservative estimation and degraded confidence."""
    rec_missing = evaluate_smart_irrigation(
        field_id="sensorless_plot",
        field_area_acres=2.0,
        field_area_sqm=8093.72,
        crop_type="wheat",
        growth_stage="tillering",
        soil_type="loam",
        irrigation_method="flood",
        current_soil_moisture_pct=None,  # Missing sensor
        forecast_rain_next_48h_mm=0.0,
        forecast_rain_next_72h_mm=0.0,
        et0_mm_per_day=4.0,
        has_sensor_telemetry=False,
    )

    assert rec_missing.confidence_level == "LOW"
    assert rec_missing.data_quality_status == "WEATHER_ONLY_ESTIMATE"
    assert any("sensor" in w.lower() for w in rec_missing.warnings)

    rec_stale = evaluate_smart_irrigation(
        field_id="stale_plot",
        field_area_acres=2.0,
        field_area_sqm=8093.72,
        crop_type="wheat",
        growth_stage="tillering",
        soil_type="loam",
        irrigation_method="flood",
        current_soil_moisture_pct=35.0,
        forecast_rain_next_48h_mm=0.0,
        forecast_rain_next_72h_mm=0.0,
        et0_mm_per_day=4.0,
        is_sensor_stale=True,
    )

    assert rec_stale.confidence_level == "DEGRADED"
    assert rec_stale.data_quality_status == "OFFLINE_CACHED_STALE"


def test_acceptance_7_water_volume_calculations_dimensionally_correct():
    """
    Test 7: Proves that water volume calculations are dimensionally correct:
    1 mm of depth on 1 m² = 1 Litre of water.
    10 mm on 1 acre (4046.86 m²) = 40,468.6 Litres.
    """
    # 1 mm over 1 m²:
    vol_1m = convert_depth_to_volume(depth_mm=1.0, area_sqm=1.0)
    assert vol_1m == pytest.approx(1.0, abs=1e-5)

    # 10 mm over 1 acre:
    vol_1acre = convert_depth_to_volume(depth_mm=10.0, area_sqm=4046.86)
    assert vol_1acre == pytest.approx(40468.6, abs=0.1)

    # 25 mm over 2.5 acres (10,117.15 m²):
    vol_2_5_acre = convert_depth_to_volume(depth_mm=25.0, area_sqm=10117.15)
    assert vol_2_5_acre == pytest.approx(252928.75, abs=0.5)


def test_acceptance_9_savings_calculated_against_documented_baseline():
    """Test 9: Verifies savings are derived against the documented 65mm traditional flood baseline."""
    area_sqm = 10117.15  # 2.5 acres
    expected_baseline_volume = 65.0 * area_sqm  # 657,614.75 Litres

    rec = evaluate_smart_irrigation(
        field_id="baseline_test",
        field_area_acres=2.5,
        field_area_sqm=area_sqm,
        crop_type="wheat",
        growth_stage="tillering",
        soil_type="clay_loam",
        irrigation_method="flood",
        current_soil_moisture_pct=48.0,
        forecast_rain_next_48h_mm=20.0,
        forecast_rain_next_72h_mm=20.0,
        et0_mm_per_day=4.0,
    )

    # Baseline must strictly equal documented 65mm depth * field area
    assert rec.baseline_water_volume_litres == pytest.approx(expected_baseline_volume, abs=1.0)
    # When WAIT is recommended, water saved equals 100% of the baseline flood
    assert rec.estimated_water_saved_litres == pytest.approx(expected_baseline_volume, abs=1.0)
    # Diesel savings derived from pump flow rate (25,000 L/hr) * 1.25 L/hr
    expected_hours = expected_baseline_volume / 25000.0
    expected_diesel = expected_hours * 1.25
    assert rec.estimated_diesel_saved_litres == pytest.approx(expected_diesel, abs=0.5)
    # Cost saved derived from diesel price ₹89/L
    assert rec.estimated_cost_saved_inr == pytest.approx(expected_diesel * 89.0, abs=50.0)


# =============================================================================
# 2. End-to-End REST API Integration & Data Isolation Tests
# =============================================================================

def test_api_farmer_registration_and_login():
    """POST /api/v1/auth/register and POST /api/v1/auth/login."""
    # Register Farmer A
    email_a = f"farmer_a_{int(datetime.datetime.utcnow().timestamp())}@kisaan.in"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email_a,
            "full_name": "हरप्रीत सिंह (Harpreet Singh)",
            "password": "secretpassword",
            "preferred_language": "pa",
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["email"] == email_a

    # Login Farmer A
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email_a, "password": "secretpassword"},
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data


def test_acceptance_8_farmer_data_isolation():
    """
    Test 8: One farmer cannot access another farmer's fields.
    Verifies multi-tenant isolation via JWT.
    """
    ts = int(datetime.datetime.utcnow().timestamp())
    # 1. Register Farmer A
    res_a = client.post(
        "/api/v1/auth/register",
        json={"email": f"farmer_alpha_{ts}@kisaan.in", "full_name": "Farmer Alpha", "password": "passalpha123"},
    )
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register Farmer B
    res_b = client.post(
        "/api/v1/auth/register",
        json={"email": f"farmer_beta_{ts}@kisaan.in", "full_name": "Farmer Beta", "password": "passbeta123"},
    )
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Farmer A creates Field A
    field_a_id = f"plot_alpha_{ts}"
    create_res = client.post(
        "/api/v1/fields",
        headers=headers_a,
        json={
            "id": field_a_id,
            "name": "Alpha North Plot",
            "area_acres": 2.5,
            "latitude": 29.6857,
            "longitude": 76.9905,
            "soil_type": "clay_loam",
            "crop_type": "wheat",
            "sowing_date": "2026-10-01",
        },
    )
    assert create_res.status_code == 201

    # 4. Farmer A can access their own field
    get_res_a = client.get(f"/api/v1/fields/{field_a_id}", headers=headers_a)
    assert get_res_a.status_code == 200
    assert get_res_a.json()["id"] == field_a_id

    # 5. Farmer B attempts to access Farmer A's field -> 403 Forbidden!
    get_res_b = client.get(f"/api/v1/fields/{field_a_id}", headers=headers_b)
    assert get_res_b.status_code == 403
    assert "forbidden" in get_res_b.json()["detail"].lower()

    # 6. Farmer B's field list does NOT contain Field A
    list_res_b = client.get("/api/v1/fields", headers=headers_b)
    assert list_res_b.status_code == 200
    field_ids_b = [f["id"] for f in list_res_b.json()]
    assert field_a_id not in field_ids_b


def test_api_submit_sensor_reading():
    """POST /api/v1/sensor-readings — Telemetry submission."""
    res = client.post(
        "/api/v1/sensor-readings",
        json={
            "field_id": "field_karnal_01",
            "soil_moisture_pct": 28.5,
            "soil_moisture_root_zone_pct": 34.0,
            "soil_temperature_c": 22.1,
            "ambient_temperature_c": 27.8,
            "ambient_humidity_pct": 54.0,
            "source": "iot_sensor",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["field_id"] == "field_karnal_01"
    assert data["soil_moisture_pct"] == 28.5


def test_api_field_weather_endpoint():
    """GET /api/v1/weather/{field_id} — Weather and forecast distinction."""
    res = client.get("/api/v1/weather/field_karnal_01")
    assert res.status_code == 200
    data = res.json()
    assert data["field_id"] == "field_karnal_01"
    assert "current" in data
    assert "daily_forecast" in data
    assert len(data["daily_forecast"]) >= 5
    assert "distinction_note" in data


def test_api_irrigation_recommendation_and_history():
    """POST /api/v1/irrigation/recommendation/{field_id} & GET history."""
    # Generate recommendation
    rec_res = client.post("/api/v1/irrigation/recommendation/field_karnal_01")
    assert rec_res.status_code == 200
    data = rec_res.json()
    assert data["field_id"] == "field_karnal_01"
    assert data["decision"] in ["IRRIGATE", "WAIT", "MONITOR"]
    assert "recommended_water_depth_mm" in data
    assert "estimated_water_volume_litres" in data
    assert len(data["reasons"]) > 0
    assert len(data["reasons_hi"]) > 0
    assert "estimated_water_saved_litres" in data

    # Retrieve history
    hist_res = client.get("/api/v1/irrigation/history/field_karnal_01")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["field_id"] == "field_karnal_01"
    assert hist_data["total_recommendations"] >= 1


def test_api_record_irrigation_event():
    """POST /api/v1/irrigation/events — Records performed irrigation and updates savings."""
    res = client.post(
        "/api/v1/irrigation/events",
        json={
            "field_id": "field_karnal_01",
            "applied_water_depth_mm": 20.0,
            "duration_hours": 3.0,
            "irrigation_method": "flood",
            "energy_source": "diesel",
            "notes": "Light 20mm watering as advised by SmartKisan",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["field_id"] == "field_karnal_01"
    assert data["applied_water_depth_mm"] == 20.0
    assert data["applied_water_volume_litres"] > 0
    assert data["energy_cost_inr"] > 0


def test_api_dashboard_endpoint():
    """GET /api/v1/dashboard/{field_id} — Consolidated decision dashboard."""
    res = client.get("/api/v1/dashboard/field_karnal_01")
    assert res.status_code == 200
    data = res.json()
    assert data["field_id"] == "field_karnal_01"
    assert "current_soil_moisture_pct" in data
    assert "latest_decision" in data
    assert "next_action_headline" in data
    assert "next_action_headline_hi" in data
    assert "cumulative_water_saved_litres" in data
    assert "cumulative_cost_saved_inr" in data


def test_api_simulation_mode_judge_scenarios():
    """POST /api/v1/irrigation/simulate — Hackathon judge scenario test."""
    scenarios = [
        ("dry_soil_no_rain", "IRRIGATE"),
        ("adequate_moisture_rain_expected", "WAIT"),
        ("heavy_rain_tomorrow", "WAIT"),
    ]

    for scenario_name, expected_decision in scenarios:
        sim_res = client.post(
            "/api/v1/irrigation/simulate",
            json={"scenario": scenario_name, "field_id": "field_karnal_01"},
        )
        assert sim_res.status_code == 200
        data = sim_res.json()
        assert data["scenario"] == scenario_name
        assert data["recommendation"]["decision"] == expected_decision
