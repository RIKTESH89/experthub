// Download a checksum-verified LOCAL Node24 for exact runtime smoke, no global install.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const dir=path.join(__dirname,'.package-runtime'),target=path.join(dir,'node24');fs.mkdirSync(dir,{recursive:true});
if(!fs.existsSync(path.join(target,'bin/node'))){
 const checks=cp.execFileSync('curl',['-fsSL','https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt'],{encoding:'utf8'});
 const file=checks.split('\n').find(line=>line.endsWith('-darwin-arm64.tar.gz'));if(!file)throw new Error('Node24 Mac checksum not found');
 const [expected,name]=file.trim().split(/\s+/),archive=path.join(dir,name);
 cp.execFileSync('curl',['-fsSL',`https://nodejs.org/dist/latest-v24.x/${name}`,'-o',archive]);
 if(crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex')!==expected)throw new Error('Node24 integrity mismatch');
 fs.mkdirSync(target,{recursive:true});cp.execFileSync('tar',['-xzf',archive,'--strip-components=1','-C',target]);
 fs.writeFileSync(path.join(dir,'node24-integrity.json'),JSON.stringify({source:`https://nodejs.org/dist/latest-v24.x/${name}`,sha256:expected}));
}
console.log(cp.execFileSync(path.join(target,'bin/node'),['--version'],{encoding:'utf8'}).trim());
