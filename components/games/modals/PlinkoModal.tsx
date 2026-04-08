'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'
import { useCasinoStore } from '@/lib/store'
import ModalBase from './ModalBase'
import { BetInput } from './DiceModal'

const ROWS = 8
const MULTIPLIERS = [10, 3, 1.5, 1, 0.5, 1, 1.5, 3, 10]
const COLORS = ['#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#84cc16','#eab308','#f59e0b','#f97316']

interface Ball { id: number; x: number; y: number; vx: number; vy: number; settled: boolean; slot?: number }
interface Peg { cx: number; cy: number }

function buildPegs(w: number): Peg[] {
  const pegs: Peg[] = []
  const rowSpacing = 36
  const startY = 40
  for (let r = 0; r < ROWS; r++) {
    const count = r + 2
    const totalW = (count - 1) * 44
    const startX = w / 2 - totalW / 2
    for (let c = 0; c < count; c++) {
      pegs.push({ cx: startX + c * 44, cy: startY + r * rowSpacing })
    }
  }
  return pegs
}

export default function PlinkoModal({ onClose }: { onClose: () => void }) {
  const { connected } = useWallet()
  const { balance, setBalance, addPlay } = useCasinoStore()

  const [bet, setBet]           = useState(0.1)
  const [balls, setBalls]       = useState<Ball[]>([])
  const [dropping, setDrop]     = useState(false)
  const [lastResult, setLast]   = useState<null | { mult: number; payout: number; win: boolean }>(null)
  const [confetti, setConfetti] = useState(false)
  const canvasRef               = useRef<HTMLCanvasElement>(null)
  const ballId                  = useRef(0)
  const W = 360, H = 340

  const pegs = buildPegs(W)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let raf: number
    const allBalls = [...balls]

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Draw pegs
      pegs.forEach(({ cx, cy }) => {
        ctx.beginPath()
        ctx.arc(cx, cy, 4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(168,85,247,0.7)'
        ctx.shadowColor = '#a855f7'
        ctx.shadowBlur = 6
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Draw slot buckets at bottom
      const slotW = W / MULTIPLIERS.length
      MULTIPLIERS.forEach((m, i) => {
        const x = i * slotW
        const y = H - 30
        ctx.fillStyle = COLORS[i] + '30'
        ctx.fillRect(x + 1, y, slotW - 2, 30)
        ctx.fillStyle = COLORS[i]
        ctx.font = 'bold 10px Inter'
        ctx.textAlign = 'center'
        ctx.fillText(`${m}×`, x + slotW / 2, y + 20)
      })

      // Simulate and draw balls
      allBalls.forEach(ball => {
        if (ball.settled) return
        ball.vy += 0.6  // gravity
        ball.x += ball.vx
        ball.y += ball.vy

        // Peg collisions
        pegs.forEach(({ cx, cy }) => {
          const dx = ball.x - cx, dy = ball.y - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 10) {
            ball.vx = (Math.random() - 0.5) * 3 + (dx / dist) * 2
            ball.vy = Math.abs(ball.vy) * 0.6
            ball.x = cx + dx / dist * 11
          }
        })

        // Walls
        if (ball.x < 8) { ball.x = 8; ball.vx = Math.abs(ball.vx) }
        if (ball.x > W - 8) { ball.x = W - 8; ball.vx = -Math.abs(ball.vx) }

        // Settled in slot
        if (ball.y > H - 35) {
          ball.settled = true
          ball.slot = Math.min(Math.floor(ball.x / (W / MULTIPLIERS.length)), MULTIPLIERS.length - 1)
          const mult = MULTIPLIERS[ball.slot]
          const payout = +(bet * mult).toFixed(4)
          const win = mult >= 1
          setBalance(s => +(s + payout).toFixed(4))
          setLast({ mult, payout, win })
          if (mult >= 5) { setConfetti(true); setTimeout(() => setConfetti(false), 3500) }
          toast[win ? 'success' : 'error'](`${mult}× — ${win ? '+' : ''}${payout.toFixed(3)} SOL`)
          addPlay({ id:`plinko_${Date.now()}`, wallet:'7xKf...3mPq', game:'plinko',
                    betAmount:bet, payout, win, timestamp:Date.now() })
          setDrop(false)
        }

        // Draw ball
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2)
        const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, 7)
        grad.addColorStop(0, '#c4b5fd')
        grad.addColorStop(1, '#7c3aed')
        ctx.fillStyle = grad
        ctx.shadowColor = '#a855f7'
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      })

      const anyMoving = allBalls.some(b => !b.settled)
      if (anyMoving) raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [balls, pegs, bet])

  const dropBall = useCallback(() => {
    if (!connected) { toast.error('Connect wallet first'); return }
    if (bet > balance) { toast.error('Insufficient balance'); return }
    if (dropping) return

    setDrop(true)
    setLast(null)
    setBalance(balance - bet)

    const newBall: Ball = {
      id: ballId.current++,
      x: W / 2 + (Math.random() - 0.5) * 10,
      y: 10,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1,
      settled: false,
    }
    setBalls([newBall])
  }, [connected, bet, balance, dropping])

  return (
    <ModalBase onClose={onClose} title="Plinko" subtitle="Drop the ball · Land for multipliers · 1% edge" icon="⚡">
      {confetti && <Confetti numberOfPieces={200} recycle={false} />}

      {/* Plinko canvas */}
      <div className="flex justify-center mb-3">
        <canvas ref={canvasRef} width={W} height={H}
          className="rounded-xl border border-white/[0.06]"
          style={{ background:'linear-gradient(180deg,#0a0a1a,#0d0d20)', maxWidth:'100%' }} />
      </div>

      <BetInput bet={bet} setBet={setBet} balance={balance} />

      <motion.button onClick={dropBall} disabled={dropping}
        className="btn-primary w-full mt-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: dropping ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}>
        {dropping ? '⚡ Dropping...' : '⚡ Drop Ball'}
      </motion.button>

      <AnimatePresence>
        {lastResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-3 rounded-xl p-2.5 text-center font-brand text-lg font-bold
              ${lastResult.win
                ? 'bg-green-900/20 border border-green-600/30 text-neon-green'
                : 'bg-red-900/10 border border-red-700/30 text-red-400'}`}>
            {lastResult.win
              ? `🎉 ${lastResult.mult}× · +${lastResult.payout.toFixed(3)} SOL`
              : `💀 ${lastResult.mult}× · -${(bet - lastResult.payout).toFixed(3)} SOL`}
          </motion.div>
        )}
      </AnimatePresence>
    </ModalBase>
  )
}
