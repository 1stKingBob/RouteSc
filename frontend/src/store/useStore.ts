import { create } from 'zustand'
import { RouteData, BusStop, SimulationState, ImpactMetrics, TimeFilter, DayFilter, ScenarioSnapshot } from '@/types'
import { NSW_ROUTES } from '@/lib/mockData'
import { calculateImpactMetrics, calculateBaseMetrics } from '@/lib/calculations'
import { fetchRoutes, fetchRouteById } from '@/lib/api'

interface AppState {
  // Route catalogue
  allRoutes: RouteData[]
  isLoadingRoutes: boolean
  routeError: string | null
  totalRoutes: number
  usingRealData: boolean

  // Search
  searchQuery: string
  searchResults: RouteData[]
  isSearching: boolean

  // Selected route
  selectedRouteId: string | null
  selectedRoute: RouteData | null
  isLoadingRoute: boolean

  // Filters
  timeFilter: TimeFilter
  dayFilter: DayFilter

  // Map
  selectedStop: BusStop | null

  // Simulation
  simulation: SimulationState

  // Metrics
  baseMetrics: ImpactMetrics | null
  simulatedMetrics: ImpactMetrics | null

  // Scenarios
  savedScenarios: ScenarioSnapshot[]

  // ── actions ───────────────────────────────────────────────────────────────
  loadInitialRoutes: () => Promise<void>
  searchRoutes: (q: string) => Promise<void>
  selectRoute: (id: string) => Promise<void>
  setTimeFilter: (t: TimeFilter) => void
  setDayFilter: (d: DayFilter) => void
  setSelectedStop: (stop: BusStop | null) => void
  setFrequency: (freq: number) => void
  addSimulatedStop: (stop: BusStop) => void
  removeStop: (stopId: string) => void
  restoreStop: (stopId: string) => void
  resetSimulation: () => void
  saveScenario: (name: string) => void
  loadScenario: (id: string) => void
}

function defaultSim(route: RouteData): SimulationState {
  return { isActive: false, frequency: route.frequency, addedStops: [], removedStopIds: [] }
}

