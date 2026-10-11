const path = require('node:path');
module.exports = { rootDir: path.resolve(__dirname, '../..'), preset: 'ts-jest', testEnvironment: 'node', roots: ['<rootDir>/audit/exp17-independent-review-20261011'], testMatch: ['**/*.review.ts'], moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }, transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] }, clearMocks: true };
