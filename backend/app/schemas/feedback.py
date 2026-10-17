"""
Schemas for farmer outcome feedback and history retrieval.
"""

from typing import Optional, List, Any
from pydantic import BaseModel, Field


class FarmerFeedbackCreate(BaseModel):
    field_id: str = Field(..., description="Unique identifier for farmer field or plot", examples=["karnal-field-101"])
    crop_name: str = Field(..., examples=["wheat"])
    decision_mode: str = Field(..., examples=["sowing"])
    recommended_action_was: str = Field(..., examples=["SOW_NOW"])
    actual_action_taken: str = Field(..., examples=["SOWED"])
    actual_date: str = Field(..., description="Date action was taken (YYYY-MM-DD)", examples=["2026-10-18"])
    actual_outcome_status: str = Field(..., description="e.g. EXCELLENT_GERMINATION, PARTIAL_WASHOUT, MOLD_DAMAGE, SUCCESSFUL_HARVEST")
    seed_washout_occurred: bool = Field(False)
    grain_quality_satisfactory: bool = Field(True)
    farmer_comments: Optional[str] = None


class FarmerFeedbackResponse(BaseModel):
    status: str = "success"
    message: str = "Farmer outcome recorded successfully"
    feedback_id: int
    field_id: str
    recorded_at: str


class HistoryRecordResponse(BaseModel):
    status: str = "success"
    field_id: str
    total_records: int
    analyses: List[dict]
    feedbacks: List[dict]
