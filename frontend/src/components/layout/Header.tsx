'use client'

import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { Activity, Layers, BusIcon, Database, WifiOff } from 'lucide-react'

export function Header() {
  const { selectedRoute, totalRoutes, usingRealData } = useStore()

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative z-50 flex items-center justify-between px-6 py-3 border-b border-white/[0.06]"
      style={{ background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(24px)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] overflow-hidden">
            <img 
              src="/logo.png" 
              alt="RouteScout Logo" 
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-none tracking-tight">RouteScout</h1>
            <p className="text-white/30 text-[10px] leading-none mt-0.5">NSW Route Intelligence</p>
          </div>
        </motion.div>
      </div>

      {/* Active route badge */}
      {selectedRoute && (
        <motion.div
          key={selectedRoute.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl border"
          style={{
            background: `${selectedRoute.color}12`,
            borderColor: `${selectedRoute.color}30`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: selectedRoute.color, boxShadow: `0 0 8px ${selectedRoute.color}` }}
          />
          <span className="text-white font-semibold text-sm">Route {selectedRoute.routeNumber}</span>
          <span className="text-white/40 text-xs hidden sm:block">·</span>
          <span className="text-white/40 text-xs hidden sm:block truncate max-w-[220px]">
            {selectedRoute.routeName}
          </span>
          <span className="text-white/25 text-[10px] hidden md:block">
            · {selectedRoute.stops.length} stops
          </span>
        </motion.div>
      )}

      {/* Right stats */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 text-white/40 text-xs">
          <Activity size={12} className="text-emerald-400" />
          <span>Live · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-white/40 text-xs">
          <Layers size={12} />
          <span>{totalRoutes.toLocaleString()} routes</span>
        </div>
        <motion.div
          key={usingRealData ? 'real' : 'mock'}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
            usingRealData
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}
        >
          {usingRealData ? <Database size={11} /> : <WifiOff size={11} />}
          <span>{usingRealData ? 'NSW GTFS Live' : 'Demo Mode'}</span>
        </motion.div>
      </div>
    </motion.header>
  )
}
