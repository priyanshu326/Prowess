"""
Request and response schemas for What-If Analysis.
Compares risk of acting today versus waiting 3 or 5 days.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class WhatIfAnalysisRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, examples=[29.6857])
    longitude: float = Field(..., ge=-180.0, le=180.0, examples=[76.9905])
    crop_name: str = Field(..., examples=["wheat"])
    decision_mode: Literal["sowing", "harvest"] = Field("sowing", description="Whether evaluating sowing or harvest")
    current_crop_stage: str = Field(default="sowing", examples=["sowing"])
    candidate_offsets_days: List[int] = Field(default=[0, 3, 5], description="Days from today to compare (e.g. [0, 3, 5])")
    soil_type: Optional[str] = "Alluvial Loam"
    irrigation_availability: bool = True


class WhatIfScenarioComparison(BaseModel):
    offset_days: int
    target_date: str
    risk_score: float
    safety_score: float
    risk_category: Literal["LOW", "MODERATE", "HIGH", "VERY_HIGH"]
    recommended_action: str
    forecast_rain_window_mm: float
    soil_moisture_estimate_pct: float
    rank: int
    primary_tradeoff_en: str
    primary_tradeoff_hi: str


class WhatIfAnalysisResponse(BaseModel):
    status: str = "success"
    crop_name: str
    decision_mode: Literal["sowing", "harvest"]
    analyzed_date: str
    scenarios: List[WhatIfScenarioComparison]
    recommended_offset_days: int
    optimal_date: str
    decision_rationale_en: str
    decision_rationale_hi: str
