'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import HeroBanner from '@/components/layout/HeroBanner'
import DailyReward from '@/components/layout/DailyReward'
import StatsBar from '@/components/layout/StatsBar'
import GamesGrid from '@/components/games/GamesGrid'
import LiveFeed from '@/components/layout/LiveFeed'
import Leaderboard from '@/components/layout/Leaderboard'
import ParticleCanvas from '@/components/ui/ParticleCanvas'
import { useCasinoStore } from '@/lib/store'

export default function Home() {
  const { activeGame } = useCasinoStore()

  return (
    <main className="relative min-h-screen">
      <ParticleCanvas />

      <div className="relative z-10">
        <Navbar />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DailyReward />
          <HeroBanner />
          <StatsBar />

          {/* Section title */}
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="font-brand text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-purple shadow-[0_0_8px_#a855f7]" />
              Featured Games
            </h2>
            <button className="text-xs text-neon-purple border border-purple-800/50 px-3 py-1.5 rounded-lg
                               hover:bg-purple-900/20 transition-colors">
              All Games →
            </button>
          </div>

          <GamesGrid />

          {/* Bottom two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0 px-6 mt-8 pb-12">
            <div className="lg:pr-6 border-r border-white/5">
              <LiveFeed />
            </div>
            <div className="lg:pl-6 mt-6 lg:mt-0">
              <Leaderboard />
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
