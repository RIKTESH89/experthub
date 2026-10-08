/** @jest-environment jsdom */
import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {UserTable} from '@/components/admin/user-table';
jest.mock('next/navigation',()=>({useRouter:()=>({push:jest.fn()})}));
jest.mock('@/components/ui/motion',()=>({FadeIn:({children}:{children:React.ReactNode})=>children,motion:{tr:({children,initial,animate,transition,...props}:any)=>require('react').createElement('tr',props,children)}}));
afterEach(cleanup);
it('does not present denied admin access as an empty user directory and retries populated data',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false,status:403}).mockResolvedValueOnce({ok:true,json:async()=>({users:[{id:'synthetic-user',name:'Synthetic reader',email:'reader@example.invalid',role:'SUBSCRIBER',isActive:true,isBanned:false,createdAt:'2026-10-08'}]})});
 render(React.createElement(UserTable));await screen.findByRole('alert');expect(screen.getByText(/admin account/)).toBeTruthy();expect(screen.queryByText('No users found')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Retry users'}));await screen.findByText('Synthetic reader');expect(screen.getByText('Active')).toBeTruthy();expect(screen.queryByRole('alert')).toBeNull();
});
