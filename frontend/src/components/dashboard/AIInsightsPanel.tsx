'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { AI_INSIGHTS } from '@/lib/mockData'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkles, TrendingUp, AlertTriangle, Info, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { AIInsight } from '@/types'

const typeConfig = {
  optimization: {
    color: '#3b82f6',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    label: 'Optimization',
    Icon: TrendingUp,
  },
  warning: {
    color: '#f59e0b',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    label: 'Warning',
    Icon: AlertTriangle,
  },
  opportunity: {
    color: '#10b981',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Opportunity',
    Icon: Sparkles,
  },
  info: {
    color: '#8b5cf6',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    label: 'Info',
    Icon: Info,
  },
}

const impactColors = {
  high: 'bg-red-500/15 text-red-400',
  medium: 'bg-amber-500/15 text-amber-400',
  low: 'bg-blue-500/15 text-blue-400',
}

function InsightCard({ insight, index }: { insight: AIInsight; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)
  const config = typeConfig[insight.type]
  const TypeIcon = config.Icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${config.bg} ${config.border} hover:border-opacity-40`}
    >
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg" style={{ background: `${config.color}15` }}>
          <TypeIcon size={13} style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${config.text}`}>
              {config.label}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${impactColors[insight.impact]}`}>
              {insight.impact} impact
            </span>
          </div>
          <p className="text-white text-sm font-semibold leading-snug pr-2">{insight.title}</p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown size={14} className="text-white/30" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <p className="text-white/55 text-xs leading-relaxed mb-3">{insight.body}</p>
              {insight.metrics && (
                <div className="flex flex-wrap gap-2">
                  {insight.metrics.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${
                        m.positive
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}
                    >
                      {m.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      <span className="text-white/50 font-normal">{m.label}:</span>
                      <span>{m.value}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function AIInsightsPanel() {
  const { selectedRouteId } = useStore()
  const insights = (selectedRouteId ? AI_INSIGHTS[selectedRouteId] : null) ?? []

  return (
    <div className="space-y-3">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 px-1"
      >
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
          <Sparkles size={14} className="text-purple-400" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">AI Recommendations</p>
          <p className="text-white/30 text-[10px]">{insights.length} insights for this route</p>
        </div>
        <div className="ml-auto relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400" />
        </div>
      </motion.div>

      {/* Insight cards */}
      <div className="space-y-2.5">
        <AnimatePresence mode="wait">
          {insights.map((insight, i) => (
            <InsightCard key={insight.id} insight={insight} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {insights.length === 0 && (
        <div className="text-center py-8 text-white/30 text-sm">
          No insights available for this route.
        </div>
      )}
    </div>
  )
}
