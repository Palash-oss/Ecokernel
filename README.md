# EcoKernel

EcoKernel is a green logistics optimization platform for route planning in India. It balances cost and carbon emissions, supports multiple route alternatives, and provides an interactive dashboard for decision-making.

## What This Project Does

EcoKernel combines:

1. **Prescriptive route optimization** (before shipment starts)
2. **CO2-aware scoring and comparison** of alternatives
3. **Address-first routing** with road geometry
4. **Vehicle-aware costing and emission modeling**
5. **Demand forecasting** with an LSTM module
6. **Contract-aware lane pricing** for enterprise freight corridors

## Current Architecture

### Frontend

- React + Vite dashboard
- Map visualization for selected route geometry
- Route options panel (fastest, greenest, balanced)
- Emissions report and contract management views

Main frontend entry:

- `frontend/src/App.jsx`

### Backend

- FastAPI API server
- NSGA-II based optimization engine for multi-objective routing
- Direct route optimizer for address-to-address flows
- Geocoding, routing, emissions, demand forecasting, and contracts subsystems

Main backend entry:

- `backend/main.py`

## Tech Stack

### Frontend

- React 19
- Vite
- Axios
- Leaflet / React-Leaflet
- Framer Motion
- Chart.js
- Three.js ecosystem

### Backend

- Python
- FastAPI + Uvicorn
- NetworkX
- DEAP (genetic optimization)
- PyTorch (LSTM forecast)
- SQLite (contracts)
- httpx / requests
- OpenRouteService + OSRM (routing)

## Algorithms and Optimization Logic

### 1) Multi-Objective Optimizer (NSGA-II)

File: `backend/engine/gvrp_solver.py`

- Uses DEAP with NSGA-II style nondominated selection
- Optimizes two objectives:
  - Total transport cost (INR)
  - Total CO2 emissions (kg)
- Supports road, rail, and multimodal segments in graph-based flows
- Includes disruption penalties and route-length penalties

### 2) Fast Address-First Optimizer

File: `backend/engine/gvrp_solver.py` (`solve_direct_routes`)

- Uses road alternatives from routing service
- Computes per-route distance, time, cost, and CO2
- Ranks by user priority (cost-vs-green weighting)
- Returns route strategy labels:
  - `fastest`
  - `greenest`
  - `balanced`

### 3) Routing Engine and Fallbacks

File: `backend/data/route_service.py`

Routing order:

1. ORS (`driving-hgv`) if key is configured
2. Public OSRM route API
3. Haversine-based estimate fallback

For alternatives:

- Requests OSRM alternatives
- If OSRM returns only one path, synthetic variants are generated to preserve 2-3 options for comparison

### 4) Emission Model

File: `backend/data/emission_factors.py`

- COPERT speed-based fuel-consumption curve
- Load factor and gradient multipliers
- Fuel-specific conversion into CO2
- Optional cold-start penalty
- Low-speed idling adjustment
- Rail handled with tonne-km approach

### 5) Green Score

File: `backend/engine/green_score.py`

- Converts route CO2 to a 0-100 score
- Uses worst-case vs best-case normalization baseline

### 6) Demand Forecasting

File: `backend/engine/demand_forecast.py`

- Lightweight LSTM built in PyTorch
- Trained on generated demand sequences with weekly/seasonal signals
- Integrates live holiday signals (Nager.Date API)
- Returns historical + forward demand points

## Contracts and Pricing Logic

Files:

- `backend/data/database.py`
- `backend/data/emission_factors.py`
- `frontend/src/components/ContractManager.jsx`

Behavior:

- Contracts are stored in SQLite
- Cost override applies only on exact `(origin, destination, vehicle_type)` match and non-expired contract
- Demo/pre-seeded contracts are marked and excluded from live discounted pricing
- Spot pricing is used when no active real contract match exists

## API Endpoints

Core endpoints in `backend/main.py`:

### Health and metadata

- `GET /api/health`
- `GET /api/network`
- `GET /api/vehicles`

### Routing and optimization

- `POST /api/optimize`
- `POST /api/v1/route-data`
- `POST /api/optimize/fast`

### Geocoding

- `GET /api/geocode/suggest`
- `GET /api/geocode/reverse`

### Forecast and carbon

- `GET /api/demand-forecast`
- `GET /api/carbon-intensity`

### Contracts

- `GET /api/contracts`
- `POST /api/contracts`
- `DELETE /api/contracts/{contract_id}`

## Project Structure (Important Files)

### Backend

- `backend/main.py`: FastAPI app + route handlers
- `backend/config.py`: constants, city graph settings, emission coefficients
- `backend/data/network.py`: logistics network creation + live weather disruption effects
- `backend/data/route_service.py`: ORS/OSRM routing and alternative generation
- `backend/data/geocode_service.py`: place suggest + reverse geocode with cache
- `backend/data/emission_factors.py`: CO2 and cost calculations
- `backend/data/database.py`: contracts persistence and lookup
- `backend/engine/gvrp_solver.py`: NSGA-II + direct route solver
- `backend/engine/demand_forecast.py`: LSTM demand forecast engine
- `backend/engine/green_score.py`: normalized green score
- `backend/models/schemas.py`: request/response schema contracts
- `backend/models/vehicle.py`: fleet and vehicle specs

### Frontend

- `frontend/src/App.jsx`: app composition and view routing
- `frontend/src/api/client.js`: backend API client wrappers
- `frontend/src/components/Controls.jsx`: mission input (origin/destination/vehicle/load/priority)
- `frontend/src/components/MapView.jsx`: map rendering and route geometry
- `frontend/src/components/RouteList.jsx`: alternative route options
- `frontend/src/components/RoutePanel.jsx`: selected-route metrics and segment breakdown
- `frontend/src/components/EmissionsReport.jsx`: emissions analytics view
- `frontend/src/components/ContractManager.jsx`: contract create/list/delete UI

## Setup and Run

## Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

or

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Optional variables:

- `ORS_API_KEY` for OpenRouteService priority routing
- `PORT` for backend server port (default: `8001`)
- `VITE_API_BASE_URL` for frontend API base (default: `http://127.0.0.1:8001/api`)

If not set, app falls back to public OSRM and then estimate mode.

## Current Notes and Limitations

1. CSV bulk upload in contracts UI is currently a placeholder interaction (not a full parser pipeline yet).
2. Route alternatives can include synthetic variants when upstream APIs provide only one route.
3. Carbon intensity endpoint currently uses a simulator profile in `carbon_api.py`.
4. Geocoding and routing depend on public endpoints if ORS key is absent.

## Why This README Was Updated

The project no longer reflects an older Google Maps-first architecture. Current implementation is OSM/ORS/OSRM based, address-first in the fast path, and includes updated route option strategy labels and stricter contract pricing behavior.
