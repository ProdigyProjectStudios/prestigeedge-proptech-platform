import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { demoAccessEnabled, demoListingAllowed, hashSessionToken, postgresDealRoomEnabled } from "../server/dealroom/security";

describe("Deal Room security boundaries", () => {
  it("keeps demo admin access disabled on production unless explicitly enabled", () => {
    assert.equal(demoAccessEnabled({ NODE_ENV: "production" }), false);
    assert.equal(demoAccessEnabled({ NODE_ENV: "production", DEALROOM_DEMO_ACCESS: "false" }), false);
    assert.equal(demoAccessEnabled({ NODE_ENV: "production", DEALROOM_DEMO_ACCESS: "true" }), true);
  });
  it("allows an explicit disable in development", () => {
    assert.equal(demoAccessEnabled({ NODE_ENV: "development", DEALROOM_DEMO_ACCESS: "false" }), false);
  });
  it("never lets a public demo session operate on real inventory", () => {
    assert.equal(demoListingAllowed("demo", "MNA-2047"), true);
    assert.equal(demoListingAllowed("demo", "e90565ad-xxxx"), false);
    assert.equal(demoListingAllowed("authenticated", "e90565ad-xxxx"), true);
  });
  it("hashes bearer credentials deterministically without persisting raw tokens", () => {
    assert.match(hashSessionToken("example-bearer-token"), /^[a-f0-9]{64}$/);
    assert.notEqual(hashSessionToken("example-bearer-token"), "example-bearer-token");
    assert.notEqual(hashSessionToken("example-bearer-token"), hashSessionToken("another-token"));
  });
  it("requires an explicit switch for PostgreSQL", () => {
    assert.equal(postgresDealRoomEnabled({}), false);
    assert.equal(postgresDealRoomEnabled({ DEALROOM_STORAGE: "postgres" }), true);
  });
});
