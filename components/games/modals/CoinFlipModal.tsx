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

type CoinSide = 'heads' | 'tails'

export default function CoinFlipModal({ onClose }: { onClose: () => void }) {
  const { connected } = useWallet()
  const { balance, setBalance, addPlay } = useCasinoStore()

  const [choice, setChoice]   = useState<CoinSide | null>(null)
  const [bet, setBet]         = useState(0.1)
  const [flipping, setFlip]   = useState(false)
  const [face, setFace]       = useState<CoinSide>('heads')
  const [result, setResult]   = useState<null | { win: boolean; result: CoinSide; payout: number }>(null)
  const [confetti, setConfetti] = useState(false)

  const handleFlip = useCallback(async () => {
    if (!choice) { toast.error('Choose Heads or Tails first!'); return }
    if (!connected) { toast.error('Connect wallet first'); return }
    if (bet > balance) { toast.error('Insufficient balance'); return }

    setFlip(true)
    setResult(null)

    try {
      const outcome = await executeERMove('coinflip', `coin_${Date.now()}`, {
        betSOL: bet, choice,
      })
      const resultSide = (outcome.gameData as any).result as CoinSide

      setFace(resultSide)

      if (outcome.win) {
        setBalance(balance + outcome.payoutSOL - bet)
        setConfetti(true)
        setTimeout(() => setConfetti(false), 3500)
        toast.success(`🎉 ${resultSide.toUpperCase()}! +${outcome.payoutSOL.toFixed(3)} SOL`)
      } else {
        setBalance(balance - bet)
        toast.error(`💀 ${resultSide.toUpperCase()}! -${bet.toFixed(3)} SOL`)
      }

      setResult({ win: outcome.win, result: resultSide, payout: outcome.payoutSOL })
      addPlay({ id:`coin_${Date.now()}`, wallet:'7xKf...3mPq', game:'coinflip',
                betAmount:bet, payout:outcome.payoutSOL, win:outcome.win, timestamp:Date.now() })
    } catch {
      toast.error('Transaction failed')
    } finally {
      setFlip(false)
    }
  }, [choice, connected, bet, balance])

  return (
    <ModalBase onClose={onClose} title="Coin Flip" subtitle="Heads or Tails · 1.98x payout · 1% edge" icon="🪙">
      {confetti && <Confetti numberOfPieces={180} recycle={false} />}

      {/* Coin */}
      <div className="flex justify-center my-5">
        <motion.div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl
                     shadow-[0_0_32px_rgba(245,158,11,0.35)] cursor-default"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                   border: '3px solid rgba(245,158,11,0.5)' }}
          animate={flipping
            ? { rotateY: [0, 90, 180, 270, 360, 450, 540, 630, 720], scale: [1, 1.15, 1, 1.15, 1] }
            : {}}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          {face === 'heads' ? '🌕' : '🌑'}
        </motion.div>
      </div>

      {/* Choice buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(['heads', 'tails'] as CoinSide[]).map(side => (
          <motion.button
            key={side}
            onClick={() => setChoice(side)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`py-4 rounded-xl border text-sm font-semibold transition-all
                        flex flex-col items-center gap-1.5
                        ${choice === side
                          ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70'
                        }`}
          >
            <span className="text-3xl">{side === 'heads' ? '🌕' : '🌑'}</span>
            <span className="capitalize">{side}</span>
          </motion.button>
        ))}
      </div>

      <BetInput bet={bet} setBet={setBet} balance={balance} />

      <motion.button
        onClick={handleFlip}
        disabled={flipping || !choice}
        className="btn-primary w-full mt-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: flipping ? 1 : 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        {flipping ? '🪙 Flipping...' : '🪙 Flip Coin'}
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`mt-4 rounded-xl p-3 text-center font-brand text-lg font-bold
              ${result.win
                ? 'bg-green-900/20 border border-green-600/30 text-neon-green'
                : 'bg-red-900/10 border border-red-700/30 text-red-400'
              }`}
          >
            {result.win
              ? `🎉 ${result.result.toUpperCase()}! +${result.payout.toFixed(3)} SOL`
              : `💀 ${result.result.toUpperCase()}! -${bet.toFixed(3)} SOL`}
          </motion.div>
        )}
      </AnimatePresence>
    </ModalBase>
  )
}
