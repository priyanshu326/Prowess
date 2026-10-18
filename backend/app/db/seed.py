"""
Database seeding for SmartKisan: AI-Powered Smart Irrigation Platform.
Seeds realistic Indian agricultural scenarios:
1. Baldev Singh (Karnal, Haryana) — Wheat on Clay Loam, Flood Irrigation
2. Rameshwar Rao (Akola, Maharashtra) — Cotton on Black Cotton Soil, Drip Irrigation
3. Devendra Sharma (Bharatpur, Rajasthan) — Mustard on Sandy Loam, Sprinkler Irrigation
4. Sunita Patil (Nashik, Maharashtra) — Tomato on Red Loam, High-Efficiency Drip

Also seeds crop agronomic benchmarks, soil hydraulic parameters, and initial telemetry.
"""

import datetime
from sqlalchemy.orm import Session
from .models import (
    User,
    Field,
    CropProfileRecord,
    SoilProfileRecord,
    SensorReadingRecord,
    SavingsMetricRecord,
    FarmProfileRecord,
    FieldObservationRecord,
)
from ..auth.security import hash_password
from ..engine.irrigation_engine import CROP_AGRONOMIC_DATABASE, SOIL_HYDRAULIC_PROFILES


def seed_demo_farms(db: Session):
    """Initializes demo farmers, fields, crop & soil benchmarks, and legacy farm profiles."""

    # 1. Seed Crop Profiles
    for crop_id, data in CROP_AGRONOMIC_DATABASE.items():
        existing_crop = db.query(CropProfileRecord).filter(CropProfileRecord.crop_id == crop_id).first()
        if not existing_crop:
            db.add(
                CropProfileRecord(
                    crop_id=crop_id,
                    name_en=data["name_en"],
                    name_hi=data["name_hi"],
                    scientific_name=data["scientific_name"],
                    root_depth_max_cm=100.0,
                    kc_initial=data["kc_initial"],
                    kc_mid=data["kc_mid"],
                    kc_end=data["kc_end"],
                    critical_moisture_threshold_pct=data["critical_moisture_threshold_pct"],
                    waterlogging_sensitivity=data["waterlogging_sensitivity"],
                    stage_coefficients_json=data.get("stage_kc"),
                )
            )

    # 2. Seed Soil Hydraulic Profiles
    for soil_type, sdata in SOIL_HYDRAULIC_PROFILES.items():
        existing_soil = db.query(SoilProfileRecord).filter(SoilProfileRecord.soil_type == soil_type).first()
        if not existing_soil:
            db.add(
                SoilProfileRecord(
                    soil_type=soil_type,
                    name_en=sdata["name_en"],
                    name_hi=sdata["name_hi"],
                    field_capacity_pct=sdata["field_capacity_pct"],
                    wilting_point_pct=sdata["wilting_point_pct"],
                    available_water_capacity_mm_per_m=sdata["available_water_capacity_mm_per_m"],
                    infiltration_rate_mm_hr=sdata["infiltration_rate_mm_hr"],
                    drainage_speed=sdata["drainage_speed"],
                    waterlogging_risk_factor=sdata["waterlogging_risk"],
                )
            )

    # 3. Seed Demo Farmers (Users)
    demo_users = [
        {
            "id": 1,
            "email": "farmer@kisaan.in",
            "phone": "+919876543210",
            "full_name": "बलदेव सिंह (Baldev Singh)",
            "password": "kisan123",
            "preferred_language": "hi",
        },
        {
            "id": 2,
            "email": "rameshwar@kisaan.in",
            "phone": "+919876543211",
            "full_name": "रामेश्वर राव (Rameshwar Rao)",
            "password": "kisan123",
            "preferred_language": "mr",
        },
        {
            "id": 3,
            "email": "devendra@kisaan.in",
            "phone": "+919876543212",
            "full_name": "देवेन्द्र शर्मा (Devendra Sharma)",
            "password": "kisan123",
            "preferred_language": "hi",
        },
    ]

    for u in demo_users:
        existing_user = db.query(User).filter(User.email == u["email"]).first()
        if not existing_user:
            db.add(
                User(
                    id=u["id"],
                    email=u["email"],
                    phone=u["phone"],
                    full_name=u["full_name"],
                    hashed_password=hash_password(u["password"]),
                    preferred_language=u["preferred_language"],
                    is_active=True,
                )
            )
    db.commit()

    # 4. Seed Fields
    demo_fields = [
        {
            "id": "field_karnal_01",
            "user_id": 1,
            "name": "करनाल मुख्य गेहूं प्लाट (Karnal Main Wheat Plot)",
            "area_acres": 2.5,
            "area_sqm": 10117.15,
            "latitude": 29.6857,
            "longitude": 76.9905,
            "village_district": "कुंजपुरा, करनाल, हरियाणा",
            "soil_type": "clay_loam",
            "crop_type": "wheat",
            "growth_stage": "crown_root_initiation",
            "sowing_date": "2026-10-01",
            "irrigation_method": "flood",
            "pump_type": "diesel",
            "pump_hp": 7.5,
            "pump_flow_rate_lph": 25000.0,
            "initial_moisture": 34.0,
        },
        {
            "id": "field_akola_02",
            "user_id": 2,
            "name": "अकोला कपास प्लाट (Akola Cotton Plot)",
            "area_acres": 3.0,
            "area_sqm": 12140.58,
            "latitude": 20.7002,
            "longitude": 77.0082,
            "village_district": "अकोला, विदर्भ, महाराष्ट्र",
            "soil_type": "black_soil",
            "crop_type": "cotton",
            "growth_stage": "boll_formation",
            "sowing_date": "2026-06-25",
            "irrigation_method": "drip",
            "pump_type": "electric",
            "pump_hp": 5.0,
            "pump_flow_rate_lph": 18000.0,
            "initial_moisture": 38.5,
        },
        {
            "id": "field_bharatpur_03",
            "user_id": 3,
            "name": "भरतपुर सरसों प्लाट (Bharatpur Mustard Plot)",
            "area_acres": 4.0,
            "area_sqm": 16187.44,
            "latitude": 27.2152,
            "longitude": 77.5030,
            "village_district": "भरतपुर, राजस्थान",
            "soil_type": "sandy_loam",
            "crop_type": "mustard",
            "growth_stage": "vegetative",
            "sowing_date": "2026-10-05",
            "irrigation_method": "sprinkler",
            "pump_type": "diesel",
            "pump_hp": 8.0,
            "pump_flow_rate_lph": 28000.0,
            "initial_moisture": 21.0,
        },
    ]

    for f in demo_fields:
        existing_field = db.query(Field).filter(Field.id == f["id"]).first()
        if not existing_field:
            field_obj = Field(
                id=f["id"],
                user_id=f["user_id"],
                name=f["name"],
                area_acres=f["area_acres"],
                area_sqm=f["area_sqm"],
                latitude=f["latitude"],
                longitude=f["longitude"],
                village_district=f["village_district"],
                soil_type=f["soil_type"],
                crop_type=f["crop_type"],
                growth_stage=f["growth_stage"],
                sowing_date=f["sowing_date"],
                irrigation_method=f["irrigation_method"],
                pump_type=f["pump_type"],
                pump_hp=f["pump_hp"],
                pump_flow_rate_lph=f["pump_flow_rate_lph"],
                electricity_tariff_inr_kwh=7.0,
                diesel_price_inr_l=89.0,
            )
            db.add(field_obj)

            # Initial sensor telemetry
            db.add(
                SensorReadingRecord(
                    field_id=f["id"],
                    timestamp=datetime.datetime.utcnow(),
                    soil_moisture_pct=f["initial_moisture"],
                    soil_moisture_root_zone_pct=f["initial_moisture"] + 4.0,
                    soil_temperature_c=23.5,
                    ambient_temperature_c=28.0,
                    ambient_humidity_pct=52.0,
                    is_simulated=True,
                    source="iot_sensor",
                )
            )

            # Cumulative savings tracker initialized
            db.add(
                SavingsMetricRecord(
                    field_id=f["id"],
                    baseline_type="TRADITIONAL_CALENDAR_FLOOD",
                    baseline_water_litres=162500.0,
                    actual_water_litres=98000.0,
                    total_water_saved_litres=64500.0,
                    total_diesel_saved_litres=3.22,
                    total_electricity_saved_kwh=14.4,
                    total_cost_saved_inr=2295.0,
                    total_co2_kg_saved=8.63,
                    prevented_disease_events_count=1,
                )
            )
    db.commit()

    # 5. Legacy Farm Profiles for Backwards Compatibility
    legacy_farms = [
        {
            "farm_id": "farm_karnal_01",
            "farmer_name": "बलदेव सिंह (Baldev Singh)",
            "crop_name": "wheat",
            "latitude": 29.6857,
            "longitude": 76.9905,
            "village_district": "कुंजपुरा, करनाल, हरियाणा",
            "soil_type": "clay_loam",
            "sowing_date": "2026-10-01",
            "irrigation_method": "flood",
            "field_area_acres": 2.5,
            "obs": {
                "observation_date": "2026-10-15",
                "crop_condition": "healthy",
                "last_irrigation_date": "2026-10-06",
                "last_irrigation_amount_mm": 50.0,
                "visible_symptoms": ["normal_emergence"],
                "soil_surface_status": "normal",
                "farmer_notes": "फसल का अंकुरण अच्छा हुआ है।",
            },
        },
        {
            "farm_id": "farm_akola_02",
            "farmer_name": "रामेश्वर राव (Rameshwar Rao)",
            "crop_name": "cotton",
            "latitude": 20.7002,
            "longitude": 77.0082,
            "village_district": "अकोला, विदर्भ, महाराष्ट्र",
            "soil_type": "black_soil",
            "sowing_date": "2026-06-25",
            "irrigation_method": "rainfed",
            "field_area_acres": 3.0,
            "obs": {
                "observation_date": "2026-10-14",
                "crop_condition": "slight_wilting",
                "last_irrigation_date": None,
                "last_irrigation_amount_mm": None,
                "visible_symptoms": ["leaf_curling", "dry_crust_soil"],
                "soil_surface_status": "cracked_dry",
                "farmer_notes": "काली मिट्टी में दरारें दिख रही हैं।",
            },
        },
        {
            "farm_id": "farm_bharatpur_03",
            "farmer_name": "देवेन्द्र शर्मा (Devendra Sharma)",
            "crop_name": "mustard",
            "latitude": 27.2152,
            "longitude": 77.5030,
            "village_district": "भरतपुर, राजस्थान",
            "soil_type": "sandy_loam",
            "sowing_date": "2026-10-05",
            "irrigation_method": "sprinkler",
            "field_area_acres": 4.0,
            "obs": {
                "observation_date": "2026-10-16",
                "crop_condition": "healthy",
                "last_irrigation_date": "2026-10-08",
                "last_irrigation_amount_mm": 30.0,
                "visible_symptoms": ["uniform_stand"],
                "soil_surface_status": "normal",
                "farmer_notes": "फसल स्वस्थ है।",
            },
        },
    ]

    for lf in legacy_farms:
        existing = db.query(FarmProfileRecord).filter(FarmProfileRecord.farm_id == lf["farm_id"]).first()
        if not existing:
            new_farm = FarmProfileRecord(
                farm_id=lf["farm_id"],
                farmer_name=lf["farmer_name"],
                crop_name=lf["crop_name"],
                latitude=lf["latitude"],
                longitude=lf["longitude"],
                village_district=lf["village_district"],
                soil_type=lf["soil_type"],
                sowing_date=lf["sowing_date"],
                irrigation_method=lf["irrigation_method"],
                field_area_acres=lf["field_area_acres"],
            )
            db.add(new_farm)
            db.flush()

            obs_data = lf["obs"]
            obs = FieldObservationRecord(
                farm_id=lf["farm_id"],
                observation_date=obs_data["observation_date"],
                crop_condition=obs_data["crop_condition"],
                last_irrigation_date=obs_data["last_irrigation_date"],
                last_irrigation_amount_mm=obs_data["last_irrigation_amount_mm"],
                visible_symptoms=obs_data["visible_symptoms"],
                soil_surface_status=obs_data["soil_surface_status"],
                farmer_notes=obs_data["farmer_notes"],
            )
            db.add(obs)
    db.commit()
