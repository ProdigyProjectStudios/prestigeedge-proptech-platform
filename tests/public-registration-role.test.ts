import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enforcePublicClientRole } from "../server/public-registration-policy";

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
