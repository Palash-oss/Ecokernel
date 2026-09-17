"""
Green Vehicle Routing Problem (GVRP) Solver using NSGA-II.

Multi-objective Genetic Algorithm that simultaneously minimizes:
1. Total cost (INR)
2. Total CO₂ emissions (kg)

Uses the DEAP library for evolutionary computation with
NSGA-II selection for Pareto-optimal solutions.
"""

import random
import numpy as np
import networkx as nx
from deap import base, creator, tools, algorithms
from typing import List, Tuple, Dict, Optional
from config import GA_POPULATION_SIZE, GA_GENERATIONS, GA_CROSSOVER_PROB, GA_MUTATION_PROB
from data.emission_factors import (
    calculate_segment_co2,
    calculate_segment_cost,
    calculate_iso14083_emissions,
)
from data.route_service import get_route
from engine.green_score import calculate_green_score
from models.vehicle import get_vehicle


# ─── DEAP Setup ────────────────────────────────────────────
# Create fitness and individual classes (minimize both objectives)
if not hasattr(creator, "FitnessMulti"):
    creator.create("FitnessMulti", base.Fitness, weights=(-1.0, -1.0))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMulti)


def _get_path_cities(G: nx.Graph, origin: str, destination: str, waypoints: List[str]) -> List[str]:
    """Get all possible intermediate cities for routing."""
    all_cities = list(G.nodes())
    
    # Must-visit cities
    must_visit = [origin] + waypoints + [destination]
    
    # Optional cities (can be used as intermediate stops)
    optional = [c for c in all_cities if c not in must_visit]
    
    return must_visit, optional


def _decode_individual(
    individual: list,
    must_visit: List[str],
    optional: List[str],
    G: nx.Graph,
) -> List[Tuple[str, str, str]]:
    """
    Decode a GA individual into a route.
    
    Individual format: [use_city_0, use_city_1, ..., mode_0, mode_1, ...]
    First half: binary flags for optional cities (0 or 1)
    Second half: transport mode index per segment (0=road, 1=rail, 2=multimodal)
    
    Returns: [(from_city, to_city, mode), ...]
    """
    n_optional = len(optional)
    
    # Select which optional cities to include
    selected_optional = []
    for i, city in enumerate(optional):
        if i < len(individual) and individual[i] > 0.5:
            selected_optional.append(city)
    
    # Build route: origin -> [selected_optional] -> destination
    route_cities = [must_visit[0]]  # origin
    
    # Insert waypoints in order
    for wp in must_visit[1:-1]:
        route_cities.append(wp)
    
    # Add selected optional cities (sorted by proximity to route)
    for city in selected_optional[:3]:  # Max 3 optional stops
        route_cities.append(city)
    
    route_cities.append(must_visit[-1])  # destination
    
    # Build segments with transport modes
    segments = []
    mode_offset = n_optional
    modes = ["road", "rail", "multimodal"]
    
    for i in range(len(route_cities) - 1):
        from_city = route_cities[i]
        to_city = route_cities[i + 1]
        
        # Check if edge exists
        if not G.has_edge(from_city, to_city):
            # Find shortest path through graph
            try:
                path = nx.shortest_path(G, from_city, to_city, weight="distance_km")
                for k in range(len(path) - 1):
                    mode_idx = mode_offset + i
                    if mode_idx < len(individual):
                        mode_val = individual[mode_idx]
                    else:
                        mode_val = 0
                    
                    edge_data = G[path[k]][path[k + 1]]
                    has_rail = edge_data.get("has_rail", False)
                    
                    if mode_val > 0.66 and has_rail:
                        mode = "rail"
                    elif mode_val > 0.33 and has_rail:
                        mode = "multimodal"
                    else:
                        mode = "road"
                    
                    segments.append((path[k], path[k + 1], mode))
            except nx.NetworkXNoPath:
                segments.append((from_city, to_city, "road"))
        else:
            mode_idx = mode_offset + i
            if mode_idx < len(individual):
                mode_val = individual[mode_idx]
            else:
                mode_val = 0
            
            edge_data = G[from_city][to_city]
            has_rail = edge_data.get("has_rail", False)
            
            if mode_val > 0.66 and has_rail:
                mode = "rail"
            elif mode_val > 0.33 and has_rail:
                mode = "multimodal"
            else:
                mode = "road"
            
            segments.append((from_city, to_city, mode))
    
    return segments


