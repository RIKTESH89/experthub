if(process.env.EXP14_OWNED_SYNTHETIC_CLUSTER==='1') {
 const target=process.env.DATABASE_URL;
 let url;try{url=new URL(target);}catch{throw Error('Owned EXP14 fixture requires explicit database URL');}
 const host=url.searchParams.get('host');
 if(url.protocol!=='postgresql:'||url.username!=='integration_synthetic'||url.password||url.pathname!=='/integration_exp14'||!host||!/^\/tmp\/experthub-exp14-acceptance-[A-Za-z0-9_-]+(?:\/socket)?$/.test(host))throw Error('Unsafe owned EXP14 socket fixture');
 process.env.DIRECT_URL=target;
} else {
 process.env.DATABASE_URL='postgresql://integration_synthetic@127.0.0.1:55447/integration_exp14';
 process.env.DIRECT_URL=process.env.DATABASE_URL;
}
process.env.AUTH_SECRET='synthetic-only';
global.fetch=async()=>{throw Error('External calls prohibited');};
