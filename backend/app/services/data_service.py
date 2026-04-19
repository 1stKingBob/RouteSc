"""
Data service — loads from GTFS-processed routes.json when available,
falls back to structured mock data if the ingest script hasn't been run yet.
"""
import json
import math
from pathlib import Path
from app.models.schemas import RouteData, BusStop, DemandLevel

DATA_FILE = Path(__file__).parent.parent.parent / "data" / "routes.json"

TIME_MULTIPLIERS = {"morning": 1.4, "afternoon": 0.8, "evening": 1.2, "night": 0.4, "all": 1.0}
DAY_MULTIPLIERS  = {"weekday": 1.0, "weekend": 0.65, "all": 0.85}

# ─── cache ────────────────────────────────────────────────────────────────────
_ROUTE_CACHE: list[RouteData] | None = None


def _build_stop(raw: dict) -> BusStop:
    demand_raw = raw.get("demand", "medium").lower()
    demand = DemandLevel(demand_raw) if demand_raw in DemandLevel.__members__ else DemandLevel.medium
    return BusStop(
        id=str(raw["id"]),
        name=raw["name"],
        lat=float(raw["lat"]),
        lng=float(raw["lng"]),
        demand=demand,
        demand_score=float(raw.get("demandScore", raw.get("demand_score", 50))),
        avg_riders=float(raw.get("avgRiders", raw.get("avg_riders", 40))),
        boarding_frequency=float(raw.get("boardingFrequency", raw.get("boarding_frequency", 25))),
        growth_trend=float(raw.get("growthTrend", raw.get("growth_trend", 2.0))),
    )


def _load_routes() -> list[RouteData]:
    global _ROUTE_CACHE
    if _ROUTE_CACHE is not None:
        return _ROUTE_CACHE

    if DATA_FILE.exists():
        print(f"Loading GTFS routes from {DATA_FILE} …")
        raw = json.loads(DATA_FILE.read_text())
        routes_raw = raw.get("routes", raw) if isinstance(raw, dict) else raw
        result = []
        for r in routes_raw:
            try:
                stops = [_build_stop(s) for s in r.get("stops", [])]
                result.append(RouteData(
                    id=str(r["id"]),
                    route_number=str(r.get("routeNumber", r.get("route_number", ""))),
                    route_name=str(r.get("routeName", r.get("route_name", ""))),
                    operator=str(r.get("operator", "Transport for NSW")),
                    color=str(r.get("color", "#3b82f6")),
                    frequency=float(r.get("frequency", 6)),
                    avg_travel_time=float(r.get("avgTravelTime", r.get("avg_travel_time", 30))),
                    total_distance=float(r.get("totalDistance", r.get("total_distance", 5))),
                    peak_hours=r.get("peakHours", r.get("peak_hours", ["8:00", "17:00"])),
                    stops=stops,
                    path=r.get("path", []),
                ))
            except Exception as e:
                continue  # skip malformed entries
        print(f"Loaded {len(result)} routes from GTFS data")
        _ROUTE_CACHE = result
        return result

    # ── fallback mock data ─────────────────────────────────────────────────
    print("routes.json not found — using mock data. Run: python scripts/ingest_gtfs.py")
    _ROUTE_CACHE = _mock_routes()
    return _ROUTE_CACHE


# ─── public API ──────────────────────────────────────────────────────────────

def get_all_routes(limit: int = 500, offset: int = 0) -> list[RouteData]:
    return _load_routes()[offset : offset + limit]


def get_route_by_id(route_id: str) -> RouteData | None:
    for r in _load_routes():
        if r.id == route_id:
            return r
    return None


def get_route_by_number(number: str) -> RouteData | None:
    for r in _load_routes():
        if r.route_number == number:
            return r
    return None


def search_routes(query: str, limit: int = 50) -> list[RouteData]:
    q = query.strip().lower()
    if not q:
        return _load_routes()[:limit]
    results = []
    for r in _load_routes():
        if (
            q in r.route_number.lower()
            or q in r.route_name.lower()
        ):
            results.append(r)
        if len(results) >= limit:
            break
    return results


def get_route_count() -> int:
    return len(_load_routes())


# ─── mock data fallback ───────────────────────────────────────────────────────