function recompute(route: RouteData, sim: SimulationState, time: TimeFilter, day: DayFilter) {
  return calculateImpactMetrics(route, sim, time, day)
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state — seed with mock data so the UI is never empty
  allRoutes: NSW_ROUTES,
  isLoadingRoutes: false,
  routeError: null,
  totalRoutes: NSW_ROUTES.length,
  usingRealData: false,

  searchQuery: '',
  searchResults: NSW_ROUTES,
  isSearching: false,

  selectedRouteId: NSW_ROUTES[0].id,
  selectedRoute: NSW_ROUTES[0],
  isLoadingRoute: false,

  timeFilter: 'all',
  dayFilter: 'all',
  selectedStop: null,

  simulation: defaultSim(NSW_ROUTES[0]),
  baseMetrics: calculateBaseMetrics(NSW_ROUTES[0], 'all', 'all'),
  simulatedMetrics: calculateBaseMetrics(NSW_ROUTES[0], 'all', 'all'),

  savedScenarios: [],

  // ── load initial route list from API ────────────────────────────────────
  loadInitialRoutes: async () => {
    set({ isLoadingRoutes: true, routeError: null })
    try {
      const routes = await fetchRoutes()
      const hasReal = routes.length > 10  // more than mock = real data
      set({
        allRoutes: routes,
        searchResults: routes,
        totalRoutes: routes.length,
        usingRealData: hasReal,
        isLoadingRoutes: false,
      })

      // Auto-select the first route from real data, fetching its full details
      if (hasReal && routes.length > 0) {
        get().selectRoute(routes[0].id)
      }
    } catch (err) {
      set({
        isLoadingRoutes: false,
        routeError: 'Could not reach backend — using demo data.',
        allRoutes: NSW_ROUTES,
        searchResults: NSW_ROUTES,
      })
    }
  },

  // ── search ───────────────────────────────────────────────────────────────
  searchRoutes: async (q: string) => {
    set({ searchQuery: q, isSearching: true })
    try {
      const results = await fetchRoutes(q)
      set({ searchResults: results, isSearching: false })
    } catch {
      const ql = q.toLowerCase()
      const fallback = get().allRoutes.filter(
        (r) => r.routeNumber.toLowerCase().includes(ql) || r.routeName.toLowerCase().includes(ql)
      )
      set({ searchResults: fallback, isSearching: false })
    }
  },

  // ── select route (fetches full details inc. stops + path) ─────────────
  selectRoute: async (id: string) => {
    // Optimistically show whatever we already have
    const cached = get().allRoutes.find((r) => r.id === id) ?? null
    if (cached) {
      const sim = defaultSim(cached)
      const base = calculateBaseMetrics(cached, get().timeFilter, get().dayFilter)
      set({
        selectedRouteId: id,
        selectedRoute: cached,
        simulation: sim,
        baseMetrics: base,
        simulatedMetrics: base,
        selectedStop: null,
        isLoadingRoute: true,
      })
    } else {
      set({ selectedRouteId: id, isLoadingRoute: true })
    }

    try {
      const full = await fetchRouteById(id)
      const sim = defaultSim(full)
      const base = calculateBaseMetrics(full, get().timeFilter, get().dayFilter)
      set({
        selectedRoute: full,
        simulation: sim,
        baseMetrics: base,
        simulatedMetrics: base,
        selectedStop: null,
        isLoadingRoute: false,
      })
    } catch {
      set({ isLoadingRoute: false })
    }
  },

  // ── filters ──────────────────────────────────────────────────────────────
  setTimeFilter: (t) => {
    const { selectedRoute, simulation, dayFilter } = get()
    if (!selectedRoute) return
    const base = calculateBaseMetrics(selectedRoute, t, dayFilter)
    const sim = recompute(selectedRoute, simulation, t, dayFilter)
    set({ timeFilter: t, baseMetrics: base, simulatedMetrics: sim })
  },

  setDayFilter: (d) => {
    const { selectedRoute, simulation, timeFilter } = get()
    if (!selectedRoute) return
    const base = calculateBaseMetrics(selectedRoute, timeFilter, d)
    const sim = recompute(selectedRoute, simulation, timeFilter, d)
    set({ dayFilter: d, baseMetrics: base, simulatedMetrics: sim })
  },

  setSelectedStop: (stop) => set({ selectedStop: stop }),

  // ── simulation ──────────────────────────────────────────────────────────
  setFrequency: (freq) => {
    const { selectedRoute, simulation, timeFilter, dayFilter } = get()
    if (!selectedRoute) return
    const newSim = { ...simulation, frequency: freq }
    set({ simulation: newSim, simulatedMetrics: recompute(selectedRoute, newSim, timeFilter, dayFilter) })
  },

  addSimulatedStop: (stop) => {
    const { selectedRoute, simulation, timeFilter, dayFilter } = get()
    if (!selectedRoute) return
    const newSim = { ...simulation, addedStops: [...simulation.addedStops, stop] }
    set({ simulation: newSim, simulatedMetrics: recompute(selectedRoute, newSim, timeFilter, dayFilter) })
  },

  removeStop: (stopId) => {
    const { selectedRoute, simulation, timeFilter, dayFilter } = get()
    if (!selectedRoute) return
    const newSim = { ...simulation, removedStopIds: [...simulation.removedStopIds, stopId] }
    set({ simulation: newSim, simulatedMetrics: recompute(selectedRoute, newSim, timeFilter, dayFilter) })
  },

  restoreStop: (stopId) => {
    const { selectedRoute, simulation, timeFilter, dayFilter } = get()
    if (!selectedRoute) return
    const newSim = { ...simulation, removedStopIds: simulation.removedStopIds.filter((id) => id !== stopId) }
    set({ simulation: newSim, simulatedMetrics: recompute(selectedRoute, newSim, timeFilter, dayFilter) })
  },

  resetSimulation: () => {
    const { selectedRoute, timeFilter, dayFilter } = get()
    if (!selectedRoute) return
    const sim = defaultSim(selectedRoute)
    const base = calculateBaseMetrics(selectedRoute, timeFilter, dayFilter)
    set({ simulation: sim, simulatedMetrics: base, selectedStop: null })
  },

  saveScenario: (name) => {
    const { simulation, simulatedMetrics } = get()
    if (!simulatedMetrics) return
    const snap: ScenarioSnapshot = {
      id: `scenario-${Date.now()}`,
      name,
      timestamp: new Date(),
      simulation: { ...simulation },
      metrics: { ...simulatedMetrics },
    }
    set((s) => ({ savedScenarios: [...s.savedScenarios, snap] }))
  },

  loadScenario: (id) => {
    const { savedScenarios, selectedRoute, timeFilter, dayFilter } = get()
    const snap = savedScenarios.find((s) => s.id === id)
    if (!snap || !selectedRoute) return
    set({
      simulation: snap.simulation,
      simulatedMetrics: recompute(selectedRoute, snap.simulation, timeFilter, dayFilter),
    })
  },
}))
