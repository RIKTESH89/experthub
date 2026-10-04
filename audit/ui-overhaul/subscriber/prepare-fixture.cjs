const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve('src/app/e/design-preview/subscriber/[expertId]');
const sources=[['page.tsx','fixture-page.tsx.txt'],['review-fixture.tsx','fixture-client.tsx.txt']];
const mode=process.argv[2];
if(!['create','clean'].includes(mode))throw Error('Use create or clean');
for(const [target,source] of sources){const dest=path.join(dir,target);const text=fs.readFileSync(path.join(__dirname,source),'utf8');if(fs.existsSync(dest)&&fs.readFileSync(dest,'utf8')!==text)throw Error('Refusing to alter another fixture: '+dest);if(mode==='create'){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dest,text);}else if(fs.existsSync(dest))fs.unlinkSync(dest);}
console.log(mode==='create'?'Temporary gated review fixture prepared; use synthetic local environment and Playwright API interception.':'Temporary fixture source removed.');
