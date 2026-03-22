# EcoKernel

## The Context
Global logistics is currently responsible for approximately **11% of global greenhouse gas emissions**. Standard Supply Chain Management (SCM) software utilizes "Shortest-Path" or "Least-Cost" algorithms (like Dijkstra’s or basic Linear Programming) to move goods. While economically efficient, these models ignore environmental variables such as vehicle emission ratings, fuel consumption spikes during traffic congestion, and the carbon intensity of different transport modes (Air vs. Rail vs. Road).

## The Gap (The Problem)
There is a lack of an **integrated, prescriptive system** that can perform **Multi-Objective Optimization (MOO)** to balance two conflicting goals:
1. **Cost/Time Efficiency:** Meeting delivery SLAs (Service Level Agreements).
2. **Carbon Neutrality:** Minimizing the total $CO_2$ footprint of the entire delivery lifecycle.

Current systems are "Reactive" (reporting emissions after the trip) rather than **"Prescriptive"** (calculating the greenest route before the trip starts).

## The Objective
EcoKernel is an AI-driven orchestration engine consisting of:

* **A Predictive Module:** A Recurrent Neural Network (RNN/LSTM) to forecast regional product demand, reducing "Empty Miles" and urgent, high-emission air freights.
* **A Prescriptive Optimizer:** A Meta-heuristic algorithm capable of solving a **Green Vehicle Routing Problem (GVRP)**. This factors in:
  * Vehicle fuel type (Electric, Euro 6 Diesel, etc.).
  * Dynamic route gradients and traffic-induced idling.
  * Multi-modal shifting (switching from truck to rail where possible).
* **An Interactive Decision Interface:** A real-time dashboard that visualizes the "Pareto Front"—the set of optimal solutions where the user can choose the best trade-off between "Fastest Delivery" and "Lowest Carbon."

## Tech Stack
* **Frontend:** React, Vite, ShaderGradient, Map overlays
* **Backend:** Python, FastAPI, GVRP Solvers, Prediction Engines (RNN/LSTM)
* **Data Integration:** Google Maps API (traffic/routing), Carbon Intensity APIs

## Getting Started

### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. Start the FastAPI server: `uvicorn main:app --reload`

### Frontend
1. `cd frontend`
2. `npm install`
3. Start the Vite development server: `npm run dev`

## Core Modules
- `backend/engine/demand_forecast.py`: Generates RNN/LSTM demand predictions.
- `backend/engine/gvrp_solver.py`: Meta-heuristic optimizer for routing.
- `backend/engine/green_score.py`: Computes the Green Score for generated routes.
- `frontend/src/components/`: The React components for our interactive decision interface and Pareto Front chart.