def _mock_routes() -> list[RouteData]:
    def s(id, name, lat, lng, demand, ds, ar, bf, gt):
        return BusStop(id=id, name=name, lat=lat, lng=lng,
                       demand=DemandLevel(demand), demand_score=ds,
                       avg_riders=ar, boarding_frequency=bf, growth_trend=gt)

    return [
        RouteData(
            id="route-380", route_number="380",
            route_name="Circular Quay to Bondi Beach", operator="Transit Systems NSW",
            color="#06b6d4", frequency=8, avg_travel_time=45, total_distance=10.8,
            peak_hours=["8:00", "9:00", "17:00", "18:00"],
            path=[[-33.8614,151.2101],[-33.8688,151.2093],[-33.876,151.214],[-33.884,151.221],
                  [-33.8752,151.2402],[-33.878,151.252],[-33.8831,151.2594],[-33.8908,151.2748]],
            stops=[
                s("s101","Circular Quay",-33.8614,151.2101,"high",97,145,95,6.8),
                s("s102","Sydney CBD",-33.8688,151.2093,"high",93,132,87,5.4),
                s("s103","Surry Hills",-33.876,151.214,"high",85,98,64,7.2),
                s("s104","Paddington",-33.884,151.221,"medium",74,72,47,4.3),
                s("s105","Edgecliff",-33.8752,151.2402,"medium",69,58,38,3.1),
                s("s106","Double Bay",-33.878,151.252,"low",52,41,27,2.0),
                s("s107","Rose Bay",-33.8831,151.2594,"medium",67,55,36,3.8),
                s("s108","Bondi Beach",-33.8908,151.2748,"high",90,118,76,8.9),
            ],
        ),
        RouteData(
            id="route-370", route_number="370",
            route_name="Coogee to Glebe via Newtown", operator="Transit Systems NSW",
            color="#3b82f6", frequency=6, avg_travel_time=52, total_distance=14.2,
            peak_hours=["7:00", "8:00", "9:00", "17:00", "18:00"],
            path=[[-33.9217,151.2558],[-33.912,151.2432],[-33.8983,151.229],[-33.894,151.205],
                  [-33.8983,151.195],[-33.899,151.19],[-33.8975,151.185],[-33.8944,151.182],
                  [-33.892,151.18],[-33.885,151.183]],
            stops=[
                s("s001","Coogee Beach",-33.9217,151.2558,"medium",65,42,28,3.2),
                s("s002","Randwick",-33.912,151.2432,"high",82,67,45,5.1),
                s("s003","Moore Park",-33.8983,151.229,"high",88,85,52,7.3),
                s("s004","Cleveland St",-33.894,151.205,"medium",71,58,38,2.8),
                s("s005","King St Newtown",-33.8983,151.195,"high",91,95,63,8.5),
                s("s006","Newtown Station",-33.899,151.19,"high",95,120,78,9.2),
                s("s007","Enmore Rd",-33.8975,151.185,"medium",68,52,35,4.1),
                s("s008","Stanmore",-33.8944,151.182,"low",45,35,22,1.5),
                s("s009","Petersham",-33.892,151.18,"medium",62,48,31,3.7),
                s("s010","Glebe Point Rd",-33.885,151.183,"medium",70,55,36,4.9),
            ],
        ),
        RouteData(
            id="route-333", route_number="333",
            route_name="CBD to Bondi Junction Express", operator="Transit Systems NSW",
            color="#8b5cf6", frequency=10, avg_travel_time=28, total_distance=6.5,
            peak_hours=["7:00","8:00","9:00","17:00","18:00","19:00"],
            path=[[-33.8614,151.2101],[-33.8688,151.2093],[-33.878,151.22],[-33.8812,151.226],
                  [-33.886,151.238],[-33.8913,151.2486]],
            stops=[
                s("s201","Bridge St CBD",-33.8614,151.2101,"high",96,142,93,6.5),
                s("s202","Park St",-33.8688,151.2093,"high",89,115,75,5.8),
                s("s203","Oxford St",-33.878,151.22,"medium",76,78,51,4.7),
                s("s204","Taylor Square",-33.8812,151.226,"high",83,92,60,6.1),
                s("s205","Bondi Junction",-33.8913,151.2486,"high",94,138,90,8.2),
            ],
        ),
        RouteData(
            id="route-440", route_number="440",
            route_name="Circular Quay to Leichhardt", operator="Transit Systems NSW",
            color="#10b981", frequency=5, avg_travel_time=38, total_distance=9.3,
            peak_hours=["7:00","8:00","17:00","18:00"],
            path=[[-33.8614,151.2101],[-33.8732,151.207],[-33.8764,151.2003],
                  [-33.8833,151.196],[-33.8833,151.1833]],
            stops=[
                s("s301","Circular Quay",-33.8614,151.2101,"high",97,145,95,6.8),
                s("s302","Town Hall",-33.8732,151.207,"high",92,128,84,5.5),
                s("s303","Ultimo",-33.8764,151.2003,"medium",72,68,44,3.9),
                s("s304","Glebe Point",-33.8833,151.196,"medium",65,52,34,3.2),
                s("s305","Leichhardt",-33.8833,151.1833,"medium",75,74,48,4.6),
            ],
        ),
    ]
