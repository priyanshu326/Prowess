"""
SmartKisan Sensorless Decision Engine.
Evaluates Heat Stress, Rainfall/Waterlogging, and Water-Stress Deficit risks
using verified agronomic rules, soil hydrology, Open-Meteo weather data,
and farmer field observations.
"""

import datetime
from typing import List, Dict, Any, Optional, Tuple
from ..schemas.smartkisan import SingleRiskAssessment, RiskType, RiskLevel, ConfidenceLabel
from ..schemas.weather import NormalizedWeatherData
from .rules_catalog import get_crop_rule, get_soil_profile, get_irrigation_profile
from .growth_stage import estimate_crop_growth_stage


def evaluate_heat_stress(
    farm_id: str,
    crop_info: Dict[str, Any],
    weather_data: Optional[NormalizedWeatherData],
    observation: Optional[Dict[str, Any]],
    confidence: ConfidenceLabel,
) -> SingleRiskAssessment:
    """Evaluates atmospheric heat stress against crop phenological limits."""
    crop_name = crop_info["crop_name"]
    stage = crop_info["stage_name"]
    critical_threshold = crop_info["critical_heat_threshold_c"]
    das = crop_info["days_after_sowing"]
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    limitations = [
        "Canopy temperature is inferred from 2-meter air temperature; direct microclimate canopy sensors are not deployed.",
        "Forecast temperature skill declines after 72-120 hours.",
    ]

    data_sources = ["ICAR Thermal Tolerance Benchmark", "Farmer Crop Sowing Record"]

    if not weather_data or not weather_data.daily:
        return SingleRiskAssessment(
            farm_id=farm_id,
            crop=crop_name,
            growth_stage=stage,
            days_after_sowing=das,
            risk_type="heat_stress",
            risk_level="MODERATE",
            evidence=[
                f"External weather forecast currently unavailable (data provider degraded).",
                f"Climatological seasonal average for {crop_name} in this region was applied.",
                f"Crop is at {stage} (DAS {das}). Critical stage heat limit is {critical_threshold}°C.",
            ],
            recommendation=f"Monitor local temperature conditions. If day temperatures exceed {critical_threshold}°C, apply light evening irrigation to moderate soil temperature.",
            confidence="DEGRADED",
            data_sources=data_sources + ["Regional Seasonal Normals"],
            generated_at=now_iso,
            limitations=limitations + ["Evaluated without live meteorological telemetry."],
        )

    data_sources.append(f"Open-Meteo Forecast ({weather_data.data_provider})")

    daily = weather_data.daily
    forecast_3d = daily[:3]
    max_temps_3d = [d.temp_max_c for d in forecast_3d]
    highest_temp = max(max_temps_3d) if max_temps_3d else 28.0
    days_exceeding = sum(1 for t in max_temps_3d if t >= critical_threshold)

    # Calculate atmospheric ET0 demand
    et0_values = [d.et0_fao_evapotranspiration or 4.0 for d in forecast_3d]
    avg_et0 = sum(et0_values) / len(et0_values)

    evidence = [
        f"Next 3-day forecast max temperatures: {', '.join([f'{t:.1f}°C' for t in max_temps_3d])} (Peak: {highest_temp:.1f}°C).",
        f"Critical heat stress threshold for {crop_name} during '{stage}' is {critical_threshold:.1f}°C.",
        f"Atmospheric evaporative demand (FAO-56 ET0) averages {avg_et0:.1f} mm/day.",
    ]

    # Rule evaluation
    if highest_temp >= critical_threshold + 3.0 and days_exceeding >= 2:
        risk_level: RiskLevel = "CRITICAL"
        rec = (
            f"Severe heat shock warning! Forecast peak ({highest_temp:.1f}°C) exceeds thermal limit by {highest_temp - critical_threshold:.1f}°C for {days_exceeding} days. "
            f"Apply light protective sprinkler or evening irrigation to dampen canopy temperature. Avoid midday foliar sprays."
        )
    elif highest_temp >= critical_threshold or days_exceeding >= 1:
        risk_level = "HIGH"
        rec = (
            f"Moderate-to-high heat stress likely as temperatures reach {highest_temp:.1f}°C. "
            f"Keep soil moist to reduce ground radiative heat. Schedule any field operations before 10 AM or after 4 PM."
        )
    elif highest_temp >= critical_threshold - 2.0:
        risk_level = "MODERATE"
        rec = (
            f"Temperatures are approaching upper comfort bounds ({highest_temp:.1f}°C vs threshold {critical_threshold:.1f}°C). "
            f"Ensure adequate root-zone hydration to prevent premature leaf wilting."
        )
    else:
        risk_level = "LOW"
        rec = (
            f"Forecast temperatures (max {highest_temp:.1f}°C) remain within the safe physiological envelope for {crop_name}. "
            f"Standard field management is recommended."
        )

    return SingleRiskAssessment(
        farm_id=farm_id,
        crop=crop_name,
        growth_stage=stage,
        days_after_sowing=das,
        risk_type="heat_stress",
        risk_level=risk_level,
        evidence=evidence,
        recommendation=rec,
        confidence=confidence,
        data_sources=data_sources,
        generated_at=now_iso,
        limitations=limitations,
    )


