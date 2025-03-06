const jestConfig = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  modulePaths: ['<rootDir>'],
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testEnvironment: 'node',
  transformIgnorePatterns: ['/node_modules/(?!@octokit/fixtures)']
};

module.exports = jestConfig;
