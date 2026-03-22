"""
Green Score Calculator.

Converts raw CO₂ emissions into a 0-100 "Green Score" that's
intuitive for the user. Uses real emission models as baseline.
"""

from data.emission_factors import calculate_segment_co2
from config import DEFRA_EMISSION_FACTORS


def calculate_green_score(
    total_co2_kg: float,
    total_distance_km: float,
    vehicle_fuel_type: str = "euro6_diesel",
) -> float:
    """
    Calculate a 0-100 Green Score for a route.
    
    100 = zero emissions (best)
    0   = worst-case emissions (all diesel, congested, uphill)
    
    Method:
    1. Calculate worst-case CO₂ for same distance (Euro 4 diesel, congestion, uphill)
    2. Calculate best-case CO₂ (electric / rail)
    3. Score = 100 × (1 - (actual - best) / (worst - best))
    """
    if total_distance_km <= 0:
        return 100.0
    
    # Worst case: old diesel, heavy traffic (2x speed penalty), uphill
    worst_factor = DEFRA_EMISSION_FACTORS["euro4_diesel"]
    worst_co2 = worst_factor * total_distance_km * 2.0 * 1.07  # congestion × gradient
    
    # Best case: electric (0 direct)
    best_co2 = 0.0
    
    if worst_co2 <= best_co2:
        return 100.0
    
    # Normalize to 0-100
    score = 100.0 * (1.0 - (total_co2_kg - best_co2) / (worst_co2 - best_co2))
    return round(max(0.0, min(100.0, score)), 1)


def green_score_breakdown(
    segments: list,
    vehicle_fuel_type: str,
) -> dict:
    """
    Detailed green score with breakdown by category.
    
    Returns:
    {
        "overall_score": float,
        "emission_rating": str,
        "breakdown": {
            "base_emissions": float,     # From fuel type
            "congestion_penalty": float, # From traffic/speed
            "gradient_impact": float,    # From terrain
            "modal_bonus": float,        # From rail usage
        }
    }
    """
    total_co2 = sum(s.get("co2_kg", 0) for s in segments)
    total_km = sum(s.get("distance_km", 0) for s in segments)
    rail_km = sum(s.get("distance_km", 0) for s in segments if s.get("mode") == "rail")
    
    score = calculate_green_score(total_co2, total_km, vehicle_fuel_type)
    
    # Emission intensity rating
    if total_km > 0:
        intensity = total_co2 / total_km
    else:
        intensity = 0
    
    if intensity < 0.05:
        rating = "Excellent"
    elif intensity < 0.1:
        rating = "Very Good"
    elif intensity < 0.15:
        rating = "Good"
    elif intensity < 0.2:
        rating = "Average"
    elif intensity < 0.3:
        rating = "Below Average"
    else:
        rating = "Poor"
    
    modal_bonus = (rail_km / total_km * 20) if total_km > 0 else 0
    
    return {
        "overall_score": score,
        "emission_rating": rating,
        "co2_per_km": round(intensity, 4),
        "breakdown": {
            "base_emissions_kg": round(total_co2, 2),
            "rail_percentage": round((rail_km / total_km * 100) if total_km > 0 else 0, 1),
            "modal_bonus_points": round(modal_bonus, 1),
        },
    }
