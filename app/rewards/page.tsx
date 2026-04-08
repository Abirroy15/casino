'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import toast from 'react-hot-toast'
import Navbar from '@/components/layout/Navbar'
import ParticleCanvas from '@/components/ui/ParticleCanvas'
import { useCasinoStore } from '@/lib/store'

// ── Reward Schedule ───────────────────────────────────────────
interface DailyRewardDef {
  day:    number
  label:  string
  amount: number
  unit:   'SOL' | 'MAGIC' | 'Multiplier'
  icon:   string
  color:  string
  special?: string
}

const DAILY_REWARDS: DailyRewardDef[] = [
  { day:1,  label:'Day 1',  amount:0.02,  unit:'SOL',        icon:'🎁', color:'text-purple-300 bg-purple-900/30',  },
  { day:2,  label:'Day 2',  amount:0.03,  unit:'SOL',        icon:'💜', color:'text-purple-300 bg-purple-900/30',  },
  { day:3,  label:'Day 3',  amount:0.05,  unit:'SOL',        icon:'⚡', color:'text-blue-300   bg-blue-900/30',    },
  { day:4,  label:'Day 4',  amount:0.05,  unit:'SOL',        icon:'🌟', color:'text-blue-300   bg-blue-900/30',    },
  { day:5,  label:'Day 5',  amount:0.08,  unit:'SOL',        icon:'🔥', color:'text-cyan-300   bg-cyan-900/30',    },
  { day:6,  label:'Day 6',  amount:0.10,  unit:'SOL',        icon:'💎', color:'text-cyan-300   bg-cyan-900/30',    },
  { day:7,  label:'WEEK 1', amount:0.25,  unit:'SOL',        icon:'🏆', color:'text-yellow-300 bg-yellow-900/30', special:'BONUS' },
  { day:14, label:'WEEK 2', amount:0.5,   unit:'SOL',        icon:'👑', color:'text-orange-300 bg-orange-900/30', special:'MEGA'  },
  { day:21, label:'WEEK 3', amount:1.0,   unit:'SOL',        icon:'🚀', color:'text-red-300    bg-red-900/30',    special:'EPIC'  },
  { day:30, label:'MONTH',  amount:5.0,   unit:'SOL',        icon:'🌌', color:'text-pink-300   bg-pink-900/30',   special:'LEGENDARY' },
]

const BOOSTERS = [
  { name:'2× Multiplier', desc:'Double your next win payout', icon:'⚡', cost:150, color:'text-cyan-300 bg-cyan-900/30' },
  { name:'Free Spin',     desc:'One free slot machine spin',  icon:'🎰', cost:200, color:'text-yellow-300 bg-yellow-900/30' },
  { name:'Loss Shield',   desc:'Recover your next loss',      icon:'🛡️', cost:300, color:'text-blue-300 bg-blue-900/30'  },
  { name:'Hot Streak',    desc:'+10% win rate for 10 games',  icon:'🔥', cost:500, color:'text-orange-300 bg-orange-900/30' },
]

