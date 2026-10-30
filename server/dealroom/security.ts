import { createHash } from "node:crypto";

/** Demo access is opt-in on deployed production instances. */
export function demoAccessEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.DEALROOM_DEMO_ACCESS === "false") return false;
  if (env.NODE_ENV === "production") return env.DEALROOM_DEMO_ACCESS === "true";
  return true;
}

export function postgresDealRoomEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEALROOM_STORAGE === "postgres";
}

/** Hash bearer credentials at rest; the unhashed credential is returned only to its owner. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Public reviewer sessions may only interact with the synthetic Deal Room case. */
export function demoListingAllowed(kind: "demo" | "authenticated" | undefined, listingId: string): boolean {
  return kind === "authenticated" || listingId === "MNA-2047";
}
