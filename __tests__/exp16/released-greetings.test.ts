import prisma,{resetAllMocks} from '../mocks/prisma';
const presentation=jest.fn();
jest.mock('@/lib/prisma',()=>({__esModule:true,default:prisma}));
jest.mock('@/lib/persona/serving',()=>({resolveReleasedPresentation:presentation}));
jest.mock('@/lib/auth',()=>({auth:jest.fn(async()=>({user:{id:'visitor'}}))}));
jest.mock('@/lib/trial',()=>({checkTrialAccess:jest.fn(async()=>({allowed:true}))}));
import { GET as widget } from '@/app/api/widget/config/route';
import { POST as session } from '@/app/api/chat/sessions/route';
import { NextRequest } from 'next/server';
const released={releaseId:'r',format:'persona-release-v2',displayName:'Approved name',greeting:'Approved chat',widgetGreeting:'Approved widget'};
beforeEach(()=>{
 resetAllMocks();presentation.mockReset().mockResolvedValue(released);prisma.$queryRaw.mockResolvedValue([{id:'expert'}]);
 prisma.widgetConfig.findUnique.mockResolvedValue({expertProfileId:'expert',isEnabled:true,greeting:'Draft widget',expertProfile:{displayName:'Draft name',twinGreeting:'Draft chat',user:{name:'Draft user'}}});
 prisma.expertProfile.findUnique.mockResolvedValue({id:'expert',userId:'owner',displayName:'Draft name',twinGreeting:'Draft chat',user:{name:'Draft user'}});
 prisma.chatSession.create.mockResolvedValue({id:'session',expertProfile:{displayName:'Draft name',twinGreeting:'Draft chat'}});prisma.chatMessage.create.mockResolvedValue({id:'greeting'});
});
test('widget displays released identity/greeting despite later draft changes',async()=>{
 const response=await widget(new NextRequest('http://localhost/api/widget/config?apiKey=synthetic'));expect(await response.json()).toMatchObject({expertName:'Approved name',greeting:'Approved widget'});
});
test('v2 null widget greeting uses generic default, never draft',async()=>{
 presentation.mockResolvedValue({...released,widgetGreeting:null});const response=await widget(new NextRequest('http://localhost/api/widget/config?apiKey=synthetic'));expect(await response.json()).toMatchObject({greeting:'Hello! Ask me anything.'});
});
test('disabled widget does not read release',async()=>{
 prisma.widgetConfig.findUnique.mockResolvedValue({isEnabled:false});expect((await widget(new NextRequest('http://localhost/api/widget/config?apiKey=synthetic'))).status).toBe(404);expect(presentation).not.toHaveBeenCalled();
});
test.each(['Approved chat',null])('session greeting uses release snapshot %s inside transaction',async greeting=>{
 presentation.mockResolvedValue({...released,greeting});const response=await session(new NextRequest('http://localhost/api/chat/sessions',{method:'POST',body:JSON.stringify({expertId:'owner'})}));expect(response.status).toBe(201);expect((await response.json()).expertProfile.twinGreeting).toBe(greeting);expect(presentation).toHaveBeenCalledWith('expert',prisma);
 if(greeting)expect(prisma.chatMessage.create).toHaveBeenCalledWith({data:{chatSessionId:'session',role:'assistant',content:greeting}});else expect(prisma.chatMessage.create).not.toHaveBeenCalled();
 const lockCall=prisma.$queryRaw.mock.invocationCallOrder[0];expect(lockCall).toBeLessThan(prisma.chatSession.create.mock.invocationCallOrder[0]);
});
