import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clubmy: {
          amber: '#f4b740',
          gold: '#d89422',
          blue: '#064e3b',
          dark: '#022c22',
          ink: '#0f172a',
          light: '#f7fbf8'
        }
      },
      boxShadow: {
        soft: '0 10px 40px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;
