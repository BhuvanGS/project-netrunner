import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#050816',
        neon: '#22d3ee',
        magenta: '#ff4fd8',
        lime: '#9eff00',
        violet: '#8b5cf6',
        border: 'rgba(255, 255, 255, 0.1)',
        ring: 'rgba(220, 50, 50, 0.3)',
        background: '#04050a',
        foreground: '#f8fafc',
      },
      boxShadow: {
        glow: '0 0 40px rgba(220, 50, 50, 0.18)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(220,50,50,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(220,50,50,0.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

export default config;
