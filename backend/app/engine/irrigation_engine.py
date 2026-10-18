"""
SmartKisan AI-Powered Smart Irrigation Decision Engine & Water Requirement Calculator.
Implements FAO-56 Penman-Monteith / Hargreaves evapotranspiration budgeting,
phenological crop coefficients (Kc), soil hydraulic profiling, and rain-aware scheduling.
Quantifies water, fuel/electricity, and labor savings against a documented baseline.
"""

import datetime
from typing import Dict, Any, List, Optional, Tuple
from ..schemas.irrigation import (
    IrrigationRecommendationResponse,
    DecisionType,
    ConfidenceType,
    QualityStatusType,
)
from ..config import settings


# -----------------------------------------------------------------------------
# FAO-56 Crop Coefficients & Phenology Parameters
# -----------------------------------------------------------------------------
CROP_AGRONOMIC_DATABASE: Dict[str, Dict[str, Any]] = {
    "wheat": {
        "name_en": "Wheat",
        "name_hi": "गेहूं",
        "scientific_name": "Triticum aestivum",
        "kc_initial": 0.35,
        "kc_mid": 1.15,
        "kc_end": 0.30,
        "critical_moisture_threshold_pct": 45.0,  # Below this, irrigation needed
        "waterlogging_sensitivity": "HIGH",
        "root_depth_by_stage_m": {
            "sowing": 0.20,
            "crown_root_initiation": 0.35,
            "tillering": 0.55,
            "jointing": 0.75,
            "flowering": 0.90,
            "milking": 0.95,
            "dough": 1.00,
            "maturity": 1.00,
        },
        "stage_kc": {
            "sowing": 0.35,
            "crown_root_initiation": 0.65,
            "tillering": 0.85,
            "jointing": 1.05,
            "flowering": 1.15,
            "milking": 1.10,
            "dough": 0.70,
            "maturity": 0.30,
        },
    },
    "cotton": {
        "name_en": "Cotton",
        "name_hi": "कपास",
        "scientific_name": "Gossypium hirsutum",
        "kc_initial": 0.40,
        "kc_mid": 1.20,
        "kc_end": 0.50,
        "critical_moisture_threshold_pct": 40.0,
        "waterlogging_sensitivity": "CRITICAL",
        "root_depth_by_stage_m": {
            "sowing": 0.25,
            "seedling": 0.40,
            "square_formation": 0.70,
            "flowering": 1.10,
            "boll_formation": 1.20,
            "boll_bursting": 1.20,
        },
        "stage_kc": {
            "sowing": 0.40,
            "seedling": 0.65,
            "square_formation": 0.95,
            "flowering": 1.20,
            "boll_formation": 1.15,
            "boll_bursting": 0.50,
        },
    },
    "mustard": {
        "name_en": "Mustard",
        "name_hi": "सरसों / राई",
        "scientific_name": "Brassica juncea",
        "kc_initial": 0.35,
        "kc_mid": 1.05,
        "kc_end": 0.35,
        "critical_moisture_threshold_pct": 38.0,
        "waterlogging_sensitivity": "HIGH",
        "root_depth_by_stage_m": {
            "sowing": 0.20,
            "vegetative": 0.45,
            "flowering": 0.80,
            "siliqua_formation": 0.90,
            "maturity": 0.90,
        },
        "stage_kc": {
            "sowing": 0.35,
            "vegetative": 0.75,
            "flowering": 1.05,
            "siliqua_formation": 0.95,
            "maturity": 0.35,
        },
    },
    "rice": {
        "name_en": "Rice / Paddy",
        "name_hi": "धान / चावल",
        "scientific_name": "Oryza sativa",
        "kc_initial": 1.05,
        "kc_mid": 1.25,
        "kc_end": 0.90,
        "critical_moisture_threshold_pct": 70.0,
        "waterlogging_sensitivity": "LOW",
        "root_depth_by_stage_m": {
            "transplanting": 0.20,
            "tillering": 0.35,
            "panicle_initiation": 0.50,
            "flowering": 0.60,
            "grain_filling": 0.60,
            "maturity": 0.60,
        },
        "stage_kc": {
            "transplanting": 1.05,
            "tillering": 1.15,
            "panicle_initiation": 1.25,
            "flowering": 1.25,
            "grain_filling": 1.10,
            "maturity": 0.90,
        },
    },
    "maize": {
        "name_en": "Maize / Corn",
        "name_hi": "मक्का",
        "scientific_name": "Zea mays",
        "kc_initial": 0.40,
        "kc_mid": 1.20,
        "kc_end": 0.35,
        "critical_moisture_threshold_pct": 42.0,
        "waterlogging_sensitivity": "HIGH",
        "root_depth_by_stage_m": {
            "sowing": 0.20,
            "vegetative": 0.50,
            "tasseling": 0.80,
            "silking": 1.00,
            "grain_filling": 1.00,
            "maturity": 1.00,
        },
        "stage_kc": {
            "sowing": 0.40,
            "vegetative": 0.80,
            "tasseling": 1.15,
            "silking": 1.20,
            "grain_filling": 1.10,
            "maturity": 0.35,
        },
    },
    "tomato": {
        "name_en": "Tomato",
        "name_hi": "टमाटर",
        "scientific_name": "Solanum lycopersicum",
        "kc_initial": 0.45,
        "kc_mid": 1.15,
        "kc_end": 0.80,
        "critical_moisture_threshold_pct": 48.0,
        "waterlogging_sensitivity": "HIGH",
        "root_depth_by_stage_m": {
            "transplanting": 0.20,
            "vegetative": 0.40,
            "flowering": 0.65,
            "fruit_setting": 0.80,
            "ripening": 0.80,
        },
        "stage_kc": {
            "transplanting": 0.45,
            "vegetative": 0.75,
            "flowering": 1.05,
            "fruit_setting": 1.15,
            "ripening": 0.80,
        },
    },
}

