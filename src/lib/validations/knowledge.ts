import { z } from "zod";

export const createKnowledgeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  sourceType: z.enum(["manual", "document", "post"]).default("manual"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateKnowledgeInput = z.infer<typeof createKnowledgeSchema>;
