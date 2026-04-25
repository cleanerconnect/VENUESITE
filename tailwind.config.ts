import type { Config } from "tailwindcss";

// LYFE design tokens — premium SaaS aesthetic, 2026-ready.
// Editorial calm, Mercury/Linear/Vercel-tier polish, brand-led accents.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        ink: "#0F0F0F",
        gold: "#D8A83B",
        royal: "#253E86",
        purple: "#865BA6",

        // Surfaces — two-tone system. bg = warm canvas; surface = elevated card.
        bg: "#F6F2E8", // slightly more saturated than before, reads as a real surface
        "bg-soft": "#FAF7F0", // for subtle inner panels on top of surface
        surface: "#FFFFFF",

        // Type
        muted: "#6F6A60",
        "muted-2": "#9A9588",
        line: "#E8E1CE", // a touch warmer to harmonise with bg
        "line-strong": "#CFC6AC",

        // Semantic
        success: "#2F6B3D",
        warning: "#8C4A1B",
        error: "#A12C2C",
        info: "#253E86",
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightish: "-0.01em",
        tight2: "-0.02em",
        tight3: "-0.03em",
        badge: "0.14em",
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        // Layered, low-opacity. Stack a hairline shadow + soft ambient for depth.
        xs: "0 1px 2px rgba(15,15,15,0.04)",
        card: "0 1px 0 rgba(15,15,15,0.02), 0 4px 18px -8px rgba(15,15,15,0.06)",
        elevated:
          "0 1px 0 rgba(15,15,15,0.03), 0 12px 36px -16px rgba(15,15,15,0.12)",
        focus:
          "0 0 0 4px rgba(37,62,134,0.10)",
        "inner-line": "inset 0 0 0 1px rgba(232,225,206,1)",
      },
      backgroundImage: {
        // Hero surface — barely-there gradient that adds warmth.
        "hero-warm":
          "radial-gradient(120% 100% at 0% 0%, rgba(216,168,59,0.10) 0%, rgba(216,168,59,0) 55%), radial-gradient(80% 80% at 100% 100%, rgba(134,91,166,0.06) 0%, rgba(134,91,166,0) 60%)",
        "hero-royal":
          "radial-gradient(110% 100% at 100% 0%, rgba(37,62,134,0.10) 0%, rgba(37,62,134,0) 55%), radial-gradient(70% 70% at 0% 100%, rgba(216,168,59,0.05) 0%, rgba(216,168,59,0) 60%)",
        // Sidebar inner panel
        "sidebar-fade":
          "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,1) 100%)",
        // Primary button gloss — extremely subtle
        "btn-ink":
          "linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)",
      },
      spacing: {
        "4.5": "18px",
        "18": "72px",
      },
      maxWidth: {
        content: "1240px",
        narrow: "880px",
      },
      transitionTimingFunction: {
        // Gentle easing, calm rather than springy.
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-soft": "pulse2 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
