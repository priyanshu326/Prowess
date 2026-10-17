"""
Database repository for SmartKisan: Farm Profiles, Field Observations,
Risk Assessment logs, and Farmer Feedback.
"""

import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from .models import (
    FarmProfileRecord,
    FieldObservationRecord,
    RiskAssessmentLog,
    RiskAnalysisRecord,
    FarmerFeedbackRecord,
)
from ..schemas.smartkisan import FarmProfileCreate, ObservationCreate, SingleRiskAssessment
from ..schemas.feedback import FarmerFeedbackCreate


# -----------------------------------------------------------------------------
# Farm Profile CRUD
# -----------------------------------------------------------------------------
def save_farm_profile(
    db: Session,
    profile_in: FarmProfileCreate,
) -> FarmProfileRecord:
    farm_id = profile_in.farm_id or f"farm_{profile_in.crop_name}_{int(datetime.datetime.utcnow().timestamp())}"
    existing = db.query(FarmProfileRecord).filter(FarmProfileRecord.farm_id == farm_id).first()

    if existing:
        existing.farmer_name = profile_in.farmer_name or existing.farmer_name
        existing.crop_name = profile_in.crop_name.lower().strip()
        existing.latitude = profile_in.latitude
        existing.longitude = profile_in.longitude
        existing.village_district = profile_in.village_district
        existing.soil_type = profile_in.soil_type.lower().strip()
        existing.sowing_date = profile_in.sowing_date
        existing.irrigation_method = profile_in.irrigation_method.lower().strip()
        existing.field_area_acres = profile_in.field_area_acres or existing.field_area_acres
        existing.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    new_profile = FarmProfileRecord(
        farm_id=farm_id,
        farmer_name=profile_in.farmer_name or "Kisan Brother",
        crop_name=profile_in.crop_name.lower().strip(),
        latitude=profile_in.latitude,
        longitude=profile_in.longitude,
        village_district=profile_in.village_district,
        soil_type=profile_in.soil_type.lower().strip(),
        sowing_date=profile_in.sowing_date,
        irrigation_method=profile_in.irrigation_method.lower().strip(),
        field_area_acres=profile_in.field_area_acres or 2.0,
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile


def get_farm_profile(db: Session, farm_id: str) -> Optional[FarmProfileRecord]:
    return db.query(FarmProfileRecord).filter(FarmProfileRecord.farm_id == farm_id).first()


def list_farm_profiles(db: Session, limit: int = 50) -> List[FarmProfileRecord]:
    return db.query(FarmProfileRecord).order_by(FarmProfileRecord.created_at.desc()).limit(limit).all()


# -----------------------------------------------------------------------------
# Field Observation CRUD
# -----------------------------------------------------------------------------
def save_field_observation(
    db: Session,
    obs_in: ObservationCreate,
) -> FieldObservationRecord:
    today_str = obs_in.observation_date or datetime.date.today().isoformat()
    record = FieldObservationRecord(
        farm_id=obs_in.farm_id,
        observation_date=today_str,
        crop_condition=obs_in.crop_condition,
        last_irrigation_date=obs_in.last_irrigation_date,
        last_irrigation_amount_mm=obs_in.last_irrigation_amount_mm,
        visible_symptoms=obs_in.visible_symptoms,
        soil_surface_status=obs_in.soil_surface_status,
        farmer_notes=obs_in.farmer_notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_latest_observation(db: Session, farm_id: str) -> Optional[FieldObservationRecord]:
    return (
        db.query(FieldObservationRecord)
        .filter(FieldObservationRecord.farm_id == farm_id)
        .order_by(FieldObservationRecord.id.desc())
        .first()
    )


def get_all_observations(db: Session, farm_id: str, limit: int = 15) -> List[FieldObservationRecord]:
    return (
        db.query(FieldObservationRecord)
        .filter(FieldObservationRecord.farm_id == farm_id)
        .order_by(FieldObservationRecord.id.desc())
        .limit(limit)
        .all()
    )


# -----------------------------------------------------------------------------
# Risk Assessment Logging
# -----------------------------------------------------------------------------
def log_risk_assessment(
    db: Session,
    assessment: SingleRiskAssessment,
) -> RiskAssessmentLog:
    log_entry = RiskAssessmentLog(
        farm_id=assessment.farm_id,
        crop_name=assessment.crop,
        growth_stage=assessment.growth_stage,
        days_after_sowing=assessment.days_after_sowing,
        risk_type=assessment.risk_type,
        risk_level=assessment.risk_level,
        confidence=assessment.confidence,
        evidence=assessment.evidence,
        recommendation=assessment.recommendation,
        data_sources=assessment.data_sources,
        limitations=assessment.limitations,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


# -----------------------------------------------------------------------------
# Existing Legacy Audit and Feedback Methods (Kept for backward compatibility)
# -----------------------------------------------------------------------------
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
