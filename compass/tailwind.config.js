/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FDFAF5',
          100: '#F5F0E8',
          200: '#EDE8E0',
          300: '#E2DAD0',
        },
        sage: {
          50: '#E8F0EE',
          100: '#C8DDD9',
          300: '#8FBAB2',
          400: '#5B7B6F',
          500: '#4D7C6F',
          600: '#3D6459',
        },
        stone: {
          600: '#6B6157',
          700: '#4A4340',
        },
        text: {
          primary: '#1C1814',
          secondary: '#6B6157',
          tertiary: '#9A918A',
        },
        border: {
          DEFAULT: '#E2DAD0',
          light: '#EDE8E0',
        },
        warning: '#7D5A3C',
        surface: '#FDFAF5',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
