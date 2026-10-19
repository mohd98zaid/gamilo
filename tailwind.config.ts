import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--mk-bg)",
        "background-alt": "var(--mk-bg-alt)",
        surface: "var(--mk-surface)",
        "surface-2": "var(--mk-surface-2)",
        foreground: "var(--mk-text)",
        "foreground-muted": "var(--mk-text-muted)",
        "foreground-subtle": "var(--mk-text-subtle)",
        border: "var(--mk-border)",
        brand: {
          DEFAULT: "var(--mk-brand)",
          text: "var(--mk-brand-text)",
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.75rem)",
        md: "calc(var(--radius, 0.75rem) - 2px)",
        sm: "calc(var(--radius, 0.75rem) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
