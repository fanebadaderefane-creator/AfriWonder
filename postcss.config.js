export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: [
        '> 1%',
        'last 2 versions',
        'not dead',
        'not ie 11',
      ],
      // Ignorer les propriétés non standard pour réduire les warnings
      grid: false,
    },
  },
}
