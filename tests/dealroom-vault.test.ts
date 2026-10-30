import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  vaultConfigured, vaultKey, vaultListingAllowed, sanitizePdfFilename,
  validatePdf, encryptPdf, decryptPdf,
} from "../server/dealroom/vault-crypto";

const key = Buffer.alloc(32, 7);
const fixture = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const scope = { listingId: "MNA-2047", documentId: "file-uuid", version: 1 };

describe("Encrypted Deal Room vault", () => {
  it("requires an explicit postgres switch and a full-length encryption key", () => {
    assert.equal(vaultConfigured({}), false);
    assert.equal(vaultConfigured({ DEALROOM_VAULT_ENABLED: "true", DEALROOM_STORAGE: "postgres", DEALROOM_DOCUMENT_ENCRYPTION_KEY: "test" }), false);
    const configured = {
      DEALROOM_STORAGE: "postgres", DEALROOM_VAULT_ENABLED: "true",
      DEALROOM_DOCUMENT_ENCRYPTION_KEY: "ab".repeat(32),
    };
    assert.equal(vaultConfigured(configured), true);
    assert.equal(vaultKey(configured).length, 32);
  });
  it("hard-restricts documents to the fictional listing", () => {
    assert.equal(vaultListingAllowed("MNA-2047"), true);
    assert.equal(vaultListingAllowed("real-property-id"), false);
  });
  it("checks file content, type, traversal and bounded size", () => {
    assert.equal(validatePdf(fixture, "../../safe.pdf", "application/pdf"), "safe.pdf");
    assert.equal(sanitizePdfFilename("file.PDF"), "file.PDF");
    assert.throws(() => validatePdf(fixture, "file.txt", "application/pdf"));
    assert.throws(() => validatePdf(fixture, "file.pdf", "application/octet-stream"));
    assert.throws(() => validatePdf(Buffer.from("malware.exe"), "file.pdf", "application/pdf"));
    assert.throws(() => validatePdf(Buffer.alloc(5 * 1024 * 1024 + 1), "file.pdf", "application/pdf"));
  });
  it("encrypts differently each time and decrypts only with correct authenticated context", () => {
    const a = encryptPdf(fixture, key, scope);
    const b = encryptPdf(fixture, key, scope);
    assert.notDeepEqual(a.iv, b.iv);
    assert.notDeepEqual(a.ciphertext, fixture);
    assert.deepEqual(decryptPdf(a, key, scope), fixture);
    assert.throws(() => decryptPdf(a, Buffer.alloc(32, 2), scope));
    assert.throws(() => decryptPdf(a, key, { ...scope, version: 2 }));
    assert.throws(() => decryptPdf(a, key, { ...scope, documentId: "other-document" }));
    assert.throws(() => decryptPdf({ ...a, tag: Buffer.alloc(16) }, key, scope));
    assert.throws(() => decryptPdf({ ...a, sha256: "00".repeat(32) }, key, scope));
    assert.throws(() => decryptPdf({ ...a, ciphertext: Buffer.from("corrupted") }, key, scope));
  });
});
