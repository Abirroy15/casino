/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './games/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        brand: ['Rajdhani', 'sans-serif'],
        ui:    ['Inter', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      colors: {
        neon: {
          purple: '#a855f7',
          blue:   '#3b82f6',
          green:  '#10b981',
          pink:   '#ec4899',
          cyan:   '#06b6d4',
          orange: '#f97316',
        },
        casino: {
          dark:  '#050508',
          card:  '#0d0d1a',
          glass: 'rgba(255,255,255,0.04)',
        },
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(168,85,247,0.4)',
        'glow-blue':   '0 0 20px rgba(59,130,246,0.4)',
        'glow-green':  '0 0 20px rgba(16,185,129,0.4)',
        'glow-red':    '0 0 20px rgba(239,68,68,0.4)',
        'card-hover':  '0 8px 32px rgba(168,85,247,0.3)',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(168,85,247,0.5)' },
          '50%':       { boxShadow: '0 0 0 12px rgba(168,85,247,0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s infinite',
        'slide-up':   'slide-up 0.4s ease',
        'float':      'float 3s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
