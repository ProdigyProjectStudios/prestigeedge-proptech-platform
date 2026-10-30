import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { basename } from "node:path";

export const VAULT_MAX_BYTES = 5 * 1024 * 1024;
export const SYNTHETIC_LISTING_ID = "MNA-2047";

export function vaultConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEALROOM_STORAGE === "postgres" &&
    env.DEALROOM_VAULT_ENABLED === "true" &&
    typeof env.DEALROOM_DOCUMENT_ENCRYPTION_KEY === "string" &&
    /^[a-f0-9]{64}$/i.test(env.DEALROOM_DOCUMENT_ENCRYPTION_KEY);
}

export function vaultKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  if (!vaultConfigured(env)) throw new Error("Encrypted Deal Room vault is not configured");
  return Buffer.from(env.DEALROOM_DOCUMENT_ENCRYPTION_KEY!, "hex");
}

/** Never use the vault for public or real listings until per-tenant classification is finished. */
export function vaultListingAllowed(listingId: string): boolean {
  return listingId === SYNTHETIC_LISTING_ID;
}

export function sanitizePdfFilename(name: string): string {
  const clean = basename(name.replaceAll("\\", "/")).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120);
  if (!clean.toLowerCase().endsWith(".pdf") || clean.startsWith(".")) {
    throw new Error("A valid PDF filename is required");
  }
  return clean;
}

export function validatePdf(bytes: Buffer, name: string, mime?: string): string {
  const safeName = sanitizePdfFilename(name);
  if (!Buffer.isBuffer(bytes) || bytes.length < 8 || bytes.length > VAULT_MAX_BYTES) {
    throw new Error("PDF size must be between 8 bytes and 5 MiB");
  }
  // Restrict mime and magic header. This is NOT malware scanning; never inline-render uploaded PDFs.
  if (mime !== "application/pdf" || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-", "ascii"))) {
    throw new Error("Only PDF file uploads are supported");
  }
  return safeName;
}

export interface VaultCiphertext {
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
  sha256: string;
  originalLength: number;
}

export interface VaultContext {
  listingId: string;
  documentId: string;
  version: number;
}

function aad(ctx: VaultContext): Buffer {
  return Buffer.from(JSON.stringify([ctx.listingId, ctx.documentId, ctx.version]), "utf8");
}

export function encryptPdf(plaintext: Buffer, key: Buffer, ctx: VaultContext): VaultCiphertext {
  if (key.length !== 32) throw new Error("Expected AES-256 key");
  if (!vaultListingAllowed(ctx.listingId) || ctx.version < 1 || !Number.isInteger(ctx.version)) {
    throw new Error("Invalid vault context");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(ctx));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    iv, tag: cipher.getAuthTag(), ciphertext,
    sha256: createHash("sha256").update(plaintext).digest("hex"),
    originalLength: plaintext.length,
  };
}

export function decryptPdf(data: VaultCiphertext, key: Buffer, ctx: VaultContext): Buffer {
  if (key.length !== 32 || data.iv.length !== 12 || data.tag.length !== 16) {
    throw new Error("Invalid vault encryption metadata");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, data.iv);
  decipher.setAAD(aad(ctx));
  decipher.setAuthTag(data.tag);
  const plain = Buffer.concat([decipher.update(data.ciphertext), decipher.final()]);
  const check = createHash("sha256").update(plain).digest();
  const storedHash = Buffer.from(data.sha256, "hex");
  if (plain.length !== data.originalLength || storedHash.length !== 32 ||
      !timingSafeEqual(check, storedHash)) throw new Error("Vault document integrity check failed");
  return plain;
}
