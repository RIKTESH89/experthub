// API contract mock. Actual lifecycle races/failures are tested in phase0/lifecycle.test.ts.
import prisma from "./prisma";
export const syncKnowledgeItem = jest.fn(async (_expertId: string, itemId: string) =>
  prisma.knowledgeItem.update({ where: { id: itemId }, data: { isIndexed: true } }));
export const removeKnowledgeItem = jest.fn(async (_expertId: string, itemId: string) =>
  prisma.knowledgeItem.deleteMany({ where: { id: itemId, expertProfileId: _expertId } }));
export const syncPostSource = jest.fn(async (_postId: string) => undefined);
export const removePostSource = jest.fn(async (_postId: string, _authorId: string) => undefined);

export const withPostOutbox = async <T>(_authorId:string,mutate:(tx:typeof prisma)=>Promise<T>) => mutate(prisma);
