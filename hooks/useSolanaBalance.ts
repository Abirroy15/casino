import { useEffect, useRef, useCallback } from 'react'
import { useWallet }                      from '@solana/wallet-adapter-react'
import { getSolBalance }                  from '@/lib/solana'
import { useCasinoStore }                 from '@/lib/store'

const POLL_INTERVAL = 15_000  // refresh every 15s

export function useSolanaBalance() {
  const { publicKey, connected } = useWallet()
  const { setBalance, setConnected, setDisconnected, balance } = useCasinoStore()
  const intervalRef = useRef<NodeJS.Timeout>()

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return
    try {
      const sol = await getSolBalance(publicKey)
      setBalance(sol)
    } catch {
      // silently fail — network hiccup
    }
  }, [publicKey])

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance()
      intervalRef.current = setInterval(fetchBalance, POLL_INTERVAL)
    } else {
      setDisconnected()
    }
    return () => clearInterval(intervalRef.current)
  }, [connected, publicKey])

  return { balance, refresh: fetchBalance }
}
