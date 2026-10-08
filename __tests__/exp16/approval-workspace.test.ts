/** @jest-environment jsdom */
import React from 'react';
import { render,screen,fireEvent,waitFor } from '@testing-library/react';
import { ReviewWorkspace } from '@/components/corrections/review-workspace';
const receipt='a'.repeat(64);
function setup(conflict=false){
 Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:()=> 'operation'});
 const transport=jest.fn(async(url:string,options?:RequestInit)=>{
  const body=options?.body?JSON.parse(String(options.body)):undefined;
  if(url.endsWith('/preview'))return {ok:true,json:async()=>({allowed:true,reason:null,currentHead:'head',targetId:body.rollbackTo??null,sourceCount:0,approvalHash:receipt,activation:{format:'persona-release-v2',runtime:{generation:{model:'Model A'}}},changes:[{field:'effective.runtime.generation.model',before:'Model B',after:'Model A'},{field:'effective.greetings.widget',before:'Greeting B',after:'Greeting A'}]})};
  if(body)return {ok:!conflict,status:conflict?409:201,json:async()=>conflict?{error:'Reviewed payload changed'}:{id:'new'}};
  if(url.endsWith('/persona-releases'))return {ok:true,json:async()=>({heads:[{releaseId:'head'}],releases:[{id:'target',createdAt:'2026-10-08T00:00:00Z',manifestHash:'h',manifest:{config:{},sources:[]}}]})};
  return {ok:true,json:async()=>({reviews:[],events:[],sources:[],truncated:false})};
 });
 render(React.createElement(ReviewWorkspace as React.ComponentType<{transport?:typeof fetch}>,{transport:transport as unknown as typeof fetch}));return transport;
}
test('rollback visibly discloses model and channel greeting; confirmation sends reviewed receipt',async()=>{
 const transport=setup();fireEvent.click(await screen.findByRole('button',{name:'Preview rollback'}));
 await screen.findByText('Generation model');expect(screen.getByText('Model B')).toBeTruthy();expect(screen.getByText('Model A')).toBeTruthy();expect(screen.getByText('Greeting A')).toBeTruthy();expect(screen.getByText('Greeting B')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Confirm rollback'}));await waitFor(()=>expect(transport).toHaveBeenCalledWith('/api/expert/persona-releases',expect.objectContaining({body:JSON.stringify({expectedHead:'head',rollbackTo:'target',approvalHash:receipt,operationKey:'operation'})})));
});
test('new publication also requires a visible preview and binds approval receipt',async()=>{
 const transport=setup();fireEvent.click(await screen.findByRole('button',{name:'Create release'}));await screen.findByText('Widget greeting');fireEvent.click(screen.getByRole('button',{name:'Confirm new release'}));await waitFor(()=>expect(transport).toHaveBeenCalledWith('/api/expert/persona-releases',expect.objectContaining({body:JSON.stringify({expectedHead:'head',approvalHash:receipt,operationKey:'operation'})})));
});
test('stale receipt blocks repeat confirmation and requires refresh',async()=>{
 const transport=setup(true);fireEvent.click(await screen.findByRole('button',{name:'Preview rollback'}));await screen.findByText('Generation model');fireEvent.click(screen.getByRole('button',{name:'Confirm rollback'}));await screen.findByRole('alert');expect((screen.getByRole('button',{name:'Confirm rollback'}) as HTMLButtonElement).disabled).toBe(true);
 expect(transport.mock.calls.filter(([,options])=>options?.body&&JSON.parse(String(options.body)).operationKey)).toHaveLength(1);
});
