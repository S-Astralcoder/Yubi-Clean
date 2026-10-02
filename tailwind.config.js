/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        yt: {
          red: '#FF0000',
          darkRed: '#CC0000',
          // YouTube Dark Mode tokens
          baseDark: '#0F0F0F',
          surfaceDark: '#212121',
          cardDark: '#1F1F1F',
          hoverDark: '#272727',
          borderDark: 'rgba(255, 255, 255, 0.12)',
          textPrimaryDark: '#F1F1F1',
          textSecondaryDark: '#AAAAAA',
          // YouTube Light Mode tokens
          baseLight: '#FFFFFF',
          surfaceLight: '#F2F2F2',
          cardLight: '#F8F8F8',
          hoverLight: '#E5E5E5',
          borderLight: 'rgba(0, 0, 0, 0.1)',
          textPrimaryLight: '#0F0F0F',
          textSecondaryLight: '#606060',
        }
      },
      boxShadow: {
        'yt-modal': '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1)',
        'yt-modal-light': '0 16px 48px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0, 0, 0, 0.15)',
        'yt-fab': '0 4px 20px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
