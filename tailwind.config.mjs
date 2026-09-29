/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

// Design tokens: "editorial travel magazine".
// warm   = paper & ink neutrals (warm greys, no yellow cast)
// forest = primary: deep evergreen, used for actions
// gold   = accent: terracotta, used sparingly for emphasis
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FAF9F6', 100: '#F2F0EB', 200: '#E5E2DA', 300: '#D0CBC1', 400: '#A8A296',
          500: '#7C766B', 600: '#5E5950', 700: '#45413A', 800: '#2D2A26', 900: '#1C1A17', 950: '#0F0E0C',
        },
        forest: {
          50: '#EEF4F1', 100: '#D5E6DE', 200: '#ABCDBE', 300: '#7BAF99', 400: '#4C8E74', 500: '#2E735A',
          600: '#1F5C48', 700: '#184A3A', 800: '#133B2F', 900: '#0F3027', 950: '#081B16',
        },
        gold: {
          50: '#FDF3EE', 100: '#FAE2D5', 200: '#F3C2A6', 300: '#EA9C72', 400: '#DF7A48', 500: '#C9602E',
          600: '#AB4A21', 700: '#883A1C', 800: '#6B2F1A', 900: '#572818', 950: '#31130A',
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        body: ['Geist', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,14,12,.04), 0 4px 16px rgba(15,14,12,.05)',
        'card-hover': '0 2px 4px rgba(15,14,12,.05), 0 16px 40px rgba(15,14,12,.10)',
        soft: '0 1px 3px rgba(15,14,12,.05)',
      },
      letterSpacing: { tightest: '-.035em' },
    },
  },
  plugins: [typography],
};
