"""
Database models for Kisaan Sathi Risk Intelligence Platform.
Supports SQLite out-of-the-box and optional PostgreSQL/Supabase via DATABASE_URL.
"""

import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class RiskAnalysisRecord(Base):
    """Stores generated risk analyses for auditability and history tracking."""
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
