/**
 * Mock for react-native-css-interop
 * Prevents native module loading in Jest tests
 */

module.exports = {
  cssInterop: (component) => component,
  remapProps: () => {},
  StyleSheet: {
    create: (styles) => styles,
    flatten: (styles) => styles,
    compose: (...styles) => styles,
  },
};
