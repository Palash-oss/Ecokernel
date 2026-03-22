"""
UK Carbon Intensity API client.

Free, no API key required.
Source: https://carbonintensity.org.uk (NESO / Oxford / WWF)

Used to dynamically adjust EV "green score" based on how clean
the electricity grid is at the time of charging.
"""

import httpx
from typing import Optional
from config import CARBON_INTENSITY_API_URL


_cache: Optional[dict] = None


async def get_current_intensity() -> dict:
    """
    Fetch real-time carbon intensity of the GB electricity grid.
    
    Returns: {
        "intensity": float (gCO2/kWh),
        "index": str ("very low" | "low" | "moderate" | "high" | "very high"),
        "forecast": float,
        "timestamp": str,
    }
    """
    global _cache
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{CARBON_INTENSITY_API_URL}/intensity")
            response.raise_for_status()
            data = response.json()
            
            intensity_data = data["data"][0]
            result = {
                "intensity": intensity_data["intensity"]["actual"] or intensity_data["intensity"]["forecast"],
                "index": intensity_data["intensity"]["index"],
                "forecast": intensity_data["intensity"]["forecast"],
                "timestamp": intensity_data["from"],
            }
            _cache = result
            return result
    except Exception:
        # Return cached or default values
        if _cache:
            return _cache
        return {
            "intensity": 200.0,  # UK average ~200 gCO2/kWh
            "index": "moderate",
            "forecast": 200.0,
            "timestamp": "unavailable",
        }


def ev_grid_emission_factor(intensity_gco2_kwh: float, efficiency_kwh_per_km: float = 0.15) -> float:
    """
    Calculate effective EV emission factor based on grid carbon intensity.
    
    Args:
        intensity_gco2_kwh: Grid carbon intensity in gCO2/kWh
        efficiency_kwh_per_km: EV energy consumption (default 0.15 kWh/km for light EV)
    
    Returns:
        Effective emission in kg CO₂/km
    """
    return (intensity_gco2_kwh * efficiency_kwh_per_km) / 1000.0
