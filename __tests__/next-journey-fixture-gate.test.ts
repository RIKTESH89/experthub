import Page from '@/app/e/design-preview/next-journeys/page';
jest.mock('next/navigation',()=>({notFound:()=>{throw new Error('Not found');}}));
jest.mock('@/components/expert-studio/next-journey-fixture',()=>({NextJourneyFixture:()=>null}));
const originalEnv=process.env;
afterEach(()=>{process.env=originalEnv;});
it('refuses the fixture in production even with the flag',()=>{process.env={...originalEnv,NODE_ENV:'production',EXPERTHUB_UI_FIXTURES:'1'};expect(()=>Page()).toThrow('Not found');});
it('refuses development without an explicit fixture flag',()=>{process.env={...originalEnv,NODE_ENV:'development',EXPERTHUB_UI_FIXTURES:'0'};expect(()=>Page()).toThrow('Not found');});
it('renders explicitly enabled local development only',()=>{process.env={...originalEnv,NODE_ENV:'development',EXPERTHUB_UI_FIXTURES:'1'};expect(Page()).toBeTruthy();});
