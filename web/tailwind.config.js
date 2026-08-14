/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F12',
        primary: '#6F42C1',
        glow: '#A855F7',
        ink: '#F5F2FF',
        muted: '#9b96b0',
        wa: '#25D366',
      },
      fontFamily: {
        sans: ['Inter', 'Montserrat', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(168,85,247,0.45), 0 8px 30px rgba(111,66,193,0.35)',
        'glow-lg': '0 0 50px rgba(168,85,247,0.6), 0 12px 40px rgba(111,66,193,0.45)',
        glass: '0 0 40px rgba(111,66,193,0.10), inset 0 0 24px rgba(168,85,247,0.03)',
      },
      animation: {
        'fade-up': 'fadeUp .6s ease both',
        drift: 'drift 18s ease-in-out infinite alternate',
        pulse: 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
        drift: {
          from: { transform: 'translate(0,0) scale(1)' },
          to: { transform: 'translate(40px,30px) scale(1.15)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '.4' },
        },
      },
    },
  },
  plugins: [],
};
