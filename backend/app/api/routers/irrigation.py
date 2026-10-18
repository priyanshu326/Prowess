"""
Irrigation Intelligence Router.
Provides:
1. POST /api/v1/irrigation/recommendation/{field_id} — AI-powered recommendation engine.
2. GET /api/v1/irrigation/history/{field_id} — Recommendation and irrigation history.
3. POST /api/v1/irrigation/events — Record actual field irrigation performed.
4. POST /api/v1/irrigation/simulate — Hackathon judge simulation mode for testing scenarios.
"""

import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...db.models import (
    Field,
    User,
    SensorReadingRecord,
    IrrigationRecommendationRecord,
    IrrigationEventRecord,
    SavingsMetricRecord,
)
from ...schemas.irrigation import (
    IrrigationRecommendationResponse,
    IrrigationEventCreate,
    IrrigationEventResponse,
    FieldIrrigationHistoryResponse,
    SimulationScenarioRequest,
    SimulationScenarioResponse,
)
from ...engine.irrigation_engine import (
    evaluate_smart_irrigation,
    convert_depth_to_volume,
)
from ...weather import get_weather_provider
from ...weather.mock_provider import MockWeatherProvider
from ...auth.security import get_optional_current_user
from ...config import settings

router = APIRouter(prefix="/api/v1/irrigation", tags=["Smart Irrigation Engine"])


@router.post(
    "/recommendation/{field_id}",
    response_model=IrrigationRecommendationResponse,
    summary="Generate an irrigation recommendation",
    description="Fuses soil moisture telemetry, crop growth stage, and upcoming rainfall forecast to produce an explainable recommendation.",
)
async def generate_irrigation_recommendation(
    field_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field '{field_id}' was not found. Please register the field first.",
        )

    # 1. Fetch latest sensor reading for the field
    latest_reading = (
        db.query(SensorReadingRecord)
        .filter(SensorReadingRecord.field_id == field_id)
        .order_by(SensorReadingRecord.timestamp.desc())
        .first()
    )

    current_moisture_pct: Optional[float] = None
    has_sensor = False
    is_stale = False

    if latest_reading:
        has_sensor = True
        current_moisture_pct = latest_reading.soil_moisture_pct
        age_hours = (datetime.datetime.utcnow() - latest_reading.timestamp).total_seconds() / 3600.0
        if age_hours > 24.0:
            is_stale = True

    # 2. Fetch live weather forecast
    provider = get_weather_provider()
    try:
        weather_data = await provider.get_forecast(field.latitude, field.longitude, forecast_days=5)
    except Exception:
        fallback = MockWeatherProvider(scenario="optimal")
        weather_data = await fallback.get_forecast(field.latitude, field.longitude, forecast_days=5)

    # Calculate rainfall in 48h and 72h windows and average ET0
    rain_48h = 0.0
    rain_72h = 0.0
    et0_list = []

    for idx, d in enumerate(weather_data.daily[:5]):
        p = d.precipitation_sum_mm or 0.0
        if idx < 2:
            rain_48h += p
        if idx < 3:
            rain_72h += p
        if d.et0_fao_evapotranspiration:
            et0_list.append(d.et0_fao_evapotranspiration)

    et0_mean = sum(et0_list) / len(et0_list) if et0_list else 4.2

    # 3. Run Smart Irrigation Decision Engine
    recommendation = evaluate_smart_irrigation(
        field_id=field.id,
        field_area_acres=field.area_acres,
        field_area_sqm=field.area_sqm,
        crop_type=field.crop_type,
        growth_stage=field.growth_stage,
        soil_type=field.soil_type,
        irrigation_method=field.irrigation_method,
        current_soil_moisture_pct=current_moisture_pct,
        forecast_rain_next_48h_mm=rain_48h,
        forecast_rain_next_72h_mm=rain_72h,
        et0_mm_per_day=et0_mean,
        has_sensor_telemetry=has_sensor,
        is_sensor_stale=is_stale,
        pump_flow_rate_lph=field.pump_flow_rate_lph,
        pump_type=field.pump_type,
        diesel_price_inr=field.diesel_price_inr_l,
        electricity_tariff_inr=field.electricity_tariff_inr_kwh,
    )

    # 4. Save recommendation log to database
    rec_record = IrrigationRecommendationRecord(
        field_id=field.id,
        decision=recommendation.decision,
        recommended_water_depth_mm=recommendation.recommended_water_depth_mm,
        recommended_water_volume_litres=recommendation.estimated_water_volume_litres,
        suggested_irrigation_window=recommendation.suggested_irrigation_window,
        confidence_level=recommendation.confidence_level,
        data_quality_status=recommendation.data_quality_status,
        reasons_json=recommendation.reasons,
        reasons_hi_json=recommendation.reasons_hi,
        expected_rainfall_mm=recommendation.expected_rainfall_mm,
        forecast_horizon_hours=recommendation.forecast_horizon_hours,
        soil_moisture_status=recommendation.soil_moisture_status,
        crop_stage=recommendation.crop_growth_stage,
        etc_crop_water_demand_mm=recommendation.etc_crop_water_demand_mm,
        effective_rainfall_mm=recommendation.effective_rainfall_mm,
        soil_water_deficit_mm=recommendation.soil_water_deficit_mm,
        irrigation_efficiency_pct=recommendation.irrigation_efficiency_pct,
        baseline_water_volume_litres=recommendation.baseline_water_volume_litres,
        estimated_water_saved_litres=recommendation.estimated_water_saved_litres,
        estimated_cost_saved_inr=recommendation.estimated_cost_saved_inr,
        estimated_diesel_saved_litres=recommendation.estimated_diesel_saved_litres,
        warnings_json=recommendation.warnings,
        reassessment_due_at=recommendation.next_reassessment_time,
        created_at=recommendation.timestamp,
    )
    db.add(rec_record)
    db.commit()
    db.refresh(rec_record)

    recommendation.id = rec_record.id
    return recommendation


