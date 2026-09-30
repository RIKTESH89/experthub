import {createLocalScheduler} from "@/lib/knowledge/local-scheduler";
function fixture() {
 let time=0;let next=0;const tasks=new Map<number,()=>void>();
 const clock={now:()=>new Date(time),setTimeout:(fn:()=>void,_delay:number)=>{tasks.set(++next,fn);return next;},clearTimeout:(id:unknown)=>{tasks.delete(id as number);}};
 const drain=jest.fn().mockResolvedValue({completed:1});
 return {clock,drain,tasks,advance:(ms:number)=>{time+=ms;const due=Array.from(tasks.values());tasks.clear();due.forEach(fn=>fn());}};
}
test("requires explicit bounded synthetic allowlist and safe limits",()=>{
 const f=fixture();expect(()=>createLocalScheduler({...f,syntheticExpertIds:[]})).toThrow("allowlist");
 expect(()=>createLocalScheduler({...f,syntheticExpertIds:["real-person"]})).toThrow("allowlist");
 expect(()=>createLocalScheduler({...f,syntheticExpertIds:["synthetic-ada"],batchSize:21})).toThrow("limits");
});
test("repeated start schedules once; delayed tick uses current clock and bounded batch",async()=>{
 const f=fixture();const runner=createLocalScheduler({...f,syntheticExpertIds:["synthetic-ada","synthetic-ada"],batchSize:3});runner.start();runner.start();expect(f.tasks.size).toBe(1);
 f.advance(9000);await runner.tick();expect(f.drain).toHaveBeenCalledTimes(1);expect(f.drain).toHaveBeenCalledWith("synthetic-ada",3,new Date(9000));expect(f.tasks.size).toBe(1);await runner.shutdown();
});
test("overlapping manual/timer ticks join active work and never replay missed intervals",async()=>{
 const f=fixture();let finish:()=>void=()=>{};f.drain.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve;}));
 const runner=createLocalScheduler({...f,syntheticExpertIds:["synthetic-ada"]});runner.start();f.advance(1000);const a=runner.tick();const b=runner.tick();expect(a).toBe(b);f.advance(50_000);expect(f.drain).toHaveBeenCalledTimes(1);finish();await a;expect(f.tasks.size).toBe(1);await runner.shutdown();
});
test("failure does not block next expert or scheduled retry",async()=>{
 const f=fixture();const errors=jest.fn();f.drain.mockRejectedValueOnce(new Error("mock outage"));const runner=createLocalScheduler({...f,syntheticExpertIds:["synthetic-ada","synthetic-ben"],onError:errors});runner.start();await runner.tick();expect(f.drain).toHaveBeenCalledTimes(2);expect(errors).toHaveBeenCalledTimes(1);await runner.tick();expect(f.drain).toHaveBeenCalledTimes(4);await runner.shutdown();
});
test("shutdown waits in-flight batch, cancels timer and skips remaining experts",async()=>{
 const f=fixture();let finish:()=>void=()=>{};f.drain.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve;}));const runner=createLocalScheduler({...f,syntheticExpertIds:["synthetic-ada","synthetic-ben"]});runner.start();const pending=runner.tick();const shutdown=runner.shutdown();finish();await pending;await shutdown;f.advance(100_000);await runner.tick();expect(f.drain).toHaveBeenCalledTimes(1);expect(f.tasks.size).toBe(0);expect(()=>runner.start()).toThrow("new scheduler");
});
test("restart creates new runner and reuses durable drain state without an in-memory cursor",async()=>{
 const f=fixture();let persisted=2;f.drain.mockImplementation(async()=>{if(persisted)persisted--;});const first=createLocalScheduler({...f,syntheticExpertIds:["synthetic-ada"]});await first.tick();await first.shutdown();const restarted=createLocalScheduler({...f,syntheticExpertIds:["synthetic-ada"]});await restarted.tick();expect(persisted).toBe(0);expect(f.drain).toHaveBeenCalledTimes(2);await restarted.shutdown();
});
