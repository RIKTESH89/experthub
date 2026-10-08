import { z } from 'zod';
import { READ_CONTRACT_VERSION, RETRIEVAL_BUDGET } from '@/lib/retrieval/intent';
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '@/lib/vector/embedding-policy';
// Policies are reader contracts. Dynamic evidence/memories/access remain live.
const readerPolicy=()=>({retrieval:{contract:READ_CONTRACT_VERSION,budget:{...RETRIEVAL_BUDGET},embeddingModel:EMBEDDING_MODEL,embeddingDimensions:EMBEDDING_DIMENSIONS},history:{messages:20,ownerAssistant:'live-owner-v1'},memory:{enabled:true,limit:15},web:{allowed:true}});
export const runtimeSchema=z.strictObject({
 version:z.literal('persona-runtime-v1'),
 generation:z.strictObject({model:z.string().trim().min(1).max(160),temperature:z.literal(0.5),maxTokens:z.literal(2048)}),
 retrieval:z.strictObject({contract:z.string(),budget:z.strictObject({candidates:z.number(),chunks:z.number(),evidence:z.number(),tokens:z.number(),hops:z.number()}),embeddingModel:z.string(),embeddingDimensions:z.number()}),
 history:z.strictObject({messages:z.literal(20),ownerAssistant:z.literal('live-owner-v1')}),
 memory:z.strictObject({enabled:z.literal(true),limit:z.literal(15)}),web:z.strictObject({allowed:z.literal(true)}),
});
export type RuntimePolicy=z.infer<typeof runtimeSchema>;
export function currentRuntimePolicy():RuntimePolicy {return runtimeSchema.parse({version:'persona-runtime-v1',generation:{model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:0.5,maxTokens:2048},...readerPolicy()});}
export function supportedRuntimePolicy(value:unknown):value is RuntimePolicy {
 const result=runtimeSchema.safeParse(value);if(!result.success)return false;
 const reader={retrieval:result.data.retrieval,history:result.data.history,memory:result.data.memory,web:result.data.web};
 return JSON.stringify(reader)===JSON.stringify(readerPolicy());
}

export const greetingsSchema=z.strictObject({chat:z.string().nullable(),widget:z.string().nullable()});
export function supportedReplayCapsule(runtime:unknown,greetings:unknown) {return supportedRuntimePolicy(runtime) && greetingsSchema.safeParse(greetings).success;}
