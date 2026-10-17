"""
Supported crops and agronomic parameter metadata API router.
"""

from fastapi import APIRouter
from ...schemas.crops import CropListResponse
from ...crops.config import CROP_CATALOG

router = APIRouter(prefix="/api/v1", tags=["Crops & Agronomic Metadata"])


@router.get(
    "/crops",
    response_model=CropListResponse,
    summary="Get Supported Crops & Agronomic Benchmarks",
)
def get_supported_crops():
    """
    Returns full catalog of supported crops, including:
    - Sowing temperature & moisture bounds
    - Heavy rainfall risk thresholds
    - Harvesting safe rain & relative humidity thresholds
    - Scientific provenance (ICAR / CRIDA validation markers)
    """
    crop_list = list(CROP_CATALOG.values())
    return CropListResponse(
        status="success",
        total_crops=len(crop_list),
        crops=crop_list,
        disclaimer=(
            "Parameters derived from ICAR (Indian Council of Agricultural Research) & "
            "CRIDA benchmarks. Distinguishes verified thresholds from configurable demo defaults."
        ),
    )
