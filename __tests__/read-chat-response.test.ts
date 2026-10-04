import { readChatResponse } from "@/components/chat/read-chat-response";
function reader(data:string[]){let index=0;return {read:jest.fn(async()=>index<data.length?{done:false,value:new TextEncoder().encode(data[index++])}:{done:true,value:undefined}),cancel:jest.fn(async()=>{}),releaseLock:jest.fn()} as unknown as ReadableStreamDefaultReader<Uint8Array>;}
it('stops at the persisted acknowledgement, cancels/releases the reader and ignores trailing data',async()=>{
 const body=reader(['data: {"content":"Answer"}\n\ndata: {"done":true,"messageId":"saved-answer","sources":[]}\n\ndata: {"content":"must not render"}\n\n']);const event=jest.fn();
 await readChatResponse(body,event);expect(event).toHaveBeenCalledTimes(2);expect(body.read).toHaveBeenCalledTimes(1);expect(body.cancel).toHaveBeenCalledTimes(1);expect(body.releaseLock).toHaveBeenCalledTimes(1);
});
it.each(['data: nope\n\n','data: {"error":"synthetic server failure"}\n\n','data: [DONE]\n\n','data: {"content":"unfinished"}\n\n'])('rejects malformed, failed or incomplete streams without treating EOF as success: %s',async(data)=>{
 const body=reader([data]);await expect(readChatResponse(body,jest.fn())).rejects.toThrow();expect(body.cancel).toHaveBeenCalledTimes(1);expect(body.releaseLock).toHaveBeenCalledTimes(1);
});
