/**
 * Environment variable validation and management
 * Validates required environment variables at startup
 */

import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Required Supabase configuration
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anonymous key is required'),
  
  // Optional configuration
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_ADMIN_ALLOWED_DOMAINS: z.string().default('blunari.ai'),
  VITE_ENABLE_ADMIN_SELF_SIGNUP: z.enum(['true', 'false']).default('false'),
  VITE_BACKGROUND_OPS_URL: z.string().url().optional(),
  
  // Mode (automatically set by Vite)
  MODE: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws error if validation fails
 */
function parseEnv(): Env {
  const rawEnv = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_ADMIN_ALLOWED_DOMAINS: import.meta.env.VITE_ADMIN_ALLOWED_DOMAINS,
    VITE_ENABLE_ADMIN_SELF_SIGNUP: import.meta.env.VITE_ENABLE_ADMIN_SELF_SIGNUP,
    VITE_BACKGROUND_OPS_URL: import.meta.env.VITE_BACKGROUND_OPS_URL,
    MODE: import.meta.env.MODE,
  };

  try {
    return envSchema.parse(rawEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');
      
      throw new Error(
        `❌ Environment variable validation failed:\n${missingVars}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
}

// Parse and export validated environment variables
export const env = parseEnv();

/**
 * Helper functions for environment checks
 */
export const isDevelopment = env.MODE === 'development';
export const isProduction = env.MODE === 'production';
export const isTest = env.MODE === 'test';

/**
 * Check if admin self-signup is enabled
 */
export const isAdminSelfSignupEnabled = env.VITE_ENABLE_ADMIN_SELF_SIGNUP === 'true';

/**
 * Get allowed admin domains
 */
export const getAllowedAdminDomains = (): string[] => {
  return env.VITE_ADMIN_ALLOWED_DOMAINS.split(',').map((d) => d.trim().toLowerCase());
};

/**
 * Check if email domain is allowed for admin access
 */
export const isAllowedAdminDomain = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return getAllowedAdminDomains().includes(domain);
};