// ── Streak calendar strip ─────────────────────────────────────
function StreakCalendar({ streak, today }: { streak: number; today: number }) {
  return (
    <div className="flex gap-1.5 flex-wrap justify-center">
      {Array.from({ length: 30 }, (_, i) => {
        const day   = i + 1
        const done  = day < today
        const isNow = day === today
        const isMilestone = [7, 14, 21, 30].includes(day)
        return (
          <motion.div key={day}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold
                        transition-all border
                        ${done   ? 'bg-green-900/40 border-green-600/50 text-green-300'     : ''}
                        ${isNow  ? 'bg-purple-700/50 border-purple-400/70 text-white scale-110 shadow-glow-purple' : ''}
                        ${!done && !isNow ? 'bg-white/[0.03] border-white/[0.07] text-text-muted' : ''}
                        ${isMilestone && !done && !isNow ? 'border-yellow-600/40 bg-yellow-900/20 text-yellow-500' : ''}
                      `}
          >
            {done ? '✓' : day}
            {isMilestone && (
              <span className="absolute -top-1.5 -right-1.5 text-[8px]">⭐</span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function RewardsPage() {
  const { connected, balance, setBalance } = useCasinoStore()
  const [streak, setStreak]         = useState(5)
  const [claimed, setClaimed]       = useState(false)
  const [magicPoints, setPoints]    = useState(1250)
  const [confetti, setConfetti]     = useState(false)
  const [activeTab, setActiveTab]   = useState<'daily'|'shop'|'missions'>('daily')
  const today = 6  // mock: currently on day 6

  const todayReward = DAILY_REWARDS.find(r => r.day === today) || DAILY_REWARDS[0]
  const nextMilestone = DAILY_REWARDS.find(r => r.day > today && [7,14,21,30].includes(r.day))

  const handleClaim = () => {
    if (!connected) { toast.error('Connect wallet first'); return }
    if (claimed) { toast.error('Already claimed today!'); return }

    setClaimed(true)
    setStreak(s => s + 1)
    setBalance(balance + todayReward.amount)
    setPoints(p => p + 50)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 3500)
    toast.success(`🎁 Claimed ${todayReward.amount} SOL! Streak: ${streak + 1} days 🔥`)
  }

  const handleBuyBooster = (cost: number, name: string) => {
    if (magicPoints < cost) { toast.error('Not enough Magic Points!'); return }
    setPoints(p => p - cost)
    toast.success(`⚡ ${name} activated!`)
  }

  return (
    <main className="relative min-h-screen">
      <ParticleCanvas />
      {confetti && <Confetti numberOfPieces={250} recycle={false} />}
      <div className="relative z-10">
        <Navbar />

        <div className="max-w-3xl mx-auto px-6 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6">
            <h1 className="font-brand text-4xl font-bold neon-text-purple mb-1">🎁 Daily Rewards</h1>
            <p className="text-text-secondary text-sm">Log in every day to earn SOL and Magic Points</p>
          </motion.div>

          {/* Streak hero */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 mb-6 text-center relative overflow-hidden"
            style={{ background:'linear-gradient(135deg,rgba(168,85,247,0.15),rgba(59,130,246,0.1))',
                     border:'1px solid rgba(168,85,247,0.25)' }}>
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background:'radial-gradient(ellipse at 50% -20%,rgba(168,85,247,0.2),transparent 60%)' }} />
            <div className="relative z-10">
              <div className="text-5xl mb-2">🔥</div>
              <div className="font-brand text-5xl font-bold text-orange-400">{streak}</div>
              <div className="text-sm text-text-secondary mt-1">Day Streak</div>
              {nextMilestone && (
                <div className="mt-3 text-xs text-text-secondary">
                  Next milestone in <span className="text-yellow-400 font-bold">{nextMilestone.day - today} days</span>
                  {' '}— {nextMilestone.icon} {nextMilestone.amount} SOL bonus!
                </div>
              )}
              <div className="mt-2 text-xs text-neon-green font-bold">
                💎 {magicPoints.toLocaleString()} Magic Points
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] mb-6">
            {(['daily','shop','missions'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize
                  ${activeTab === tab
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'text-text-secondary hover:text-text-primary'}`}>
                {tab === 'daily' ? '📅 Daily' : tab === 'shop' ? '🛒 Shop' : '🎯 Missions'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── DAILY TAB ── */}
            {activeTab === 'daily' && (
              <motion.div key="daily" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}>

                {/* 30-day calendar */}
                <div className="glass rounded-2xl p-5 mb-5">
                  <div className="text-sm font-semibold text-text-secondary mb-4 text-center uppercase tracking-wider">
                    30-Day Streak Calendar
                  </div>
                  <StreakCalendar streak={streak} today={today} />
                </div>

                {/* Today's reward card */}
                <div className="glass rounded-2xl p-6 text-center mb-5">
                  <div className="text-5xl mb-3">{todayReward.icon}</div>
                  <div className="font-brand text-xl font-bold text-text-primary mb-1">
                    Today's Reward
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-lg text-lg font-bold mb-4 ${todayReward.color}`}>
                    +{todayReward.amount} {todayReward.unit}
                  </div>
                  <div className="text-xs text-text-secondary mb-5">
                    Also earn <span className="text-neon-green font-bold">+50 Magic Points</span> for claiming
                  </div>

                  <motion.button onClick={handleClaim}
                    disabled={claimed || !connected}
                    className={`w-full py-4 rounded-xl font-brand text-xl font-bold tracking-wide border-none
                                transition-all disabled:opacity-50 disabled:cursor-not-allowed
                                ${claimed ? 'bg-green-700/40 text-green-300' : 'btn-primary'}`}
                    whileHover={{ scale: claimed ? 1 : 1.02 }}
                    whileTap={{ scale: claimed ? 1 : 0.97 }}
                    animate={!claimed ? {
                      boxShadow: ['0 0 0 0 rgba(168,85,247,0.4)','0 0 0 12px rgba(168,85,247,0)','0 0 0 0 rgba(168,85,247,0.4)']
                    } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}>
                    {claimed ? '✅ Claimed Today!' : `🎁 Claim ${todayReward.amount} SOL`}
                  </motion.button>

                  {!connected && (
                    <p className="text-xs text-text-muted mt-2">Connect wallet to claim rewards</p>
                  )}
                </div>

                {/* Upcoming milestones */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DAILY_REWARDS.filter(r => [7,14,21,30].includes(r.day)).map((r, i) => (
                    <motion.div key={r.day}
                      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`glass rounded-xl p-3 text-center border
                        ${r.day <= today ? 'border-green-600/30 opacity-60' : 'border-white/[0.07]'}`}>
                      <div className="text-2xl mb-1">{r.icon}</div>
                      <div className="text-xs font-bold text-text-primary">{r.label}</div>
                      {r.special && (
                        <div className="text-[10px] text-yellow-400 font-bold mb-0.5">{r.special}</div>
                      )}
                      <div className={`text-sm font-bold mt-1 ${r.color.split(' ')[0]}`}>
                        {r.amount} SOL
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── SHOP TAB ── */}
            {activeTab === 'shop' && (
              <motion.div key="shop" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}>
                <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-secondary">Your Magic Points</div>
                    <div className="font-brand text-2xl font-bold text-neon-green">{magicPoints.toLocaleString()} MP</div>
                  </div>
                  <div className="text-3xl">💎</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BOOSTERS.map((b, i) => (
                    <motion.div key={b.name}
                      initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                      transition={{ delay: i * 0.07 }}
                      className="glass rounded-2xl p-4 border border-white/[0.07]
                                 hover:border-purple-500/30 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`text-3xl w-12 h-12 rounded-xl flex items-center justify-center ${b.color}`}>
                          {b.icon}
                        </div>
                        <span className="text-xs font-bold text-neon-green">{b.cost} MP</span>
                      </div>
                      <div className="font-semibold text-sm text-text-primary mb-1">{b.name}</div>
                      <div className="text-xs text-text-secondary mb-3">{b.desc}</div>
                      <button onClick={() => handleBuyBooster(b.cost, b.name)}
                        disabled={magicPoints < b.cost}
                        className="w-full py-2 rounded-lg border border-purple-600/40
                                   bg-purple-900/20 text-xs font-bold text-purple-300
                                   hover:bg-purple-800/30 disabled:opacity-40 disabled:cursor-not-allowed
                                   transition-all">
                        {magicPoints >= b.cost ? 'Purchase' : 'Not enough MP'}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── MISSIONS TAB ── */}
            {activeTab === 'missions' && (
              <motion.div key="missions" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}>
                <div className="flex flex-col gap-3">
                  {[
                    { label:'Play 10 games today',        progress:7,  total:10, reward:'50 MP',  icon:'🎮' },
                    { label:'Win 5 times on Dice',        progress:3,  total:5,  reward:'30 MP',  icon:'🎲' },
                    { label:'Wager 1 SOL total',           progress:0.6,total:1,  reward:'100 MP', icon:'💰', isFloat:true },
                    { label:'Try 3 different games',       progress:2,  total:3,  reward:'75 MP',  icon:'🎯' },
                    { label:'Hit a 5× multiplier',         progress:0,  total:1,  reward:'150 MP', icon:'⚡' },
                    { label:'Maintain a 3-day streak',     progress:3,  total:3,  reward:'200 MP', icon:'🔥', done:true },
                  ].map((m, i) => (
                    <motion.div key={m.label}
                      initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`glass rounded-xl p-4 border
                        ${m.done ? 'border-green-600/30' : 'border-white/[0.06]'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{m.icon}</span>
                          <span className={`text-sm font-medium ${m.done ? 'text-green-400 line-through opacity-70' : 'text-text-primary'}`}>
                            {m.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neon-green">{m.reward}</span>
                          {m.done && <span className="text-green-400 text-sm">✓</span>}
                        </div>
                      </div>
                      {!m.done && (
                        <div>
                          <div className="flex justify-between text-[10px] text-text-muted mb-1">
                            <span>{m.isFloat ? m.progress.toFixed(2) : m.progress}/{m.total}</span>
                            <span>{Math.round((m.progress / m.total) * 100)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${(m.progress / m.total) * 100}%` }}
                              transition={{ delay: i * 0.06 + 0.3, duration: 0.8 }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
