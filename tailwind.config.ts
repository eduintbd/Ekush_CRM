import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        rajdhani: ["Rajdhani", "sans-serif"],
        bengali: ["var(--font-bengali)", "Noto Sans Bengali", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#1E4A8C",
          dark: "#16396B",
        },
        navy: {
          DEFAULT: "#0F1E3D",
          dark: "#0A1530",
        },
        gold: {
          DEFAULT: "#F5B800",
          dark: "#D99E00",
        },
        ekush: {
          orange: "#F27023",
          "orange-dark": "#e85d04",
          "orange-light": "#ffcfb2",
        },
        page: {
          bg: "#EFF1F7",
        },
        "text-dark": "#222222",
        "text-body": "#828BB2",
        "text-muted": "#B2B5C0",
        "text-label": "#707070",
        "input-bg": "#fef1f2",
        "input-border": "#BBC1C9",
        "icon-muted": "#f8dbdd",
      },
      boxShadow: {
        card: "0 7px 15px rgba(80, 143, 244, 0.15)",
        sidebar: "0 0 40px #EFF1F7",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
