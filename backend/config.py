"""
EcoKernel Configuration — Real-world data constants.

Sources:
- DEFRA 2024 GHG Conversion Factors (UK Gov)
- COPERT speed-emission methodology (EU standard)
- Real GPS coordinates for Indian logistics hubs
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── API Keys ───────────────────────────────────────────────
ORS_API_KEY = os.getenv("ORS_API_KEY", "")

# ─── Indian Logistics Hubs (real GPS coordinates) ──────────
CITIES = {
    "Mumbai":         {"lat": 19.0760, "lng": 72.8777, "region": "West"},
    "Delhi":          {"lat": 28.7041, "lng": 77.1025, "region": "North"},
    "Bangalore":      {"lat": 12.9716, "lng": 77.5946, "region": "South"},
    "Chennai":        {"lat": 13.0827, "lng": 80.2707, "region": "South"},
    "Hyderabad":      {"lat": 17.3850, "lng": 78.4867, "region": "South"},
    "Kolkata":        {"lat": 22.5726, "lng": 88.3639, "region": "East"},
    "Pune":           {"lat": 18.5204, "lng": 73.8567, "region": "West"},
    "Ahmedabad":      {"lat": 23.0225, "lng": 72.5714, "region": "West"},
    "Jaipur":         {"lat": 26.9124, "lng": 75.7873, "region": "North"},
    "Lucknow":        {"lat": 26.8467, "lng": 80.9462, "region": "North"},
    "Nagpur":         {"lat": 21.1458, "lng": 79.0882, "region": "Central"},
    "Indore":         {"lat": 22.7196, "lng": 75.8577, "region": "Central"},
    "Bhopal":         {"lat": 23.2599, "lng": 77.4126, "region": "Central"},
    "Visakhapatnam":  {"lat": 17.6868, "lng": 83.2185, "region": "East"},
    "Coimbatore":     {"lat": 11.0168, "lng": 76.9558, "region": "South"},
    "Surat":          {"lat": 21.1702, "lng": 72.8311, "region": "West"},
    "Kanpur":         {"lat": 26.4499, "lng": 80.3319, "region": "North"},
    "Patna":          {"lat": 25.5941, "lng": 85.1376, "region": "East"},
    "Kochi":          {"lat": 9.9312, "lng": 76.2673, "region": "South"},
    "Guwahati":       {"lat": 26.1445, "lng": 91.7362, "region": "East"},
    "Chandigarh":     {"lat": 30.7333, "lng": 76.7794, "region": "North"},
    "Nashik":         {"lat": 19.9975, "lng": 73.7898, "region": "West"},
    "Vijayawada":     {"lat": 16.5062, "lng": 80.6480, "region": "South"},
    "Ludiana":        {"lat": 30.9010, "lng": 75.8573, "region": "North"},
}

# ─── Rail Corridors (major Indian freight routes) ──────────
RAIL_CORRIDORS = [
    ("Mumbai", "Delhi"),
    ("Delhi", "Kolkata"),
    ("Mumbai", "Chennai"),
    ("Chennai", "Bangalore"),
    ("Delhi", "Jaipur"),
    ("Mumbai", "Pune"),
    ("Mumbai", "Ahmedabad"),
    ("Hyderabad", "Bangalore"),
    ("Nagpur", "Mumbai"),
    ("Delhi", "Lucknow"),
    ("Kolkata", "Visakhapatnam"),
    ("Chennai", "Coimbatore"),
    ("Bhopal", "Nagpur"),
    ("Indore", "Bhopal"),
    ("Mumbai", "Surat"),
    ("Delhi", "Kanpur"),
    ("Kanpur", "Patna"),
    ("Patna", "Kolkata"),
    ("Bangalore", "Kochi"),
    ("Chennai", "Vijayawada"),
    ("Delhi", "Chandigarh"),
    ("Chandigarh", "Ludiana"),
    ("Mumbai", "Nashik"),
    ("Lucknow", "Guwahati"),
]

# ─── DEFRA 2024 Emission Factors (kg CO₂/km) ──────────────
# Source: UK DESNZ Greenhouse Gas Reporting Conversion Factors 2024
DEFRA_EMISSION_FACTORS = {
    "electric":      0.0,        # Zero direct tailpipe emissions
    "euro6_diesel":  0.168,      # Euro 6 compliant diesel HGV
    "euro4_diesel":  0.231,      # Older Euro 4 diesel
    "petrol":        0.174,      # Petrol light commercial
    "cng":           0.146,      # Compressed Natural Gas
    "hgv_artic":     0.887,      # Articulated Heavy Goods Vehicle
    "hgv_rigid":     0.512,      # Rigid Heavy Goods Vehicle
    "rail_freight":  0.028,      # kg CO₂ per tonne-km (Indian Railways avg)
}

# ─── COPERT Speed-Emission Curve Coefficients ──────────────
# FC(v) = a + b*v + c*v² + d/v (g/km as function of speed km/h)
# These approximate COPERT curves for diesel HGVs
COPERT_COEFFICIENTS = {
    "diesel_hgv": {"a": 350.0, "b": -6.0, "c": 0.06, "d": 2500.0},
    "petrol_lcv": {"a": 180.0, "b": -3.5, "c": 0.035, "d": 1200.0},
    "cng_truck":  {"a": 280.0, "b": -5.0, "c": 0.05, "d": 2000.0},
}

# ─── Transport Modes ───────────────────────────────────────
TRANSPORT_MODES = {
    "road": {
        "avg_speed_kmh": 45,
        "cost_per_km": 35.0,   # INR per km (Indian trucking avg)
        "emission_multiplier": 1.0,
    },
    "rail": {
        "avg_speed_kmh": 35,
        "cost_per_km": 18.0,   # INR per km (Indian rail freight avg)
        "emission_multiplier": 0.15,  # Rail emits ~85% less than road
    },
    "multimodal": {
        "avg_speed_kmh": 38,
        "cost_per_km": 25.0,
        "emission_multiplier": 0.5,
    },
}

# ─── GA Solver Parameters ──────────────────────────────────
GA_POPULATION_SIZE = 100
GA_GENERATIONS = 80
GA_CROSSOVER_PROB = 0.8
GA_MUTATION_PROB = 0.2

# ─── Gradient Impact ───────────────────────────────────────
# 2% increase in emissions per 1% uphill grade
GRADIENT_EMISSION_FACTOR = 0.02

# ─── Load Factor ───────────────────────────────────────────
# Empty truck emits ~60% of a fully loaded truck
EMPTY_LOAD_RATIO = 0.6

# ─── Carbon Intensity API ─────────────────────────────────
CARBON_INTENSITY_API_URL = "https://api.carbonintensity.org.uk"
