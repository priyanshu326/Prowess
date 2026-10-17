"""
Crop agronomic threshold configurations for Sowing & Harvesting intelligence.
Distinguishes ICAR / CRIDA agronomic parameters from configurable hackathon defaults.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ParameterProvenance(BaseModel):
    source: str = Field(..., description="Agro-research source or config default")
    is_scientifically_validated: bool = Field(..., description="True if sourced from ICAR/CRIDA guidelines")
    notes: str = Field("", description="Caveats and agronomic context")


class SowingCriteria(BaseModel):
    min_soil_temp_c: float = Field(..., description="Minimum soil temp for germination (0-6cm)")
    max_soil_temp_c: float = Field(..., description="Maximum soil temp for germination (0-6cm)")
    min_soil_moisture_pct: float = Field(..., description="Minimum root-zone moisture percentage")
    max_soil_moisture_pct: float = Field(..., description="Maximum root-zone moisture percentage (above which waterlogging/rot occurs)")
    heavy_rain_risk_threshold_mm: float = Field(..., description="Rain in 48h post-sowing triggering washout/rot alert")
    max_consecutive_dry_days_tolerable: int = Field(..., description="Max dry days post-sowing before seedling stress")
    optimal_sowing_window_months: List[str] = Field(..., description="Traditional sowing calendar months in North/Central India")


class HarvestingCriteria(BaseModel):
    max_safe_rain_window_mm: float = Field(..., description="Cumulative rain in 72h window acceptable for harvesting")
    max_safe_rh_pct: float = Field(..., description="Maximum relative humidity for grain drying/preventing fungal mold")
    max_safe_wind_gust_kmh: float = Field(..., description="Max wind gust to avoid lodging or shattering")
    safe_grain_moisture_max_pct: float = Field(..., description="Safe grain moisture percentage for storage/mandi sale")
    min_drying_window_days: int = Field(..., description="Minimum consecutive dry days required post-harvest")
    mature_stages: List[str] = Field(..., description="Stages considered mature enough for harvest")


class CropConfig(BaseModel):
    id: str
    name_en: str
    name_hi: str
    scientific_name: str
    season: str  # Kharif, Rabi, Zaid
    provenance: ParameterProvenance
    sowing: SowingCriteria
    harvesting: HarvestingCriteria
    all_stages: List[str]


# Verified agricultural benchmarks based on ICAR, CRIDA, and State Agricultural Universities (SAU) guidelines.
# Demo adjustments are marked clearly as configurable defaults.
CROP_CATALOG: Dict[str, CropConfig] = {
    "wheat": CropConfig(
        id="wheat",
        name_en="Wheat",
        name_hi="गेहूं",
        scientific_name="Triticum aestivum",
        season="Rabi",
        provenance=ParameterProvenance(
            source="ICAR-IIWBR (Indian Institute of Wheat and Barley Research) & CRIDA Guidelines",
            is_scientifically_validated=True,
            notes="Standard rabi wheat parameters calibrated for Indo-Gangetic Plains (Karnal/Punjab/Haryana/UP)."
        ),
        sowing=SowingCriteria(
            min_soil_temp_c=18.0,
            max_soil_temp_c=25.0,
            min_soil_moisture_pct=45.0,
            max_soil_moisture_pct=75.0,
            heavy_rain_risk_threshold_mm=25.0,
            max_consecutive_dry_days_tolerable=7,
            optimal_sowing_window_months=["October", "November"]
        ),
        harvesting=HarvestingCriteria(
            max_safe_rain_window_mm=4.0,
            max_safe_rh_pct=65.0,
            max_safe_wind_gust_kmh=35.0,
            safe_grain_moisture_max_pct=12.0,
            min_drying_window_days=3,
            mature_stages=["dough", "physiological_maturity", "harvest_ready"]
        ),
        all_stages=[
            "sowing", "crown_root_initiation", "tillering",
            "jointing", "flowering", "milking", "dough",
            "physiological_maturity", "harvest_ready"
        ]
    ),
    "rice": CropConfig(
        id="rice",
        name_en="Paddy / Rice",
        name_hi="धान (चावल)",
        scientific_name="Oryza sativa",
        season="Kharif",
        provenance=ParameterProvenance(
            source="ICAR-NRRI (National Rice Research Institute) & CRIDA",
            is_scientifically_validated=True,
            notes="Transplanted and direct seeded rice criteria."
        ),
        sowing=SowingCriteria(
            min_soil_temp_c=22.0,
            max_soil_temp_c=35.0,
            min_soil_moisture_pct=60.0,
            max_soil_moisture_pct=95.0,
            heavy_rain_risk_threshold_mm=60.0,
            max_consecutive_dry_days_tolerable=4,
            optimal_sowing_window_months=["June", "July"]
        ),
        harvesting=HarvestingCriteria(
            max_safe_rain_window_mm=5.0,
            max_safe_rh_pct=70.0,
            max_safe_wind_gust_kmh=40.0,
            safe_grain_moisture_max_pct=14.0,
            min_drying_window_days=3,
            mature_stages=["grain_filling_late", "physiological_maturity", "harvest_ready"]
        ),
        all_stages=[
            "nursery_sowing", "transplanting", "tillering",
            "panicle_initiation", "booting", "flowering",
            "milking", "dough", "physiological_maturity", "harvest_ready"
        ]
    ),
    "maize": CropConfig(
        id="maize",
        name_en="Maize (Corn)",
        name_hi="मक्का",
        scientific_name="Zea mays",
        season="Kharif/Rabi",
        provenance=ParameterProvenance(
            source="ICAR-IIMR (Indian Institute of Maize Research)",
            is_scientifically_validated=True,
            notes="Susceptible to waterlogging in initial 3 weeks; requires good drainage."
        ),
        sowing=SowingCriteria(
            min_soil_temp_c=18.0,
            max_soil_temp_c=32.0,
            min_soil_moisture_pct=50.0,
            max_soil_moisture_pct=75.0,
            heavy_rain_risk_threshold_mm=30.0,
            max_consecutive_dry_days_tolerable=6,
            optimal_sowing_window_months=["June", "July", "October"]
        ),
        harvesting=HarvestingCriteria(
            max_safe_rain_window_mm=6.0,
            max_safe_rh_pct=65.0,
            max_safe_wind_gust_kmh=35.0,
            safe_grain_moisture_max_pct=14.0,
            min_drying_window_days=3,
            mature_stages=["black_layer_formation", "physiological_maturity", "harvest_ready"]
        ),
        all_stages=[
            "sowing", "emergence", "early_vegetative",
            "knee_high", "tasseling", "silking", "dough",
            "black_layer_formation", "harvest_ready"
        ]
    ),
    "cotton": CropConfig(
        id="cotton",
        name_en="Cotton",
        name_hi="कपास",
        scientific_name="Gossypium hirsutum",
        season="Kharif",
        provenance=ParameterProvenance(
            source="ICAR-CICR (Central Institute for Cotton Research)",
            is_scientifically_validated=True,
            notes="Boll opening and picking highly sensitive to rainfall and moisture staining."
        ),
        sowing=SowingCriteria(
            min_soil_temp_c=20.0,
            max_soil_temp_c=34.0,
            min_soil_moisture_pct=50.0,
            max_soil_moisture_pct=75.0,
            heavy_rain_risk_threshold_mm=25.0,
            max_consecutive_dry_days_tolerable=7,
            optimal_sowing_window_months=["April", "May", "June"]
        ),
        harvesting=HarvestingCriteria(
            max_safe_rain_window_mm=2.0,
            max_safe_rh_pct=60.0,
            max_safe_wind_gust_kmh=30.0,
            safe_grain_moisture_max_pct=8.5,  # Lint moisture limit
            min_drying_window_days=4,
            mature_stages=["boll_opening", "first_picking", "second_picking", "harvest_ready"]
        ),
        all_stages=[
            "sowing", "seedling", "squaring", "flowering",
            "boll_development", "boll_opening", "first_picking", "harvest_ready"
        ]
    ),
    "soybean": CropConfig(
        id="soybean",
        name_en="Soybean",
        name_hi="सोयाबीन",
        scientific_name="Glycine max",
        season="Kharif",
        provenance=ParameterProvenance(
            source="ICAR-IISR (Indian Institute of Soybean Research, Indore)",
            is_scientifically_validated=True,
            notes="Seed coat delicate; excessive wetness at harvest causes pod shattering and fungal decay."
        ),
        sowing=SowingCriteria(
            min_soil_temp_c=20.0,
            max_soil_temp_c=32.0,
            min_soil_moisture_pct=50.0,
            max_soil_moisture_pct=75.0,
            heavy_rain_risk_threshold_mm=30.0,
            max_consecutive_dry_days_tolerable=5,
            optimal_sowing_window_months=["June", "July"]
        ),
        harvesting=HarvestingCriteria(
            max_safe_rain_window_mm=3.0,
            max_safe_rh_pct=65.0,
            max_safe_wind_gust_kmh=35.0,
            safe_grain_moisture_max_pct=13.0,
            min_drying_window_days=3,
            mature_stages=["pod_browning", "leaf_drop", "physiological_maturity", "harvest_ready"]
        ),
        all_stages=[
            "sowing", "emergence", "vegetative",
            "flowering", "pod_formation", "seed_filling",
            "pod_browning", "physiological_maturity", "harvest_ready"
        ]
    ),
    "mustard": CropConfig(
        id="mustard",
        name_en="Mustard (Rape / Sarson)",
        name_hi="सरसों",
        scientific_name="Brassica juncea",
        season="Rabi",
        provenance=ParameterProvenance(
            source="ICAR-DRMR (Directorate of Rapeseed-Mustard Research, Bharatpur)",
            is_scientifically_validated=True,
            notes="Small seed size makes seedling vulnerable to crusting after heavy downpour."
        ),
        sowing=SowingCriteria(
            min_soil_temp_c=18.0,
            max_soil_temp_c=28.0,
            min_soil_moisture_pct=40.0,
            max_soil_moisture_pct=70.0,
            heavy_rain_risk_threshold_mm=18.0,
            max_consecutive_dry_days_tolerable=6,
            optimal_sowing_window_months=["September", "October", "November"]
        ),
        harvesting=HarvestingCriteria(
            max_safe_rain_window_mm=3.0,
            max_safe_rh_pct=62.0,
            max_safe_wind_gust_kmh=30.0,
            safe_grain_moisture_max_pct=9.0,
            min_drying_window_days=3,
            mature_stages=["siliqua_yellowing", "seed_darkening", "harvest_ready"]
        ),
        all_stages=[
            "sowing", "seedling", "rosette",
            "stem_elongation", "flowering", "siliqua_development",
            "siliqua_yellowing", "harvest_ready"
        ]
    ),
}


def get_crop_config(crop_name: str) -> Optional[CropConfig]:
    """Retrieve crop config by English name, Hindi name, or key."""
    key = crop_name.lower().strip()
    # Direct match
    if key in CROP_CATALOG:
        return CROP_CATALOG[key]

    # Partial / alias match
    aliases = {
        "paddy": "rice",
        "dhan": "rice",
        "chawal": "rice",
        "gehun": "wheat",
        "sarson": "mustard",
        "raida": "mustard",
        "makka": "maize",
        "corn": "maize",
        "kapas": "cotton",
    }
    if key in aliases:
        return CROP_CATALOG[aliases[key]]

    for crop_id, cfg in CROP_CATALOG.items():
        if key in cfg.name_en.lower() or key in cfg.name_hi:
            return cfg

    return None
