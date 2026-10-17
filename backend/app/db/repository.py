"""
Database repository for persistence and retrieval of analyses and farmer feedback.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from .models import RiskAnalysisRecord, FarmerFeedbackRecord
from ..schemas.feedback import FarmerFeedbackCreate


def save_risk_analysis(
    db: Session,
    field_id: str,
    crop_name: str,
    decision_mode: str,
    latitude: float,
    longitude: float,
    risk_score: float,
    risk_category: str,
    recommended_action: str,
    weather_summary: Optional[str] = None,
    full_response_json: Optional[Dict[str, Any]] = None,
) -> RiskAnalysisRecord:
    record = RiskAnalysisRecord(
        field_id=field_id,
        crop_name=crop_name,
        decision_mode=decision_mode,
        latitude=latitude,
        longitude=longitude,
        risk_score=risk_score,
        risk_category=risk_category,
        recommended_action=recommended_action,
        weather_summary=weather_summary,
        full_response_json=full_response_json,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def save_farmer_feedback(
    db: Session,
    feedback_in: FarmerFeedbackCreate,
) -> FarmerFeedbackRecord:
    record = FarmerFeedbackRecord(
        field_id=feedback_in.field_id,
        crop_name=feedback_in.crop_name,
        decision_mode=feedback_in.decision_mode,
        recommended_action_was=feedback_in.recommended_action_was,
        actual_action_taken=feedback_in.actual_action_taken,
        actual_date=feedback_in.actual_date,
        actual_outcome_status=feedback_in.actual_outcome_status,
        seed_washout_occurred=feedback_in.seed_washout_occurred,
        grain_quality_satisfactory=feedback_in.grain_quality_satisfactory,
        farmer_comments=feedback_in.farmer_comments,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_field_history(
    db: Session,
    field_id: str,
    limit: int = 20,
) -> Dict[str, Any]:
    analyses = (
        db.query(RiskAnalysisRecord)
        .filter(RiskAnalysisRecord.field_id == field_id)
        .order_by(RiskAnalysisRecord.created_at.desc())
        .limit(limit)
        .all()
    )

    feedbacks = (
        db.query(FarmerFeedbackRecord)
        .filter(FarmerFeedbackRecord.field_id == field_id)
        .order_by(FarmerFeedbackRecord.recorded_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "field_id": field_id,
        "total_records": len(analyses) + len(feedbacks),
        "analyses": [
            {
                "id": a.id,
                "crop_name": a.crop_name,
                "decision_mode": a.decision_mode,
                "risk_score": a.risk_score,
                "risk_category": a.risk_category,
                "recommended_action": a.recommended_action,
                "weather_summary": a.weather_summary,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in analyses
        ],
        "feedbacks": [
            {
                "id": f.id,
                "crop_name": f.crop_name,
                "decision_mode": f.decision_mode,
                "recommended_action_was": f.recommended_action_was,
                "actual_action_taken": f.actual_action_taken,
                "actual_date": f.actual_date,
                "actual_outcome_status": f.actual_outcome_status,
                "seed_washout_occurred": f.seed_washout_occurred,
                "grain_quality_satisfactory": f.grain_quality_satisfactory,
                "comments": f.farmer_comments,
                "recorded_at": f.recorded_at.isoformat() if f.recorded_at else None,
            }
            for f in feedbacks
        ],
    }
