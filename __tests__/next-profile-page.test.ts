/** @jest-environment jsdom */
import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import Page from '@/app/(dashboard)/subscriber/profile/page';
jest.mock('@/components/profile/profile-form',()=>({ProfileForm:({initialData}:{initialData:{name:string}})=>require('react').createElement('p',null,initialData.name)}));
jest.mock('@/components/subscriber/subscriber-studio.module.css',()=>({page:'fixture'}));
jest.mock('@/components/ui/motion',()=>({PageTransition:({children}:{children:React.ReactNode})=>children}));
afterEach(cleanup);
it('retries failed profile GET in place and renders populated identity',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,json:async()=>({name:'Synthetic subscriber',email:'subscriber@example.invalid'})});render(React.createElement(Page));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByText('Synthetic subscriber');expect((global.fetch as jest.Mock).mock.calls.map(c=>c[0])).toEqual(['/api/users/me','/api/users/me']);expect(screen.queryByRole('alert')).toBeNull();
});
