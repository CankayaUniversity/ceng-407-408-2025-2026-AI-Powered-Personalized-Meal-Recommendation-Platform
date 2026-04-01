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
        // CSS değişkenlerinden beslenen dinamik renkler
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)',
        },
        background: 'var(--color-bg)',
        foreground: 'var(--color-text)',
        card: {
          DEFAULT: 'var(--color-card-bg)',
          border: 'var(--color-card-border)',
        },
        // Sabit yardımcı renkler
        sage: 'var(--color-sage)',
        ochre: 'var(--color-ochre)',
        moss: "#4A5D4E",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["'Montserrat'", "sans-serif"],
      },
      borderRadius: {
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
