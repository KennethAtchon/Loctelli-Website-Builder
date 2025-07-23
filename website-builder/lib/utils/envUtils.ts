/**
 * Centralized environment variable management
 * All environment variables should be accessed through this file
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/proxy',
  // Note: API_KEY is now server-side only and handled by the proxy
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  // Custom authentication system - no NextAuth needed
} as const;

// Environment Configuration
export const ENV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;

// Validation function to ensure required environment variables are set
export function validateEnvironmentVariables(): void {
  // Note: API_KEY is now validated server-side in the proxy
  const requiredVars: Array<{ key: string; value: string; name: string }> = [
    // Add other required vars here if needed
  ];

  const missingVars = requiredVars.filter(({ value }) => !value);

  if (missingVars.length > 0) {
    const missingVarNames = missingVars.map(({ name }) => name).join(', ');
    throw new Error(`Missing required environment variables: ${missingVarNames}`);
  }
}

// Helper function to get environment variable with type safety
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

// Export all configs for easy access
export const env = {
  api: API_CONFIG,
  auth: AUTH_CONFIG,
  env: ENV_CONFIG,
} as const; 