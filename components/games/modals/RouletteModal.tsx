'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'
import { useCasinoStore } from '@/lib/store'
import ModalBase from './ModalBase'
import { BetInput } from './DiceModal'

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])

interface Bet { type: string; label: string; numbers: number[]; payout: number }

const BET_TYPES: Bet[] = [
  { type:'red',   label:'Red',    numbers:[...RED_NUMBERS],                    payout:2  },
  { type:'black', label:'Black',  numbers:Array.from({length:36},(_,i)=>i+1).filter(n=>!RED_NUMBERS.has(n)), payout:2 },
  { type:'even',  label:'Even',   numbers:Array.from({length:18},(_,i)=>(i+1)*2),         payout:2 },
  { type:'odd',   label:'Odd',    numbers:Array.from({length:18},(_,i)=>i*2+1),            payout:2 },
  { type:'1-18',  label:'1-18',   numbers:Array.from({length:18},(_,i)=>i+1),              payout:2 },
  { type:'19-36', label:'19-36',  numbers:Array.from({length:18},(_,i)=>i+19),             payout:2 },
]

function getColor(n: number): string {
  if (n === 0) return '#059669'
  return RED_NUMBERS.has(n) ? '#dc2626' : '#1a1a2e'
}

export default function RouletteModal({ onClose }: { onClose: () => void }) {
  const { connected } = useWallet()
  const { balance, setBalance, addPlay } = useCasinoStore()

  const [bet, setBet]             = useState(0.1)
  const [selectedBet, setSelBet]  = useState<Bet | null>(null)
  const [spinning, setSpin]       = useState(false)
  const [result, setResult]       = useState<null | { number: number; win: boolean; payout: number }>(null)
  const [wheelAngle, setAngle]    = useState(0)
  const [confetti, setConfetti]   = useState(false)
  const animRef                   = useRef<number>()

  const spin = useCallback(async () => {
    if (!selectedBet) { toast.error('Place a bet first!'); return }
    if (!connected) { toast.error('Connect wallet first'); return }
    if (bet > balance) { toast.error('Insufficient balance'); return }

    setSpin(true)
    setResult(null)
    setBalance(balance - bet)

    // Determine result
    const winNumber = Math.floor(Math.random() * 37) // 0-36
    const spins = 5 + Math.random() * 3              // 5-8 full rotations
    const targetAngle = wheelAngle + spins * 360 + (winNumber / 37) * 360

    // Animate wheel
    const startAngle = wheelAngle
    const startTime = performance.now()
    const duration = 3500

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startAngle + (targetAngle - startAngle) * eased
      setAngle(current)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setAngle(targetAngle % 360)
        const win = selectedBet.numbers.includes(winNumber)
        const payout = win ? +(bet * selectedBet.payout).toFixed(4) : 0
        if (win) {
          setBalance(balance - bet + payout)
          if (selectedBet.payout >= 10) { setConfetti(true); setTimeout(() => setConfetti(false), 3500) }
          toast.success(`🎡 ${winNumber}! +${payout.toFixed(3)} SOL`)
        } else {
          toast.error(`🎡 ${winNumber}. Lost ${bet.toFixed(3)} SOL`)
        }
        setResult({ number: winNumber, win, payout })
        addPlay({ id:`roulette_${Date.now()}`, wallet:'7xKf...3mPq', game:'roulette',
                  betAmount:bet, payout, win, timestamp:Date.now() })
        setSpin(false)
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }, [selectedBet, connected, bet, balance, wheelAngle])

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  // Simplified SVG wheel
  const radius = 80
  const segments = 37

  return (
    <ModalBase onClose={onClose} title="Roulette" subtitle="European roulette · 37 numbers · 2.7% edge" icon="🎡">
      {confetti && <Confetti numberOfPieces={200} recycle={false} />}

      {/* Wheel */}
      <div className="flex justify-center mb-4">
        <div className="relative" style={{ width:180, height:180 }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <g transform={`rotate(${wheelAngle}, 90, 90)`}>
              {Array.from({ length: segments }, (_, i) => {
                const n = i === 0 ? 0 : i
                const startAngle = (i / segments) * 360 - 90
                const endAngle   = ((i + 1) / segments) * 360 - 90
                const sr = startAngle * Math.PI / 180
                const er = endAngle * Math.PI / 180
                const x1 = 90 + radius * Math.cos(sr)
                const y1 = 90 + radius * Math.sin(sr)
                const x2 = 90 + radius * Math.cos(er)
                const y2 = 90 + radius * Math.sin(er)
                const large = endAngle - startAngle > 180 ? 1 : 0
                return (
                  <path key={i}
                    d={`M90,90 L${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} Z`}
                    fill={getColor(n)}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="0.5" />
                )
              })}
              {/* Center */}
              <circle cx="90" cy="90" r="18" fill="#0d0d1a" stroke="rgba(168,85,247,0.5)" strokeWidth="2" />
              <circle cx="90" cy="90" r="6" fill="#a855f7" />
            </g>
            {/* Pointer */}
            <polygon points="90,4 85,16 95,16" fill="#f59e0b"
                     filter="drop-shadow(0 0 4px rgba(245,158,11,0.8))" />
          </svg>

          {/* Result overlay */}
          {result && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-brand text-lg font-bold text-white"
                   style={{ background: getColor(result.number), boxShadow:`0 0 20px ${getColor(result.number)}` }}>
                {result.number}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bet type buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {BET_TYPES.map(b => (
          <button key={b.type} onClick={() => setSelBet(b)}
            className={`py-2.5 rounded-xl border text-xs font-semibold transition-all
              ${selectedBet?.type === b.type
                ? b.type === 'red'
                  ? 'bg-red-900/40 border-red-500/60 text-red-200'
                  : 'bg-white/[0.1] border-purple-500/60 text-purple-200'
                : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70'
              }`}
            style={selectedBet?.type === b.type && b.type === 'red'
              ? {} : selectedBet?.type === b.type && b.type === 'black'
              ? { background:'rgba(30,30,60,0.5)', borderColor:'rgba(100,100,180,0.6)' } : {}}>
            <span style={b.type==='red'?{color:'#f87171'}:b.type==='black'?{color:'#94a3b8'}:{}}>
              {b.label}
            </span>
            <div className="text-[10px] text-white/30">{b.payout}×</div>
          </button>
        ))}
      </div>

      <BetInput bet={bet} setBet={setBet} balance={balance} />

      <motion.button onClick={spin} disabled={spinning || !selectedBet}
        className="btn-primary w-full mt-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: spinning ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}>
        {spinning ? '🎡 Spinning...' : '🎡 Spin Wheel'}
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-3 rounded-xl p-2.5 text-center font-brand text-lg font-bold
              ${result.win
                ? 'bg-green-900/20 border border-green-600/30 text-neon-green'
                : 'bg-red-900/10 border border-red-700/30 text-red-400'}`}>
            {result.win
              ? `🎉 ${result.number} — Won +${result.payout.toFixed(3)} SOL`
              : `💀 ${result.number} — Lost ${bet.toFixed(3)} SOL`}
          </motion.div>
        )}
      </AnimatePresence>
    </ModalBase>
  )
}
