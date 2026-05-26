import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050505",
          900: "#0B0B0B",
          800: "#111111"
        },
        volt: "#D8FF3E",
        flare: "#FF9A1F"
      },
      fontFamily: {
        sans: ["var(--font-inter-tight)", "Inter Tight", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-inter-tight)", "Inter Tight", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glass: "0 28px 80px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        glow: "0 0 34px rgba(216, 255, 62, 0.24)"
      },
      backgroundImage: {
        noise: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E\")"
      }
    }
  },
  plugins: []
};

export default config;
