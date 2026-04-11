/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syne', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        night: {
          950: '#030712',
          900: '#0a0f1a',
          850: '#0f172a',
          800: '#111827',
        },
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
        'gradient-accent-soft':
          'linear-gradient(135deg, rgba(59,130,246,0.38) 0%, rgba(139,92,246,0.32) 45%, rgba(6,182,212,0.22) 100%)',
        'gradient-text': 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 42%, #22d3ee 100%)',
      },
      boxShadow: {
        glass: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px -20px rgba(0,0,0,0.65)',
        'glass-sm': '0 0 0 1px rgba(255,255,255,0.05), 0 12px 40px -12px rgba(0,0,0,0.5)',
        glow: '0 0 80px -20px rgba(139, 92, 246, 0.45)',
        'btn-primary': '0 0 40px rgba(59, 130, 246, 0.4)',
        'btn-primary-hover': '0 0 56px rgba(59, 130, 246, 0.58)',
      },
      keyframes: {
        'signal-ring': {
          '0%': { transform: 'scale(0.92)', opacity: '0.45' },
          '100%': { transform: 'scale(1.65)', opacity: '0' },
        },
        'cursor-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)', opacity: '0.06' },
          '50%': { transform: 'rotate(8deg) scale(1.08)', opacity: '0.1' },
        },
        'glow-flicker': {
          '0%, 100%': { opacity: '0.22' },
          '50%': { opacity: '0.32' },
        },
        'float-blob': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(12px, -18px)' },
          '66%': { transform: 'translate(-10px, 10px)' },
        },
        'cta-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'hero-float-copy': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-6px) scale(1.006)' },
        },
        'hero-float-mock': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'hero-radial-breathe': {
          '0%, 100%': { opacity: '0.82', transform: 'scale(1)' },
          '50%': { opacity: '0.98', transform: 'scale(1.05)' },
        },
        'hero-hue-veil': {
          '0%, 100%': { opacity: '0.04' },
          '50%': { opacity: '0.09' },
        },
      },
      animation: {
        'signal-ring': 'signal-ring 2.4s ease-out infinite',
        'cursor-blink': 'cursor-blink 1s steps(1, end) infinite',
        'pulse-soft': 'pulse-soft 2.2s ease-in-out infinite',
        'aurora-drift': 'aurora-drift 56s ease-in-out infinite',
        'glow-flicker': 'glow-flicker 5s ease-in-out infinite',
        'float-blob': 'float-blob 22s ease-in-out infinite',
        'cta-pulse': 'cta-pulse 2.6s ease-in-out infinite',
        'hero-float-copy': 'hero-float-copy 13s ease-in-out infinite',
        'hero-float-mock': 'hero-float-mock 10s ease-in-out -1.4s infinite',
        'hero-radial-breathe': 'hero-radial-breathe 18s ease-in-out infinite',
        'hero-hue-veil': 'hero-hue-veil 24s ease-in-out infinite',
      },
      transitionDuration: {
        180: '180ms',
        220: '220ms',
        400: '400ms',
      },
    },
  },
  plugins: [],
}
