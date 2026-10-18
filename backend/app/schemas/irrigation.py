"""
Pydantic schemas for Smart Irrigation decision engine, water requirement calculator,
field management, IoT sensors, weather, and economic impact metrics.
"""

from typing import List, Optional, Dict, Any, Literal
import datetime
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Field Schemas
# -----------------------------------------------------------------------------
class FieldCreate(BaseModel):
    id: Optional[str] = Field(None, description="Unique field ID (auto-generated if omitted)", examples=["field_karnal_01"])
    name: str = Field(..., description="Field plot name", examples=["उत्तर का खेत (North Plot)"])
    area_acres: float = Field(..., gt=0, description="Field area in Acres", examples=[2.5])
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Decimal latitude", examples=[29.6857])
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Decimal longitude", examples=[76.9905])
    village_district: Optional[str] = Field("Karnal, Haryana", description="Village and District", examples=["Kunjpura, Karnal"])
    soil_type: str = Field(..., description="Soil texture: sandy, loamy, clayey, sandy_loam, clay_loam, black_soil", examples=["clay_loam"])
    crop_type: str = Field(..., description="Crop: wheat, cotton, rice, mustard, maize, tomato, soybean", examples=["wheat"])
    growth_stage: Optional[str] = Field("crown_root_initiation", description="Current phenological stage", examples=["crown_root_initiation"])
    sowing_date: str = Field(..., description="Sowing date (YYYY-MM-DD)", examples=["2026-10-01"])
    irrigation_method: Optional[str] = Field("flood", description="Irrigation method: drip, sprinkler, furrow, flood", examples=["flood"])
    pump_type: Optional[str] = Field("diesel", description="Power source: diesel, electric, solar", examples=["diesel"])
    pump_hp: Optional[float] = Field(7.5, description="Pump motor horsepower", examples=[7.5])
    pump_flow_rate_lph: Optional[float] = Field(25000.0, description="Tubewell flow rate in Litres per Hour", examples=[25000.0])
    electricity_tariff_inr_kwh: Optional[float] = Field(7.0, description="Electricity cost (₹/kWh)", examples=[7.0])
    diesel_price_inr_l: Optional[float] = Field(89.0, description="Diesel price (₹/Litre)", examples=[89.0])


class FieldResponse(BaseModel):
    id: str
    user_id: int
    name: str
    area_acres: float
    area_sqm: float
    latitude: float
    longitude: float
    village_district: Optional[str] = None
    soil_type: str
    crop_type: str
    growth_stage: str
    sowing_date: str
    irrigation_method: str
    pump_type: str
    pump_hp: float
    pump_flow_rate_lph: float
    electricity_tariff_inr_kwh: float
    diesel_price_inr_l: float
    created_at: datetime.datetime


# -----------------------------------------------------------------------------
# Sensor Reading Schemas
# -----------------------------------------------------------------------------
class SensorReadingCreate(BaseModel):
    field_id: str = Field(..., description="Target field ID", examples=["field_karnal_01"])
    soil_moisture_pct: float = Field(..., ge=0.0, le=100.0, description="Topsoil volumetric water content %", examples=[32.5])
    soil_moisture_root_zone_pct: Optional[float] = Field(None, ge=0.0, le=100.0, description="Deep root zone moisture %", examples=[41.0])
    soil_temperature_c: Optional[float] = Field(None, description="Soil temperature in °C", examples=[22.4])
    ambient_temperature_c: Optional[float] = Field(None, description="Ambient air temperature in °C", examples=[28.5])
    ambient_humidity_pct: Optional[float] = Field(None, ge=0.0, le=100.0, description="Relative humidity %", examples=[55.0])
    is_simulated: Optional[bool] = Field(False, description="True if synthetic reading for demonstration/testing")
    source: Optional[str] = Field("iot_sensor", description="Source: iot_sensor, manual_input, satellite_estimate")


