"""
EcoKernel Supply Chain Importer & Topology Engine

Parses, validates, geocodes, and updates custom logistics network graphs
from CSV, JSON, and GeoJSON data sources.
"""

import math
import networkx as nx
from typing import List, Dict, Any, Tuple
from geopy.distance import geodesic
import data.network as net_mod
from data.geocode_service import search_places_async

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two lat/lon pairs in km."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

async def import_custom_network(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    reset_existing: bool = True
) -> Dict[str, Any]:
    """
    Imports custom nodes and edges into the live EcoKernel network graph.
    Performs geocoding for nodes missing coordinates and calculates distances for edges.
    """
    geocoded_count = 0
    node_dict = {}

    # 1. Process Nodes
    processed_nodes = []
    for node in nodes:
        name = node.get("name", "").strip()
        if not name:
            continue
        
        lat = node.get("lat")
        lng = node.get("lng")
        
        # If lat/lng missing, perform geocoding lookup
        if lat is None or lng is None:
            try:
                places = await search_places_async(name)
                if places:
                    lat = places[0]["lat"]
                    lng = places[0]["lng"]
                    geocoded_count += 1
                else:
                    # Default center fallback if search fails
                    lat, lng = 20.5937, 78.9629
            except Exception:
                lat, lng = 20.5937, 78.9629
        
        n_info = {
            "name": name,
            "lat": float(lat),
            "lng": float(lng),
            "region": node.get("region", "custom"),
            "capacity_tons": float(node.get("capacity_tons", 100.0))
        }
        processed_nodes.append(n_info)
        node_dict[name] = n_info

    # 2. Process Edges
    processed_edges = []
    for edge in edges:
        from_city = edge.get("from_city", "").strip()
        to_city = edge.get("to_city", "").strip()
        
        if not from_city or not to_city or from_city == to_city:
            continue
        
        # Ensure cities exist in node_dict or network
        n1 = node_dict.get(from_city)
        n2 = node_dict.get(to_city)
        
        dist_km = edge.get("distance_km")
        if dist_km is None or dist_km <= 0:
            if n1 and n2:
                dist_km = haversine_distance(n1["lat"], n1["lng"], n2["lat"], n2["lng"])
            else:
                dist_km = 100.0  # Default fallback
        
        time_min = edge.get("time_minutes")
        if time_min is None or time_min <= 0:
            # Assume average 60 km/h truck speed
            time_min = round((dist_km / 60.0) * 60, 1)

        e_info = {
            "from_city": from_city,
            "to_city": to_city,
            "distance_km": float(dist_km),
            "time_minutes": float(time_min),
            "has_rail": bool(edge.get("has_rail", False)),
            "gradient_percent": float(edge.get("gradient_percent", 0.0))
        }
        processed_edges.append(e_info)

    # 3. Update Network Graph
    if reset_existing:
        new_G = nx.Graph()
    else:
        new_G = net_mod.G.copy() if net_mod.G else nx.Graph()

    for n in processed_nodes:
        new_G.add_node(n["name"], lat=n["lat"], lng=n["lng"], region=n["region"], capacity_tons=n["capacity_tons"])

    for e in processed_edges:
        new_G.add_edge(
            e["from_city"],
            e["to_city"],
            distance_km=e["distance_km"],
            time_minutes=e["time_minutes"],
            has_rail=e["has_rail"],
            gradient_percent=e["gradient_percent"]
        )

    # Global state update in data.network
    net_mod.G = new_G

    return {
        "success": True,
        "nodes_added": len(processed_nodes),
        "edges_added": len(processed_edges),
        "geocoded_count": geocoded_count,
        "message": f"Successfully updated supply chain network: {len(processed_nodes)} nodes, {len(processed_edges)} routes."
    }

def export_network_data() -> Dict[str, Any]:
    """Exports current active network nodes and edges."""
    if not net_mod.G:
        return {"nodes": [], "edges": []}

    nodes = []
    for node, attrs in net_mod.G.nodes(data=True):
        nodes.append({
            "name": node,
            "lat": attrs.get("lat", 0.0),
            "lng": attrs.get("lng", 0.0),
            "region": attrs.get("region", "custom")
        })

    edges = []
    for u, v, attrs in net_mod.G.edges(data=True):
        edges.append({
            "from_city": u,
            "to_city": v,
            "distance_km": attrs.get("distance_km", 0.0),
            "time_minutes": attrs.get("time_minutes", 0.0),
            "has_rail": attrs.get("has_rail", False),
            "gradient_percent": attrs.get("gradient_percent", 0.0)
        })

    return {"nodes": nodes, "edges": edges}
