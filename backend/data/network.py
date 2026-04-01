"""
Real logistics network for India.

Builds a networkx graph of Indian logistics hubs with:
- Real GPS coordinates
- Real road distances (from ORS or haversine estimates)
- Rail corridor availability
- Simulated gradient data (based on terrain knowledge)
"""

import networkx as nx
import random
from typing import Dict, List, Tuple
from config import CITIES, RAIL_CORRIDORS, TRANSPORT_MODES
from data.route_service import get_route, _haversine, _road_distance_estimate


# Known terrain gradients between Indian cities (approximate %)
TERRAIN_GRADIENTS = {
    ("Mumbai", "Pune"): 3.5,       # Western Ghats
    ("Pune", "Mumbai"): -3.5,
    ("Bangalore", "Coimbatore"): 2.0,  # Nilgiri foothills
    ("Coimbatore", "Bangalore"): -2.0,
    ("Mumbai", "Nagpur"): 1.5,     # Deccan Plateau
    ("Nagpur", "Mumbai"): -1.5,
    ("Delhi", "Jaipur"): 0.5,     # Aravalli foothills
    ("Jaipur", "Delhi"): -0.5,
    ("Bhopal", "Indore"): 1.8,    # Vindhya Range
    ("Indore", "Bhopal"): -1.8,
}


def _get_gradient(city_a: str, city_b: str) -> float:
    """Get real terrain gradient between two cities."""
    key = (city_a, city_b)
    if key in TERRAIN_GRADIENTS:
        return TERRAIN_GRADIENTS[key]
    # Default: slight random gradient for flatlands
    random.seed(hash(key) % 10000)
    return round(random.uniform(-0.5, 0.5), 2)


def _get_traffic_speed(city_a: str, city_b: str, base_speed: float = 45.0) -> float:
    """
    Estimate average speed considering Indian traffic conditions.
    Routes through/near mega-cities are slower.
    """
    mega_cities = {"Mumbai", "Delhi", "Bangalore", "Kolkata", "Chennai"}
    
    speed = base_speed
    if city_a in mega_cities:
        speed -= 10  # Slower departure from mega-city
    if city_b in mega_cities:
        speed -= 8   # Slower approach to mega-city
    
    # Minimum speed
    return max(speed, 25.0)


def build_network() -> nx.Graph:
    """
    Build the Indian logistics network graph.
    
    Each edge has:
    - distance_km: real road distance
    - time_minutes: estimated travel time
    - has_rail: whether rail freight is available
    - gradient_percent: terrain gradient
    - avg_speed_kmh: expected average speed
    - geometry: route polyline (if available from ORS)
    """
    G = nx.Graph()
    
    # Add city nodes
    for name, data in CITIES.items():
        G.add_node(name, **data)
    
    # Build edges between cities within reasonable distance
    city_names = list(CITIES.keys())
    rail_set = set()
    for a, b in RAIL_CORRIDORS:
        rail_set.add((a, b))
        rail_set.add((b, a))
    
    for i, city_a in enumerate(city_names):
        for j, city_b in enumerate(city_names):
            if i >= j:
                continue
            
            # Calculate straight-line distance
            straight_km = _haversine(
                CITIES[city_a]["lat"], CITIES[city_a]["lng"],
                CITIES[city_b]["lat"], CITIES[city_b]["lng"],
            )
            
            # Only connect cities within 1200 km road distance
            road_km = _road_distance_estimate(straight_km)
            if road_km > 1200:
                continue
            
            has_rail = (city_a, city_b) in rail_set
            gradient = _get_gradient(city_a, city_b)
            avg_speed = _get_traffic_speed(city_a, city_b)
            time_min = (road_km / avg_speed) * 60.0
            
            G.add_edge(
                city_a, city_b,
                distance_km=round(road_km, 1),
                time_minutes=round(time_min, 1),
                has_rail=has_rail,
                gradient_percent=gradient,
                avg_speed_kmh=avg_speed,
                disruption=None,
            )
            
    # -- APPLY REAL-WORLD LIVE DISRUPTIONS --
    _apply_live_weather(G)
    
    return G

import httpx

def _apply_live_weather(G: nx.Graph):
    """
    Fetch real-time weather from Open-Meteo for all active hubs.
    If there is heavy rain or adverse conditions, dynamically slash route speeds,
    simulating live 'road blockages' and 'congestion'.
    """
    nodes = list(G.nodes(data=True))
    lats = ",".join(str(n[1]["lat"]) for n in nodes)
    lngs = ",".join(str(n[1]["lng"]) for n in nodes)
    
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lngs}&current=precipitation,weather_code"
        resp = httpx.get(url, timeout=5.0)
        if resp.status_code == 200:
            data_list = resp.json()
            if isinstance(data_list, list):
                for idx, c_data in enumerate(data_list):
                    city_name = nodes[idx][0]
                    precip = c_data.get("current", {}).get("precipitation", 0.0)
                    
                    # Logic: Even light rain causes 15% slowdown in major Indian cities.
                    # Heavy rain (> 1.5mm/hr) causes up to 60% massive road blockages.
                    if precip > 0.0:
                        severity = precip * 20 # Config map
                        slowdown_factor = max(0.4, 1.0 - (severity / 100))
                        
                        # Apply live congestion to all connected routes
                        for neighbor in G.neighbors(city_name):
                            edge = G[city_name][neighbor]
                            edge["avg_speed_kmh"] = max(15.0, edge["avg_speed_kmh"] * slowdown_factor)
                            edge["time_minutes"] = (edge["distance_km"] / edge["avg_speed_kmh"]) * 60.0
                            
                            # Tag the disruption
                            if slowdown_factor < 0.6:
                                edge["disruption"] = f"SEVERE WEATHER ({city_name})"
                            elif slowdown_factor < 0.85:
                                edge["disruption"] = f"RAIN DELAY ({city_name})"
    except Exception as e:
        print(f"Warning: Could not fetch live weather disruptions: {e}")


def enrich_with_ors(G: nx.Graph) -> nx.Graph:
    """
    Optionally enrich the network with real ORS distances and geometry.
    Call this at startup if ORS API key is available.
    """
    for u, v, data in G.edges(data=True):
        try:
            route = get_route(u, v)
            data["distance_km"] = route["distance_km"]
            data["time_minutes"] = route["time_minutes"]
            if route.get("geometry"):
                data["geometry"] = route["geometry"]
            data["source"] = route["source"]
        except Exception:
            data["source"] = "estimate"
    return G


def get_network_data(G: nx.Graph) -> dict:
    """Serialize network for API response."""
    nodes = []
    for name, data in G.nodes(data=True):
        nodes.append({
            "name": name,
            "lat": data["lat"],
            "lng": data["lng"],
            "region": data["region"],
        })
    
    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            "from_city": u,
            "to_city": v,
            "distance_km": data["distance_km"],
            "time_minutes": data["time_minutes"],
            "has_rail": data["has_rail"],
            "gradient_percent": data["gradient_percent"],
            "avg_speed_kmh": data["avg_speed_kmh"],
            "disruption": data.get("disruption"),
        })
    
    return {"nodes": nodes, "edges": edges}
