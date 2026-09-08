"""
Debug script to validate time, cost, and CO2 calculations.
Run this to see what values the system is producing for a test route.
"""

import sys
sys.path.insert(0, '.')

from data.emission_factors import calculate_segment_co2, calculate_segment_cost, copert_fuel_consumption
from data.route_service import get_route_alternatives, _haversine
from models.vehicle import get_vehicle
import json

print("=" * 80)
print("EcoKernel Calculation Debug Script")
print("=" * 80)

# Test 1: COPERT Fuel Consumption at Different Speeds
print("\n1. FUEL CONSUMPTION (COPERT) - Diesel HGV")
print("-" * 60)
test_speeds = [20, 45, 60, 80]
for speed in test_speeds:
    fc = copert_fuel_consumption(speed, "diesel_hgv")
    print(f"  Speed {speed:2d} km/h → {fc:7.1f} g/km fuel consumption")

# Test 2: CO2 Calculation for Known Route
print("\n2. CO2 CALCULATION - Mumbai to Pune (60 km test)")
print("-" * 60)
distance_km = 60.0
speeds = [40, 50, 60]
load_tonnes = 10.0

for speed in speeds:
    co2 = calculate_segment_co2(
        distance_km=distance_km,
        fuel_type="euro6_diesel",
        speed_kmh=speed,
        gradient_percent=0.0,
        load_tonnes=load_tonnes,
        max_payload_tonnes=16.0,
        is_rail=False,
    )
    print(f"  Distance {distance_km} km @ {speed} km/h, {load_tonnes}T load → {co2:.2f} kg CO₂")

# Test 3: Load Factor Impact
print("\n3. LOAD FACTOR IMPACT - 100 km route @ 50 km/h")
print("-" * 60)
test_loads = [0, 5, 10, 15, 16]
for load in test_loads:
    co2 = calculate_segment_co2(
        distance_km=100.0,
        fuel_type="euro6_diesel",
        speed_kmh=50.0,
        gradient_percent=0.0,
        load_tonnes=load,
        max_payload_tonnes=16.0,
    )
    print(f"  Load {load:2d}T / 16T capacity → {co2:7.2f} kg CO₂")

# Test 4: Cost Calculation
print("\n4. COST CALCULATION - Various Routes")
print("-" * 60)
test_distances = [50, 100, 250, 500]
for dist in test_distances:
    cost = calculate_segment_cost(
        distance_km=dist,
        mode="road",
        fuel_type="euro6_diesel",
        from_city=None,  # No contract
        to_city=None,
        vehicle_type="ashok_leyland_euro6",
    )
    cost_per_km = cost / dist
    print(f"  {dist:3d} km route → ₹{cost:8.0f} (₹{cost_per_km:.1f}/km)")

# Test 5: Time/Speed Relationships
print("\n5. TIME-SPEED VALIDATION")
print("-" * 60)
print("  Distance: 300 km (Mumbai to Goa typical)")
distances = [100, 300, 500]
for dist in distances:
    avg_speeds = [40, 50, 60]
    for speed in avg_speeds:
        time_hours = dist / speed
        time_minutes = time_hours * 60
        print(f"  {dist}km @ {speed} km/h → {time_minutes:.0f} minutes ({time_hours:.1f} hours)")
    print()

# Test 6: Real OSRM Route Check
print("\n6. REAL OSRM ROUTE TEST - Mumbai to Pune")
print("-" * 60)
try:
    origin_coords = [72.8777, 19.0760]  # Mumbai [lng, lat]
    dest_coords = [73.8567, 18.5204]    # Pune
    
    routes = get_route_alternatives(origin_coords, dest_coords, max_alternatives=3)
    
    print(f"  Found {len(routes)} route(s)")
    for idx, route in enumerate(routes, 1):
        dist = route.get("distance_km", 0)
        time = route.get("time_minutes", 0)
        avg_speed = (dist / (time / 60)) if time > 0 else 0
        source = route.get("source", "unknown")
        
        print(f"\n  Route {idx} ({source}):")
        print(f"    Distance: {dist} km")
        print(f"    Time: {time} minutes ({time/60:.1f} hours)")
        print(f"    Avg Speed: {avg_speed:.1f} km/h")
        
        # Calculate CO2 for this route
        co2 = calculate_segment_co2(
            distance_km=dist,
            fuel_type="euro6_diesel",
            speed_kmh=avg_speed,
            load_tonnes=10.0,
            max_payload_tonnes=16.0,
        )
        print(f"    CO₂ Estimate: {co2:.2f} kg")
        
        # Calculate cost
        cost = calculate_segment_cost(
            distance_km=dist,
            mode="road",
            fuel_type="euro6_diesel",
        )
        print(f"    Cost Estimate: ₹{cost:.0f}")
        
except Exception as e:
    print(f"  Error fetching routes: {e}")

# Test 7: Vehicle Specs
print("\n7. VEHICLE SPECIFICATIONS")
print("-" * 60)
vehicle = get_vehicle("ashok_leyland_euro6")
if vehicle:
    print(f"  Name: {vehicle.get('name')}")
    print(f"  Fuel Type: {vehicle.get('fuel_type')}")
    print(f"  Max Payload: {vehicle.get('max_payload_tonnes')} tonnes")
    print(f"  Avg Speed: {vehicle.get('avg_speed_kmh')} km/h")
    print(f"  Cost/km: ₹{vehicle.get('cost_per_km_inr')}")
else:
    print("  Vehicle not found!")

print("\n" + "=" * 80)
print("Debug Complete!")
print("=" * 80)
print("\nNotes:")
print("- If CO2 values seem very low, check COPERT coefficients and fuel densities")
print("- If costs seem low, check cost_per_km in config.py")
print("- If times are unrealistic, check OSRM connectivity")
print("- Compare these values against known real-world data for your routes")
