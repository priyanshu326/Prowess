"""
Integration tests for FastAPI endpoints:
/health, /api/v1/crops, /api/v1/feedback, /api/v1/history/{field_id}, /api/v1/sowing/analyze
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "weather_provider" in data


def test_crops_endpoint():
    response = client.get("/api/v1/crops")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_crops"] >= 6
    crop_ids = [c["id"] for c in data["crops"]]
    for expected in ["wheat", "rice", "maize", "cotton", "soybean", "mustard"]:
        assert expected in crop_ids


def test_feedback_and_history_lifecycle():
    feedback_payload = {
        "field_id": "test-plot-karnal-404",
        "crop_name": "wheat",
        "decision_mode": "sowing",
        "recommended_action_was": "SOW_NOW",
        "actual_action_taken": "SOWED",
        "actual_date": "2026-10-18",
        "actual_outcome_status": "EXCELLENT_GERMINATION",
        "seed_washout_occurred": False,
        "grain_quality_satisfactory": True,
        "farmer_comments": "Timely advice prevented unnecessary tubewell diesel expense.",
    }

    # Record feedback
    post_res = client.post("/api/v1/feedback", json=feedback_payload)
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["status"] == "success"
    assert post_data["field_id"] == "test-plot-karnal-404"

    # Query field history
    hist_res = client.get("/api/v1/history/test-plot-karnal-404")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["field_id"] == "test-plot-karnal-404"
    assert len(hist_data["feedbacks"]) >= 1
    assert hist_data["feedbacks"][0]["actual_outcome_status"] == "EXCELLENT_GERMINATION"


def test_evaluation_report_endpoint():
    res = client.get("/api/v1/evaluation/report")
    assert res.status_code == 200
    data = res.json()
    assert "heavy_rain_recall_pct" in data
    assert "brier_score" in data
    assert "breakdown_by_crop" in data
