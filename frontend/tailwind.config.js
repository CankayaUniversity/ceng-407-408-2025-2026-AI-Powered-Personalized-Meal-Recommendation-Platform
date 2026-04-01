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
        // --- DİNAMİK RENKLER (index.css Değişkenleri) ---
        background: 'var(--color-bg)',
        foreground: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)', // Sidebar ve alt metinler için kritik
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)',
        },
        card: {
          DEFAULT: 'var(--color-card-bg)',
          border: 'var(--color-card-border)',
        },

        // --- SABİT MARKA RENKLERİ ---
        terracotta: "#E2725B",
        espresso: {
          DEFAULT: "#282421",
          midnight: "#1A1817", // Dark mode Hero ve Sidebar derinliği için
          deep: "#1A1817",
        },
        alabaster: "#F9F6F0",
        sage: {
          DEFAULT: '#8DA399',
          10: 'rgba(141, 163, 153, 0.1)',
          20: 'rgba(141, 163, 153, 0.2)',
        },
        moss: {
          forest: "#3A4D39",
          sage: "#8B9D83",
        },
        ochre: '#DAA520',
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["'Montserrat'", "sans-serif"],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem', // .meal-card'ın kavisli yapısı için
      },
      transitionTimingFunction: {
        'brand': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        // CSS variables üzerinden dinamik gölgeler
        'brand-soft': 'var(--brand-shadow-soft)',
        'brand-hero': 'var(--brand-shadow-hero)',
        'brand-elevated': '0 20px 50px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
