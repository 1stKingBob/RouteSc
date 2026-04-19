from fastapi import APIRouter, HTTPException
from app.models.schemas import SimulationRequest, SimulationResponse
from app.services.data_service import get_route_by_id
from app.services.simulation_service import run_simulation

router = APIRouter(prefix="/simulate", tags=["simulation"])


@router.post("/", response_model=SimulationResponse)
def simulate_route(request: SimulationRequest):
    route = get_route_by_id(request.route_id)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route '{request.route_id}' not found")
    return run_simulation(route, request)
