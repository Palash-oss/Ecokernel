"""
Real vehicle specifications for Indian logistics fleet.

Sources:
- Tata Motors commercial vehicle specs
- Ashok Leyland fleet data
- BharatBenz technical specs
- Indian Railways freight statistics
"""


VEHICLES = {
    "tata_ace_ev": {
        "id": "tata_ace_ev",
        "name": "Tata Ace EV",
        "fuel_type": "electric",
        "emission_kg_per_km": 0.0,  # Zero tailpipe
        "max_payload_tonnes": 0.6,
        "avg_speed_kmh": 40,
        "cost_per_km_inr": 8.0,  # Electricity cost
        "range_km": 154,
        "battery_kwh": 21.3,
    },
    "ashok_leyland_euro6": {
        "id": "ashok_leyland_euro6",
        "name": "Ashok Leyland 1920 (Euro 6)",
        "fuel_type": "euro6_diesel",
        "emission_kg_per_km": 0.168,
        "max_payload_tonnes": 16.0,
        "avg_speed_kmh": 55,
        "cost_per_km_inr": 38.0,
        "range_km": 800,
        "tank_litres": 300,
    },
    "bharatbenz_1617r": {
        "id": "bharatbenz_1617r",
        "name": "BharatBenz 1617R (Euro 4)",
        "fuel_type": "euro4_diesel",
        "emission_kg_per_km": 0.231,
        "max_payload_tonnes": 16.2,
        "avg_speed_kmh": 50,
        "cost_per_km_inr": 42.0,
        "range_km": 750,
        "tank_litres": 280,
    },
    "tata_signa_cng": {
        "id": "tata_signa_cng",
        "name": "Tata Signa 1918.T CNG",
        "fuel_type": "cng",
        "emission_kg_per_km": 0.146,
        "max_payload_tonnes": 12.0,
        "avg_speed_kmh": 50,
        "cost_per_km_inr": 28.0,
        "range_km": 600,
        "tank_kg": 160,
    },
    "eicher_pro_petrol": {
        "id": "eicher_pro_petrol",
        "name": "Eicher Pro 2049 (Petrol)",
        "fuel_type": "petrol",
        "emission_kg_per_km": 0.174,
        "max_payload_tonnes": 5.0,
        "avg_speed_kmh": 55,
        "cost_per_km_inr": 32.0,
        "range_km": 500,
        "tank_litres": 120,
    },
    "rail_freight": {
        "id": "rail_freight",
        "name": "Indian Railways Freight",
        "fuel_type": "rail_freight",
        "emission_kg_per_km": 0.028,  # per tonne-km
        "max_payload_tonnes": 60.0,
        "avg_speed_kmh": 35,
        "cost_per_km_inr": 18.0,
        "range_km": 3000,
        "wagons": 42,
    },
}


def get_vehicle(vehicle_id: str) -> dict:
    """Get vehicle specs by ID. Falls back to Euro 6 diesel."""
    return VEHICLES.get(vehicle_id, VEHICLES["ashok_leyland_euro6"])


def get_all_vehicles() -> list:
    """Return all vehicle specs as a list."""
    return list(VEHICLES.values())
