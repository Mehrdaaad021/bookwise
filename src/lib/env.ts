// src/lib/env.ts
/**
 * Centralized environment access with fail-fast, descriptive errors.
 * Never read process.env directly elsewhere in app code.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Missing required environment variable: ${key}. ` +
        `Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

export function optionalEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() !== "" ? value : undefined;
}