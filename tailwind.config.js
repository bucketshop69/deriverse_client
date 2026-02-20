/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#9CA3AF',
        'background-dark': '#0D0D0F',
        'neutral-dark': '#1A1A1A',
        'panel-border': '#2A2A2A',
        'secondary-text': '#666666',
        success: '#00C087',
        danger: '#FF3B30',
      },
      borderWidth: {
        DEFAULT: '1.5px',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
    },
  },
  plugins: [],
}
