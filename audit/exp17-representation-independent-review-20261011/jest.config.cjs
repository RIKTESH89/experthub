const path = require('path');
const rootDir = path.resolve(__dirname, '../..');
const target = process.env.EXP_REVIEW_TARGET_ROOT || rootDir;
module.exports = { rootDir, preset: 'ts-jest', testEnvironment: 'node', roots: [__dirname], testMatch: ['**/*.review.ts'], moduleNameMapper: { '^@/(.*)$': path.join(target, 'src/$1') }, transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] }, clearMocks: true };
