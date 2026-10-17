"""
SmartKisan Pydantic Data Schemas.
Enforces strict input validation, transparent confidence ratings,
and explainable agricultural decision-support models.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


# -------------------------------------------------------------------------
# Farm Profile Schemas
# -------------------------------------------------------------------------
class FarmProfileCreate(BaseModel):
    farm_id: Optional[str] = Field(
        None,
        description="Unique farm identifier (alphanumeric, auto-generated if omitted)",
        examples=["farm_karnal_01"]
    )
    farmer_name: Optional[str] = Field(
        "Kisan Brother",
        description="Farmer's name or title",
        examples=["Ram Prasad"]
    )
    crop_name: str = Field(
        ...,
        description="Crop name (e.g. wheat, rice, mustard, maize, cotton, soybean, tomato)",
        examples=["wheat"]
    )
    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude in decimal degrees",
        examples=[29.6857]
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude in decimal degrees",
        examples=[76.9905]
    )
    village_district: Optional[str] = Field(
        "Karnal, Haryana",
        description="Village, Block, or District name",
        examples=["Kunjpura, Karnal, Haryana"]
    )
    soil_type: str = Field(
        ...,
        description="Soil texture class (clay_loam, sandy_loam, loam, clay, black_soil, alluvial, sandy)",
        examples=["clay_loam"]
    )
    sowing_date: str = Field(
        ...,
        description="Date of sowing or seedling transplanting (YYYY-MM-DD)",
        examples=["2026-10-01"]
    )
    irrigation_method: str = Field(
        ...,
        description="Method of irrigation (flood, furrow, drip, sprinkler, rainfed)",
        examples=["flood"]
    )
    field_area_acres: Optional[float] = Field(
        2.0,
        ge=0.1,
        le=500.0,
        description="Field size in acres",
        examples=[2.5]
    )


class FarmProfileResponse(BaseModel):
    status: str = "success"
    message: str = "Farm profile registered successfully"
    farm_id: str
    farmer_name: str
    crop_name: str
    latitude: float
    longitude: float
    village_district: Optional[str]
    soil_type: str
    sowing_date: str
    irrigation_method: str
    field_area_acres: float
    created_at: str


# -------------------------------------------------------------------------
# Farmer Field Observation Schemas
# -------------------------------------------------------------------------
class ObservationCreate(BaseModel):
    farm_id: str = Field(..., description="ID of the registered farm", examples=["farm_karnal_01"])
    observation_date: Optional[str] = Field(
        None,
        description="Date of observation in YYYY-MM-DD format (defaults to current date)",
        examples=["2026-10-17"]
    )
    crop_condition: str = Field(
        ...,
        description="Overall crop vigor (healthy, slight_wilting, moderate_wilting, yellowing, stunted, pest_damage)",
        examples=["healthy"]
    )
    last_irrigation_date: Optional[str] = Field(
        None,
        description="Date of most recent irrigation (YYYY-MM-DD)",
        examples=["2026-10-08"]
    )
    last_irrigation_amount_mm: Optional[float] = Field(
        None,
        ge=0.0,
        le=300.0,
        description="Estimated water applied in mm (e.g., 50mm for standard tubewell flooding)",
        examples=[50.0]
    )
    visible_symptoms: List[str] = Field(
        default_factory=list,
        description="Farmer-observed symptoms (e.g. leaf_curling, dry_crust_soil, lower_leaf_yellowing)",
        examples=[["dry_crust_soil", "lower_leaf_yellowing"]]
    )
    soil_surface_status: Optional[str] = Field(
        "normal",
        description="Visual condition of topsoil (cracked_dry, damp, waterlogged, normal)",
        examples=["cracked_dry"]
    )
    farmer_notes: Optional[str] = Field(
        None,
        description="Free text notes or comments in Hindi / English",
        examples=["हल्का पीलापन दिख रहा है, पिछले 9 दिनों से पानी नहीं दिया है।"]
    )


class ObservationResponse(BaseModel):
    status: str = "success"
    message: str = "Field observation recorded successfully"
    observation_id: int
    farm_id: str
    observation_date: str
    crop_condition: str
    last_irrigation_date: Optional[str]
    last_irrigation_amount_mm: Optional[float]
    visible_symptoms: List[str]
    soil_surface_status: Optional[str]
    farmer_notes: Optional[str]
    recorded_at: str


# -------------------------------------------------------------------------
# Risk Assessment Schemas (Exact Specification)
# -------------------------------------------------------------------------
RiskType = Literal["heat_stress", "rainfall_waterlogging", "water_stress_deficit"]
RiskLevel = Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
ConfidenceLabel = Literal["HIGH", "MEDIUM", "LOW", "DEGRADED"]


class SingleRiskAssessment(BaseModel):
    farm_id: str
    crop: str
    growth_stage: str
    days_after_sowing: int
    risk_type: RiskType
    risk_level: RiskLevel
    evidence: List[str] = Field(..., description="Concrete, quantified observational and meteorological proof")
    recommendation: str = Field(..., description="Deterministic, actionable agronomic advice")
    confidence: ConfidenceLabel = Field(
        ...,
        description="Confidence label based on data completeness and rule validation, not arbitrary AI-generated percentages"
    )
    data_sources: List[str] = Field(..., description="Data provenance (e.g., Open-Meteo, ICAR Benchmark, Farmer Observation)")
    generated_at: str
    limitations: List[str] = Field(..., description="Explicit scientific caveats and sensorless model boundaries")


class RiskAssessmentSummary(BaseModel):
    status: str = "success"
    farm_id: str
    crop: str
    growth_stage: str
    days_after_sowing: int
    overall_risk_level: RiskLevel
    summary_headline: str
    summary_headline_hi: str
    assessments: List[SingleRiskAssessment]
    confidence: ConfidenceLabel
    generated_at: str


# -------------------------------------------------------------------------
# Actionable Recommendations Schemas
# -------------------------------------------------------------------------
class ActionableRecommendation(BaseModel):
    id: str
    priority: int = Field(..., ge=1, le=4, description="1=Immediate/Safety, 2=Next 48h, 3=Upcoming Window, 4=Routine")
    category: Literal["irrigation", "drainage", "thermal_protection", "nutrient_management", "field_monitoring"]
    title_en: str
    title_hi: str
    action_en: str
    action_hi: str
    timing_window: str
    why: str
    cost_or_resource_impact: str
    scientific_basis: str


class RecommendationsResponse(BaseModel):
    status: str = "success"
    farm_id: str
    crop: str
    growth_stage: str
    days_after_sowing: int
    recommendations: List[ActionableRecommendation]
    multilingual_summary: Dict[str, str] = Field(
        ...,
        description="Simple summary in Hindi and English"
    )
    ai_explanation: Optional[str] = Field(
        None,
        description="Optional Gemini-enhanced explanation adhering strictly to validated rules"
    )
    ai_layer_status: Literal["active_gemini", "deterministic_fallback"]
    confidence: ConfidenceLabel
    generated_at: str


# -------------------------------------------------------------------------
# Consolidated Dashboard Schemas
# -------------------------------------------------------------------------
class DashboardResponse(BaseModel):
    status: str = "success"
    farm_id: str
    farm_profile: Dict[str, Any]
    latest_observation: Optional[Dict[str, Any]]
    weather_forecast_summary: Dict[str, Any]
    growth_stage_details: Dict[str, Any]
    risk_assessments: List[SingleRiskAssessment]
    recommendations: List[ActionableRecommendation]
    multilingual_advisory: Dict[str, str]
    ai_explanation: Optional[str]
    methodology_audit: Dict[str, Any]
    generated_at: str
