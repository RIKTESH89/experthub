import Page from '@/app/e/design-preview/journeys/page';
jest.mock('next/navigation',()=>({notFound:()=>{throw new Error('Not found');}}));
jest.mock('@/components/expert-studio/product-journey-fixture',()=>({ProductJourneyFixture:()=>null}));
const originalEnv=process.env;
afterEach(()=>{process.env=originalEnv;});
it('refuses the synthetic fixture outside development even if explicitly enabled',()=>{
 process.env={...originalEnv,NODE_ENV:'production',EXPERTHUB_UI_FIXTURES:'1'};expect(()=>Page()).toThrow('Not found');
});
it('refuses development access without the explicit fixture flag',()=>{
 process.env={...originalEnv,NODE_ENV:'development',EXPERTHUB_UI_FIXTURES:'0'};expect(()=>Page()).toThrow('Not found');
});
it('renders only the explicitly enabled development fixture',()=>{
 process.env={...originalEnv,NODE_ENV:'development',EXPERTHUB_UI_FIXTURES:'1'};expect(Page()).toBeTruthy();
});
