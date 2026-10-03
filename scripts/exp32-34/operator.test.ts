import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
const folder=mkdtempSync(join(tmpdir(),'billing-review-'));
afterAll(()=>rmSync(folder,{recursive:true,force:true}));
const run=(args:string[],url='postgresql://forbidden@example.invalid/production')=>spawnSync(process.execPath,['scripts/exp32-34/operator.cjs',...args],{encoding:'utf8',env:{...process.env,DATABASE_URL:url}});
test('operator dry-run has no DB dependency and apply refuses unreviewed or remote data',()=>{
 const file=join(folder,'review.json');writeFileSync(file,JSON.stringify({row:{id:'sub',version:1,providerId:'provider',cancelled:false},evidence:{providerId:'provider',paymentId:'paid',captured:true,start:'2026-10-01T00:00:00Z',end:'2026-11-01T00:00:00Z'}}));
 const dry=run(['reconcile','--input',file]);expect(dry.status).toBe(0);const output=JSON.parse(dry.stdout);expect(output.outcome).toBe('dry-run');
 expect(run(['reconcile','--input',file,'--apply']).stderr).toContain('reviewed digest');
 expect(run(['reconcile','--input',file,'--apply','--reviewed-digest',output.plan.digest]).stderr).toContain('restricted');
});
test('operator recovery is dry-run until exact review digest is supplied',()=>{
 const file=join(folder,'recovery.json');writeFileSync(file,JSON.stringify({intent:{id:'intent',version:2,state:'UNKNOWN'},evidence:{intentId:'intent',providerId:'remote'}}));
 const dry=run(['recover','--input',file]);expect(dry.status).toBe(0);expect(JSON.parse(dry.stdout).outcome).toBe('dry-run');
 expect(run(['recover','--input',file,'--apply','--reviewed-digest','wrong']).stderr).toContain('reviewed digest');
});
