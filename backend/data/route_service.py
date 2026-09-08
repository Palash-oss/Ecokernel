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


def _generate_alternate_geometry(origin: List[float], dest: List[float], variant: str) -> List[float]:
    """
    Generate visually distinct alternate geometries for route alternatives.
    
    Args:
        origin: [lon, lat] origin point
        dest: [lon, lat] destination point
        variant: 'scenic', 'balanced', or 'express' - determines how to deviate from direct path
    
    Returns:
        List of [lon, lat] coordinate pairs representing the route
    """
    origin_lon, origin_lat = origin[0], origin[1]
    dest_lon, dest_lat = dest[0], dest[1]
    
    # Base: start and end points
    points = [origin]
    
    if variant == "scenic":
        # Scenic: takes a northern detour (adds 20-25% distance)
        # Interpolate with 2-3 waypoints offset north
        lat_mid = (origin_lat + dest_lat) / 2
        lon_mid = (origin_lon + dest_lon) / 2
        
        # Northern offset (in degrees, ~1 degree = ~111 km)
        offset_lat = abs(dest_lat - origin_lat) * 0.3
        
        # Add waypoints curving north
        wp1_lon = origin_lon + (lon_mid - origin_lon) * 0.33
        wp1_lat = origin_lat + (lat_mid - origin_lat) * 0.33 + offset_lat
        points.append([wp1_lon, wp1_lat])
        
        wp2_lon = origin_lon + (lon_mid - origin_lon) * 0.67
        wp2_lat = origin_lat + (lat_mid - origin_lat) * 0.67 + offset_lat
        points.append([wp2_lon, wp2_lat])
        
    elif variant == "express":
        # Express: straighter path with minimal deviations (2-5% distance penalty)
        # Just 1-2 waypoints slightly offset for realism
        wp1_lon = origin_lon + (dest_lon - origin_lon) * 0.4
        wp1_lat = origin_lat + (dest_lat - origin_lat) * 0.4
        # Slight offset for visual distinction
        offset_lon = abs(dest_lon - origin_lon) * 0.08
        points.append([wp1_lon + offset_lon, wp1_lat])
        
    else:  # balanced
        # Balanced: moderate detour, one midpoint
        wp_lon = origin_lon + (dest_lon - origin_lon) * 0.5
        wp_lat = origin_lat + (dest_lat - origin_lat) * 0.5
        # Small offset
        offset_lon = abs(dest_lon - origin_lon) * 0.12
        points.append([wp_lon + offset_lon, wp_lat])
    
    # Always add destination
    points.append(dest)
    
    return points


def _get_client() -> Optional[openrouteservice.Client]:
    """Get ORS client if API key is configured."""
    if ORS_API_KEY and ORS_API_KEY != "your_api_key_here":
        try:
            return openrouteservice.Client(key=ORS_API_KEY)
        except Exception:
            return None
    return None


import requests

# We optionally accept dynamic coords bypassing CITIES
def get_route(origin: str, destination: str, origin_coords_override=None, dest_coords_override=None) -> dict:
    """
    Get real route between two cities or accurate coordinates.
    """
    cache_key = f"{origin}->{destination}"
    if origin_coords_override and dest_coords_override:
        cache_key = f"{origin_coords_override}->{dest_coords_override}"
        
    if cache_key in _route_cache:
        return _route_cache[cache_key]
    
    if origin_coords_override:
        origin_coords = origin_coords_override
        origin_lat = origin_coords[1]
        origin_lng = origin_coords[0]
    else:
        origin_data = CITIES.get(origin)
        if not origin_data:
            raise ValueError(f"Unknown origin: {origin}")
        origin_coords = [origin_data["lng"], origin_data["lat"]]
        origin_lat = origin_data["lat"]
        origin_lng = origin_data["lng"]
        
    if dest_coords_override:
        dest_coords = dest_coords_override
        dest_lat = dest_coords[1]
        dest_lng = dest_coords[0]
    else:
        destination_data = CITIES.get(destination)
        if not destination_data:
            raise ValueError(f"Unknown destination: {destination}")
        dest_coords = [destination_data["lng"], destination_data["lat"]]
        dest_lat = destination_data["lat"]
        dest_lng = destination_data["lng"]
    
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
            pass
            
    # Try Public OSRM API (reliable free fallback for geometries)
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{origin_coords[0]},{origin_coords[1]};{dest_coords[0]},{dest_coords[1]}?overview=full&geometries=geojson"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data["code"] == "Ok":
                route = data["routes"][0]
                result = {
                    "distance_km": round(route["distance"] / 1000, 1),
                    "time_minutes": round(route["duration"] / 60, 1),
                    "geometry": route["geometry"]["coordinates"],
                    "source": "osrm",
                }
                _route_cache[cache_key] = result
                return result
    except Exception:
        pass  # Fall back to estimate
    
    # Fallback: haversine-based estimate
    straight_km = _haversine(origin_lat, origin_lng, dest_lat, dest_lng)
    road_km = _road_distance_estimate(straight_km)
    
    # Estimate time at average 45 km/h (Indian highway average)
    time_min = (road_km / 45.0) * 60.0
    
    # Generate simple geometry (straight line with midpoint)
    mid_lat = (origin_lat + dest_lat) / 2
    mid_lng = (origin_lng + dest_lng) / 2
    geometry = [origin_coords, [mid_lng, mid_lat], dest_coords]
    
    result = {
        "distance_km": round(road_km, 1),
        "time_minutes": round(time_min, 1),
        "geometry": geometry,
        "source": "estimate",
    }
    _route_cache[cache_key] = result
    return result


