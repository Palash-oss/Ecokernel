import pytest
import asyncio
from data.environmental_service import fetch_elevation_profile, fetch_weather_impact
from engine.audit_reporter import generate_carbon_audit_certificate

@pytest.mark.asyncio
async def test_environmental_service():
    waypoints = [(19.076, 72.877), (19.5, 73.2), (20.1, 74.0)]
    elevation = await fetch_elevation_profile(waypoints)
    assert elevation is not None
    assert "total_climb_m" in elevation
    assert "avg_gradient_percent" in elevation

    weather = await fetch_weather_impact(19.076, 72.877)
    assert "temperature_c" in weather
    assert "ev_temp_penalty" in weather

def test_audit_certificate():
    cert = generate_carbon_audit_certificate(
        origin="Mumbai",
        destination="Delhi",
        distance_km=1411.0,
        co2_kg=185.4,
        cost_inr=32000.0,
        vehicle_type="electric",
        load_tonnes=12.0
    )
    assert cert["certificate_id"].startswith("EK-AUDIT-")
    assert "verification_hash" in cert
    assert cert["emissions_breakdown"]["scope_1_direct_co2_kg"] == 0.0
    assert cert["cbam_tariff_analysis"]["cbam_tax_savings_eur"] > 0
