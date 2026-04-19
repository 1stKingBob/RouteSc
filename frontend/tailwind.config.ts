import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        bg: {
          primary: '#07070f',
          secondary: '#0d0d1a',
          tertiary: '#111120',
          card: 'rgba(255,255,255,0.04)',
        },
        accent: {
          blue: '#3b82f6',
          teal: '#06b6d4',
          purple: '#8b5cf6',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          pink: '#ec4899',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.04)',
          md: 'rgba(255,255,255,0.07)',
          lg: 'rgba(255,255,255,0.10)',
        },
      },
      backgroundImage: {
        'gradient-blue-teal': 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
        'gradient-purple-blue': 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        'gradient-teal-green': 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
        'gradient-blue-purple': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 12s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'gradient-x': 'gradientX 4s ease infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%': { boxShadow: '0 0 20px rgba(59,130,246,0.2), 0 0 40px rgba(59,130,246,0.1)' },
          '100%': { boxShadow: '0 0 30px rgba(59,130,246,0.4), 0 0 60px rgba(59,130,246,0.2)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-lg': '0 8px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'blue-glow': '0 0 30px rgba(59,130,246,0.3)',
        'teal-glow': '0 0 30px rgba(6,182,212,0.3)',
        'purple-glow': '0 0 30px rgba(139,92,246,0.3)',
        'green-glow': '0 0 30px rgba(16,185,129,0.3)',
        'inner-glow': 'inset 0 0 30px rgba(59,130,246,0.1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}

export default config
