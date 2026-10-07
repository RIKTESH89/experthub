/** @jest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { RatingControls } from '@/components/chat/rating-controls';
import { saveMessageRating } from '@/components/chat/save-message-rating';
import { ChatMessage } from '@/components/chat/chat-message';
jest.mock('motion/react',()=>({motion:{div:'div'}}));
jest.mock('@/components/chat/source-citation',()=>({SourceCitation:()=>null}));
afterEach(()=>{cleanup();jest.useRealTimers();});
const button=(name:string)=>screen.getByRole('button',{name}) as HTMLButtonElement;
const response=(ok:boolean,data:unknown)=>({ok,json:async()=>data}) as Response;
function controls(onRate:(rating:1|-1)=>Promise<void>,rating:number|null=null){render(React.createElement(RatingControls,{rating,onRate}));}
test.each([401,403,409,500])('failed HTTP %s restores prior confirmed selection and retry saves exact failed choice',async status=>{
 const transport=jest.fn().mockResolvedValueOnce({...response(false,{error:'secret-review-id'}),status}).mockResolvedValueOnce(response(true,{success:true,rating:-1,reviewId:'private-candidate'}));
 controls(rating=>saveMessageRating('session','message',rating,transport),1);
 fireEvent.click(button('Thumbs down'));
 await screen.findByRole('alert');expect(button('Thumbs up').getAttribute('aria-pressed')).toBe('true');expect(button('Thumbs down').getAttribute('aria-pressed')).toBe('false');
 expect(document.body.textContent).not.toMatch(/secret-review-id|private-candidate/);
 fireEvent.click(button('Retry rating'));await screen.findByText('Rating saved.');expect(screen.queryByRole('alert')).toBeNull();expect(button('Thumbs down').getAttribute('aria-pressed')).toBe('true');
 expect(transport.mock.calls.map(([,init])=>init.body)).toEqual(['{"rating":-1}','{"rating":-1}']);
});
test('network failure remains visibly unconfirmed until retry, without claiming saved success',async()=>{
 controls(()=>Promise.reject(Error('Synthetic private transport detail')));fireEvent.click(button('Thumbs up'));await screen.findByRole('alert');expect(button('Thumbs up').getAttribute('aria-pressed')).toBe('false');expect(screen.queryByText('Rating saved.')).toBeNull();expect(button('Retry rating').disabled).toBe(false);
});
test('pending click disables both choices and rapid duplicate clicks issue one request',async()=>{
 let resolve!:()=>void;const onRate=jest.fn(()=>new Promise<void>(r=>{resolve=r;}));controls(onRate);
 fireEvent.click(button('Thumbs up'));fireEvent.click(button('Thumbs up'));fireEvent.click(button('Thumbs down'));
 expect(screen.getByRole('status').textContent).toBe('Saving rating…');expect(button('Thumbs up').disabled).toBe(true);expect(button('Thumbs down').disabled).toBe(true);expect(onRate).toHaveBeenCalledTimes(1);
 await act(async()=>resolve());expect(button('Thumbs up').disabled).toBe(false);expect(button('Thumbs up').getAttribute('aria-pressed')).toBe('true');
});
test('failed second rating restores last locally confirmed rating, not stale original props',async()=>{
 const onRate=jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error('Synthetic failure'));controls(onRate);
 fireEvent.click(button('Thumbs up'));await screen.findByText('Rating saved.');fireEvent.click(button('Thumbs down'));await screen.findByRole('alert');expect(button('Thumbs up').getAttribute('aria-pressed')).toBe('true');
});
test.each([null,{success:false,rating:1},{success:true,rating:-1},{rating:1}])('HTTP success with unconfirmed/mismatched receipt still fails: %j',async receipt=>{
 await expect(saveMessageRating('session','message',1,jest.fn().mockResolvedValue(response(true,receipt)))).rejects.toThrow('Rating not confirmed');
});
test('malformed JSON receipt fails and path IDs are encoded',async()=>{
 const transport=jest.fn().mockResolvedValue({ok:true,json:async()=>{throw SyntaxError('private');}});await expect(saveMessageRating('session/other','message?x',1,transport)).rejects.toThrow();expect(transport.mock.calls[0][0]).toBe('/api/chat/sessions/session%2Fother/messages/message%3Fx/rate');
});
test('timeout aborts the request and releases pending controls for retry',async()=>{
 jest.useFakeTimers();const transport=jest.fn((_url,init)=>new Promise<Response>((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('Synthetic timeout')))));
 controls(rating=>saveMessageRating('session','message',rating,transport));fireEvent.click(button('Thumbs up'));
 await act(async()=>jest.advanceTimersByTime(15000));expect(screen.getByRole('alert')).toBeTruthy();expect(button('Retry rating').disabled).toBe(false);expect(button('Thumbs up').disabled).toBe(false);expect(jest.getTimerCount()).toBe(0);
});
test('settling an old conversation cannot change the newly mounted conversation rating',async()=>{
 let reject!:(e:Error)=>void;const old=()=>new Promise<void>((_,r)=>{reject=r;});const view=render(React.createElement(RatingControls,{key:'old-session',rating:1,onRate:old}));fireEvent.click(button('Thumbs down'));
 view.rerender(React.createElement(RatingControls,{key:'new-session',rating:null,onRate:async()=>{}}));await act(async()=>reject(Error('Old failure')));
 expect(screen.queryByRole('alert')).toBeNull();expect(button('Thumbs up').getAttribute('aria-pressed')).toBe('false');expect(button('Thumbs down').getAttribute('aria-pressed')).toBe('false');
});
test('assistant message renders accessible controls and unavailable rating stays disabled',async()=>{
 const onRate=jest.fn().mockResolvedValue(undefined);const message={id:'message',role:'assistant' as const,content:'Synthetic',createdAt:new Date().toISOString(),rating:1};
 const view=render(React.createElement(ChatMessage,{message,expertName:'Expert',onRate}));fireEvent.click(button('Thumbs down'));await waitFor(()=>expect(onRate).toHaveBeenCalledWith('message',-1));await screen.findByText('Rating saved.');
 view.rerender(React.createElement(ChatMessage,{message,expertName:'Expert'}));expect(button('Thumbs up').disabled).toBe(true);expect(button('Thumbs down').disabled).toBe(true);
});