class SensorReadingResponse(BaseModel):
    id: int
    field_id: str
    timestamp: datetime.datetime
    soil_moisture_pct: float
    soil_moisture_root_zone_pct: Optional[float] = None
    soil_temperature_c: Optional[float] = None
    ambient_temperature_c: Optional[float] = None
    ambient_humidity_pct: Optional[float] = None
    is_simulated: bool
    source: str


# -----------------------------------------------------------------------------
# Weather Schemas for Field Endpoints
# -----------------------------------------------------------------------------
class DailyWeatherPoint(BaseModel):
    date: str
    temp_min_c: float
    temp_max_c: float
    precipitation_mm: float
    precipitation_probability_pct: float
    et0_fao_evapotranspiration: float
    humidity_mean_pct: float
    wind_speed_kmh: float
    weather_description: str
    is_forecast: bool = True


class FieldWeatherResponse(BaseModel):
    field_id: str
    latitude: float
    longitude: float
    provider: str
    cached: bool
    current: Dict[str, Any]
    daily_forecast: List[DailyWeatherPoint]
    cumulative_rain_next_48h_mm: float
    cumulative_rain_next_72h_mm: float
    distinction_note: str = "Precipitation past today is forecasted; historical readings reflect ground or reanalysis measurements."


# -----------------------------------------------------------------------------
# Irrigation Recommendation Schemas (Section 3.E Deliverable)
# -----------------------------------------------------------------------------
DecisionType = Literal["IRRIGATE", "WAIT", "MONITOR"]
ConfidenceType = Literal["HIGH", "MEDIUM", "LOW", "DEGRADED"]
QualityStatusType = Literal["LIVE_FUSION", "SENSOR_ONLY", "WEATHER_ONLY_ESTIMATE", "OFFLINE_CACHED_STALE"]


class IrrigationRecommendationResponse(BaseModel):
    id: Optional[int] = None
    field_id: str
    decision: DecisionType = Field(..., description="Decision: IRRIGATE, WAIT, or MONITOR")
    recommended_water_depth_mm: float = Field(..., description="Target application depth in mm")
    estimated_water_volume_litres: float = Field(..., description="Application volume in litres = mm * area_sqm")
    suggested_irrigation_window: str = Field(..., description="Recommended diurnal time window to minimize evaporation")
    confidence_level: ConfidenceType = Field(..., description="Confidence rating based on data completeness")
    data_quality_status: QualityStatusType = Field(..., description="Source telemetry fidelity indicator")
    reasons: List[str] = Field(..., description="Clear human-readable reasons in English")
    reasons_hi: List[str] = Field(..., description="Actionable reasons in simple Hindi for farmers")
    expected_rainfall_mm: float = Field(..., description="Expected rainfall in the next 48-72h horizon")
    forecast_horizon_hours: int = Field(72, description="Rainfall outlook window in hours")
    crop_growth_stage: str = Field(..., description="Current crop phenology stage")
    soil_moisture_status: str = Field(..., description="CRITICAL_DEFICIT, MODERATE_DEFICIT, OPTIMAL, SATURATED, WATERLOGGED")
    soil_moisture_pct: float = Field(..., description="Current or estimated soil moisture percentage")

    # Scientifically Grounded Water Budget
    etc_crop_water_demand_mm: float = Field(..., description="ETc = ET0 * Kc in mm/day")
    effective_rainfall_mm: float = Field(..., description="Effective usable rainfall in mm")
    soil_water_deficit_mm: float = Field(..., description="Soil water deficit in root zone in mm")
    irrigation_efficiency_pct: float = Field(..., description="Application efficiency % of field irrigation method")

    # Documented Baseline Savings
    baseline_water_volume_litres: float = Field(..., description="Traditional flood irrigation benchmark volume")
    estimated_water_saved_litres: float = Field(..., description="Litres saved vs traditional calendar flood")
    estimated_cost_saved_inr: float = Field(..., description="Diesel or electricity cost saved in ₹")
    estimated_diesel_saved_litres: float = Field(..., description="Diesel fuel saved in litres")
    estimated_pumping_hours_saved: float = Field(..., description="Tubewell running hours saved")

    # Agronomic Safeguards
    warnings: List[str] = Field(default_factory=list, description="Warnings for waterlogging, disease risk, nutrient leaching")
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    next_reassessment_time: datetime.datetime = Field(..., description="Suggested recheck timestamp")


