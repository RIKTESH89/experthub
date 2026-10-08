import { revalidatedStream } from '@/lib/ai/revalidated-stream';
const chunk=new Uint8Array([42]);
test('demand-driven checks cover each chunk and EOF, with no prefetch',async()=>{
 const authorize=jest.fn(async()=>{}), pull=jest.fn(c=>{if(pull.mock.calls.length===1)c.enqueue(chunk);else c.close();});
 const stream=revalidatedStream(new ReadableStream({pull},{highWaterMark:0}),authorize);
 await Promise.resolve();expect(pull).not.toHaveBeenCalled();
 const reader=stream.getReader();expect(await reader.read()).toEqual({done:false,value:chunk});expect(authorize).toHaveBeenCalledTimes(1);
 await Promise.resolve();expect(pull).toHaveBeenCalledTimes(1);
 expect(await reader.read()).toEqual({done:true,value:undefined});expect(authorize).toHaveBeenCalledTimes(2);
});
test.each(['chunk','EOF'])('revocation rejects the next %s without successful completion',async boundary=>{
 let n=0;const cancel=jest.fn(),authorize=jest.fn(async()=>{if(authorize.mock.calls.length>1)throw Error('revoked');});
 const reader=revalidatedStream(new ReadableStream({pull(c){if(n++===0||boundary==='chunk')c.enqueue(chunk);else c.close();},cancel},{highWaterMark:0}),authorize).getReader();
 expect((await reader.read()).value).toEqual(chunk);
 await expect(reader.read()).rejects.toThrow('revoked');
 if(boundary==='chunk')expect(cancel).toHaveBeenCalledTimes(1);
});
test('abort cancels a silent provider while read is pending',async()=>{
 const cancel=jest.fn(),authorize=jest.fn(async()=>{}),abort=new AbortController();
 const reader=revalidatedStream(new ReadableStream({pull(){},cancel}),authorize,abort.signal).getReader();
 const pending=reader.read();abort.abort(new Error('deadline'));await expect(pending).rejects.toThrow('deadline');expect(cancel).toHaveBeenCalledTimes(1);expect(authorize).not.toHaveBeenCalled();
});
test('consumer cancellation reaches provider and skips authorization',async()=>{
 const cancel=jest.fn(),authorize=jest.fn(async()=>{});const reader=revalidatedStream(new ReadableStream({cancel}),authorize).getReader();
 await reader.cancel('disconnect');expect(cancel).toHaveBeenCalledWith('disconnect');expect(authorize).not.toHaveBeenCalled();
});
test('provider error remains an error',async()=>{
 const authorize=jest.fn(async()=>{});const reader=revalidatedStream(new ReadableStream({pull(c){c.error(Error('provider'));}}),authorize).getReader();
 await expect(reader.read()).rejects.toThrow('provider');expect(authorize).not.toHaveBeenCalled();
});
