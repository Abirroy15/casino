'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import ParticleCanvas from '@/components/ui/ParticleCanvas'

// ── Types ─────────────────────────────────────────────────────
interface LeaderEntry {
  rank:      number
  wallet:    string
  display:   string
  avatar:    string
  totalWon:  number
  games:     number
  winRate:   number
  biggestWin:number
  favGame:   string
  streak:    number
  badge?:    string
}

type Period = 'daily' | 'weekly' | 'alltime'

// ── Mock data generator ───────────────────────────────────────
const AVATARS   = ['🦁','🐯','🦊','🐺','🦅','🐉','🦋','🦄','🐬','🦈']
const FAV_GAMES = ['Tower X','Mines','Dice','Plinko','Slots','Roulette','Hi-Lo','Coin Flip']
const BADGES    = ['👑 King','⚡ Flash','🔥 Hot','💎 Diamond','🌟 Star']

function genLeaderboard(count: number, seed = 0): LeaderEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const base = (count - i) * 1800 + seed * 300
    return {
      rank:       i + 1,
      wallet:     `${['7xKf','9aRt','4mWz','3pYv','6hJg','2bXe','8cNs','5dQr'][i % 8]}...${['3mPq','7nBc','2kLx','8dQr','5cNs','1fMo','4jKp','6mRs'][i % 8]}`,
      display:    ['SolKing','LuckyAce','NeonWhale','CryptoBet','RollMaster','GemHunter','TowerClimb','DiceGod','PlinkoKing','MineSwept'][i % 10],
      avatar:     AVATARS[i % AVATARS.length],
      totalWon:   +(base + Math.random() * 500).toFixed(2),
      games:      Math.floor(base / 12 + Math.random() * 200),
      winRate:    +(42 + Math.random() * 18).toFixed(1),
      biggestWin: +(base / 4 + Math.random() * 200).toFixed(2),
      favGame:    FAV_GAMES[i % FAV_GAMES.length],
      streak:     Math.floor(Math.random() * 12),
      badge:      i < 3 ? BADGES[i] : undefined,
    }
  })
}

const RANK_STYLES: Record<number, { glow: string; border: string; text: string; medal: string }> = {
  1: { glow:'rgba(245,158,11,0.3)', border:'border-yellow-500/40', text:'text-yellow-400', medal:'🥇' },
  2: { glow:'rgba(148,163,184,0.3)', border:'border-slate-400/40', text:'text-slate-300', medal:'🥈' },
  3: { glow:'rgba(180,83,9,0.3)', border:'border-orange-700/40', text:'text-orange-500', medal:'🥉' },
}

// ── Row component ─────────────────────────────────────────────
function LeaderRow({ entry, index }: { entry: LeaderEntry; index: number }) {
  const s = RANK_STYLES[entry.rank]

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 24 }}
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer
                  ${s ? s.border : 'border-white/[0.06]'}
                  ${s ? 'bg-white/[0.04]' : 'bg-white/[0.02]'}
                  hover:bg-white/[0.06] hover:border-purple-500/30 group`}
      style={ s ? { boxShadow: `0 0 20px ${s.glow}` } : {}}
    >
      {/* Rank */}
      <div className={`w-9 text-center font-brand text-lg font-bold shrink-0 ${s?.text ?? 'text-text-muted'}`}>
        {s?.medal ?? entry.rank}
      </div>

      {/* Avatar */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0
                       bg-white/[0.05] border border-white/[0.06]
                       group-hover:scale-110 transition-transform`}>
        {entry.avatar}
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-text-primary truncate">{entry.display}</span>
          {entry.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-yellow-900/40 text-yellow-400 border border-yellow-700/30 font-bold">
              {entry.badge}
            </span>
          )}
          {entry.streak >= 5 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-900/30 text-orange-400 font-bold">
              🔥 {entry.streak}
            </span>
          )}
        </div>
        <div className="text-xs text-text-muted font-mono mt-0.5">{entry.wallet}</div>
      </div>

      {/* Stats grid — hidden on mobile */}
      <div className="hidden md:grid grid-cols-4 gap-4 text-center shrink-0">
        <div>
          <div className="text-xs text-neon-green font-bold">+{entry.totalWon.toLocaleString()}</div>
          <div className="text-[10px] text-text-muted">SOL Won</div>
        </div>
        <div>
          <div className="text-xs text-text-primary font-bold">{entry.games.toLocaleString()}</div>
          <div className="text-[10px] text-text-muted">Games</div>
        </div>
        <div>
          <div className="text-xs text-neon-blue font-bold">{entry.winRate}%</div>
          <div className="text-[10px] text-text-muted">Win Rate</div>
        </div>
        <div>
          <div className="text-xs text-yellow-400 font-bold">{entry.biggestWin}</div>
          <div className="text-[10px] text-text-muted">Best Win</div>
        </div>
      </div>

      {/* Fav game pill */}
      <div className="hidden lg:flex items-center shrink-0">
        <span className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-900/30 border border-purple-700/30 text-purple-300">
          {entry.favGame}
        </span>
      </div>
    </motion.div>
  )
}

