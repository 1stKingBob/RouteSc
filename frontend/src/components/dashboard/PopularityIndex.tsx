'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, animate, useMotionValue } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { calculatePopularityScore } from '@/lib/calculations'
import { GlassCard } from '@/components/ui/GlassCard'
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react'

function CircularRing({ score, color, size = 120 }: { score: number; color: string; size?: number }) {
  const ref = useRef<SVGCircleElement>(null)
  const inViewRef = useRef(null)
  const isInView = useInView(inViewRef, { once: true })

  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference

  useEffect(() => {
    if (!isInView || !ref.current) return
    const el = ref.current
    el.style.strokeDashoffset = `${circumference}`
    const animation = el.animate(
      [
        { strokeDashoffset: circumference },
        { strokeDashoffset: strokeDashoffset },
      ],
      { duration: 1800, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)', fill: 'forwards' }
    )
    return () => animation.cancel()
  }, [isInView, strokeDashoffset, circumference])

  return (
    <div ref={inViewRef} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={8}
        />
        {/* Progress */}
        <circle
          ref={ref}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={circumference}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white font-mono">{score}</span>
        <span className="text-[10px] text-white/40">/100</span>
      </div>
    </div>
  )
}

const tierConfig = {
  excellent: { color: '#10b981', label: 'Excellent', bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: Award },
  good: { color: '#3b82f6', label: 'Good', bg: 'bg-blue-500/15', text: 'text-blue-400', icon: TrendingUp },
  average: { color: '#f59e0b', label: 'Average', bg: 'bg-amber-500/15', text: 'text-amber-400', icon: Minus },
  poor: { color: '#ef4444', label: 'Poor', bg: 'bg-red-500/15', text: 'text-red-400', icon: TrendingDown },
}

export function PopularityIndex() {
  const { selectedRoute } = useStore()
  if (!selectedRoute) return null

  const { score, avgRiders, boardingFrequency, growthTrend, tier } = calculatePopularityScore(selectedRoute)
  const config = tierConfig[tier]
  const TierIcon = config.icon

  const pillars = [
    { label: 'Avg Riders', value: Math.round(avgRiders), weight: '50%', color: '#3b82f6' },
    { label: 'Boarding Freq', value: Math.round(boardingFrequency) + '/hr', weight: '30%', color: '#06b6d4' },
    { label: 'Growth Trend', value: `+${growthTrend}%`, weight: '20%', color: '#10b981' },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
        <h2 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Popularity Index</h2>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main score */}
        <GlassCard className="p-6 flex flex-col items-center justify-center gap-4 md:col-span-1" delay={0} glowColor={tier === 'excellent' ? 'green' : tier === 'good' ? 'blue' : tier === 'average' ? 'amber' : 'red'}>
          <CircularRing score={score} color={config.color} size={140} />
          <div className="text-center">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
              <TierIcon size={12} />
              {config.label} Performance
            </div>
            <p className="text-white/40 text-xs mt-2">Route {selectedRoute.routeNumber}</p>
          </div>
        </GlassCard>

        {/* Formula breakdown */}
        <GlassCard className="p-5 md:col-span-2" delay={0.1}>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Score Components</p>
          <div className="space-y-4">
            {pillars.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.2 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-white/60 text-xs">{p.label}</span>
                    <span className="text-white/25 text-[10px]">({p.weight} weight)</span>
                  </div>
                  <span className="text-white font-semibold text-sm font-mono">{p.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(100, (i === 0 ? avgRiders / 120 : i === 1 ? boardingFrequency / 90 : growthTrend / 10) * 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: i * 0.1 + 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${p.color}80, ${p.color})` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <p className="text-white/30 text-[11px] font-mono">
              Score = 0.5×(riders/120×100) + 0.3×(freq/90×100) + 0.2×(trend/10×100)
            </p>
          </div>
        </GlassCard>
      </div>
    </motion.section>
  )
}
