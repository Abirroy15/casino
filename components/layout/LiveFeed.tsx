// ══════════════════════════════════════════════════════════════
//  LiveFeed.tsx — Animated real-time activity feed
// ══════════════════════════════════════════════════════════════
'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Play { id:string; wallet:string; game:string; win:boolean; amount:number; ts:number }

const MOCK_WALLETS = ['7xKf...3mPq','9aRt...7nBc','4mWz...2kLx','3pYv...8dQr','6hJg...5cNs','2bXe...1fMo']
const MOCK_GAMES   = ['Dice','Coin Flip','Mines','Slots','Hi-Lo','Roulette','Plinko','Tower X']

function mockPlay(): Play {
  return {
    id:     `${Date.now()}-${Math.random()}`,
    wallet: MOCK_WALLETS[Math.floor(Math.random() * MOCK_WALLETS.length)],
    game:   MOCK_GAMES[Math.floor(Math.random() * MOCK_GAMES.length)],
    win:    Math.random() > 0.45,
    amount: +(Math.random() * 2 + 0.05).toFixed(3),
    ts:     Date.now(),
  }
}

export function LiveFeed() {
  const [plays, setPlays] = useState<Play[]>(() => Array.from({length:10}, mockPlay))

  useEffect(() => {
    const id = setInterval(() => {
      setPlays(prev => [mockPlay(), ...prev].slice(0, 14))
    }, 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 font-brand text-base font-bold">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse
                         shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
        Live Activity
      </div>

      <div className="flex flex-col gap-2 max-h-[360px] overflow-hidden">
        <AnimatePresence initial={false}>
          {plays.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity:0, x:-20, height:0 }}
              animate={{ opacity:1, x:0,   height:'auto' }}
              exit={{    opacity:0,         height:0 }}
              transition={{ duration:0.3 }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                         bg-white/[0.03] border border-white/[0.06] text-xs shrink-0"
            >
              <span className="text-neon-cyan font-mono">{p.wallet}</span>
              <span className="text-text-secondary flex-1">{p.game}</span>
              <span className={`font-bold ${p.win ? 'text-neon-green' : 'text-red-400'}`}>
                {p.win ? 'WIN' : 'LOSS'}
              </span>
              <span className="font-semibold text-text-primary">
                {p.amount.toFixed(3)} SOL
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Leaderboard.tsx
// ══════════════════════════════════════════════════════════════
const LEADERS = [
  { name:'SolKing',   sol:'1,204', color:'#7c3aed', medal:'🥇', rank:'gold' },
  { name:'LuckyAce',  sol:'987',   color:'#059669', medal:'🥈', rank:'silver' },
  { name:'NeonWhale', sol:'856',   color:'#0891b2', medal:'🥉', rank:'bronze' },
  { name:'CryptoBet', sol:'742',   color:'#d97706', medal:'4',  rank:'' },
  { name:'RollMaster',sol:'631',   color:'#dc2626', medal:'5',  rank:'' },
]

export function Leaderboard() {
  return (
    <div>
      <div className="font-brand text-base font-bold mb-4 flex items-center gap-2">
        🏆 Leaderboard
      </div>
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {LEADERS.map((l,i) => (
          <div key={l.name} className="flex items-center gap-3 py-2.5">
            <span className={`font-brand text-sm font-bold w-5 text-center
                              ${l.rank==='gold' ? 'text-yellow-400' : l.rank==='silver' ? 'text-slate-300' : l.rank==='bronze' ? 'text-orange-600' : 'text-text-muted'}`}>
              {l.medal}
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                 style={{ background:`${l.color}25`, color:l.color }}>{l.name[0]}</div>
            <span className="flex-1 text-xs text-text-primary">{l.name}</span>
            <span className="text-xs font-semibold text-neon-green">+{l.sol} SOL</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  HeroBanner.tsx
// ══════════════════════════════════════════════════════════════
export function HeroBanner() {
  const [volume, setVolume] = useState(12847)
  const [players, setPlayers] = useState(248)

  useEffect(() => {
    const id = setInterval(() => {
      setVolume(v => v + Math.floor(Math.random() * 3))
      setPlayers(v => Math.max(220, Math.min(310, v + Math.floor(Math.random()*5)-2)))
    }, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mx-6 mt-5">
      <div className="relative overflow-hidden rounded-2xl px-8 py-7"
           style={{ background:'linear-gradient(135deg,rgba(168,85,247,0.15),rgba(59,130,246,0.1),rgba(16,185,129,0.08))',
                    border:'1px solid rgba(168,85,247,0.2)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 pointer-events-none"
             style={{ background:'radial-gradient(ellipse,rgba(168,85,247,0.2),transparent 70%)' }} />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="font-brand text-3xl font-bold">
              Play. Win. <span className="neon-text-purple">Own It.</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Powered by Solana · Private via MagicBlock Rollups · Provably Fair
            </p>
          </div>
          <div className="hidden sm:flex gap-8">
            {[
              { val:volume.toLocaleString(), label:'SOL Wagered', color:'var(--neon-purple)' },
              { val:players.toString(), label:'Online Now', color:'var(--neon-green)' },
              { val:'99.9%', label:'Uptime', color:'var(--neon-cyan)' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-brand text-2xl font-bold" style={{color:s.color}}>{s.val}</div>
                <div className="text-[11px] text-text-secondary uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  StatsBar.tsx
// ══════════════════════════════════════════════════════════════
export function StatsBar() {
  const stats = [
    { val:'1,204', label:'Games Today',       change:'↑ 14%',     color:'var(--neon-purple)' },
    { val:'347',   label:'Biggest Win (SOL)',  change:'All-time',  color:'var(--neon-green)' },
    { val:'23ms',  label:'Avg Settle Time',    change:'MagicBlock',color:'var(--neon-cyan)' },
    { val:'1%',    label:'House Edge',         change:'Best rate', color:'#f59e0b' },
  ]
  return (
    <div className="flex gap-3 px-6 mt-4">
      {stats.map(s => (
        <div key={s.label} className="flex-1 glass rounded-xl p-3.5">
          <div className="font-brand text-xl font-bold" style={{color:s.color}}>{s.val}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">{s.label}</div>
          <div className="text-[10px] text-neon-green mt-1">{s.change}</div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  DailyReward.tsx
// ══════════════════════════════════════════════════════════════
export function DailyReward() {
  return (
    <motion.div
      className="flex items-center justify-between mx-6 mt-5 px-4 py-3.5 rounded-xl"
      style={{ background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(59,130,246,0.07))',
               border:'1px solid rgba(16,185,129,0.2)' }}
      initial={{ opacity:0, y:-10 }}
      animate={{ opacity:1, y:0 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎁</span>
        <div>
          <div className="text-sm font-semibold text-text-primary">Daily Reward Available!</div>
          <div className="text-xs text-text-secondary">Claim your free 0.05 SOL bonus</div>
        </div>
      </div>
      <button className="px-4 py-2 rounded-lg text-xs font-bold text-white
                         bg-gradient-to-r from-neon-green to-emerald-600
                         hover:shadow-glow-green transition-all">
        Claim Now
      </button>
    </motion.div>
  )
}

// Re-export as default for app/page.tsx named imports
export default LiveFeed
