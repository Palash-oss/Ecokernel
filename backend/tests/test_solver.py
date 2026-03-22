"""
Unit tests for EcoKernel backend.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import numpy as np


class TestEmissionFactors:
    """Test the DEFRA/COPERT emission models."""
    
    def test_copert_speed_multiplier_congestion(self):
        from data.emission_factors import copert_speed_multiplier
        # Low speed (congestion) should have higher multiplier
        low_speed = copert_speed_multiplier(15.0)
        optimal_speed = copert_speed_multiplier(60.0)
        assert low_speed > optimal_speed, "Congestion should increase emissions"
    
    def test_copert_speed_multiplier_highway(self):
        from data.emission_factors import copert_speed_multiplier
        # Very high speed should also increase
        high_speed = copert_speed_multiplier(100.0)
        optimal_speed = copert_speed_multiplier(60.0)
        assert high_speed > optimal_speed, "Very high speed should increase emissions"
    
    def test_gradient_multiplier_uphill(self):
        from data.emission_factors import gradient_multiplier
        uphill = gradient_multiplier(5.0)
        flat = gradient_multiplier(0.0)
        assert uphill > flat, "Uphill should increase emissions"
    
    def test_gradient_multiplier_downhill(self):
        from data.emission_factors import gradient_multiplier
        downhill = gradient_multiplier(-5.0)
        flat = gradient_multiplier(0.0)
        assert downhill < flat, "Downhill should decrease emissions"
    
    def test_segment_co2_positive(self):
        from data.emission_factors import calculate_segment_co2
        co2 = calculate_segment_co2(
            distance_km=100,
            fuel_type="euro6_diesel",
            speed_kmh=50,
        )
        assert co2 > 0, "CO₂ should be positive for diesel"
    
    def test_segment_co2_electric_zero(self):
        from data.emission_factors import calculate_segment_co2
        co2 = calculate_segment_co2(
            distance_km=100,
            fuel_type="electric",
            speed_kmh=40,
        )
        assert co2 == 0.0, "EV should have zero direct emissions"
    
    def test_segment_co2_rail_lower(self):
        from data.emission_factors import calculate_segment_co2
        road_co2 = calculate_segment_co2(
            distance_km=500,
            fuel_type="euro6_diesel",
            speed_kmh=50,
            load_tonnes=10,
        )
        rail_co2 = calculate_segment_co2(
            distance_km=500,
            fuel_type="rail_freight",
            speed_kmh=35,
            load_tonnes=10,
            is_rail=True,
        )
        assert rail_co2 < road_co2, "Rail should emit less than road"


class TestGreenScore:
    """Test the Green Score calculation."""
    
    def test_green_score_range(self):
        from engine.green_score import calculate_green_score
        score = calculate_green_score(
            total_co2_kg=50.0,
            total_distance_km=500.0,
        )
        assert 0 <= score <= 100, f"Green score {score} out of range"
    
    def test_zero_emission_perfect_score(self):
        from engine.green_score import calculate_green_score
        score = calculate_green_score(
            total_co2_kg=0.0,
            total_distance_km=500.0,
        )
        assert score == 100.0, "Zero emissions should give perfect score"
    
    def test_high_emission_low_score(self):
        from engine.green_score import calculate_green_score
        score = calculate_green_score(
            total_co2_kg=300.0,
            total_distance_km=500.0,
        )
        assert score < 50, "High emissions should give low score"


class TestNetwork:
    """Test the Indian logistics network."""
    
    def test_network_has_cities(self):
        from data.network import build_network
        G = build_network()
        assert G.number_of_nodes() >= 15, "Should have at least 15 cities"
    
    def test_network_has_edges(self):
        from data.network import build_network
        G = build_network()
        assert G.number_of_edges() > 0, "Should have route edges"
    
    def test_network_connectivity(self):
        import networkx as nx
        from data.network import build_network
        G = build_network()
        assert nx.is_connected(G), "Network should be connected"
    
    def test_mumbai_delhi_route(self):
        from data.network import build_network
        import networkx as nx
        G = build_network()
        assert nx.has_path(G, "Mumbai", "Delhi"), "Mumbai-Delhi should be reachable"


class TestSolver:
    """Test the GVRP solver."""
    
    def test_solver_returns_solutions(self):
        from data.network import build_network
        from engine.gvrp_solver import solve_gvrp
        G = build_network()
        solutions = solve_gvrp(
            G=G,
            origin="Mumbai",
            destination="Delhi",
            max_solutions=5,
        )
        assert len(solutions) > 0, "Solver should return at least one solution"
    
    def test_solver_solution_structure(self):
        from data.network import build_network
        from engine.gvrp_solver import solve_gvrp
        G = build_network()
        solutions = solve_gvrp(
            G=G,
            origin="Mumbai",
            destination="Delhi",
            max_solutions=3,
        )
        sol = solutions[0]
        assert "total_cost_inr" in sol
        assert "total_co2_kg" in sol
        assert "green_score" in sol
        assert "segments" in sol
        assert sol["total_co2_kg"] >= 0
        assert 0 <= sol["green_score"] <= 100


class TestVehicles:
    """Test vehicle data."""
    
    def test_all_vehicles_present(self):
        from models.vehicle import get_all_vehicles
        vehicles = get_all_vehicles()
        assert len(vehicles) >= 5, "Should have at least 5 vehicle types"
    
    def test_electric_zero_emission(self):
        from models.vehicle import get_vehicle
        ev = get_vehicle("tata_ace_ev")
        assert ev["emission_kg_per_km"] == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
