/**
 * Environment variable helpers
 * 
 * Provides type-safe access to environment variables with validation.
 */

/**
 * Gets a required environment variable, throwing an error if it's missing.
 * 
 * @param name - The name of the environment variable
 * @returns The environment variable value
 * @throws Error if the environment variable is not set
 * 
 * @example
 * const apiKey = getRequiredEnv('MATHPIX_APP_KEY');
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * Gets an optional environment variable, returning a default value if not set.
 * 
 * @param name - The name of the environment variable
 * @param defaultValue - Default value to return if env var is not set
 * @returns The environment variable value or the default
 * 
 * @example
 * const port = getOptionalEnv('PORT', '3000');
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

