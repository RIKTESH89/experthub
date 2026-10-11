module.exports = {
  rootDir: '../../../../exp-16',
  preset: 'ts-jest', testEnvironment: 'node',
  roots: ['<rootDir>', '<rootDir>/../exp-7/audit/exp7-acceptance-20261011/review-exp16'],
  testMatch: ['<rootDir>/../exp-7/audit/exp7-acceptance-20261011/review-exp16/persistence-final-expiry.test.cjs'],
  moduleNameMapper: { ...(process.env.EXP16_REVIEW_BEFORE === '1' ? { '^@/lib/persona/persistence$': '<rootDir>/../exp-7/audit/exp7-acceptance-20261011/review-exp16/persistence-before.cjs' } : {}), '^@/(.*)$': '<rootDir>/src/$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { target: 'ES2020', jsx: 'react-jsx', esModuleInterop: true } }] },
};
