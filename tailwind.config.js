/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A8A', // Navy Blue
        secondary: '#3B82F6', // Sky Blue
        neutralLight: '#F3F4F6', // Light Gray
        neutralDark: '#374151', // Dark Gray
        accent: '#10B981', // Emerald Green
      },
    },
  },  
  plugins: [],
}