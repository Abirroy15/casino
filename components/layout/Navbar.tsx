'use client'
import { useWallet }              from '@solana/wallet-adapter-react'
import { WalletMultiButton }      from '@solana/wallet-adapter-react-ui'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState }    from 'react'
import { getSolBalance, shortAddr } from '@/lib/solana'
import { useCasinoStore }           from '@/lib/store'
import { GiCardRandom }             from 'react-icons/gi'
import { HiOutlineChartBar, HiOutlineGift, HiOutlineShieldCheck } from 'react-icons/hi2'

const NAV_TABS = [
  { id: 'lobby',      label: 'Lobby',         icon: <GiCardRandom size={15} /> },
  { id: 'leaderboard',label: 'Leaderboard',   icon: <HiOutlineChartBar size={15} /> },
  { id: 'rewards',    label: 'Daily Rewards', icon: <HiOutlineGift size={15} /> },
  { id: 'provably',   label: 'Provably Fair', icon: <HiOutlineShieldCheck size={15} /> },
]

export default function Navbar() {
  const { publicKey, connected, disconnect } = useWallet()
  const { setConnected, setDisconnected, balance, address } = useCasinoStore()
  const [activeTab, setActiveTab] = useState('lobby')

  useEffect(() => {
    if (connected && publicKey) {
      getSolBalance(publicKey).then(bal => {
        setConnected(publicKey.toBase58(), bal)
      })
    } else {
      setDisconnected()
    }
  }, [connected, publicKey])

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16
                       bg-casino-dark/80 backdrop-blur-xl border-b border-white/[0.06]">

      {/* Logo */}
      <motion.div
        className="flex items-center gap-2.5 cursor-pointer"
        whileHover={{ scale: 1.02 }}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue
                        flex items-center justify-center text-base shadow-glow-purple">
          🎰
        </div>
        <span className="font-brand text-2xl font-bold neon-text-purple tracking-wide">
          MagicPlay
        </span>
        <span className="text-[10px] text-neon-green/80 border border-neon-green/30
                         rounded-full px-1.5 py-0.5 font-mono tracking-wider">
          DEVNET
        </span>
      </motion.div>

      {/* Center nav tabs */}
      <nav className="hidden md:flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
        {NAV_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium
                        transition-all duration-200
                        ${activeTab === tab.id
                          ? 'bg-white/[0.08] text-neon-purple shadow-sm'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                        }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right: balance + wallet */}
      <div className="flex items-center gap-3">

        <AnimatePresence>
          {connected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2.5"
            >
              {/* SOL Balance */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                              bg-white/[0.04] border border-white/[0.07]">
                <span className="w-2 h-2 rounded-full bg-neon-green
                                 shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="font-mono text-sm font-semibold text-text-primary">
                  {balance.toFixed(3)}
                </span>
                <span className="text-xs text-text-secondary">SOL</span>
              </div>

              {/* Short address */}
              <div className="hidden sm:flex items-center px-3 py-1.5 rounded-xl
                              bg-white/[0.04] border border-white/[0.07]
                              font-mono text-xs text-text-secondary cursor-pointer
                              hover:text-text-primary transition-colors"
                   onClick={() => navigator.clipboard.writeText(address || '')}>
                {address ? shortAddr(address) : ''}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wallet adapter button (Phantom) */}
        <WalletMultiButton />
      </div>
    </header>
  )
}
