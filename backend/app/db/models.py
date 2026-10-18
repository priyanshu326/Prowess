"""
Database models for SmartKisan: AI-Powered Smart Irrigation Platform.
Supports PostgreSQL (with SQLAlchemy) for production and SQLite for local zero-config execution.
Includes farmer authentication, field configuration, crop/soil profiles,
IoT sensor telemetry, weather forecasts, explainable irrigation recommendations,
performed irrigation events, and quantified economic/water savings metrics.
"""

import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


# -----------------------------------------------------------------------------
# 1. User Model (Farmer Authentication & Multi-Tenant Data Isolation)
# -----------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    preferred_language = Column(String(10), default="hi", nullable=False)  # hi, en, pa, mr
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    fields = relationship("Field", back_populates="owner", cascade="all, delete-orphan")
    irrigation_events = relationship("IrrigationEventRecord", back_populates="user")


# -----------------------------------------------------------------------------
# 2. Field Model (Plot Attributes, Soil, Crop, and Pumping Infrastructure)
# -----------------------------------------------------------------------------
class Field(Base):
    __tablename__ = "fields"

    id = Column(String(100), primary_key=True, index=True)  # e.g. "field_karnal_01" or UUID
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    area_acres = Column(Float, nullable=False)  # in Acres
    area_sqm = Column(Float, nullable=False)  # in m² (1 acre = 4046.86 m²)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    village_district = Column(String(200), nullable=True)
    soil_type = Column(String(50), nullable=False)  # sandy, loamy, clayey, sandy_loam, clay_loam, black_soil
    crop_type = Column(String(50), nullable=False)  # wheat, cotton, rice, mustard, maize, tomato
    growth_stage = Column(String(50), default="vegetative", nullable=False)
    sowing_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    irrigation_method = Column(String(50), default="flood", nullable=False)  # drip, sprinkler, furrow, flood
    pump_type = Column(String(50), default="diesel", nullable=False)  # diesel, electric, solar
    pump_hp = Column(Float, default=7.5, nullable=False)  # Horsepower
    pump_flow_rate_lph = Column(Float, default=25000.0, nullable=False)  # Litres per hour
    electricity_tariff_inr_kwh = Column(Float, default=7.0, nullable=False)
    diesel_price_inr_l = Column(Float, default=89.0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="fields")
    sensor_readings = relationship("SensorReadingRecord", back_populates="field", cascade="all, delete-orphan")
    weather_forecasts = relationship("WeatherForecastRecord", back_populates="field", cascade="all, delete-orphan")
    recommendations = relationship("IrrigationRecommendationRecord", back_populates="field", cascade="all, delete-orphan")
    events = relationship("IrrigationEventRecord", back_populates="field", cascade="all, delete-orphan")
    savings_metric = relationship("SavingsMetricRecord", back_populates="field", uselist=False, cascade="all, delete-orphan")


# -----------------------------------------------------------------------------
# 3. Crop Profiles (FAO-56 Crop Coefficients, Root Depths & Water Sensitivities)
# -----------------------------------------------------------------------------
class CropProfileRecord(Base):
    __tablename__ = "crop_profiles"

    crop_id = Column(String(50), primary_key=True)  # wheat, cotton, rice, mustard, maize, tomato
    name_en = Column(String(100), nullable=False)
    name_hi = Column(String(100), nullable=False)
    scientific_name = Column(String(120), nullable=False)
    root_depth_max_cm = Column(Float, default=100.0, nullable=False)
    kc_initial = Column(Float, default=0.35, nullable=False)
    kc_mid = Column(Float, default=1.15, nullable=False)
    kc_end = Column(Float, default=0.30, nullable=False)
    critical_moisture_threshold_pct = Column(Float, default=45.0, nullable=False)  # MAD threshold %
    waterlogging_sensitivity = Column(String(20), default="HIGH", nullable=False)  # LOW, MODERATE, HIGH, CRITICAL
    stage_coefficients_json = Column(JSON, nullable=True)  # Stage specific Kc and days
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


