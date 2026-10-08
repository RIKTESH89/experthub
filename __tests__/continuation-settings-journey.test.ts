/** @jest-environment jsdom */
import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import Page from '@/app/(dashboard)/subscriber/settings/page';
import {toast} from 'sonner';
jest.mock('sonner',()=>({toast:{success:jest.fn(),error:jest.fn()}}));
jest.mock('@/components/subscriber/subscriber-studio.module.css',()=>({page:'fixture'}));
jest.mock('@/components/ui/motion',()=>({PageTransition:({children}:{children:React.ReactNode})=>children,FadeIn:({children}:{children:React.ReactNode})=>children}));
beforeAll(()=>{global.ResizeObserver=class {observe(){} unobserve(){} disconnect(){}} as typeof ResizeObserver;});
const loaded={ok:true,json:async()=>({emailOnNewPost:false,emailOnReply:true,emailDigest:'weekly'})};
afterEach(cleanup);
async function load(){render(React.createElement(Page));await screen.findByRole('switch',{name:'New Posts from Experts'});}
it('retries the denied settings read in place and enables only changed loaded preferences',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce(loaded);render(React.createElement(Page));await screen.findByRole('alert');expect((screen.getByRole('button',{name:'Save Settings'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByRole('switch',{name:'New Posts from Experts'});expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByRole('switch',{name:'New Posts from Experts'}).getAttribute('aria-checked')).toBe('false');fireEvent.click(screen.getByRole('switch',{name:'New Posts from Experts'}));await waitFor(()=>expect((screen.getByRole('button',{name:'Save Settings'}) as HTMLButtonElement).disabled).toBe(false));
});
it('retains denied preference choices and retry saves the exact draft; editing clears stale saved presentation',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce(loaded).mockResolvedValueOnce({ok:false,status:403}).mockResolvedValueOnce({ok:true});await load();fireEvent.click(screen.getByRole('switch',{name:'New Posts from Experts'}));fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByRole('alert');expect(screen.getByRole('switch',{name:'New Posts from Experts'}).getAttribute('aria-checked')).toBe('true');fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByText('Preferences saved.');expect(JSON.parse((global.fetch as jest.Mock).mock.calls[2][1].body)).toEqual({emailOnNewPost:true,emailOnReply:true,emailDigest:'weekly'});expect((screen.getByRole('button',{name:'Saved!'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('switch',{name:'Replies to Comments'}));await screen.findByRole('button',{name:'Save Settings'});expect(screen.queryByText('Preferences saved.')).toBeNull();
});
it('guards repeated pending requests, disables controls and announces ambiguous network outcome',async()=>{
 let reject:(e:Error)=>void=()=>{};global.fetch=jest.fn().mockResolvedValueOnce(loaded).mockImplementationOnce(()=>new Promise((_r,j)=>reject=j));await load();fireEvent.click(screen.getByRole('switch',{name:'New Posts from Experts'}));const save=screen.getByRole('button',{name:'Save Settings'});fireEvent.click(save);fireEvent.click(save);await screen.findByText('Saving preferences…');expect(global.fetch).toHaveBeenCalledTimes(2);expect((screen.getByRole('switch',{name:'New Posts from Experts'}) as HTMLButtonElement).disabled).toBe(true);await act(async()=>reject(new TypeError('Failed to fetch')));await screen.findByText(/Save response could not be confirmed/);expect(screen.queryByText(/were not saved/)).toBeNull();
});
it('aborts a pending save on unmount without announcing late success',async()=>{
 let resolve:(v:unknown)=>void=()=>{};global.fetch=jest.fn().mockResolvedValueOnce(loaded).mockImplementationOnce(()=>new Promise(r=>resolve=r));const view=render(React.createElement(Page));await screen.findByRole('switch',{name:'New Posts from Experts'});fireEvent.click(screen.getByRole('switch',{name:'New Posts from Experts'}));fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(2));const signal=(global.fetch as jest.Mock).mock.calls[1][1].signal;view.unmount();expect(signal.aborted).toBe(true);await act(async()=>resolve({ok:true}));expect(toast.success).not.toHaveBeenCalled();
});
