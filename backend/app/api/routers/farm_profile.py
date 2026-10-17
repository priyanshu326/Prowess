"""
Farm Profile Management API Router.
Handles registration and lookup of smallholder farm configurations:
crop, location coordinates, soil texture, sowing date, and irrigation infrastructure.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...db import repository
from ...schemas.smartkisan import FarmProfileCreate, FarmProfileResponse

router = APIRouter(prefix="/api/v1/farm-profile", tags=["Farm Profile"])


@router.post(
    "",
    response_model=FarmProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register or Update a Smallholder Farm Profile",
)
def create_or_update_farm_profile(
    payload: FarmProfileCreate,
    db: Session = Depends(get_db),
):
    """
    Saves crop details, geographic coordinates, soil type, sowing date, and irrigation method.
    If farm_id exists, updates the record; otherwise provisions a new farm profile.
    """
    record = repository.save_farm_profile(db, payload)
    return FarmProfileResponse(
        status="success",
        message="Farm profile registered successfully",
        farm_id=record.farm_id,
        farmer_name=record.farmer_name,
        crop_name=record.crop_name,
        latitude=record.latitude,
        longitude=record.longitude,
        village_district=record.village_district,
        soil_type=record.soil_type,
        sowing_date=record.sowing_date,
        irrigation_method=record.irrigation_method,
        field_area_acres=record.field_area_acres,
        created_at=record.created_at.isoformat() if record.created_at else "",
    )


@router.get(
    "/{farm_id}",
    response_model=FarmProfileResponse,
    summary="Retrieve a Farm Profile by ID",
)
def get_farm_profile_by_id(
    farm_id: str,
    db: Session = Depends(get_db),
):
    """Retrieves full farm metadata by farm_id."""
    record = repository.get_farm_profile(db, farm_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm profile with ID '{farm_id}' was not found. Please register via POST /api/v1/farm-profile first.",
        )
    return FarmProfileResponse(
        status="success",
        message="Farm profile found",
        farm_id=record.farm_id,
        farmer_name=record.farmer_name,
        crop_name=record.crop_name,
        latitude=record.latitude,
        longitude=record.longitude,
        village_district=record.village_district,
        soil_type=record.soil_type,
        sowing_date=record.sowing_date,
        irrigation_method=record.irrigation_method,
        field_area_acres=record.field_area_acres,
        created_at=record.created_at.isoformat() if record.created_at else "",
    )


@router.get(
    "",
    response_model=List[FarmProfileResponse],
    summary="List All Registered Smallholder Farms",
)
def list_farms(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Lists all registered smallholder farms."""
    records = repository.list_farm_profiles(db, limit=limit)
    return [
        FarmProfileResponse(
            status="success",
            message="Farm profile found",
            farm_id=r.farm_id,
            farmer_name=r.farmer_name,
            crop_name=r.crop_name,
            latitude=r.latitude,
            longitude=r.longitude,
            village_district=r.village_district,
            soil_type=r.soil_type,
            sowing_date=r.sowing_date,
            irrigation_method=r.irrigation_method,
            field_area_acres=r.field_area_acres,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in records
    ]
