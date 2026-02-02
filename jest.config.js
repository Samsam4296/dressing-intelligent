/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    __DEV__: true,
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@sentry/.*|nativewind|react-native-css-interop|class-variance-authority|clsx|tailwind-merge|react-native-reanimated|react-native-keyboard-aware-scroll-view)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock react-native-css-interop to prevent native module loading
    '^react-native-css-interop(.*)$': '<rootDir>/__mocks__/react-native-css-interop.js',
    // Mock nativewind jsx-runtime to use React's jsx-runtime
    '^nativewind/jsx-runtime$': '<rootDir>/__mocks__/nativewind-jsx-runtime.js',
    '^nativewind/jsx-dev-runtime$': '<rootDir>/__mocks__/nativewind-jsx-runtime.js',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.expo/'],
  collectCoverageFrom: ['**/lib/**/*.{ts,tsx}', '!**/node_modules/**', '!**/coverage/**'],
  testMatch: ['**/__tests__/**/*.(test|spec).[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
