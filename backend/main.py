"""
EcoKernel — FastAPI Backend

AI-driven green logistics optimization engine for India.
Provides real-time route optimization, demand forecasting,
and environmental impact analysis.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from models.schemas import (
    OptimizeRequest, ParetoFront, RouteSolution, RouteSegment,
    NetworkResponse, NetworkNode, NetworkEdge,
    DemandForecastResponse, DemandForecastItem,
    VehicleInfo, CarbonIntensityResponse,
)
from models import schemas
from models.vehicle import get_all_vehicles
from data.network import build_network, get_network_data
from data.carbon_api import get_current_intensity
from data.geocode_service import search_places_async, reverse_geocode_async
from engine.gvrp_solver import solve_gvrp, solve_direct_routes
from engine.demand_forecast import get_demand_forecast


# ─── App State ─────────────────────────────────────────────
network_graph = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build the logistics network on startup."""
    global network_graph
    print("🌿 EcoKernel: Building Indian logistics network...")
    network_graph = build_network()
    print(f"✅ Network ready: {network_graph.number_of_nodes()} cities, {network_graph.number_of_edges()} routes")
    # Initialize database connection/state
    try:
        import data.database as db
        db.init_db()
        print("✅ Database initialized")
    except Exception as _e:
        print(f"⚠️ Database init failed: {_e}")
    yield
    print("🛑 EcoKernel: Shutting down.")


