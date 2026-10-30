/** Require unpredictable signing keys for authenticated deployments.
 * Local development can still use a deliberately non-production fallback.
 */
export function selectJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const supplied = env.JWT_SECRET;
  if (supplied && supplied.length >= 32 && supplied !== "your-super-secret-jwt-key") {
    return supplied;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be a strong, explicitly configured secret in production");
  }
  return "development-only-not-for-production-insecure-key";
}