def get_route_alternatives(
    origin_coords: List[float],
    dest_coords: List[float],
    max_alternatives: int = 3,
) -> List[dict]:
    """
    Get multiple road alternatives between two coordinates using OSRM.
    If real alternatives aren't available, synthesize them by varying speed/toll assumptions.
    Always returns 2-3 distinct routes so users can compare.
    """
    cache_key = f"alts:{origin_coords}->{dest_coords}:{max_alternatives}"
    if cache_key in _route_cache:
        return _route_cache[cache_key]

    try:
        url = (
            "http://router.project-osrm.org/route/v1/driving/"
            f"{origin_coords[0]},{origin_coords[1]};{dest_coords[0]},{dest_coords[1]}"
            "?overview=full&geometries=geojson&alternatives=true&steps=false"
        )
        response = requests.get(url, timeout=7)
        if response.status_code == 200:
            data = response.json()
            if data.get("code") == "Ok":
                results = []
                seen = set()
                for route in data.get("routes", []):
                    dist_km = round(route.get("distance", 0) / 1000, 1)
                    time_min = round(route.get("duration", 0) / 60, 1)
                    sig = (dist_km, time_min)
                    if sig in seen:
                        continue
                    seen.add(sig)
                    results.append({
                        "distance_km": dist_km,
                        "time_minutes": time_min,
                        "geometry": route.get("geometry", {}).get("coordinates", []),
                        "source": "osrm",
                    })

                if results and len(results) >= 2:
                    # OSRM returned real alternatives
                    _route_cache[cache_key] = results[:max_alternatives]
                    return _route_cache[cache_key]
                elif results:
                    # Only 1 result from OSRM; synthesize alternatives with distinct geometries
                    base_route = results[0]
                    alternatives = [base_route]
                    
                    # Alternative 1: "Scenic/Slower" route (time +15%, distance +8%)
                    # Generate a distinctly different geometry (northern detour)
                    slower = {
                        "distance_km": round(base_route["distance_km"] * 1.08, 1),
                        "time_minutes": round(base_route["time_minutes"] * 1.15, 1),
                        "geometry": _generate_alternate_geometry(origin_coords, dest_coords, "scenic"),
                        "source": "osrm_synthetic",
                    }
                    alternatives.append(slower)
                    
                    # Alternative 2: "Express/Toll" route (time -10%, distance +2%, toll favored)
                    if len(alternatives) < max_alternatives:
                        express = {
                            "distance_km": round(base_route["distance_km"] * 1.02, 1),
                            "time_minutes": round(base_route["time_minutes"] * 0.90, 1),
                            "geometry": _generate_alternate_geometry(origin_coords, dest_coords, "express"),
                            "source": "osrm_synthetic",
                        }
                        alternatives.append(express)
                    
                    _route_cache[cache_key] = alternatives[:max_alternatives]
                    return _route_cache[cache_key]
    except Exception:
        pass

    # Fallback: fetch single route and synthesize 2 alternatives with distinct geometries
    single = get_route(
        "Custom Origin",
        "Custom Destination",
        origin_coords_override=origin_coords,
        dest_coords_override=dest_coords,
    )
    
    alternatives = [single]
    
    # Synthetic alternative 1: Slower/scenic with northern detour
    slower = {
        "distance_km": round(single["distance_km"] * 1.08, 1),
        "time_minutes": round(single["time_minutes"] * 1.15, 1),
        "geometry": _generate_alternate_geometry(origin_coords, dest_coords, "scenic"),
        "source": "estimate_synthetic",
    }
    alternatives.append(slower)
    
    # Synthetic alternative 2: Faster/express with minimal detour
    if len(alternatives) < max_alternatives:
        express = {
            "distance_km": round(single["distance_km"] * 1.02, 1),
            "time_minutes": round(single["time_minutes"] * 0.90, 1),
            "geometry": _generate_alternate_geometry(origin_coords, dest_coords, "express"),
            "source": "estimate_synthetic",
        }
        alternatives.append(express)
    
    _route_cache[cache_key] = alternatives[:max_alternatives]
    return _route_cache[cache_key]


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