app = FastAPI(
    title="EcoKernel",
    description="AI-driven green logistics optimization engine for India",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoints ─────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Health check."""
    return {
        "status": "healthy",
        "service": "EcoKernel",
        "nodes": network_graph.number_of_nodes() if network_graph else 0,
        "edges": network_graph.number_of_edges() if network_graph else 0,
    }


@app.post("/api/optimize", response_model=ParetoFront)
async def optimize_route(request: OptimizeRequest):
    """
    Run the GVRP solver to find Pareto-optimal routes.
    Returns a set of solutions trading off cost vs carbon.
    """
    if network_graph is None:
        raise HTTPException(status_code=503, detail="Network not initialized")
    
    # Validate cities - allowing custom ones if coordinates are provided
    from config import CITIES
    
    # If coordinates are provided, we don't strictly need the name to be in CITIES
    has_custom_origin = request.origin_lat is not None and request.origin_lng is not None
    has_custom_dest = request.dest_lat is not None and request.dest_lng is not None

    if not has_custom_origin and request.origin not in CITIES:
        raise HTTPException(status_code=400, detail=f"Unknown origin: {request.origin}. Provide coordinates for custom locations.")
    
    if not has_custom_dest and request.destination not in CITIES:
        raise HTTPException(status_code=400, detail=f"Unknown destination: {request.destination}. Provide coordinates for custom locations.")

    if request.origin == request.destination and not (has_custom_origin or has_custom_dest):
        raise HTTPException(status_code=400, detail="Origin and destination must be different")
    
    # Use the vehicle ID directly from the frontend
    vehicle_id = request.vehicle_type
    
    start_time = time.time()
    
    solutions = solve_gvrp(
        G=network_graph,
        origin=request.origin,
        destination=request.destination,
        waypoints=request.waypoints,
        vehicle_id=vehicle_id,
        load_tonnes=request.load_tonnes,
        priority=request.priority,
        max_solutions=request.max_solutions,
        origin_lat=request.origin_lat,
        origin_lng=request.origin_lng,
        dest_lat=request.dest_lat,
        dest_lng=request.dest_lng,
    )
    
    elapsed = round(time.time() - start_time, 2)
    print(f"⚡ Solver finished in {elapsed}s — {len(solutions)} solutions")
    
    # Convert to response models
    route_solutions = []
    for sol in solutions:
        segments = [
            RouteSegment(
                from_city=s["from_city"],
                to_city=s["to_city"],
                distance_km=s["distance_km"],
                time_minutes=s["time_minutes"],
                mode=s["mode"],
                co2_kg=s["co2_kg"],
                cost_inr=s["cost_inr"],
                geometry=s.get("geometry"),
                disruption=s.get("disruption"),
            )
            for s in sol["segments"]
        ]
        
        route_solutions.append(RouteSolution(
            id=sol["id"],
            segments=segments,
            total_distance_km=sol["total_distance_km"],
            total_time_minutes=sol["total_time_minutes"],
            total_co2_kg=sol["total_co2_kg"],
            total_cost_inr=sol["total_cost_inr"],
            green_score=sol["green_score"],
            vehicle_type=sol["vehicle_type"],
            modes_used=sol["modes_used"],
            strategy=sol.get("strategy"),
            is_fastest=sol.get("is_fastest"),
            is_greenest=sol.get("is_greenest"),
        ))
    
    # Identify best cost and best green
    best_cost = min(route_solutions, key=lambda s: s.total_cost_inr) if route_solutions else None
    best_green = min(route_solutions, key=lambda s: s.total_co2_kg) if route_solutions else None
    
    return ParetoFront(
        solutions=route_solutions,
        best_cost=best_cost,
        best_green=best_green,
        origin=request.origin,
        destination=request.destination,
    )


@app.post("/api/v1/route-data", response_model=ParetoFront)
async def route_data_v1(request: schemas.RouteDataRequest):
    """
    V1 endpoint for high-accuracy coordinate-based routing.
    Accepts full address objects and routes via OSRM/ORS.
    """
    if network_graph is None:
        raise HTTPException(status_code=503, detail="Network not initialized")
    
    start_time = time.time()
    
    solutions = solve_direct_routes(
        origin=request.origin.address,
        destination=request.destination.address,
        origin_lat=request.origin.lat,
        origin_lng=request.origin.lng,
        dest_lat=request.destination.lat,
        dest_lng=request.destination.lng,
        vehicle_id=request.vehicle_type,
        load_tonnes=request.load_tonnes,
        priority=request.priority,
    )
    
    # Reuse formatting logic or call optimize_route internal helper
    # For brevity, we implement the solution mapping here
    route_solutions = []
    for sol in solutions:
        segments = [
            RouteSegment(
                from_city=s["from_city"],
                to_city=s["to_city"],
                distance_km=s["distance_km"],
                time_minutes=s["time_minutes"],
                mode=s["mode"],
                co2_kg=s["co2_kg"],
                cost_inr=s["cost_inr"],
                geometry=s.get("geometry")
            )
            for s in sol["segments"]
        ]
        route_solutions.append(RouteSolution(
            id=sol["id"],
            segments=segments,
            total_distance_km=sol["total_distance_km"],
            total_time_minutes=sol["total_time_minutes"],
            total_co2_kg=sol["total_co2_kg"],
            total_cost_inr=sol["total_cost_inr"],
            green_score=sol["green_score"],
            vehicle_type=sol["vehicle_type"],
            modes_used=sol["modes_used"],
            strategy=sol.get("strategy"),
            is_fastest=sol.get("is_fastest"),
            is_greenest=sol.get("is_greenest"),
        ))
    
    return ParetoFront(
        solutions=route_solutions,
        best_cost=min(route_solutions, key=lambda s: s.total_cost_inr) if route_solutions else None,
        best_green=min(route_solutions, key=lambda s: s.total_co2_kg) if route_solutions else None,
        origin=request.origin.address,
        destination=request.destination.address
    )


@app.get("/api/geocode/suggest")
async def geocode_suggest(
    q: str = Query(..., min_length=2),
    limit: int = Query(8, ge=1, le=20),
):
    # Use cached geocode function to improve latency for address suggestions
    results = search_places_async(q, limit=limit)
    return {"results": results}


@app.get("/api/geocode/reverse")
async def geocode_reverse(
    lat: float = Query(...),
    lng: float = Query(...),
):
    result = reverse_geocode_async(lat, lng)
    if not result:
        raise HTTPException(status_code=404, detail="Address not found")
    return result


@app.post("/api/optimize/fast", response_model=ParetoFront)
async def optimize_fast(request: schemas.RouteDataRequest):
    """
    Fast optimizer for coordinate-accurate origin/destination.
    Uses OSRM alternatives to generate 1..N road routes quickly and ranks them.
    """
    def resolve_coords(location: schemas.LocationCoord):
        if location.lat is not None and location.lng is not None:
            return float(location.lat), float(location.lng)

        results = search_places_async(location.address, limit=1)
        if not results:
            raise HTTPException(status_code=400, detail=f"Could not geocode address: {location.address}")

        first = results[0]
        lat = first.get("lat")
        lng = first.get("lng")
        if lat is None or lng is None:
            raise HTTPException(status_code=400, detail=f"Could not geocode address: {location.address}")
        return float(lat), float(lng)

    origin_lat, origin_lng = resolve_coords(request.origin)
    dest_lat, dest_lng = resolve_coords(request.destination)

    solutions = solve_direct_routes(
        origin=request.origin.address,
        destination=request.destination.address,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        vehicle_id=request.vehicle_type,
        load_tonnes=request.load_tonnes,
        priority=request.priority,
        max_solutions=5,
    )

    # Map to response models
    route_solutions = []
    for sol in solutions:
        segments = [
            RouteSegment(
                from_city=s["from_city"],
                to_city=s["to_city"],
                distance_km=s["distance_km"],
                time_minutes=s["time_minutes"],
                mode=s["mode"],
                co2_kg=s["co2_kg"],
                cost_inr=s["cost_inr"],
                geometry=s.get("geometry")
            )
            for s in sol["segments"]
        ]
        route_solutions.append(RouteSolution(
            id=sol["id"],
            segments=segments,
            total_distance_km=sol["total_distance_km"],
            total_time_minutes=sol["total_time_minutes"],
            total_co2_kg=sol["total_co2_kg"],
            total_cost_inr=sol["total_cost_inr"],
            green_score=sol["green_score"],
            vehicle_type=sol["vehicle_type"],
            modes_used=sol["modes_used"],
            strategy=sol.get("strategy"),
            is_fastest=sol.get("is_fastest"),
            is_greenest=sol.get("is_greenest"),
        ))

    return ParetoFront(
        solutions=route_solutions,
        best_cost=min(route_solutions, key=lambda s: s.total_cost_inr) if route_solutions else None,
        best_green=min(route_solutions, key=lambda s: s.total_co2_kg) if route_solutions else None,
        origin=request.origin.address,
        destination=request.destination.address,
    )


@app.get("/api/network", response_model=NetworkResponse)
async def get_network():
    """Return the logistics network (cities and routes)."""
    if network_graph is None:
        raise HTTPException(status_code=503, detail="Network not initialized")
    
    data = get_network_data(network_graph)
    
    nodes = [NetworkNode(**n) for n in data["nodes"]]
    edges = [NetworkEdge(**e) for e in data["edges"]]
    
    return NetworkResponse(nodes=nodes, edges=edges)


@app.get("/api/demand-forecast", response_model=DemandForecastResponse)
async def demand_forecast():
    """Return LSTM demand predictions for all cities."""
    forecasts = get_demand_forecast()
    
    items = [DemandForecastItem(**f) for f in forecasts]
    
    return DemandForecastResponse(
        forecasts=items,
        forecast_days=7,
    )


@app.get("/api/vehicles", response_model=list[VehicleInfo])
async def list_vehicles():
    """Return available vehicle types with specs."""
    vehicles = get_all_vehicles()
    return [
        VehicleInfo(
            id=v["id"],
            name=v["name"],
            fuel_type=v["fuel_type"],
            emission_kg_per_km=v["emission_kg_per_km"],
            max_payload_tonnes=v["max_payload_tonnes"],
            avg_speed_kmh=v["avg_speed_kmh"],
            cost_per_km_inr=v["cost_per_km_inr"],
        )
        for v in vehicles
    ]


@app.get("/api/carbon-intensity", response_model=CarbonIntensityResponse)
async def carbon_intensity():
    """Return live grid carbon intensity from UK API."""
    data = await get_current_intensity()
    
    return CarbonIntensityResponse(
        current_intensity=data["intensity"],
        forecast=str(data["forecast"]),
        index=data["index"],
        timestamp=data["timestamp"],
    )

# Database initialization moved into the lifespan handler above.


# ─── New Fleet Contracts API ──────────────────────────────

@app.get("/api/contracts")
async def get_contracts():
    import data.database as db
    return {"contracts": db.get_all_contracts()}

@app.post("/api/contracts")
async def create_contract(contract: schemas.ContractCreate):
    import data.database as db
    try:
        cid = db.add_contract(
            origin=contract.origin,
            destination=contract.destination,
            vehicle_type=contract.vehicle_type,
            fixed_cost_inr=contract.fixed_cost_inr,
            expiry_date=contract.expiry_date,
            contract_type=contract.contract_type
        )
        return {"id": cid, "message": "Contract added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/contracts/{contract_id}")
async def delete_contract(contract_id: int):
    import data.database as db
    db.delete_contract(contract_id)
    return {"message": "Contract deleted successfully"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
