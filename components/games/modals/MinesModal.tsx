'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'
import { useCasinoStore } from '@/lib/store'
import { executeERMove } from '@/magicblock/ephemeral-rollup'
import ModalBase from './ModalBase'
import { BetInput } from './DiceModal'

type TileState = 'hidden' | 'safe' | 'mine'

const GRID_SIZE = 25  // 5×5
const MINE_COUNTS = [1, 3, 5, 10, 15, 24]

function calcMultiplier(safe: number, mines: number): number {
  // Simplified: each safe tile increases multiplier
  const safeTotal = GRID_SIZE - mines
  let m = 1
  for (let i = 0; i < safe; i++) {
    m *= (safeTotal - i) / (GRID_SIZE - i - mines) * (safeTotal - i) / (safeTotal - i - 1 + 1)
  }
  return Math.max(1, +((m * 0.99) ** (1 / Math.max(1, safe))).toFixed(2)) * safe * 0.35 + 1
}

export default function MinesModal({ onClose }: { onClose: () => void }) {
  const { connected } = useWallet()
  const { balance, setBalance, addPlay } = useCasinoStore()

  const [bet, setBet]             = useState(0.1)
  const [mineCount, setMineCount] = useState(3)
  const [tiles, setTiles]         = useState<TileState[]>(Array(GRID_SIZE).fill('hidden'))
  const [minePositions, setMines] = useState<Set<number>>(new Set())
  const [gameActive, setActive]   = useState(false)
  const [safeTiles, setSafe]      = useState(0)
  const [gameOver, setGameOver]   = useState<'win' | 'loss' | null>(null)
  const [confetti, setConfetti]   = useState(false)

  const startGame = useCallback(async () => {
    if (!connected) { toast.error('Connect wallet first'); return }
    if (bet > balance) { toast.error('Insufficient balance'); return }

    // Generate mine positions (hidden from player via MagicBlock ER in production)
    const positions = new Set<number>()
    while (positions.size < mineCount) {
      positions.add(Math.floor(Math.random() * GRID_SIZE))
    }

    setMines(positions)
    setTiles(Array(GRID_SIZE).fill('hidden'))
    setSafe(0)
    setGameOver(null)
    setActive(true)
    setBalance(balance - bet)
    toast('💣 Game started! Find the gems, avoid the mines.')
  }, [connected, bet, balance, mineCount])

  const revealTile = useCallback((idx: number) => {
    if (!gameActive || tiles[idx] !== 'hidden') return

    const newTiles = [...tiles]
    if (minePositions.has(idx)) {
      // Hit a mine — reveal all mines
      minePositions.forEach(p => { newTiles[p] = 'mine' })
      setTiles(newTiles)
      setActive(false)
      setGameOver('loss')
      toast.error('💥 BOOM! You hit a mine!')
      addPlay({ id:`mines_${Date.now()}`, wallet:'7xKf...3mPq', game:'mines',
                betAmount:bet, payout:0, win:false, timestamp:Date.now() })
    } else {
      newTiles[idx] = 'safe'
      setTiles(newTiles)
      setSafe(s => s + 1)
    }
  }, [gameActive, tiles, minePositions, bet])

  const cashout = useCallback(() => {
    if (!gameActive || safeTiles === 0) return
    const multiplier = calcMultiplier(safeTiles, mineCount)
    const payout = +(bet * multiplier).toFixed(4)
    setBalance(balance + payout)
    setActive(false)
    setGameOver('win')
    setConfetti(true)
    setTimeout(() => setConfetti(false), 3500)
    toast.success(`💎 Cashed out! +${payout.toFixed(3)} SOL (${multiplier.toFixed(2)}x)`)
    addPlay({ id:`mines_${Date.now()}`, wallet:'7xKf...3mPq', game:'mines',
              betAmount:bet, payout, win:true, timestamp:Date.now() })
  }, [gameActive, safeTiles, mineCount, bet, balance])

  const currentMultiplier = calcMultiplier(safeTiles, mineCount)

  return (
    <ModalBase onClose={onClose} title="Mines" subtitle="Click tiles to find gems · Avoid the mines" icon="💣">
      {confetti && <Confetti numberOfPieces={200} recycle={false} />}

      {/* Mine count selector */}
      {!gameActive && gameOver === null && (
        <div className="mb-4">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider mb-2">Mines Count</div>
          <div className="flex gap-2 flex-wrap">
            {MINE_COUNTS.map(n => (
              <button key={n} onClick={() => setMineCount(n)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
                  ${mineCount === n
                    ? 'bg-red-900/40 border-red-500/60 text-red-200'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70'}`}>
                {n} 💣
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multiplier display */}
      {gameActive && (
        <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl
                        bg-emerald-900/20 border border-emerald-600/30">
          <span className="text-xs text-text-secondary">Current multiplier</span>
          <span className="font-brand text-xl font-bold text-neon-green">
            {currentMultiplier.toFixed(2)}×
          </span>
          <span className="text-xs text-text-secondary">{safeTiles} safe tiles</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-5 gap-1.5 my-3">
        {tiles.map((t, i) => (
          <motion.button
            key={i}
            onClick={() => revealTile(i)}
            disabled={!gameActive || t !== 'hidden'}
            className={`aspect-square rounded-xl flex items-center justify-center text-xl
                        transition-all border relative overflow-hidden
                        ${t === 'hidden'
                          ? gameActive
                            ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12] hover:border-purple-500/30 cursor-pointer'
                            : 'bg-white/[0.03] border-white/[0.05] cursor-not-allowed'
                          : t === 'safe'
                          ? 'bg-emerald-900/40 border-emerald-500/50 cursor-not-allowed'
                          : 'bg-red-900/50 border-red-500/60 cursor-not-allowed'
                        }`}
            whileHover={gameActive && t === 'hidden' ? { scale: 1.08 } : {}}
            whileTap={gameActive && t === 'hidden' ? { scale: 0.93 } : {}}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.015 }}
          >
            {t === 'safe' && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}>💎</motion.span>
            )}
            {t === 'mine' && (
              <motion.span initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring' }}>💥</motion.span>
            )}
            {t === 'hidden' && gameActive && (
              <span className="text-white/10 text-xs">?</span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Bet input / Cashout */}
      {!gameActive && gameOver === null && (
        <>
          <BetInput bet={bet} setBet={setBet} balance={balance} />
          <motion.button onClick={startGame}
            className="btn-primary w-full mt-4 text-base"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            💣 Start Game
          </motion.button>
        </>
      )}

      {gameActive && (
        <motion.button onClick={cashout}
          className="w-full mt-2 py-3.5 rounded-xl border-none font-brand text-base font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(16,185,129,0.5)' }}
          whileTap={{ scale: 0.97 }}
          animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 8px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0.4)'] }}
          transition={{ repeat: Infinity, duration: 1.5 }}>
          💰 Cash Out {safeTiles > 0 ? `+${(bet * currentMultiplier).toFixed(3)} SOL` : ''}
        </motion.button>
      )}

      {/* Game over result */}
      <AnimatePresence>
        {gameOver && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-3 flex gap-3 items-center justify-between`}>
            <motion.button
              onClick={() => { setGameOver(null); setTiles(Array(GRID_SIZE).fill('hidden')); setSafe(0) }}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04]
                         text-sm font-semibold text-text-secondary hover:text-text-primary transition-all">
              Play Again
            </motion.button>
            <motion.button onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04]
                         text-sm font-semibold text-text-secondary hover:text-text-primary transition-all">
              Exit
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalBase>
  )
}
