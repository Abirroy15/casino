'use client'
import { ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalBaseProps {
  onClose:  () => void
  title:    string
  subtitle: string
  icon:     string
  children: ReactNode
}

export default function ModalBase({ onClose, title, subtitle, icon, children }: ModalBaseProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/75 backdrop-blur-md z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Modal */}
        <motion.div
          className="relative w-full max-w-[440px] rounded-2xl p-6 overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #0d0d1a 0%, #10101f 100%)',
            border: '1px solid rgba(168,85,247,0.2)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(168,85,247,0.1)',
          }}
          initial={{ scale: 0.88, y: 30, opacity: 0 }}
          animate={{ scale: 1,    y: 0,  opacity: 1 }}
          exit={{    scale: 0.88, y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        >
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.18), transparent 70%)' }} />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                       rounded-lg border border-white/[0.08] bg-white/[0.04]
                       text-text-secondary hover:text-text-primary hover:bg-white/[0.07]
                       transition-all text-base z-10"
          >
            ✕
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5 relative z-10">
            <span className="text-3xl">{icon}</span>
            <div>
              <h2 className="font-brand text-2xl font-bold text-text-primary">{title}</h2>
              <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
