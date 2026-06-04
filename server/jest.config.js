module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],

  // An array of file extensions your modules use
  moduleFileExtensions: ['js', 'json'],

  // The root directory that Jest should scan for tests and modules within
  rootDir: '.',

  // A list of paths to directories that Jest should use to search for files in
  roots: [
    '<rootDir>/tests'
  ],

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],

  // Setting this value to "fake" allows the use of fake timers for functions such as "setTimeout"
  timers: 'fake',
  
  // Suppress extremely noisy console.log/console.error in test outputs
  silent: true,
  
  // Set up global mocks/env vars before running tests
  setupFiles: ['<rootDir>/tests/setup.js']
};