# -----------------------------------------------------------------------------
# 4. Soil Profiles (Hydraulic Properties, Infiltration & Water-Holding Capacity)
# -----------------------------------------------------------------------------
class SoilProfileRecord(Base):
    __tablename__ = "soil_profiles"

    soil_type = Column(String(50), primary_key=True)  # sandy, loamy, clayey, sandy_loam, clay_loam, black_soil
    name_en = Column(String(100), nullable=False)
    name_hi = Column(String(100), nullable=False)
    field_capacity_pct = Column(Float, nullable=False)  # e.g. 22.0% for sandy_loam, 38.0% for clay
    wilting_point_pct = Column(Float, nullable=False)  # e.g. 10.0% for sandy_loam, 22.0% for clay
    available_water_capacity_mm_per_m = Column(Float, nullable=False)  # mm water per meter soil depth
    infiltration_rate_mm_hr = Column(Float, nullable=False)  # mm/hr infiltration speed
    drainage_speed = Column(String(20), nullable=False)  # FAST, MODERATE, SLOW
    waterlogging_risk_factor = Column(String(20), nullable=False)  # LOW, MODERATE, HIGH


# -----------------------------------------------------------------------------
# 5. Sensor Readings (Soil Moisture Telemetry & Topsoil Microclimate)
# -----------------------------------------------------------------------------
class SensorReadingRecord(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), ForeignKey("fields.id", ondelete="CASCADE"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)
    soil_moisture_pct = Column(Float, nullable=False)  # Volumetric Water Content % (0-100)
    soil_moisture_root_zone_pct = Column(Float, nullable=True)
    soil_temperature_c = Column(Float, nullable=True)
    ambient_temperature_c = Column(Float, nullable=True)
    ambient_humidity_pct = Column(Float, nullable=True)
    battery_pct = Column(Float, nullable=True)
    is_simulated = Column(Boolean, default=False, nullable=False)
    source = Column(String(50), default="iot_sensor", nullable=False)  # iot_sensor, manual_input, satellite_estimate

    field = relationship("Field", back_populates="sensor_readings")


# -----------------------------------------------------------------------------
# 6. Weather Forecasts (Explicitly Distinguishing Forecast from Historical Rain)
# -----------------------------------------------------------------------------
class WeatherForecastRecord(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), ForeignKey("fields.id", ondelete="CASCADE"), index=True, nullable=False)
    fetch_timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    forecast_date = Column(String(20), index=True, nullable=False)  # YYYY-MM-DD
    temp_min_c = Column(Float, nullable=False)
    temp_max_c = Column(Float, nullable=False)
    humidity_mean_pct = Column(Float, nullable=False)
    precipitation_mm = Column(Float, nullable=False)
    precipitation_probability_pct = Column(Float, default=0.0, nullable=False)
    et0_fao_evapotranspiration = Column(Float, nullable=False)  # Reference ET0 in mm/day
    wind_speed_kmh = Column(Float, default=10.0, nullable=False)
    weather_code = Column(Integer, default=0, nullable=False)
    weather_description = Column(String(100), default="Clear sky", nullable=False)
    is_forecast = Column(Boolean, default=True, nullable=False)  # False if historical recorded rainfall
    provider = Column(String(50), default="open_meteo", nullable=False)

    field = relationship("Field", back_populates="weather_forecasts")


# -----------------------------------------------------------------------------
# 7. Irrigation Recommendations (Structured, Explainable, Rain-Aware Advice)
# -----------------------------------------------------------------------------
class IrrigationRecommendationRecord(Base):
    __tablename__ = "irrigation_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), ForeignKey("fields.id", ondelete="CASCADE"), index=True, nullable=False)
    decision = Column(String(20), index=True, nullable=False)  # IRRIGATE | WAIT | MONITOR
    recommended_water_depth_mm = Column(Float, nullable=False)
    recommended_water_volume_litres = Column(Float, nullable=False)
    suggested_irrigation_window = Column(String(200), nullable=False)
    confidence_level = Column(String(20), default="HIGH", nullable=False)  # HIGH, MEDIUM, LOW, DEGRADED
    data_quality_status = Column(String(50), default="LIVE_FUSION", nullable=False)
    reasons_json = Column(JSON, nullable=False)
    reasons_hi_json = Column(JSON, nullable=False)
    expected_rainfall_mm = Column(Float, default=0.0, nullable=False)
    forecast_horizon_hours = Column(Integer, default=72, nullable=False)
    soil_moisture_status = Column(String(50), nullable=False)
    crop_stage = Column(String(50), nullable=False)
    etc_crop_water_demand_mm = Column(Float, nullable=False)
    effective_rainfall_mm = Column(Float, default=0.0, nullable=False)
    soil_water_deficit_mm = Column(Float, nullable=False)
    irrigation_efficiency_pct = Column(Float, nullable=False)
    baseline_water_volume_litres = Column(Float, nullable=False)
    estimated_water_saved_litres = Column(Float, default=0.0, nullable=False)
    estimated_cost_saved_inr = Column(Float, default=0.0, nullable=False)
    estimated_diesel_saved_litres = Column(Float, default=0.0, nullable=False)
    warnings_json = Column(JSON, nullable=False)
    reassessment_due_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)

    field = relationship("Field", back_populates="recommendations")


