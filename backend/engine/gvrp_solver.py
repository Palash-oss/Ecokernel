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
from data.emission_factors import calculate_segment_co2, calculate_segment_cost
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
        )
        
        total_cost += cost
        total_co2 += co2
    
    # Penalize very long routes (too many optional stops)
    if len(segments) > 8:
        penalty = (len(segments) - 8) * 5000
        total_cost += penalty
        total_co2 += penalty * 0.1
    
    return (total_cost, total_co2)


def solve_gvrp(
    G: nx.Graph,
    origin: str,
    destination: str,
    waypoints: List[str] = None,
    vehicle_id: str = "ashok_leyland_euro6",
    load_tonnes: float = 10.0,
    priority: float = 0.5,
    max_solutions: int = 10,
) -> List[dict]:
    """
    Solve the Green Vehicle Routing Problem using NSGA-II.
    
    Returns a list of Pareto-optimal solutions, each containing:
    - segments: route breakdown
    - total_cost, total_co2, green_score
    """
    if waypoints is None:
        waypoints = []
    
    vehicle = get_vehicle(vehicle_id)
    must_visit, optional = _get_path_cities(G, origin, destination, waypoints)
    
    n_optional = len(optional)
    n_modes = 10  # max segments
    ind_size = n_optional + n_modes
    
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
    pareto = tools.sortNondominated(pop, len(pop), first_front_only=True)[0]
    
    # Deduplicate extremely similar solutions
    unique_pareto = []
    seen = set()
    for ind in pareto:
        cost, co2 = ind.fitness.values
        sig = (round(cost, 1), round(co2, 1))
        if sig not in seen:
            seen.add(sig)
            unique_pareto.append(ind)
            
    pareto = unique_pareto
    
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
            if G.has_edge(from_city, to_city):
                edge = G[from_city][to_city]
                dist = edge["distance_km"]
                time = edge["time_minutes"]
                speed = edge.get("avg_speed_kmh", 45)
                gradient = edge.get("gradient_percent", 0)
                geometry = edge.get("geometry", None)
            else:
                dist = 100
                time = 133
                speed = 45
                gradient = 0
                geometry = None
            
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
            cost = calculate_segment_cost(dist, mode, vehicle["fuel_type"])
            
            route_segments.append({
                "from_city": from_city,
                "to_city": to_city,
                "distance_km": round(dist, 1),
                "time_minutes": round(time, 1),
                "mode": mode,
                "co2_kg": round(co2, 3),
                "cost_inr": round(cost, 2),
                "geometry": geometry,
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
