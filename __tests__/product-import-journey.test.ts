/** @jest-environment jsdom */
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImportHistoryTable } from "@/components/knowledge/import-history-table";
import { PdfImportForm } from "@/components/knowledge/pdf-import-form";
afterEach(cleanup);
const history = (items: unknown[] = []) => ({ok:true,json:async()=>({items,total:items.length,page:1,totalPages:1,limit:20})});
it("keeps failed history distinct from empty and recovers populated processing and failure details",async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false,status:503}).mockResolvedValueOnce(history([{id:'one',sourceType:'PDF',fileName:'synthetic.pdf',status:'PROCESSING',itemsCreated:0,createdAt:'2026-10-08T12:00:00Z'},{id:'two',sourceType:'PDF',fileName:'failed.pdf',status:'FAILED',itemsCreated:0,errorMessage:'Long actionable processing failure details',createdAt:'2026-10-08T12:00:00Z'}]));
 render(React.createElement(ImportHistoryTable));await screen.findByRole('alert');expect(screen.queryByText(/No imports yet/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retry import history'}));await screen.findByText('synthetic.pdf');expect(screen.getByText('Processing')).toBeTruthy();expect(screen.getByText('Long actionable processing failure details')).toBeTruthy();expect(screen.queryByRole('alert')).toBeNull();
});
it("offers read-only refresh and distinguishes denied permissions",async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false,status:403}).mockResolvedValueOnce(history());
 render(React.createElement(ImportHistoryTable));await screen.findByText(/Sign in with an expert account/);fireEvent.click(screen.getByRole('button',{name:'Refresh import status'}));await screen.findByText(/No imports yet/);
});
it("ignores an old history request after unmount",async()=>{
 let resolve:(value:unknown)=>void=()=>{};global.fetch=jest.fn().mockImplementationOnce(()=>new Promise(r=>resolve=r));
 const view=render(React.createElement(ImportHistoryTable));const signal=(global.fetch as jest.Mock).mock.calls[0][1].signal;view.unmount();expect(signal.aborted).toBe(true);await act(async()=>resolve(history()));
});
it("retains the PDF through failure, explains uncertain completion, and retries to library handoff",async()=>{
 global.fetch=jest.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({ok:true,json:async()=>({title:'Synthetic source',numPages:2})});
 const view=render(React.createElement(PdfImportForm));const file=new File(['synthetic pdf'],'synthetic.pdf',{type:'application/pdf'});
 await act(async()=>fireEvent.change(view.container.querySelector('input[type=file]')!,{target:{files:[file]}}));await screen.findByText('synthetic.pdf');fireEvent.click(screen.getByRole('button',{name:'Upload and Import'}));await screen.findByRole('alert');expect(screen.getByText('synthetic.pdf')).toBeTruthy();expect(screen.getByText(/Check Import History first/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Retry PDF import'}));await screen.findByText('Successfully imported');expect(screen.getByRole('link',{name:'View source library'}).getAttribute('href')).toBe('/expert/knowledge');expect((global.fetch as jest.Mock).mock.calls[1][1].body.get('file')).toBe(file);
});
it("clears the old selected PDF when its replacement is rejected",async()=>{
 global.fetch=jest.fn();const view=render(React.createElement(PdfImportForm));const input=view.container.querySelector('input[type=file]')!;
 await act(async()=>fireEvent.change(input,{target:{files:[new File(['pdf'],'valid.pdf',{type:'application/pdf'})]}}));await screen.findByText('valid.pdf');
 await act(async()=>fireEvent.change(input,{target:{files:[new File(['text'],'invalid.txt',{type:'text/plain'})]}}));await screen.findByRole('alert');expect(screen.queryByText('valid.pdf')).toBeNull();expect((screen.getByRole('button',{name:'Upload and Import'}) as HTMLButtonElement).disabled).toBe(true);
});
