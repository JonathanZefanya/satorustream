/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 30px -18px rgba(15, 23, 42, 0.35)',
      },
      // Warna netral yang paling sering dipakai dipetakan ke token tema di
      // index.css, jadi light mode tidak lagi berupa putih murni.
      backgroundColor: {
        white: token('surface'),
        slate: {
          50: token('surface-raised'),
          100: token('surface-muted'),
          200: token('surface-sunken'),
        },
      },
      borderColor: {
        slate: {
          100: token('line-soft'),
          200: token('line'),
        },
      },
      textColor: {
        slate: {
          800: token('ink-soft'),
          900: token('ink'),
        },
      },
    },
  },
  plugins: [],
}
