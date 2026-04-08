'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { SUPPORTED_TOKENS, getTokenBalance, formatTokenAmount, type TokenConfig } from '@/lib/spl-tokens'

interface TokenSelectorProps {
  selected:  TokenConfig
  onSelect:  (token: TokenConfig) => void
  compact?:  boolean
}

export default function TokenSelector({ selected, onSelect, compact = false }: TokenSelectorProps) {
  const { publicKey, connected } = useWallet()
  const [open, setOpen]       = useState(false)
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [loading, setLoading]  = useState(false)

  useEffect(() => {
    if (!connected || !publicKey) return
    setLoading(true)
    Promise.all(
      SUPPORTED_TOKENS.map(async t => ({
        symbol: t.symbol,
        bal: await getTokenBalance(publicKey, t).catch(() => 0),
      }))
    ).then(results => {
      setBalances(Object.fromEntries(results.map(r => [r.symbol, r.bal])))
      setLoading(false)
    })
  }, [connected, publicKey])

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl
                   bg-white/[0.04] border border-white/[0.08]
                   hover:border-purple-500/30 transition-all"
      >
        <span className="text-base" style={{ color: selected.color }}>{selected.icon}</span>
        {!compact && (
          <span className="text-sm font-bold text-text-primary">{selected.symbol}</span>
        )}
        <span className="text-xs text-text-muted">▼</span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 w-64 z-50 rounded-2xl border border-white/[0.1]
                         overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
              style={{ background: 'linear-gradient(145deg,#0d0d1a,#12121f)' }}
            >
              <div className="p-2">
                <div className="text-[10px] text-text-muted uppercase tracking-wider px-2 py-1.5">
                  Select Token
                </div>
                {SUPPORTED_TOKENS.map(token => {
                  const bal     = balances[token.symbol] ?? 0
                  const isActive = token.symbol === selected.symbol
                  return (
                    <button
                      key={token.symbol}
                      onClick={() => { onSelect(token); setOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                  transition-all text-left
                                  ${isActive
                                    ? 'bg-purple-900/30 border border-purple-600/30'
                                    : 'hover:bg-white/[0.04] border border-transparent'
                                  }`}
                    >
                      <span className="text-xl" style={{ color: token.color }}>{token.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-text-primary">{token.symbol}</span>
                          {isActive && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-purple-800/50 text-purple-300">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted truncate">{token.name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {loading ? (
                          <div className="w-12 h-3 rounded skeleton" />
                        ) : (
                          <div className="text-[11px] font-mono text-text-secondary">
                            {bal > 0 ? formatTokenAmount(bal, token) : '—'}
                          </div>
                        )}
                        <div className="text-[10px] text-text-muted">
                          Min: {token.minBet} {token.symbol}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
