# Authorized local Groq synthetic smoke

Executed once: `node scripts/local-test/groq-synthetic.cjs --allow-synthetic-network`.
User confirmed key saved and Free plan before the parent authorized this run. Harness source was inspected immediately before execution. Only `https://api.groq.com/openai/v1/chat/completions` and `openai/gpt-oss-120b` allowed; exactly two built-in synthetic fixtures, at most 256 output tokens/request, 15-second timeout/request, nonstreaming strict JSON schema, no tools/retry/fallback. Production configuration and embeddings unchanged. No private source/visitor data supplied. Key handled only by the script; no secret-file read, environment dump or key output by the agent.

Exit code: 0. Two responses passed the harness's model, completion, structured-schema and evidence-ID validation.

| Fixture | Returned answer | Evidence IDs | Uncertain |
|---|---|---|---|
| synthetic-ada | Ada recommends written decision logs for reversible architecture decisions. | synthetic-ada | false |
| synthetic-ben | Ben recommends a small experiment before committing to a database migration. | synthetic-ben | false |

Both answers accurately restate their fixed evidence without extra personal claims. This confirms access and this narrow request/schema/fixture path; it is not a digital-twin faithfulness or naturalness evaluation, billing audit, production provider integration or embedding test.

Latency limitation: per-request timers are absent from the existing harness. The first response appeared during the initial 1.0006-second execution wait; the second was present at the subsequent completion poll. Tool wall time includes approval/orchestration and is not provider latency. Exact per-request/total provider latency is unmeasured. No repeat or extra request was made for measurement.

No database installation/start or browser integration performed; EXP19 approval remains pending.
