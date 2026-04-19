'use client'

import { useCallback, useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { getDemandColor, getDemandGlow } from '@/lib/calculations'
import { BusStop } from '@/types'
import { Plus, X, Loader2 } from 'lucide-react'
import L from 'leaflet'

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// ── fly to route bounds when route changes ────────────────────────────────
function MapController() {
  const map = useMap()
  const selectedRoute = useStore((s) => s.selectedRoute)

  useEffect(() => {
    if (!selectedRoute || selectedRoute.stops.length === 0) return
    const lats = selectedRoute.stops.map((s) => s.coordinates[0])
    const lngs = selectedRoute.stops.map((s) => s.coordinates[1])
    const bounds = L.latLngBounds(
      [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
      [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01],
    )
    map.flyToBounds(bounds, { duration: 1.0, padding: [40, 40] })
  }, [selectedRoute, map])

  return null
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

function StopPopup({ stop, isRemoved, onRemove, onRestore }: {
  stop: BusStop; isRemoved: boolean; onRemove: () => void; onRestore: () => void
}) {
  const color = getDemandColor(stop.demand)
  return (
    <div className="min-w-[220px] p-1">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white text-sm leading-tight">{stop.name}</h3>
          <span
            className="text-[11px] font-medium mt-1 inline-block px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {stop.demand === 'high' ? 'High' : stop.demand === 'medium' ? 'Med' : 'Low'} Demand
          </span>
        </div>
        {stop.isSimulated && (
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-2 font-medium">
            Simulated
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { l: 'Avg Riders', v: stop.avgRiders },
          { l: 'Boards/hr',  v: stop.boardingFrequency },
          { l: 'Demand Score', v: stop.demandScore },
          { l: 'Growth', v: `+${stop.growthTrend}%`, green: true },
        ].map(({ l, v, green }) => (
          <div key={l} className="bg-white/[0.05] rounded-lg p-2">
            <p className="text-white/40 text-[10px] mb-0.5">{l}</p>
            <p className={`font-bold text-base leading-none ${green ? 'text-emerald-400' : 'text-white'}`}>{v}</p>
          </div>
        ))}
      </div>

      {!stop.isSimulated && (
        <button
          onClick={isRemoved ? onRestore : onRemove}
          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            isRemoved
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          }`}
        >
          {isRemoved ? <Plus size={12} /> : <X size={12} />}
          {isRemoved ? 'Restore Stop' : 'Remove from Route'}
        </button>
      )}
    </div>
  )
}

export default function MapView() {
  const {
    selectedRoute, simulation, isLoadingRoute,
    setSelectedStop, selectedStop, removeStop, restoreStop, addSimulatedStop,
  } = useStore()

  const [addingStop, setAddingStop] = useState(false)
  const [pendingClick, setPendingClick] = useState<{ lat: number; lng: number } | null>(null)
  const [newStopName, setNewStopName] = useState('')
  const [optimizedPath, setOptimizedPath] = useState<[number, number][]>([])
  const [isCalculatingPath, setIsCalculatingPath] = useState(false)

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (addingStop) { setPendingClick({ lat, lng }); setNewStopName('') }
  }, [addingStop])

  const handleAddStop = () => {
    if (!pendingClick || !newStopName.trim()) return
    
    // Calculate realistic demand based on location (NSW Sydney area)
    const demandScore = calculateDemandScore(pendingClick.lat, pendingClick.lng)
    const demand = getDemandLevel(demandScore)
    const avgRiders = Math.round(demandScore * 0.9)
    const boardingFrequency = Math.round(demandScore * 0.6)
    const growthTrend = (Math.random() * 4 + 1).toFixed(1)
    
    addSimulatedStop({
      id: `sim-${Date.now()}`,
      name: newStopName.trim(),
      coordinates: [pendingClick.lat, pendingClick.lng],
      demand, demandScore, avgRiders,
      boardingFrequency, growthTrend: parseFloat(growthTrend), isSimulated: true,
    })
    setPendingClick(null); setAddingStop(false); setNewStopName('')
  }

  // Calculate demand score based on location (Sydney CBD = high demand, suburbs = lower)
  const calculateDemandScore = (lat: number, lng: number): number => {
    // Sydney CBD coordinates: -33.8688, 151.2093
    const cbdLat = -33.8688
    const cbdLng = 151.2093
    
    // Calculate distance from CBD
    const distance = Math.sqrt(Math.pow(lat - cbdLat, 2) + Math.pow(lng - cbdLng, 2)) * 111 // Convert to km
    
    // Higher demand closer to CBD
    if (distance < 2) return 85 + Math.random() * 15 // CBD: 85-100
    if (distance < 5) return 70 + Math.random() * 15 // Inner city: 70-85
    if (distance < 10) return 50 + Math.random() * 20 // Suburbs: 50-70
    if (distance < 20) return 30 + Math.random() * 20 // Outer suburbs: 30-50
    return 15 + Math.random() * 15 // Far suburbs: 15-30
  }

  const getDemandLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score > 70) return 'high'
    if (score > 40) return 'medium'
    return 'low'
  }

  const allStops: BusStop[] = selectedRoute
    ? [
        ...selectedRoute.stops.map((s) => ({
          ...s,
          isRemoved: simulation.removedStopIds.includes(s.id),
        })),
        ...simulation.addedStops,
      ]
    : []

  // Create optimized path with hybrid road routing
  const getOptimizedPath = (): [number, number][] => {
    return optimizedPath
  }

  // Test API connectivity
  useEffect(() => {
    testAPIConnectivity()
  }, [])

  const testAPIConnectivity = async () => {
    try {
      const testUrl = 'https://router.project-osrm.org/route/v1/driving/0,0;1,1?overview=full&geometries=geojson'
      const response = await fetch(testUrl)
      console.log('API Connectivity Test - Status:', response.status)
      if (response.ok) {
        console.log('OSRM API is accessible!')
      } else {
        console.warn('OSRM API returned error:', response.status)
      }
    } catch (error) {
      console.error('OSRM API is not accessible:', error)
    }
  }

  // Initialize path and upgrade to OSRM in background
  useEffect(() => {
    if (selectedRoute) {
      // Show enhanced path immediately
      const enhancedPath = createEnhancedPath()
      setOptimizedPath(enhancedPath)
      
      // Then upgrade to OSRM in background
      upgradeToOSRMPath()
    }
  }, [selectedRoute, simulation.addedStops, simulation.removedStopIds])

  const createEnhancedPath = (): [number, number][] => {
    if (!selectedRoute) return []
    
    const activeStops = allStops.filter(s => !('isRemoved' in s) || !s.isRemoved)
    
    if (simulation.addedStops.length === 0) {
      // No added stops, use original path with road enhancement
      return enhancePathWithRoadCurves(selectedRoute.path)
    }
    
    // Find optimal order of stops with minimal route deviation
    const optimizedStops = findOptimalStopOrderSimple(activeStops, selectedRoute.stops)
    
    // Create path through optimized stops with road enhancement
    const path: [number, number][] = []
    
    optimizedStops.forEach((stop, index) => {
      if (index === 0) {
        path.push(stop.coordinates)
      } else {
        // Create road-enhanced segment from previous stop
        const prevStop = optimizedStops[index - 1]
        const roadSegment = enhanceSegmentWithRoadCurves(prevStop.coordinates, stop.coordinates)
        path.push(...roadSegment)
        path.push(stop.coordinates)
      }
    })
    
    return path
  }

  const upgradeToOSRMPath = async () => {
    if (!selectedRoute) return
    
    console.log('Starting OSRM path upgrade for route:', selectedRoute.id)
    
    const activeStops = allStops.filter(s => !('isRemoved' in s) || !s.isRemoved)
    console.log('Active stops for OSRM:', activeStops)
    
    try {
      // Find optimal stop order based on minimal route deviation
      const optimizedStops = findOptimalStopOrderSimple(activeStops, selectedRoute.stops)
      console.log('Optimized stops order:', optimizedStops)
      
      // Create OSRM road-following path through optimized stops
      const path: [number, number][] = []
      
      for (let i = 0; i < optimizedStops.length - 1; i++) {
        const start = optimizedStops[i].coordinates
        const end = optimizedStops[i + 1].coordinates
        
        console.log(`Processing segment ${i + 1}/${optimizedStops.length - 1}:`, start, '->', end)
        
        // Get real road path between stops
        const roadSegment = await getRoadSegment(start, end)
        console.log(`Got road segment with ${roadSegment.length} points`)
        
        path.push(...roadSegment)
        
        // Add end point (avoiding duplication)
        if (i < optimizedStops.length - 2) {
          path.pop()
        }
      }
      
      console.log('Final OSRM path has', path.length, 'points')
      
      // Update path with OSRM data
      setOptimizedPath(path)
      console.log('Updated optimized path with OSRM data')
    } catch (error) {
      console.error('OSRM upgrade failed, keeping enhanced path:', error)
      // Keep the enhanced path as fallback
    }
  }

  // Enhance a path with road-like curves to simulate road following
  const enhancePathWithRoadCurves = (originalPath: [number, number][]): [number, number][] => {
    if (originalPath.length < 2) return originalPath
    
    const enhancedPath: [number, number][] = []
    
    for (let i = 0; i < originalPath.length - 1; i++) {
      const start = originalPath[i]
      const end = originalPath[i + 1]
      
      enhancedPath.push(start)
      
      // Add road-like intermediate points
      const roadSegment = enhanceSegmentWithRoadCurves(start, end)
      enhancedPath.push(...roadSegment)
    }
    
    enhancedPath.push(originalPath[originalPath.length - 1])
    return enhancedPath
  }

  // Enhance a single segment with road-like curves
  const enhanceSegmentWithRoadCurves = (start: [number, number], end: [number, number]): [number, number][] => {
    const distance = calculateDistance(start, end)
    
    // Create road-like curves with appropriate segment count
    const segments = Math.max(3, Math.min(8, Math.floor(distance * 2)))
    const points: [number, number][] = []
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      
      // Add subtle road-like curves (avoiding straight lines through buildings)
      const curveAmplitude = 0.0001 // Small curve to simulate road following
      const curve = Math.sin(progress * Math.PI) * curveAmplitude
      
      // Calculate perpendicular offset for curve
      const bearing = calculateBearing(start, end)
      const perpBearing = bearing + 90
      
      const lat = start[0] + (end[0] - start[0]) * progress + 
                  curve * Math.cos(perpBearing * Math.PI / 180)
      const lng = start[1] + (end[1] - start[1]) * progress + 
                  curve * Math.sin(perpBearing * Math.PI / 180)
      
      points.push([lat, lng])
    }
    
    return points
  }

  const getRoadSegment = async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
    try {
      // Try proxy route first (if proxy is configured)
      const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`
      const proxyUrl = `/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
      const directUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
      
      // Try proxy first
      console.log('Trying proxy URL:', proxyUrl)
      const proxyResponse = await fetch(proxyUrl)
      
      if (proxyResponse.ok) {
        const data = await proxyResponse.json()
        console.log('Proxy OSRM success:', data)
        
        if (data.routes && data.routes.length > 0) {
          const geometry = data.routes[0].geometry?.coordinates || []
          const roadPath: [number, number][] = geometry.map((coord: number[]) => [coord[1], coord[0]])
          if (roadPath.length > 0) {
            return roadPath
          }
        }
      }
      
      // Fallback to direct (might work with CORS extension)
      console.log('Trying direct URL:', directUrl)
      const directResponse = await fetch(directUrl)
      
      if (directResponse.ok) {
        const data = await directResponse.json()
        console.log('Direct OSRM success:', data)
        
        if (data.routes && data.routes.length > 0) {
          const geometry = data.routes[0].geometry?.coordinates || []
          const roadPath: [number, number][] = geometry.map((coord: number[]) => [coord[1], coord[0]])
          if (roadPath.length > 0) {
            return roadPath
          }
        }
      }
    } catch (error) {
      console.warn('OSRM API failed:', error)
    }
    
    console.log('Using ultra-realistic road simulation')
    return createAdvancedRoadSegment(start, end)
  }

  const getActualRoadPath = async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
    // Calculate bounding box around the route
    const buffer = 0.005 // ~500m buffer
    const minLat = Math.min(start[0], end[0]) - buffer
    const maxLat = Math.max(start[0], end[0]) + buffer
    const minLon = Math.min(start[1], end[1]) - buffer
    const maxLon = Math.max(start[1], end[1]) + buffer
    
    // Overpass API query to get roads in the area
    const query = `
      [out:json][timeout:25];
      (
        way["highway"~"primary|secondary|tertiary|residential|service"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out geom;
    `
    
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.elements && data.elements.length > 0) {
        // Extract road coordinates and find path between start and end
        const roadNetwork = extractRoadNetwork(data.elements)
        const path = findPathThroughRoads(start, end, roadNetwork)
        
        if (path.length > 0) {
          console.log('Found actual road path with', path.length, 'points')
          return path
        }
      }
    } catch (error) {
      console.error('Overpass API call failed:', error)
      throw error
    }
    
    return []
  }

  const extractRoadNetwork = (elements: any[]): [number, number][][] => {
    const roads: [number, number][][] = []
    
    elements.forEach(element => {
      if (element.type === 'way' && element.geometry) {
        const road: [number, number][] = element.geometry.map((node: any) => [node.lat, node.lon])
        if (road.length > 1) {
          roads.push(road)
        }
      }
    })
    
    return roads
  }

  const findPathThroughRoads = (start: [number, number], end: [number, number], roadNetwork: [number, number][][]): [number, number][] => {
    // Find the closest road segments to start and end points
    const startSegment = findClosestRoadSegment(start, roadNetwork)
    const endSegment = findClosestRoadSegment(end, roadNetwork)
    
    if (!startSegment || !endSegment) {
      return []
    }
    
    // Simple path following: connect start to start segment, then through road network, then to end
    const path: [number, number][] = []
    
    // Add start point to closest road point
    path.push(start)
    path.push(startSegment)
    
    // Add intermediate road points (simplified - just follow the road network)
    roadNetwork.forEach(road => {
      if (road.includes(startSegment) || road.includes(endSegment)) {
        path.push(...road)
      }
    })
    
    // Add end segment to end point
    path.push(endSegment)
    path.push(end)
    
    // Remove duplicates while preserving order
    return path.filter((point, index, self) => 
      index === self.findIndex((p) => p[0] === point[0] && p[1] === point[1])
    )
  }

  const findClosestRoadSegment = (point: [number, number], roadNetwork: [number, number][][]): [number, number] | null => {
    let closestPoint: [number, number] | null = null
    let minDistance = Infinity
    
    roadNetwork.forEach(road => {
      road.forEach(roadPoint => {
        const distance = calculateDistance(point, roadPoint)
        if (distance < minDistance) {
          minDistance = distance
          closestPoint = roadPoint
        }
      })
    })
    
    return closestPoint
  }

  const createAdvancedRoadSegment = (start: [number, number], end: [number, number]): [number, number][] => {
    const distance = calculateDistance(start, end)
    const bearing = calculateBearing(start, end)
    
    // Create ultra-realistic road path that simulates actual street patterns
    const segments = Math.max(15, Math.min(40, Math.floor(distance * 6)))
    const points: [number, number][] = [start]
    
    // Pre-calculate road characteristics based on typical urban patterns
    const roadType = determineRoadType(distance, bearing)
    const intersectionPoints = generateIntersectionPoints(start, end, roadType)
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      
      // Multi-layered road simulation
      const roadPath = simulateRoadPattern(start, end, progress, roadType, intersectionPoints)
      
      points.push(roadPath)
    }
    
    points.push(end)
    return points
  }

  const determineRoadType = (distance: number, bearing: number): string => {
    // Simulate different road types based on distance and direction
    if (distance < 0.5) return 'residential' // Short distance = local streets
    if (distance < 1.5) return 'tertiary'     // Medium distance = connector roads
    if (distance < 3.0) return 'secondary'   // Longer distance = main roads
    return 'primary'                         // Long distance = highways
  }

  const generateIntersectionPoints = (start: [number, number], end: [number, number], roadType: string): [number, number][] => {
    const intersections: [number, number][] = []
    const numIntersections = roadType === 'primary' ? 2 : roadType === 'secondary' ? 3 : 1
    
    for (let i = 0; i < numIntersections; i++) {
      const progress = (i + 1) / (numIntersections + 1)
      const baseLat = start[0] + (end[0] - start[0]) * progress
      const baseLng = start[1] + (end[1] - start[1]) * progress
      
      // Add perpendicular offset to simulate side streets
      const bearing = calculateBearing(start, end)
      const perpBearing = bearing + 90
      const offset = 0.0002 * (Math.random() - 0.5)
      
      const lat = baseLat + offset * Math.cos(perpBearing * Math.PI / 180)
      const lng = baseLng + offset * Math.sin(perpBearing * Math.PI / 180)
      
      intersections.push([lat, lng])
    }
    
    return intersections
  }

  const simulateRoadPattern = (start: [number, number], end: [number, number], progress: number, roadType: string, intersections: [number, number][]): [number, number] => {
    const bearing = calculateBearing(start, end)
    
    // Base interpolation
    let lat = start[0] + (end[0] - start[0]) * progress
    let lng = start[1] + (end[1] - start[1]) * progress
    
    // Apply road-type specific patterns
    switch (roadType) {
      case 'primary':
        // Highways: gentle curves, minimal intersections
        lat += Math.sin(progress * Math.PI * 2) * 0.0001
        lng += Math.cos(progress * Math.PI * 2) * 0.0001
        break
        
      case 'secondary':
        // Main roads: moderate curves, some intersections
        lat += Math.sin(progress * Math.PI * 3) * 0.00015
        lng += Math.cos(progress * Math.PI * 2.5) * 0.00015
        
        // Add intersection influence
        intersections.forEach(intersection => {
          const distToIntersection = calculateDistance([lat, lng], intersection)
          if (distToIntersection < 0.001) {
            const influence = 1 - (distToIntersection / 0.001)
            lat += (intersection[0] - lat) * influence * 0.3
            lng += (intersection[1] - lng) * influence * 0.3
          }
        })
        break
        
      case 'tertiary':
        // Connector roads: more curves, frequent turns
        lat += Math.sin(progress * Math.PI * 4) * 0.0002
        lng += Math.cos(progress * Math.PI * 3.5) * 0.0002
        
        // Add block-like patterns (simulate city blocks)
        const blockInfluence = Math.sin(progress * Math.PI * 8) * 0.0001
        lat += blockInfluence * Math.cos((bearing + 45) * Math.PI / 180)
        lng += blockInfluence * Math.sin((bearing + 45) * Math.PI / 180)
        break
        
      case 'residential':
        // Local streets: tight curves, many turns
        lat += Math.sin(progress * Math.PI * 6) * 0.00025
        lng += Math.cos(progress * Math.PI * 5) * 0.00025
        
        // Add cul-de-sac patterns
        if (progress > 0.7 && progress < 0.8) {
          const culDeSac = Math.sin((progress - 0.7) * Math.PI * 10) * 0.00015
          lat += culDeSac * Math.cos((bearing + 90) * Math.PI / 180)
          lng += culDeSac * Math.sin((bearing + 90) * Math.PI / 180)
        }
        break
    }
    
    // Add realistic road irregularities
    lat += (Math.random() - 0.5) * 0.00001
    lng += (Math.random() - 0.5) * 0.00001
    
    return [lat, lng]
  }

  const createFallbackRoadSegment = (start: [number, number], end: [number, number]): [number, number][] => {
    const distance = calculateDistance(start, end)
    const bearing = calculateBearing(start, end)
    
    const segments = Math.max(3, Math.min(8, Math.floor(distance * 2)))
    const points: [number, number][] = [start]
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      const curveFactor = Math.sin(progress * Math.PI) * 0.0001
      const perpendicularBearing = bearing + 90
      
      const lat = start[0] + (end[0] - start[0]) * progress + 
                  curveFactor * Math.cos(perpendicularBearing * Math.PI / 180)
      const lng = start[1] + (end[1] - start[1]) * progress + 
                  curveFactor * Math.sin(perpendicularBearing * Math.PI / 180)
      
      points.push([lat, lng])
    }
    
    points.push(end)
    return points
  }

  // Simple optimal insertion based on minimal distance deviation
  const findOptimalStopOrderSimple = (activeStops: BusStop[], originalStops: BusStop[]): BusStop[] => {
    const addedStops = activeStops.filter(s => s.isSimulated)
    const existingStops = activeStops.filter(s => !s.isSimulated)
    
    if (addedStops.length === 0) {
      return activeStops
    }
    
    let optimizedStops = [...existingStops]
    
    // Insert each added stop at optimal position
    addedStops.forEach(addedStop => {
      const insertionIndex = findBestInsertionPointSimple(addedStop, optimizedStops)
      optimizedStops.splice(insertionIndex, 0, addedStop)
    })
    
    return optimizedStops
  }

  // Find best insertion point based on minimal route deviation
  const findBestInsertionPointSimple = (addedStop: BusStop, stops: BusStop[]): number => {
    let bestIndex = 0
    let minDeviation = Infinity
    
    // Try inserting at each position
    for (let i = 0; i <= stops.length; i++) {
      const testStops = [...stops]
      testStops.splice(i, 0, addedStop)
      
      // Calculate total route distance
      const totalDistance = calculateRouteDistance(testStops)
      
      // Add demand bonus (high-demand stops get priority)
      const demandBonus = (addedStop.demandScore / 100) * 0.5 // km bonus
      const adjustedDeviation = Math.max(0, totalDistance - demandBonus)
      
      if (adjustedDeviation < minDeviation) {
        minDeviation = adjustedDeviation
        bestIndex = i
      }
    }
    
    return bestIndex
  }

  // Calculate total route distance
  const calculateRouteDistance = (stops: BusStop[]): number => {
    let totalDistance = 0
    
    if (stops.length > 1) {
      for (let i = 0; i < stops.length - 1; i++) {
        totalDistance += calculateDistance(stops[i].coordinates, stops[i + 1].coordinates)
      }
    }
    
    return totalDistance
  }

  // Find optimal order of stops with minimal route deviation
  const findOptimalStopOrder = async (activeStops: BusStop[], originalStops: BusStop[]): Promise<BusStop[]> => {
    const addedStops = activeStops.filter(s => s.isSimulated)
    const existingStops = activeStops.filter(s => !s.isSimulated)
    
    if (addedStops.length === 0) {
      return activeStops
    }
    
    let optimizedStops = [...existingStops]
    
    // Insert each added stop at optimal position
    for (const addedStop of addedStops) {
      const insertionIndex = await findBestInsertionPoint(addedStop, optimizedStops)
      optimizedStops.splice(insertionIndex, 0, addedStop)
    }
    
    return optimizedStops
  }

  // Find best insertion point for added stop based on minimal route deviation
  const findBestInsertionPoint = async (addedStop: BusStop, stops: BusStop[]): Promise<number> => {
    let bestIndex = 0
    let minDeviation = Infinity
    
    // Calculate original route distance (baseline)
    const originalDistance = await calculateTotalRouteDistance(stops)
    
    // Try inserting at each position
    for (let i = 0; i <= stops.length; i++) {
      const testStops = [...stops]
      testStops.splice(i, 0, addedStop)
      
      const newDistance = await calculateTotalRouteDistance(testStops)
      const deviation = newDistance - originalDistance
      
      // Add demand bonus (high-demand stops get priority)
      const demandBonus = (addedStop.demandScore / 100) * 0.5 // km bonus
      const adjustedDeviation = Math.max(0, deviation - demandBonus)
      
      if (adjustedDeviation < minDeviation) {
        minDeviation = adjustedDeviation
        bestIndex = i
      }
    }
    
    return bestIndex
  }

  // Calculate total route distance using road routing
  const calculateTotalRouteDistance = async (stops: BusStop[]): Promise<number> => {
    let totalDistance = 0
    
    if (stops.length > 1) {
      for (let i = 0; i < stops.length - 1; i++) {
        const roadSegment = await getRoadSegment(stops[i].coordinates, stops[i + 1].coordinates)
        totalDistance += calculatePathDistance(roadSegment)
      }
    }
    
    return totalDistance
  }

  // Calculate total distance of a path segment
  const calculatePathDistance = (path: [number, number][]): number => {
    let distance = 0
    for (let i = 0; i < path.length - 1; i++) {
      distance += calculateDistance(path[i], path[i + 1])
    }
    return distance
  }

  // Create realistic road segment between two stops
  const createRoadSegment = (start: [number, number], end: [number, number]): [number, number][] => {
    const distance = calculateDistance(start, end)
    const bearing = calculateBearing(start, end)
    
    // Create road-like curves with multiple segments
    const segments = Math.max(3, Math.min(8, Math.floor(distance * 2)))
    const points: [number, number][] = []
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      
      // Add slight curve to simulate road following
      const curveFactor = Math.sin(progress * Math.PI) * 0.0001
      const perpendicularBearing = bearing + 90
      
      // Calculate intermediate point
      const lat = start[0] + (end[0] - start[0]) * progress + 
                  curveFactor * Math.cos(perpendicularBearing * Math.PI / 180)
      const lng = start[1] + (end[1] - start[1]) * progress + 
                  curveFactor * Math.sin(perpendicularBearing * Math.PI / 180)
      
      points.push([lat, lng])
    }
    
    return points
  }

  // Calculate distance between two coordinates
  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371 // Earth's radius in km
    const dLat = (coord2[0] - coord1[0]) * Math.PI / 180
    const dLon = (coord2[1] - coord1[1]) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Calculate bearing between two coordinates
  const calculateBearing = (start: [number, number], end: [number, number]): number => {
    const dLon = (end[1] - start[1]) * Math.PI / 180
    const y = Math.sin(dLon) * Math.cos(end[0] * Math.PI / 180)
    const x = Math.cos(start[0] * Math.PI / 180) * Math.sin(end[0] * Math.PI / 180) -
              Math.sin(start[0] * Math.PI / 180) * Math.cos(end[0] * Math.PI / 180) * Math.cos(dLon)
    return Math.atan2(y, x) * 180 / Math.PI
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      <AnimatePresence>
        {isLoadingRoute && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[2000] flex items-center justify-center bg-[#07070f]/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-blue-400 animate-spin" />
              <p className="text-white/60 text-sm">Loading route…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add-stop button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setAddingStop(!addingStop)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-xl border transition-all ${
            addingStop
              ? 'bg-blue-500/30 border-blue-500/50 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
              : 'bg-white/[0.06] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.10]'
          }`}
        >
          <Plus size={13} />
          {addingStop ? 'Click map to place' : 'Add Stop'}
        </motion.button>
      </div>

      <MapContainer
        center={[-33.8688, 151.24]}
        zoom={12}
        className="w-full h-full"
        style={{ background: '#07070f' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />
        <MapController />
        <ClickHandler onMapClick={handleMapClick} />

        {/* Route path - glow layer */}
        {selectedRoute && getOptimizedPath().length > 1 && (
          <>
            <Polyline
              positions={getOptimizedPath()}
              pathOptions={{ color: selectedRoute.color, weight: 16, opacity: 0.10 }}
            />
            <Polyline
              positions={getOptimizedPath()}
              pathOptions={{ color: selectedRoute.color, weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        )}

        {/* Stops */}
        {allStops.map((stop) => {
          const isRemoved = 'isRemoved' in stop ? (stop as BusStop & { isRemoved?: boolean }).isRemoved ?? false : false
          const color = isRemoved ? '#6b7280' : getDemandColor(stop.demand)
          const isSelected = selectedStop?.id === stop.id
          const radius = isRemoved ? 4 : isSelected ? 9 : stop.isSimulated ? 7 : 6

          return (
            <CircleMarker
              key={stop.id}
              center={stop.coordinates}
              radius={radius}
              pathOptions={{
                color: '#ffffff',
                weight: isSelected ? 2.5 : 1.5,
                opacity: isRemoved ? 0.3 : 1,
                fillColor: color,
                fillOpacity: isRemoved ? 0.3 : 0.95,
              }}
              eventHandlers={{
                click: () => setSelectedStop(stop),
                mouseover: (e) => { e.target.setRadius(radius + 3); e.target.setStyle({ weight: 2 }) },
                mouseout:  (e) => { e.target.setRadius(radius); e.target.setStyle({ weight: isSelected ? 2.5 : 1.5 }) },
              }}
            >
              <Popup minWidth={240}>
                <StopPopup
                  stop={stop}
                  isRemoved={isRemoved}
                  onRemove={() => removeStop(stop.id)}
                  onRestore={() => restoreStop(stop.id)}
                />
              </Popup>
            </CircleMarker>
          )
        })}

        {/* Pending stop */}
        {pendingClick && (
          <CircleMarker
            center={[pendingClick.lat, pendingClick.lng]}
            radius={8}
            pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.6 }}
          />
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-6 right-4 z-[1000]">
        <div className="glass rounded-2xl p-3 border border-white/[0.08]">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-2">Demand</p>
          {[
            { color: '#ef4444', label: 'High' },
            { color: '#f59e0b', label: 'Medium' },
            { color: '#10b981', label: 'Low' },
            { color: '#6b7280', label: 'Removed' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 mb-1 last:mb-0">
              <div className="w-2.5 h-2.5 rounded-full border border-white/20"
                style={{ background: item.color, boxShadow: `0 0 5px ${item.color}60` }} />
              <span className="text-white/55 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Name input for new stop */}
      <AnimatePresence>
        {pendingClick && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-80"
          >
            <div className="glass rounded-2xl p-4 border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
              <p className="text-white/60 text-xs mb-2 font-medium">Name the new stop</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
                  placeholder="e.g. Market St & George St"
                  className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50"
                />
                <button onClick={handleAddStop} disabled={!newStopName.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-blue-400 transition-colors">
                  Add
                </button>
                <button onClick={() => setPendingClick(null)}
                  className="px-3 py-2 rounded-xl bg-white/[0.06] text-white/60 hover:text-white transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add-stop crosshair overlay */}
      <AnimatePresence>
        {addingStop && !pendingClick && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[999] pointer-events-none"
          >
            <div className="absolute top-16 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2 border border-blue-500/30">
              <p className="text-blue-300 text-sm font-medium">Click anywhere to place a new stop</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
