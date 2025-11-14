module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000,
  maxWorkers: 1,
  testMatch: [
    '**/tests/**/*.test.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: false,
  verbose: true
};
