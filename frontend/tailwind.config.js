/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#0f172a',
        border: '#1e293b',
        cyanAccent: '#06b6d4',
        emeraldAccent: '#10b981',
        amberAccent: '#f59e0b',
        roseAccent: '#f43f5e',
        violetAccent: '#8b5cf6'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
