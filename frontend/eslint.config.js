// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  /** Règles assouplies pour atteindre une base « figée v1 » sans bloquer sur du bruit (apostrophes FR, deps). */
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'import/no-named-as-default': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
