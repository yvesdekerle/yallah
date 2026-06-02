/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        yallah: {
          // Backgrounds (phone body)
          bgSun: '#FFCB45',
          bgCoral: '#FF8A6B',
          bgSoft: '#F4EFE5',
          bgLagoon: '#5BC0B8',
          bgLilac: '#C5B3DB',
          bgPistachio: '#CDDE7E',
          // Chrome / text
          paper: '#FFFCF5',
          ink: '#181B1F',
          ink2: '#3A3D44',
          muted: '#7A7B85',
          mutedSoft: '#9A93A6',
          // Brand
          primary: '#FFCB45',
          primaryDeep: '#E5A30F',
          coral: '#FF6B47',
          coralDeep: '#E54D2A',
          // Verdict
          green: '#22C268',
          red: '#FF4757',
          blue: '#4D8BF5',
          gold: '#EFBF04',
          goldLight: '#FFD84D',
          // Verdict v2 (after design iteration)
          oui: '#FF4D8D',
          non: '#6B6F78',
          neutre: '#4D8BF5',
          top: '#EFBF04',
        },
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        yallahDeckExit: {
          from: {
            transform:
              'translate(var(--fx, 0), var(--fy, 0)) rotate(var(--fr, 0deg))',
          },
          to: {
            transform:
              'translate(var(--tx, 0), var(--ty, 0)) rotate(var(--tr, 0deg))',
          },
        },
        yallahSparkleFly: {
          '0%': {
            transform: 'translate(-50%, -50%) scale(0) rotate(0deg)',
            opacity: '0',
          },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': {
            transform:
              'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(var(--rot))',
            opacity: '0',
          },
        },
        yallahHaloPulse: {
          '0%': { transform: 'translate(-50%, -50%) scale(0.4)', opacity: '0' },
          '30%': { opacity: '0.85' },
          '100%': { transform: 'translate(-50%, -50%) scale(2.4)', opacity: '0' },
        },
        yallahBadgePop: {
          '0%': {
            transform: 'translate(-50%, -50%) scale(0) rotate(-30deg)',
            opacity: '0',
          },
          '35%': {
            transform: 'translate(-50%, -50%) scale(1.25) rotate(-8deg)',
            opacity: '1',
          },
          '55%': {
            transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
            opacity: '1',
          },
          '80%': {
            transform: 'translate(-50%, -50%) scale(1.6) rotate(8deg)',
            opacity: '0.6',
          },
          '100%': {
            transform: 'translate(-50%, -50%) scale(2.2) rotate(12deg)',
            opacity: '0',
          },
        },
        yallahFlash: {
          '0%': { opacity: '0' },
          '15%': { opacity: '0.55' },
          '100%': { opacity: '0' },
        },
        yallahToast: {
          '0%': { transform: 'translate(-50%, 8px)', opacity: '0' },
          '100%': { transform: 'translate(-50%, 0)', opacity: '1' },
        },
      },
      animation: {
        yallahHaloPulse: 'yallahHaloPulse 600ms cubic-bezier(.2,.7,.3,1) forwards',
        yallahBadgePop: 'yallahBadgePop 850ms cubic-bezier(.2,.9,.3,1) forwards',
        yallahFlash: 'yallahFlash 700ms ease-out forwards',
        yallahToast: 'yallahToast 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
