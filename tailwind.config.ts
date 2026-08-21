import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        platform: {
          bg: "#0b0f17",
          card: "#121b28",
          tertiary: "#1e2b3c",
          border: "#1d2c3f",
          borderActive: "#2b3d54",
          green: "#00e575",
          copper: "#ff9e22",
          blue: "#00bfff",
          purple: "#8b5cf6",
          textPrimary: "#f8fafc",
          textSecondary: "#94a9c1",
          textMuted: "#506882",
        },
      },
      fontFamily: {
        display: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
