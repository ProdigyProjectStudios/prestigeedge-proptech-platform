import { it } from "node:test";
import assert from "node:assert/strict";

// Run only against an explicitly isolated test DB after the migration has been applied.
// Never fall back to the application's DATABASE_URL or write to live client records.
if (!process.env.DEALROOM_TEST_DATABASE_URL || process.env.DEALROOM_TEST_CONFIRM !== "yes") {
  it("PostgreSQL Deal Room integration tests require an isolated opted-in database", { skip: true }, () => {});
} else {
  process.env.DATABASE_URL = process.env.DEALROOM_TEST_DATABASE_URL;
  process.env.DEALROOM_STORAGE = "postgres";
  it("persists NDA transitions, prevents cross-session access, and signs idempotently", async () => {
    const store = await import("../server/dealroom/postgres-store");
    const { pool } = await import("../server/db");
    try {
      const buyer = await store.createDemoSession("buyer");
      const other = await store.createDemoSession("buyer");
      const listingId = "TEST-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
      const envelope = await store.createEnvelope(listingId, buyer);
      assert.equal((await store.getEnvelopeByBuyer(listingId, buyer.sessionToken))?.envelopeId, envelope.envelopeId);
      assert.equal(await store.getEnvelopeForSession(envelope.envelopeId, other.sessionToken), undefined);
      assert.equal(await store.getAccessGrant(listingId, buyer.sessionToken), undefined);
      const forbidden = await store.completeDemoSignature(envelope.envelopeId, other);
      assert.equal(forbidden.kind, "forbidden");
      const first = await store.completeDemoSignature(envelope.envelopeId, buyer);
      assert.equal(first.kind, "ok");
      if (first.kind !== "ok") throw new Error("Expected successful demo signature");
      assert.equal(first.alreadySigned, false);
      const second = await store.completeDemoSignature(envelope.envelopeId, buyer);
      assert.equal(second.kind, "ok");
      if (second.kind !== "ok") throw new Error("Expected idempotent signature");
      assert.equal(second.alreadySigned, true);
      assert.equal(second.grant.grantId, first.grant.grantId);
      assert.equal((await store.getSession(buyer.sessionToken))?.role, "buyer");
      assert.equal((await store.getAccessGrant(listingId, buyer.sessionToken))?.grantId, first.grant.grantId);
      assert.equal(await store.getAccessGrant(listingId, other.sessionToken), undefined);
      const events = await store.getAuditLog(listingId);
      assert.equal(events.filter((event) => event.event === "access_grant_created").length, 1);
    } finally {
      await pool.end();
    }
  });
}