# -----------------------------------------------------------------------------
# Actual Irrigation Event Schemas
# -----------------------------------------------------------------------------
class IrrigationEventCreate(BaseModel):
    field_id: str = Field(..., description="Field identifier", examples=["field_karnal_01"])
    event_date: Optional[str] = Field(None, description="Date (YYYY-MM-DD), defaults to today")
    applied_water_depth_mm: float = Field(..., gt=0, description="Estimated or metered depth applied in mm", examples=[25.0])
    duration_hours: float = Field(..., gt=0, description="Pump operating duration in hours", examples=[3.5])
    irrigation_method: Optional[str] = Field(None, description="drip, sprinkler, furrow, flood")
    energy_source: Optional[str] = Field("diesel", description="diesel, electric, solar")
    energy_units_consumed: Optional[float] = Field(None, description="Litres of diesel or kWh electric")
    notes: Optional[str] = Field(None, description="Farmer notes e.g. 'Light watering before fertilizer top dressing'")


class IrrigationEventResponse(BaseModel):
    id: int
    field_id: str
    user_id: int
    event_date: str
    applied_water_depth_mm: float
    applied_water_volume_litres: float
    duration_hours: float
    irrigation_method: str
    energy_source: str
    energy_units_consumed: float
    energy_cost_inr: float
    notes: Optional[str] = None
    created_at: datetime.datetime


# -----------------------------------------------------------------------------
# Field History Schema
# -----------------------------------------------------------------------------
class FieldIrrigationHistoryResponse(BaseModel):
    field_id: str
    total_recommendations: int
    total_events: int
    recent_recommendations: List[IrrigationRecommendationResponse]
    recent_events: List[IrrigationEventResponse]


# -----------------------------------------------------------------------------
# Field Dashboard Summary Schema
# -----------------------------------------------------------------------------
class FieldDashboardResponse(BaseModel):
    field_id: str
    field_name: str
    crop_type: str
    crop_stage: str
    soil_type: str
    area_acres: float
    current_soil_moisture_pct: float
    moisture_status: str
    latest_decision: DecisionType
    next_action_headline: str
    next_action_headline_hi: str
    etc_daily_mm: float
    rain_forecast_48h_mm: float
    weather_risk: str
    cumulative_water_saved_litres: float
    cumulative_cost_saved_inr: float
    cumulative_diesel_saved_litres: float
    co2_saved_kg: float
    upcoming_forecast_summary: List[Dict[str, Any]]
    active_warnings: List[str]


# -----------------------------------------------------------------------------
# Simulation Mode Schema (Judge / Demonstration Testing)
# -----------------------------------------------------------------------------
class SimulationScenarioRequest(BaseModel):
    scenario: Literal[
        "dry_soil_no_rain",
        "adequate_moisture_rain_expected",
        "heavy_rain_tomorrow",
        "heatwave_high_et",
        "sandy_soil_fast_drainage",
        "clay_soil_waterlogging_risk",
        "sensor_failure_low_confidence",
    ] = Field(..., description="Preset simulation scenario for hackathon judges")
    field_id: Optional[str] = Field("field_karnal_01", description="Field to run simulation on")
    custom_soil_moisture_pct: Optional[float] = Field(None, description="Override soil moisture %")
    custom_forecast_rain_mm: Optional[float] = Field(None, description="Override expected rain mm")


class SimulationScenarioResponse(BaseModel):
    scenario: str
    scenario_description: str
    scenario_description_hi: str
    recommendation: IrrigationRecommendationResponse
    why_this_matters_for_farmers: str
