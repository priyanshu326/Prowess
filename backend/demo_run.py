#!/usr/bin/env python3
"""
Interactive Demonstration Script for IIT Delhi Hackathon Evaluation.
Problem 2.1 — Uncertain Sowing and Harvesting Risk Intelligence Platform.

Runs:
1. Sowing Risk Analysis (Rabi Wheat — Optimal vs Unseasonal Rain Deluge)
2. Harvest Risk Intelligence (Kharif Paddy — Immature Protection vs Wet Mold Risk)
3. What-If Scenario Simulation (Today vs Day +3 vs Day +5)
4. Farmer Ground-Truth Feedback & SQLite Persistence
5. Historical ML Verification Metrics (Brier Score, Recall, Lead Time)
"""

import sys
import os
import asyncio
import json

# Ensure app package is importable from backend directory
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.crops.config import get_crop_config
from app.weather.mock_provider import MockWeatherProvider
from app.weather.open_meteo import OpenMeteoWeatherProvider
from app.engine.sowing_engine import analyze_sowing_risk
from app.engine.harvest_engine import analyze_harvest_risk
from app.engine.whatif_engine import analyze_what_if_scenarios
from app.schemas.sowing import SowingAnalysisRequest
from app.schemas.harvest import HarvestAnalysisRequest
from app.schemas.whatif import WhatIfAnalysisRequest
from app.schemas.feedback import FarmerFeedbackCreate
from app.db.session import init_db, SessionLocal
from app.db.repository import save_farmer_feedback, get_field_history
from app.evaluation.ml_evaluation import evaluate_decision_history


def banner(title: str):
    print("\n" + "=" * 80)
    print(f"  {title.upper()}")
    print("=" * 80)


