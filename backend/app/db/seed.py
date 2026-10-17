"""
Seed demo data for Indian smallholder farms.
Demonstrates realistic agricultural scenarios across North and Central India:
1. Karnal, Haryana (Wheat on Alluvial Loam - Indo-Gangetic Plains)
2. Akola, Vidarbha (Cotton on Black Vertisol - Rainfed Deccan)
3. Bharatpur, Rajasthan (Mustard on Sandy Loam - Semi-Arid Mustard Belt)
"""

import datetime
from sqlalchemy.orm import Session
from .models import FarmProfileRecord, FieldObservationRecord
from .session import SessionLocal, init_db


DEMO_FARMS = [
    {
        "farm_id": "farm_karnal_01",
        "farmer_name": "बलदेव सिंह (Baldev Singh)",
        "crop_name": "wheat",
        "latitude": 29.6857,
        "longitude": 76.9905,
        "village_district": "कुंजपुरा, करनाल, हरियाणा (Kunjpura, Karnal, Haryana)",
        "soil_type": "clay_loam",
        "sowing_date": "2026-10-01",
        "irrigation_method": "flood",
        "field_area_acres": 2.5,
        "initial_observation": {
            "observation_date": "2026-10-15",
            "crop_condition": "healthy",
            "last_irrigation_date": "2026-10-06",
            "last_irrigation_amount_mm": 50.0,
            "visible_symptoms": ["normal_emergence"],
            "soil_surface_status": "normal",
            "farmer_notes": "फसल का अंकुरण अच्छा हुआ है। क्राउन रूट इनिशिएशन (CRI) अवस्था की ओर बढ़ रही है।",
        },
    },
    {
        "farm_id": "farm_akola_02",
        "farmer_name": "रामेश्वर राव (Rameshwar Rao)",
        "crop_name": "cotton",
        "latitude": 20.7002,
        "longitude": 77.0082,
        "village_district": "अकोला, विदर्भ, महाराष्ट्र (Akola, Maharashtra)",
        "soil_type": "black_soil",
        "sowing_date": "2026-06-25",
        "irrigation_method": "rainfed",
        "field_area_acres": 3.0,
        "initial_observation": {
            "observation_date": "2026-10-14",
            "crop_condition": "slight_wilting",
            "last_irrigation_date": None,
            "last_irrigation_amount_mm": None,
            "visible_symptoms": ["leaf_curling", "dry_crust_soil"],
            "soil_surface_status": "cracked_dry",
            "farmer_notes": "काली मिट्टी में गहरी दरारें दिख रही हैं, पिछले 18 दिनों से बारिश नहीं हुई है।",
        },
    },
    {
        "farm_id": "farm_bharatpur_03",
        "farmer_name": "देवेन्द्र शर्मा (Devendra Sharma)",
        "crop_name": "mustard",
        "latitude": 27.2152,
        "longitude": 77.5030,
        "village_district": "कुम्हेर, भरतपुर, राजस्थान (Kumher, Bharatpur, Rajasthan)",
        "soil_type": "sandy_loam",
        "sowing_date": "2026-10-10",
        "irrigation_method": "sprinkler",
        "field_area_acres": 1.8,
        "initial_observation": {
            "observation_date": "2026-10-16",
            "crop_condition": "healthy",
            "last_irrigation_date": "2026-10-10",
            "last_irrigation_amount_mm": 30.0,
            "visible_symptoms": ["delicate_seedlings"],
            "soil_surface_status": "normal",
            "farmer_notes": "सरसों की बुवाई के 6 दिन हुए हैं। पौधे छोटे हैं, भारी बारिश से मिट्टी जमने (crusting) का खतरा है।",
        },
    },
]


def seed_demo_farms(db: Session):
    """Inserts initial smallholder farm demo data if table is empty."""
    for item in DEMO_FARMS:
        existing = db.query(FarmProfileRecord).filter(FarmProfileRecord.farm_id == item["farm_id"]).first()
        if not existing:
            farm = FarmProfileRecord(
                farm_id=item["farm_id"],
                farmer_name=item["farmer_name"],
                crop_name=item["crop_name"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                village_district=item["village_district"],
                soil_type=item["soil_type"],
                sowing_date=item["sowing_date"],
                irrigation_method=item["irrigation_method"],
                field_area_acres=item["field_area_acres"],
            )
            db.add(farm)
            db.commit()

            obs_data = item["initial_observation"]
            obs = FieldObservationRecord(
                farm_id=item["farm_id"],
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


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        seed_demo_farms(db)
        print("Successfully seeded demo smallholder farms!")
    finally:
        db.close()
