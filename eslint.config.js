// ESLint flat config for Expo + TypeScript + React Native
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      'web-build/*',
      'android/*',
      'ios/*',
      'coverage/*',
      '__tests__/*',
      'jest.setup.js',
      'jest.config.js',
    ],
  },
  {
    rules: {
      // React rules - expo config includes TypeScript rules
      'react/display-name': 'off',

      // Code quality
      'no-console': 'warn', // Rappel: utiliser Sentry en production
    },
  },
]);
