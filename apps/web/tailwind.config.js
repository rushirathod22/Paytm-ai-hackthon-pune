/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        paytm: {
          blue: "#00BAF2",      // Paytm primary cyan
          navy: "#002970",      // Paytm dark blue / text primary
          dark: "#0F172A",
          light: "#F4F7FB",     // Authentic Paytm web background
          card: "#FFFFFF",
          cyan: "#E8F8FE",      // Paytm secondary highlight
          peach: "#FFF8ED",     // Paytm promo light peach
          accent: "#0052CC",
          border: "#E5E9F2",
          gray: "#64748B",
          emerald: "#00A651",   // Paytm success green
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        waveform: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '32px' },
        }
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        ripple: 'ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite',
        waveform: 'waveform 1.2s ease-in-out infinite',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 41, 112, 0.04)',
        'paytm': '0 4px 20px -2px rgba(0, 41, 112, 0.06), 0 2px 6px -1px rgba(0, 41, 112, 0.04)',
        'paytm-hover': '0 12px 28px -4px rgba(0, 41, 112, 0.12), 0 4px 12px -2px rgba(0, 41, 112, 0.06)',
      }
    },
  },
  plugins: [],
}
