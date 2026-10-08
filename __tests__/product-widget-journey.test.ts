/** @jest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import WidgetPage from "@/app/(dashboard)/expert/widget/page";
jest.mock('@/components/expert-studio/expert-studio',()=>({ExpertStudio:({children}:{children:React.ReactNode})=>children}));
jest.mock('@/components/ui/motion',()=>{
 const React=require('react');const passthrough=({children}:{children:React.ReactNode})=>children;
 return {PageTransition:passthrough,FadeIn:passthrough,StaggerContainer:passthrough,StaggerItem:passthrough,AnimatePresence:passthrough,motion:new Proxy({}, {get:(_target,key)=>({children,initial,animate,exit,transition,whileHover,whileTap,layout,...props}:any)=>React.createElement(key,props,children)})};
});
afterEach(cleanup);
const config={id:'synthetic',isEnabled:false,primaryColor:'#6366f1',position:'bottom-right',greeting:'Synthetic greeting',freeQuestions:2,allowedDomains:['example.invalid'],embedCode:'<script>synthetic only</script>'};
const response=(data:unknown)=>({ok:true,json:async()=>data});
it('retains an unsaved draft on failure, freezes edits during save, then confirms saved settings',async()=>{
 let complete:(response:unknown)=>void=()=>{};
 global.fetch=jest.fn().mockResolvedValueOnce(response(config)).mockResolvedValueOnce({ok:false,status:503}).mockImplementationOnce(()=>new Promise(resolve=>complete=resolve));
 render(React.createElement(WidgetPage));await screen.findByLabelText('Greeting message');fireEvent.change(screen.getByLabelText('Greeting message'),{target:{value:'Updated synthetic greeting'}});await screen.findByText(/Preview shows your unsaved changes/);
 fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await screen.findByRole('alert');expect((screen.getByLabelText('Greeting message') as HTMLTextAreaElement).value).toBe('Updated synthetic greeting');
 fireEvent.click(screen.getByRole('button',{name:'Retry saving widget'}));await waitFor(()=>expect((screen.getByLabelText('Greeting message') as HTMLTextAreaElement).disabled).toBe(true));complete(response({...config,greeting:'Updated synthetic greeting'}));await screen.findByText('Widget settings saved.');expect(screen.queryByText(/Preview shows your unsaved changes/)).toBeNull();
});
it('does not claim clipboard success after rejection and recovers on retry',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce(response(config));const writeText=jest.fn().mockRejectedValueOnce(Error('denied')).mockResolvedValueOnce(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(React.createElement(WidgetPage));await screen.findByRole('button',{name:'Copy'});fireEvent.click(screen.getByRole('button',{name:'Copy'}));await screen.findByText(/Clipboard access failed/);expect(screen.queryByText('Copied!')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Copy'}));await screen.findByText('Embed code copied.');expect(writeText).toHaveBeenLastCalledWith(config.embedCode);
});
it('rejects invalid configuration locally without writing to the API',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce(response(config));render(React.createElement(WidgetPage));await screen.findByLabelText('Primary color hex value');fireEvent.change(screen.getByLabelText('Primary color hex value'),{target:{value:'invalid'}});fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await screen.findByText(/six-digit hex color/);expect(global.fetch).toHaveBeenCalledTimes(1);
 fireEvent.change(screen.getByLabelText('Primary color hex value'),{target:{value:'#6366f1'}});fireEvent.change(screen.getByLabelText('Free questions per visitor'),{target:{value:'1.5'}});fireEvent.click(screen.getByRole('button',{name:'Retry saving widget'}));expect(global.fetch).toHaveBeenCalledTimes(1);
});
