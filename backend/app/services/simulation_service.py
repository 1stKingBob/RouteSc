from app.models.schemas import SimulationRequest, ImpactMetrics, SimulationResponse, BusStop, RouteData
from app.services.data_service import TIME_MULTIPLIERS, DAY_MULTIPLIERS


def calculate_metrics(
    route: RouteData,
    frequency: float,
    active_stops: list[BusStop],
    base_stop_count: int,
    time_filter: str,
    day_filter: str,
) -> ImpactMetrics:
    time_mult = TIME_MULTIPLIERS.get(time_filter, 1.0)
    day_mult = DAY_MULTIPLIERS.get(day_filter, 1.0)
    freq_ratio = frequency / route.frequency

    wait_time = round(30 / frequency, 1)
    extra_stops = len(active_stops) - base_stop_count
    route_time = round(route.avg_travel_time + extra_stops * 0.7, 1)

    base_load = 82 * time_mult * day_mult
    passenger_load = max(10.0, min(100.0, round(base_load / freq_ratio, 1)))

    coverage_score = min(100.0, (len(active_stops) / max(1, base_stop_count)) * 100)
    load_optimality = 100 - abs(passenger_load - 72)
    freq_score = min(100.0, (frequency / 12) * 100)
    efficiency_score = round(coverage_score * 0.3 + load_optimality * 0.4 + freq_score * 0.3, 1)

    base_wait = 30 / route.frequency
    time_savings = round(base_wait - wait_time, 1)
    coverage_area = round(len(active_stops) * 0.78, 1)
    riders_served = round(sum(s.avg_riders for s in active_stops) * time_mult * day_mult)

    return ImpactMetrics(
        route_time=route_time,
        wait_time=wait_time,
        passenger_load=passenger_load,
        efficiency_score=efficiency_score,
        time_savings=time_savings,
        coverage_area=coverage_area,
        riders_served=riders_served,
    )


def run_simulation(route: RouteData, request: SimulationRequest) -> SimulationResponse:
    removed_ids = set(request.removed_stop_ids)
    active_stops = [s for s in route.stops if s.id not in removed_ids] + request.added_stops
    base_stop_count = len(route.stops)

    base_metrics = calculate_metrics(
        route, route.frequency, list(route.stops), base_stop_count,
        request.time_filter, request.day_filter
    )
    sim_metrics = calculate_metrics(
        route, request.frequency, active_stops, base_stop_count,
        request.time_filter, request.day_filter
    )

    delta = ImpactMetrics(
        route_time=round(sim_metrics.route_time - base_metrics.route_time, 1),
        wait_time=round(sim_metrics.wait_time - base_metrics.wait_time, 1),
        passenger_load=round(sim_metrics.passenger_load - base_metrics.passenger_load, 1),
        efficiency_score=round(sim_metrics.efficiency_score - base_metrics.efficiency_score, 1),
        time_savings=round(sim_metrics.time_savings - base_metrics.time_savings, 1),
        coverage_area=round(sim_metrics.coverage_area - base_metrics.coverage_area, 1),
        riders_served=sim_metrics.riders_served - base_metrics.riders_served,
    )

    return SimulationResponse(base_metrics=base_metrics, simulated_metrics=sim_metrics, delta=delta)
