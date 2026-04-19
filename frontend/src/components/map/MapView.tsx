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

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (addingStop) { setPendingClick({ lat, lng }); setNewStopName('') }
  }, [addingStop])

  const handleAddStop = () => {
    if (!pendingClick || !newStopName.trim()) return
    addSimulatedStop({
      id: `sim-${Date.now()}`,
      name: newStopName.trim(),
      coordinates: [pendingClick.lat, pendingClick.lng],
      demand: 'medium', demandScore: 50, avgRiders: 45,
      boardingFrequency: 30, growthTrend: 3.0, isSimulated: true,
    })
    setPendingClick(null); setAddingStop(false); setNewStopName('')
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

        {/* Route path — glow layer */}
        {selectedRoute && selectedRoute.path.length > 1 && (
          <>
            <Polyline
              positions={selectedRoute.path}
              pathOptions={{ color: selectedRoute.color, weight: 16, opacity: 0.10 }}
            />
            <Polyline
              positions={selectedRoute.path}
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