def _evaluate(
    individual: list,
    must_visit: List[str],
    optional: List[str],
    G: nx.Graph,
    vehicle: dict,
    load_tonnes: float,
) -> Tuple[float, float]:
    """
    Evaluate fitness of an individual: (total_cost, total_co2).
    Both are minimized by NSGA-II.
    """
    segments = _decode_individual(individual, must_visit, optional, G)
    
    total_cost = 0.0
    total_co2 = 0.0
    
    fuel_type = vehicle.get("fuel_type", "euro6_diesel")
    max_payload = vehicle.get("max_payload_tonnes", 16.0)
    
    for from_city, to_city, mode in segments:
        if G.has_edge(from_city, to_city):
            edge = G[from_city][to_city]
            distance = edge["distance_km"]
            speed = edge.get("avg_speed_kmh", 45.0)
            gradient = edge.get("gradient_percent", 0.0)
        else:
            distance = 100.0  # fallback
            speed = 45.0
            gradient = 0.0
        
        is_rail = (mode == "rail")
        
        # MODULE 1: Identify if route is disrupted
        disruption_penalty = 0
        if G.has_edge(from_city, to_city):
            edge = G[from_city][to_city]
            if edge.get("disruption"):
                # If disrupted, we penalize the "Wait" scenario to force the GA 
                # to explore alternative "Divert" paths
                disruption_penalty = 5000 
        
        co2 = calculate_segment_co2(
            distance_km=distance,
            fuel_type=fuel_type if not is_rail else "rail_freight",
            speed_kmh=speed if not is_rail else 35.0,
            gradient_percent=gradient,
            load_tonnes=load_tonnes,
            max_payload_tonnes=max_payload,
            is_rail=is_rail,
        )
        
        cost = calculate_segment_cost(
            distance_km=distance,
            mode=mode,
            fuel_type=fuel_type,
            from_city=from_city,
            to_city=to_city,
            vehicle_type=vehicle.get("id")
        )
        
        total_cost += cost + disruption_penalty
        total_co2 += co2 + (disruption_penalty * 0.001)  # Minimal CO2 penalty for wait time simulation
    
    # Penalize very long routes (too many optional stops)
    if len(segments) > 8:
        penalty = (len(segments) - 8) * 5000
        total_cost += penalty
        total_co2 += penalty * 0.1
    
    return (total_cost, total_co2)


def solve_direct_routes(
    origin: str,
    destination: str,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    vehicle_id: str = "ashok_leyland_euro6",
    load_tonnes: float = 10.0,
    priority: float = 0.5,
    max_solutions: int = 3,
) -> List[dict]:
    """
    Direct, address-accurate routing using OSRM alternatives.
    Returns multiple road-only solutions ranked by green/cost preference.
    Uses real-world OSRM routing data for accurate CO2 and cost calculations.
    """
    from data.route_service import get_route_alternatives

    vehicle = get_vehicle(vehicle_id)
    routes = get_route_alternatives(
        [origin_lng, origin_lat],
        [dest_lng, dest_lat],
        max_alternatives=max_solutions,
    )

    solutions = []
    for idx, route in enumerate(routes):
        dist = float(route.get("distance_km", 0.0))
        time_min = float(route.get("time_minutes", 0.0))

        # Calculate average speed from OSRM data
        avg_speed = 45.0
        if time_min > 0:
            avg_speed = max(15.0, min(80.0, dist / (time_min / 60.0)))

        # Calculate CO2 without cold-start penalty (OSRM already accounts for realistic speeds)
        co2 = calculate_segment_co2(
            distance_km=dist,
            fuel_type=vehicle["fuel_type"],
            speed_kmh=avg_speed,
            gradient_percent=0.0,
            load_tonnes=load_tonnes,
            max_payload_tonnes=vehicle["max_payload_tonnes"],
            is_rail=False,
        )
        
        # Calculate realistic cost: fuel + operational overhead + tolls
        cost = calculate_segment_cost(
            distance_km=dist,
            mode="road",
            fuel_type=vehicle["fuel_type"],
            from_city=origin,
            to_city=destination,
            vehicle_type=vehicle["id"],
        )

        iso_breakdown = calculate_iso14083_emissions(
            distance_km=dist,
            fuel_type=vehicle["fuel_type"],
            speed_kmh=avg_speed,
            gradient_percent=0.0,
            load_tonnes=load_tonnes,
            max_payload_tonnes=vehicle["max_payload_tonnes"],
            is_rail=False,
        )

        green = calculate_green_score(co2, dist, vehicle["fuel_type"])

        solutions.append({
            "id": idx + 1,
            "segments": [{
                "from_city": origin,
                "to_city": destination,
                "distance_km": round(dist, 1),
                "time_minutes": round(time_min, 1),
                "mode": "road",
                "co2_kg": round(co2, 3),
                "cost_inr": round(cost, 2),
                "geometry": route.get("geometry"),
                "disruption": None,
            }],
            "total_distance_km": round(dist, 1),
            "total_time_minutes": round(time_min, 1),
            "total_co2_kg": round(co2, 2),
            "total_cost_inr": round(cost, 2),
            "green_score": green,
            "vehicle_type": vehicle["name"],
            "modes_used": ["road"],
            "iso_14083": iso_breakdown,
        })

    def weighted_score(sol: dict) -> float:
        return (1 - priority) * sol["total_cost_inr"] + priority * sol["total_co2_kg"] * 1000

    solutions.sort(key=weighted_score)
    for idx, sol in enumerate(solutions):
        sol["id"] = idx + 1

    # Mark fastest and greenest solutions explicitly to help the UI present
    if solutions:
        min_time = min(solutions, key=lambda s: s["total_time_minutes"]) ["total_time_minutes"]
        min_co2 = min(solutions, key=lambda s: s["total_co2_kg"]) ["total_co2_kg"]

        for sol in solutions:
            sol["is_fastest"] = sol["total_time_minutes"] == min_time
            sol["is_greenest"] = sol["total_co2_kg"] == min_co2
            # Heuristic label: if both fastest and greenest (rare), call balanced
            if sol["is_fastest"] and sol["is_greenest"]:
                sol["strategy"] = "balanced"
            elif sol["is_fastest"]:
                sol["strategy"] = "fastest"
            elif sol["is_greenest"]:
                sol["strategy"] = "greenest"
            else:
                sol["strategy"] = "balanced"

    return solutions


