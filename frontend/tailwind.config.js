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
        // Dinamik Renkler (CSS Variables)
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)', // Bu zaten rgba(226, 114, 91, 0.1) değerinde
        },
        background: 'var(--color-bg)',
        foreground: 'var(--color-text)',
        card: {
          DEFAULT: 'var(--color-card-bg)',
          border: 'var(--color-card-border)',
        },
        sage: {
          DEFAULT: '#8DA399',
          10: 'rgba(141, 163, 153, 0.1)',
          20: 'rgba(141, 163, 153, 0.2)',
        },
        ochre: '#DAA520',
        moss: "#4A5D4E",
        terracotta: "#E2725B",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["'Montserrat'", "sans-serif"],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      transitionTimingFunction: {
        'brand': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        'brand-soft': 'var(--brand-shadow-soft)',
        'brand-elevated': 'var(--brand-shadow-elevated)',
      }
    },
  },
  plugins: [],
}