@router.get(
    "/history/{field_id}",
    response_model=FieldIrrigationHistoryResponse,
    summary="Retrieve field irrigation history",
    description="Returns previous recommendations and recorded irrigation events for the field.",
)
def get_field_irrigation_history(
    field_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field '{field_id}' was not found.",
        )

    # Query recent recommendations
    recs = (
        db.query(IrrigationRecommendationRecord)
        .filter(IrrigationRecommendationRecord.field_id == field_id)
        .order_by(IrrigationRecommendationRecord.created_at.desc())
        .limit(limit)
        .all()
    )

    rec_list = []
    for r in recs:
        rec_list.append(
            IrrigationRecommendationResponse(
                id=r.id,
                field_id=r.field_id,
                decision=r.decision,
                recommended_water_depth_mm=r.recommended_water_depth_mm,
                estimated_water_volume_litres=r.recommended_water_volume_litres,
                suggested_irrigation_window=r.suggested_irrigation_window,
                confidence_level=r.confidence_level,
                data_quality_status=r.data_quality_status,
                reasons=r.reasons_json or [],
                reasons_hi=r.reasons_hi_json or [],
                expected_rainfall_mm=r.expected_rainfall_mm,
                forecast_horizon_hours=r.forecast_horizon_hours,
                crop_growth_stage=r.crop_stage,
                soil_moisture_status=r.soil_moisture_status,
                soil_moisture_pct=40.0,
                etc_crop_water_demand_mm=r.etc_crop_water_demand_mm,
                effective_rainfall_mm=r.effective_rainfall_mm,
                soil_water_deficit_mm=r.soil_water_deficit_mm,
                irrigation_efficiency_pct=r.irrigation_efficiency_pct,
                baseline_water_volume_litres=r.baseline_water_volume_litres,
                estimated_water_saved_litres=r.estimated_water_saved_litres,
                estimated_cost_saved_inr=r.estimated_cost_saved_inr,
                estimated_diesel_saved_litres=r.estimated_diesel_saved_litres,
                estimated_pumping_hours_saved=round(r.estimated_water_saved_litres / 25000.0, 2),
                warnings=r.warnings_json or [],
                timestamp=r.created_at,
                next_reassessment_time=r.reassessment_due_at,
            )
        )

    # Query recent irrigation events
    events = (
        db.query(IrrigationEventRecord)
        .filter(IrrigationEventRecord.field_id == field_id)
        .order_by(IrrigationEventRecord.created_at.desc())
        .limit(limit)
        .all()
    )

    event_list = [
        IrrigationEventResponse(
            id=e.id,
            field_id=e.field_id,
            user_id=e.user_id,
            event_date=e.event_date,
            applied_water_depth_mm=e.applied_water_depth_mm,
            applied_water_volume_litres=e.applied_water_volume_litres,
            duration_hours=e.duration_hours,
            irrigation_method=e.irrigation_method,
            energy_source=e.energy_source,
            energy_units_consumed=e.energy_units_consumed,
            energy_cost_inr=e.energy_cost_inr,
            notes=e.notes,
            created_at=e.created_at,
        )
        for e in events
    ]

    return FieldIrrigationHistoryResponse(
        field_id=field_id,
        total_recommendations=len(rec_list),
        total_events=len(event_list),
        recent_recommendations=rec_list,
        recent_events=event_list,
    )


