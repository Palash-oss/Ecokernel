import pytest
import asyncio
from engine.copilot_engine import copilot_engine
from data.importer import import_custom_network, export_network_data

@pytest.mark.asyncio
async def test_copilot_engine():
    res = await copilot_engine.generate_response(
        user_message="How do I reduce Scope 3 emissions for heavy freight trucks?",
        active_route={"total_distance_km": 450, "total_co2_kg": 75, "total_cost_inr": 2500, "vehicle_type": "euro6_diesel"},
        active_priority=0.7
    )
    assert res is not None
    assert "response" in res
    assert "engine" in res
    assert len(res["response"]) > 10

@pytest.mark.asyncio
async def test_importer():
    sample_nodes = [
        {"name": "Berlin Hub", "lat": 52.52, "lng": 13.405, "region": "Europe", "capacity_tons": 500},
        {"name": "Hamburg Port", "lat": 53.551, "lng": 9.993, "region": "Europe", "capacity_tons": 1000}
    ]
    sample_edges = [
        {"from_city": "Berlin Hub", "to_city": "Hamburg Port", "has_rail": True}
    ]
    
    result = await import_custom_network(sample_nodes, sample_edges, reset_existing=True)
    assert result["success"] is True
    assert result["nodes_added"] == 2
    assert result["edges_added"] == 1
    
    exported = export_network_data()
    assert len(exported["nodes"]) == 2
    assert len(exported["edges"]) == 1
