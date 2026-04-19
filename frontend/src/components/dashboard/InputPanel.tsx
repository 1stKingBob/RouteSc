'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { TimeFilter, DayFilter } from '@/types'
import { Search, Bus, Clock, Calendar, X, ChevronRight, Loader2, Database, Wifi, WifiOff } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

const TIME_OPTIONS: { value: TimeFilter; label: string; sub: string }[] = [
  { value: 'morning',   label: 'Morning',   sub: '6–9 AM'      },
  { value: 'afternoon', label: 'Afternoon', sub: '12–3 PM'     },
  { value: 'evening',   label: 'Evening',   sub: '4–8 PM'      },
  { value: 'night',     label: 'Night',     sub: '9 PM–1 AM'   },
  { value: 'all',       label: 'All Day',   sub: 'Full day'    },
]

const DAY_OPTIONS: { value: DayFilter; label: string }[] = [
  { value: 'weekday', label: 'Weekday' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'all',     label: 'All Days' },
]

export function InputPanel() {
  const {
    allRoutes, searchResults, isLoadingRoutes, isSearching, usingRealData, totalRoutes,
    selectedRouteId, selectedRoute, isLoadingRoute,
    timeFilter, dayFilter,
    searchQuery, searchRoutes, selectRoute, setTimeFilter, setDayFilter,
    loadInitialRoutes,
  } = useStore()

  const [localQuery, setLocalQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Load real routes on mount
  useEffect(() => { loadInitialRoutes() }, [loadInitialRoutes])

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setLocalQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchRoutes(q), 220)
  }, [searchRoutes])

  const displayRoutes = searchResults.slice(0, 80)

  return (
    <div className="space-y-3">
      {/* Data source badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
          usingRealData
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}
      >
        {usingRealData ? <Database size={11} /> : <WifiOff size={11} />}
        <span>
          {usingRealData
            ? `NSW GTFS — ${totalRoutes.toLocaleString()} real routes`
            : 'Demo data — run backend for real NSW routes'}
        </span>
      </motion.div>

      {/* Search bar */}
      <GlassCard className="p-0 overflow-hidden" delay={0.05} animateIn>
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          {isSearching || isLoadingRoutes ? (
            <Loader2 size={15} className="text-blue-400 animate-spin flex-shrink-0" />
          ) : (
            <Search size={15} className="text-white/30 flex-shrink-0" />
          )}
          <input
            value={localQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Search ${totalRoutes > 4 ? totalRoutes.toLocaleString() + ' ' : ''}routes — number or name`}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none min-w-0"
          />
          {localQuery && (
            <button
              onClick={() => { setLocalQuery(''); searchRoutes('') }}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </GlassCard>

      {/* Route list */}
      <GlassCard className="p-0 overflow-hidden" delay={0.1} animateIn>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/15">
              <Bus size={12} className="text-blue-400" />
            </div>
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider">
              {localQuery ? `Results (${displayRoutes.length})` : 'All Routes'}
            </p>
          </div>
          {isLoadingRoute && <Loader2 size={12} className="text-blue-400 animate-spin" />}
        </div>

        <div className="overflow-y-auto max-h-[340px] px-2 pb-2 space-y-0.5">
          <AnimatePresence mode="popLayout">
            {displayRoutes.length === 0 && !isSearching && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center text-white/30 text-xs py-6"
              >
                No routes found for "{localQuery}"
              </motion.p>
            )}

            {displayRoutes.map((route, i) => {
              const isSelected = selectedRouteId === route.id
              return (
                <motion.button
                  key={route.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ delay: Math.min(i * 0.025, 0.3), duration: 0.2 }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectRoute(route.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group ${
                    isSelected
                      ? 'bg-white/[0.09] border border-white/[0.12]'
                      : 'hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Route number badge */}
                    <span
                      className="flex-shrink-0 w-9 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono"
                      style={{
                        background: isSelected ? `${route.color}28` : 'rgba(255,255,255,0.06)',
                        color: isSelected ? route.color : 'rgba(255,255,255,0.45)',
                        boxShadow: isSelected ? `0 0 12px ${route.color}35` : 'none',
                      }}
                    >
                      {route.routeNumber}
                    </span>

                    {/* Name */}
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-tight truncate ${
                        isSelected ? 'text-white' : 'text-white/55 group-hover:text-white/80'
                      }`}>
                        {route.routeName}
                      </p>
                      <p className="text-[10px] text-white/25 mt-0.5">
                        {route.stops.length} stops · {route.frequency}/hr
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <motion.div layoutId="routeChevron" className="flex-shrink-0 ml-1">
                      <ChevronRight size={13} style={{ color: route.color }} />
                    </motion.div>
                  )}
                </motion.button>
              )
            })}

            {displayRoutes.length === 80 && (
              <p className="text-center text-white/20 text-[10px] py-2">
                Showing first 80 — type to narrow results
              </p>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* Time filter */}
      <GlassCard className="p-4" delay={0.2} animateIn>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-purple-500/15">
            <Clock size={13} className="text-purple-400" />
          </div>
          <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider">Time Period</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {TIME_OPTIONS.slice(0, 4).map((t) => (
            <motion.button
              key={t.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTimeFilter(t.value)}
              className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all border ${
                timeFilter === t.value
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/45 hover:text-white/75 hover:bg-white/[0.06]'
              }`}
            >
              <span className="text-[11px] font-semibold">{t.label}</span>
              <span className="text-[9px] opacity-60 mt-0.5">{t.sub}</span>
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setTimeFilter('all')}
            className={`col-span-2 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
              timeFilter === 'all'
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-white/[0.03] border-white/[0.06] text-white/45 hover:text-white/75 hover:bg-white/[0.06]'
            }`}
          >
            All Day
          </motion.button>
        </div>
      </GlassCard>

      {/* Day filter */}
      <GlassCard className="p-4" delay={0.25} animateIn>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-teal-500/15">
            <Calendar size={13} className="text-teal-400" />
          </div>
          <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider">Day Type</p>
        </div>
        <div className="flex gap-1.5">
          {DAY_OPTIONS.map((d) => (
            <motion.button
              key={d.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDayFilter(d.value)}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all border ${
                dayFilter === d.value
                  ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/45 hover:text-white/75 hover:bg-white/[0.06]'
              }`}
            >
              {d.label}
            </motion.button>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
