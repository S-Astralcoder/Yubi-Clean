/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          metallic: '#D4AF37',
          deep: '#996515',
        },
        obsidian: {
          950: '#0A0A0B',
          900: '#121214',
          850: '#18181B',
          800: '#27272A',
        }
      },
      boxShadow: {
        'gold-glow': '0 0 20px -3px rgba(212, 175, 55, 0.35)',
        'gold-subtle': '0 0 10px rgba(234, 179, 8, 0.2)',
        'inner-dent': 'inset 0 1px 3px rgba(0, 0, 0, 0.7), inset 0 -1px 1px rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