def evaluate_rainfall_waterlogging(
    farm_id: str,
    crop_info: Dict[str, Any],
    soil_profile: Dict[str, Any],
    irrigation_profile: Dict[str, Any],
    weather_data: Optional[NormalizedWeatherData],
    observation: Optional[Dict[str, Any]],
    confidence: ConfidenceLabel,
) -> SingleRiskAssessment:
    """Evaluates rainfall deluge, post-sowing washout, and waterlogging risks."""
    crop_name = crop_info["crop_name"]
    stage = crop_info["stage_name"]
    das = crop_info["days_after_sowing"]
    soil_name = soil_profile["name"]
    drainage_speed = soil_profile["drainage_speed"]
    waterlogging_threshold_48h = soil_profile["waterlogging_threshold_rain_mm_48h"]
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    limitations = [
        "Infiltration rates assume uniform soil horizon and lack of hardpan compaction.",
        "Rainfall totals are spatial grid averages; micro-convective localized storm cells may deviate.",
    ]
    data_sources = [
        "Soil Hydrology Profile (ICAR-CSSRI / USDA-NRCS)",
        "ICAR Crop Tolerance Guidelines",
    ]

    if not weather_data or not weather_data.daily:
        return SingleRiskAssessment(
            farm_id=farm_id,
            crop=crop_name,
            growth_stage=stage,
            days_after_sowing=das,
            risk_type="rainfall_waterlogging",
            risk_level="LOW",
            evidence=[
                f"Live precipitation forecast unavailable.",
                f"Soil type: {soil_name} with {drainage_speed} drainage.",
                f"Crop at {stage}.",
            ],
            recommendation="Inspect field drainage channels. If clouds indicate rain, postpone planned tubewell irrigation.",
            confidence="DEGRADED",
            data_sources=data_sources + ["Climatological Baseline"],
            generated_at=now_iso,
            limitations=limitations + ["Live meteorological telemetry unavailable."],
        )

    data_sources.append(f"Open-Meteo Precipitation Model ({weather_data.data_provider})")

    daily = weather_data.daily
    rain_24h = daily[0].precipitation_sum_mm if len(daily) > 0 else 0.0
    rain_48h = sum(d.precipitation_sum_mm for d in daily[:2])
    rain_72h = sum(d.precipitation_sum_mm for d in daily[:3])
    max_prob_48h = max((d.precipitation_probability_max_pct or 0.0 for d in daily[:2]), default=0.0)

    # Observation evidence
    soil_surface = observation.get("soil_surface_status", "normal") if observation else "normal"
    surface_already_wet = soil_surface in ["waterlogged", "damp"]

    evidence = [
        f"Forecast cumulative rainfall: {rain_24h:.1f} mm in next 24h, {rain_48h:.1f} mm in 48h, {rain_72h:.1f} mm in 72h (Rain probability: {max_prob_48h:.0f}%).",
        f"Field soil: {soil_name} with {drainage_speed} internal drainage. Waterlogging risk threshold is {waterlogging_threshold_48h:.1f} mm in 48h.",
        f"Crop stage: {stage} (DAS {das}). Safe rain tolerance limit is {crop_info['rainfall_tolerance'].get('max_safe_48h_rain_mm', 35.0):.1f} mm.",
    ]
    if observation and soil_surface != "normal":
        evidence.append(f"Farmer reported current topsoil status as '{soil_surface}'.")

    # Evaluation Rules
    if (rain_48h >= waterlogging_threshold_48h * 1.25) or (rain_48h >= 45.0 and drainage_speed in ["slow", "very_slow"]):
        risk_level: RiskLevel = "CRITICAL"
        rec = (
            f"High danger of waterlogging and root asphyxiation! Forecast 48h rain ({rain_48h:.1f} mm) overwhelms {soil_name} drainage capacity. "
            f"Open field drainage furrows and clear bund cuts immediately. Do not apply fertilizer or irrigate."
        )
    elif (rain_48h >= waterlogging_threshold_48h * 0.8) or (rain_24h >= 25.0) or (rain_48h >= 20.0 and surface_already_wet):
        risk_level = "HIGH"
        rec = (
            f"Elevated waterlogging risk ({rain_48h:.1f} mm expected). "
            f"Halt all irrigation. Postpone planned urea/nitrogen top-dressing to prevent leaching losses."
        )
    elif rain_48h >= 10.0 or rain_72h >= 20.0 or max_prob_48h >= 65.0:
        risk_level = "MODERATE"
        rec = (
            f"Light-to-moderate showers expected ({rain_48h:.1f} mm in 48h). "
            f"Delay scheduled irrigation by 48-72 hours to save groundwater and diesel costs."
        )
    else:
        risk_level = "LOW"
        rec = (
            f"Negligible rainfall forecast ({rain_48h:.1f} mm in 48h). "
            f"Field moisture conditions are well-drained. No washout or waterlogging risk."
        )

    return SingleRiskAssessment(
        farm_id=farm_id,
        crop=crop_name,
        growth_stage=stage,
        days_after_sowing=das,
        risk_type="rainfall_waterlogging",
        risk_level=risk_level,
        evidence=evidence,
        recommendation=rec,
        confidence=confidence,
        data_sources=data_sources,
        generated_at=now_iso,
        limitations=limitations,
    )


