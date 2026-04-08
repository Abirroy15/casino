'use client'
import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'
import { useCasinoStore } from '@/lib/store'
import ModalBase from './ModalBase'
import { BetInput } from './DiceModal'

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '🔔', '💎', '7️⃣']
const PAYOUTS: Record<string, number> = {
  '💎': 50, '7️⃣': 20, '⭐': 10, '🔔': 8,
  '🍇': 5, '🍊': 4, '🍋': 3, '🍒': 2,
}

function getSymbol() { return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] }

function calcPayout(reels: string[], bet: number): { multiplier: number; label: string } {
  const [a, b, c] = reels
  if (a === b && b === c) return { multiplier: PAYOUTS[a] || 2, label: `3× ${a}` }
  if (a === b || b === c || a === c) return { multiplier: 1.5, label: 'Pair!' }
  if (reels.includes('💎')) return { multiplier: 1.2, label: 'Diamond bonus' }
  return { multiplier: 0, label: 'No match' }
}

export default function SlotsModal({ onClose }: { onClose: () => void }) {
  const { connected } = useWallet()
  const { balance, setBalance, addPlay } = useCasinoStore()

  const [bet, setBet]           = useState(0.1)
  const [spinning, setSpin]     = useState(false)
  const [reels, setReels]       = useState(['🎰', '🎰', '🎰'])
  const [result, setResult]     = useState<null | { win: boolean; label: string; payout: number }>(null)
  const [confetti, setConfetti] = useState(false)
  const intervalsRef            = useRef<NodeJS.Timeout[]>([])

  const spin = useCallback(async () => {
    if (!connected) { toast.error('Connect wallet first'); return }
    if (bet > balance) { toast.error('Insufficient balance'); return }

    setSpin(true)
    setResult(null)
    setBalance(balance - bet)

    // Stagger reel stopping for authentic feel
    const finalReels = [getSymbol(), getSymbol(), getSymbol()]

    intervalsRef.current.forEach(clearInterval)
    const intervals: NodeJS.Timeout[] = []

    // Each reel spins independently
    ;[0, 1, 2].forEach((reelIdx) => {
      const delay = reelIdx * 400
      const iv = setInterval(() => {
        setReels(prev => {
          const next = [...prev]
          next[reelIdx] = getSymbol()
          return next
        })
      }, 60)
      intervals.push(iv)

      setTimeout(() => {
        clearInterval(iv)
        setReels(prev => {
          const next = [...prev]
          next[reelIdx] = finalReels[reelIdx]
          return next
        })
        if (reelIdx === 2) {
          // All reels stopped
          const { multiplier, label } = calcPayout(finalReels, bet)
          const win = multiplier > 0
          const payout = +(bet * multiplier).toFixed(4)

          setTimeout(() => {
            setResult({ win, label, payout })
            if (win) {
              setBalance(balance - bet + payout)
              if (multiplier >= 10) { setConfetti(true); setTimeout(() => setConfetti(false), 4000) }
              toast.success(`${label}! +${payout.toFixed(3)} SOL (${multiplier}×)`)
            } else {
              toast.error(`${label}. -${bet.toFixed(3)} SOL`)
            }
            addPlay({ id:`slots_${Date.now()}`, wallet:'7xKf...3mPq', game:'slots',
                      betAmount:bet, payout, win, timestamp:Date.now() })
            setSpin(false)
          }, 200)
        }
      }, delay + 1400)
    })

    intervalsRef.current = intervals
  }, [connected, bet, balance])

  return (
    <ModalBase onClose={onClose} title="Slots" subtitle="3-reel · Match symbols to win · 2% edge" icon="🎰">
      {confetti && <Confetti numberOfPieces={250} recycle={false} />}

      {/* Reel display */}
      <div className="flex justify-center gap-3 my-6">
        {reels.map((sym, i) => (
          <motion.div key={i}
            className="w-[76px] h-[76px] rounded-2xl flex items-center justify-center text-[40px]
                       border-2 select-none"
            style={{ background:'linear-gradient(145deg,#1a0a3a,#2d1060)',
                     borderColor: spinning ? 'rgba(168,85,247,0.6)' : 'rgba(168,85,247,0.25)',
                     boxShadow: spinning ? '0 0 20px rgba(168,85,247,0.4)' : '0 0 8px rgba(168,85,247,0.1)' }}
            animate={spinning ? { y: [-3, 3, -3] } : {}}
            transition={{ repeat: Infinity, duration: 0.12, delay: i * 0.04 }}
          >
            {sym}
          </motion.div>
        ))}
      </div>

      {/* Payout table */}
      <div className="mb-4 rounded-xl overflow-hidden border border-white/[0.06]">
        <div className="grid grid-cols-4 gap-0 text-[10px]">
          {Object.entries(PAYOUTS).slice(0, 4).map(([sym, mult]) => (
            <div key={sym} className="flex flex-col items-center py-2 bg-white/[0.02] border-r border-white/[0.05]">
              <span className="text-lg">{sym}</span>
              <span className="text-yellow-400 font-bold">{mult}×</span>
            </div>
          ))}
        </div>
        <div className="px-3 py-1.5 bg-white/[0.02] text-[10px] text-text-secondary text-center">
          Pair = 1.5× · Diamond bonus = 1.2×
        </div>
      </div>

      <BetInput bet={bet} setBet={setBet} balance={balance} />

      <motion.button onClick={spin} disabled={spinning}
        className="btn-primary w-full mt-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: spinning ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}>
        {spinning ? '🎰 Spinning...' : '🎰 Spin Reels'}
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            className={`mt-4 rounded-xl p-3 text-center font-brand text-lg font-bold
              ${result.win
                ? 'bg-green-900/20 border border-green-600/30 text-neon-green'
                : 'bg-red-900/10 border border-red-700/30 text-red-400'}`}>
            {result.win ? `🎉 ${result.label}! +${result.payout.toFixed(3)} SOL` : `💀 ${result.label} -${bet.toFixed(3)} SOL`}
          </motion.div>
        )}
      </AnimatePresence>
    </ModalBase>
  )
}
