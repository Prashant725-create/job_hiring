/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html",
    "./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  "#eefdfa",
          100: "#dff7f4",
          200: "#bff0e8",
          300: "#86e3d5",
          400: "#40cfc0",
          500: "#00b3a6", // primary teal
          600: "#008f86",
          700: "#00665a",
          800: "#004c43",
        },
      },
      backgroundImage: {
        'teal-gradient': 'linear-gradient(135deg, #00b3a6 0%, #40cfc0 50%, #86e3d5 100%)',
      },
      boxShadow: {
        'soft-teal': '0 6px 18px rgba(0, 179, 166, 0.12)',
      },
    },
  },
  plugins: [],
}

