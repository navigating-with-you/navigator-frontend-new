import { z } from "zod";

export const teamSchema = z.object({
    name: z.string()
        .min(1, "Category name is required")
        .min(3, "Category name must be at least 3 characters")
        .max(50, "Category name cannot exceed 50 characters")
        .regex(/^[a-zA-Z0-9\s\-_]+$/, "Category name can only contain letters, numbers, spaces, hyphens, and underscores"),
    description: z.string()
        .max(200, "Description cannot exceed 200 characters")
        .optional()
        .or(z.literal("")),
});

export type TeamInput = z.infer<typeof teamSchema>;
