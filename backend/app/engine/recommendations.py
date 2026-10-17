"""
SmartKisan Actionable Recommendations Engine.
Transforms validated risk assessments into prioritized, timed, and cost-quantified
agronomic recommendations with bilingual English/Hindi output.
"""

from typing import List, Dict, Any
from ..schemas.smartkisan import ActionableRecommendation, SingleRiskAssessment


def generate_actionable_recommendations(
    farm_id: str,
    farm_profile: Dict[str, Any],
    risk_assessments: List[SingleRiskAssessment],
) -> List[ActionableRecommendation]:
    """Generates prioritized, explainable advice based on evaluated risks."""
    recs: List[ActionableRecommendation] = []
    crop_name = farm_profile.get("crop_name", "wheat")

    # Map by risk type
    heat = next((r for r in risk_assessments if r.risk_type == "heat_stress"), None)
    rain = next((r for r in risk_assessments if r.risk_type == "rainfall_waterlogging"), None)
    water = next((r for r in risk_assessments if r.risk_type == "water_stress_deficit"), None)

    # 1. Drainage / Deluge Safety (Priority 1 if rain is CRITICAL or HIGH)
    if rain and rain.risk_level in ["CRITICAL", "HIGH"]:
        recs.append(
            ActionableRecommendation(
                id=f"{farm_id}_rec_drainage_01",
                priority=1,
                category="drainage",
                title_en="Open Field Bunds & Clear Drainage Channels",
                title_hi="खेत की मेड़ें खोलें व निकास नाली साफ करें",
                action_en="Clear all main drainage furrows and ensure standing rainwater can exit the plot within 6 hours of downpour.",
                action_hi="खेत के मुख्य निकास रास्तों को तुरंत साफ करें ताकि भारी बारिश का पानी 6 घंटे के भीतर खेत से बाहर निकल सके।",
                timing_window="Within next 12-24 hours before forecast rain",
                why=f"Heavy rain on this soil type causes rapid waterlogging and root oxygen starvation at {rain.growth_stage}.",
                cost_or_resource_impact="Prevents total crop loss from water stagnation; saves ~₹8,000 to ₹12,000/acre in re-sowing costs.",
                scientific_basis="Anaerobic root zone conditions induce ethylene spike and root decay within 24-36 hours of submersion.",
            )
        )

    # 2. Irrigation Scheduling (Priority 1 if Water Deficit is CRITICAL, or holding off if rain coming)
    if rain and rain.risk_level in ["CRITICAL", "HIGH", "MODERATE"]:
        recs.append(
            ActionableRecommendation(
                id=f"{farm_id}_rec_irrigation_hold",
                priority=1 if rain.risk_level in ["CRITICAL", "HIGH"] else 2,
                category="irrigation",
                title_en="Postpone Scheduled Irrigation",
                title_hi="सिंचाई कार्य 48-72 घंटे स्थगित रखें",
                action_en="Do not start tubewell or canal irrigation. Allow upcoming rainfall to replenish soil moisture naturally.",
                action_hi="नलकूप या नहर से पानी न चलाएं। आने वाली बारिश से जमीन में नमी की पूर्ति होने दें।",
                timing_window="Hold for next 3 to 4 days",
                why=f"Forecast rain is adequate to fulfill atmospheric crop demand without supplemental pumping.",
                cost_or_resource_impact="Saves 4 hours of diesel tubewell running (~₹350-₹450 diesel saved) and conserves ~25,000 liters of groundwater.",
                scientific_basis="FAO-56 Soil Water Balance: Effective rainfall exceeds deficit depletion; pre-rain irrigation induces nutrient leaching.",
            )
        )
    elif water and water.risk_level in ["CRITICAL", "HIGH"]:
        recs.append(
            ActionableRecommendation(
                id=f"{farm_id}_rec_irrigation_apply",
                priority=1 if water.risk_level == "CRITICAL" else 2,
                category="irrigation",
                title_en="Apply Timed Root-Zone Irrigation",
                title_hi="समय पर संतुलित सिंचाई करें",
                action_en="Schedule a light 4-5 cm irrigation cycle. Avoid excessive ponding.",
                action_hi="4 से 5 सेमी की हल्की सिंचाई करें। खेत में अत्यधिक पानी जमा न होने दें।",
                timing_window="Within next 24 to 48 hours",
                why=f"Active root zone has exhausted readily available water; {water.growth_stage} is a moisture-critical stage.",
                cost_or_resource_impact="Guarantees healthy root and tiller development, preventing 25-35% irreversible yield loss.",
                scientific_basis="ICAR Agronomic Protocol: Moisture stress during critical vegetative transition causes crown root and floret abortion.",
            )
        )

    # 3. Heat Stress Management
    if heat and heat.risk_level in ["CRITICAL", "HIGH"]:
        recs.append(
            ActionableRecommendation(
                id=f"{farm_id}_rec_heat_protect",
                priority=2,
                category="thermal_protection",
                title_en="Alleviate Microclimate Heat Stress",
                title_hi="फसल को लू व अत्यधिक तापमान से बचाएं",
                action_en="Apply light evening sprinkler or furrow wetting to lower canopy temperature. Avoid daytime chemical spraying.",
                action_hi="शाम के समय हल्की सिंचाई करें ताकि मिट्टी ठंडी रहे। दोपहर की तेज धूप में कोई भी छिड़काव न करें।",
                timing_window="During peak daytime temperature forecast",
                why=f"Temperatures exceed {heat.crop} physiological limit ({heat.evidence[1] if len(heat.evidence) > 1 else ''}).",
                cost_or_resource_impact="Prevents forced maturity and grain shriveling, protecting grade-A mandi market value.",
                scientific_basis="Evaporative cooling from evening soil wetting reduces microclimate canopy temp by 2-3°C.",
            )
        )

    # 4. Nutrient & Fertilizer Timing
    if rain and rain.risk_level in ["CRITICAL", "HIGH"]:
        recs.append(
            ActionableRecommendation(
                id=f"{farm_id}_rec_nutrient_delay",
                priority=2,
                category="nutrient_management",
                title_en="Hold Top-Dress Fertilizer Application",
                title_hi="यूरिया / खाद का बुरकाव अभी रोकें",
                action_en="Do not broadcast urea or soluble nitrogen before heavy showers.",
                action_hi="बारिश से ठीक पहले यूरिया का छिड़काव न करें, अन्यथा खाद बह जाएगी।",
                timing_window="Wait until field dries post-rain",
                why="Downpours dissolve surface nitrogen and wash it into drainage ditches or deep leach it beyond root zone.",
                cost_or_resource_impact="Saves ₹300-₹500 per bag of fertilizer that would otherwise be lost to runoff.",
                scientific_basis="Nitrogen nitrate (NO3-) has zero soil sorption and washes out with rapid percolation water.",
            )
        )
    else:
        # Default routine monitoring recommendation
        recs.append(
            ActionableRecommendation(
                id=f"{farm_id}_rec_routine_check",
                priority=3,
                category="field_monitoring",
                title_en="Regular Field Inspection & Weed Scouting",
                title_hi="खेत का नियमित निरीक्षण व खरपतवार निगरानी",
                action_en="Inspect crop vigor twice weekly and record any symptoms like leaf curling or yellowing in the app.",
                action_hi="सप्ताह में दो बार खेत का जायजा लें और किसी भी पीलेपन या लक्षण को ऐप में दर्ज करें।",
                timing_window="Ongoing routine care",
                why="Keeps the sensorless decision engine accurate with fresh ground-truth observations.",
                cost_or_resource_impact="Early detection reduces pest and weed management costs by up to 40%.",
                scientific_basis="Integrated Pest & Nutrient Management (IPNM) threshold monitoring.",
            )
        )

    # Ensure sorted by priority
    recs.sort(key=lambda r: r.priority)
    return recs
