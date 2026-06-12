const spartanPreset = require('@spartan-ng/brain/hlm-tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [spartanPreset],
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lexend', 'sans-serif'],
      },
      colors: {
        tenant: {
          primary:   'hsl(var(--tenant-primary) / <alpha-value>)',
          hover:     'hsl(var(--tenant-hover) / <alpha-value>)',
          highlight: 'hsl(var(--tenant-highlight) / <alpha-value>)',
          shadow:    'hsl(var(--tenant-shadow) / <alpha-value>)',
          contrast:  'hsl(var(--tenant-contrast) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
