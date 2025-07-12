/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "media", // Uses system preference
  theme: {
    extend: {
      colors: {
        // Custom colors using CSS variables
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-tertiary": "var(--bg-tertiary)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "border-custom": "var(--border)",
        "border-light": "var(--border-light)",

        // Chart colors (consistent across themes)
        "chart-positive": "var(--chart-positive)",
        "chart-negative": "var(--chart-negative)",
        "chart-line": "var(--chart-line)",
        "chart-grid": "var(--chart-grid)",
      },
      boxShadow: {
        custom: "0 4px 6px -1px var(--shadow)",
        "custom-lg": "0 10px 15px -3px var(--shadow-lg)",
      },
      transitionProperty: {
        theme: "background-color, color, border-color, box-shadow",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
