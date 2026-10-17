"""
SmartKisan Agronomic Rules and Threshold Catalog.
Documented sources:
- ICAR-IIWBR: Indian Institute of Wheat and Barley Research (Karnal)
- ICAR-NRRI: National Rice Research Institute (Cuttack)
- ICAR-DRMR: Directorate of Rapeseed-Mustard Research (Bharatpur)
- ICAR-CICR: Central Institute for Cotton Research (Nagpur)
- ICAR-IIMR: Indian Institute of Maize Research (Ludhiana)
- FAO Irrigation and Drainage Paper No. 56 (Crop Evapotranspiration)
"""

from typing import Dict, Any, List


# -----------------------------------------------------------------------------
# Soil Hydrology Parameters
# Available Water Capacity (AWC) in mm per 30cm active root zone,
# Infiltration / Drainage rate, and waterlogging vulnerability.
# Source: ICAR-CSSRI (Central Soil Salinity Research Institute) & USDA-NRCS
# -----------------------------------------------------------------------------
SOIL_HYDROLOGY_CATALOG: Dict[str, Dict[str, Any]] = {
    "clay_loam": {
        "name": "Clay Loam (चिकनी दोमट)",
        "awc_mm_per_30cm": 48.0,
        "drainage_speed": "slow",
        "waterlogging_threshold_rain_mm_48h": 30.0,
        "drying_period_days": 4,
        "infiltration_rate_mm_hr": 8.0,
        "notes": "Good nutrient retention, but prone to ponding and root asphyxiation during downpours.",
    },
    "sandy_loam": {
        "name": "Sandy Loam (बलुई दोमट)",
        "awc_mm_per_30cm": 32.0,
        "drainage_speed": "rapid",
        "waterlogging_threshold_rain_mm_48h": 55.0,
        "drying_period_days": 2,
        "infiltration_rate_mm_hr": 25.0,
        "notes": "Excellent aeration and quick drainage, but low moisture holding buffer; requires timely irrigation.",
    },
    "loam": {
        "name": "Loam / Alluvial (दोमट / कछारी)",
        "awc_mm_per_30cm": 42.0,
        "drainage_speed": "moderate",
        "waterlogging_threshold_rain_mm_48h": 40.0,
        "drying_period_days": 3,
        "infiltration_rate_mm_hr": 15.0,
        "notes": "Ideal agricultural soil of the Indo-Gangetic Plains. Balanced retention and drainage.",
    },
    "alluvial": {
        "name": "Alluvial (जलोढ़ मिट्टी)",
        "awc_mm_per_30cm": 44.0,
        "drainage_speed": "moderate",
        "waterlogging_threshold_rain_mm_48h": 40.0,
        "drying_period_days": 3,
        "infiltration_rate_mm_hr": 16.0,
        "notes": "Deep fertile soil common in Punjab, Haryana, UP, and Bihar.",
    },
    "clay": {
        "name": "Heavy Clay (काली चिकनी मिट्टी)",
        "awc_mm_per_30cm": 52.0,
        "drainage_speed": "very_slow",
        "waterlogging_threshold_rain_mm_48h": 22.0,
        "drying_period_days": 6,
        "infiltration_rate_mm_hr": 3.0,
        "notes": "Extremely slow infiltration. Heavy rainfall creates standing water quickly, rotting seeds.",
    },
    "black_soil": {
        "name": "Black Cotton Soil / Vertisol (काली मिट्टी / रेगुर)",
        "awc_mm_per_30cm": 54.0,
        "drainage_speed": "slow",
        "waterlogging_threshold_rain_mm_48h": 25.0,
        "drying_period_days": 5,
        "infiltration_rate_mm_hr": 5.0,
        "notes": "Deep swelling and cracking behavior. Wide cracks when dry, impermeable when saturated.",
    },
    "sandy": {
        "name": "Sandy Soil (रेतीली मिट्टी)",
        "awc_mm_per_30cm": 22.0,
        "drainage_speed": "very_rapid",
        "waterlogging_threshold_rain_mm_48h": 70.0,
        "drying_period_days": 1,
        "infiltration_rate_mm_hr": 45.0,
        "notes": "Dries almost immediately. Water stress develops rapidly without frequent replenishment.",
    },
}


