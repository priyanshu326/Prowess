"""
Automated tests for ML evaluation & historical verification metrics.
Verifies Brier score, heavy rain recall, and false-alarm calculations without data leakage.
"""

from app.evaluation.ml_evaluation import (
    compute_brier_score,
    evaluate_decision_history,
)


def test_brier_score_computation():
    # Perfect calibration: predicted 1.0 when happened, 0.0 when didn't
    bs_perfect = compute_brier_score([1.0, 0.0], [1, 0])
    assert bs_perfect == 0.0

    # Total disagreement: predicted 1.0 when didn't, 0.0 when did
    bs_worst = compute_brier_score([1.0, 0.0], [0, 1])
    assert bs_worst == 1.0

    # 50% uncertainty
    bs_mid = compute_brier_score([0.5, 0.5], [1, 0])
    assert bs_mid == 0.25


def test_evaluate_decision_history_metrics():
    dataset = [
        {"crop_name": "wheat", "region": "North-West", "lead_time_days": 2, "predicted_risk_prob": 0.8, "recommended_action": "WAIT", "actual_heavy_rain_occurred": True, "actual_washout_occurred": True},
        {"crop_name": "wheat", "region": "North-West", "lead_time_days": 2, "predicted_risk_prob": 0.2, "recommended_action": "SOW_NOW", "actual_heavy_rain_occurred": False, "actual_washout_occurred": False},
        {"crop_name": "rice", "region": "Eastern", "lead_time_days": 3, "predicted_risk_prob": 0.7, "recommended_action": "WAIT", "actual_heavy_rain_occurred": True, "actual_washout_occurred": True},
        {"crop_name": "rice", "region": "Eastern", "lead_time_days": 1, "predicted_risk_prob": 0.1, "recommended_action": "SOW_NOW", "actual_heavy_rain_occurred": False, "actual_washout_occurred": False},
    ]

    report = evaluate_decision_history(dataset)

    assert report.total_evaluations == 4
    assert report.heavy_rain_recall_pct == 100.0  # Caught both actual heavy rain events
    assert report.false_alarm_rate_pct == 0.0    # Zero false alarms
    assert report.brier_score < 0.10             # Well calibrated probabilities
    assert "wheat" in report.breakdown_by_crop
    assert "rice" in report.breakdown_by_crop
