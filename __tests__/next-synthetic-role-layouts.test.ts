import React from 'react';
import {auth} from '@/lib/auth';
import Dashboard from '@/app/(dashboard)/layout';
import Subscriber from '@/app/(dashboard)/subscriber/layout';
import Expert from '@/app/(dashboard)/expert/layout';
import Admin from '@/app/(dashboard)/admin/layout';
import {navByRole} from '@/config/nav';
jest.mock('@/lib/auth',()=>({auth:jest.fn()}));
jest.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error('REDIRECT '+url);}}));
jest.mock('@/components/layout/sidebar',()=>({Sidebar:()=>null}));
jest.mock('@/components/layout/navbar',()=>({Navbar:()=>null}));
jest.mock('@/app/(dashboard)/admin/admin-studio.module.css',()=>({workspace:'synthetic'}));
const children=React.createElement('p',null,'Synthetic populated content');
it('redirects anonymous dashboard access',async()=>{(auth as jest.Mock).mockResolvedValue(null);await expect(Dashboard({children})).rejects.toThrow('REDIRECT /login');});
it.each(['SUBSCRIBER','EXPERT','ADMIN'])('uses persisted synthetic %s session role for actual dashboard navigation',async(role)=>{
 (auth as jest.Mock).mockResolvedValue({user:{id:'synthetic-'+role,role}});const layout=await Dashboard({children});const sidebar=(layout.props.children as React.ReactElement[])[0];expect(sidebar.props.navItems).toBe(navByRole[role]);
});
it('keeps expert/admin restrictions for synthetic subscriber sessions',async()=>{
 (auth as jest.Mock).mockResolvedValue({user:{id:'synthetic',role:'SUBSCRIBER'}});await expect(Expert({children})).rejects.toThrow('REDIRECT /');await expect(Admin({children})).rejects.toThrow('REDIRECT /');expect((await Subscriber({children})).props.children).toBe(children);
});
it('keeps subscriber/admin restrictions for synthetic expert sessions',async()=>{
 (auth as jest.Mock).mockResolvedValue({user:{id:'synthetic',role:'EXPERT'}});await expect(Subscriber({children})).rejects.toThrow('REDIRECT /');await expect(Admin({children})).rejects.toThrow('REDIRECT /');expect((await Expert({children})).props.children).toBe(children);
});
it('allows the existing admin role in all three actual role layouts',async()=>{
 (auth as jest.Mock).mockResolvedValue({user:{id:'synthetic',role:'ADMIN'}});expect(await Subscriber({children})).toBeTruthy();expect(await Expert({children})).toBeTruthy();expect(await Admin({children})).toBeTruthy();
});
