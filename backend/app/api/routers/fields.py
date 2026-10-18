"""
Fields Router.
Manages agricultural plots with farmer-level data isolation,
area conversions (Acres <-> m²), and pumping configurations.
"""

import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...db.models import Field, User, SavingsMetricRecord
from ...schemas.irrigation import FieldCreate, FieldResponse
from ...auth.security import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/v1/fields", tags=["Farmer Fields"])

ACRES_TO_SQM = 4046.86


@router.post(
    "",
    response_model=FieldResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new field",
    description="Registers a new agricultural plot with location, soil properties, and crop attributes.",
)
def create_field(
    payload: FieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    field_id = payload.id or f"field_{uuid.uuid4().hex[:10]}"

    # Check for duplicate ID
    existing = db.query(Field).filter(Field.id == field_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Field with ID '{field_id}' already exists.",
        )

    area_sqm = round(payload.area_acres * ACRES_TO_SQM, 2)

    new_field = Field(
        id=field_id,
        user_id=current_user.id,
        name=payload.name.strip(),
        area_acres=payload.area_acres,
        area_sqm=area_sqm,
        latitude=payload.latitude,
        longitude=payload.longitude,
        village_district=payload.village_district,
        soil_type=payload.soil_type.lower().strip(),
        crop_type=payload.crop_type.lower().strip(),
        growth_stage=payload.growth_stage.lower().strip() if payload.growth_stage else "vegetative",
        sowing_date=payload.sowing_date,
        irrigation_method=payload.irrigation_method.lower().strip() if payload.irrigation_method else "flood",
        pump_type=payload.pump_type.lower().strip() if payload.pump_type else "diesel",
        pump_hp=payload.pump_hp or 7.5,
        pump_flow_rate_lph=payload.pump_flow_rate_lph or 25000.0,
        electricity_tariff_inr_kwh=payload.electricity_tariff_inr_kwh or 7.0,
        diesel_price_inr_l=payload.diesel_price_inr_l or 89.0,
    )
    db.add(new_field)

    # Initialize empty savings metric for this field
    savings_metric = SavingsMetricRecord(
        field_id=field_id,
        baseline_type="TRADITIONAL_CALENDAR_FLOOD",
        baseline_water_litres=0.0,
        actual_water_litres=0.0,
        total_water_saved_litres=0.0,
        total_diesel_saved_litres=0.0,
        total_electricity_saved_kwh=0.0,
        total_cost_saved_inr=0.0,
        total_co2_kg_saved=0.0,
        prevented_disease_events_count=0,
    )
    db.add(savings_metric)

    db.commit()
    db.refresh(new_field)

    return new_field


@router.get(
    "",
    response_model=List[FieldResponse],
    summary="List authenticated farmer's fields",
    description="Returns all fields belonging exclusively to the authenticated farmer (Farmer Data Isolation).",
)
def list_farmer_fields(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fields = db.query(Field).filter(Field.user_id == current_user.id).order_by(Field.created_at.desc()).all()
    return fields


@router.get(
    "/{field_id}",
    response_model=FieldResponse,
    summary="Get single field details",
    description="Retrieves plot parameters. Enforces access control so a farmer cannot view another farmer's plot.",
)
def get_field_by_id(
    field_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{field_id}' was not found.",
        )

    # Farmer-level data isolation enforcement:
    if field.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not have permission to view this farmer's field.",
        )

    return field