def solve_gvrp(
    G: nx.Graph,
    origin: str,
    destination: str,
    waypoints: List[str] = None,
    vehicle_id: str = "ashok_leyland_euro6",
    load_tonnes: float = 10.0,
    priority: float = 0.5,
    max_solutions: int = 10,
    origin_lat: Optional[float] = None,
    origin_lng: Optional[float] = None,
    dest_lat: Optional[float] = None,
    dest_lng: Optional[float] = None,
) -> List[dict]:
    """
    Solve the Green Vehicle Routing Problem using NSGA-II.
    
    Returns a list of Pareto-optimal solutions, each containing:
    - segments: route breakdown
    - total_cost, total_co2, green_score
    """
    if waypoints is None:
        waypoints = []
    
    # SHORT-RANGE BYPASS: For local/regional logistics (< 300km), prioritize direct road routing
    # This prevents the GA from suggesting absurd detours to rail hubs for short trips.
    if origin_lat is not None and dest_lat is not None:
        from data.route_service import _haversine, get_route
        direct_dist = _haversine(origin_lat, origin_lng, dest_lat, dest_lng)
        
        if direct_dist < 300: 
             vehicle = get_vehicle(vehicle_id)
             try:
                 real_route = get_route(origin, destination, origin_coords_override=[origin_lng, origin_lat], dest_coords_override=[dest_lng, dest_lat])
                 dist = real_route["distance_km"]
                 time_min = real_route["time_minutes"]
                 
                 # Calculate emissions based on real road distance
                 co2 = calculate_segment_co2(dist, vehicle["fuel_type"], 45, 0, load_tonnes, vehicle["max_payload_tonnes"], False)
                 cost = calculate_segment_cost(dist, "road", vehicle["fuel_type"], origin, destination, vehicle_id)
                 
                 total_co2 = co2
                 total_cost = cost
                 
                 return [{
                     "id": 1,
                     "segments": [{
                         "from_city": origin,
                         "to_city": destination,
                         "distance_km": round(dist, 1),
                         "time_minutes": round(time_min, 1),
                         "mode": "road",
                         "co2_kg": round(co2, 3),
                         "cost_inr": round(cost, 2),
                         "geometry": real_route.get("geometry")
                     }],
                     "total_distance_km": round(dist, 1),
                     "total_time_minutes": round(time_min, 1),
                     "total_co2_kg": round(total_co2, 2),
                     "total_cost_inr": round(total_cost, 2),
                     "green_score": calculate_green_score(total_co2, dist, vehicle["fuel_type"]),
                     "vehicle_type": vehicle["name"],
                     "modes_used": ["road"]
                 }]
             except Exception as e:
                 print(f"Bypass failed: {e}")
                 pass
    def add_dynamic_node(node_name, lat, lng):
        from data.route_service import get_route, _haversine
        G.add_node(node_name, lat=lat, lng=lng, region="Custom")
        
        # FAST HEURISTIC: First find the 3 closest cities using straight-line distance (no API calls)
        candidate_hubs = []
        for n, data in G.nodes(data=True):
            if n == node_name or "Custom" in n:
                continue
            dist_straight = _haversine(lat, lng, data["lat"], data["lng"])
            candidate_hubs.append((dist_straight, n))
        
        candidate_hubs.sort()
        nearest_hubs = [h[1] for h in candidate_hubs[:3]]
        
        # Now only call the slow API for the 3 most promising hubs
        distances = []
        for hub_name in nearest_hubs:
            try:
                route = get_route(hub_name, node_name, dest_coords_override=[lng, lat])
                distances.append((route["distance_km"], route["time_minutes"], hub_name, route.get("geometry")))
            except:
                continue
                
        distances.sort()
        # Connect to 2 nearest hubs with real data
        for dist_km, time_min, n, geom in distances[:2]:
            G.add_edge(node_name, n, distance_km=dist_km, time_minutes=time_min, has_rail=False, gradient_percent=0.0, avg_speed_kmh=45.0, geometry=geom)
            G.add_edge(n, node_name, distance_km=dist_km, time_minutes=time_min, has_rail=False, gradient_percent=0.0, avg_speed_kmh=45.0, geometry=geom)

    dynamic_origin = origin
    if origin_lat is not None and origin_lng is not None:
        dynamic_origin = "Custom Origin"
        add_dynamic_node(dynamic_origin, origin_lat, origin_lng)
        origin = dynamic_origin
        
    dynamic_dest = destination
    if dest_lat is not None and dest_lng is not None:
        dynamic_dest = "Custom Destination"
        add_dynamic_node(dynamic_dest, dest_lat, dest_lng)
        destination = dynamic_dest
        
    vehicle = get_vehicle(vehicle_id)
    must_visit, optional = _get_path_cities(G, origin, destination, waypoints)
    
    n_optional = len(optional)
    n_modes = 10  # max segments
    ind_size = n_optional + n_modes
    
    # ─── Reproducibility Setup ─────────────────────────────
    # Seed the random number generator using the inputs so that repeated requests
    # with the same parameters yield the identical Pareto front.
    seed_str = f"{origin}-{destination}-{'-'.join(waypoints)}-{vehicle_id}-{load_tonnes}-{priority}"
    seed_hash = sum(ord(c) for c in seed_str)
    random.seed(seed_hash)

    # ─── DEAP Toolbox ──────────────────────────────────────
    toolbox = base.Toolbox()
    toolbox.register("attr_float", random.random)
    toolbox.register(
        "individual",
        tools.initRepeat,
        creator.Individual,
        toolbox.attr_float,
        n=ind_size,
    )
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)
    
    toolbox.register(
        "evaluate",
        _evaluate,
        must_visit=must_visit,
        optional=optional,
        G=G,
        vehicle=vehicle,
        load_tonnes=load_tonnes,
    )
    toolbox.register("mate", tools.cxSimulatedBinaryBounded, low=0.0, up=1.0, eta=20.0)
    toolbox.register("mutate", tools.mutPolynomialBounded, low=0.0, up=1.0, eta=20.0, indpb=0.2)
    toolbox.register("select", tools.selNSGA2)
    
    # ─── Run NSGA-II ───────────────────────────────────────
    pop_size = min(GA_POPULATION_SIZE, 60)  # Keep reasonable for demo
    # selTournamentDCD requires population size divisible by 4
    pop_size = (pop_size // 4) * 4
    pop_size = max(pop_size, 8)  # Minimum viable population
    n_gen = min(GA_GENERATIONS, 50)
    
    pop = toolbox.population(n=pop_size)
    
    # Evaluate initial population
    fitnesses = list(map(toolbox.evaluate, pop))
    for ind, fit in zip(pop, fitnesses):
        ind.fitness.values = fit
        
    # Assign crowding distances to initial population for tournament selection
    tools.emo.assignCrowdingDist(pop)
    
    # Evolution
    for gen in range(n_gen):
        # Select offspring
        offspring = tools.selTournamentDCD(pop, len(pop))
        offspring = [toolbox.clone(ind) for ind in offspring]
        
        # Crossover
        for child1, child2 in zip(offspring[::2], offspring[1::2]):
            if random.random() < GA_CROSSOVER_PROB:
                toolbox.mate(child1, child2)
                del child1.fitness.values
                del child2.fitness.values
        
        # Mutation
        for mutant in offspring:
            if random.random() < GA_MUTATION_PROB:
                toolbox.mutate(mutant)
                del mutant.fitness.values
        
        # Evaluate new individuals
        invalid = [ind for ind in offspring if not ind.fitness.valid]
        fitnesses = list(map(toolbox.evaluate, invalid))
        for ind, fit in zip(invalid, fitnesses):
            ind.fitness.values = fit
        
        # NSGA-II selection for next generation
        pop = toolbox.select(pop + offspring, pop_size)
    
    # ─── Extract Pareto Front ──────────────────────────────
    fronts = tools.sortNondominated(pop, len(pop))
    pareto = []
    seen = set()
    
    for front in fronts:
        for ind in front:
            cost, co2 = ind.fitness.values
            sig = (round(cost, 1), round(co2, 1))
            if sig not in seen:
                seen.add(sig)
                pareto.append(ind)
            if len(pareto) >= max_solutions:
                break
        if len(pareto) >= 3:
            # We have enough diverse and valid solutions from the top fronts
            break
    # Apply priority weighting to sort solutions
    def weighted_score(ind):
        cost, co2 = ind.fitness.values
        # Normalize roughly
        return (1 - priority) * cost + priority * co2 * 1000
    
    pareto.sort(key=weighted_score)
    
    # Build solution dicts
    solutions = []
    for idx, ind in enumerate(pareto[:max_solutions]):
        segments = _decode_individual(ind, must_visit, optional, G)
        
        route_segments = []
        total_dist = 0
        total_time = 0
        total_co2 = 0
        total_cost = 0
        modes_used = set()
        
        for from_city, to_city, mode in segments:
            # Fetch real route paths via API for the final output
            from_coords = None
            to_coords = None
            if "Custom" in from_city and G.has_node(from_city):
                from_coords = [G.nodes[from_city]["lng"], G.nodes[from_city]["lat"]]
            if "Custom" in to_city and G.has_node(to_city):
                to_coords = [G.nodes[to_city]["lng"], G.nodes[to_city]["lat"]]
                
            try:
                real_route = get_route(from_city, to_city, origin_coords_override=from_coords, dest_coords_override=to_coords)
                dist = real_route.get("distance_km", 100)
                time = real_route.get("time_minutes", 133)
                geometry = real_route.get("geometry", None)
            except Exception as e:
                dist = 100
                time = 133
                geometry = None
                
            if G.has_edge(from_city, to_city):
                edge = G[from_city][to_city]
                speed = edge.get("avg_speed_kmh", 45)
                gradient = edge.get("gradient_percent", 0)
                disruption = edge.get("disruption", None)
            else:
                speed = 45
                gradient = 0
                disruption = None
            
            is_rail = (mode == "rail")
            co2 = calculate_segment_co2(
                distance_km=dist,
                fuel_type=vehicle["fuel_type"] if not is_rail else "rail_freight",
                speed_kmh=speed if not is_rail else 35,
                gradient_percent=gradient,
                load_tonnes=load_tonnes,
                max_payload_tonnes=vehicle["max_payload_tonnes"],
                is_rail=is_rail,
            )
            cost = calculate_segment_cost(
                distance_km=dist,
                mode=mode,
                fuel_type=vehicle["fuel_type"],
                from_city=from_city,
                to_city=to_city,
                vehicle_type=vehicle["id"]
            )
            
            route_segments.append({
                "from_city": from_city,
                "to_city": to_city,
                "distance_km": round(dist, 1),
                "time_minutes": round(time, 1),
                "mode": mode,
                "co2_kg": round(co2, 3),
                "cost_inr": round(cost, 2),
                "geometry": geometry,
                "disruption": disruption,
            })
            
            total_dist += dist
            total_time += time
            total_co2 += co2
            total_cost += cost
            modes_used.add(mode)
        
        green = calculate_green_score(total_co2, total_dist, vehicle["fuel_type"])
        
        solutions.append({
            "id": idx + 1,
            "segments": route_segments,
            "total_distance_km": round(total_dist, 1),
            "total_time_minutes": round(total_time, 1),
            "total_co2_kg": round(total_co2, 2),
            "total_cost_inr": round(total_cost, 2),
            "green_score": green,
            "vehicle_type": vehicle["name"],
            "modes_used": list(modes_used),
        })
    return solutions
