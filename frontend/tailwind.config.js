/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f4',
          100: '#fde4eb',
          200: '#fbcad7',
          300: '#f7aabf',
          400: '#f18da7',
          500: '#e56980',
          600: '#bd2635',
          700: '#a61d2b',
          800: '#8f1a25',
          900: '#78141f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
