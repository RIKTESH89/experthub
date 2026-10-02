/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, screen, act, cleanup } from '@testing-library/react';
import { TierSelectionDialog } from '@/components/experts/tier-selection-dialog';
const mockInfo = jest.fn(); const mockSuccess = jest.fn();
jest.mock('sonner', () => ({ toast: { info: (...args: unknown[]) => mockInfo(...args), success: (...args: unknown[]) => mockSuccess(...args), error: jest.fn() } }));
jest.mock('@/components/ui/dialog', () => ({ Dialog: ({ children }: { children: React.ReactNode }) => children, DialogContent: ({ children }: { children: React.ReactNode }) => children, DialogHeader: ({ children }: { children: React.ReactNode }) => children, DialogTitle: ({ children }: { children: React.ReactNode }) => children }));
const props = { isOpen: true, onClose: jest.fn(), expertId: 'synthetic', expertName: 'Synthetic', tiers: [{ id: 'p', tier: 'PREMIUM' as const, price: 10, features: [] }], onSubscribe: jest.fn() };
let checkout: { handler: () => void; modal: { ondismiss: () => void } };
let confirmed: boolean; let offline: boolean;
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
beforeEach(() => {
 jest.useFakeTimers(); localStorage.clear(); confirmed = false; offline = false; props.onClose.mockReset(); props.onSubscribe.mockReset(); mockInfo.mockReset(); mockSuccess.mockReset();
 const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; document.body.appendChild(script);
 Object.assign(window, { Razorpay: class { constructor(options: typeof checkout) { checkout = options; } open() {} } });
 global.fetch = jest.fn(async (url) => {
  if (url === '/api/payments/create-subscription') return { ok: true, json: async () => ({ subscriptionId: 'synthetic-checkout', razorpayKeyId: 'synthetic', expertName: 'Synthetic' }) } as Response;
  if (offline) throw new Error('offline');
  return { ok: true, json: async () => ({ verified: confirmed }) } as Response;
 });
});
afterEach(() => { cleanup(); jest.useRealTimers(); document.querySelectorAll('script').forEach(script => script.remove()); });
const start = async () => { render(React.createElement(TierSelectionDialog, props)); fireEvent.click(screen.getByRole('button', { name: 'Go Premium' })); await flush(); await act(async () => checkout.handler()); await flush(); };
test('provider callback stays pending beyond 30 seconds; status retry activates only after confirmed webhook and never recreates checkout', async () => {
 await start(); expect(mockSuccess).not.toHaveBeenCalled(); expect(props.onSubscribe).not.toHaveBeenCalled(); expect(screen.getByText('Payment confirmation pending')).toBeDefined();
 await act(async () => { jest.advanceTimersByTime(31000); }); await flush();
 expect(screen.getByRole('button', { name: 'Check payment status' })).toBeDefined();
 confirmed = true; fireEvent.click(screen.getByRole('button', { name: 'Check payment status' })); await flush();
 expect(props.onSubscribe).toHaveBeenCalledWith('PREMIUM', true); expect(localStorage.length).toBe(0);
 expect((global.fetch as jest.Mock).mock.calls.filter(call => call[0] === '/api/payments/create-subscription')).toHaveLength(1);
});
test('offline/reload/dismissal preserves status retry and blocks another payment', async () => {
 await start(); offline = true; await act(async () => checkout.modal.ondismiss());
 fireEvent.click(screen.getByRole('button', { name: 'Check payment status' })); await flush();
 expect(screen.getByText(/status is unavailable/)).toBeDefined(); cleanup(); render(React.createElement(TierSelectionDialog, props)); await flush();
 expect((screen.getByRole('button', { name: 'Go Premium' }) as HTMLButtonElement).disabled).toBe(true);
 offline = false; confirmed = true; fireEvent.click(screen.getByRole('button', { name: 'Check payment status' })); await flush();
 expect(props.onSubscribe).toHaveBeenCalledWith('PREMIUM', true);
 expect((global.fetch as jest.Mock).mock.calls.filter(call => call[0] === '/api/payments/create-subscription')).toHaveLength(1);
});
test('Preview client cannot create checkout despite inherited-looking provider setup', async () => {
 process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED = 'true';
 try {
  render(React.createElement(TierSelectionDialog, props));
  fireEvent.click(screen.getByRole('button', { name: 'Go Premium' })); await flush();
  expect(global.fetch).not.toHaveBeenCalled(); expect(mockInfo).toHaveBeenCalledWith('Payments are disabled in Preview.');
 } finally { delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED; }
});
