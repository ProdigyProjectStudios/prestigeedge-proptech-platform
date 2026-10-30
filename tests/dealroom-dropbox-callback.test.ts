import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { processDropboxCallback, type CallbackDeps } from "../server/dealroom/dropbox-callback";
import type { DropboxSignConfig, DropboxSignatureRequest } from "../server/dealroom/dropbox-sign";

const config: DropboxSignConfig = {
  apiKey: "callback-test-key", templateId: "template", signerRole: "Buyer",
  clientId: "app-test", testMode: true,
};

function signedEvent(id = "provider_request_123", type = "signature_request_all_signed") {
  const event_time = String(Math.floor(Date.now() / 1000));
  return {
    event: {
      event_time, event_type: type,
      event_hash: createHmac("sha256", config.apiKey).update(event_time + type).digest("hex"),
      event_metadata: { reported_for_app_id: config.clientId },
    },
    signature_request: { signature_request_id: id },
  };
}
function deps(): { deps: CallbackDeps; stats: { fetches: number; commits: number } } {
  const stats = { fetches: 0, commits: 0 };
  const record: DropboxSignatureRequest = {
    signature_request_id: "provider_request_123",
    is_complete: true, is_declined: false, has_error: false, test_mode: true,
    metadata: {
      dealroom_envelope_id: "internal-envelope-123",
      dealroom_listing_id: "MNA-2047",
    },
    signatures: [{ signer_email_address: "buyer@example.com", status_code: "signed" }],
  };
  return {
    stats,
    deps: {
      async findProviderEnvelope(id) {
        return id === "provider_request_123" ? {
          envelopeId: "internal-envelope-123",
          listingId: "MNA-2047",
          provider: "DropboxSign",
          providerRequestId: id,
          buyerPrincipalId: "buyer-user-id",
          signerEmail: "buyer@example.com",
          providerTestMode: true,
          createdAt: new Date(Date.now() - 60_000),
        } : undefined;
      },
      async readProviderStatus() { stats.fetches++; return record; },
      async commitVerified() { stats.commits++; return { kind: "ok" }; },
    },
  };
}

describe("Dropbox Sign callback grant boundary", () => {
  it("rejects forged events before database reads or grants", async () => {
    const x = deps();
    const payload = signedEvent();
    payload.event.event_hash = "00".repeat(32);
    const result = await processDropboxCallback({ json: JSON.stringify(payload) }, config, x.deps);
    assert.equal(result.status, 401);
    assert.equal(x.stats.fetches, 0);
    assert.equal(x.stats.commits, 0);
  });
  it("ignores verified unrelated and non-completion events", async () => {
    const x = deps();
    const unknown = await processDropboxCallback(signedEvent("unrelated_123"), config, x.deps);
    assert.equal(unknown.status, 200);
    assert.equal(unknown.completed, false);
    const sent = await processDropboxCallback(signedEvent("provider_request_123", "signature_request_sent"), config, x.deps);
    assert.equal(sent.status, 200);
    assert.equal(x.stats.commits, 0);
  });
  it("does not grant access until a matching completed provider GET response", async () => {
    const x = deps();
    const complete = await processDropboxCallback({ json: JSON.stringify(signedEvent()) }, config, x.deps);
    assert.equal(complete.status, 200);
    assert.equal(complete.completed, true);
    assert.equal(x.stats.fetches, 1);
    assert.equal(x.stats.commits, 1);
  });
  it("does not grant access for provider status API outages", async () => {
    const x = deps();
    x.deps.readProviderStatus = async () => { throw Error("Unavailable"); };
    const result = await processDropboxCallback(signedEvent(), config, x.deps);
    assert.equal(result.status, 503);
    assert.equal(x.stats.commits, 0);
  });
  it("rejects signed callbacks with stale timestamps predating envelope creation", async () => {
    const x = deps();
    const event = signedEvent();
    event.event.event_time = String(Math.floor(Date.now() / 1000) - 10_000);
    event.event.event_hash = createHmac("sha256", config.apiKey)
      .update(event.event.event_time + event.event.event_type).digest("hex");
    const decision = await processDropboxCallback(event, config, x.deps);
    assert.equal(decision.status, 401);
    assert.equal(x.stats.commits, 0);
  });
  it("refuses test-mode grants for non-synthetic real inventory", async () => {
    const x = deps();
    const find = x.deps.findProviderEnvelope;
    x.deps.findProviderEnvelope = async id => {
      const old = await find(id);
      return old ? { ...old, listingId: "REAL-LISTING" } : undefined;
    };
    const result = await processDropboxCallback(signedEvent(), config, x.deps, {
      DEALROOM_REAL_INVENTORY_CLASSIFIED: "true",
    });
    assert.equal(result.status, 409);
    assert.equal(x.stats.commits, 0);
  });
});
