// File: tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', 
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Card background color
        'card-bg': '#eef7fa',

        // This instantly updates all "bg-indigo-600" buttons to Orange.
        indigo: {
           50: '#f0fdfa', // Very light teal
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#008994', // BUTTON COLOR (Normal State)
          700: '#006d75', // Darker Teal for Hover State
          800: '#115e59',
          900: '#134e4a',
        },
      },
    },
  },
  plugins: [],
}