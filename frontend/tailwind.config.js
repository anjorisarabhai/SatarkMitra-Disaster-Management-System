/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // This scans your "app" folder (where page.jsx is)
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    
    // This scans your "src" folder (where your components are)
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    
    // These are backups in case you add other folders later
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};