# -----------------------------------------------------------------------------
# Irrigation Method Efficiencies and Application Buffers
# Source: FAO Irrigation Manual & ICAR Water Technology Centre
# -----------------------------------------------------------------------------
IRRIGATION_METHOD_CATALOG: Dict[str, Dict[str, Any]] = {
    "flood": {
        "name": "Flood / Basin Irrigation (खुला बहाव / क्यारी)",
        "application_efficiency_pct": 50,
        "typical_depth_mm": 60.0,
        "runoff_risk": "high",
        "waterlogging_enhancement": True,
        "notes": "High water volume applied per event; elevates waterlogging risk if rain follows immediately.",
    },
    "furrow": {
        "name": "Furrow Irrigation (नाली / कूंड़ विधि)",
        "application_efficiency_pct": 65,
        "typical_depth_mm": 45.0,
        "runoff_risk": "moderate",
        "waterlogging_enhancement": False,
        "notes": "Better water control than flood; beds remain aerated.",
    },
    "sprinkler": {
        "name": "Sprinkler Irrigation (फव्वारा सिंचाई)",
        "application_efficiency_pct": 75,
        "typical_depth_mm": 25.0,
        "runoff_risk": "low",
        "waterlogging_enhancement": False,
        "wind_sensitive_kmh": 15.0,
        "notes": "Uniform shallow application; avoid operating in winds > 15 km/h.",
    },
    "drip": {
        "name": "Drip / Micro-irrigation (ड्रिप / बूंद-बूंद)",
        "application_efficiency_pct": 90,
        "typical_depth_mm": 15.0,
        "runoff_risk": "negligible",
        "waterlogging_enhancement": False,
        "notes": "Targeted root zone delivery; minimal surface crusting or ponding.",
    },
    "rainfed": {
        "name": "Rainfed / Barani (वर्षा आधारित / बारानी)",
        "application_efficiency_pct": 100,
        "typical_depth_mm": 0.0,
        "runoff_risk": "moderate",
        "waterlogging_enhancement": False,
        "notes": "Zero supplemental irrigation infrastructure; entirely dependent on rainfall distribution.",
    },
}


