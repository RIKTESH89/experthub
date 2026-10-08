/** @jest-environment jsdom */
import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {UserTable} from '@/components/admin/user-table';
jest.mock('next/navigation',()=>({useRouter:()=>({push:jest.fn()})}));
jest.mock('@/components/ui/motion',()=>({FadeIn:({children}:{children:React.ReactNode})=>children,motion:{tr:({children,initial,animate,transition,...props}:any)=>require('react').createElement('tr',props,children)}}));
jest.mock('@/components/ui/dropdown-menu',()=>{
 const pass=({children}:{children:React.ReactNode})=>children;return {DropdownMenu:pass,DropdownMenuTrigger:pass,DropdownMenuContent:pass,DropdownMenuSeparator:()=>null,DropdownMenuItem:({children,onClick,disabled}:{children:React.ReactNode;onClick:()=>void;disabled:boolean})=>require('react').createElement('button',{onClick,disabled},children)};
});
const user={id:'synthetic-reader',name:'Synthetic reader',email:'reader@example.invalid',role:'SUBSCRIBER',isActive:true,isBanned:false,createdAt:'2026-10-08'};
const loaded={ok:true,json:async()=>({users:[user]})};
afterEach(cleanup);
async function open(){render(React.createElement(UserTable));await screen.findByText('Synthetic reader');screen.getByRole('button',{name:'Actions for Synthetic reader'}).focus();fireEvent.click(screen.getByRole('button',{name:'Delete User'}));await screen.findByRole('alertdialog');}
it('requires confirmation identifying the user; cancel returns focus and makes no DELETE request',async()=>{
 global.fetch=jest.fn().mockResolvedValue(loaded);await open();expect(screen.getByRole('alertdialog').textContent).toContain(user.email);expect(document.activeElement).toBe(screen.getByRole('button',{name:'Cancel'}));fireEvent.click(screen.getByRole('button',{name:'Cancel'}));await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull());expect(global.fetch).toHaveBeenCalledTimes(1);expect(document.activeElement).toBe(screen.getByRole('button',{name:'Actions for Synthetic reader'}));
});
it('allows Escape cancellation before confirmation',async()=>{
 global.fetch=jest.fn().mockResolvedValue(loaded);await open();fireEvent.keyDown(screen.getByRole('alertdialog'),{key:'Escape'});await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull());expect(global.fetch).toHaveBeenCalledTimes(1);
});
it('locks pending deletion, ignores repeated clicks/Escape, then focuses search after the row is removed',async()=>{
 let resolve:(x:unknown)=>void=()=>{};global.fetch=jest.fn().mockResolvedValueOnce(loaded).mockImplementationOnce(()=>new Promise(r=>resolve=r));await open();const confirm=screen.getByRole('button',{name:'Confirm deletion'});fireEvent.click(confirm);fireEvent.click(confirm);await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(2));expect((screen.getByRole('button',{name:'Cancel'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.keyDown(screen.getByRole('alertdialog'),{key:'Escape'});expect(screen.getByRole('alertdialog')).toBeTruthy();await act(async()=>resolve({ok:true}));await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull());expect(screen.queryByText('Synthetic reader')).toBeNull();expect(document.activeElement).toBe(screen.getByRole('textbox',{name:'Search users by name or email'}));
});
it('keeps the selected user on permission failure and retries the confirmed operation',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce(loaded).mockResolvedValueOnce({ok:false,status:403}).mockResolvedValueOnce({ok:true});await open();fireEvent.click(screen.getByRole('button',{name:'Confirm deletion'}));await screen.findByRole('alert');expect(screen.getByRole('alertdialog')).toBeTruthy();expect(screen.getByText('Synthetic reader')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Retry deleting user'}));await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull());expect((global.fetch as jest.Mock).mock.calls[2][0]).toBe('/api/admin/users/synthetic-reader');expect((global.fetch as jest.Mock).mock.calls[2][1].method).toBe('DELETE');
});

it('keeps uncertain deletion reviewable with explicit review-before-retry guidance',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce(loaded).mockRejectedValueOnce(new TypeError('Failed to fetch'));await open();fireEvent.click(screen.getByRole('button',{name:'Confirm deletion'}));await screen.findByText(/Deletion was not confirmed/);expect(screen.getByRole('alertdialog')).toBeTruthy();expect(screen.getByText('Synthetic reader')).toBeTruthy();expect(screen.getByRole('button',{name:'Retry deleting user'})).toBeTruthy();
});
