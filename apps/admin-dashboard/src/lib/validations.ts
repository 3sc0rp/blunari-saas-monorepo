import { z } from "zod";

// User Authentication Schemas
export const signInSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain uppercase, lowercase, number, and special character",
      ),
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name too long"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name too long"),
    confirmPassword: z.string().min(8, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Profile Management Schemas
export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name too long"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name too long"),
  phone: z
    .string()
    .optional()
    .or(z.string().regex(/^\+?[\d\s-()]+$/, "Invalid phone number")),
  jobTitle: z.string().max(100, "Job title too long").optional(),
  department: z.string().max(100, "Department too long").optional(),
  bio: z.string().max(500, "Bio too long").optional(),
  timezone: z.string().min(1, "Timezone is required"),
  language: z.string().min(1, "Language is required"),
  dateFormat: z.string().min(1, "Date format is required"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain uppercase, lowercase, number, and special character",
      ),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// API Key Management Schemas
export const createAPIKeySchema = z.object({
  name: z
    .string()
    .min(1, "API key name is required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z0-9\s_-]+$/, "Name contains invalid characters"),
  description: z.string().max(500, "Description too long").optional(),
  permissions: z
    .array(z.string())
    .min(1, "At least one permission is required"),
  expiresAt: z.string().optional().or(z.date().optional()),
});

// Employee Management Schemas
export const inviteEmployeeSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPPORT", "OPS", "VIEWER"], {
    errorMap: () => ({ message: "Invalid role selected" }),
  }),
  departmentId: z.string().uuid("Invalid department ID").optional(),
});

export const updateEmployeeSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPPORT", "OPS", "VIEWER"]).optional(),
  departmentId: z.string().uuid("Invalid department ID").optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
});

// Tenant Management Schemas
export const createTenantSchema = z.object({
  name: z
    .string()
    .min(1, "Restaurant name is required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z0-9\s'&.-]+$/, "Name contains invalid characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50, "Slug too long")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers, and hyphens only",
    ),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z
    .string()
    .length(3, "Currency must be 3 characters")
    .regex(/^[A-Z]{3}$/, "Invalid currency code"),
  description: z.string().max(1000, "Description too long").optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, "Invalid phone number")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  website: z.string().url("Invalid website URL").optional(),
});

// Domain Management Schemas
export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i,
      "Invalid domain format",
    ),
  domainType: z.enum(["custom", "subdomain"], {
    errorMap: () => ({ message: "Invalid domain type" }),
  }),
});

// System Settings Schemas
export const updateSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  allowSignups: z.boolean().optional(),
  maxFileSize: z.number().int().min(1).max(100).optional(), // MB
  sessionTimeout: z.number().int().min(15).max(1440).optional(), // minutes
  rateLimitRequests: z.number().int().min(1).max(10000).optional(),
  rateLimitWindow: z.number().int().min(1).max(3600).optional(), // seconds
});

// Audit Log Schemas
export const auditLogFilterSchema = z.object({
  action: z.string().optional(),
  resourceType: z.string().optional(),
  dateFrom: z.string().or(z.date()).optional(),
  dateTo: z.string().or(z.date()).optional(),
  employeeId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

// Impersonation Schemas
export const startImpersonationSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason too long"),
  duration: z.number().int().min(5).max(480), // 5 minutes to 8 hours
});

// Input Sanitization Helpers
export const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/[<>"']/g, "") // Remove potential XSS characters
    .substring(0, 1000); // Limit length
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const sanitizeSlug = (slug: string): string => {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// File Upload Validation
export const validateFileUpload = (
  file: File,
): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 10MB" };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed",
    };
  }

  return { valid: true };
};

// Rate Limiting Helpers
export const createRateLimitKey = (
  identifier: string,
  action: string,
): string => {
  return `rate_limit:${action}:${identifier}`;
};

export const isRateLimited = (requests: number, limit: number): boolean => {
  return requests >= limit;
};

// CSRF Token Validation
export const validateCSRFToken = (
  token: string,
  expectedToken: string,
): boolean => {
  return token === expectedToken && token.length >= 32;
};

// Type exports for better type safety
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;
export type CreateAPIKeyData = z.infer<typeof createAPIKeySchema>;
export type InviteEmployeeData = z.infer<typeof inviteEmployeeSchema>;
export type CreateTenantData = z.infer<typeof createTenantSchema>;
export type AuditLogFilterData = z.infer<typeof auditLogFilterSchema>;
export type StartImpersonationData = z.infer<typeof startImpersonationSchema>;
