/**
 * services/live-feed.ts
 *
 * WebSocket-ready live feed service.
 * In production: connects to a Helius webhook / custom WS server.
 * In development: emits mock play events at realistic intervals.
 */

import { useCasinoStore, type PlayResult, type GameType } from '@/lib/store'

// ── Types ─────────────────────────────────────────────────────
export interface LiveEvent {
  type:      'play' | 'jackpot' | 'system'
  play?:     PlayResult
  message?:  string
  timestamp: number
}

type EventCallback = (event: LiveEvent) => void

// ── Config ────────────────────────────────────────────────────
const WS_URL      = process.env.NEXT_PUBLIC_WS_URL || 'wss://live.magicplay.gg/feed'
const MOCK_MODE   = process.env.NODE_ENV !== 'production'
const MOCK_INTERVAL_MS = 2000 + Math.random() * 1500

const MOCK_WALLETS: string[] = [
  '7xKf...3mPq', '9aRt...7nBc', '4mWz...2kLx', '3pYv...8dQr',
  '6hJg...5cNs', '2bXe...1fMo', '8cNs...4jKp', '5dQr...6mRs',
]

const MOCK_GAMES: GameType[] = [
  'dice','coinflip','mines','slots','hilo','roulette','plinko','towerx'
]

// ── Live Feed Service ─────────────────────────────────────────
class LiveFeedService {
  private ws:        WebSocket | null     = null
  private callbacks: Set<EventCallback>  = new Set()
  private mockTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectDelay = 2000

  // ── Connect ───────────────────────────────────────────────
  connect() {
    if (MOCK_MODE) {
      this.startMock()
      return
    }

    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        console.log('[LiveFeed] Connected to WS server')
        this.reconnectDelay = 2000
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LiveEvent
          this.emit(data)

          // Mirror to Zustand store
          if (data.type === 'play' && data.play) {
            useCasinoStore.getState().addPlay(data.play)
          }
        } catch {
          console.warn('[LiveFeed] Failed to parse WS message')
        }
      }

      this.ws.onclose = () => {
        console.log('[LiveFeed] WS closed — reconnecting in', this.reconnectDelay, 'ms')
        this.scheduleReconnect()
      }

      this.ws.onerror = (err) => {
        console.error('[LiveFeed] WS error:', err)
        this.ws?.close()
      }
    } catch (err) {
      console.error('[LiveFeed] Failed to open WS:', err)
      this.scheduleReconnect()
    }
  }

  // ── Disconnect ────────────────────────────────────────────
  disconnect() {
    this.ws?.close()
    this.ws = null
    if (this.mockTimer) clearInterval(this.mockTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
  }

  // ── Subscribe ─────────────────────────────────────────────
  subscribe(cb: EventCallback): () => void {
    this.callbacks.add(cb)
    return () => this.callbacks.delete(cb)
  }

  // ── Internal ──────────────────────────────────────────────
  private emit(event: LiveEvent) {
    this.callbacks.forEach(cb => {
      try { cb(event) } catch {}
    })
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000)
      this.connect()
    }, this.reconnectDelay)
  }

  private startMock() {
    const fire = () => {
      const win    = Math.random() > 0.44
      const bet    = +(Math.random() * 1.5 + 0.05).toFixed(3)
      const mult   = win ? 1 + Math.random() * 3 : 0
      const payout = +(bet * mult).toFixed(4)
      const game   = MOCK_GAMES[Math.floor(Math.random() * MOCK_GAMES.length)]

      const play: PlayResult = {
        id:        `mock_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        wallet:    MOCK_WALLETS[Math.floor(Math.random() * MOCK_WALLETS.length)],
        game,
        betAmount: bet,
        payout,
        win,
        timestamp: Date.now(),
      }

      const event: LiveEvent = { type: 'play', play, timestamp: Date.now() }
      this.emit(event)
      useCasinoStore.getState().addPlay(play)

      // Occasionally fire a jackpot notice
      if (Math.random() < 0.05) {
        setTimeout(() => {
          this.emit({
            type:      'jackpot',
            message:   `🏆 ${play.wallet} hit ${(payout * 8).toFixed(1)} SOL jackpot on ${game}!`,
            timestamp: Date.now(),
          })
        }, 500)
      }

      // Variable interval for realism
      this.mockTimer = setTimeout(fire, 1500 + Math.random() * 2500)
    }

    this.mockTimer = setTimeout(fire, 800)
  }
}

// ── Singleton export ──────────────────────────────────────────
export const liveFeed = new LiveFeedService()

// ── React hook ───────────────────────────────────────────────
import { useEffect, useRef } from 'react'

export function useLiveFeed(onEvent?: EventCallback) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent

  useEffect(() => {
    liveFeed.connect()
    const unsub = liveFeed.subscribe((e) => cbRef.current?.(e))
    return () => {
      unsub()
      // Don't disconnect — other components may be subscribed
    }
  }, [])
}
