/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
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
