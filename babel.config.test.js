/**
 * Babel config for Jest tests
 * Uses standard React JSX runtime instead of nativewind
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', { jsxRuntime: 'automatic' }],
    ],
    plugins: [],
  };
};
