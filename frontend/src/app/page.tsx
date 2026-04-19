'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { InputPanel } from '@/components/dashboard/InputPanel'
import { MetricsPanel } from '@/components/dashboard/MetricsPanel'
import { SimulationPanel } from '@/components/dashboard/SimulationPanel'
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel'
import { PopularityIndex } from '@/components/dashboard/PopularityIndex'
import { ScenarioComparison } from '@/components/dashboard/ScenarioComparison'
import { MapSkeleton } from '@/components/ui/LoadingSkeleton'

// Dynamic import — Leaflet is browser-only
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
}

const panelVariants = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const rightPanelVariants = {
  hidden: { opacity: 0, x: 30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const mapVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#07070f] flex flex-col relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-purple-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-teal-500/[0.03] rounded-full blur-3xl" />
      </div>

      <Header />

      {/* Main 3-column layout */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 flex overflow-hidden"
        style={{ height: 'calc(100vh - 57px)' }}
      >
        {/* Left panel */}
        <motion.aside
          variants={panelVariants}
          className="w-72 xl:w-80 flex-shrink-0 overflow-y-auto p-4 space-y-3 border-r border-white/[0.05]"
          style={{ background: 'rgba(7,7,15,0.6)', backdropFilter: 'blur(12px)' }}
        >
          <InputPanel />
          <SimulationPanel />
        </motion.aside>

        {/* Center: Map */}
        <motion.section
          variants={mapVariants}
          className="flex-1 relative overflow-hidden"
        >
          <MapView />

          {/* Map overlay gradient at edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#07070f]/40 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#07070f]/40 to-transparent z-10" />
        </motion.section>

        {/* Right panel */}
        <motion.aside
          variants={rightPanelVariants}
          className="w-80 xl:w-96 flex-shrink-0 overflow-y-auto p-4 space-y-3 border-l border-white/[0.05]"
          style={{ background: 'rgba(7,7,15,0.6)', backdropFilter: 'blur(12px)' }}
        >
          <MetricsPanel />
          <div className="border-t border-white/[0.06] my-2" />
          <AIInsightsPanel />
        </motion.aside>
      </motion.main>

      {/* Scrollable bottom section */}
      <section className="px-6 py-10 space-y-12 border-t border-white/[0.05]" style={{ background: 'rgba(7,7,15,0.8)' }}>
        {/* Section divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />

        <PopularityIndex />

        <ScenarioComparison />

        {/* Footer stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/[0.06]"
        >
          {[
            { label: 'Active Routes', value: '4', sub: 'NSW monitored' },
            { label: 'Total Stops', value: '33', sub: 'Across all routes' },
            { label: 'Data Source', value: 'NSW OTD', sub: 'Open Transport Data' },
            { label: 'Platform', value: 'TransitFlow AI', sub: 'v1.0 · Live' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <p className="text-white font-bold text-lg">{stat.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{stat.label}</p>
              <p className="text-white/25 text-[10px]">{stat.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  )
}
