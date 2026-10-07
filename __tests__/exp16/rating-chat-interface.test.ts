/** @jest-environment jsdom */
import React from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ChatInterface } from '@/components/chat/chat-interface';
jest.mock('motion/react',()=>({motion:{div:'div'},AnimatePresence:({children}:{children:React.ReactNode})=>children}));
jest.mock('@/components/chat/source-citation',()=>({SourceCitation:()=>null}));
jest.mock('@/components/chat/share-button',()=>({ShareButton:()=>null}));
jest.mock('@/components/chat/thinking-steps',()=>({ThinkingSteps:()=>null}));
jest.mock('@/components/chat/typing-indicator',()=>({TypingIndicator:()=>null}));
jest.mock('@/components/chat/trial-paywall',()=>({TrialPaywall:()=>null}));
const json=(data:unknown,ok=true)=>({ok,json:async()=>data});
afterEach(cleanup);
test('loaded persisted rating survives a failed HTTP change and actual chat retry sends the same rating',async()=>{
 window.matchMedia=jest.fn(()=>({matches:false})) as unknown as typeof window.matchMedia;Element.prototype.scrollIntoView=jest.fn();
 let ratings=0;
 global.fetch=jest.fn(async(input,init)=>{
  const path=String(input);
  if(path.endsWith('/rate')){ratings++;expect(init?.body).toBe('{"rating":-1}');return ratings===1?json({error:'private-audit-details'},false):json({success:true,rating:-1,reviewId:'internal-review'});}
  if(path.includes('trial-status'))return json({questionsUsed:0,questionsAllowed:3,hasTrialAccess:true});
  if(path.includes('/memories'))return json({count:0});
  if(path.includes('?expertId='))return json([{id:'session',updatedAt:new Date().toISOString()}]);
  return json({id:'session',messages:[{id:'message',role:'assistant',content:'Saved response',rating:1,createdAt:new Date().toISOString()}]});
 }) as jest.Mock;
 render(React.createElement(ChatInterface,{expertId:'expert',expertName:'Synthetic Expert'}));
 const up=await screen.findByRole('button',{name:'Thumbs up'});expect(up.getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'Thumbs down'}));await screen.findByRole('alert');expect(up.getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'Retry rating'}));await screen.findByText('Rating saved.');expect(screen.getByRole('button',{name:'Thumbs down'}).getAttribute('aria-pressed')).toBe('true');expect(ratings).toBe(2);
 expect(document.body.textContent).not.toMatch(/internal-review|private-audit-details/);
});
