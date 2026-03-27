/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        alabaster: "#F9F6F0",
        terracotta: {
          DEFAULT: "#E2725B",
          spiced: "#E2725B",
        },
        moss: {
          DEFAULT: "#4A5D4E",
          forest: "#4A5D4E",
          sage: "#8DA399",
        },
        ochre: {
          soft: "#DAA520",
        },
        espresso: {
          DEFAULT: "#282421",
          midnight: "#282421",
        },
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["'Montserrat'", "sans-serif"],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      }
    },
  },
  plugins: [],
}
