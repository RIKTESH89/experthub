import { writeFileSync } from "fs";
import { resolve, relative } from "path";
import { evaluateHeldoutConversations } from "./runner";
import { localDialogueEvaluationEnabled } from "../../src/lib/ai/dialogue/local-evaluation";
async function main() {
    if (!localDialogueEvaluationEnabled())
        throw new Error("Set explicit local evaluation opt-in in a development/test runtime");
    const argument = process.argv[2] || "audit/launch-integration/exp15-exp17-synthetic-evaluation.json";
    const target = resolve(argument), within = relative(process.cwd(), target);
    if (within.startsWith("..") || within.startsWith("/"))
        throw new Error("Report must stay in the owned checkout");
    const report = await evaluateHeldoutConversations();
    writeFileSync(target, JSON.stringify(report, null, 2) + "\n");
    process.stdout.write(JSON.stringify({ report: within, mode: report.mode, turns: report.turns.length, contractFailures: report.turns.filter(t => Object.values(t.contractChecks).some(v => !v)).length, realProviderCalls: 0 }) + "\n");
}
main().catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
