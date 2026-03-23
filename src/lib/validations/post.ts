import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  isRagEnabled: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  isPremiumOnly: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  media: z.array(z.object({
    type: z.enum(["TEXT", "VIDEO", "AUDIO", "IMAGE"]),
    url: z.string().min(1),
    thumbnail: z.string().optional(),
    duration: z.number().optional(),
    order: z.number().default(0),
  })).default([]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
