module.exports = {
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  testMatch: ['**/integration/flow.*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: [
    'src/module/auth/auth.control.ts',
    'src/module/user/user.control.ts',
    'src/module/apartment/apartment.control.ts',
    'src/module/board/board.repo.ts',
    'src/module/resident/resident.control.ts',
    'src/module/complaint/complaint.control.ts',
    'src/module/comment/comment.control.ts',
    'src/module/poll/poll.control.ts',
    'src/module/pollVote/vote.control.ts',
    'src/module/notice/notice.control.ts',
    'src/module/notification/notification.control.ts',
    'src/module/event/event.control.ts',
    'src/module/pollScheduler/pollScheduler.ts'
  ]
};
