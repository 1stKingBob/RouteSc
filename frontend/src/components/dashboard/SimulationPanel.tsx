'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Play, RotateCcw, Save, ChevronDown, ChevronUp, Sliders, X, Check, Bus } from 'lucide-react'

export function SimulationPanel() {
  const { simulation, selectedRoute, setFrequency, restoreStop, removeStop, resetSimulation, saveScenario, savedScenarios, loadScenario } = useStore()
  const [scenarioName, setScenarioName] = useState('')
  const [saveMode, setSaveMode] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const hasChanges =
    simulation.addedStops.length > 0 ||
    simulation.removedStopIds.length > 0 ||
    selectedRoute && simulation.frequency !== selectedRoute.frequency

  const handleSave = () => {
    if (!scenarioName.trim()) return
    saveScenario(scenarioName.trim())
    setScenarioName('')
    setSaveMode(false)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <GlassCard className="overflow-hidden" delay={0.1} animateIn>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Sliders size={14} className="text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Simulation Engine</p>
              {hasChanges && (
                <p className="text-blue-400 text-[10px] font-medium">● Active changes</p>
              )}
            </div>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-white/40" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {/* Frequency slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Bus size={13} className="text-blue-400" />
                      <p className="text-white/60 text-xs font-semibold">Buses per Hour</p>
                    </div>
                    <motion.span
                      key={simulation.frequency}
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-blue-400 font-bold font-mono text-sm"
                    >
                      {simulation.frequency}
                    </motion.span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 rounded-full h-1 my-auto"
                      style={{
                        background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                        width: `${((simulation.frequency - 2) / (15 - 2)) * 100}%`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    />
                    <input
                      type="range"
                      min={2}
                      max={15}
                      step={1}
                      value={simulation.frequency}
                      onChange={(e) => setFrequency(Number(e.target.value))}
                      className="relative w-full"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-white/25 mt-1">
                    <span>2/hr</span>
                    <span className="text-white/40">
                      {Math.round(60 / simulation.frequency)} min avg wait
                    </span>
                    <span>15/hr</span>
                  </div>
                </div>

                {/* Removed stops */}
                {simulation.removedStopIds.length > 0 && (
                  <div>
                    <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Removed Stops ({simulation.removedStopIds.length})
                    </p>
                    <div className="space-y-1.5">
                      {simulation.removedStopIds.map((id) => {
                        const stop = selectedRoute?.stops.find((s) => s.id === id)
                        if (!stop) return null
                        return (
                          <motion.div
                            key={id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              <span className="text-white/70 text-xs">{stop.name}</span>
                            </div>
                            <button
                              onClick={() => restoreStop(id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <RotateCcw size={12} />
                            </button>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Added stops */}
                {simulation.addedStops.length > 0 && (
                  <div>
                    <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Added Stops ({simulation.addedStops.length})
                    </p>
                    <div className="space-y-1.5">
                      {simulation.addedStops.map((stop) => (
                        <motion.div
                          key={stop.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span className="text-white/70 text-xs">{stop.name}</span>
                          </div>
                          <span className="text-[10px] text-blue-400/60 bg-blue-500/10 px-1.5 py-0.5 rounded-full">new</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={resetSimulation}
                    disabled={!hasChanges}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] text-white/60 border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-30 transition-all"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSaveMode(true)}
                    disabled={!hasChanges}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-30 transition-all"
                  >
                    <Save size={12} />
                    Save
                  </motion.button>
                </div>

                {/* Save input */}
                <AnimatePresence>
                  {saveMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={scenarioName}
                          onChange={(e) => setScenarioName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                          placeholder="Scenario name…"
                          className="flex-1 bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500/50"
                        />
                        <button onClick={handleSave} className="px-3 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setSaveMode(false)} className="px-3 py-2 rounded-xl bg-white/[0.05] text-white/40 hover:text-white/60">
                          <X size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Saved scenarios */}
      <AnimatePresence>
        {savedScenarios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <GlassCard className="p-4" delay={0}>
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-2">Saved Scenarios</p>
              <div className="space-y-1.5">
                {savedScenarios.slice(-3).map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => loadScenario(scenario.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-all text-left group"
                  >
                    <div>
                      <p className="text-white/70 text-xs font-medium group-hover:text-white transition-colors">{scenario.name}</p>
                      <p className="text-white/30 text-[9px] mt-0.5">
                        Eff. {scenario.metrics.efficiencyScore}/100 · {scenario.simulation.frequency}/hr
                      </p>
                    </div>
                    <span className="text-[9px] text-white/25 text-right">
                      {scenario.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
