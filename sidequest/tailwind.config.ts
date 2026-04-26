import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FEFCF3",
        "track-money": "#2563EB",
        "track-health": "#16A34A",
        "track-eco": "#059669",
        "track-fun": "#7C3AED",
        quest: {
          gold: "#D97706",
          green: "#16A34A",
          purple: "#7C3AED",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
