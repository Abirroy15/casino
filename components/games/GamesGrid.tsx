'use client'
import { motion }         from 'framer-motion'
import { useCasinoStore } from '@/lib/store'
import type { GameType }  from '@/lib/store'
import DiceModal          from '@/components/games/modals/DiceModal'
import CoinFlipModal      from '@/components/games/modals/CoinFlipModal'
import MinesModal         from '@/components/games/modals/MinesModal'
import SlotsModal         from '@/components/games/modals/SlotsModal'
import PlinkoModal        from '@/components/games/modals/PlinkoModal'
import HiLoModal          from '@/components/games/modals/HiLoModal'
import RouletteModal      from '@/components/games/modals/RouletteModal'
import TowerXModal        from '@/components/games/modals/TowerXModal'

const GAMES = [
  { id:'towerx' as GameType, title:'Tower X', subtitle:'Climb the tower, multiply your bet', icon:'🏗️', tag:'Up to 1000x', tagColor:'text-orange-400 bg-orange-900/30', players:'142', edge:'1%', gradient:'linear-gradient(135deg,rgba(249,115,22,0.18),rgba(220,38,38,0.12),rgba(124,58,237,0.10))', glowColor:'rgba(249,115,22,0.35)', featured:true, badge:'⭐ FEATURED', badgeStyle:'bg-gradient-to-r from-orange-500 to-red-600 text-white' },
  { id:'dice' as GameType, title:'Dice', subtitle:'Roll over or under your target', icon:'🎲', tag:'1.98x payout', tagColor:'text-purple-300 bg-purple-900/30', players:'89', edge:'1%', gradient:'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(67,56,202,0.12))', glowColor:'rgba(124,58,237,0.3)' },
  { id:'coinflip' as GameType, title:'Coin Flip', subtitle:'Heads or tails — 50/50', icon:'🪙', tag:'1.98x payout', tagColor:'text-green-300 bg-green-900/30', players:'56', edge:'1%', gradient:'linear-gradient(135deg,rgba(16,185,129,0.18),rgba(5,150,105,0.12))', glowColor:'rgba(16,185,129,0.3)' },
  { id:'mines' as GameType, title:'Mines', subtitle:'Navigate the minefield safely', icon:'💣', tag:'Up to 200x', tagColor:'text-red-300 bg-red-900/30', players:'112', edge:'1%', gradient:'linear-gradient(135deg,rgba(239,68,68,0.18),rgba(220,38,38,0.12))', glowColor:'rgba(239,68,68,0.3)', badge:'HOT 🔥', badgeStyle:'bg-red-900/60 text-red-300 border border-red-700/50' },
  { id:'slots' as GameType, title:'Slots', subtitle:'Spin the reels to win big', icon:'🎰', tag:'Up to 500x', tagColor:'text-yellow-300 bg-yellow-900/30', players:'78', edge:'2%', gradient:'linear-gradient(135deg,rgba(245,158,11,0.18),rgba(217,119,6,0.12))', glowColor:'rgba(245,158,11,0.25)' },
  { id:'hilo' as GameType, title:'Hi-Lo', subtitle:'Will the next card be higher?', icon:'🃏', tag:'Up to 12x', tagColor:'text-cyan-300 bg-cyan-900/30', players:'44', edge:'1%', gradient:'linear-gradient(135deg,rgba(6,182,212,0.18),rgba(8,145,178,0.12))', glowColor:'rgba(6,182,212,0.3)' },
  { id:'roulette' as GameType, title:'Roulette', subtitle:'Classic European roulette', icon:'🎡', tag:'35x payout', tagColor:'text-pink-300 bg-pink-900/30', players:'67', edge:'2.7%', gradient:'linear-gradient(135deg,rgba(236,72,153,0.18),rgba(190,24,93,0.12))', glowColor:'rgba(236,72,153,0.3)' },
  { id:'plinko' as GameType, title:'Plinko', subtitle:'Drop the ball, catch multipliers', icon:'⚡', tag:'Up to 100x', tagColor:'text-violet-300 bg-violet-900/30', players:'33', edge:'1%', gradient:'linear-gradient(135deg,rgba(139,92,246,0.18),rgba(124,58,237,0.12))', glowColor:'rgba(139,92,246,0.3)' },
]

type ModalMap = { [K in GameType]: React.ComponentType<{onClose:()=>void}> }
const MODALS: ModalMap = { dice:DiceModal, coinflip:CoinFlipModal, mines:MinesModal, slots:SlotsModal, plinko:PlinkoModal, hilo:HiLoModal, roulette:RouletteModal, towerx:TowerXModal }

export default function GamesGrid() {
  const { activeGame, openGame, closeGame } = useCasinoStore()
  const ActiveModal = activeGame ? MODALS[activeGame] : null

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 px-6">
        {GAMES.map((g,i) => (
          <motion.div key={g.id}
            className={`relative cursor-pointer rounded-2xl p-5 overflow-hidden select-none border border-white/[0.07] ${g.featured?'col-span-2':''}`}
            style={{ background:g.gradient }}
            onClick={() => openGame(g.id)}
            whileHover={{ y:-4, scale:1.02, boxShadow:`0 12px 40px ${g.glowColor}` }}
            whileTap={{ scale:0.98 }}
            initial={{ opacity:0, y:24 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:i*0.06, type:'spring', stiffness:300, damping:25 }}>
            {g.badge && <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider z-10 ${g.badgeStyle}`}>{g.badge}</span>}
            <motion.div className="text-4xl mb-3 inline-block" animate={{ y:[0,-5,0] }} transition={{ duration:3, repeat:Infinity, delay:i*0.4 }}>{g.icon}</motion.div>
            <div className="font-brand text-[17px] font-bold text-white/95">{g.title}</div>
            <div className="text-xs text-white/50 mt-0.5">{g.subtitle}</div>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold mt-2 ${g.tagColor}`}>{g.tag}</span>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.07]">
              <span className="text-xs text-white/40">🟢 {g.players} playing</span>
              <span className="text-xs font-semibold text-white/70">{g.edge} edge</span>
            </div>
          </motion.div>
        ))}
      </div>
      {ActiveModal && <ActiveModal onClose={closeGame} />}
    </>
  )
}
