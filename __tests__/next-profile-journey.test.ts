/** @jest-environment jsdom */
import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {ProfileForm} from '@/components/profile/profile-form';
const profile={name:'Synthetic subscriber',email:'subscriber@example.invalid',bio:'Synthetic bio'};
const ok=(body:unknown={})=>({ok:true,json:async()=>body});
beforeEach(()=>{URL.createObjectURL=jest.fn().mockReturnValue('blob:synthetic');URL.revokeObjectURL=jest.fn();});
afterEach(cleanup);
async function choose(container:HTMLElement,file=new File(['synthetic'],'photo.png',{type:'image/png'})){
 await act(async()=>fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[file]}}));
}
it('stops after failed upload, retains file/details, then retries upload and profile with no false success',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce(ok({url:'/uploads/synthetic.png'})).mockResolvedValueOnce(ok());
 const view=render(React.createElement(ProfileForm,{initialData:profile}));await choose(view.container);fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Updated synthetic'}});fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await screen.findByRole('alert');expect(global.fetch).toHaveBeenCalledTimes(1);expect(screen.queryByText('Profile saved.')).toBeNull();expect(screen.getByText('Selected: photo.png')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Retry saving profile'}));await screen.findByText('Profile saved.');expect((global.fetch as jest.Mock).mock.calls.map(c=>c[0])).toEqual(['/api/upload','/api/upload','/api/users/me']);expect(JSON.parse((global.fetch as jest.Mock).mock.calls[2][1].body)).toEqual({name:'Updated synthetic',headline:'',bio:'Synthetic bio',image:'/uploads/synthetic.png'});expect((screen.getByRole('button',{name:'Save Changes'}) as HTMLButtonElement).disabled).toBe(true);
});
it('reuses a confirmed upload after profile failure instead of creating a second upload',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce(ok({url:'/uploads/synthetic.png'})).mockResolvedValueOnce({ok:false,status:503}).mockResolvedValueOnce(ok());const view=render(React.createElement(ProfileForm,{initialData:profile}));await choose(view.container);fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Retry saving profile'}));await screen.findByText('Profile saved.');expect((global.fetch as jest.Mock).mock.calls.map(c=>c[0])).toEqual(['/api/upload','/api/users/me','/api/users/me']);
});
it('locks edits and suppresses repeated saves while pending',async()=>{
 let resolve:(x:unknown)=>void=()=>{};global.fetch=jest.fn().mockImplementation(()=>new Promise(r=>resolve=r));render(React.createElement(ProfileForm,{initialData:profile}));fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Updated synthetic'}});const button=screen.getByRole('button',{name:'Save Changes'});fireEvent.click(button);fireEvent.click(button);await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));expect((screen.getByLabelText('Name') as HTMLInputElement).disabled).toBe(true);expect((screen.getByRole('button',{name:'Choose profile photo'}) as HTMLButtonElement).disabled).toBe(true);await act(async()=>resolve(ok()));await screen.findByText('Profile saved.');
});
it('aborts interrupted requests and never announces detached success',async()=>{
 let resolve:(x:unknown)=>void=()=>{};global.fetch=jest.fn().mockImplementation(()=>new Promise(r=>resolve=r));const onSuccess=jest.fn();const view=render(React.createElement(ProfileForm,{initialData:profile,onSuccess}));fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Updated synthetic'}});fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));const signal=(global.fetch as jest.Mock).mock.calls[0][1].signal;view.unmount();expect(signal.aborted).toBe(true);await act(async()=>resolve(ok()));expect(onSuccess).not.toHaveBeenCalled();
});
it('clears an invalid replacement photo and releases the prior preview URL',async()=>{
 const view=render(React.createElement(ProfileForm,{initialData:profile}));await choose(view.container);await choose(view.container,new File(['text'],'not-image.txt',{type:'text/plain'}));await screen.findByRole('alert');expect(screen.queryByText('Selected: photo.png')).toBeNull();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
});
it('links name validation to the field and focuses it without submitting',async()=>{
 global.fetch=jest.fn();render(React.createElement(ProfileForm,{initialData:profile}));fireEvent.change(screen.getByLabelText('Name'),{target:{value:''}});fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await screen.findByText('Name is required');expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBe('profile-name-error');expect(document.activeElement).toBe(screen.getByLabelText('Name'));expect(global.fetch).not.toHaveBeenCalled();
});
it('registers unload protection only while changes remain unsaved',async()=>{
 global.fetch=jest.fn().mockResolvedValue(ok());render(React.createElement(ProfileForm,{initialData:profile}));fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Updated synthetic'}});let event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await screen.findByText('Profile saved.');event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(false);
});
