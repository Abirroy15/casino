'use client'
import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  r: number; alpha: number
  color: string; life: number; maxLife: number
}

const COLORS = [
  'rgba(168,85,247,',   // purple
  'rgba(59,130,246,',   // blue
  'rgba(16,185,129,',   // green
  'rgba(6,182,212,',    // cyan
]

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let animId: number
    const particles: Particle[] = []

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (): Particle => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      vx:      (Math.random() - 0.5) * 0.35,
      vy:      (Math.random() - 0.5) * 0.35,
      r:       Math.random() * 1.8 + 0.4,
      alpha:   0,
      color:   COLORS[Math.floor(Math.random() * COLORS.length)],
      life:    0,
      maxLife: Math.random() * 250 + 120,
    })

    for (let i = 0; i < 70; i++) {
      const p = spawn()
      p.life = Math.floor(Math.random() * p.maxLife)  // stagger
      particles.push(p)
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p, i) => {
        p.life++
        p.x += p.vx
        p.y += p.vy

        // Fade in/out
        const half = p.maxLife / 2
        p.alpha = p.life < half
          ? (p.life / half) * 0.55
          : ((p.maxLife - p.life) / half) * 0.55

        if (p.life >= p.maxLife) {
          particles[i] = spawn()
          return
        }

        // Wrap edges
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha.toFixed(2)})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.45 }}
    />
  )
}
