'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'
import { useCasinoStore } from '@/lib/store'
import ModalBase from './ModalBase'
import { BetInput } from './DiceModal'

const FLOORS = 10
const COLS   = 3

// Multiplier per floor (increases as you climb higher)
const FLOOR_MULT = [1.5, 1.8, 2.2, 2.8, 3.5, 5, 7, 12, 25, 100]

// Probability safe per floor (decreases as you climb)
const SAFE_PROB = [0.85, 0.80, 0.74, 0.68, 0.62, 0.55, 0.47, 0.38, 0.28, 0.16]

type TileState = 'hidden' | 'safe' | 'bomb' | 'inactive'

interface FloorData { tiles: TileState[]; bombCol: number }

function generateFloor(floorIdx: number): FloorData {
  const bombCol = Math.floor(Math.random() * COLS)
  return { tiles: Array(COLS).fill('hidden'), bombCol }
}

export default function TowerXModal({ onClose }: { onClose: () => void }) {
  const { connected } = useWallet()
  const { balance, setBalance, addPlay } = useCasinoStore()

  const [bet, setBet]             = useState(0.1)
  const [floors, setFloors]       = useState<FloorData[]>([])
  const [currentFloor, setFloor]  = useState(0)
  const [totalMult, setMult]      = useState(1)
  const [phase, setPhase]         = useState<'bet' | 'play' | 'over'>('bet')
  const [gameResult, setGameRes]  = useState<'win' | 'loss' | null>(null)
  const [confetti, setConfetti]   = useState(false)
  const [choosing, setChoosing]   = useState(false)

  const startGame = useCallback(() => {
    if (!connected) { toast.error('Connect wallet first'); return }
    if (bet > balance) { toast.error('Insufficient balance'); return }
    setBalance(balance - bet)
    setFloors(Array.from({ length: FLOORS }, (_, i) => generateFloor(i)))
    setFloor(0)
    setMult(1)
    setGameRes(null)
    setPhase('play')
  }, [connected, bet, balance])

  const pickTile = useCallback(async (col: number) => {
    if (choosing || phase !== 'play') return
    setChoosing(true)

    await new Promise(r => setTimeout(r, 150))

    const floor = floors[currentFloor]
    const isSafe = Math.random() < SAFE_PROB[currentFloor]  // MagicBlock ER handles this privately

    const newFloors = floors.map((f, i) => {
      if (i !== currentFloor) return f
      const newTiles = [...f.tiles]
      if (isSafe) {
        newTiles[col] = 'safe'
      } else {
        // Reveal bomb at chosen column, show all bombs
        newTiles[col] = 'bomb'
      }
      return { ...f, tiles: newTiles }
    })
    setFloors(newFloors)

    if (isSafe) {
      const floorMultiplier = FLOOR_MULT[currentFloor]
      const newMult = +(totalMult * floorMultiplier).toFixed(2)
      setMult(newMult)
      toast(`✅ Floor ${currentFloor + 1} cleared! ${newMult}×`, { icon: '🏗️' })

      if (currentFloor === FLOORS - 1) {
        // Top floor! Auto cashout
        const payout = +(bet * newMult).toFixed(4)
        setBalance(balance - bet + payout)
        setGameRes('win')
        setPhase('over')
        setConfetti(true)
        setTimeout(() => setConfetti(false), 5000)
        toast.success(`🏆 TOWER CLEARED! +${payout.toFixed(3)} SOL`)
        addPlay({ id:`towerx_${Date.now()}`, wallet:'7xKf...3mPq', game:'towerx',
                  betAmount:bet, payout, win:true, timestamp:Date.now() })
      } else {
        setTimeout(() => setFloor(f => f + 1), 400)
      }
    } else {
      setGameRes('loss')
      setPhase('over')
      toast.error(`💥 BOMB on Floor ${currentFloor + 1}! Lost ${bet.toFixed(3)} SOL`)
      addPlay({ id:`towerx_${Date.now()}`, wallet:'7xKf...3mPq', game:'towerx',
                betAmount:bet, payout:0, win:false, timestamp:Date.now() })
    }

    setChoosing(false)
  }, [choosing, phase, floors, currentFloor, totalMult, bet, balance])

  const cashOut = useCallback(() => {
    const payout = +(bet * totalMult).toFixed(4)
    setBalance(balance - bet + payout)
    setGameRes('win')
    setPhase('over')
    if (totalMult >= 10) { setConfetti(true); setTimeout(() => setConfetti(false), 3500) }
    toast.success(`💰 Cashed out ${payout.toFixed(3)} SOL (${totalMult}×)`)
    addPlay({ id:`towerx_${Date.now()}`, wallet:'7xKf...3mPq', game:'towerx',
              betAmount:bet, payout, win:true, timestamp:Date.now() })
  }, [bet, totalMult, balance])

  return (
    <ModalBase onClose={onClose} title="Tower X" subtitle="Climb floors · Avoid bombs · Cash out anytime" icon="🏗️">
      {confetti && <Confetti numberOfPieces={300} recycle={false} />}

      {/* Multiplier bar */}
      {phase !== 'bet' && (
        <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl
                        bg-orange-900/20 border border-orange-600/30">
          <span className="text-xs text-text-secondary">Floor {currentFloor + 1}/{FLOORS}</span>
          <span className="font-brand text-2xl font-bold text-orange-400">{totalMult}×</span>
          <span className="text-xs text-text-secondary">
            {(bet * totalMult).toFixed(3)} SOL
          </span>
        </div>
      )}

      {/* Tower grid — rendered bottom to top */}
      {phase !== 'bet' && (
        <div className="flex flex-col-reverse gap-1.5 mb-3 max-h-[260px] overflow-y-auto px-1">
          {Array.from({ length: FLOORS }, (_, fi) => {
            const floorIdx = FLOORS - 1 - fi  // bottom = floor 0
            const floorData = floors[floorIdx]
            const isActive   = floorIdx === currentFloor && phase === 'play'
            const isPast     = floorIdx < currentFloor
            const isFuture   = floorIdx > currentFloor
            const floorLabel = FLOORS - floorIdx

            return (
              <div key={floorIdx} className="flex items-center gap-1.5">
                <div className="text-[10px] text-text-muted w-12 text-right shrink-0">
                  {FLOOR_MULT[floorIdx]}× <span className="text-[9px]">F{floorLabel}</span>
                </div>
                <div className="flex gap-1.5 flex-1">
                  {Array.from({ length: COLS }, (_, col) => {
                    const tileState = floorData?.tiles[col] || 'inactive'
                    return (
                      <motion.button
                        key={col}
                        onClick={() => isActive && pickTile(col)}
                        disabled={!isActive || choosing}
                        className={`flex-1 h-10 rounded-xl flex items-center justify-center text-lg
                                    border transition-all
                                    ${isActive
                                      ? 'border-orange-500/40 bg-orange-900/20 hover:bg-orange-800/30 cursor-pointer'
                                      : isPast && tileState === 'safe'
                                      ? 'border-emerald-600/40 bg-emerald-900/30 cursor-not-allowed'
                                      : tileState === 'bomb'
                                      ? 'border-red-600/40 bg-red-900/30 cursor-not-allowed'
                                      : 'border-white/[0.05] bg-white/[0.02] cursor-not-allowed'
                                    }`}
                        whileHover={isActive ? { scale: 1.06 } : {}}
                        whileTap={isActive ? { scale: 0.94 } : {}}
                        animate={isActive ? { boxShadow: ['0 0 0 0 rgba(249,115,22,0.3)', '0 0 0 4px rgba(249,115,22,0)', '0 0 0 0 rgba(249,115,22,0.3)'] } : {}}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        {tileState === 'safe' && '✅'}
                        {tileState === 'bomb' && '💥'}
                        {tileState === 'hidden' && isActive && <span className="text-orange-400/60 text-sm">?</span>}
                        {tileState === 'hidden' && isFuture && <span className="text-white/10 text-xs">·</span>}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {phase === 'bet' && (
        <>
          <BetInput bet={bet} setBet={setBet} balance={balance} />
          <motion.button onClick={startGame}
            className="w-full mt-4 py-3.5 rounded-xl font-brand text-base font-bold text-white border-none"
            style={{ background:'linear-gradient(135deg,#f97316,#dc2626,#7c3aed)' }}
            whileHover={{ scale:1.02, boxShadow:'0 6px 24px rgba(249,115,22,0.4)' }}
            whileTap={{ scale:0.97 }}>
            🏗️ Start Climbing
          </motion.button>
        </>
      )}

      {phase === 'play' && currentFloor > 0 && (
        <motion.button onClick={cashOut}
          className="w-full py-3 rounded-xl font-brand text-base font-bold text-white border-none mb-0"
          style={{ background:'linear-gradient(135deg,#10b981,#059669)' }}
          whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}>
          💰 Cash Out {(bet * totalMult).toFixed(3)} SOL
        </motion.button>
      )}

      <AnimatePresence>
        {phase === 'over' && gameResult && (
          <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}>
            <div className={`mt-2 rounded-xl p-2.5 text-center font-brand text-lg font-bold
              ${gameResult === 'win'
                ? 'bg-green-900/20 border border-green-600/30 text-neon-green'
                : 'bg-red-900/10 border border-red-700/30 text-red-400'}`}>
              {gameResult === 'win'
                ? `🏆 ${totalMult}× — +${(bet * totalMult).toFixed(3)} SOL`
                : `💥 Floor ${currentFloor + 1} bomb! -${bet.toFixed(3)} SOL`}
            </div>
            <button onClick={() => { setPhase('bet'); setFloors([]); setFloor(0); setMult(1) }}
              className="w-full mt-2 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04]
                         text-sm font-semibold text-text-secondary hover:text-text-primary transition-all">
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalBase>
  )
}
