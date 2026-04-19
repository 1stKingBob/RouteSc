import { RouteData, SimulationState, ImpactMetrics, PopularityScore, TimeFilter, DayFilter, BusStop } from '@/types'
import { TIME_MULTIPLIERS, DAY_MULTIPLIERS } from './mockData'

export function calculateImpactMetrics(
  route: RouteData,
  simulation: SimulationState,
  timeFilter: TimeFilter,
  dayFilter: DayFilter
): ImpactMetrics {
  const { frequency, addedStops, removedStopIds } = simulation
  const timeMult = TIME_MULTIPLIERS[timeFilter] ?? 1
  const dayMult = DAY_MULTIPLIERS[dayFilter] ?? 1

  const activeStops: BusStop[] = [
    ...route.stops.filter((s) => !removedStopIds.includes(s.id)),
    ...addedStops,
  ]

  const baseFrequency = route.frequency
  const freqRatio = frequency / baseFrequency

  // Wait time = 60 / (2 * buses_per_hour)
  const waitTime = Math.round((30 / frequency) * 10) / 10

  // Route time adjusts for extra stops
  const extraStops = activeStops.length - route.stops.length
  const routeTime = Math.round((route.avgTravelTime + extraStops * 0.7) * 10) / 10

  // Passenger load: inversely proportional to frequency increase
  const baseLoad = 82 * timeMult * dayMult
  const passengerLoad = Math.max(10, Math.min(100, Math.round(baseLoad / freqRatio)))

  // Efficiency: balance between coverage, load optimality, and frequency
  const coverageScore = Math.min(100, (activeStops.length / route.stops.length) * 100)
  const loadOptimality = 100 - Math.abs(passengerLoad - 72)
  const freqScore = Math.min(100, (frequency / 12) * 100)
  const efficiencyScore = Math.round(coverageScore * 0.3 + loadOptimality * 0.4 + freqScore * 0.3)

  // Time savings vs baseline
  const baseWaitTime = 30 / baseFrequency
  const timeSavings = Math.round((baseWaitTime - waitTime) * 10) / 10

  // Coverage area approximation
  const coverageArea = Math.round(activeStops.length * 0.78 * 10) / 10

  // Total riders served (with time/day multipliers)
  const ridersServed = Math.round(
    activeStops.reduce((sum, s) => sum + s.avgRiders, 0) * timeMult * dayMult
  )

  return { routeTime, waitTime, passengerLoad, efficiencyScore, timeSavings, coverageArea, ridersServed }
}

export function calculateBaseMetrics(
  route: RouteData,
  timeFilter: TimeFilter,
  dayFilter: DayFilter
): ImpactMetrics {
  const defaultSim: SimulationState = {
    isActive: false,
    frequency: route.frequency,
    addedStops: [],
    removedStopIds: [],
  }
  return calculateImpactMetrics(route, defaultSim, timeFilter, dayFilter)
}

export function calculatePopularityScore(route: RouteData): PopularityScore {
  const stops = route.stops
  const avgRiders = stops.reduce((sum, s) => sum + s.avgRiders, 0) / stops.length
  const boardingFrequency = stops.reduce((sum, s) => sum + s.boardingFrequency, 0) / stops.length
  const growthTrend = stops.reduce((sum, s) => sum + s.growthTrend, 0) / stops.length

  const score = Math.min(
    100,
    Math.round(
      0.5 * (avgRiders / 120) * 100 +
      0.3 * (boardingFrequency / 90) * 100 +
      0.2 * (growthTrend / 10) * 100
    )
  )

  const tier = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'average' : 'poor'

  return { score, avgRiders: Math.round(avgRiders), boardingFrequency: Math.round(boardingFrequency), growthTrend: Math.round(growthTrend * 10) / 10, tier }
}

export function getMetricDelta(base: number, simulated: number, lowerIsBetter = false): number {
  const delta = simulated - base
  return lowerIsBetter ? -delta : delta
}

export function generateHeatmapData(route: RouteData): { position: [number, number]; intensity: number }[] {
  return route.stops.map((stop) => ({
    position: stop.coordinates,
    intensity: stop.demandScore / 100,
  }))
}

export function getDemandColor(demand: 'high' | 'medium' | 'low'): string {
  return demand === 'high' ? '#ef4444' : demand === 'medium' ? '#f59e0b' : '#10b981'
}

export function getDemandGlow(demand: 'high' | 'medium' | 'low'): string {
  return demand === 'high'
    ? 'rgba(239,68,68,0.6)'
    : demand === 'medium'
    ? 'rgba(245,158,11,0.6)'
    : 'rgba(16,185,129,0.6)'
}
