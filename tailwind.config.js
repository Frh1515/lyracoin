/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        darkGreen: '#0b0f0d',
        neonGreen: '#00ff88',
        lightGreen: '#00e078'
      },
      boxShadow: {
        glow: '0 0 15px #00ff88',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
};