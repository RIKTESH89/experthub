import type { KnowledgeItem } from '@prisma/client';
import { manifestHash } from '@/lib/persona/manifest';
/** Parsed-source provenance only: upload ownership is not authorship; the binary
 * file and historical uploader are unavailable in the current import schema.
 * This capsule is stored in the append-only submission event, never a belief.
 */
export function importedSnapshot(item:KnowledgeItem,ownerAtSubmission:string) {
 if(!['pdf','blog'].includes(item.sourceType))return null;
 const snapshot={title:item.title,content:item.content,metadata:item.metadata};
 if(Buffer.byteLength(JSON.stringify(snapshot),'utf8')>128000)throw new Error('Imported snapshot exceeds review audit bound');
 return {kind:'imported-parsed-source-v1',expertProfileId:item.expertProfileId,itemId:item.id,
  sourceType:item.sourceType,sourceId:item.sourceId,sourceVersion:item.sourceVersion,
  ownerAtSubmission,authorId:null,uploaderId:null,binaryHash:null,attribution:'unverified-import',
  contentHash:manifestHash([item.title,item.content]),snapshotHash:manifestHash({...snapshot,sourceType:item.sourceType,sourceId:item.sourceId,sourceVersion:item.sourceVersion}),snapshot};
}
