import { z } from "zod";

export const expertProfileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  specialty: z.array(z.string()).min(1, "At least one specialty is required"),
  bio: z.string().optional(),
  headline: z.string().optional(),
  monthlyPrice: z.number().min(0.99, "Minimum price is $0.99"),
  socialLinks: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
  twinPersonality: z.string().optional(),
  twinGreeting: z.string().optional(),
});

export type ExpertProfileInput = z.infer<typeof expertProfileSchema>;