# -----------------------------------------------------------------------------
# Soil Hydraulic Profiles (Field Capacity, Wilting Point, Infiltration)
# -----------------------------------------------------------------------------
SOIL_HYDRAULIC_PROFILES: Dict[str, Dict[str, Any]] = {
    "sandy": {
        "name_en": "Sandy Soil",
        "name_hi": "बलुई मिट्टी",
        "field_capacity_pct": 14.0,
        "wilting_point_pct": 6.0,
        "available_water_capacity_mm_per_m": 80.0,
        "infiltration_rate_mm_hr": 45.0,
        "drainage_speed": "FAST",
        "waterlogging_risk": "LOW",
    },
    "sandy_loam": {
        "name_en": "Sandy Loam",
        "name_hi": "बलुई दोमट",
        "field_capacity_pct": 22.0,
        "wilting_point_pct": 10.0,
        "available_water_capacity_mm_per_m": 120.0,
        "infiltration_rate_mm_hr": 25.0,
        "drainage_speed": "FAST",
        "waterlogging_risk": "LOW",
    },
    "loam": {
        "name_en": "Loam / Alluvial",
        "name_hi": "दोमट / जलोढ़",
        "field_capacity_pct": 28.0,
        "wilting_point_pct": 13.0,
        "available_water_capacity_mm_per_m": 150.0,
        "infiltration_rate_mm_hr": 15.0,
        "drainage_speed": "MODERATE",
        "waterlogging_risk": "MODERATE",
    },
    "clay_loam": {
        "name_en": "Clay Loam",
        "name_hi": "चिकनी दोमट",
        "field_capacity_pct": 34.0,
        "wilting_point_pct": 18.0,
        "available_water_capacity_mm_per_m": 160.0,
        "infiltration_rate_mm_hr": 10.0,
        "drainage_speed": "MODERATE",
        "waterlogging_risk": "HIGH",
    },
    "clay": {
        "name_en": "Clayey Soil",
        "name_hi": "मटियाली / चिकनी मिट्टी",
        "field_capacity_pct": 40.0,
        "wilting_point_pct": 24.0,
        "available_water_capacity_mm_per_m": 160.0,
        "infiltration_rate_mm_hr": 4.0,
        "drainage_speed": "SLOW",
        "waterlogging_risk": "CRITICAL",
    },
    "black_soil": {
        "name_en": "Black Cotton Soil (Vertisol)",
        "name_hi": "काली कपासी मिट्टी (रेगुर)",
        "field_capacity_pct": 42.0,
        "wilting_point_pct": 25.0,
        "available_water_capacity_mm_per_m": 170.0,
        "infiltration_rate_mm_hr": 3.0,
        "drainage_speed": "VERY_SLOW",
        "waterlogging_risk": "CRITICAL",
    },
}

