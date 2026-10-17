"""
Request and response schemas for Harvest Risk Intelligence.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from .sowing import UncertaintyBreakdown


class HarvestAnalysisRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[29.6857])
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[76.9905])
    crop_name: str = Field(..., description="Crop name (e.g., wheat, rice, maize, cotton, soybean, mustard)", examples=["wheat"])
    crop_variety: Optional[str] = Field(None, description="Crop variety")
    current_crop_stage: str = Field(..., description="Current crop stage (e.g. physiological_maturity, harvest_ready, dough, flowering)", examples=["harvest_ready"])
    expected_harvest_date: Optional[str] = Field(None, description="Planned harvest date (YYYY-MM-DD)")
    storage_protection_available: bool = Field(True, description="Whether tarpaulins or covered storage is available on farm")
    farmer_reported_field_conditions: Optional[str] = Field(None, description="Observations like lodging or wet soil")

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


class CandidateHarvestWindow(BaseModel):
    start_date: str
    end_date: str
    consecutive_dry_days: int
    drying_rh_mean_pct: float
    suitability_score: float = Field(..., ge=0, le=100)
    risk_category: Literal["LOW", "MODERATE", "HIGH", "VERY_HIGH"]
    rank: int
    rationale_en: str
    rationale_hi: str


class GrainQualityRisk(BaseModel):
    expected_grain_moisture_pct: float
    safe_storage_moisture_limit_pct: float
    mold_and_discoloration_risk: Literal["MINIMAL", "MODERATE", "SEVERE"]
    estimated_mandi_discount_inr_per_quintal: float
    quality_guidance_en: str
    quality_guidance_hi: str


class FieldAccessRisk(BaseModel):
    machinery_trafficability: Literal["GOOD", "MARGINAL", "POOR_COMBINE_SINK_RISK"]
    lodging_risk: Literal["LOW", "MEDIUM", "HIGH"]
    access_guidance_en: str
    access_guidance_hi: str


class HarvestAnalysisResponse(BaseModel):
    status: str = "success"
    crop_id: str
    crop_name_en: str
    crop_name_hi: str
    recommended_action: Literal["HARVEST_IF_MATURE", "WAIT_FOR_DRY_WINDOW", "MONITOR"]
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Overall harvest risk score (0=ideal dry weather, 100=extreme wet)")
    risk_category: Literal["LOW", "MODERATE", "HIGH", "VERY_HIGH"]
    harvest_safety_score: float = Field(..., ge=0.0, le=100.0, description="Harvest safety score (100 - risk_score)")
    is_crop_mature: bool
    maturity_stage_evaluated: str
    maturity_warning: Optional[str] = None
    candidate_windows: List[CandidateHarvestWindow]
    grain_quality_risk: GrainQualityRisk
    field_access_risk: FieldAccessRisk
    main_risk_factors: List[dict]
    suggested_reassessment_time: str
    explanation_en: str
    explanation_hi: str
    uncertainty: UncertaintyBreakdown
    analyzed_at: str
