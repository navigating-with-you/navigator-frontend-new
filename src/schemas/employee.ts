import { z } from "zod";

const nameRegex = /^[a-zA-Z\s'-]+$/;

export const employeeInviteSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(1, "First name is required")
        .max(50, "First name must be 50 characters or less")
        .regex(nameRegex, "First name contains invalid characters"),
    lastName: z
        .string()
        .trim()
        .max(50, "Last name must be 50 characters or less")
        .regex(nameRegex, "Last name contains invalid characters")
        .optional()
        .or(z.literal("")),
    email: z
        .string()
        .trim()
        .min(1, "Email is required")
        .email("Please enter a valid email address")
        .max(255, "Email must be 255 characters or less"),
    roleId: z.string().min(1, "Please select a role"),
});

export const employeeEditSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(1, "First name is required")
        .max(50, "First name must be 50 characters or less")
        .regex(nameRegex, "First name contains invalid characters"),
    lastName: z
        .string()
        .trim()
        .max(50, "Last name must be 50 characters or less")
        .regex(nameRegex, "Last name contains invalid characters")
        .optional()
        .or(z.literal("")),
    email: z
        .string()
        .trim()
        .min(1, "Email is required")
        .email("Please enter a valid email address")
        .max(255, "Email must be 255 characters or less"),
});