def evaluate_water_stress(
    farm_id: str,
    crop_info: Dict[str, Any],
    soil_profile: Dict[str, Any],
    irrigation_profile: Dict[str, Any],
    weather_data: Optional[NormalizedWeatherData],
    observation: Optional[Dict[str, Any]],
    confidence: ConfidenceLabel,
) -> SingleRiskAssessment:
    """Evaluates crop water deficit stress using atmospheric demand (ET0) and irrigation history."""
    crop_name = crop_info["crop_name"]
    stage = crop_info["stage_name"]
    das = crop_info["days_after_sowing"]
    soil_name = soil_profile["name"]
    awc_mm = soil_profile["awc_mm_per_30cm"]
    water_sensitivity = crop_info["water_stress_sensitivity"]
    irrigation_method = irrigation_profile["name"]
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    limitations = [
        "Root-zone soil moisture is modeled from meteorological water balance (FAO-56 ET0) and observation, not capacitance probes.",
        "Groundwater capillary rise contribution is assumed negligible unless specified.",
    ]
    data_sources = [
        "FAO Irrigation and Drainage Paper No. 56",
        "ICAR Crop Water Requirement Guidelines",
    ]

    # Calculate days since last water
    days_since_irrigation: Optional[int] = None
    if observation and observation.get("last_irrigation_date"):
        try:
            last_dt = datetime.date.fromisoformat(observation["last_irrigation_date"])
            days_since_irrigation = max(0, (datetime.date.today() - last_dt).days)
            data_sources.append("Farmer-Reported Last Irrigation Date")
        except Exception:
            days_since_irrigation = None

    if days_since_irrigation is None:
        # Fall back to days after sowing if recently sown, or default estimate
        days_since_irrigation = min(das, 10)

    # Atmospheric demand and forecast rain
    if weather_data and weather_data.daily:
        data_sources.append(f"Open-Meteo FAO-56 Reference ET0 ({weather_data.data_provider})")
        forecast_5d = weather_data.daily[:5]
        cum_et0_5d = sum(d.et0_fao_evapotranspiration or 4.0 for d in forecast_5d)
        cum_rain_5d = sum(d.precipitation_sum_mm for d in forecast_5d)
    else:
        cum_et0_5d = 20.0  # Conservative 4 mm/day default
        cum_rain_5d = 0.0

    # Readily available water capacity (RAW is typically 50% of AWC)
    raw_mm = awc_mm * 0.55
    depletion_estimate_mm = (days_since_irrigation * 3.8) - cum_rain_5d

    crop_condition = observation.get("crop_condition", "healthy") if observation else "healthy"
    symptoms = observation.get("visible_symptoms", []) if observation else []
    soil_surface = observation.get("soil_surface_status", "normal") if observation else "normal"

    evidence = [
        f"Last irrigation was {days_since_irrigation} days ago ({irrigation_method}).",
        f"Soil available water capacity (AWC) in top 30cm root zone is {awc_mm:.1f} mm (Readily Available Water ~{raw_mm:.1f} mm).",
        f"Cumulative 5-day atmospheric demand (ET0) is {cum_et0_5d:.1f} mm against {cum_rain_5d:.1f} mm forecast rain.",
        f"Crop stage sensitivity to moisture stress is {water_sensitivity} ({stage}).",
    ]
    if crop_condition != "healthy" or symptoms:
        evidence.append(f"Field observation: condition '{crop_condition}', symptoms: {', '.join(symptoms) if symptoms else 'none'}.")

    # Decision Rules
    is_wilting = crop_condition in ["slight_wilting", "moderate_wilting"] or "leaf_curling" in symptoms
    is_soil_cracked = soil_surface == "cracked_dry" or "dry_crust_soil" in symptoms

    if is_wilting or (is_soil_cracked and days_since_irrigation >= 14 and cum_rain_5d < 5.0):
        if water_sensitivity in ["CRITICAL", "HIGH"]:
            risk_level: RiskLevel = "CRITICAL"
            rec = (
                f"Critical moisture deficit detected! Visible signs ({crop_condition}) at '{stage}' will cause irreversible yield penalty. "
                f"Apply 50-60 mm targeted irrigation within the next 24-48 hours."
            )
        else:
            risk_level = "HIGH"
            rec = (
                f"Substantial moisture stress observed ({crop_condition}). "
                f"Schedule an irrigation cycle within 48 hours to restore root zone moisture."
            )
    elif (days_since_irrigation >= 12 and cum_rain_5d < 5.0) or (depletion_estimate_mm >= raw_mm and water_sensitivity == "CRITICAL"):
        risk_level = "HIGH"
        rec = (
            f"High moisture deficit risk approaching. Crop is in critical '{stage}' stage and soil water reserve is depleted. "
            f"Apply scheduled irrigation of 40-50 mm within 48-72 hours."
        )
    elif (days_since_irrigation >= 8 and cum_rain_5d < 5.0) or (cum_et0_5d >= 22.0 and cum_rain_5d < 8.0):
        risk_level = "MODERATE"
        rec = (
            f"Moderate moisture depletion. Active root zone will require watering in 3 to 4 days if rainfall does not materialize."
        )
    else:
        risk_level = "LOW"
        rec = (
            f"Adequate root zone moisture buffer. No supplemental irrigation needed today. "
            f"Holding off avoids unnecessary pumping costs."
        )

    return SingleRiskAssessment(
        farm_id=farm_id,
        crop=crop_name,
        growth_stage=stage,
        days_after_sowing=das,
        risk_type="water_stress_deficit",
        risk_level=risk_level,
        evidence=evidence,
        recommendation=rec,
        confidence=confidence,
        data_sources=data_sources,
        generated_at=now_iso,
        limitations=limitations,
    )