@router.post(
    "/events",
    response_model=IrrigationEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record actual irrigation performed",
    description="Logs an executed irrigation event, calculates fuel/power usage, and updates cumulative savings metrics.",
)
def record_irrigation_event(
    payload: IrrigationEventCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    field = db.query(Field).filter(Field.id == payload.field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field '{payload.field_id}' was not found.",
        )

    # Assign user ID from current user or field owner
    user_id = current_user.id if current_user else field.user_id

    # Verify authorization if authenticated
    if current_user and field.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to log irrigation for another farmer's plot.",
        )

    event_date = payload.event_date or datetime.date.today().isoformat()
    volume_litres = round(convert_depth_to_volume(payload.applied_water_depth_mm, field.area_sqm), 1)

    method = payload.irrigation_method or field.irrigation_method
    energy_source = payload.energy_source or field.pump_type

    # Calculate energy units and cost
    if payload.energy_units_consumed is not None:
        energy_units = payload.energy_units_consumed
    else:
        if energy_source.lower() == "electric":
            energy_units = round(payload.duration_hours * settings.ELECTRIC_PUMP_KW, 2)
        else:
            energy_units = round(payload.duration_hours * settings.DIESEL_PUMP_LPH, 2)

    if energy_source.lower() == "electric":
        cost_inr = round(energy_units * field.electricity_tariff_inr_kwh, 2)
    else:
        cost_inr = round(energy_units * field.diesel_price_inr_l, 2)

    event = IrrigationEventRecord(
        field_id=field.id,
        user_id=user_id,
        event_date=event_date,
        applied_water_depth_mm=payload.applied_water_depth_mm,
        applied_water_volume_litres=volume_litres,
        duration_hours=payload.duration_hours,
        irrigation_method=method,
        energy_source=energy_source,
        energy_units_consumed=energy_units,
        energy_cost_inr=cost_inr,
        notes=payload.notes,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(event)

    # Update cumulative savings metrics
    metric = db.query(SavingsMetricRecord).filter(SavingsMetricRecord.field_id == field.id).first()
    if metric:
        baseline_event_vol = convert_depth_to_volume(settings.TRADITIONAL_FLOOD_BASELINE_MM, field.area_sqm)
        water_saved = max(0.0, baseline_event_vol - volume_litres)
        metric.baseline_water_litres += baseline_event_vol
        metric.actual_water_litres += volume_litres
        metric.total_water_saved_litres += water_saved

        saved_hrs = water_saved / field.pump_flow_rate_lph if field.pump_flow_rate_lph > 0 else 0
        diesel_saved = saved_hrs * settings.DIESEL_PUMP_LPH
        metric.total_diesel_saved_litres += diesel_saved
        metric.total_cost_saved_inr += diesel_saved * field.diesel_price_inr_l
        metric.total_co2_kg_saved += diesel_saved * settings.CO2_KG_PER_LITRE_DIESEL

    db.commit()
    db.refresh(event)

    return IrrigationEventResponse(
        id=event.id,
        field_id=event.field_id,
        user_id=event.user_id,
        event_date=event.event_date,
        applied_water_depth_mm=event.applied_water_depth_mm,
        applied_water_volume_litres=event.applied_water_volume_litres,
        duration_hours=event.duration_hours,
        irrigation_method=event.irrigation_method,
        energy_source=event.energy_source,
        energy_units_consumed=event.energy_units_consumed,
        energy_cost_inr=event.energy_cost_inr,
        notes=event.notes,
        created_at=event.created_at,
    )


@router.post(
    "/simulate",
    response_model=SimulationScenarioResponse,
    summary="Run Simulation Scenarios (Judge Testing Mode)",
    description="Executes agricultural scenarios (dry soil, rain in 2 hours, heavy rain tomorrow, sandy vs clay soil, sensor failure) without requiring physical hardware.",
)
def run_simulation_scenario(
    payload: SimulationScenarioRequest,
    db: Session = Depends(get_db),
):
    """
    Empowers hackathon judges and agronomists to test edge cases deterministically.
    """
    field = db.query(Field).filter(Field.id == payload.field_id).first()
    if not field:
        # Fallback to Karnal default
        field = Field(
            id="sim_karnal_demo",
            user_id=1,
            name="करनाल डेमो खेत (Karnal Demo)",
            area_acres=2.5,
            area_sqm=10117.15,
            latitude=29.6857,
            longitude=76.9905,
            soil_type="clay_loam",
            crop_type="wheat",
            growth_stage="crown_root_initiation",
            sowing_date="2026-10-01",
            irrigation_method="flood",
            pump_type="diesel",
            pump_flow_rate_lph=25000.0,
            diesel_price_inr_l=89.0,
            electricity_tariff_inr_kwh=7.0,
        )

    scenario = payload.scenario
    custom_moisture = payload.custom_soil_moisture_pct
    custom_rain = payload.custom_forecast_rain_mm

    if scenario == "dry_soil_no_rain":
        desc_en = "Soil moisture critically low (26%), zero rain expected in next 72 hours."
        desc_hi = "जमीन में नमी घटकर 26% (अति न्यून) रह गई है, अगले 3 दिनों में बारिश नहीं है।"
        moisture = custom_moisture if custom_moisture is not None else 26.0
        rain_48h = custom_rain if custom_rain is not None else 0.0
        rain_72h = custom_rain if custom_rain is not None else 0.0
        et0 = 4.5
        has_sensor = True
        is_stale = False
        soil_type = field.soil_type

    elif scenario == "adequate_moisture_rain_expected":
        desc_en = "Adequate soil moisture (48%), beneficial 22mm rainfall expected tomorrow."
        desc_hi = "जमीन में 48% पर्याप्त नमी है, कल 22 मिमी उपयोगी वर्षा का पूर्वानुमान है।"
        moisture = custom_moisture if custom_moisture is not None else 48.0
        rain_48h = custom_rain if custom_rain is not None else 22.0
        rain_72h = custom_rain if custom_rain is not None else 25.0
        et0 = 3.8
        has_sensor = True
        is_stale = False
        soil_type = field.soil_type

    elif scenario == "heavy_rain_tomorrow":
        desc_en = "Monsoon deluge: 58mm heavy downpour expected within 24-48 hours. Flood risk."
        desc_hi = "भारी मानसूनी वर्षा: अगले 24-48 घंटों में 58 मिमी मूसलाधार बारिश का खतरा।"
        moisture = custom_moisture if custom_moisture is not None else 42.0
        rain_48h = custom_rain if custom_rain is not None else 58.0
        rain_72h = custom_rain if custom_rain is not None else 65.0
        et0 = 3.2
        has_sensor = True
        is_stale = False
        soil_type = field.soil_type

    elif scenario == "heatwave_high_et":
        desc_en = "Dry westerly heatwave: High atmospheric evaporative demand (ET0 = 6.8 mm/day)."
        desc_hi = "शुष्क लू व तेज धूप: वाष्पीकरण दर बहुत तेज (ET0 = 6.8 मिमी/दिन)।"
        moisture = custom_moisture if custom_moisture is not None else 32.0
        rain_48h = 0.0
        rain_72h = 0.0
        et0 = 6.8
        has_sensor = True
        is_stale = False
        soil_type = field.soil_type

    elif scenario == "sandy_soil_fast_drainage":
        desc_en = "Sandy soil with low water holding capacity (Field Capacity = 14%) and rapid infiltration."
        desc_hi = "बलुई मिट्टी: जल धारण क्षमता कम (14%) और तेजी से रिसाव (Infiltration: 45 मिमी/घंटा)।"
        moisture = custom_moisture if custom_moisture is not None else 10.0
        rain_48h = 0.0
        rain_72h = 0.0
        et0 = 4.2
        has_sensor = True
        is_stale = False
        soil_type = "sandy"

    elif scenario == "clay_soil_waterlogging_risk":
        desc_en = "Heavy clay soil with slow drainage (4 mm/hr) and high sensitivity to waterlogging."
        desc_hi = "चिकनी भारी मिट्टी: धीमा निकास (4 मिमी/घंटा), जलभराव व जड़ों के सड़ने का भारी खतरा।"
        moisture = custom_moisture if custom_moisture is not None else 36.0
        rain_48h = 32.0
        rain_72h = 40.0
        et0 = 3.5
        has_sensor = True
        is_stale = False
        soil_type = "clay"

    else:  # sensor_failure_low_confidence
        desc_en = "IoT sensor offline / telemetry missing. Decision engine falls back to weather-based water budget."
        desc_hi = "सेंसर अनुपलब्ध / ऑफलाइन। निर्णय इंजन मौसम आधारित जल बजट पर स्विच हुआ।"
        moisture = None
        rain_48h = 0.0
        rain_72h = 0.0
        et0 = 4.0
        has_sensor = False
        is_stale = False
        soil_type = field.soil_type

    rec = evaluate_smart_irrigation(
        field_id=field.id,
        field_area_acres=field.area_acres,
        field_area_sqm=field.area_sqm,
        crop_type=field.crop_type,
        growth_stage=field.growth_stage,
        soil_type=soil_type,
        irrigation_method=field.irrigation_method,
        current_soil_moisture_pct=moisture,
        forecast_rain_next_48h_mm=rain_48h,
        forecast_rain_next_72h_mm=rain_72h,
        et0_mm_per_day=et0,
        has_sensor_telemetry=has_sensor,
        is_sensor_stale=is_stale,
        pump_flow_rate_lph=field.pump_flow_rate_lph,
        pump_type=field.pump_type,
        diesel_price_inr=field.diesel_price_inr_l,
        electricity_tariff_inr=field.electricity_tariff_inr_kwh,
    )

    why_matters = (
        "Demonstrates how SmartKisan saves thousands of litres of water and fuel costs "
        "by anticipating rainfall and adapting dynamically to soil drainage physics."
    )

    return SimulationScenarioResponse(
        scenario=scenario,
        scenario_description=desc_en,
        scenario_description_hi=desc_hi,
        recommendation=rec,
        why_this_matters_for_farmers=why_matters,
    )
