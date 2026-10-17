"""
SmartKisan Multilingual & AI Explanation Layer.
Provides simple, clear Hindi and English explanations of validated agronomic advice.
Features:
1. Deterministic multilingual template engine (always available, zero external dependency).
2. Optional Gemini API integration via secure httpx async client with strict safety prompts:
   - Must NOT invent fake weather observations
   - Must NOT prescribe unsupported toxic chemical pesticide dosages
   - Must NOT override the deterministic risk engine
3. Graceful fallback when Gemini is unavailable, offline, or unconfigured.
"""

import os
import logging
from typing import Dict, List, Optional, Any
import httpx
from ..config import settings
from ..schemas.smartkisan import SingleRiskAssessment, ActionableRecommendation

logger = logging.getLogger(__name__)


def generate_deterministic_explanation(
    crop_name: str,
    growth_stage: str,
    risk_assessments: List[SingleRiskAssessment],
    recommendations: List[ActionableRecommendation],
) -> Dict[str, str]:
    """Generates guaranteed, high-quality agronomic summaries in Hindi and English."""
    highest_risk = "LOW"
    for r in risk_assessments:
        if r.risk_level == "CRITICAL":
            highest_risk = "CRITICAL"
            break
        elif r.risk_level == "HIGH" and highest_risk != "CRITICAL":
            highest_risk = "HIGH"
        elif r.risk_level == "MODERATE" and highest_risk not in ["CRITICAL", "HIGH"]:
            highest_risk = "MODERATE"

    top_rec = recommendations[0] if recommendations else None

    # Hindi summary
    if highest_risk == "CRITICAL":
        hi_summary = (
            f"किसान भाई, आपकी {crop_name} की फसल ({growth_stage}) में अति संवेदनशील जोखिम पाया गया है। "
            f"मुख्य सलाह: {top_rec.action_hi if top_rec else 'खेत की निगरानी करें'}। "
            f"समय सीमा: {top_rec.timing_window if top_rec else 'तुरंत'}। इससे आपकी फसल सुरक्षित रहेगी।"
        )
    elif highest_risk == "HIGH":
        hi_summary = (
            f"किसान भाई, आपकी {crop_name} की फसल ({growth_stage}) के लिए सावधानी बरतने का समय है। "
            f"प्रमुख कदम: {top_rec.action_hi if top_rec else 'समय पर पानी दें'}। "
            f"अनावश्यक नलकूप चलाने से बचें और प्राकृतिक मौसम का लाभ उठाएं।"
        )
    elif highest_risk == "MODERATE":
        hi_summary = (
            f"किसान भाई, मौसम सामान्य से थोड़ा गर्म या नम रह सकता है। "
            f"सलाह: {top_rec.action_hi if top_rec else 'खेत का निरीक्षण करें'}। फसल की स्थिति संतोषजनक है।"
        )
    else:
        hi_summary = (
            f"किसान भाई, मौसम पूरी तरह अनुकूल है और {crop_name} की बढ़वार सामान्य है। "
            f"सलाह: {top_rec.action_hi if top_rec else 'सामान्य देखभाल जारी रखें'}। आज अतिरिक्त सिंचाई की जरूरत नहीं है।"
        )

    # English summary
    if highest_risk in ["CRITICAL", "HIGH"]:
        en_summary = (
            f"Attention Farmer: Critical/High agronomic risk detected for your {crop_name} at {growth_stage}. "
            f"Key Action: {top_rec.action_en if top_rec else 'Inspect field'}. Timing: {top_rec.timing_window if top_rec else 'Immediate'}. "
            f"Expected Impact: {top_rec.cost_or_resource_impact if top_rec else 'Protects crop yield'}."
        )
    else:
        en_summary = (
            f"Crop status favorable for {crop_name} at {growth_stage}. "
            f"Key Recommendation: {top_rec.action_en if top_rec else 'Continue routine monitoring'}. "
            f"Root-zone conditions remain within safe agronomic parameters."
        )

    return {
        "hi": hi_summary,
        "en": en_summary,
    }


async def generate_gemini_explanation(
    farm_id: str,
    crop_name: str,
    growth_stage: str,
    risk_assessments: List[SingleRiskAssessment],
    recommendations: List[ActionableRecommendation],
    lang: str = "hi",
) -> Optional[str]:
    """
    Calls Gemini API to explain the validated recommendations in simple,
    warm, farmer-friendly colloquial language.
    Strictly constrained by validated facts.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        return None

    # Construct strict factual prompt
    risks_text = "\n".join([
        f"- {r.risk_type.upper()} ({r.risk_level}): Evidence: {'; '.join(r.evidence)} -> Recommendation: {r.recommendation}"
        for r in risk_assessments
    ])

    recs_text = "\n".join([
        f"- Priority {rec.priority}: {rec.title_en} / {rec.title_hi}. Action: {rec.action_en} ({rec.timing_window}). Impact: {rec.cost_or_resource_impact}"
        for rec in recommendations
    ])

    language_instruction = (
        "Explain in very simple, respectful, spoken Hindi (खड़ी बोली/ग्रामीण संदर्भ जैसे 'राम-राम किसान भाई') using Devanagari script."
        if lang == "hi"
        else "Explain in simple, clear, encouraging English that any farmer or field extension worker can immediately understand."
    )

    system_prompt = f"""
You are SmartKisan's Voice Advisory Assistant speaking directly to an Indian smallholder farmer.
Target Crop: {crop_name}
Growth Stage: {growth_stage}

VALIDATED RISK FINDINGS (Do not alter or fabricate):
{risks_text}

VALIDATED ACTION RECOMMENDATIONS:
{recs_text}

CRITICAL AGRONOMIC SAFETY RULES:
1. NEVER invent imaginary weather, rain dates, or fake sensor moisture numbers.
2. NEVER prescribe chemical pesticides, fungicides, or synthetic drugs dosages directly. Always mention consulting local KVK for any chemical spray needs.
3. Keep the tone warm, clear, and reassuring. Keep it concise (3-4 short sentences).
4. Clearly state what the farmer should do TODAY and what can be DELAYED to save diesel or water.
5. {language_instruction}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": system_prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 300,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
                if text:
                    return text.strip()
            else:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.warning(f"Gemini explanation call failed gracefully: {e}")

    return None
