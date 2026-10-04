/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { randomUUID } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";
import { ChatInterface } from "@/components/chat/chat-interface";

jest.mock("motion/react",()=>({motion:{div:"div"},AnimatePresence:({children}: {children: React.ReactNode})=>children}));
jest.mock("@/components/chat/chat-message",()=>({ChatMessage:({message}:{message:{role:string;content:string}})=>React.createElement("div",{"data-testid":"message-"+message.role},message.content)}));
jest.mock("@/components/chat/share-button",()=>({ShareButton:()=>null}));
jest.mock("@/components/chat/thinking-steps",()=>({ThinkingSteps:()=>null}));
jest.mock("@/components/chat/typing-indicator",()=>({TypingIndicator:()=>null}));
jest.mock("@/components/chat/trial-paywall",()=>({TrialPaywall:()=>null}));
let post: (init: RequestInit)=>Promise<unknown>;
let saved: {id:string;role:string;content:string;createdAt:string}[];
const json=(data:unknown)=>({ok:true,json:async()=>data});
beforeEach(()=>{
  Object.assign(globalThis,{TextEncoder,TextDecoder});
  Object.defineProperty(globalThis.crypto,"randomUUID",{value:randomUUID,configurable:true});
  saved=[];
  window.matchMedia=jest.fn(()=>({matches:false})) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView=jest.fn();
  post=async()=>{throw new TypeError("Synthetic network failure before headers");};
  global.fetch=jest.fn(async(input,init)=>{
    const path=String(input);
    if(path.endsWith('/messages'))return post(init!);
    if(path.includes('trial-status'))return json({questionsUsed:2,questionsAllowed:3,hasSubscription:false,hasTrialAccess:true});
    if(path.includes('/memories'))return json({count:0});
    if(path.includes('?expertId='))return json([{id:'session-one',updatedAt:new Date().toISOString()}]);
    return json({id:'session-one',messages:saved});
  }) as jest.Mock;
});
afterEach(cleanup);
async function send(){
  render(React.createElement(ChatInterface,{expertId:'fixture-expert',expertName:'Synthetic QA Expert'}));
  const input=screen.getByRole('textbox',{name:'Message to Digital Twin'}) as HTMLTextAreaElement;
  await waitFor(()=>expect(input.disabled).toBe(false));
  fireEvent.change(input,{target:{value:'Preserve this synthetic draft'}});
  fireEvent.click(screen.getByRole('button',{name:'Send message'}));return input;
}
it('shows a pre-header failure without inventing an assistant answer, preserves the draft and GET-only retries',async()=>{
  const input=await send();
  await screen.findByText('We couldn’t receive a response.');
  expect(input.value).toBe('Preserve this synthetic draft');
  expect(screen.queryByTestId('message-assistant')).toBeNull();
  expect((screen.getByRole('button',{name:'Send message'}) as HTMLButtonElement).disabled).toBe(true);
  saved=[{id:'saved-user',role:'user',content:'Preserve this synthetic draft',createdAt:new Date().toISOString()}];
  const button=screen.getByRole('button',{name:'Retry connection'});
  fireEvent.click(button);fireEvent.click(button);
  await waitFor(()=>expect(screen.queryByText('We couldn’t receive a response.')).toBeNull());
  expect(screen.getAllByTestId('message-user')).toHaveLength(1);
  expect(input.value).toBe('Preserve this synthetic draft');
  expect((fetch as jest.Mock).mock.calls.filter(([path])=>String(path).endsWith('/messages'))).toHaveLength(1);
  expect(screen.getByText('1 free question left')).toBeTruthy();
});
it('keeps partial text and labels an interrupted response separately',async()=>{
  const cancel=jest.fn(async()=>{}),releaseLock=jest.fn();let reads=0;
  post=async()=>({ok:true,body:{getReader:()=>({read:async()=>{if(reads++)throw new TypeError('Synthetic midstream failure');return {done:false,value:new TextEncoder().encode('data: {"content":"Partial local answer"}\n\n')};},cancel,releaseLock})}});
  const input=await send();
  await screen.findByText('The response was interrupted. The partial answer may be incomplete.');
  expect(screen.getByTestId('message-assistant').textContent).toBe('Partial local answer');
  expect(input.value).toBe('Preserve this synthetic draft');expect(cancel).toHaveBeenCalledTimes(1);expect(releaseLock).toHaveBeenCalledTimes(1);
});
it('distinguishes user cancellation from a network error and retains the draft',async()=>{
  post=async(init)=>new Promise((_resolve,reject)=>init.signal!.addEventListener('abort',()=>reject(new DOMException('Synthetic cancellation','AbortError'))));
  const input=await send();fireEvent.click(await screen.findByRole('button',{name:'Stop response'}));
  await screen.findByText('Response stopped.');
  expect(screen.queryByText('We couldn’t receive a response.')).toBeNull();expect(input.value).toBe('Preserve this synthetic draft');
});

it.each([[504, "The response timed out before it started."], [499, "Response stopped."], [500, "We couldn’t receive a response."]])("handles the reviewed pre-header JSON contract for HTTP %s", async (status, message) => {
  post=async()=>({ok:false,status,json:async()=>({error:"Synthetic backend failure"})});
  const input=await send();await screen.findByText(message as string);
  expect(input.value).toBe("Preserve this synthetic draft");
  expect(screen.queryByTestId("message-assistant")).toBeNull();
});
