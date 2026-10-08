/** @jest-environment jsdom */
import React from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {SubscriptionList} from '@/components/subscriptions/subscription-list';
import {SubscriptionCard} from '@/components/subscriptions/subscription-card';
jest.mock('@/components/subscriber/subscriber-studio.module.css',()=>({subscription:'fixture'}));
const active={id:'synthetic-plan',status:'ACTIVE' as const,monthlyPrice:100,startDate:'2026-10-08',expert:{id:'synthetic-expert',displayName:'Synthetic expert'}};
afterEach(cleanup);
it('retries denied list GET in place and exposes contextual populated links without mutations',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,json:async()=>[active]});render(React.createElement(SubscriptionList));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByRole('article',{name:'Subscription to Synthetic expert'});expect(screen.getByRole('link',{name:'Open AI conversation with Synthetic expert'}).getAttribute('href')).toBe('/subscriber/experts/synthetic-expert/chat');expect(screen.getByRole('link',{name:'View expert Synthetic expert'})).toBeTruthy();expect((global.fetch as jest.Mock).mock.calls.every(c=>!c[1]?.method)).toBe(true);
});
it.each(['PENDING','PAST_DUE','EXPIRED','CANCELLED'] as const)('does not imply chat access from %s when access is absent',status=>{
 render(React.createElement(SubscriptionCard,{subscription:{...active,status}}));expect(screen.queryByRole('link',{name:/Open AI conversation/})).toBeNull();expect(screen.getByRole('link',{name:'Resubscribe'})).toBeTruthy();
});
it('preserves explicit continuing paid-period access after renewal cancellation',()=>{
 render(React.createElement(SubscriptionCard,{subscription:{...active,status:'CANCELLED',hasAccess:true,renewalCancelled:true,currentPeriodEnd:'2099-11-08T00:00:00Z'}}));expect(screen.getByText('Renewal cancelled')).toBeTruthy();expect(screen.getByRole('link',{name:'Open AI conversation with Synthetic expert'})).toBeTruthy();expect(screen.getByText(/Access continues until/)).toBeTruthy();
});
it('honors explicit access denial even with ACTIVE status',()=>{
 render(React.createElement(SubscriptionCard,{subscription:{...active,hasAccess:false}}));expect(screen.queryByRole('link',{name:/Open AI conversation/})).toBeNull();
});
it('aborts the outstanding list request on unmount',async()=>{
 global.fetch=jest.fn().mockImplementation(()=>new Promise(()=>{}));const view=render(React.createElement(SubscriptionList));await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));const signal=(global.fetch as jest.Mock).mock.calls[0][1].signal;view.unmount();expect(signal.aborted).toBe(true);
});
