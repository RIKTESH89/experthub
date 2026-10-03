// Local packaging only. No root manifest/schema edits, deployment, credentials or provider CLI.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),runtime=path.join(__dirname,'.package-runtime'),output=path.join(__dirname,'dist');
const esbuild=require(process.env.WEBHOOK_ESBUILD_MODULE||'/opt/homebrew/lib/node_modules/vercel/node_modules/esbuild');
if(JSON.parse(fs.readFileSync(path.join(root,'node_modules/@prisma/client/package.json'),'utf8')).version!=='6.19.2')throw new Error('Pinned Prisma runtime unavailable');
const targets=['native','debian-openssl-3.0.x','rhel-openssl-3.0.x','linux-arm64-openssl-3.0.x'];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function run(cmd,args,opts={}){const result=cp.spawnSync(cmd,args,{cwd:root,encoding:'utf8',...opts});if(result.status!==0)throw new Error(`${cmd} failed: ${result.stderr||result.stdout}`);return result.stdout;}
async function main(){
 fs.mkdirSync(runtime,{recursive:true});fs.mkdirSync(output,{recursive:true});
 const original=fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8');
 const generated=path.join(runtime,'client');
 const schema=original.replace(/generator client \{[\s\S]*?\n\}/,`generator client {\n provider = "prisma-client-js"\n output = ${JSON.stringify(generated)}\n binaryTargets = ${JSON.stringify(targets)}\n previewFeatures = ["postgresqlExtensions"]\n}`);
 const schemaPath=path.join(runtime,'schema.prisma');fs.writeFileSync(schemaPath,schema);
 const log=run(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'generate','--schema',schemaPath],{env:{...process.env,DATABASE_URL:'postgresql://synthetic@127.0.0.1:1/unused',DIRECT_URL:'postgresql://synthetic@127.0.0.1:1/unused',PRISMA_GENERATE_NO_ENGINE:''}});
 fs.writeFileSync(path.join(output,'generation.log'),log);
 const neon=path.join(runtime,'neon-functions');
 if(!fs.existsSync(path.join(neon,'package.json'))){
  const archive=path.join(runtime,'functions-0.8.0.tgz');
  run('curl',['-fsSL','https://registry.npmjs.org/@neon/functions/-/functions-0.8.0.tgz','-o',archive]);
  const bytes=fs.readFileSync(archive),integrity=crypto.createHash('sha512').update(bytes).digest('base64');
  if(integrity!=='571d10BHXi2aEgxDaKIVL7NnEb25Dx7aduMyfu2xdo1BPTaVEJ4vKs3JUOGpqx1gMzhX5gioRK0dN8tjuRkdUQ==')throw new Error('Runtime package integrity mismatch');
  fs.mkdirSync(neon,{recursive:true});run('tar',['-xzf',archive,'--strip-components=1','-C',neon]);
 }
 const banner="import{createRequire as ___cr}from'node:module';import{fileURLToPath as ___f}from'node:url';import{dirname as ___d}from'node:path';const require=___cr(import.meta.url);const __filename=___f(import.meta.url);const __dirname=___d(__filename);";
 for(const kind of ['receiver','worker']){
  const dir=path.join(output,kind);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(path.join(dir,'client/runtime'),{recursive:true});
  for(const name of ['index.js','package.json','schema.prisma',...fs.readdirSync(generated).filter(n=>n.startsWith('libquery_engine-'))])fs.copyFileSync(path.join(generated,name),path.join(dir,'client',name));
  fs.copyFileSync(path.join(generated,'runtime/library.js'),path.join(dir,'client/runtime/library.js'));
  fs.copyFileSync(path.join(root,'node_modules/@prisma/client/LICENSE'),path.join(dir,'client/LICENSE'));
  fs.cpSync(neon,path.join(dir,'node_modules/@neon/functions'),{recursive:true,dereference:true});
  const bundle=await esbuild.build({entryPoints:[path.join(__dirname,`neon-${kind}.ts`)],bundle:true,platform:'node',target:'node24',format:'esm',outfile:path.join(dir,'index.mjs'),banner:{js:banner},metafile:true,external:['@neon/functions'],plugins:[{name:'isolated-prisma',setup(build){
   build.onResolve({filter:/^@prisma\/client$/},()=>({path:'./client/index.js',external:true}));
   build.onResolve({filter:/^@\/lib\/prisma$/},()=>({path:path.join(__dirname,'deny-ambient-prisma.ts')}));
  }}]});
  const sources=Object.fromEntries(Object.keys(bundle.metafile.inputs).map(file=>[file,hash(fs.readFileSync(path.resolve(root,file)))]));
  fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true,type:'module',engines:{node:'24.x'}},null,2));
  fs.writeFileSync(path.join(dir,'BUILD.json'),JSON.stringify({kind,schemaSha256:hash(original),prisma:'6.19.2',neonFunctions:'0.8.0',binaryTargets:targets,sources},null,2));
  fs.writeFileSync(path.join(output,`${kind}-metafile.json`),JSON.stringify(bundle.metafile,null,2));
  const archive=path.join(output,`${kind}.zip`);fs.rmSync(archive,{force:true});run('zip',['-q','-r',archive,'.'],{cwd:dir});
 }
 await esbuild.build({entryPoints:[path.join(__dirname,'package-probe.ts')],bundle:true,platform:'node',target:'node24',format:'esm',outfile:path.join(output,'verify-local.mjs'),banner:{js:banner},plugins:[{name:'isolated-verification',setup(build){
  build.onResolve({filter:/^@prisma\/client$/},()=>({path:'./worker/client/index.js',external:true}));
  build.onResolve({filter:/^@\/lib\/prisma$/},()=>({path:path.join(__dirname,'deny-ambient-prisma.ts')}));
 }}]});
 if(fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8')!==original)throw new Error('Repository schema changed');
 console.log(JSON.stringify({output,targets,schemaSha256:hash(original)}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
