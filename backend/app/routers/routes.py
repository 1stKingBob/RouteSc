from fastapi import APIRouter, HTTPException, Query
from app.services.data_service import (
    get_all_routes, get_route_by_id, get_route_by_number,
    search_routes, get_route_count
)
from app.models.schemas import RouteData

router = APIRouter(prefix="/routes", tags=["routes"])


@router.get("/", response_model=list[RouteData])
def list_routes(
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
):
    return get_all_routes(limit=limit, offset=offset)


@router.get("/search", response_model=list[RouteData])
def search(
    q: str = Query(default="", description="Route number or name fragment"),
    limit: int = Query(default=50, ge=1, le=200),
):
    return search_routes(q, limit=limit)


@router.get("/count")
def count():
    return {"total": get_route_count()}


@router.get("/number/{number}", response_model=RouteData)
def get_by_number(number: str):
    route = get_route_by_number(number)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route {number!r} not found")
    return route


@router.get("/{route_id}", response_model=RouteData)
def get_route(route_id: str):
    route = get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route {route_id!r} not found")
    return route
