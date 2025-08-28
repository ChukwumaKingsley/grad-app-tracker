/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/react-select/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#455561',
          100: '#0e1114',
          200: '#1c2227',
          300: '#2a343b',
          400: '#38454f',
          500: '#455561',
          600: '#62798a',
          700: '#879baa',
          800: '#afbcc6',
          900: '#d7dee3',
        },
        delft_blue: {
          DEFAULT: '#3a435e',
          100: '#0c0d13',
          200: '#171b26',
          300: '#232839',
          400: '#2f364c',
          500: '#3a435e',
          600: '#55638b',
          700: '#7a87ae',
          800: '#a6afc9',
          900: '#d3d7e4',
        },
        paynes_gray: {
          DEFAULT: '#5c6672',
          100: '#121417',
          200: '#24282d',
          300: '#363d44',
          400: '#49515b',
          500: '#5c6672',
          600: '#778392',
          700: '#99a2ad',
          800: '#bbc1c9',
          900: '#dde0e4',
        },
        slate_gray: {
          DEFAULT: '#6c6f7f',
          100: '#161619',
          200: '#2b2c33',
          300: '#41424c',
          400: '#565965',
          500: '#6c6f7f',
          600: '#888b9a',
          700: '#a6a8b3',
          800: '#c4c5cc',
          900: '#e1e2e6',
        },
      },
    },
  },
  plugins: [],
}