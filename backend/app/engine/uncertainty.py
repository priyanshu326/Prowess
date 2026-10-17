"""
Uncertainty and Confidence Evaluation Engine.
Distinguishes weather forecast decay, agronomic threshold bounds, and missing sensor inputs.
Never misrepresents heuristic decision scores as statistically calibrated probabilities.
"""

from typing import List, Tuple
from ..schemas.sowing import UncertaintyBreakdown


def evaluate_forecast_uncertainty(
    forecast_days_available: int,
    target_offset_days: int,
    missing_variables: List[str],
    is_stale_cache: bool = False
) -> UncertaintyBreakdown:
    """
    Computes a transparent confidence index:
    - Day 0-2 (0-48h): High forecast skill (85-95%)
    - Day 3-5 (48-120h): Moderate forecast skill (65-80%)
    - Day 6-10 (120-240h): Lower skill, synoptic guidance only (45-60%)
    - Day 11+: High climatological uncertainty (<40%)
    """
    if target_offset_days <= 2:
        base_confidence = 90.0
    elif target_offset_days <= 5:
        base_confidence = 75.0
    elif target_offset_days <= 10:
        base_confidence = 55.0
    else:
        base_confidence = 35.0

    # Penalize missing variables (e.g. soil moisture missing defaults to estimate)
    penalty = len(missing_variables) * 6.0
    if is_stale_cache:
        penalty += 15.0

    final_confidence = max(20.0, min(95.0, base_confidence - penalty))

    if final_confidence >= 75.0 and len(missing_variables) <= 1:
        agronomic_conf = "HIGH"
    elif final_confidence >= 50.0:
        agronomic_conf = "MEDIUM"
    elif final_confidence >= 30.0:
        agronomic_conf = "LOW"
    else:
        agronomic_conf = "INSUFFICIENT_DATA"

    return UncertaintyBreakdown(
        forecast_lead_time_days=target_offset_days,
        forecast_confidence_pct=round(final_confidence, 1),
        missing_variables=missing_variables,
        is_stale_data=is_stale_cache,
        agronomic_confidence=agronomic_conf,
    )
