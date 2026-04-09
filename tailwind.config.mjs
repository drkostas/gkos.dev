import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      boxShadow: {
        "code-shadow":
          "0 0 0 1px rgba(14, 22, 34, 0.1), 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
      },
      fontFamily: {
        sans: "var(--font-geist-sans), system-ui, sans-serif",
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        "bg-primary": "rgb(var(--color-bg-primary) / <alpha-value>)",
        "border-primary": "rgb(var(--color-border-primary) / <alpha-value>)",
        "dark-primary": "rgb(var(--color-dark-primary) / <alpha-value>)",
        "purple-primary": "#6C47FF",
        "purple-secondary": "rgb(var(--color-purple-secondary) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        "text-tertiary": "rgb(var(--color-text-tertiary) / <alpha-value>)",
      },
      typography: {
        quoteless: {
          css: {
            "blockquote p:first-of-type::before": { content: "none" },
            "blockquote p:first-of-type::after": { content: "none" },
          },
        },
        h1: {
          colors: "text-secondary",
        },
      },
      animation: {
        "spin-slow": "spin 14s linear infinite",
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [typography],
};
