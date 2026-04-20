// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/App.jsx', 'src/main.jsx'],
  },
  /** Règles assouplies pour atteindre une base « figée v1 » sans bloquer sur du bruit (apostrophes FR, deps). */
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'import/no-named-as-default': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]);