# -----------------------------------------------------------------------------
# 8. Irrigation Events (Actual Irrigation Performed by Farmer)
# -----------------------------------------------------------------------------
class IrrigationEventRecord(Base):
    __tablename__ = "irrigation_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), ForeignKey("fields.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    event_date = Column(String(20), index=True, nullable=False)  # YYYY-MM-DD
    applied_water_depth_mm = Column(Float, nullable=False)
    applied_water_volume_litres = Column(Float, nullable=False)
    duration_hours = Column(Float, nullable=False)
    irrigation_method = Column(String(50), nullable=False)
    energy_source = Column(String(20), default="diesel", nullable=False)  # diesel | electric | solar
    energy_units_consumed = Column(Float, default=0.0, nullable=False)  # Litres diesel or kWh electric
    energy_cost_inr = Column(Float, default=0.0, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    field = relationship("Field", back_populates="events")
    user = relationship("User", back_populates="irrigation_events")


# -----------------------------------------------------------------------------
# 9. Savings and Impact Metrics (Quantified against Documented Baseline)
# -----------------------------------------------------------------------------
class SavingsMetricRecord(Base):
    __tablename__ = "savings_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), ForeignKey("fields.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    baseline_type = Column(String(50), default="TRADITIONAL_CALENDAR_FLOOD", nullable=False)
    baseline_water_litres = Column(Float, default=0.0, nullable=False)
    actual_water_litres = Column(Float, default=0.0, nullable=False)
    total_water_saved_litres = Column(Float, default=0.0, nullable=False)
    total_diesel_saved_litres = Column(Float, default=0.0, nullable=False)
    total_electricity_saved_kwh = Column(Float, default=0.0, nullable=False)
    total_cost_saved_inr = Column(Float, default=0.0, nullable=False)
    total_co2_kg_saved = Column(Float, default=0.0, nullable=False)
    prevented_disease_events_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    field = relationship("Field", back_populates="savings_metric")


# -----------------------------------------------------------------------------
# Legacy Models Preserved for Existing API Compatibility
# -----------------------------------------------------------------------------
class FarmProfileRecord(Base):
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
    __tablename__ = "risk_assessment_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(String(100), index=True, nullable=False)
    crop_name = Column(String(50), nullable=False)
    growth_stage = Column(String(50), nullable=False)
    days_after_sowing = Column(Integer, default=0, nullable=False)
    risk_type = Column(String(50), nullable=False)
    risk_level = Column(String(20), nullable=False)
    confidence = Column(String(20), nullable=False)
    evidence = Column(JSON, nullable=False)
    recommendation = Column(Text, nullable=False)
    data_sources = Column(JSON, nullable=False)
    limitations = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class RiskAnalysisRecord(Base):
    __tablename__ = "risk_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), index=True, nullable=False)
    crop_name = Column(String(50), nullable=False)
    decision_mode = Column(String(20), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_category = Column(String(20), nullable=False)
    recommended_action = Column(String(50), nullable=False)
    weather_summary = Column(Text, nullable=True)
    full_response_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class FarmerFeedbackRecord(Base):
    __tablename__ = "farmer_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String(100), index=True, nullable=False)
    crop_name = Column(String(50), nullable=False)
    decision_mode = Column(String(20), nullable=False)
    recommended_action_was = Column(String(50), nullable=False)
    actual_action_taken = Column(String(50), nullable=False)
    actual_date = Column(String(20), nullable=False)
    actual_outcome_status = Column(String(50), nullable=False)
    seed_washout_occurred = Column(Boolean, default=False, nullable=False)
    grain_quality_satisfactory = Column(Boolean, default=True, nullable=False)
    farmer_comments = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
