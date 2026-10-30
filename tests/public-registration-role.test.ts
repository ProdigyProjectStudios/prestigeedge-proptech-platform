import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enforcePublicClientRole } from "../server/public-registration-policy";
import { selectJwtSecret } from "../server/auth-security";

describe("Public registration roles", () => {
  it("ignores any invitation to create higher privilege accounts", () => {
    assert.throws(() => enforcePublicClientRole({ role: "admin", email: "someone@example.com" }));
    assert.throws(() => enforcePublicClientRole({ role: "agent", email: "someone@example.com" }));
  });
  it("defaults public applicants to the client role", () => {
    assert.equal(enforcePublicClientRole({ email: "buyer@example.com" }).role, "client");
    assert.equal(enforcePublicClientRole({ email: "buyer@example.com", role: "client" }).role, "client");
  });
});


describe("JWT signing key configuration", () => {
  it("refuses missing, weak, and placeholder secrets in production", () => {
    assert.throws(() => selectJwtSecret({ NODE_ENV: "production" }));
    assert.throws(() => selectJwtSecret({ NODE_ENV: "production", JWT_SECRET: "short" }));
    assert.throws(() => selectJwtSecret({ NODE_ENV: "production", JWT_SECRET: "your-super-secret-jwt-key" }));
  });
  it("permits a sufficiently long production secret and local-only fallback", () => {
    assert.equal(selectJwtSecret({ NODE_ENV: "production", JWT_SECRET: "x".repeat(48) }), "x".repeat(48));
    assert.match(selectJwtSecret({ NODE_ENV: "development" }), /development-only/);
  });
});
