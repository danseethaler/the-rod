/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  corePlugins: {
    space: false,
  },
  theme: {
    extend: {
      colors: {
        // Iron rod / lit-by-revelation amber. Warm, reverent, restrained.
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontSize: {
        xs: '10px',
        sm: '12px',
        base: '14px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    plugin(({matchUtilities, theme}) => {
      const spacing = theme('spacing');
      matchUtilities(
        {space: (value) => ({gap: value})},
        {values: spacing, type: ['length', 'number', 'percentage']}
      );
      matchUtilities(
        {'space-x': (value) => ({columnGap: value})},
        {values: spacing, type: ['length', 'number', 'percentage']}
      );
      matchUtilities(
        {'space-y': (value) => ({rowGap: value})},
        {values: spacing, type: ['length', 'number', 'percentage']}
      );
    }),
  ],
};