# -----------------------------------------------------------------------------
# Irrigation Method Efficiencies
# -----------------------------------------------------------------------------
IRRIGATION_EFFICIENCY: Dict[str, float] = {
    "drip": 0.90,  # 90% application efficiency
    "sprinkler": 0.75,  # 75% efficiency
    "furrow": 0.60,  # 60% efficiency
    "flood": 0.45,  # Traditional flood basin: 45% efficiency (55% lost to deep percolation/evap)
}


# -----------------------------------------------------------------------------
# Calculation Helpers
# -----------------------------------------------------------------------------
def calculate_effective_rainfall(total_rain_mm: float) -> float:
    """
    USDA Soil Conservation Service / FAO method for effective rainfall:
    - Rain < 5mm evaporates from foliage and soil crust without reaching roots.
    - Medium rain (5-75mm) has ~80% infiltration minus initial abstraction.
    - Heavy rain (>75mm) has significant surface runoff.
    """
    if total_rain_mm < 5.0:
        return 0.0
    elif total_rain_mm <= 75.0:
        return max(0.0, (total_rain_mm * 0.8) - 4.0)
    else:
        return max(0.0, (75.0 * 0.8 - 4.0) + (total_rain_mm - 75.0) * 0.5)


def get_crop_coefficient(crop_type: str, growth_stage: str) -> Tuple[float, float]:
    """Returns (Kc, root_depth_m) for given crop and stage."""
    crop_info = CROP_AGRONOMIC_DATABASE.get(crop_type.lower(), CROP_AGRONOMIC_DATABASE["wheat"])
    stage_kc_map = crop_info.get("stage_kc", {})
    stage_root_map = crop_info.get("root_depth_by_stage_m", {})

    stage_lower = growth_stage.lower().replace(" ", "_")
    kc = stage_kc_map.get(stage_lower, crop_info.get("kc_mid", 1.0))
    root_depth_m = stage_root_map.get(stage_lower, 0.6)

    return kc, root_depth_m


def get_soil_profile(soil_type: str) -> Dict[str, Any]:
    """Returns hydraulic parameters for soil class."""
    st = soil_type.lower().replace(" ", "_")
    return SOIL_HYDRAULIC_PROFILES.get(st, SOIL_HYDRAULIC_PROFILES["clay_loam"])


def convert_depth_to_volume(depth_mm: float, area_sqm: float) -> float:
    """
    Dimensionally verified volume calculation:
    1 mm = 0.001 m
    Volume (m³) = depth_mm * 0.001 * area_sqm
    Volume (Litres) = Volume (m³) * 1000 = depth_mm * area_sqm
    1 mm of water depth over 1 square meter is EXACTLY 1 Litre.
    """
    return depth_mm * area_sqm


