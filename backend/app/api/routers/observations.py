"""
Farmer Field Observations API Router.
Records ground-truth observations from farmers: crop condition,
last irrigation date, visible symptoms, topsoil appearance, and notes.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...db import repository
from ...schemas.smartkisan import ObservationCreate, ObservationResponse

router = APIRouter(prefix="/api/v1/observations", tags=["Observations"])


@router.post(
    "",
    response_model=ObservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Farmer-Reported Field Observation",
)
def record_observation(
    payload: ObservationCreate,
    db: Session = Depends(get_db),
):
    """
    Records farmer-reported crop condition, last irrigation date, and visible symptoms.
    Validates that the referenced farm_id exists.
    """
    farm = repository.get_farm_profile(db, payload.farm_id)
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot record observation. Farm '{payload.farm_id}' does not exist. Register it first at POST /api/v1/farm-profile.",
        )

    record = repository.save_field_observation(db, payload)
    return ObservationResponse(
        status="success",
        message="Field observation recorded successfully",
        observation_id=record.id,
        farm_id=record.farm_id,
        observation_date=record.observation_date,
        crop_condition=record.crop_condition,
        last_irrigation_date=record.last_irrigation_date,
        last_irrigation_amount_mm=record.last_irrigation_amount_mm,
        visible_symptoms=record.visible_symptoms or [],
        soil_surface_status=record.soil_surface_status,
        farmer_notes=record.farmer_notes,
        recorded_at=record.created_at.isoformat() if record.created_at else "",
    )


@router.get(
    "/{farm_id}",
    response_model=List[ObservationResponse],
    summary="Get Farmer Observation History for a Farm",
)
def get_farm_observations(
    farm_id: str,
    limit: int = 15,
    db: Session = Depends(get_db),
):
    """Retrieves all historical ground observations recorded for a farm."""
    records = repository.get_all_observations(db, farm_id, limit=limit)
    return [
        ObservationResponse(
            status="success",
            message="Observation record",
            observation_id=r.id,
            farm_id=r.farm_id,
            observation_date=r.observation_date,
            crop_condition=r.crop_condition,
            last_irrigation_date=r.last_irrigation_date,
            last_irrigation_amount_mm=r.last_irrigation_amount_mm,
            visible_symptoms=r.visible_symptoms or [],
            soil_surface_status=r.soil_surface_status,
            farmer_notes=r.farmer_notes,
            recorded_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in records
    ]
