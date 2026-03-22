"""
OpenRouteService API client for real road distances and route geometry.

Uses the free ORS API (2,000 requests/day) built on OpenStreetMap data.
Results are cached in-memory to avoid hitting rate limits.
"""

import openrouteservice
from typing import Dict, List, Tuple, Optional
from config import ORS_API_KEY, CITIES
import math

# In-memory cache for route results
_route_cache: Dict[str, dict] = {}
_matrix_cache: Optional[dict] = None


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two points (km)."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _road_distance_estimate(straight_km: float) -> float:
    """
    Estimate road distance from straight-line distance.
    Indian roads: ~1.35x detour factor (curvy, indirect routes).
    """
    return straight_km * 1.35


def _get_client() -> Optional[openrouteservice.Client]:
    """Get ORS client if API key is configured."""
    if ORS_API_KEY and ORS_API_KEY != "your_api_key_here":
        try:
            return openrouteservice.Client(key=ORS_API_KEY)
        except Exception:
            return None
    return None


def get_route(origin: str, destination: str) -> dict:
    """
    Get real route between two cities.
    
    Returns: {
        "distance_km": float,
        "time_minutes": float,
        "geometry": [[lng, lat], ...],
        "source": "ors" | "estimate"
    }
    """
    cache_key = f"{origin}->{destination}"
    if cache_key in _route_cache:
        return _route_cache[cache_key]
    
    origin_data = CITIES.get(origin)
    destination_data = CITIES.get(destination)
    
    if not origin_data or not destination_data:
        raise ValueError(f"Unknown city: {origin} or {destination}")
    
    origin_coords = [origin_data["lng"], origin_data["lat"]]
    dest_coords = [destination_data["lng"], destination_data["lat"]]
    
    # Try ORS first
    client = _get_client()
    if client:
        try:
            routes = client.directions(
                coordinates=[origin_coords, dest_coords],
                profile="driving-hgv",
                format="geojson",
            )
            geom = routes["features"][0]["geometry"]["coordinates"]
            props = routes["features"][0]["properties"]["summary"]
            
            result = {
                "distance_km": round(props["distance"] / 1000, 1),
                "time_minutes": round(props["duration"] / 60, 1),
                "geometry": geom,
                "source": "ors",
            }
            _route_cache[cache_key] = result
            return result
        except Exception:
            pass  # Fall back to estimate
    
    # Fallback: haversine-based estimate
    straight_km = _haversine(
        origin_data["lat"], origin_data["lng"],
        destination_data["lat"], destination_data["lng"],
    )
    road_km = _road_distance_estimate(straight_km)
    
    # Estimate time at average 45 km/h (Indian highway average)
    time_min = (road_km / 45.0) * 60.0
    
    # Generate simple geometry (straight line with midpoint)
    mid_lat = (origin_data["lat"] + destination_data["lat"]) / 2
    mid_lng = (origin_data["lng"] + destination_data["lng"]) / 2
    geometry = [origin_coords, [mid_lng, mid_lat], dest_coords]
    
    result = {
        "distance_km": round(road_km, 1),
        "time_minutes": round(time_min, 1),
        "geometry": geometry,
        "source": "estimate",
    }
    _route_cache[cache_key] = result
    return result


def get_distance_matrix() -> Dict[str, Dict[str, float]]:
    """
    Get NxN distance matrix for all cities.
    Uses ORS Matrix API if available, else haversine estimates.
    """
    global _matrix_cache
    if _matrix_cache:
        return _matrix_cache
    
    city_names = list(CITIES.keys())
    matrix = {}
    
    client = _get_client()
    if client:
        try:
            coords = [[CITIES[c]["lng"], CITIES[c]["lat"]] for c in city_names]
            result = client.distance_matrix(
                locations=coords,
                profile="driving-hgv",
                metrics=["distance", "duration"],
            )
            
            for i, origin in enumerate(city_names):
                matrix[origin] = {}
                for j, dest in enumerate(city_names):
                    if i == j:
                        matrix[origin][dest] = 0.0
                    else:
                        matrix[origin][dest] = round(
                            result["distances"][i][j] / 1000, 1
                        )
            
            _matrix_cache = matrix
            return matrix
        except Exception:
            pass
    
    # Fallback: haversine estimates
    for origin in city_names:
        matrix[origin] = {}
        for dest in city_names:
            if origin == dest:
                matrix[origin][dest] = 0.0
            else:
                straight = _haversine(
                    CITIES[origin]["lat"], CITIES[origin]["lng"],
                    CITIES[dest]["lat"], CITIES[dest]["lng"],
                )
                matrix[origin][dest] = round(_road_distance_estimate(straight), 1)
    
    _matrix_cache = matrix
    return matrix


def clear_cache():
    """Clear all cached route data."""
    global _matrix_cache
    _route_cache.clear()
    _matrix_cache = None
