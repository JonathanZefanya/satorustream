/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 14px 42px -24px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
}