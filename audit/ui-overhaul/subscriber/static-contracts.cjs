const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');
const postcss = require('postcss');
const checkpoint = '9e0f49d2bcc474a9c7896497bfe546c9356d87a4';
const read = p => fs.readFileSync(p,'utf8');
const baseline = p => cp.execFileSync('git',['show',`${checkpoint}:${p}`],{encoding:'utf8'});
const chat = 'src/app/(dashboard)/subscriber/experts/[expertId]/chat/page.tsx';
assert(read(chat).includes('const hasAccess = expert.isSubscribed || trialStatus?.hasTrialAccess;'));
assert(read(chat).includes('if (!hasAccess)'));
for (const file of [chat,'src/app/(dashboard)/subscriber/experts/[expertId]/page.tsx']) {
  const original = baseline(file), current = read(file);
  const start = '  useEffect(() => {';
  const end = '  if (isLoading)';
  assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),original.slice(original.indexOf(start),original.indexOf(end)),`${file}: fetching / verification behavior preserved`);
}
for (const file of ['src/app/(dashboard)/subscriber/layout.tsx','src/middleware.ts','src/lib/route-access.ts','src/app/(auth)/register/page.tsx']) assert.equal(read(file),baseline(file));
for (const file of ['src/app/studio.css','src/components/chat/chat-interface.tsx']) assert.equal(read(file),baseline(file));
for (const file of ['src/components/subscriber/subscriber-studio.module.css','src/app/(auth)/auth-forms.module.css']) postcss.parse(read(file));
const normalize = s => s.replaceAll('../../task-3/experthub-ui/','');
assert.equal(normalize(read('audit/ui-overhaul/subscriber/types-baseline.log')),read('audit/ui-overhaul/subscriber/types-final.log'));
console.log('PASS: access predicate, expert/payment-verification effects, role guards, register redirect, shared CSS/chat unchanged; CSS parses; type errors identical to baseline.');