async def run_demo():
    print("\n🌱 KISAAN SATHI — AI-POWERED SOWING & HARVESTING RISK INTELLIGENCE")
    print("   IIT Delhi Hackathon Solution | Problem 2.1 Demonstration")
    print("   Platform: Zero-field-hardware, Explainable Agronomic Decision Support")

    # Initialize SQLite database
    init_db()

    # -------------------------------------------------------------
    # CASE 1: SOWING RISK ANALYSIS (Wheat in Karnal, Haryana)
    # -------------------------------------------------------------
    banner("Demo Case 1: Sowing Risk Intelligence (Rabi Wheat)")
    wheat = get_crop_config("wheat")
    assert wheat is not None

    print(f"📍 Location: Karnal, Haryana (29.6857° N, 76.9905° E)")
    print(f"🌾 Crop: {wheat.name_en} ({wheat.name_hi}) | Season: {wheat.season}")
    print(f"🔬 Provenance: {wheat.provenance.source}")

    # Sub-case 1A: Clear/Favorable Weather
    provider_dry = MockWeatherProvider(scenario="optimal")
    weather_dry = await provider_dry.get_forecast(29.6857, 76.9905, 14)
    sow_req_dry = SowingAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="wheat",
        current_crop_stage="sowing",
        irrigation_availability=True,
    )
    res_dry = analyze_sowing_risk(sow_req_dry, weather_dry, wheat)
    print("\n[Scenario A: Clear Weather Forecast]")
    print(f"  Recommended Action : {res_dry.recommended_action}")
    print(f"  Sowing Safety Score: {res_dry.sowing_safety_score}/100 (Risk: {res_dry.risk_score} - {res_dry.risk_category})")
    print(f"  Seed Washout Risk  : {res_dry.seed_washout_rot_risk.washout_probability_pct}%")
    print(f"  Advice (English)   : {res_dry.explanation_en}")
    print(f"  सलाह (हिंदी)        : {res_dry.explanation_hi}")

    # Sub-case 1B: Heavy Rain Downpour (Simulated 45mm storm post-sowing)
    provider_rain = MockWeatherProvider(scenario="heavy_rain")
    weather_rain = await provider_rain.get_forecast(29.6857, 76.9905, 14)
    res_rain = analyze_sowing_risk(sow_req_dry, weather_rain, wheat)
    print("\n[Scenario B: Unseasonal 45mm Rain Deluge Forecast]")
    print(f"  Recommended Action : ⚠️  {res_rain.recommended_action}")
    print(f"  Sowing Safety Score: {res_rain.sowing_safety_score}/100 (Risk: {res_rain.risk_score} - {res_rain.risk_category})")
    print(f"  Seed Washout Risk  : {res_rain.seed_washout_rot_risk.washout_probability_pct}% (Seed Rot: {res_rain.seed_washout_rot_risk.rot_probability_pct}%)")
    print(f"  Resowing Cost Risk : ₹{res_rain.seed_washout_rot_risk.estimated_resowing_cost_inr_per_acre:.0f}/acre")
    print(f"  Advice (English)   : {res_rain.explanation_en}")
    print(f"  सलाह (हिंदी)        : {res_rain.explanation_hi}")
    print(f"  Ranked Safe Window : {res_rain.candidate_windows[0].start_date} to {res_rain.candidate_windows[0].end_date} (Suitability: {res_rain.candidate_windows[0].suitability_score}%)")

    # -------------------------------------------------------------
    # CASE 2: HARVEST RISK INTELLIGENCE (Paddy / Rice)
    # -------------------------------------------------------------
    banner("Demo Case 2: Harvest Risk Intelligence & Maturity Safeguards")
    rice = get_crop_config("rice")
    assert rice is not None

    print(f"🌾 Crop: {rice.name_en} ({rice.name_hi}) | Safe storage grain moisture: <{rice.harvesting.safe_grain_moisture_max_pct}%")

    # Sub-case 2A: Immature Crop (Early harvest prevented)
    harv_req_immature = HarvestAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="rice",
        current_crop_stage="flowering",  # Immature
    )
    res_immature = analyze_harvest_risk(harv_req_immature, weather_rain, rice)
    print("\n[Scenario A: Immature Crop Test (Flowering Stage)]")
    print(f"  Crop Mature?       : {res_immature.is_crop_mature}")
    print(f"  Action Taken       : 🛑 {res_immature.recommended_action} (Prevented early harvest!)")
    print(f"  Agronomic Warning  : {res_immature.maturity_warning}")
    print(f"  सलाह (हिंदी)        : {res_immature.explanation_hi}")

    # Sub-case 2B: Mature Crop Facing Wet Rainstorm
    harv_req_mature = HarvestAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="rice",
        current_crop_stage="harvest_ready",
    )
    res_mature_rain = analyze_harvest_risk(harv_req_mature, weather_rain, rice)
    print("\n[Scenario B: Mature Crop Facing Rainstorm & High Humidity]")
    print(f"  Action Taken       : ⏳ {res_mature_rain.recommended_action}")
    print(f"  Harvest Safety     : {res_mature_rain.harvest_safety_score}/100 (Risk: {res_mature_rain.risk_score})")
    print(f"  Expected Grain RH  : {res_mature_rain.grain_quality_risk.expected_grain_moisture_pct}% (Limit: {res_mature_rain.grain_quality_risk.safe_storage_moisture_limit_pct}%)")
    print(f"  Mold Risk          : {res_mature_rain.grain_quality_risk.mold_and_discoloration_risk}")
    print(f"  Est. Mandi Discount: ₹{res_mature_rain.grain_quality_risk.estimated_mandi_discount_inr_per_quintal:.0f} per quintal if cut wet")
    print(f"  Combine Machinery  : {res_mature_rain.field_access_risk.machinery_trafficability}")
    print(f"  सलाह (हिंदी)        : {res_mature_rain.explanation_hi}")

    # -------------------------------------------------------------
    # CASE 3: WHAT-IF ANALYSIS (Today vs Day 3 vs Day 5)
    # -------------------------------------------------------------
    banner("Demo Case 3: What-If Decision Simulation")
    whatif_req = WhatIfAnalysisRequest(
        latitude=29.6857,
        longitude=76.9905,
        crop_name="wheat",
        decision_mode="sowing",
        candidate_offsets_days=[0, 3, 5],
    )
    whatif_res = analyze_what_if_scenarios(whatif_req, weather_rain, wheat)
    print(f"Decision Mode: {whatif_res.decision_mode.upper()} for {whatif_res.crop_name}")
    print(f"Recommended Decision: Wait {whatif_res.recommended_offset_days} Days (Optimal Date: {whatif_res.optimal_date})")
    print("\nOffset Comparison Table:")
    print(f"  {'Offset':<8} {'Target Date':<14} {'Safety':<10} {'Rain(72h)':<12} {'Trade-off (Hindi)':<40}")
    print("  " + "-" * 75)
    for s in whatif_res.scenarios:
        print(f"  {f'+{s.offset_days} Days':<8} {s.target_date:<14} {f'{s.safety_score}/100':<10} {f'{s.forecast_rain_window_mm} mm':<12} {s.primary_tradeoff_hi}")
    print(f"\nRationale (EN): {whatif_res.decision_rationale_en}")
    print(f"कारण (HI)    : {whatif_res.decision_rationale_hi}")

    # -------------------------------------------------------------
    # CASE 4: FARMER FEEDBACK & AUDIT PERSISTENCE (SQLite)
    # -------------------------------------------------------------
    banner("Demo Case 4: Farmer Ground-Truth Feedback & SQLite Persistence")
    db = SessionLocal()
    try:
        feedback = FarmerFeedbackCreate(
            field_id="karnal-kunjpura-plot-12",
            crop_name="wheat",
            decision_mode="sowing",
            recommended_action_was="WAIT",
            actual_action_taken="WAITED_3_DAYS",
            actual_date="2026-10-18",
            actual_outcome_status="EXCELLENT_GERMINATION",
            seed_washout_occurred=False,
            grain_quality_satisfactory=True,
            farmer_comments="सलाह मानकर 3 दिन रुके, 45 मिमी बारिश निकल गई और हमारे ₹12,000 के बीज बच गए।",
        )
        rec = save_farmer_feedback(db, feedback)
        print(f"✅ Stored feedback record #{rec.id} for Field: '{rec.field_id}'")

        history = get_field_history(db, "karnal-kunjpura-plot-12")
        print(f"Audit Trail for '{history['field_id']}': {len(history['feedbacks'])} farmer feedback records stored.")
        print(f"Latest Farmer Note: {history['feedbacks'][0]['comments']}")
    finally:
        db.close()

    # -------------------------------------------------------------
    # CASE 5: ML HISTORICAL VALIDATION REPORT
    # -------------------------------------------------------------
    banner("Demo Case 5: ML Historical Validation & Zero-Leakage Verification")
    sample_eval_set = [
        {"crop_name": "wheat", "region": "North-West Plains", "lead_time_days": 2, "predicted_risk_prob": 0.85, "recommended_action": "WAIT", "actual_heavy_rain_occurred": True, "actual_washout_occurred": True},
        {"crop_name": "wheat", "region": "North-West Plains", "lead_time_days": 2, "predicted_risk_prob": 0.15, "recommended_action": "SOW_NOW", "actual_heavy_rain_occurred": False, "actual_washout_occurred": False},
        {"crop_name": "wheat", "region": "North-West Plains", "lead_time_days": 1, "predicted_risk_prob": 0.12, "recommended_action": "SOW_NOW", "actual_heavy_rain_occurred": False, "actual_washout_occurred": False},
        {"crop_name": "rice", "region": "Indo-Gangetic Plain", "lead_time_days": 3, "predicted_risk_prob": 0.80, "recommended_action": "WAIT_FOR_DRY_WINDOW", "actual_heavy_rain_occurred": True, "actual_washout_occurred": False},
        {"crop_name": "rice", "region": "Indo-Gangetic Plain", "lead_time_days": 1, "predicted_risk_prob": 0.20, "recommended_action": "HARVEST_IF_MATURE", "actual_heavy_rain_occurred": False, "actual_washout_occurred": False},
        {"crop_name": "mustard", "region": "Rajasthan/Haryana", "lead_time_days": 2, "predicted_risk_prob": 0.88, "recommended_action": "WAIT", "actual_heavy_rain_occurred": True, "actual_washout_occurred": True},
    ]

    report = evaluate_decision_history(sample_eval_set)
    print(f"Total Evaluated Decisions : {report.total_evaluations}")
    print(f"Heavy Rain Event Recall   : {report.heavy_rain_recall_pct}% (Sensitivity to washout storms)")
    print(f"False Alarm Rate (FAR)    : {report.false_alarm_rate_pct}%")
    print(f"Brier Score Calibration   : {report.brier_score} (0.00 = perfect probabilistic score)")
    print(f"Mean Lead Time            : {report.mean_lead_time_days} days")
    print(f"Leakage Safeguard         : {report.data_leakage_safeguard}")

    banner("All Demonstration Cases Successfully Completed ✅")


if __name__ == "__main__":
    asyncio.run(run_demo())
