"""
Request and response schemas for Sowing Risk Intelligence.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class SowingAnalysisRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[29.6857])
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[76.9905])
    crop_name: str = Field(..., description="Crop name (e.g., wheat, rice, maize, cotton, soybean, mustard)", examples=["wheat"])
    crop_variety: Optional[str] = Field(None, description="Crop variety (e.g., HD-2967, PBW-343, Pusa 44)")
    current_crop_stage: str = Field(default="sowing", description="Current field / crop stage")
    expected_sowing_date: Optional[str] = Field(None, description="Expected sowing date (YYYY-MM-DD)")
    soil_type: Optional[str] = Field("Alluvial Loam", description="Soil type (Alluvial, Black, Clay, Sandy, Red)")
    irrigation_availability: bool = Field(True, description="Whether tubewell/canal irrigation is available")
    last_sowing_date: Optional[str] = Field(None, description="Historical or prior sowing date if re-sowing")
    farmer_reported_field_conditions: Optional[str] = Field(None, description="Free-text notes (e.g. soil crusting, standing water)")

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class RiskFactor(BaseModel):
    factor_name: str
    factor_category: Literal["HEAVY_RAINFALL", "DRY_SPELL", "SOIL_TEMPERATURE", "SOIL_MOISTURE", "FORECAST_UNCERTAINTY"]
    severity: Literal["SAFE", "MODERATE", "CRITICAL"]
    contribution_pts: float = Field(..., description="Risk points contributed to 0-100 score")
    description_en: str
    description_hi: str


class CandidateSowingWindow(BaseModel):
    start_date: str
    end_date: str
    suitability_score: float = Field(..., ge=0, le=100)
    risk_category: Literal["LOW", "MODERATE", "HIGH", "VERY_HIGH"]
    rank: int
    rationale_en: str
    rationale_hi: str


class SeedWashoutRotRisk(BaseModel):
    washout_probability_pct: float
    rot_probability_pct: float
    estimated_resowing_cost_inr_per_acre: float
    protective_guidance_en: str
    protective_guidance_hi: str


class UncertaintyBreakdown(BaseModel):
    forecast_lead_time_days: int
    forecast_confidence_pct: float
    missing_variables: List[str]
    is_stale_data: bool
    agronomic_confidence: Literal["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"]


class SowingAnalysisResponse(BaseModel):
    status: str = "success"
    crop_id: str
    crop_name_en: str
    crop_name_hi: str
    recommended_action: Literal["SOW_NOW", "WAIT", "CONDITIONAL"]
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Overall risk score (0=safest, 100=highest risk)")
    risk_category: Literal["LOW", "MODERATE", "HIGH", "VERY_HIGH"]
    sowing_safety_score: float = Field(..., ge=0.0, le=100.0, description="Sowing safety score (100 - risk_score)")
    candidate_windows: List[CandidateSowingWindow]
    main_risk_factors: List[RiskFactor]
    seed_washout_rot_risk: SeedWashoutRotRisk
    suggested_reassessment_time: str
    explanation_en: str
    explanation_hi: str
    uncertainty: UncertaintyBreakdown
    analyzed_at: str
