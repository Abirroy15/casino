'use client'
import { useState, useCallback }  from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet }               from '@solana/wallet-adapter-react'
import toast                       from 'react-hot-toast'
import Confetti                    from 'react-confetti'
import { useCasinoStore }          from '@/lib/store'
import { executeERMove }           from '@/magicblock/ephemeral-rollup'
import ModalBase                   from './ModalBase'

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅']

export default function DiceModal({ onClose }: { onClose: () => void }) {
  const { connected }            = useWallet()
  const { balance, setBalance, addPlay } = useCasinoStore()

  const [direction, setDirection]   = useState<'low'|'high'>('low')
  const [bet, setBet]               = useState(0.1)
  const [rolling, setRolling]       = useState(false)
  const [dice, setDice]             = useState(['⚀','⚃'])
  const [result, setResult]         = useState<null|{win:boolean;roll:number;payout:number}>(null)
  const [showConfetti, setConfetti] = useState(false)

  const handleRoll = useCallback(async () => {
    if (!connected) { toast.error('Connect wallet first'); return }
    if (bet > balance) { toast.error('Insufficient balance'); return }
    if (bet < 0.01) { toast.error('Minimum bet is 0.01 SOL'); return }

    setRolling(true)
    setResult(null)

    // Animate dice rolling
    let ticks = 0
    const interval = setInterval(() => {
      setDice([
        DICE_FACES[Math.floor(Math.random() * 6)],
        DICE_FACES[Math.floor(Math.random() * 6)],
      ])
      if (++ticks > 10) clearInterval(interval)
    }, 80)

    try {
      // Execute via MagicBlock ER (~50ms)
      const outcome = await executeERMove('dice', `dice_${Date.now()}`, {
        betSOL:    bet,
        direction,
        target:    50,
      })

      const { gameData, win, payoutSOL } = outcome
      const roll = (gameData as any).value as number

      // Show final dice
      const d1 = Math.ceil(roll / 16) // map 1-100 to die faces
      const d2 = Math.ceil((roll % 6) || 6)
      setDice([DICE_FACES[Math.min(d1,6)-1], DICE_FACES[d2-1]])

      setResult({ win, roll, payout: payoutSOL })

      if (win) {
        setBalance(balance + payoutSOL - bet)
        setConfetti(true)
        setTimeout(() => setConfetti(false), 3500)
        toast.success(`🎉 You won ${payoutSOL.toFixed(3)} SOL!`)
      } else {
        setBalance(balance - bet)
        toast.error(`💀 You lost ${bet.toFixed(3)} SOL`)
      }

      addPlay({
        id:        `dice_${Date.now()}`,
        wallet:    '7xKf...3mPq',
        game:      'dice',
        betAmount: bet,
        payout:    payoutSOL,
        win,
        timestamp: Date.now(),
      })
    } catch (e) {
      toast.error('Transaction failed')
    } finally {
      setRolling(false)
    }
  }, [connected, bet, balance, direction])

  return (
    <ModalBase onClose={onClose} title="Dice" subtitle="Roll over/under · 1% house edge" icon="🎲">
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

      {/* Dice display */}
      <div className="flex justify-center gap-4 my-5">
        {dice.map((d, i) => (
          <motion.div
            key={i}
            className="w-16 h-16 rounded-xl flex items-center justify-center text-[32px]
                       border-2 border-purple-600/40 shadow-[0_0_20px_rgba(124,58,237,0.2)]"
            style={{ background: 'linear-gradient(135deg,#1e1e3a,#2a2a50)' }}
            animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1,1.1,1,1.1,1] } : {}}
            transition={{ duration: 0.6, repeat: rolling ? Infinity : 0 }}
          >
            {d}
          </motion.div>
        ))}
      </div>

      {/* Direction selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['low','high'] as const).map(dir => (
          <button
            key={dir}
            onClick={() => setDirection(dir)}
            className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-200
                        ${direction === dir
                          ? 'bg-purple-900/40 border-purple-500/60 text-purple-200'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70'
                        }`}
          >
            {dir === 'low' ? 'Under 50' : 'Over 50'}
            <div className="text-[10px] text-white/30 font-normal mt-0.5">1.98x payout</div>
          </button>
        ))}
      </div>

      {/* Bet input */}
      <BetInput bet={bet} setBet={setBet} balance={balance} />

      {/* Roll button */}
      <motion.button
        onClick={handleRoll}
        disabled={rolling}
        className="btn-primary w-full mt-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: rolling ? 1 : 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        {rolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
      </motion.button>

      {/* Result banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 rounded-xl p-3 text-center font-brand text-lg font-bold
                        ${result.win
                          ? 'bg-green-900/20 border border-green-600/30 text-neon-green'
                          : 'bg-red-900/10 border border-red-700/30 text-red-400'
                        }`}
          >
            {result.win
              ? `🎉 WIN! +${result.payout.toFixed(3)} SOL (Roll: ${result.roll})`
              : `💀 LOSS! -${bet.toFixed(3)} SOL (Roll: ${result.roll})`
            }
          </motion.div>
        )}
      </AnimatePresence>
    </ModalBase>
  )
}

// ── Shared Bet Input Component ────────────────────────────────
export function BetInput({ bet, setBet, balance }: {
  bet: number; setBet: (v: number) => void; balance: number
}) {
  return (
    <div className="glass rounded-xl p-3.5">
      <div className="text-[11px] text-text-secondary uppercase tracking-wider mb-2">
        Bet Amount (SOL)
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={bet}
          onChange={e => setBet(Math.max(0.01, parseFloat(e.target.value) || 0))}
          className="flex-1 bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2
                     text-sm font-semibold text-text-primary outline-none
                     focus:border-purple-500/50 transition-colors font-mono"
          step="0.05"
          min="0.01"
        />
        {[0.05, 0.1, 0.5].map(v => (
          <button key={v}
            onClick={() => setBet(v)}
            className="px-2.5 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03]
                       text-[11px] text-text-secondary font-semibold hover:border-purple-500/40
                       hover:text-text-primary transition-all">
            {v}
          </button>
        ))}
        <button onClick={() => setBet(+(bet/2).toFixed(3))}
          className="px-2.5 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03]
                     text-[11px] text-text-secondary font-semibold hover:border-purple-500/40
                     hover:text-text-primary transition-all">½</button>
        <button onClick={() => setBet(Math.min(+(bet*2).toFixed(3), balance))}
          className="px-2.5 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03]
                     text-[11px] text-text-secondary font-semibold hover:border-purple-500/40
                     hover:text-text-primary transition-all">2×</button>
      </div>
    </div>
  )
}
