import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";

// Intentionally never connect to a real database: all requests below use the fictional seed.
// The PostgreSQL integration suite is separate and opt-in.
process.env.NODE_ENV = "test";
process.env.DEALROOM_STORAGE = "";
process.env.DEALROOM_DEMO_ACCESS = "true";
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:5432/never-connected";

it("exercises the real HTTP Deal Room demo flow and security boundaries", async () => {
  const { registerDealRoomRoutes } = await import("../server/dealroom/routes");
  const app = express();
  app.use(express.json());
  registerDealRoomRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const addr = server.address() as AddressInfo;
  const base = "http://127.0.0.1:" + addr.port;

  async function call(
    path: string,
    method = "GET",
    token?: string,
    body?: unknown,
  ): Promise<{ status: number; body: any }> {
    const response = await fetch(base + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-dr-session": token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }

  try {
    const caps = await call("/api/dealroom/capabilities");
    assert.equal(caps.status, 200);
    assert.equal(caps.body.durableStorage, false);
    assert.equal(caps.body.verifiedProviderSigning, false);

    process.env.NODE_ENV = "production";
    process.env.DEALROOM_DEMO_ACCESS = "false";
    assert.equal((await call("/api/dealroom/session", "POST", undefined, { role: "admin" })).status, 403);
    process.env.DEALROOM_DEMO_ACCESS = "true";

    const created = await call("/api/dealroom/session", "POST", undefined, { role: "buyer" });
    assert.equal(created.status, 200);
    assert.equal(created.body.role, "buyer");
    const buyer = created.body.sessionToken as string;
    assert.ok(buyer);

    const other = await call("/api/dealroom/session", "POST", undefined, { role: "buyer" });
    assert.equal(other.status, 200);
    const otherBuyer = other.body.sessionToken as string;

    const adminCreated = await call("/api/dealroom/session", "POST", undefined, { role: "admin" });
    assert.equal(adminCreated.status, 200);
    const admin = adminCreated.body.sessionToken as string;

    assert.equal((await call("/api/dealroom/listings/MNA-2047/confidential")).status, 401);
    assert.equal((await call("/api/dealroom/listings/MNA-2047/confidential", "GET", buyer)).status, 403);
    assert.equal((await call("/api/dealroom/listings/MNA-2047/status", "GET", buyer)).body.hasAccess, false);
    assert.equal((await call("/api/dealroom/admin/listings/MNA-2047", "GET", buyer)).status, 403);
    assert.equal((await call("/api/dealroom/admin/listings/OTHER-LISTING", "GET", admin)).status, 403);

    const requested = await call("/api/dealroom/listings/MNA-2047/nda", "POST", buyer);
    assert.equal(requested.status, 201);
    assert.equal(requested.body.status, "sent");
    const envelopeId = requested.body.envelopeId as string;

    const duplicated = await call("/api/dealroom/listings/MNA-2047/nda", "POST", buyer);
    assert.equal(duplicated.status, 200);
    assert.equal(duplicated.body.alreadyExisted, true);
    assert.equal(duplicated.body.envelopeId, envelopeId);

    assert.equal((await call("/api/dealroom/envelopes/" + envelopeId + "/sign", "POST", otherBuyer)).status, 404);
    assert.equal((await call("/api/dealroom/listings/MNA-2047/cim", "GET", otherBuyer)).status, 403);

    const signed = await call("/api/dealroom/envelopes/" + envelopeId + "/sign", "POST", buyer);
    assert.equal(signed.status, 200);
    assert.equal(signed.body.success, true);
    assert.equal(signed.body.alreadySigned, false);
    assert.ok(signed.body.grantId);

    const retry = await call("/api/dealroom/envelopes/" + envelopeId + "/sign", "POST", buyer);
    assert.equal(retry.status, 200);
    assert.equal(retry.body.alreadySigned, true);
    assert.equal(retry.body.grantId, signed.body.grantId);

    const record = await call("/api/dealroom/listings/MNA-2047/confidential", "GET", buyer);
    assert.equal(record.status, 200);
    assert.equal(record.body.grantId, signed.body.grantId);
    const cim = await call("/api/dealroom/listings/MNA-2047/cim", "GET", buyer);
    assert.equal(cim.status, 200);
    assert.ok(cim.body.cim.sections.length > 0);

    const adminView = await call("/api/dealroom/admin/listings/MNA-2047", "GET", admin);
    assert.equal(adminView.status, 200);
    assert.equal(adminView.body.envelopes.length, 1);
    assert.equal(adminView.body.grants.length, 1);
    assert.equal(adminView.body.grants[0].grantId, signed.body.grantId);
    assert.equal(adminView.body.auditLog.filter((e: any) => e.event === "access_grant_created").length, 1);
    assert.equal(JSON.stringify(adminView.body).includes(buyer), false);

    assert.equal((await call("/api/dealroom/auth-session", "POST")).status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});
