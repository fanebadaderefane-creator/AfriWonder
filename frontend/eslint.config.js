// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/App.jsx', 'src/main.jsx'],
  },
  /**
   * max-lines : plafond large pour écrans Expo / gros composants (refactor progressif, cf. AGENTS.md).
   * Les petits modules restent plafonnés à 300 via le bloc suivant.
   */
  {
    files: [
      'app/**/*.{ts,tsx}',
      'src/**/*.{ts,tsx,js,jsx}',
    ],
    rules: {
      'max-lines': [
        'warn',
        { max: 5000, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: [
      'src/lib/**/*',
      'src/config/**/*',
      'src/utils/**/*',
    ],
    rules: {
      'max-lines': [
        'warn',
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: [
      '**/*.{ts,tsx,js,jsx}',
    ],
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
