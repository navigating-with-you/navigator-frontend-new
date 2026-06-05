import { z } from "zod";

export const folderSchema = z.object({
    name: z.string()
        .min(1, "Folder name is required")
        .min(2, "Folder name must be at least 2 characters")
        .max(100, "Folder name cannot exceed 100 characters")
        .regex(/^[a-zA-Z0-9\s\-_\\.()]+$/, "Folder name can only contain letters, numbers, spaces, hyphens, underscores, dots, and parentheses")
        .refine(val => !val.includes(".."), {
            message: "Folder name cannot contain consecutive dots"
        }),
    description: z.string()
        .max(200, "Description cannot exceed 200 characters")
        .optional()
        .or(z.literal("")),
});

export const fileSchema = z.object({
    name: z.string()
        .min(1, "File name is required")
        .min(2, "File name must be at least 2 characters")
        .max(100, "File name cannot exceed 100 characters")
        .regex(/^[a-zA-Z0-9\s\-_\\.()]+$/, "File name can only contain letters, numbers, spaces, hyphens, underscores, dots, and parentheses"),
    description: z.string()
        .max(200, "Description cannot exceed 200 characters")
        .optional()
        .or(z.literal("")),
});

export type FolderInput = z.infer<typeof folderSchema>;
export type FileInput = z.infer<typeof fileSchema>;