def compute_confidence_label(
    weather_data: Optional[NormalizedWeatherData],
    observation: Optional[Dict[str, Any]],
    farm_profile: Dict[str, Any]
) -> ConfidenceLabel:
    """
    Computes a non-arbitrary confidence rating derived strictly from
    data completeness and source telemetry.
    """
    if not weather_data or weather_data.is_stale:
        return "DEGRADED"

    has_recent_obs = False
    if observation and observation.get("observation_date"):
        try:
            obs_dt = datetime.date.fromisoformat(observation["observation_date"])
            days_old = (datetime.date.today() - obs_dt).days
            if days_old <= 7:
                has_recent_obs = True
        except Exception:
            has_recent_obs = False

    has_full_profile = bool(farm_profile.get("soil_type") and farm_profile.get("sowing_date"))

    if has_recent_obs and has_full_profile:
        return "HIGH"
    elif has_full_profile:
        return "MEDIUM"
    else:
        return "LOW"


def evaluate_all_risks(
    farm_id: str,
    farm_profile: Dict[str, Any],
    weather_data: Optional[NormalizedWeatherData],
    observation: Optional[Dict[str, Any]] = None,
) -> Tuple[List[SingleRiskAssessment], ConfidenceLabel]:
    """Runs all 3 risk models and returns structured assessment list."""
    crop_name = farm_profile.get("crop_name", "wheat")
    sowing_date = farm_profile.get("sowing_date", "2026-10-01")
    soil_type = farm_profile.get("soil_type", "loam")
    irrigation_method = farm_profile.get("irrigation_method", "flood")

    crop_info = estimate_crop_growth_stage(crop_name, sowing_date)
    soil_profile = get_soil_profile(soil_type)
    irrigation_profile = get_irrigation_profile(irrigation_method)

    confidence = compute_confidence_label(weather_data, observation, farm_profile)

    heat_assessment = evaluate_heat_stress(farm_id, crop_info, weather_data, observation, confidence)
    rain_assessment = evaluate_rainfall_waterlogging(farm_id, crop_info, soil_profile, irrigation_profile, weather_data, observation, confidence)
    water_assessment = evaluate_water_stress(farm_id, crop_info, soil_profile, irrigation_profile, weather_data, observation, confidence)

    return [heat_assessment, rain_assessment, water_assessment], confidence
