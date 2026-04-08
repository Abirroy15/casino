import { useCallback, useRef } from 'react'

type SoundName = 'click' | 'win' | 'loss' | 'coin' | 'dice' | 'spin' | 'tick'

// Synthesize casino sounds via Web Audio API (no asset files needed)
function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  return new (window.AudioContext || (window as any).webkitAudioContext)()
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  startDelay = 0
) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type      = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay)
  gain.gain.setValueAtTime(volume, ctx.currentTime + startDelay)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration)
  osc.start(ctx.currentTime + startDelay)
  osc.stop(ctx.currentTime + startDelay + duration + 0.05)
}

const SOUND_DEFS: Record<SoundName, (ctx: AudioContext) => void> = {
  click: (ctx) => {
    playTone(ctx, 800, 0.05, 'square', 0.08)
  },
  win: (ctx) => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      playTone(ctx, freq, 0.18, 'sine', 0.18, i * 0.1)
    })
  },
  loss: (ctx) => {
    [300, 250, 200].forEach((freq, i) => {
      playTone(ctx, freq, 0.15, 'sawtooth', 0.12, i * 0.08)
    })
  },
  coin: (ctx) => {
    playTone(ctx, 1200, 0.1, 'sine', 0.12)
    playTone(ctx, 1600, 0.08, 'sine', 0.08, 0.08)
  },
  dice: (ctx) => {
    for (let i = 0; i < 4; i++) {
      const freq = 200 + Math.random() * 100
      playTone(ctx, freq, 0.04, 'square', 0.1, i * 0.06)
    }
  },
  spin: (ctx) => {
    // Rising tone for slot spin
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(80, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.55)
  },
  tick: (ctx) => {
    playTone(ctx, 600, 0.03, 'square', 0.06)
  },
}

export function useSound() {
  const ctxRef   = useRef<AudioContext | null>(null)
  const mutedRef = useRef(false)

  const getCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) ctxRef.current = createAudioContext()
    if (ctxRef.current?.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const play = useCallback((name: SoundName) => {
    if (mutedRef.current) return
    const ctx = getCtx()
    if (!ctx) return
    try {
      SOUND_DEFS[name](ctx)
    } catch {
      // Audio errors are non-fatal
    }
  }, [])

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current
    return mutedRef.current
  }, [])

  return { play, toggleMute }
}