// ── Top 3 Podium ──────────────────────────────────────────────
function Podium({ entries }: { entries: LeaderEntry[] }) {
  const [first, second, third] = entries
  const order = [second, first, third]
  const heights  = ['h-24', 'h-32', 'h-20']
  const colors   = ['from-slate-600 to-slate-700', 'from-yellow-600 to-amber-700', 'from-orange-700 to-orange-800']
  const textColors = ['text-slate-200', 'text-yellow-200', 'text-orange-200']

  return (
    <div className="flex items-end justify-center gap-3 mb-8">
      {order.map((entry, i) => (
        <motion.div key={entry.rank}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="text-3xl">{entry.avatar}</div>
          <div className="text-center">
            <div className="text-sm font-bold text-text-primary">{entry.display}</div>
            <div className="text-xs text-neon-green font-bold">+{entry.totalWon.toLocaleString()} SOL</div>
          </div>
          <div className={`w-24 ${heights[i]} rounded-t-xl bg-gradient-to-b ${colors[i]}
                           flex items-center justify-center text-2xl`}>
            {['🥈','🥇','🥉'][i]}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const [period, setPeriod]   = useState<Period>('weekly')
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      const seed = period === 'daily' ? 1 : period === 'weekly' ? 2 : 3
      setEntries(genLeaderboard(50, seed))
      setLoading(false)
    }, 400)
  }, [period])

  const filtered = entries.filter(e =>
    e.display.toLowerCase().includes(search.toLowerCase()) ||
    e.wallet.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="relative min-h-screen">
      <ParticleCanvas />
      <div className="relative z-10">
        <Navbar />

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8">
            <h1 className="font-brand text-4xl font-bold mb-2">
              <span className="neon-text-purple">🏆 Leaderboard</span>
            </h1>
            <p className="text-text-secondary text-sm">Top players ranked by total SOL won</p>
          </motion.div>

          {/* Period tabs */}
          <div className="flex justify-center mb-6">
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              {(['daily','weekly','alltime'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize
                    ${period === p
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-glow-purple'
                      : 'text-text-secondary hover:text-text-primary'}`}>
                  {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Podium */}
          {!loading && filtered.length >= 3 && <Podium entries={filtered.slice(0, 3)} />}

          {/* Search */}
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by username or wallet..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl
                         pl-9 pr-4 py-3 text-sm text-text-primary outline-none
                         focus:border-purple-500/40 transition-colors placeholder:text-text-muted" />
          </div>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[40px_44px_1fr_repeat(4,80px)_100px]
                          gap-3 px-4 mb-2 text-[11px] text-text-muted uppercase tracking-wider">
            <div>#</div><div></div><div>Player</div>
            <div className="text-center">Won</div>
            <div className="text-center">Games</div>
            <div className="text-center">Win %</div>
            <div className="text-center">Best</div>
            <div>Fav Game</div>
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {loading
                ? Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="h-16 rounded-2xl skeleton" />
                  ))
                : filtered.map((e, i) => (
                    <LeaderRow key={`${period}-${e.rank}`} entry={e} index={i} />
                  ))
              }
            </AnimatePresence>
          </div>

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-sm">No players match your search</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
