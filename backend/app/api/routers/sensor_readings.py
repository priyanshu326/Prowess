"""
Sensor Readings Router.
Ingests and retrieves IoT soil moisture and environmental microclimate data.
"""

from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...db.models import Field, SensorReadingRecord, User
from ...schemas.irrigation import SensorReadingCreate, SensorReadingResponse
from ...auth.security import get_optional_current_user

router = APIRouter(prefix="/api/v1/sensor-readings", tags=["Sensor Readings"])


@router.post(
    "",
    response_model=SensorReadingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit soil moisture and environmental readings",
    description="Submits telemetry from in-field IoT soil probes or farmer manual moisture observations.",
)
def submit_sensor_reading(
    payload: SensorReadingCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    field = db.query(Field).filter(Field.id == payload.field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{payload.field_id}' was not found. Please register the field first.",
        )

    # If authenticated, verify field ownership
    if current_user and field.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to submit telemetry for another farmer's field.",
        )

    # Validate moisture range 0 to 100%
    if not (0.0 <= payload.soil_moisture_pct <= 100.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Soil moisture percentage must be between 0.0 and 100.0%.",
        )

    reading = SensorReadingRecord(
        field_id=payload.field_id,
        timestamp=datetime.datetime.utcnow(),
        soil_moisture_pct=payload.soil_moisture_pct,
        soil_moisture_root_zone_pct=payload.soil_moisture_root_zone_pct,
        soil_temperature_c=payload.soil_temperature_c,
        ambient_temperature_c=payload.ambient_temperature_c,
        ambient_humidity_pct=payload.ambient_humidity_pct,
        is_simulated=payload.is_simulated or False,
        source=payload.source or "iot_sensor",
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    return reading


@router.get(
    "/{field_id}",
    response_model=List[SensorReadingResponse],
    summary="Retrieve field sensor history",
    description="Returns recent historical sensor telemetry for the specified field.",
)
def get_field_sensor_history(
    field_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field '{field_id}' does not exist.",
        )

    readings = (
        db.query(SensorReadingRecord)
        .filter(SensorReadingRecord.field_id == field_id)
        .order_by(SensorReadingRecord.timestamp.desc())
        .limit(limit)
        .all()
    )
    return readings
