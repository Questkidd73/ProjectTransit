/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f7',
          100: '#d5e0ee',
          200: '#adc0dc',
          300: '#7a9ac5',
          400: '#4d74ad',
          500: '#2d5a95',
          600: '#1e3a5f',
          700: '#162c48',
          800: '#0e1e31',
          900: '#070f19',
        },
      },
    },
  },
  plugins: [],
}
