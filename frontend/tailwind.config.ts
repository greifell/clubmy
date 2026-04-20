import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clubmy: {
          orange: '#ff6b00',
          blue: '#0c4a9e'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