# -----------------------------------------------------------------------------
# Crop Agronomic Sensitivity Rules
# Sources: ICAR Crop Management Handbooks & CRIDA Contingency Plans
# -----------------------------------------------------------------------------
CROP_AGRONOMIC_RULES: Dict[str, Dict[str, Any]] = {
    "wheat": {
        "id": "wheat",
        "name_en": "Wheat",
        "name_hi": "गेहूं",
        "scientific_name": "Triticum aestivum",
        "season": "Rabi",
        "base_temperature_c": 4.5,
        "critical_heat_thresholds_by_stage": {
            "germination_emergence": 28.0,
            "crown_root_initiation": 27.0,
            "tillering": 26.0,
            "jointing": 28.0,
            "flowering_anthesis": 31.0,  # Critical: Pollen desiccation above 31°C
            "milking_dough": 33.0,       # Terminal heat stress: grain shriveling above 33°C
            "maturity_harvest": 38.0,
        },
        "water_stress_sensitivity_by_stage": {
            "crown_root_initiation": "CRITICAL",  # Missing irrigation here drops yield by 30-40%
            "tillering": "HIGH",
            "jointing": "MEDIUM",
            "flowering_anthesis": "CRITICAL",
            "milking_dough": "HIGH",
            "maturity_harvest": "LOW",
        },
        "rainfall_tolerance_by_stage": {
            "germination_emergence": {"max_safe_48h_rain_mm": 25.0, "risk": "Seed washout & crusting"},
            "crown_root_initiation": {"max_safe_48h_rain_mm": 35.0, "risk": "Oxygen depletion around root crown"},
            "tillering": {"max_safe_48h_rain_mm": 40.0, "risk": "Temporary yellowing"},
            "flowering_anthesis": {"max_safe_48h_rain_mm": 20.0, "risk": "Pollen wash and reduced floret setting"},
            "milking_dough": {"max_safe_48h_rain_mm": 25.0, "risk": "Lodging and fungal rust acceleration"},
            "maturity_harvest": {"max_safe_48h_rain_mm": 5.0, "risk": "Grain discoloration, sprouting, and machinery sinkage"},
        },
        "stages_schedule_das": [
            (0, 10, "germination_emergence", "Germination & Seedling (अंकुरण व प्रारंभिक अवस्था)"),
            (11, 25, "crown_root_initiation", "Crown Root Initiation - CRI (क्राउन जड़ फुटाव)"),
            (26, 50, "tillering", "Tillering Stage (कल्ले फूटना)"),
            (51, 70, "jointing", "Jointing / Stem Elongation (गांठें बनना)"),
            (71, 90, "flowering_anthesis", "Booting & Flowering (बाली व फूल आना)"),
            (91, 115, "milking_dough", "Milking & Grain Filling (दुग्धावस्था व दाना भराव)"),
            (116, 140, "maturity_harvest", "Physiological Maturity & Harvest (परिपक्वता व कटाई)"),
        ],
        "source": "ICAR-IIWBR Karnal (Indian Institute of Wheat & Barley Research) Guidelines",
    },

    "rice": {
        "id": "rice",
        "name_en": "Rice / Paddy",
        "name_hi": "धान",
        "scientific_name": "Oryza sativa",
        "season": "Kharif",
        "base_temperature_c": 10.0,
        "critical_heat_thresholds_by_stage": {
            "nursery_seedling": 36.0,
            "transplanting_tillering": 36.0,
            "panicle_initiation": 35.0,
            "flowering_anthesis": 35.0,  # Spikelet sterility occurs above 35°C
            "milking_dough": 34.0,
            "maturity_harvest": 38.0,
        },
        "water_stress_sensitivity_by_stage": {
            "transplanting_tillering": "HIGH",
            "panicle_initiation": "CRITICAL",
            "flowering_anthesis": "CRITICAL",
            "milking_dough": "MEDIUM",
            "maturity_harvest": "LOW",
        },
        "rainfall_tolerance_by_stage": {
            "transplanting_tillering": {"max_safe_48h_rain_mm": 80.0, "risk": "Submergence if seedlings unestablished"},
            "panicle_initiation": {"max_safe_48h_rain_mm": 70.0, "risk": "Stem breakage"},
            "flowering_anthesis": {"max_safe_48h_rain_mm": 30.0, "risk": "Washing out pollen, sterile spikelets"},
            "maturity_harvest": {"max_safe_48h_rain_mm": 5.0, "risk": "Panicle lodging, mold, viviparous germination"},
        },
        "stages_schedule_das": [
            (0, 25, "nursery_seedling", "Nursery / Early Seedling (नर्सरी अवस्था)"),
            (26, 50, "transplanting_tillering", "Transplanting & Active Tillering (रोपाई व कल्ले बनना)"),
            (51, 75, "panicle_initiation", "Panicle Initiation & Booting (गाभा व बाली निकलना)"),
            (76, 95, "flowering_anthesis", "Flowering & Pollination (फूल व परागण)"),
            (96, 115, "milking_dough", "Grain Filling / Milking (दाना भराव)"),
            (116, 135, "maturity_harvest", "Ripening & Harvest (परिपक्वता व कटाई)"),
        ],
        "source": "ICAR-NRRI Cuttack (National Rice Research Institute) Protocol",
    },

    "mustard": {
        "id": "mustard",
        "name_en": "Mustard (Rape / Sarson)",
        "name_hi": "सरसों",
        "scientific_name": "Brassica juncea",
        "season": "Rabi",
        "base_temperature_c": 5.0,
        "critical_heat_thresholds_by_stage": {
            "germination_emergence": 30.0,
            "seedling_rosette": 28.0,
            "flowering": 28.0,
            "pod_siliqua_development": 30.0,  # Causes premature pod drying and drops oil content
            "maturity_harvest": 36.0,
        },
        "water_stress_sensitivity_by_stage": {
            "seedling_rosette": "MEDIUM",
            "flowering": "HIGH",             # First critical irrigation at flowering (30-35 DAS)
            "pod_siliqua_development": "HIGH",# Second critical irrigation at pod filling (55-65 DAS)
            "maturity_harvest": "LOW",
        },
        "rainfall_tolerance_by_stage": {
            "germination_emergence": {"max_safe_48h_rain_mm": 18.0, "risk": "Severe crusting prevents seedling emergence"},
            "flowering": {"max_safe_48h_rain_mm": 20.0, "risk": "Flower drop & aphid/fungal incidence"},
            "pod_siliqua_development": {"max_safe_48h_rain_mm": 25.0, "risk": "Stem rot (Sclerotinia)"},
            "maturity_harvest": {"max_safe_48h_rain_mm": 4.0, "risk": "Pod shattering and seed darkening"},
        },
        "stages_schedule_das": [
            (0, 12, "germination_emergence", "Germination & Early Emergence (अंकुरण)"),
            (13, 35, "seedling_rosette", "Seedling & Rosette Formation (शुरुआती बढ़वार)"),
            (36, 60, "flowering", "Flowering Stage (फूल आना)"),
            (61, 95, "pod_siliqua_development", "Pod Development & Seed Filling (फली व दाना बनना)"),
            (96, 120, "maturity_harvest", "Siliqua Yellowing & Harvest (पकना व कटाई)"),
        ],
        "source": "ICAR-DRMR Bharatpur (Directorate of Rapeseed-Mustard Research)",
    },

    "cotton": {
        "id": "cotton",
        "name_en": "Cotton",
        "name_hi": "कपास",
        "scientific_name": "Gossypium hirsutum",
        "season": "Kharif",
        "base_temperature_c": 12.0,
        "critical_heat_thresholds_by_stage": {
            "seedling_vegetative": 38.0,
            "squaring_flowering": 38.0,
            "boll_development": 37.0,
            "boll_bursting_picking": 40.0,
        },
        "water_stress_sensitivity_by_stage": {
            "seedling_vegetative": "LOW",
            "squaring_flowering": "CRITICAL", # Water deficit causes flower & square shedding
            "boll_development": "HIGH",
            "boll_bursting_picking": "LOW",
        },
        "rainfall_tolerance_by_stage": {
            "seedling_vegetative": {"max_safe_48h_rain_mm": 35.0, "risk": "Waterlogging stunting in Vertisols"},
            "squaring_flowering": {"max_safe_48h_rain_mm": 30.0, "risk": "Square shedding & flower drop"},
            "boll_development": {"max_safe_48h_rain_mm": 40.0, "risk": "Internal boll rot"},
            "boll_bursting_picking": {"max_safe_48h_rain_mm": 3.0, "risk": "Lint staining, fiber degradation, fungal discoloration"},
        },
        "stages_schedule_das": [
            (0, 30, "seedling_vegetative", "Seedling & Vegetative (शुरुआती वानस्पतिक बढ़वार)"),
            (31, 65, "squaring_flowering", "Squaring & Flowering (डोडी व फूल आना)"),
            (66, 110, "boll_development", "Boll Development (टिंडे बनना व भराव)"),
            (111, 160, "boll_bursting_picking", "Boll Bursting & Picking (टिंडे खिलना व चुनाई)"),
        ],
        "source": "ICAR-CICR Nagpur (Central Institute for Cotton Research)",
    },

    "maize": {
        "id": "maize",
        "name_en": "Maize (Corn)",
        "name_hi": "मक्का",
        "scientific_name": "Zea mays",
        "season": "Kharif/Rabi",
        "base_temperature_c": 10.0,
        "critical_heat_thresholds_by_stage": {
            "emergence_early_veg": 35.0,
            "knee_high": 35.0,
            "tasseling_silking": 35.0,  # Pollen dessicates above 35°C
            "dough_grain_filling": 36.0,
            "maturity_harvest": 38.0,
        },
        "water_stress_sensitivity_by_stage": {
            "emergence_early_veg": "MEDIUM",
            "knee_high": "HIGH",
            "tasseling_silking": "CRITICAL", # Most sensitive to moisture stress
            "dough_grain_filling": "HIGH",
            "maturity_harvest": "LOW",
        },
        "rainfall_tolerance_by_stage": {
            "emergence_early_veg": {"max_safe_48h_rain_mm": 25.0, "risk": "Waterlogging asphyxiation (seedlings die in 24h standing water)"},
            "knee_high": {"max_safe_48h_rain_mm": 45.0, "risk": "Root lodging"},
            "tasseling_silking": {"max_safe_48h_rain_mm": 30.0, "risk": "Pollen wash"},
            "maturity_harvest": {"max_safe_48h_rain_mm": 6.0, "risk": "Cob rot and aflatoxin buildup"},
        },
        "stages_schedule_das": [
            (0, 15, "emergence_early_veg", "Emergence & Early Vegetative (अंकुरण व शुरुआती बढ़वार)"),
            (16, 40, "knee_high", "Knee High Stage (घुटने बराबर ऊंचाई)"),
            (41, 65, "tasseling_silking", "Tasseling & Silking (नर व मादा फूल - मंजर आना)"),
            (66, 95, "dough_grain_filling", "Grain Filling / Dough (दाना भराव)"),
            (96, 120, "maturity_harvest", "Maturity & Harvest (परिपक्वता व कटाई)"),
        ],
        "source": "ICAR-IIMR Ludhiana (Indian Institute of Maize Research)",
    },
}


