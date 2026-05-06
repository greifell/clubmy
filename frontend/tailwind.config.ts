import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clubmy: {
          orange: '#ff6b00',
          blue: '#0f4c81',
          dark: '#0f172a',
          light: '#f8fafc'
        }
      },
      boxShadow: {
        soft: '0 10px 40px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;