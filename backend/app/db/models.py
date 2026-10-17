"""
Database models for SmartKisan Risk Intelligence Platform.
Supports SQLite out-of-the-box and optional PostgreSQL/Supabase via DATABASE_URL.
"""

import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class FarmProfileRecord(Base):
    """
    Stores smallholder farm configuration: crop, location, soil type,
    sowing date, and irrigation infrastructure.
    """
    __tablename__ = "farm_profiles"

    farm_id = Column(String(100), primary_key=True, index=True)
    farmer_name = Column(String(100), default="Kisan Brother", nullable=False)
    crop_name = Column(String(50), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    village_district = Column(String(200), nullable=True)
    soil_type = Column(String(50), nullable=False)
    sowing_date = Column(String(20), nullable=False)
    irrigation_method = Column(String(50), nullable=False)
    field_area_acres = Column(Float, default=2.0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)


class FieldObservationRecord(Base):
    """
    Stores farmer-reported ground observations: crop condition,
    last irrigation date, visible symptoms, and topsoil appearance.
    """
    __tablename__ = "field_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(String(100), index=True, nullable=False)
    observation_date = Column(String(20), nullable=False)
    crop_condition = Column(String(50), nullable=False)
    last_irrigation_date = Column(String(20), nullable=True)
    last_irrigation_amount_mm = Column(Float, nullable=True)
    visible_symptoms = Column(JSON, nullable=True)
    soil_surface_status = Column(String(50), nullable=True)
    farmer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class RiskAssessmentLog(Base):
    """
    Stores generated heat, rainfall, and water-stress risk evaluations
    for auditability, explainability, and historical trend monitoring.
    """
    __tablename__ = "risk_assessment_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(String(100), index=True, nullable=False)
    crop_name = Column(String(50), nullable=False)
    growth_stage = Column(String(50), nullable=False)
    days_after_sowing = Column(Integer, default=0, nullable=False)
    risk_type = Column(String(50), nullable=False)  # heat_stress | rainfall_waterlogging | water_stress_deficit
    risk_level = Column(String(20), nullable=False)  # LOW | MODERATE | HIGH | CRITICAL
    confidence = Column(String(20), nullable=False)  # HIGH | MEDIUM | LOW | DEGRADED
    evidence = Column(JSON, nullable=False)
    recommendation = Column(Text, nullable=False)
    data_sources = Column(JSON, nullable=False)
    limitations = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class RiskAnalysisRecord(Base):
    """Stores generated sowing/harvest risk analyses for auditability and history tracking."""
    __tablename__ = "risk_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), index=True, nullable=False)
    crop_name = Column(String(50), nullable=False)
    decision_mode = Column(String(20), nullable=False)  # sowing | harvest
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_category = Column(String(20), nullable=False)
    recommended_action = Column(String(50), nullable=False)
    weather_summary = Column(Text, nullable=True)
    full_response_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class FarmerFeedbackRecord(Base):
    """
    Stores ground-truth feedback from farmers regarding actual sowing/harvesting
    dates and real observed outcomes. Used for future model evaluation and calibration.
    """
    __tablename__ = "farmer_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), index=True, nullable=False)
    crop_name = Column(String(50), nullable=False)
    decision_mode = Column(String(20), nullable=False)
    recommended_action_was = Column(String(50), nullable=False)
    actual_action_taken = Column(String(50), nullable=False)
    actual_date = Column(String(20), nullable=False)
    actual_outcome_status = Column(String(100), nullable=False)
    seed_washout_occurred = Column(Boolean, default=False, nullable=False)
    grain_quality_satisfactory = Column(Boolean, default=True, nullable=False)
    farmer_comments = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
