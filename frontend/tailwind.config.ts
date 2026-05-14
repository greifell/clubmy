import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clubmy: {
          amber: '#f4b740',
          gold: '#d89422',
          blue: '#101820',
          dark: '#0b1117',
          ink: '#18222d',
          light: '#fffaf0'
        }
      },
      boxShadow: {
        soft: '0 10px 40px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;
