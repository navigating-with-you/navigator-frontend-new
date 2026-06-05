import { z } from "zod";

const isValidPostalCode = (postalCode: string, country: string): boolean => {
    const cleanCode = postalCode.trim();
    switch (country.toUpperCase()) {
        case "US":
            return /^\d{5}(-\d{4})?$/.test(cleanCode);
        case "IN":
            return /^\d{6}$/.test(cleanCode);
        case "CA":
            return /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(cleanCode);
        case "GB":
            return /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/.test(cleanCode);
        case "AU":
            return /^\d{4}$/.test(cleanCode);
        case "DE":
        case "FR":
        case "IT":
        case "ES":
            return /^\d{5}$/.test(cleanCode);
        default:
            return /^[A-Za-z0-9 -]{3,12}$/.test(cleanCode);
    }
};

export const organizationCreateSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Organization Name is required")
        .max(255, "Organization Name cannot exceed 255 characters"),
    email: z
        .string()
        .trim()
        .max(255, "Email cannot exceed 255 characters")
        .email("Please enter a valid email address")
        .optional()
        .or(z.literal("")),
    contactNumber: z
        .string()
        .trim()
        .refine(
            (val) => !val || (val.length >= 5 && val.length <= 15),
            "Contact phone number must be between 5 and 15 digits"
        )
        .optional()
        .or(z.literal("")),
    address: z
        .string()
        .trim()
        .min(1, "Billing address is required")
        .max(255, "Address Line 1 cannot exceed 255 characters"),
    city: z
        .string()
        .trim()
        .min(1, "City is required")
        .max(100, "City cannot exceed 100 characters"),
    stateProvince: z
        .string()
        .trim()
        .min(1, "State or Province is required")
        .max(100, "State or Province cannot exceed 100 characters"),
    country: z.string().min(2, "Country is required").max(2),
    postalCode: z
        .string()
        .trim()
        .min(1, "Postal Code is required")
        .max(20, "Postal Code cannot exceed 20 characters"),
}).superRefine((data, ctx) => {
    if (data.postalCode && !isValidPostalCode(data.postalCode, data.country)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid postal code format for ${data.country}`,
            path: ["postalCode"],
        });
    }
});
