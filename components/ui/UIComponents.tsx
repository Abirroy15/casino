// ══════════════════════════════════════════════════════════════
//  components/ui/SoundToggle.tsx
// ══════════════════════════════════════════════════════════════
'use client'
import { useState } from 'react'
import { motion }   from 'framer-motion'
import { useSound } from '@/hooks/useSound'

export function SoundToggle() {
  const { toggleMute } = useSound()
  const [muted, setMuted] = useState(false)

  const toggle = () => {
    const nowMuted = toggleMute()
    setMuted(nowMuted)
  }

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="w-9 h-9 flex items-center justify-center rounded-xl
                 bg-white/[0.04] border border-white/[0.08]
                 text-text-secondary hover:text-text-primary
                 hover:border-purple-500/30 transition-all"
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      <span className="text-sm">{muted ? '🔇' : '🔊'}</span>
    </motion.button>
  )
}

// ══════════════════════════════════════════════════════════════
//  components/ui/MobileNav.tsx  — fixed bottom nav for mobile
// ══════════════════════════════════════════════════════════════
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  { href:'/',               icon:'🎰', label:'Lobby'       },
  { href:'/leaderboard',    icon:'🏆', label:'Ranks'       },
  { href:'/rewards',        icon:'🎁', label:'Rewards'     },
  { href:'/provably-fair',  icon:'🛡️', label:'Fair'        },
  { href:'/profile',        icon:'👤', label:'Profile'     },
]

export function MobileNav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden
                    bg-casino-dark/90 backdrop-blur-xl border-t border-white/[0.07]
                    px-2 pb-safe">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map(item => {
          const active = path === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-3
                          text-[10px] font-medium transition-colors
                          ${active ? 'text-neon-purple' : 'text-text-muted'}`}>
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 w-8 h-0.5 rounded-full bg-neon-purple"
                />
              )}
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ══════════════════════════════════════════════════════════════
//  components/ui/LoadingSkeleton.tsx
// ══════════════════════════════════════════════════════════════
'use client'
import { motion } from 'framer-motion'

export function GameCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] p-5 overflow-hidden">
      <div className="skeleton h-10 w-10 rounded-xl mb-4" />
      <div className="skeleton h-4 w-24 rounded mb-2" />
      <div className="skeleton h-3 w-32 rounded mb-4" />
      <div className="skeleton h-6 w-16 rounded-md mb-4" />
      <div className="flex justify-between">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-12 rounded" />
      </div>
    </div>
  )
}

export function FeedItemSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.04]">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-3 w-16 rounded flex-1" />
      <div className="skeleton h-3 w-8 rounded" />
      <div className="skeleton h-3 w-14 rounded" />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center
                    bg-casino-dark">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="text-5xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          🎰
        </motion.div>
        <div className="font-brand text-2xl font-bold neon-text-purple">MagicPlay</div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              className="w-2 h-2 rounded-full bg-neon-purple"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  components/ui/JackpotBanner.tsx — animated jackpot notice
// ══════════════════════════════════════════════════════════════
'use client'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiveFeed } from '@/services/live-feed'

export function JackpotBanner() {
  const [message, setMessage] = useState<string | null>(null)

  useLiveFeed((event) => {
    if (event.type === 'jackpot' && event.message) {
      setMessage(event.message)
      setTimeout(() => setMessage(null), 5000)
    }
  })

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[150]
                     px-5 py-3 rounded-2xl font-brand text-base font-bold text-white
                     shadow-[0_0_40px_rgba(245,158,11,0.5)]"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
