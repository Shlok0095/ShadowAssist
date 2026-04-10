/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Docs / FAQ still rely on legacy `index.css`; avoid Tailwind reset breaking them.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
        'gradient-accent': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 55%, #14b8a6 100%)',
        'gradient-accent-soft':
          'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(139,92,246,0.3) 50%, rgba(20,184,166,0.25) 100%)',
        'gradient-text': 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 45%, #2dd4bf 100%)',
      },
      boxShadow: {
        glass: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px -20px rgba(0,0,0,0.65)',
        'glass-sm': '0 0 0 1px rgba(255,255,255,0.05), 0 12px 40px -12px rgba(0,0,0,0.5)',
        glow: '0 0 80px -20px rgba(139, 92, 246, 0.45)',
      },
      transitionDuration: {
        180: '180ms',
        220: '220ms',
      },
    },
  },
  plugins: [],
}
