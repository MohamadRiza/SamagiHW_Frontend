/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',    // Main blue
          600: '#0284c7',    // Hover blue
          700: '#0369a1',    // Active blue
          800: '#075985',
          900: '#0c4a6e',
        },
        // Sidebar specific shades (based on your primary)
        sidebar: {
          DEFAULT: '#0f172a',    // slate-900 - main bg
          header: '#1e293b',     // slate-800 - header bg
          hover: '#1e3a5f',      // custom blue hover
          active: '#0c4a6e',     // primary-900 - active item
          border: '#1e293b',     // slate-800 - borders
          text: '#94a3b8',       // slate-400 - default text
          textHover: '#ffffff',  // white - hover text
        }
      },
      boxShadow: {
        'sidebar': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'sidebar-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}