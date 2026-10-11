import { defineConfig } from 'prisma/config';
import { resolve } from 'path';
const url=new URL(process.env.DATABASE_URL || 'postgresql://invalid');
if(process.env.EXP16_NATIVE_FULL_SCHEMA!=='1' || process.env.EXP16_OWNED_SYNTHETIC_CLUSTER!=='1' || url.username!=='exp16_fixture' || url.hostname!=='localhost' || url.pathname!=='/exp16_replay_fixture' || !/^\/tmp\/exp16-replay-fixture-[a-z0-9_]+\/socket$/.test(url.searchParams.get('host')||'')) throw new Error('Full-schema migrations require the newly runner-owned private-socket fixture');
// Explicit config avoids root dotenv/config and never writes/generated shared dependencies.
export default defineConfig({schema:resolve(__dirname,'../../prisma/schema.prisma'),migrations:{path:resolve(__dirname,'../../prisma/migrations')},engine:'classic',datasource:{url:process.env.DATABASE_URL!}});
