/** @jest-environment jsdom */
import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {KnowledgeTable} from '@/components/knowledge/knowledge-table';
const item={id:'synthetic-source',title:'Synthetic source',sourceType:'manual',isIndexed:false,createdAt:'2026-10-08'};
afterEach(cleanup);
beforeEach(()=>{global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({items:[item]})});});
it('omits an edit action when no handler exists, and names the remaining icon action',async()=>{
 render(React.createElement(KnowledgeTable));await screen.findByText(item.title);expect(screen.queryByRole('button',{name:`Edit knowledge item ${item.title}`})).toBeNull();expect(screen.getByRole('button',{name:`Delete knowledge item ${item.title}`})).toBeTruthy();
});
it('names the edit action and passes the selected populated source to its handler',async()=>{
 const onEdit=jest.fn();render(React.createElement(KnowledgeTable,{onEdit}));const edit=await screen.findByRole('button',{name:`Edit knowledge item ${item.title}`});fireEvent.click(edit);expect(onEdit).toHaveBeenCalledWith(item);expect(global.fetch).toHaveBeenCalledTimes(1);
});
