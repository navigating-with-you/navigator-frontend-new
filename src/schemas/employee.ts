import { z } from "zod";

const nameRegex = /^[a-zA-Z\s'-]+$/;
const employeeCodeRegex = /^[A-Za-z0-9\-_.]*$/;
const employeeCodeStartEndRegex = /^[A-Za-z0-9].*[A-Za-z0-9]$|^[A-Za-z0-9]$|^$/;

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
    employeeCode: z
        .string()
        .trim()
        .max(50, "Employee code must be at most 50 characters")
        .regex(employeeCodeRegex, "Employee code can only contain alphanumeric characters, hyphens, underscores, and dots")
        .regex(employeeCodeStartEndRegex, "Employee code cannot start or end with a special character")
        .optional()
        .or(z.literal("")),
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
    employeeCode: z
        .string()
        .trim()
        .max(50, "Employee code must be at most 50 characters")
        .regex(employeeCodeRegex, "Employee code can only contain alphanumeric characters, hyphens, underscores, and dots")
        .regex(employeeCodeStartEndRegex, "Employee code cannot start or end with a special character")
        .optional()
        .or(z.literal("")),
});
