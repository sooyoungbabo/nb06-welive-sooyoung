module.exports = {
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  testMatch: ['**/unit/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: [
    'src/middleware/authenticate.ts',
    'src/middleware/token.ts',
    'src/module/auth/auth.serfice.session.ts',
    'src/middleware/authorize.ts',
    'src/module/user/user.repo.ts',
    'src/lib/buildQuery.ts'
  ]
};
