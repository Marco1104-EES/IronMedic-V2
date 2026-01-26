/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0f172a',
        action: '#2563eb',
        alert: '#dc2626',
        success: '#22c55e',
      }
    },
  },
  plugins: [],
}