import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0E1116",
        bgSoft: "#1a1f2e",
        accent: "#2AFFA9",
        accentBlue: "#7C4DFF",
        ink: "#E6FAFF",
        muted: "#9BA7B5",
      },
      boxShadow: {
        hud: "inset 0 0 12px rgba(42, 255, 169, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
