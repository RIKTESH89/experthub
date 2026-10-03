// Run with owned disposable PG already on 55447, after build-package.cjs.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
for(const key of Object.keys(process.env))if(key.startsWith('STAGING_')||key.startsWith('WEBHOOK_'))delete process.env[key];
const source=path.join(__dirname,'dist'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'webhook-artifact-smoke-'));
function inspect(dir){let size=0,count=0;for(const name of fs.readdirSync(dir)){const file=path.join(dir,name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw new Error('Artifact contains symlink');if(stat.isDirectory()){const child=inspect(file);size+=child.size;count+=child.count;}else{size+=stat.size;count++;}}return {size,count};}
async function main(){
 if(!process.version.startsWith('v24.'))throw new Error('Run package smoke with local prepared Node24');
 for(const kind of ['receiver','worker']){const target=path.join(temp,kind);fs.mkdirSync(target);cp.execFileSync('unzip',['-q',path.join(source,`${kind}.zip`),'-d',target]);}
 fs.copyFileSync(path.join(source,'verify-local.mjs'),path.join(temp,'verify-local.mjs'));const stats={};
 for(const kind of ['receiver','worker']){
  const dir=path.join(temp,kind),build=JSON.parse(fs.readFileSync(path.join(dir,'BUILD.json'),'utf8'));stats[kind]=inspect(dir);
  if(kind==='receiver'&&fs.readFileSync(path.join(dir,'index.mjs'),'utf8').includes('applyPaymentSnapshotInTransaction'))throw new Error('Public artifact bundles worker domain functions');
  if(build.prisma!=='6.19.2'||build.neonFunctions!=='0.8.0')throw new Error('Dependency pin mismatch');
  for(const target of ['debian-openssl-3.0.x','rhel-openssl-3.0.x','linux-arm64-openssl-3.0.x'])if(!fs.existsSync(path.join(dir,'client',`libquery_engine-${target}.so.node`)))throw new Error(`Engine missing ${target}`);
  const module=await import(require('node:url').pathToFileURL(path.join(dir,'index.mjs')).href);if(typeof module.default.fetch!=='function')throw new Error('Neon fetch export unavailable');
  const route=kind==='receiver'?'/razorpay-test':'/drain';const response=await module.default.fetch(new Request(`http://localhost${route}`,{method:'POST'}));if(response.status!==503)throw new Error('Artifact default enabled');
  if((await module.default.fetch(new Request('http://localhost/unknown',{method:'POST'}))).status!==404)throw new Error('Artifact route leakage');
  await module.default.close();
 }
 global.fetch=async()=>{throw new Error('External calls blocked');};
 const probe=await import(require('node:url').pathToFileURL(path.join(temp,'verify-local.mjs')).href);
 const result=await probe.verify('postgresql://webhook_local@127.0.0.1:55447/webhook_local');
 console.log(JSON.stringify({node:process.version,relocated:true,symlinks:0,stats,...result}));
}main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}));
