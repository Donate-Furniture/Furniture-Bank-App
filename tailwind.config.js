// File: tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRUCIAL: This tells Tailwind to scan all files ending in .js, .ts, .jsx, .tsx, etc.,
  // within the 'app' and 'components' directories.
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', 
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}