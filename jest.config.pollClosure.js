module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  testMatch: ['**/integration/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: [
    'src/module/pollScheduler/pollScheduler.ts',
    'src/module/notice/notice.service.ts',
    'src/module/notice/notice.repo.ts',
    'src/module/event/event.repo.ts',
    'src/module/notification/notification.repo.ts',
    'src/mofulr/notification/notification.sse.ts',
    'src/lib/util.js'
  ]
};
