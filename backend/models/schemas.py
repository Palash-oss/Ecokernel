"""
Pydantic schemas for EcoKernel API request/response models.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class VehicleType(str, Enum):
    ELECTRIC = "electric"
    EURO6_DIESEL = "euro6_diesel"
    EURO4_DIESEL = "euro4_diesel"
    PETROL = "petrol"
    CNG = "cng"
    HGV_ARTIC = "hgv_artic"
    HGV_RIGID = "hgv_rigid"


class TransportMode(str, Enum):
    ROAD = "road"
    RAIL = "rail"
    MULTIMODAL = "multimodal"


# ─── Request Models ────────────────────────────────────────

class OptimizeRequest(BaseModel):
    origin: str = Field(..., description="Origin city name")
    destination: str = Field(..., description="Destination city name")
    origin_lat: Optional[float] = Field(None, description="Exact origin latitude")
    origin_lng: Optional[float] = Field(None, description="Exact origin longitude")
    dest_lat: Optional[float] = Field(None, description="Exact destination latitude")
    dest_lng: Optional[float] = Field(None, description="Exact destination longitude")
    waypoints: List[str] = Field(default=[], description="Optional intermediate stops")
    vehicle_type: str = Field(default="ashok_leyland_euro6")
    load_tonnes: float = Field(default=10.0, ge=0, description="Cargo load in tonnes")
    priority: float = Field(
        default=0.5, ge=0.0, le=1.0,
        description="0.0 = pure cost, 1.0 = pure green"
    )
    max_solutions: int = Field(default=10, ge=1, le=50)


class LocationCoord(BaseModel):
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class RouteDataRequest(BaseModel):
    origin: LocationCoord
    destination: LocationCoord
    vehicle_type: str
    load_tonnes: float
    priority: float = 0.5


# ─── Response Models ───────────────────────────────────────

class ISO14083Breakdown(BaseModel):
    wtw_co2: float = Field(..., description="Well-to-Wheel total emissions (kg CO2e)")
    wtt_co2: float = Field(..., description="Well-to-Tank upstream emissions (kg CO2e)")
    ttw_co2: float = Field(..., description="Tank-to-Wheel direct emissions (kg CO2e)")
    load_factor_used: float = Field(..., description="Payload capacity utilization ratio (0-1)")
    intensity_tkm: float = Field(..., description="Emissions intensity (g CO2e / tonne-km)")


class RouteSegment(BaseModel):
    from_city: str
    to_city: str
    distance_km: float
    time_minutes: float
    mode: TransportMode
    co2_kg: float
    cost_inr: float
    geometry: Optional[List[List[float]]] = None  # [[lng, lat], ...]
    disruption: Optional[str] = None


class RouteSolution(BaseModel):
    id: int
    segments: List[RouteSegment]
    total_distance_km: float
    total_time_minutes: float
    total_co2_kg: float
    total_cost_inr: float
    green_score: float = Field(ge=0, le=100)
    vehicle_type: str
    modes_used: List[str]
    # Optional UI strategy hints
    strategy: Optional[str] = None  # 'fastest' | 'greenest' | 'balanced'
    is_fastest: Optional[bool] = None
    is_greenest: Optional[bool] = None
    iso_14083: Optional[ISO14083Breakdown] = None


class ParetoFront(BaseModel):
    solutions: List[RouteSolution]
    best_cost: Optional[RouteSolution] = None
    best_green: Optional[RouteSolution] = None
    origin: str
    destination: str
    hypervolume_score: Optional[float] = Field(default=0.85, description="Pareto Frontier Quality Indicator")



class NetworkNode(BaseModel):
    name: str
    lat: float
    lng: float
    region: str


class NetworkEdge(BaseModel):
    from_city: str
    to_city: str
    distance_km: float
    time_minutes: float
    has_rail: bool
    gradient_percent: float
    disruption: Optional[str] = None


class NetworkResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]


class DemandForecastItem(BaseModel):
    city: str
    region: str
    day: int
    predicted_demand: float
    confidence_low: float
    confidence_high: float
    live_event: Optional[str] = None

class ContractCreate(BaseModel):
    origin: str
    destination: str
    vehicle_type: str
    fixed_cost_inr: float
    expiry_date: str
    contract_type: str


class SaveRouteRequest(BaseModel):
    origin_address: str
    destination_address: str
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    vehicle_type: str
    load_tonnes: float
    total_distance_km: float
    total_time_minutes: float
    total_cost_inr: float
    total_co2_kg: float
    green_score: float
    strategy: Optional[str] = None
    route_geometry: Optional[List[List[float]]] = None
    segments: Optional[List[dict]] = None


class DemandForecastResponse(BaseModel):
    forecasts: List[DemandForecastItem]
    forecast_days: int


class VehicleInfo(BaseModel):
    id: str
    name: str
    fuel_type: str
    emission_kg_per_km: float
    max_payload_tonnes: float
    avg_speed_kmh: float
    cost_per_km_inr: float


class CarbonIntensityResponse(BaseModel):
    current_intensity: float  # gCO2/kWh
    forecast: str
    index: str  # "very low", "low", "moderate", "high", "very high"
    timestamp: str
