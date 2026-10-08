const url=new URL(process.env.DATABASE_URL||'postgresql://invalid');
if(process.env.EXP16_OWNED_SYNTHETIC_CLUSTER!=='1'||url.username!=='exp16_fixture'||url.hostname!=='localhost'||url.pathname!=='/exp16_replay_fixture'||!/^\/tmp\/exp16-replay-fixture-[a-z0-9_]+\/socket$/.test(url.searchParams.get('host')||''))throw Error('Requires runner-owned disposable EXP16 private-socket fixture cluster');
global.fetch=async()=>{throw Error('Provider/network calls prohibited in synthetic EXP16 SQL tests');};
