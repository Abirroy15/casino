'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'
import { useCasinoStore } from '@/lib/store'
import ModalBase from './ModalBase'
import { BetInput } from './DiceModal'

const SUITS  = ['♠','♥','♦','♣']
const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

interface Card { value: string; suit: string; numValue: number }

function randomCard(): Card {
  const idx = Math.floor(Math.random() * 13)
  return {
    value:    VALUES[idx],
    suit:     SUITS[Math.floor(Math.random() * 4)],
    numValue: idx + 1,
  }
}

function calcOdds(card: Card, direction: 'higher' | 'lower'): number {
  const edge = 0.01
  if (direction === 'higher') {
    const wins = 13 - card.numValue
    const prob = wins / 13
    return prob > 0 ? +(((1 - edge) / prob)).toFixed(2) : 0
  } else {
    const wins = card.numValue - 1
    const prob = wins / 13
    return prob > 0 ? +(((1 - edge) / prob)).toFixed(2) : 0
  }
}

function CardDisplay({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  const isRed = card.suit === '♥' || card.suit === '♦'
  return (
    <motion.div
      className="w-20 h-28 rounded-xl flex flex-col items-center justify-center
                 font-bold select-none border"
      style={{ background: hidden ? 'linear-gradient(135deg,#1a1040,#2d1060)' : 'white',
               borderColor: hidden ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.8)' }}
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 250 }}
    >
      {hidden
        ? <span className="text-3xl text-purple-400">🂠</span>
        : <>
            <span className={`text-2xl font-black ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {card.value}
            </span>
            <span className={`text-xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {card.suit}
            </span>
          </>
      }
    </motion.div>
  )
}

export default function HiLoModal({ onClose }: { onClose: () => void }) {
  const { connected } = useWallet()
  const { balance, setBalance, addPlay } = useCasinoStore()

  const [bet, setBet]           = useState(0.1)
  const [currentCard, setCurrent] = useState<Card>(randomCard())
  const [nextCard, setNext]     = useState<Card | null>(null)
  const [guessing, setGuess]    = useState(false)
  const [streak, setStreak]     = useState(0)
  const [multiplier, setMult]   = useState(1)
  const [phase, setPhase]       = useState<'bet' | 'play' | 'over'>('bet')
  const [result, setResult]     = useState<null | { win: boolean; payout: number }>(null)
  const [confetti, setConfetti] = useState(false)

  const startGame = useCallback(() => {
    if (!connected) { toast.error('Connect wallet first'); return }
    if (bet > balance) { toast.error('Insufficient balance'); return }
    setBalance(balance - bet)
    setCurrent(randomCard())
    setNext(null)
    setStreak(0)
    setMult(1)
    setResult(null)
    setPhase('play')
  }, [connected, bet, balance])

  const guess = useCallback(async (direction: 'higher' | 'lower') => {
    if (guessing) return
    setGuess(true)

    const next = randomCard()
    setNext(next)

    await new Promise(r => setTimeout(r, 600))

    const odds = calcOdds(currentCard, direction)
    const correct = direction === 'higher'
      ? next.numValue > currentCard.numValue
      : next.numValue < currentCard.numValue

    if (correct) {
      const newMult = +(multiplier * odds).toFixed(2)
      setMult(newMult)
      setStreak(s => s + 1)
      toast(`✅ Correct! ${odds}× · Total: ${newMult}×`, { icon: '🃏' })
      setTimeout(() => {
        setCurrent(next)
        setNext(null)
        setGuess(false)
      }, 700)
    } else {
      // Wrong — lose bet
      setResult({ win: false, payout: 0 })
      setPhase('over')
      toast.error(`❌ Wrong! Lost ${bet.toFixed(3)} SOL`)
      addPlay({ id:`hilo_${Date.now()}`, wallet:'7xKf...3mPq', game:'hilo',
                betAmount:bet, payout:0, win:false, timestamp:Date.now() })
      setGuess(false)
    }
  }, [guessing, currentCard, multiplier, bet])

  const cashOut = useCallback(() => {
    const payout = +(bet * multiplier).toFixed(4)
    setBalance(balance + payout)
    setResult({ win: true, payout })
    setPhase('over')
    if (multiplier >= 5) { setConfetti(true); setTimeout(() => setConfetti(false), 3500) }
    toast.success(`💰 Cashed out ${payout.toFixed(3)} SOL (${multiplier}×)`)
    addPlay({ id:`hilo_${Date.now()}`, wallet:'7xKf...3mPq', game:'hilo',
              betAmount:bet, payout, win:true, timestamp:Date.now() })
  }, [bet, multiplier, balance])

  return (
    <ModalBase onClose={onClose} title="Hi-Lo" subtitle="Guess higher or lower · Build your multiplier" icon="🃏">
      {confetti && <Confetti numberOfPieces={200} recycle={false} />}

      {/* Card area */}
      <div className="flex justify-center items-end gap-6 my-5">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider">Current</span>
          <CardDisplay card={currentCard} />
        </div>
        <div className="text-2xl text-text-muted mb-6">→</div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider">Next</span>
          {nextCard ? <CardDisplay card={nextCard} /> : <CardDisplay card={{ value:'?', suit:'?', numValue:0 }} hidden />}
        </div>
      </div>

      {/* Multiplier + streak */}
      {phase === 'play' && (
        <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl
                        bg-purple-900/20 border border-purple-600/30">
          <span className="text-xs text-text-secondary">Streak: {streak}</span>
          <span className="font-brand text-xl font-bold text-neon-purple">{multiplier}×</span>
          <span className="text-xs text-text-secondary">
            Potential: {(bet * multiplier).toFixed(3)} SOL
          </span>
        </div>
      )}

      {phase === 'bet' && (
        <>
          <BetInput bet={bet} setBet={setBet} balance={balance} />
          <motion.button onClick={startGame}
            className="btn-primary w-full mt-4 text-base"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            🃏 Start Game
          </motion.button>
        </>
      )}

      {phase === 'play' && (
        <>
          {/* Odds preview */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-center text-text-secondary">
            <div className="bg-white/[0.03] rounded-lg py-1.5">
              Higher odds: <span className="text-neon-green font-bold">{calcOdds(currentCard, 'higher')}×</span>
            </div>
            <div className="bg-white/[0.03] rounded-lg py-1.5">
              Lower odds: <span className="text-neon-blue font-bold">{calcOdds(currentCard, 'lower')}×</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <motion.button onClick={() => guess('higher')} disabled={guessing}
              className="py-4 rounded-xl border border-emerald-600/40 bg-emerald-900/20
                         text-sm font-bold text-neon-green disabled:opacity-50 transition-all"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              ▲ Higher
            </motion.button>
            <motion.button onClick={() => guess('lower')} disabled={guessing}
              className="py-4 rounded-xl border border-blue-600/40 bg-blue-900/20
                         text-sm font-bold text-neon-blue disabled:opacity-50 transition-all"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              ▼ Lower
            </motion.button>
          </div>

          {streak > 0 && (
            <motion.button onClick={cashOut}
              className="w-full py-3 rounded-xl font-brand text-base font-bold text-white border-none"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              💰 Cash Out {(bet * multiplier).toFixed(3)} SOL
            </motion.button>
          )}
        </>
      )}

      {phase === 'over' && result && (
        <>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            className={`mb-4 rounded-xl p-3 text-center font-brand text-lg font-bold
              ${result.win
                ? 'bg-green-900/20 border border-green-600/30 text-neon-green'
                : 'bg-red-900/10 border border-red-700/30 text-red-400'}`}>
            {result.win
              ? `🎉 Cashed out! +${result.payout.toFixed(3)} SOL (${multiplier}×)`
              : `💀 Wrong guess! Lost ${bet.toFixed(3)} SOL`}
          </motion.div>
          <button onClick={() => { setPhase('bet'); setCurrent(randomCard()); setNext(null) }}
            className="w-full py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04]
                       text-sm font-semibold text-text-secondary hover:text-text-primary transition-all">
            Play Again
          </button>
        </>
      )}
    </ModalBase>
  )
}
