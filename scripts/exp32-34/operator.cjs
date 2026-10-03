#!/usr/bin/env node
// Synthetic-only operator entry point. Never load .env or query a remote database.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Module = require('module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '../../src', name.slice(2)) : name, ...args); };
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
function localDatabase() {
 const url = new URL(process.env.DATABASE_URL || '');
 if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.port !== '55438' || url.pathname !== '/billing_synthetic' || url.username !== 'billing_synthetic' || url.search || url.hash) throw Error('Apply/recovery is restricted to the owned synthetic database');
 process.env.DIRECT_URL = process.env.DATABASE_URL;
}
async function main() {
 const file = option('--input');
 if (!file || !['reconcile', 'recover'].includes(args[0])) throw Error('Usage: operator.cjs reconcile|recover --input review.json [--apply --reviewed-digest SHA256]');
 const input = JSON.parse(fs.readFileSync(file, 'utf8'));
 const { planReconciliation, reconcile } = require('../../src/lib/payments/reconciliation');
 if (args[0] === 'reconcile') {
  const evidence = { ...input.evidence, start: new Date(input.evidence.start), end: new Date(input.evidence.end) };
  const plan = planReconciliation(input.row, evidence);
  if (!args.includes('--apply')) return console.log(JSON.stringify({ outcome: 'dry-run', plan }, null, 2));
  if (option('--reviewed-digest') !== plan.digest) throw Error('Explicit reviewed digest required');
  localDatabase();
  const { reconciliationStore } = require('../../src/lib/payments/billing-store');
  console.log(JSON.stringify(await reconcile(plan, reconciliationStore, { apply: true, reviewedDigest: option('--reviewed-digest') })));
 } else {
  const digest = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
  if (!args.includes('--apply')) return console.log(JSON.stringify({ outcome: 'dry-run', digest, input }, null, 2));
  if (option('--reviewed-digest') !== digest) throw Error('Explicit reviewed digest required');
  localDatabase();
  const { recoverProvisioning } = require('../../src/lib/payments/provisioning');
  const { provisioningStore } = require('../../src/lib/payments/provisioning-store');
  await recoverProvisioning(input.intent, { ...input.evidence, reviewed: true }, provisioningStore);
  console.log(JSON.stringify({ outcome: 'attached', digest }));
 }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async()=>{
 // Dry-run must never instantiate Prisma or read database rows.
 const loaded = require.cache[require.resolve('../../src/lib/prisma.ts')];
 if (loaded) await loaded.exports.default.$disconnect();
});
