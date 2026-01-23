export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/providers/**/*.{js,ts,jsx,tsx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      animation: {
        shimmer: "shimmer 1s infinite linear",
      },
      keyframes: {
        shimmer: {
          to: { "background-position-x": "0%" },
        },
      },
      fontFamily: {
        geist: [
          "var(--font-geist-sans)",
          "var(--font-geist-mono)",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
