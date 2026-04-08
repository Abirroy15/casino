import { useState, useCallback } from 'react'
import { useWallet }             from '@solana/wallet-adapter-react'
import { PublicKey }             from '@solana/web3.js'
import { BN }                   from '@coral-xyz/anchor'
import toast                    from 'react-hot-toast'

import { useCasinoStore }               from '@/lib/store'
import type { GameType, GameSession }   from '@/lib/store'
import { deriveEscrowPDA, solToLamports } from '@/lib/solana'
import {
  delegateToER,
  executeERMove,
  commitToSolana,
  type ERSession,
} from '@/magicblock/ephemeral-rollup'

export interface UseGameSessionReturn {
  playing:      boolean
  sessionId:    string | null
  startSession: (game: GameType, betSOL: number) => Promise<ERSession | null>
  playMove:     (moveData: Record<string,unknown>) => Promise<any>
  endSession:   (erSession: ERSession, outcome: any) => Promise<string | null>
}

export function useGameSession(game: GameType): UseGameSessionReturn {
  const wallet = useWallet()
  const { setLoading, startSession, settleSession, balance, setBalance } = useCasinoStore()

  const [playing, setPlaying]     = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [erSession, setERSession] = useState<ERSession | null>(null)

  /**
   * Step 1: Lock bet in escrow + delegate to ER.
   */
  const handleStartSession = useCallback(async (
    gameType: GameType,
    betSOL: number
  ): Promise<ERSession | null> => {
    if (!wallet.publicKey) {
      toast.error('Connect your wallet first')
      return null
    }
    if (betSOL > balance) {
      toast.error('Insufficient SOL balance')
      return null
    }

    setLoading(true)
    setPlaying(true)

    try {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      setSessionId(id)

      const lamports = solToLamports(betSOL)
      const [escrowPDA] = deriveEscrowPDA(wallet.publicKey, new BN(id.split('_')[0]))

      // 1. Delegate escrow to MagicBlock ER
      const delegateTxId = await delegateToER(wallet, escrowPDA, id)

      const session: ERSession = {
        sessionId:   id,
        erSlot:      0,
        gameType,
        player:      wallet.publicKey.toBase58(),
        betLamports: lamports.toNumber(),
        status:      'delegated',
      }

      setERSession(session)

      // Track in store
      const storeSession: GameSession = {
        sessionId: id,
        game:      gameType,
        betAmount: betSOL,
        status:    'active',
        erTxId:    delegateTxId,
      }
      startSession(storeSession)

      return session
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start session')
      setPlaying(false)
      setSessionId(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [wallet, balance])

  /**
   * Step 2: Execute a move inside the ER (instant, <50ms).
   */
  const playMove = useCallback(async (moveData: Record<string, unknown>) => {
    if (!sessionId) throw new Error('No active session')

    const outcome = await executeERMove(game, sessionId, moveData)
    return outcome
  }, [game, sessionId])

  /**
   * Step 3: Commit result to Solana mainnet and settle payout.
   */
  const handleEndSession = useCallback(async (
    erSess: ERSession,
    outcome: any
  ): Promise<string | null> => {
    if (!wallet.publicKey) return null

    try {
      const settleTx = await commitToSolana(wallet, erSess, outcome)

      settleSession({
        id:        erSess.sessionId,
        wallet:    wallet.publicKey.toBase58(),
        game:      erSess.gameType,
        betAmount: erSess.betLamports / 1e9,
        payout:    outcome.payoutSOL,
        win:       outcome.win,
        timestamp: Date.now(),
        txSignature: settleTx,
      })

      if (outcome.win) {
        setBalance(balance + outcome.payoutSOL - erSess.betLamports / 1e9)
      } else {
        setBalance(balance - erSess.betLamports / 1e9)
      }

      return settleTx
    } catch (err: any) {
      toast.error('Settlement failed: ' + err?.message)
      return null
    } finally {
      setPlaying(false)
      setSessionId(null)
      setERSession(null)
    }
  }, [wallet, balance])

  return {
    playing,
    sessionId,
    startSession: handleStartSession,
    playMove,
    endSession:   handleEndSession,
  }
}
