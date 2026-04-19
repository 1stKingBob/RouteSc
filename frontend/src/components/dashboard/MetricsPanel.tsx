'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { AnimatedCounter, DeltaBadge } from '@/components/ui/AnimatedCounter'
import { GlassCard } from '@/components/ui/GlassCard'
import { ImpactMetrics } from '@/types'
import { Clock, Users, Zap, TrendingUp, Target, Map } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MOCK_TIME_CHART = [
  { time: '6AM', riders: 32 },
  { time: '7AM', riders: 78 },
  { time: '8AM', riders: 142 },
  { time: '9AM', riders: 118 },
  { time: '10AM', riders: 62 },
  { time: '11AM', riders: 55 },
  { time: '12PM', riders: 71 },
  { time: '1PM', riders: 68 },
  { time: '2PM', riders: 60 },
  { time: '3PM', riders: 74 },
  { time: '4PM', riders: 98 },
  { time: '5PM', riders: 158 },
  { time: '6PM', riders: 132 },
  { time: '7PM', riders: 88 },
  { time: '8PM', riders: 52 },
  { time: '9PM', riders: 38 },
]

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  baseValue: number
  simValue: number
  suffix?: string
  prefix?: string
  decimals?: number
  lowerIsBetter?: boolean
  color: string
  delay?: number
}

function MetricCard({ icon, label, baseValue, simValue, suffix, prefix, decimals = 0, lowerIsBetter = false, color, delay = 0 }: MetricCardProps) {
  const delta = simValue - baseValue
  const hasChange = Math.abs(delta) > 0.05

  return (
    <GlassCard className="p-4" delay={delay} glowColor="none">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-xl" style={{ background: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        {hasChange && (
          <DeltaBadge delta={delta} unit={suffix} lowerIsBetter={lowerIsBetter} />
        )}
      </div>
      <div className="mt-2">
        <AnimatedCounter
          value={simValue}
          decimals={decimals}
          suffix={suffix}
          prefix={prefix}
          className="text-2xl font-bold text-white font-mono"
          duration={1.2}
        />
        <p className="text-white/40 text-xs mt-0.5">{label}</p>
      </div>
    </GlassCard>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-xl p-2.5 border border-white/[0.08] text-xs">
        <p className="text-white/50 mb-1">{label}</p>
        <p className="text-blue-300 font-semibold">{payload[0].value} riders</p>
      </div>
    )
  }
  return null
}

export function MetricsPanel() {
  const { baseMetrics, simulatedMetrics, selectedRoute, simulation } = useStore()

  if (!baseMetrics || !simulatedMetrics || !selectedRoute) return null

  const metrics: MetricCardProps[] = [
    { icon: <Clock size={16} />, label: 'Avg Route Time', baseValue: baseMetrics.routeTime, simValue: simulatedMetrics.routeTime, suffix: ' min', lowerIsBetter: true, color: '#3b82f6', delay: 0.1 },
    { icon: <Users size={16} />, label: 'Avg Wait Time', baseValue: baseMetrics.waitTime, simValue: simulatedMetrics.waitTime, decimals: 1, suffix: ' min', lowerIsBetter: true, color: '#f59e0b', delay: 0.15 },
    { icon: <Target size={16} />, label: 'Passenger Load', baseValue: baseMetrics.passengerLoad, simValue: simulatedMetrics.passengerLoad, suffix: '%', lowerIsBetter: true, color: '#ef4444', delay: 0.2 },
    { icon: <Zap size={16} />, label: 'Efficiency Score', baseValue: baseMetrics.efficiencyScore, simValue: simulatedMetrics.efficiencyScore, suffix: '/100', color: '#10b981', delay: 0.25 },
    { icon: <TrendingUp size={16} />, label: 'Time Savings', baseValue: 0, simValue: simulatedMetrics.timeSavings, decimals: 1, suffix: ' min', color: '#06b6d4', delay: 0.3 },
    { icon: <Map size={16} />, label: 'Coverage Area', baseValue: baseMetrics.coverageArea, simValue: simulatedMetrics.coverageArea, decimals: 1, suffix: ' km²', color: '#8b5cf6', delay: 0.35 },
  ]

  return (
    <div className="space-y-3">
      {/* Live status indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-2.5 rounded-xl glass border border-white/[0.08]"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-xs font-semibold text-white/70">
            {simulation.isActive || simulation.addedStops.length > 0 || simulation.removedStopIds.length > 0
              ? 'Simulation Active'
              : 'Live Data'}
          </span>
        </div>
        <span className="text-[10px] text-white/30 font-mono">
          {selectedRoute.routeNumber} · {selectedRoute.stops.length - simulation.removedStopIds.length + simulation.addedStops.length} stops
        </span>
      </motion.div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m, i) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Riders per day chart */}
      <GlassCard className="p-4" delay={0.4}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Daily Demand Profile</p>
          <span className="text-[10px] text-white/30">Weekday average</span>
        </div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_TIME_CHART} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="ridersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="riders" stroke="#3b82f6" strokeWidth={2} fill="url(#ridersGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Riders served */}
      <GlassCard className="p-4" delay={0.45} glowColor="teal">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-medium mb-1">Total Riders Served</p>
            <AnimatedCounter
              value={simulatedMetrics.ridersServed}
              className="text-3xl font-bold gradient-text-teal"
              duration={1.5}
            />
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs font-medium mb-1">Per Stop Avg</p>
            <AnimatedCounter
              value={Math.round(simulatedMetrics.ridersServed / Math.max(1, selectedRoute.stops.length - simulation.removedStopIds.length + simulation.addedStops.length))}
              className="text-xl font-bold text-white/80"
              duration={1.5}
            />
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
