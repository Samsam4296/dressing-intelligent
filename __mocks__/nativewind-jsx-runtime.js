/**
 * Mock for nativewind/jsx-runtime
 * Redirects to React's standard jsx-runtime for Jest tests
 */

const React = require('react');

// Re-export React's jsx-runtime functions
module.exports = {
  jsx: (type, props, key) => React.createElement(type, { ...props, key }),
  jsxs: (type, props, key) => React.createElement(type, { ...props, key }),
  Fragment: React.Fragment,
};
