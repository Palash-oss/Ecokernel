"""
EcoKernel — FastAPI Backend

AI-driven green logistics optimization engine for India.
Provides real-time route optimization, demand forecasting,
and environmental impact analysis.
"""

from fastapi import FastAPI, HTTPException
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
from engine.gvrp_solver import solve_gvrp
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
    
    # Validate cities
    from config import CITIES
    if request.origin not in CITIES:
        raise HTTPException(status_code=400, detail=f"Unknown origin: {request.origin}")
    if request.destination not in CITIES:
        raise HTTPException(status_code=400, detail=f"Unknown destination: {request.destination}")
    if request.origin == request.destination:
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

@app.on_event("startup")
async def startup_event_db():
    import data.database as db
    db.init_db()


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
