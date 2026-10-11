import { readFileSync } from "fs";
import { runInNewContext } from "vm";
const setup=readFileSync("scripts/launch-integration/setup.exp14.cjs","utf8");
function run(env:Record<string,string>) {runInNewContext(setup,{process:{env},URL,global:{}});return env;}
const owned={EXP14_OWNED_SYNTHETIC_CLUSTER:"1",DATABASE_URL:"postgresql://integration_synthetic@localhost/integration_exp14?host=%2Ftmp%2Fexperthub-exp14-acceptance-unit%2Fsocket"};
test("explicit owned socket target is retained with matching direct URL",()=>{expect(run({...owned}).DIRECT_URL).toBe(owned.DATABASE_URL);});
test("normal fixture mode retains the frozen fixed-port target",()=>{expect(run({DATABASE_URL:"postgresql://unsafe@host/live"}).DATABASE_URL).toBe("postgresql://integration_synthetic@127.0.0.1:55447/integration_exp14");});
test.each([
 "postgresql://integration_synthetic@localhost/production?host=/tmp/experthub-exp14-acceptance-unit/socket",
 "postgresql://wrong_role@localhost/integration_exp14?host=/tmp/experthub-exp14-acceptance-unit/socket",
 "postgresql://integration_synthetic@localhost/integration_exp14",
 "postgresql://integration_synthetic@localhost/integration_exp14?host=/tmp/experthub-exp14-acceptance-unit/../live",
 "postgresql://integration_synthetic:credential@localhost/integration_exp14?host=/tmp/experthub-exp14-acceptance-unit/socket",
])("owned mode rejects an unsafe target %s",DATABASE_URL=>expect(()=>run({...owned,DATABASE_URL})).toThrow("Unsafe owned EXP14 socket fixture"));
