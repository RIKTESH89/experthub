// Development-only standalone test harness. Never imported by the application.
// Creates disposable labeled records and official NextAuth test cookies; guards remain intact.
const {localUiConfig}=require('../../local-ui-isolation.cjs');
const {PrismaClient}=require('@prisma/client');
const http=require('node:http');
const fs=require('node:fs');
async function main(){
  localUiConfig(process.env,{networkGuardLoaded:globalThis[Symbol.for('experthub.local-ui-network-guard')]===true});
  if(process.env.DATABASE_URL!=='postgresql://fixture:fixture@127.0.0.1:55441/fixture')throw Error('Wrong disposable fixture database');
  const db=new PrismaClient();
  const identity=await db.$queryRaw`SELECT current_database() AS name, current_user AS user`;
  if(identity[0].name!=='fixture'||identity[0].user!=='fixture')throw Error('Unsafe fixture identity');
  if(await db.user.count())throw Error('Refusing to seed nonempty fixture database');
  for(const [id,role] of [['subscriber','SUBSCRIBER'],['expert','EXPERT'],['admin','ADMIN'],['banned','SUBSCRIBER'],['inactive','SUBSCRIBER']]){
    await db.user.create({data:{id:'uiqa-'+id,email:id+'@example.invalid',name:'Synthetic QA '+id,role,isBanned:id==='banned',isActive:id!=='inactive',...(id==='expert'?{expertProfile:{create:{id:'uiqa-profile',displayName:'Synthetic QA Expert',specialty:['Local interface testing'],vectorNamespace:'synthetic-uiqa',isVerified:false,monthlyPrice:0,freeTrialQuestions:3,twinGreeting:'Synthetic local QA conversation. No live model is connected.'}}}:{})}});
  }
  await db.expertPricingTier.create({data:{expertProfileId:'uiqa-profile',tier:'FREE',price:0,features:[]}});
  await db.expertSubscription.create({data:{id:'uiqa-free-subscription',subscriberId:'uiqa-subscriber',expertProfileId:'uiqa-profile',price:0,tier:'FREE',status:'ACTIVE'}});
  await db.post.create({data:{id:'uiqa-post',authorId:'uiqa-expert',title:'Synthetic QA source note',content:'Local verification fixture. This is not a shipping expert claim.',status:'PUBLISHED'}});
  await db.chatSession.create({data:{id:'uiqa-chat',subscriberId:'uiqa-subscriber',expertProfileId:'uiqa-profile',title:'Synthetic QA conversation',messages:{create:[{role:'user',senderId:'uiqa-subscriber',content:'This is a synthetic local question.'},{role:'assistant',content:'Synthetic QA answer for interface review. No model call was made.'}]}}});
  const {encode}=await import('next-auth/jwt');
  const tokens={};
  for(const [role,id,claim] of [['subscriber','subscriber','SUBSCRIBER'],['expert','expert','EXPERT'],['admin','admin','ADMIN'],['forged','subscriber','ADMIN'],['banned','banned','SUBSCRIBER'],['inactive','inactive','SUBSCRIBER'],['missing','missing','ADMIN']]){
    tokens[role]=await encode({token:{id:'uiqa-'+id,role:claim,name:'Synthetic QA '+id,email:id+'@example.invalid'},secret:'synthetic-local-ui-only',salt:'authjs.session-token',maxAge:3600});
  }
  // Test cookies remain on localhost. No product auth routes, OAuth or bypass are added.
  const server=http.createServer((request,response)=>{
    const role=request.url?.replace('/session/','');if(!Object.hasOwn(tokens,role)){response.writeHead(404);response.end('Unknown fixture');return;}
    const destination=role==='expert'?'/expert':role==='admin'?'/admin':'/subscriber';
    response.writeHead(302,{'Set-Cookie':`authjs.session-token=${tokens[role]}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`,Location:'http://localhost:3417'+destination,'Cache-Control':'no-store'});response.end();
  });
  server.listen(3439,'127.0.0.1',()=>console.log('Synthetic session fixture issuer on loopback 3439'));
  const results=[];
  const check=async(role,path)=>{const response=await fetch('http://127.0.0.1:3417'+path,{redirect:'manual',headers:tokens[role]?{Cookie:'authjs.session-token='+tokens[role]}:{}});const body=await response.text();results.push({role,path,status:response.status,location:response.headers.get('location'),body:body.slice(0,120)});};
  for(const entry of [['anonymous','/api/experts'],['subscriber','/api/experts'],['subscriber','/api/expert/pricing'],['subscriber','/api/admin/users'],['expert','/api/expert/pricing'],['expert','/api/admin/users'],['admin','/api/admin/users'],['forged','/api/admin/users'],['banned','/api/experts'],['inactive','/api/experts'],['missing','/api/experts']])await check(...entry);
  const expected=[401,200,403,403,200,403,200,403,401,401,401];
  fs.writeFileSync('audit/ui-overhaul/integration/authenticated-guard-results.json',JSON.stringify({identity,results,passed:results.every((r,i)=>r.status===expected[i])},null,2));
  if(results.some((r,i)=>r.status!==expected[i]))console.error('Guard result mismatch: inspect report');
}
main().catch(error=>{console.error(error.message);process.exit(1);});
