import type { Config } from "tailwindcss";

// LYFE design tokens. Editorial, calm — Stripe meets Moroccan fine-dining menu.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand (from logo): black wordmark, ochre + purple in the "y",
        // royal-blue dot. Ink stays as the near-black text colour.
        ink: "#0F0F0F",
        gold: "#D8A83B",
        royal: "#253E86",
        purple: "#865BA6",
        bg: "#FAF7F0",
        surface: "#FFFFFF",
        muted: "#6A6A6A",
        line: "#E0DAC7",
        success: "#2F6B3D",
        warning: "#8C4A1B",
        error: "#A12C2C",
        info: "#253E86", // alias of royal so existing tone="info" maps to brand blue
      },
      fontFamily: {
        serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightish: "-0.01em",
        badge: "0.15em",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "6px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04)",
      },
      spacing: {
        "4.5": "18px",
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
