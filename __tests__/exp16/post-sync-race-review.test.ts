const db:any={}; const enqueue=jest.fn(async()=>({id:"index"})), run=jest.fn(async()=>{});
jest.mock("@/lib/prisma",()=>({__esModule:true,default:db}));
jest.mock("@/lib/knowledge/outbox",()=>({enqueueLifecycleJob:enqueue,runLifecycleJob:run}));
jest.mock("@/lib/graph/evidence-store",()=>({retireEvidence:jest.fn(),publishEvidence:jest.fn()}));
jest.mock("@/lib/vector/indexer",()=>({plannedVectorIds:()=>["planned"],indexDocument:jest.fn()}));
import { syncPostSource } from "@/lib/knowledge/lifecycle";
import { decideCorrection } from "@/lib/corrections/service";
test("paused post sync must preserve accepted correction projection",async()=>{
 const expert={id:"expert",userId:"owner",vectorNamespace:"ns"};
 const post:any={id:"post",authorId:"owner",title:"Advice",content:"Old statement",isRagEnabled:true,status:"PUBLISHED",isHidden:false,isPremiumOnly:false};
 const item:any={id:"item",expertProfileId:"expert",sourceType:"post",sourceId:"post",sourceVersion:1,indexedVersion:1,isIndexed:true,title:post.title,content:post.content,metadata:{postId:"post",status:"PUBLISHED",isHidden:false,isPremiumOnly:false},expertProfile:expert};
 const review={id:"review",expertProfileId:"expert",submittedBy:"owner",state:"PENDING",version:1,proposal:{itemId:"item",sourceVersion:1,title:"Advice",content:"Accepted correction",feedback:"Checked"}};
 let resume:()=>void=()=>{}, paused:()=>void=()=>{};
 const wait=new Promise<void>(resolve=>resume=resolve), atPause=new Promise<void>(resolve=>paused=resolve);
 db.post={findUnique:jest.fn(async()=>({...post})),update:jest.fn(async({data}:any)=>{Object.assign(post,data);return {...post};})};
 db.expertProfile={findUnique:jest.fn(async()=>{paused();await wait;return expert;})};
 const apply=(data:any)=>{const {sourceVersion,...other}=data;Object.assign(item,other);if(sourceVersion)item.sourceVersion+=sourceVersion.increment;};
 db.knowledgeItem={findUnique:jest.fn(async()=>({...item})),updateMany:jest.fn(async({where,data}:any)=>{if(where.sourceVersion!==item.sourceVersion)return {count:0};apply(data);return {count:1};}),upsert:jest.fn(async({update}:any)=>{apply(update);return {...item};})};
 db.$queryRaw=jest.fn(async(parts:TemplateStringsArray)=>{const sql=parts.join("?");if(sql.includes('SELECT "userId"'))return [{userId:"owner"}];if(sql.includes('FROM "CorrectionEvent"'))return [];if(sql.includes('FROM "CorrectionReview"'))return [review];return [];});
 db.$executeRaw=jest.fn(async()=>1);db.$transaction=jest.fn(async(fn:any)=>fn(db));
 const worker=syncPostSource("post");await atPause;
 const accepted=await decideCorrection({expertProfileId:"expert",actorId:"owner",reviewId:"review",expectedVersion:1,operationKey:"accept",action:"ACCEPT",reason:"Expert checked"});
 expect(accepted.state).toBe("ACCEPTED");expect(post.content).toBe("Accepted correction");expect(item.content).toBe("Accepted correction");expect(item.sourceVersion).toBe(2);
 resume();await worker;
 expect(post.content).toBe("Accepted correction");
 expect(item.content).toBe("Accepted correction");
 expect(item.sourceVersion).toBe(2); // Fresh locked reread must not create a stale v3.
});
