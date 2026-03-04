/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        warm: {
          50:  '#FBF8F4',
          100: '#F4EDE2',
          200: '#E8D9C4',
          300: '#D5C0A4',
          400: '#BCA07F',
          500: '#A08060',
          600: '#7D6248',
          700: '#5C4835',
          800: '#3D3025',
          900: '#261D16',
          950: '#160E09',
        },
        gold: {
          50:  '#FFF8EC',
          100: '#FEEECE',
          200: '#FDD99C',
          300: '#FBBA62',
          400: '#F8931E',
          500: '#E07610',
          600: '#C45B09',
          700: '#9E430B',
          800: '#7D3410',
          900: '#672C10',
          950: '#3A1505',
        },
        forest: {
          50:  '#F0FAF4',
          100: '#DBF4E5',
          200: '#B7E8CB',
          300: '#84D4A7',
          400: '#4DB87D',
          500: '#2E9B5E',
          600: '#1F7D4A',
          700: '#1A633C',
          800: '#174F32',
          900: '#14412A',
          950: '#082417',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 16px 0 rgba(26,18,9,0.07)',
        'card-hover': '0 8px 40px 0 rgba(26,18,9,0.13)',
        soft: '0 1px 8px 0 rgba(26,18,9,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
