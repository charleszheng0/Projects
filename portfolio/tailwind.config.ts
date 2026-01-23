import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#020409",
        bgSoft: "#0b1220",
        accent: "#00FFC6",
        accentBlue: "#00D4FF",
        ink: "#E6FAFF",
        muted: "#9BA7B5",
      },
      boxShadow: {
        hud: "inset 0 0 12px rgba(0, 255, 200, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
