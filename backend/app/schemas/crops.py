"""
Schemas for supported crops metadata and agronomic parameters.
"""

from typing import List, Dict, Any
from pydantic import BaseModel
from ..crops.config import CropConfig


class CropListResponse(BaseModel):
    status: str = "success"
    total_crops: int
    crops: List[CropConfig]
    disclaimer: str = (
        "Parameters sourced from ICAR/CRIDA benchmarks and agricultural university advisories. "
        "Configurable parameters can be overridden per agro-climatic zone."
    )
