'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import Navbar from '@/components/layout/Navbar'
import ParticleCanvas from '@/components/ui/ParticleCanvas'
import { useCasinoStore } from '@/lib/store'
import { shortAddr } from '@/lib/solana'

type Tab = 'overview' | 'history' | 'settings'

function StatCard({ label, value, sub, color }: { label:string; value:string; sub?:string; color:string }) {
  return (
    <div className="glass rounded-xl p-4 border border-white/[0.07]">
      <div className={`font-brand text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-text-secondary mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-text-muted mt-1">{sub}</div>}
    </div>
  )
}

const GAME_ICONS: Record<string, string> = {
  dice:'🎲', coinflip:'🪙', mines:'💣', slots:'🎰', hilo:'🃏', roulette:'🎡', plinko:'⚡', towerx:'🏗️'
}

export default function ProfilePage() {
  const { publicKey, connected } = useWallet()
  const { balance, stats, recentPlays } = useCasinoStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [sound, setSound]       = useState(true)
  const [animations, setAnim]   = useState(true)
  const [autoAccept, setAuto]   = useState(false)
  const [currency, setCurrency] = useState<'SOL'|'USD'>('SOL')

  const addr = publicKey?.toBase58() ?? ''
  const winRate = stats.gamesPlayed > 0
    ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1)
    : '0.0'

  if (!connected) {
    return (
      <main className="relative min-h-screen">
        <ParticleCanvas />
        <div className="relative z-10">
          <Navbar />
          <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
            <div className="text-5xl">🔐</div>
            <h2 className="font-brand text-2xl font-bold">Connect Your Wallet</h2>
            <p className="text-text-secondary text-sm">Connect Phantom to view your profile</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen">
      <ParticleCanvas />
      <div className="relative z-10">
        <Navbar />

        <div className="max-w-3xl mx-auto px-6 py-8">

          {/* Profile hero */}
          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}
            className="glass rounded-2xl p-6 mb-6 flex items-center gap-5
                       border border-purple-700/20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background:'radial-gradient(ellipse at 0% 50%,rgba(168,85,247,0.1),transparent 60%)' }} />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600
                            flex items-center justify-center text-3xl shadow-glow-purple shrink-0">
              🦊
            </div>
            <div className="relative z-10">
              <div className="font-brand text-2xl font-bold">SolPlayer</div>
              <div className="font-mono text-xs text-text-secondary mt-0.5">{shortAddr(addr, 6)}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-md bg-purple-900/40 border border-purple-700/30 text-purple-300">
                  🎮 Active Player
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-green-900/30 border border-green-700/30 text-green-300">
                  🟢 Online
                </span>
              </div>
            </div>
            <div className="ml-auto text-right relative z-10">
              <div className="font-brand text-3xl font-bold text-neon-green">{balance.toFixed(3)}</div>
              <div className="text-xs text-text-secondary">SOL Balance</div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] mb-6">
            {(['overview','history','settings'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize
                  ${tab === t
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'text-text-secondary hover:text-text-primary'}`}>
                {t === 'overview' ? '📊 Overview' : t === 'history' ? '📜 History' : '⚙️ Settings'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <motion.div key="overview" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="grid gap-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Games Played" value={stats.gamesPlayed.toString()}
                    color="text-neon-purple" sub="All time" />
                  <StatCard label="Win Rate"     value={`${winRate}%`}
                    color="text-neon-green" sub={`${stats.wins}W / ${stats.losses}L`} />
                  <StatCard label="Total Wagered" value={`${stats.totalWagered.toFixed(2)}`}
                    color="text-neon-cyan"  sub="SOL" />
                  <StatCard label="Net Profit"  value={`${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toFixed(3)}`}
                    color={stats.netProfit >= 0 ? 'text-neon-green' : 'text-red-400'} sub="SOL" />
                </div>

                {/* Win/Loss chart (simple bar) */}
                <div className="glass rounded-2xl p-5 border border-white/[0.07]">
                  <div className="text-sm font-semibold text-text-secondary mb-4">Last 7 Days Performance</div>
                  <div className="flex items-end gap-2 h-24">
                    {Array.from({ length: 7 }, (_, i) => {
                      const val = Math.random()
                      const win = val > 0.45
                      const h   = Math.floor(20 + val * 80)
                      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: h }}
                            transition={{ delay: i * 0.08, duration: 0.5 }}
                            className={`w-full rounded-t-md ${win ? 'bg-neon-green/40' : 'bg-red-500/30'}`}
                          />
                          <span className="text-[9px] text-text-muted">{days[i]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Favourite games */}
                <div className="glass rounded-2xl p-5 border border-white/[0.07]">
                  <div className="text-sm font-semibold text-text-secondary mb-4">Favourite Games</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['towerx','dice','mines','plinko'].map((g, i) => (
                      <div key={g} className="flex items-center gap-3 p-3 rounded-xl
                                              bg-white/[0.03] border border-white/[0.05]">
                        <span className="text-2xl">{GAME_ICONS[g]}</span>
                        <div>
                          <div className="text-xs font-semibold text-text-primary capitalize">{g}</div>
                          <div className="text-[10px] text-text-muted">{[42, 28, 15, 11][i]} games</div>
                        </div>
                        <div className="ml-auto text-[11px] font-bold text-neon-green">
                          {['+12.4','+4.2','-1.1','+7.8'][i]} SOL
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── HISTORY ── */}
            {tab === 'history' && (
              <motion.div key="history" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_70px_80px_90px] gap-2 px-4 py-2.5
                                  text-[10px] text-text-muted uppercase tracking-wider border-b border-white/[0.06]">
                    <div>Game</div><div className="text-center">Bet</div>
                    <div className="text-center">Result</div><div className="text-center">Payout</div>
                    <div className="text-right">Time</div>
                  </div>
                  {recentPlays.length === 0 ? (
                    <div className="text-center py-12 text-text-muted text-sm">
                      <div className="text-3xl mb-2">🎮</div>No games played yet
                    </div>
                  ) : (
                    recentPlays.map((p, i) => (
                      <motion.div key={p.id}
                        initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                        transition={{ delay: i * 0.04 }}
                        className="grid grid-cols-[1fr_80px_70px_80px_90px] gap-2 px-4 py-3
                                   border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]
                                   transition-colors text-xs items-center">
                        <div className="flex items-center gap-2">
                          <span>{GAME_ICONS[p.game]}</span>
                          <span className="capitalize text-text-primary">{p.game}</span>
                        </div>
                        <div className="text-center text-text-secondary">{p.betAmount.toFixed(3)}</div>
                        <div className={`text-center font-bold ${p.win ? 'text-neon-green' : 'text-red-400'}`}>
                          {p.win ? 'WIN' : 'LOSS'}
                        </div>
                        <div className={`text-center font-bold ${p.win ? 'text-neon-green' : 'text-red-400'}`}>
                          {p.win ? `+${p.payout.toFixed(3)}` : `-${p.betAmount.toFixed(3)}`}
                        </div>
                        <div className="text-right text-text-muted">
                          {new Date(p.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ── SETTINGS ── */}
            {tab === 'settings' && (
              <motion.div key="settings" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="glass rounded-2xl p-6 border border-white/[0.07] flex flex-col gap-5">
                {[
                  { label:'Sound Effects', desc:'Casino audio feedback', val:sound, set:setSound },
                  { label:'Animations', desc:'Framer Motion + CSS animations', val:animations, set:setAnim },
                  { label:'Auto-accept Transactions', desc:'Skip confirmation (devnet only)', val:autoAccept, set:setAuto },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{s.label}</div>
                      <div className="text-xs text-text-secondary">{s.desc}</div>
                    </div>
                    <button onClick={() => s.set(!s.val)}
                      className={`w-12 h-6 rounded-full transition-all relative
                        ${s.val ? 'bg-purple-600' : 'bg-white/[0.1]'}`}>
                      <motion.div
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                        animate={{ x: s.val ? 26 : 4 }} transition={{ type:'spring', stiffness:500 }} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">Display Currency</div>
                    <div className="text-xs text-text-secondary">Show amounts in SOL or USD</div>
                  </div>
                  <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.05]">
                    {(['SOL','USD'] as const).map(c => (
                      <button key={c} onClick={() => setCurrency(c)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all
                          ${currency === c ? 'bg-purple-700 text-white' : 'text-text-secondary'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06]">
                  <div className="text-sm font-semibold text-text-primary mb-1">Responsible Gaming</div>
                  <div className="text-xs text-text-secondary mb-3">
                    Set deposit / session limits to stay in control.
                  </div>
                  <button className="text-xs text-red-400 border border-red-700/30 px-3 py-1.5 rounded-lg
                                     hover:bg-red-900/20 transition-colors">
                    Set Deposit Limit
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
