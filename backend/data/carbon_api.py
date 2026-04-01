"""
Indian Grid Carbon Intensity Simulator.

Simulates dynamic grid carbon intensity based on time of day.
India's average grid intensity is ~714 gCO2/kWh (CEA - Central Electricity Authority).
"""

from datetime import datetime
from typing import Optional

_cache: Optional[dict] = None


async def get_current_intensity() -> dict:
    """
    Fetch simulated real-time carbon intensity of the Indian electricity grid.
    
    Returns: {
        "intensity": float (gCO2/kWh),
        "index": str ("moderate" | "high" | "very high"),
        "forecast": float,
        "timestamp": str,
    }
    """
    global _cache
    
    now = datetime.now()
    hour = now.hour
    
    # India average baseline: ~714 gCO2/kWh
    base_intensity = 714.0
    
    # Simulate variations: higher solar during the day, peak coal in the evening
    if 10 <= hour <= 16:
        intensity = base_intensity - 45.0
        index_str = "moderate"
    elif 18 <= hour <= 22:
        intensity = base_intensity + 65.0
        index_str = "very high"
    else:
        intensity = base_intensity + 15.0
        index_str = "high"
        
    # Add micro-fluctuations based on the minute to make it feel "live"
    intensity += (now.minute % 15) - 7.5

    result = {
        "intensity": round(intensity, 1),
        "index": index_str,
        "forecast": round(intensity + (now.minute % 5), 1),
        "timestamp": now.isoformat() + "Z",
    }
    
    _cache = result
    return result


def ev_grid_emission_factor(intensity_gco2_kwh: float, efficiency_kwh_per_km: float = 0.15) -> float:
    """
    Calculate effective EV emission factor based on grid carbon intensity.
    
    Args:
        intensity_gco2_kwh: Grid carbon intensity in gCO2/kWh
        efficiency_kwh_per_km: EV energy consumption (default 0.15 kWh/km)
    
    Returns:
        Effective emission in kg CO₂/km
    """
    return (intensity_gco2_kwh * efficiency_kwh_per_km) / 1000.0
