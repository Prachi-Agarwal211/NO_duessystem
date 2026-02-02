/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'jecrc-primary': '#C41E3A',
        'jecrc-primary-light': '#E02849',
        'jecrc-primary-dark': '#8B0000',
        'jecrc-primary-bright': '#FF3366',
        'jecrc-red': '#C41E3A',
        'jecrc-red-dark': '#8B0000',
        'jecrc-red-bright': '#FF3366',
      },
      fontFamily: {
        'manrope': ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        'cinzel': ['var(--font-cinzel)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
