/** @jest-environment jsdom */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
const mockCapture = jest.fn();
jest.mock('@sentry/nextjs', () => ({ captureException: mockCapture }));
jest.mock('next/error', () => ({ __esModule: true, default: () => null }));
import GlobalError from '@/app/global-error';
afterEach(() => { cleanup(); delete process.env.VERCEL_ENV; delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED; });
test('mounted global error suppresses Sentry in Preview and retains production capture', () => {
 const warning = jest.spyOn(console, 'error').mockImplementation(() => {});
 try {
  process.env.VERCEL_ENV='preview';
  render(React.createElement(GlobalError, {error:new Error('synthetic-preview')})); expect(mockCapture).not.toHaveBeenCalled(); cleanup();
  process.env.VERCEL_ENV='production'; process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED='false';
  const error=new Error('synthetic-production');render(React.createElement(GlobalError,{error}));expect(mockCapture).toHaveBeenCalledWith(error);
 } finally { warning.mockRestore(); }
});
