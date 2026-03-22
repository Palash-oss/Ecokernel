"""
Real emission factor calculations using DEFRA 2024 and COPERT models.

Sources:
- DEFRA/DESNZ 2024 Greenhouse Gas Conversion Factors
- COPERT speed-dependent fuel consumption methodology
"""

import math
from config import (
    DEFRA_EMISSION_FACTORS,
    COPERT_COEFFICIENTS,
    GRADIENT_EMISSION_FACTOR,
    EMPTY_LOAD_RATIO,
)


def copert_fuel_consumption(speed_kmh: float, vehicle_class: str = "diesel_hgv") -> float:
    """
    COPERT speed-dependent fuel consumption in g/km.
    
    FC(v) = a + b*v + c*v² + d/v
    
    Emissions increase at:
    - Low speed (congestion/idling) due to d/v term
    - Very high speed due to c*v² term
    - Optimal around 50-70 km/h
    """
    coeffs = COPERT_COEFFICIENTS.get(vehicle_class, COPERT_COEFFICIENTS["diesel_hgv"])
    v = max(speed_kmh, 5.0)  # Avoid division by zero
    
    fc = (
        coeffs["a"]
        + coeffs["b"] * v
        + coeffs["c"] * v ** 2
        + coeffs["d"] / v
    )
    return max(fc, 50.0)  # Minimum 50 g/km


def copert_speed_multiplier(speed_kmh: float, vehicle_class: str = "diesel_hgv") -> float:
    """
    Returns a multiplier (0.7 - 2.5) representing how much speed 
    affects emissions relative to optimal speed (~60 km/h).
    """
    optimal_speed = 60.0
    fc_actual = copert_fuel_consumption(speed_kmh, vehicle_class)
    fc_optimal = copert_fuel_consumption(optimal_speed, vehicle_class)
    return fc_actual / fc_optimal


def gradient_multiplier(gradient_percent: float) -> float:
    """
    Adjust emissions based on road gradient.
    +2% emission increase per 1% uphill grade.
    Downhill gets a small benefit (max 15% reduction).
    """
    if gradient_percent >= 0:
        return 1.0 + (GRADIENT_EMISSION_FACTOR * gradient_percent)
    else:
        return max(0.85, 1.0 + (GRADIENT_EMISSION_FACTOR * gradient_percent * 0.5))


def load_factor(load_tonnes: float, max_payload_tonnes: float) -> float:
    """
    Adjust emissions based on cargo load.
    Empty truck emits ~60% of a fully loaded truck.
    """
    if max_payload_tonnes <= 0:
        return 1.0
    load_ratio = min(load_tonnes / max_payload_tonnes, 1.0)
    return EMPTY_LOAD_RATIO + (1.0 - EMPTY_LOAD_RATIO) * load_ratio


def cold_start_penalty(distance_km: float) -> float:
    """
    Cold-start emissions penalty for short trips.
    +20% for first 5 km, decreasing linearly.
    """
    if distance_km <= 5.0:
        return 1.2
    elif distance_km <= 20.0:
        return 1.0 + 0.2 * (20.0 - distance_km) / 15.0
    return 1.0


def calculate_segment_co2(
    distance_km: float,
    fuel_type: str,
    speed_kmh: float = 50.0,
    gradient_percent: float = 0.0,
    load_tonnes: float = 10.0,
    max_payload_tonnes: float = 16.0,
    is_rail: bool = False,
) -> float:
    """
    Calculate CO₂ emissions (kg) for a route segment using real models.
    
    Formula:
    CO₂ = base_factor × distance × speed_multiplier × gradient_mult × load_mult × cold_start
    
    For rail: CO₂ = rail_factor × distance × load_tonnes
    """
    if is_rail:
        # Rail freight: ~0.005 kg CO₂ per tonne-km (Indian Railways avg)
        # This is significantly lower than road transport
        rail_factor = 0.005
        return round(rail_factor * distance_km * load_tonnes, 3)
    
    base_factor = DEFRA_EMISSION_FACTORS.get(fuel_type, 0.168)
    
    if fuel_type == "electric":
        # EV: zero direct, but can account for grid emissions later
        return 0.0
    
    # Determine COPERT vehicle class
    if fuel_type in ("euro6_diesel", "euro4_diesel", "hgv_artic", "hgv_rigid"):
        vehicle_class = "diesel_hgv"
    elif fuel_type == "petrol":
        vehicle_class = "petrol_lcv"
    elif fuel_type == "cng":
        vehicle_class = "cng_truck"
    else:
        vehicle_class = "diesel_hgv"
    
    speed_mult = copert_speed_multiplier(speed_kmh, vehicle_class)
    grad_mult = gradient_multiplier(gradient_percent)
    load_mult = load_factor(load_tonnes, max_payload_tonnes)
    cold_mult = cold_start_penalty(distance_km)
    
    co2 = base_factor * distance_km * speed_mult * grad_mult * load_mult * cold_mult
    return round(co2, 3)


def calculate_segment_cost(
    distance_km: float,
    mode: str = "road",
    fuel_type: str = "euro6_diesel",
) -> float:
    """
    Calculate transport cost in INR for a segment.
    Uses real Indian trucking/rail rates.
    """
    from config import TRANSPORT_MODES
    
    mode_data = TRANSPORT_MODES.get(mode, TRANSPORT_MODES["road"])
    base_cost = mode_data["cost_per_km"] * distance_km
    
    # Toll approximation: ₹2.5/km on national highways
    if mode == "road":
        toll = 2.5 * distance_km
        base_cost += toll
    
    return round(base_cost, 2)
