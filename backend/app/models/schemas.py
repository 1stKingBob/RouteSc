from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class DemandLevel(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class BusStop(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    demand: DemandLevel
    demand_score: float
    avg_riders: float
    boarding_frequency: float
    growth_trend: float
    is_simulated: bool = False


class RouteData(BaseModel):
    id: str
    route_number: str
    route_name: str
    operator: str
    color: str
    frequency: float
    avg_travel_time: float
    total_distance: float
    peak_hours: List[str]
    stops: List[BusStop]
    path: List[List[float]]


class SimulationRequest(BaseModel):
    route_id: str
    frequency: float
    added_stops: List[BusStop] = []
    removed_stop_ids: List[str] = []
    time_filter: str = "all"
    day_filter: str = "all"


class ImpactMetrics(BaseModel):
    route_time: float
    wait_time: float
    passenger_load: float
    efficiency_score: float
    time_savings: float
    coverage_area: float
    riders_served: float


class SimulationResponse(BaseModel):
    base_metrics: ImpactMetrics
    simulated_metrics: ImpactMetrics
    delta: ImpactMetrics
