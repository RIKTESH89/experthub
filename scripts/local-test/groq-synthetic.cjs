/* Local-only, fixed synthetic evidence. Never imports application/source data. */
const ENDPOINT = "https://api.groq.com/openai/v1";
const MODEL = "openai/gpt-oss-120b";
const MAX_REQUESTS = 2;
const MAX_TOKENS = 256;
const fixtures = Object.freeze([
 { id:"synthetic-ada", evidence:"Synthetic expert Ada recommends written decision logs for reversible architecture decisions.", question:"What does Ada recommend for reversible architecture decisions?" },
 { id:"synthetic-ben", evidence:"Synthetic expert Ben recommends a small experiment before committing to a database migration.", question:"What does Ben recommend before a database migration?" },
]);
function createSyntheticRunner(config, fetchImpl = globalThis.fetch) {
 if (config.baseUrl !== ENDPOINT || config.model !== MODEL) throw new Error("Only the approved Groq test endpoint/model is allowed");
 if (typeof config.apiKey !== "string" || !config.apiKey.trim()) throw new Error("Configure LOCAL_TEST_GROQ_API_KEY locally");
 let requests = 0;
 return async function run(fixtureIndex) {
  if (!Number.isInteger(fixtureIndex) || !fixtures[fixtureIndex]) throw new Error("Only built-in synthetic fixtures are allowed");
  if (requests >= MAX_REQUESTS) throw new Error("Local smoke request cap reached");
  requests++;
  const fixture = fixtures[fixtureIndex];
  const response = await fetchImpl(`${ENDPOINT}/chat/completions`, {
   method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${config.apiKey}`},
   signal:AbortSignal.timeout(15000),
   body:JSON.stringify({model:MODEL,stream:false,max_tokens:MAX_TOKENS,temperature:0,
    messages:[{role:"system",content:"Answer using only the supplied synthetic evidence. Do not add experiences, motives or beliefs. Cite the evidence ID or express uncertainty."},
      {role:"user",content:JSON.stringify({evidenceId:fixture.id,evidence:fixture.evidence,question:fixture.question})}],
    response_format:{type:"json_schema",json_schema:{name:"synthetic_answer",strict:true,schema:{type:"object",properties:{answer:{type:"string"},evidenceIds:{type:"array",items:{type:"string"}},uncertain:{type:"boolean"}},required:["answer","evidenceIds","uncertain"],additionalProperties:false}}},
   }),
  });
  if (!response.ok) throw new Error(`Groq smoke HTTP ${response.status}; no retry or fallback`);
  const data = await response.json();
  if (data.model !== MODEL || data.choices?.length !== 1 || data.choices[0].finish_reason !== "stop") throw new Error("Unexpected model or incomplete response");
  let result;
  try { result=JSON.parse(data.choices[0].message.content); } catch { throw new Error("Invalid structured response"); }
  if (!result || typeof result.answer!=="string" || typeof result.uncertain!=="boolean" || !Array.isArray(result.evidenceIds) ||
    result.evidenceIds.some(id=>id!==fixture.id) || Object.keys(result).sort().join(",")!=="answer,evidenceIds,uncertain" || (!result.uncertain && !result.evidenceIds.length)) throw new Error("Response fails synthetic evidence schema");
  return {fixtureId:fixture.id,model:MODEL,result};
 };
}
module.exports={createSyntheticRunner,fixtures,ENDPOINT,MODEL,MAX_REQUESTS,MAX_TOKENS};
if (require.main === module) {
 if (!process.argv.includes("--allow-synthetic-network")) { process.stderr.write("Network disabled: authorization required before --allow-synthetic-network\n"); process.exitCode=1; }
 else {
  require("dotenv").config({path:require("path").resolve(__dirname,"../../.env.local-test-groq"),quiet:true});
  (async()=>{
   const run=createSyntheticRunner({apiKey:process.env.LOCAL_TEST_GROQ_API_KEY,baseUrl:process.env.LOCAL_TEST_GROQ_BASE_URL,model:process.env.LOCAL_TEST_GROQ_MODEL});
   for(let i=0;i<fixtures.length;i++) process.stdout.write(JSON.stringify(await run(i))+"\n");
  })().catch(()=>{process.stderr.write("Synthetic smoke failed; secret and provider body omitted. No retry/fallback performed.\n");process.exitCode=1;});
 }
}