# -----------------------------------------------------------------------------
# Core Decision Engine
# -----------------------------------------------------------------------------
def evaluate_smart_irrigation(
    field_id: str,
    field_area_acres: float,
    field_area_sqm: float,
    crop_type: str,
    growth_stage: str,
    soil_type: str,
    irrigation_method: str,
    current_soil_moisture_pct: Optional[float],
    forecast_rain_next_48h_mm: float,
    forecast_rain_next_72h_mm: float,
    et0_mm_per_day: float,
    has_sensor_telemetry: bool = True,
    is_sensor_stale: bool = False,
    pump_flow_rate_lph: float = 25000.0,
    pump_type: str = "diesel",
    diesel_price_inr: float = settings.DEFAULT_DIESEL_PRICE_INR,
    electricity_tariff_inr: float = settings.DEFAULT_ELECTRICITY_TARIFF_INR,
) -> IrrigationRecommendationResponse:
    """
    Evaluates irrigation requirements using the water budget equation:
    Net Irrigation (In) = max(0, Soil Water Deficit + ETc - Effective Rain)
    Gross Irrigation (Ig) = In / Efficiency
    """
    now = datetime.datetime.utcnow()

    # 1. Agronomic crop & soil parameters
    crop_info = CROP_AGRONOMIC_DATABASE.get(crop_type.lower(), CROP_AGRONOMIC_DATABASE["wheat"])
    soil_info = get_soil_profile(soil_type)
    kc, root_depth_m = get_crop_coefficient(crop_type, growth_stage)
    efficiency = IRRIGATION_EFFICIENCY.get(irrigation_method.lower(), 0.45)

    # 2. Evapotranspiration Crop Demand (ETc = ET0 * Kc)
    etc_mm_day = round(et0_mm_per_day * kc, 2)
    etc_48h_mm = round(etc_mm_day * 2.0, 2)

    # 3. Usable effective rainfall from forecast
    eff_rain_48h = round(calculate_effective_rainfall(forecast_rain_next_48h_mm), 2)
    eff_rain_72h = round(calculate_effective_rainfall(forecast_rain_next_72h_mm), 2)

    # 4. Soil water parameters
    fc = soil_info["field_capacity_pct"]
    wp = soil_info["wilting_point_pct"]
    crit_threshold = crop_info["critical_moisture_threshold_pct"]

    # 5. Handle missing or sensorless data with transparent uncertainty
    warnings: List[str] = []
    if current_soil_moisture_pct is None:
        # Sensorless mode: estimate moisture from soil capacity and weather
        confidence_level: ConfidenceType = "LOW"
        data_quality_status: QualityStatusType = "WEATHER_ONLY_ESTIMATE"
        # Conservative estimate: assumes 50% between WP and FC
        estimated_moisture = round(wp + (fc - wp) * 0.45, 1)
        soil_moisture_val = estimated_moisture
        warnings.append(
            "No active IoT sensor detected. Recommendation is calculated using weather-based water deficit model. "
            "Enter manual moisture check for higher precision."
        )
    elif is_sensor_stale:
        confidence_level = "DEGRADED"
        data_quality_status = "OFFLINE_CACHED_STALE"
        soil_moisture_val = current_soil_moisture_pct
        warnings.append("Last sensor reading is older than 24 hours. Recommendation reflects degraded confidence.")
    else:
        confidence_level = "HIGH"
        data_quality_status = "LIVE_FUSION"
        soil_moisture_val = current_soil_moisture_pct

    # 6. Soil Water Deficit Calculation (SWD)
    # Total available water in root zone (mm) = 1000 * (FC - WP) / 100 * root_depth
    # Deficit = 1000 * max(0, FC - current) / 100 * root_depth
    moisture_deficit_pct = max(0.0, fc - soil_moisture_val)
    swd_mm = round((moisture_deficit_pct / 100.0) * root_depth_m * 1000.0, 2)

    # Categorize soil status
    if soil_moisture_val < wp + 2.0:
        moisture_status = "CRITICAL_DEFICIT"
    elif soil_moisture_val < crit_threshold:
        moisture_status = "MODERATE_DEFICIT"
    elif soil_moisture_val <= fc:
        moisture_status = "OPTIMAL"
    elif soil_moisture_val <= fc + 8.0:
        moisture_status = "SATURATED"
    else:
        moisture_status = "WATERLOGGED"

    # 7. Decision Logic
    reasons_en: List[str] = []
    reasons_hi: List[str] = []
    decision: DecisionType = "MONITOR"
    net_irrigation_depth_mm: float = 0.0

    # Rule A: Heavy Rain Incoming (>35mm in next 48h or high flood risk) -> WAIT
    if forecast_rain_next_48h_mm >= 30.0:
        decision = "WAIT"
        net_irrigation_depth_mm = 0.0
        reasons_en.append(
            f"Heavy rainfall of {forecast_rain_next_48h_mm:.1f} mm forecast in next 48 hours. Irrigation must be stopped immediately."
        )
        reasons_hi.append(
            f"अगले 48 घंटों में {forecast_rain_next_48h_mm:.1f} मिमी भारी बारिश का अनुमान है। तुरंत सिंचाई रोकें।"
        )
        if soil_info["waterlogging_risk"] in ["HIGH", "CRITICAL"]:
            warnings.append(
                f"Severe waterlogging hazard: {soil_info['name_en']} has slow infiltration ({soil_info['infiltration_rate_mm_hr']} mm/hr). "
                "Ensure drainage bunds are opened."
            )
            warnings.append(
                "High risk of nitrogen/urea leaching and seedling collar rot (Pythium/Rhizoctonia) if flooded."
            )
        suggested_window = "Postpone until rainfall ceases and topsoil drains (minimum 72 hours)"
        reassessment_delta = datetime.timedelta(hours=24)

    # Rule B: Moderate Rain Expected AND Soil Moisture is Adequate -> WAIT
    elif eff_rain_48h >= swd_mm and soil_moisture_val >= (crit_threshold - 4.0):
        decision = "WAIT"
        net_irrigation_depth_mm = 0.0
        reasons_en.append(
            f"Upcoming rainfall of {forecast_rain_next_48h_mm:.1f} mm (effective: {eff_rain_48h:.1f} mm) is sufficient to fulfill "
            f"crop evapotranspiration ({etc_48h_mm:.1f} mm) without supplemental pumping."
        )
        reasons_hi.append(
            f"आने वाली {forecast_rain_next_48h_mm:.1f} मिमी बारिश फसल की आवश्यकता को प्राकृतिक रूप से पूरा कर देगी। नलकूप चलाने की जरूरत नहीं है।"
        )
        suggested_window = "Hold irrigation; rain will naturally recharge root zone"
        reassessment_delta = datetime.timedelta(hours=24)

    # Rule C: Soil moisture below critical threshold AND negligible rain -> IRRIGATE
    elif (soil_moisture_val < crit_threshold or swd_mm > (fc - wp) * root_depth_m * 400.0) and eff_rain_72h < 6.0:
        decision = "IRRIGATE"
        # Net requirement = Deficit + 48h crop demand - effective rain
        raw_net = swd_mm + etc_48h_mm - eff_rain_48h
        # Clamp to agronomic safe single application depth (max 50mm to prevent run-off)
        net_irrigation_depth_mm = max(10.0, min(50.0, raw_net))
        reasons_en.append(
            f"Soil moisture ({soil_moisture_val:.1f}%) is below the critical threshold ({crit_threshold:.1f}%) for {crop_info['name_en']} at {growth_stage} stage."
        )
        reasons_en.append(
            f"No meaningful rain forecast in next 72h ({forecast_rain_next_72h_mm:.1f} mm expected). Crop evapotranspiration is {etc_mm_day:.1f} mm/day."
        )
        reasons_hi.append(
            f"{crop_info['name_hi']} की {growth_stage} अवस्था में मिट्टी की नमी ({soil_moisture_val:.1f}%) आवश्यक स्तर ({crit_threshold:.1f}%) से कम हो गई है।"
        )
        reasons_hi.append(
            f"अगले 3 दिनों में बारिश की कोई संभावना नहीं है। फसल को जल संकट से बचाने के लिए सिंचाई करें।"
        )
        suggested_window = "Early morning (05:00 AM - 08:30 AM) or late evening (after 05:30 PM) to avoid solar evaporative loss"
        reassessment_delta = datetime.timedelta(hours=48)

    # Rule D: Soil moisture is optimal and no immediate weather threat -> MONITOR
    else:
        decision = "MONITOR"
        net_irrigation_depth_mm = 0.0
        reasons_en.append(
            f"Root zone soil moisture ({soil_moisture_val:.1f}%) is optimal for {crop_info['name_en']}. No immediate water stress."
        )
        reasons_hi.append(
            f"जमीन में {soil_moisture_val:.1f}% पर्याप्त नमी मौजूद है। फसल सुरक्षित है, आज सिंचाई की आवश्यकता नहीं है।"
        )
        suggested_window = "No immediate application needed; maintain normal field scouting"
        reassessment_delta = datetime.timedelta(hours=36)

    # 8. Gross application requirement with application efficiency
    gross_depth_mm = round(net_irrigation_depth_mm / efficiency, 1) if decision == "IRRIGATE" else 0.0
    recommended_volume_litres = round(convert_depth_to_volume(gross_depth_mm, field_area_sqm), 1)

    # 9. Documented Baseline & Quantified Savings
    # Baseline: Traditional flood irrigation calendar applies ~65mm depth on fixed intervals regardless of rain
    baseline_depth_mm = settings.TRADITIONAL_FLOOD_BASELINE_MM
    baseline_volume_litres = round(convert_depth_to_volume(baseline_depth_mm, field_area_sqm), 1)

    if decision in ["WAIT", "MONITOR"]:
        # When rain or moisture allows delaying, farmer saves 100% of an unmanaged flood event!
        water_saved_litres = baseline_volume_litres
    else:
        # Precision irrigation applies only the necessary water vs the 65mm traditional flood
        water_saved_litres = max(0.0, baseline_volume_litres - recommended_volume_litres)

    # Energy savings based on pump flow rate
    hours_saved = round(water_saved_litres / pump_flow_rate_lph, 2) if pump_flow_rate_lph > 0 else 0.0
    diesel_saved_litres = round(hours_saved * settings.DIESEL_PUMP_LPH, 2)
    electricity_saved_kwh = round(hours_saved * settings.ELECTRIC_PUMP_KW, 2)

    if pump_type.lower() == "electric":
        cost_saved_inr = round(electricity_saved_kwh * electricity_tariff_inr, 2)
    else:
        cost_saved_inr = round(diesel_saved_litres * diesel_price_inr, 2)

    return IrrigationRecommendationResponse(
        field_id=field_id,
        decision=decision,
        recommended_water_depth_mm=gross_depth_mm,
        estimated_water_volume_litres=recommended_volume_litres,
        suggested_irrigation_window=suggested_window,
        confidence_level=confidence_level,
        data_quality_status=data_quality_status,
        reasons=reasons_en,
        reasons_hi=reasons_hi,
        expected_rainfall_mm=round(forecast_rain_next_72h_mm, 1),
        forecast_horizon_hours=72,
        crop_growth_stage=growth_stage,
        soil_moisture_status=moisture_status,
        soil_moisture_pct=soil_moisture_val,
        etc_crop_water_demand_mm=etc_mm_day,
        effective_rainfall_mm=eff_rain_48h,
        soil_water_deficit_mm=swd_mm,
        irrigation_efficiency_pct=round(efficiency * 100.0, 1),
        baseline_water_volume_litres=baseline_volume_litres,
        estimated_water_saved_litres=round(water_saved_litres, 1),
        estimated_cost_saved_inr=cost_saved_inr,
        estimated_diesel_saved_litres=diesel_saved_litres,
        estimated_pumping_hours_saved=hours_saved,
        warnings=warnings,
        timestamp=now,
        next_reassessment_time=now + reassessment_delta,
    )