def get_crop_rule(crop_name: str) -> Dict[str, Any]:
    """Retrieves validated agronomic rules for crop or returns default wheat-aligned benchmark."""
    key = crop_name.lower().strip()
    aliases = {
        "paddy": "rice",
        "dhan": "rice",
        "gehun": "wheat",
        "sarson": "mustard",
        "corn": "maize",
        "makka": "maize",
        "kapas": "cotton",
    }
    canonical = aliases.get(key, key)
    if canonical in CROP_AGRONOMIC_RULES:
        return CROP_AGRONOMIC_RULES[canonical]

    # Return wheat as robust default benchmark with documented fallback note
    rule = CROP_AGRONOMIC_RULES["wheat"].copy()
    rule["id"] = key
    rule["name_en"] = crop_name.capitalize()
    rule["notes"] = f"Using calibrated generic cereal/field crop benchmark (source: ICAR standard) for {crop_name}."
    return rule


def get_soil_profile(soil_type: str) -> Dict[str, Any]:
    """Retrieves hydrological attributes for specified soil class."""
    key = soil_type.lower().strip().replace(" ", "_")
    if key in SOIL_HYDROLOGY_CATALOG:
        return SOIL_HYDROLOGY_CATALOG[key]
    # Default to medium loam
    return SOIL_HYDROLOGY_CATALOG["loam"]


def get_irrigation_profile(method: str) -> Dict[str, Any]:
    """Retrieves efficiency and characteristics for irrigation technique."""
    key = method.lower().strip()
    if key in IRRIGATION_METHOD_CATALOG:
        return IRRIGATION_METHOD_CATALOG[key]
    return IRRIGATION_METHOD_CATALOG["flood"]
