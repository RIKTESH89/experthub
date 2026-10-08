/** @jest-environment jsdom */
import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {KnowledgeForm} from '@/components/knowledge/knowledge-form';
jest.mock('motion/react',()=>({motion:new Proxy({}, {get:(_target,key)=>({children,initial,animate,transition,...props}:any)=>require('react').createElement(key,props,children)})}));
afterEach(cleanup);
const draft={id:'synthetic',title:'Synthetic source',content:'Synthetic source material',sourceType:'manual' as const};
it('rejects blank-only required values and links errors to inputs',async()=>{
 global.fetch=jest.fn();render(React.createElement(KnowledgeForm));fireEvent.change(screen.getByLabelText('Title'),{target:{value:'  '}});fireEvent.change(screen.getByLabelText('Content'),{target:{value:'  '}});fireEvent.click(screen.getByRole('button',{name:'Create'}));await screen.findByText('Title is required');expect(screen.getByLabelText('Title').getAttribute('aria-describedby')).toBe('knowledge-title-error');expect(screen.getByLabelText('Content').getAttribute('aria-describedby')).toBe('knowledge-content-error');expect(screen.getByLabelText('Source Type')).toBeTruthy();expect(global.fetch).not.toHaveBeenCalled();
});
it('retains populated draft after denied save and retries without changing owner/object contract',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false,status:403}).mockResolvedValueOnce({ok:true});const success=jest.fn();render(React.createElement(KnowledgeForm,{initialData:draft,onSuccess:success}));fireEvent.click(screen.getByRole('button',{name:'Update'}));await screen.findByRole('alert');expect((screen.getByLabelText('Content') as HTMLTextAreaElement).value).toBe(draft.content);fireEvent.click(screen.getByRole('button',{name:'Retry saving knowledge'}));await screen.findByText('Knowledge item saved.');expect(success).toHaveBeenCalledTimes(1);expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe('/api/knowledge/synthetic');expect((global.fetch as jest.Mock).mock.calls[1][1].method).toBe('PATCH');
});
it('suppresses repeated save and cancel while pending',async()=>{
 let resolve:(x:unknown)=>void=()=>{};global.fetch=jest.fn().mockImplementation(()=>new Promise(r=>resolve=r));const cancel=jest.fn();render(React.createElement(KnowledgeForm,{initialData:draft,onCancel:cancel}));const button=screen.getByRole('button',{name:'Update'});fireEvent.click(button);fireEvent.click(button);await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(cancel).not.toHaveBeenCalled();expect((screen.getByLabelText('Title') as HTMLInputElement).disabled).toBe(true);await act(async()=>resolve({ok:true}));
});
it('does not navigate after an unmounted save resolves',async()=>{
 let resolve:(x:unknown)=>void=()=>{};global.fetch=jest.fn().mockImplementation(()=>new Promise(r=>resolve=r));const success=jest.fn();const view=render(React.createElement(KnowledgeForm,{initialData:draft,onSuccess:success}));fireEvent.click(screen.getByRole('button',{name:'Update'}));await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));const signal=(global.fetch as jest.Mock).mock.calls[0][1].signal;view.unmount();expect(signal.aborted).toBe(true);await act(async()=>resolve({ok:true}));expect(success).not.toHaveBeenCalled();
});
