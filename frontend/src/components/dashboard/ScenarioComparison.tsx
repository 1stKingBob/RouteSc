'use client'

import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-xl p-2.5 border border-white/[0.08] text-xs space-y-1">
        <p className="text-white/50 font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

export function ScenarioComparison() {
  const { baseMetrics, simulatedMetrics, selectedRoute, simulation } = useStore()
  if (!baseMetrics || !simulatedMetrics || !selectedRoute) return null

  const hasChanges =
    simulation.addedStops.length > 0 ||
    simulation.removedStopIds.length > 0 ||
    simulation.frequency !== selectedRoute.frequency

  const radarData = [
    { metric: 'Efficiency', base: baseMetrics.efficiencyScore, sim: simulatedMetrics.efficiencyScore },
    { metric: 'Coverage', base: Math.round(baseMetrics.coverageArea * 8), sim: Math.round(simulatedMetrics.coverageArea * 8) },
    { metric: 'Capacity', base: 100 - baseMetrics.passengerLoad, sim: 100 - simulatedMetrics.passengerLoad },
    { metric: 'Speed', base: Math.round((1 - baseMetrics.waitTime / 30) * 100), sim: Math.round((1 - simulatedMetrics.waitTime / 30) * 100) },
    { metric: 'Riders', base: Math.round(baseMetrics.ridersServed / 8), sim: Math.round(simulatedMetrics.ridersServed / 8) },
  ]

  const barData = [
    { name: 'Route Time', base: baseMetrics.routeTime, sim: simulatedMetrics.routeTime, unit: 'min' },
    { name: 'Wait Time', base: Math.round(baseMetrics.waitTime * 10) / 10, sim: Math.round(simulatedMetrics.waitTime * 10) / 10, unit: 'min' },
    { name: 'Load %', base: baseMetrics.passengerLoad, sim: simulatedMetrics.passengerLoad, unit: '%' },
    { name: 'Efficiency', base: baseMetrics.efficiencyScore, sim: simulatedMetrics.efficiencyScore, unit: '/100' },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
        <h2 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Scenario Comparison</h2>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
      </div>

      {!hasChanges && (
        <div className="text-center py-6">
          <p className="text-white/30 text-sm">Use the simulation panel to make changes and compare scenarios.</p>
        </div>
      )}

      {hasChanges && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bar comparison */}
          <GlassCard className="p-5" delay={0}>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Key Metrics</p>
            <div className="flex items-center gap-4 mb-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-white/30 inline-block" />Baseline</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-500 inline-block" />Simulated</span>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="base" name="Baseline" fill="rgba(255,255,255,0.12)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sim" name="Simulated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Radar comparison */}
          <GlassCard className="p-5" delay={0.1}>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Performance Radar</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                  <Radar name="Baseline" dataKey="base" stroke="rgba(255,255,255,0.25)" fill="rgba(255,255,255,0.05)" />
                  <Radar name="Simulated" dataKey="sim" stroke="#3b82f6" fill="rgba(59,130,246,0.15)" />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Delta summary cards */}
          {[
            { label: 'Wait Time Change', base: baseMetrics.waitTime, sim: simulatedMetrics.waitTime, unit: ' min', lowerBetter: true },
            { label: 'Efficiency Change', base: baseMetrics.efficiencyScore, sim: simulatedMetrics.efficiencyScore, unit: '/100', lowerBetter: false },
            { label: 'Rider Load Change', base: baseMetrics.passengerLoad, sim: simulatedMetrics.passengerLoad, unit: '%', lowerBetter: true },
            { label: 'Route Time Change', base: baseMetrics.routeTime, sim: simulatedMetrics.routeTime, unit: ' min', lowerBetter: true },
          ].map((item, i) => {
            const delta = item.sim - item.base
            const positive = item.lowerBetter ? delta < 0 : delta > 0
            return (
              <GlassCard key={item.label} className="p-4" delay={i * 0.06 + 0.15}>
                <p className="text-white/40 text-xs mb-2">{item.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold font-mono ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}{item.unit}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {positive ? 'improved' : 'degraded'}
                  </span>
                </div>
                <p className="text-white/25 text-[10px] mt-1 font-mono">
                  {item.base.toFixed(1)} → {item.sim.toFixed(1)}{item.unit}
                </p>
              </GlassCard>
            )
          })}
        </div>
      )}
    </motion.section>
  )
}
