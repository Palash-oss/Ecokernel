"""
Real emission factor calculations using DEFRA 2024, COPERT 5.5, and ISO 14083 / GLEC v3.2 standards.

Sources:
- ISO 14083:2023 Transport Chain Emissions Quantification Standard
- GLEC Framework v3.2 Global Logistics Emissions Council
- DEFRA/DESNZ 2024 Greenhouse Gas Conversion Factors
- COPERT 5.5 speed-dependent fuel consumption methodology
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
    Adjust emissions based on cargo load ratio (ISO 14083 Mass Utilization).
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


def calculate_iso14083_emissions(
    distance_km: float,
    fuel_type: str = "euro6_diesel",
    speed_kmh: float = 50.0,
    gradient_percent: float = 0.0,
    load_tonnes: float = 10.0,
    max_payload_tonnes: float = 16.0,
    idling_hours: float = 0.0,
    is_rail: bool = False,
) -> dict:
    """
    Calculate ISO 14083 / GLEC v3.2 compliant Well-to-Wheel (WTW) emissions.
    
    Returns breakdown dictionary:
    - wtw_co2: Total Well-to-Wheel CO2e (kg)
    - wtt_co2: Well-to-Tank (Upstream energy extraction/refining CO2e)
    - ttw_co2: Tank-to-Wheel (Direct combustion / tailpipe CO2e)
    - load_factor_used: Utilized payload percentage
    - intensity_tkm: Emission intensity per tonne-km (g CO2e/tkm)
    """
    if is_rail:
        # Rail ISO 14083 GLEC default: 7.0 g CO2e/t-km (WTW)
        wtw_intensity = 0.007  # kg CO2e per t-km
        ttw_share = 0.75
        total_wtw = wtw_intensity * distance_km * max(load_tonnes, 1.0)
        ttw = total_wtw * ttw_share
        wtt = total_wtw * (1 - ttw_share)
        return {
            "wtw_co2": round(total_wtw, 3),
            "wtt_co2": round(wtt, 3),
            "ttw_co2": round(ttw, 3),
            "load_factor_used": round(min(load_tonnes / max(max_payload_tonnes, 1.0), 1.0), 2),
            "intensity_tkm": round((total_wtw * 1000.0) / max(distance_km * load_tonnes, 1.0), 2),
        }

    # ISO 14083 Fuel Parameters (WTT, TTW, Density)
    # GLEC v3.2 defaults for Freight
    fuel_specs = {
        "euro6_diesel": {"wtt_kg_l": 0.62, "ttw_kg_l": 2.68, "density": 0.832, "class": "diesel_hgv"},
        "euro4_diesel": {"wtt_kg_l": 0.65, "ttw_kg_l": 2.68, "density": 0.832, "class": "diesel_hgv"},
        "hgv_artic": {"wtt_kg_l": 0.62, "ttw_kg_l": 2.68, "density": 0.832, "class": "diesel_hgv"},
        "petrol": {"wtt_kg_l": 0.58, "ttw_kg_l": 2.31, "density": 0.745, "class": "petrol_lcv"},
        "cng": {"wtt_kg_kg": 0.45, "ttw_kg_kg": 2.55, "density": 1.0, "class": "cng_truck"},
        "electric": {"wtt_kg_kwh": 0.78, "ttw_kg_kwh": 0.0, "density": 1.0, "class": "electric_truck"},
    }

    spec = fuel_specs.get(fuel_type, fuel_specs["euro6_diesel"])

    if fuel_type == "electric":
        # EV grid energy consumption: ~1.1 kWh/km for heavy freight EV
        kwh_per_km = 1.1 * load_factor(load_tonnes, max_payload_tonnes)
        total_kwh = distance_km * kwh_per_km
        wtt_co2 = total_kwh * spec["wtt_kg_kwh"]
        ttw_co2 = 0.0
        wtw_co2 = wtt_co2
        return {
            "wtw_co2": round(wtw_co2, 3),
            "wtt_co2": round(wtt_co2, 3),
            "ttw_co2": round(ttw_co2, 3),
            "load_factor_used": round(min(load_tonnes / max(max_payload_tonnes, 1.0), 1.0), 2),
            "intensity_tkm": round((wtw_co2 * 1000.0) / max(distance_km * load_tonnes, 1.0), 2),
        }

    # COPERT moving fuel consumption (g/km)
    fc_g_km = copert_fuel_consumption(speed_kmh, spec["class"])
    grad_m = gradient_multiplier(gradient_percent)
    load_m = load_factor(load_tonnes, max_payload_tonnes)
    
    adjusted_fc = fc_g_km * grad_m * load_m
    liters_km = (adjusted_fc / 1000.0) / spec["density"]
    moving_liters = liters_km * distance_km

    # Idling dwell-time fuel consumption: 2.2 Liters/hour stationary
    idling_liters = idling_hours * 2.2
    total_liters = moving_liters + idling_liters

    ttw_co2 = total_liters * spec["ttw_kg_l"]
    wtt_co2 = total_liters * spec["wtt_kg_l"]
    wtw_co2 = ttw_co2 + wtt_co2

    tkm = max(distance_km * max(load_tonnes, 0.5), 1.0)
    intensity = (wtw_co2 * 1000.0) / tkm

    return {
        "wtw_co2": round(wtw_co2, 3),
        "wtt_co2": round(wtt_co2, 3),
        "ttw_co2": round(ttw_co2, 3),
        "load_factor_used": round(min(load_tonnes / max(max_payload_tonnes, 1.0), 1.0), 2),
        "intensity_tkm": round(intensity, 2),
    }


def calculate_segment_co2(
    distance_km: float,
    fuel_type: str,
    speed_kmh: float = 50.0,
    gradient_percent: float = 0.0,
    load_tonnes: float = 10.0,
    max_payload_tonnes: float = 16.0,
    is_rail: bool = False,
    include_cold_start: bool = False,
) -> float:
    """
    Backward-compatible method returning direct TTW CO₂ emissions (kg).
    """
    if fuel_type == "electric":
        return 0.0
    iso_res = calculate_iso14083_emissions(
        distance_km=distance_km,
        fuel_type=fuel_type,
        speed_kmh=speed_kmh,
        gradient_percent=gradient_percent,
        load_tonnes=load_tonnes,
        max_payload_tonnes=max_payload_tonnes,
        is_rail=is_rail,
    )
    return iso_res["ttw_co2"]


def calculate_segment_cost(
    distance_km: float,
    mode: str = "road",
    fuel_type: str = "euro6_diesel",
    from_city: str = None,
    to_city: str = None,
    vehicle_type: str = None,
) -> float:
    """
    Calculate transport cost in INR for a segment.
    Applies Real-World Negotiated Contract Rates if a fleet assignment exists
    for this exact corridor and vehicle. Otherwise, calculates dynamic real-world toll/fuel rates.
    """
    if from_city and to_city and vehicle_type:
        from data.database import get_active_contracts_dict
        active_contracts = get_active_contracts_dict()
        key = (from_city.strip().lower(), to_city.strip().lower(), vehicle_type.strip())
        contract_cost = active_contracts.get(key)
        if contract_cost and mode == "road":
            return float(contract_cost)

    from config import TRANSPORT_MODES
    
    mode_data = TRANSPORT_MODES.get(mode, TRANSPORT_MODES["road"])
    base_cost = mode_data["cost_per_km"] * distance_km
    
    if mode == "road":
        toll = 2.5 * distance_km
        base_cost += toll
    
    return round(base_cost, 2)

