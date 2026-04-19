export interface Coordinate {
  lat: number
  lng: number
}

export interface BusStop {
  id: string
  name: string
  coordinates: [number, number] // [lat, lng]
  demand: 'high' | 'medium' | 'low'
  demandScore: number // 0–100
  avgRiders: number
  boardingFrequency: number // per hour
  growthTrend: number // % change
  isSimulated?: boolean
  isRemoved?: boolean
}

export interface RouteData {
  id: string
  routeNumber: string
  routeName: string
  operator: string
  stops: BusStop[]
  path: [number, number][] // [lat, lng] waypoints
  color: string
  frequency: number // buses per hour
  avgTravelTime: number // minutes
  totalDistance: number // km
  peakHours: string[]
}

export interface SimulationState {
  isActive: boolean
  frequency: number
  addedStops: BusStop[]
  removedStopIds: string[]
}

export interface ImpactMetrics {
  routeTime: number
  waitTime: number
  passengerLoad: number
  efficiencyScore: number
  timeSavings: number
  coverageArea: number
  ridersServed: number
}

export interface PopularityScore {
  score: number
  avgRiders: number
  boardingFrequency: number
  growthTrend: number
  tier: 'excellent' | 'good' | 'average' | 'poor'
}

export type TimeFilter = 'morning' | 'afternoon' | 'evening' | 'night' | 'all'
export type DayFilter = 'weekday' | 'weekend' | 'all'

export interface AIInsight {
  id: string
  type: 'optimization' | 'warning' | 'opportunity' | 'info'
  title: string
  body: string
  impact: 'high' | 'medium' | 'low'
  metrics?: { label: string; value: string; positive: boolean }[]
}

export interface ScenarioSnapshot {
  id: string
  name: string
  timestamp: Date
  simulation: SimulationState
  metrics: ImpactMetrics
}
