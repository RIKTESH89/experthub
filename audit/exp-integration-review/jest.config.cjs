// Jest loads this standalone review configuration as CommonJS.
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('node:path');
module.exports = {
 preset: 'ts-jest', testEnvironment: 'node', rootDir: path.resolve(__dirname, '../..'),
 roots: [__dirname], testMatch: ['**/*.test.ts'],
 moduleNameMapper: {'^@/(.*)$': path.resolve(process.env.EXP_REVIEW_TARGET_ROOT || path.resolve(__dirname, '../..'), 'src') + '/$1'},
 transform: {'^.+\\.tsx?$': ['ts-jest', {tsconfig: {jsx:'react-jsx'}}]}, clearMocks: true,
};
