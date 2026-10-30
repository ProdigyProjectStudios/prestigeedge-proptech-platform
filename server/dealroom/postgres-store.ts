import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../db";
import { hashSessionToken } from "./security";
import type { AccessGrant, AuditEntry, AuditEvent, DemoRole, DemoSession, Envelope } from "./memory-store";

type Row = Record<string, any>;
export type SignatureCompletion =
  | { kind: "missing" }
  | { kind: "forbidden" }
  | { kind: "ok"; grant: AccessGrant; alreadySigned: boolean };

const demoNames: Record<DemoRole, string> = { buyer: "Ava Morgan", admin: "Jordan Lee" };
const sessionLifetimeMs = 12 * 60 * 60 * 1000;

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function envelopeFromRow(row: Row, rawToken = ""): Envelope {
  return {
    envelopeId: String(row.envelope_id),
    listingId: String(row.listing_id),
    buyerSessionToken: rawToken,
    buyerName: String(row.buyer_name),
    status: row.status as Envelope["status"],
    provider: String(row.provider),
    ...(row.provider_request_id ? { providerRequestId: String(row.provider_request_id) } : {}),
    ...(row.buyer_principal_id ? { buyerPrincipalId: String(row.buyer_principal_id) } : {}),
    ...(row.signer_email ? { signerEmail: String(row.signer_email) } : {}),
    ...(typeof row.provider_test_mode === "boolean" ? { providerTestMode: row.provider_test_mode } : {}),
    createdAt: toDate(row.created_at),
    ...(row.signed_at ? { signedAt: toDate(row.signed_at) } : {}),
  };
}

function grantFromRow(row: Row, rawToken = ""): AccessGrant {
  return {
    grantId: String(row.grant_id),
    listingId: String(row.listing_id),
    buyerSessionToken: rawToken,
    buyerName: String(row.buyer_name),
    envelopeId: String(row.envelope_id),
    ...(row.buyer_principal_id ? { buyerPrincipalId: String(row.buyer_principal_id) } : {}),
    grantedAt: toDate(row.granted_at),
  };
}

function auditFromRow(row: Row): AuditEntry {
  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    event: row.event as AuditEvent,
    actorName: String(row.actor_name),
    actorRole: row.actor_role as DemoRole,
    detail: String(row.detail),
    timestamp: toDate(row.occurred_at),
  };
}

async function createSession(role: DemoRole, name: string, kind: "demo" | "authenticated", principalId?: string): Promise<DemoSession> {
  const sessionToken = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + sessionLifetimeMs);
  await pool.query(
    `INSERT INTO dealroom_sessions(session_token_hash,role,kind,principal_id,name,created_at,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [hashSessionToken(sessionToken), role, kind, principalId ?? null, name, createdAt, expiresAt],
  );
  return { sessionToken, role, name, createdAt, kind, ...(principalId ? { principalId } : {}) };
}

export function createDemoSession(role: DemoRole) {
  return createSession(role, demoNames[role], "demo");
}

export function createAuthenticatedSession(role: DemoRole, name: string, principalId: string) {
  return createSession(role, name, "authenticated", principalId);
}

export async function getSession(rawToken: string): Promise<DemoSession | undefined> {
  if (!rawToken || rawToken.length > 256) return undefined;
  const response = await pool.query(
    `SELECT role,kind,principal_id,name,created_at FROM dealroom_sessions
     WHERE session_token_hash=$1 AND expires_at > now() AND revoked_at IS NULL`,
    [hashSessionToken(rawToken)],
  );
  const row = response.rows[0] as Row | undefined;
  if (!row) return undefined;
  return {
    sessionToken: rawToken,
    role: row.role as DemoRole,
    name: String(row.name),
    createdAt: toDate(row.created_at),
    kind: row.kind as DemoSession["kind"],
    ...(row.principal_id ? { principalId: String(row.principal_id) } : {}),
  };
}

export async function createEnvelope(listingId: string, session: DemoSession): Promise<Envelope> {
  const sessionHash = hashSessionToken(session.sessionToken);
  const inserted = await pool.query(
    `INSERT INTO dealroom_envelopes(envelope_id,listing_id,buyer_session_hash,buyer_name,status,provider)
     VALUES($1,$2,$3,$4,'sent','DemoSignatureProvider')
     ON CONFLICT (listing_id,buyer_session_hash) DO NOTHING RETURNING *`,
    [randomUUID(), listingId, sessionHash, session.name],
  );
  const row = (inserted.rows[0] || (await pool.query(
    "SELECT * FROM dealroom_envelopes WHERE listing_id=$1 AND buyer_session_hash=$2",
    [listingId, sessionHash],
  )).rows[0]) as Row;
  if (!row) throw new Error("Unable to create or find NDA envelope");
  return envelopeFromRow(row, session.sessionToken);
}

export async function getEnvelopeByBuyer(listingId: string, rawToken: string): Promise<Envelope | undefined> {
  const response = await pool.query(
    `SELECT e.* FROM dealroom_sessions s
      JOIN dealroom_envelopes e ON e.listing_id=$1
       AND (e.buyer_session_hash=s.session_token_hash OR
            (s.kind='authenticated' AND e.buyer_principal_id=s.principal_id))
     WHERE s.session_token_hash=$2 AND s.expires_at>now() AND s.revoked_at IS NULL
     ORDER BY e.created_at DESC LIMIT 1`,
    [listingId, hashSessionToken(rawToken)],
  );
  const row = response.rows[0] as Row | undefined;
  return row ? envelopeFromRow(row, rawToken) : undefined;
}

export async function getEnvelopeForSession(envelopeId: string, rawToken: string): Promise<Envelope | undefined> {
  const response = await pool.query(
    "SELECT * FROM dealroom_envelopes WHERE envelope_id=$1 AND buyer_session_hash=$2",
    [envelopeId, hashSessionToken(rawToken)],
  );
  const row = response.rows[0] as Row | undefined;
  return row ? envelopeFromRow(row, rawToken) : undefined;
}

export async function getAllEnvelopesForListing(listingId: string): Promise<Envelope[]> {
  const response = await pool.query(
    "SELECT * FROM dealroom_envelopes WHERE listing_id=$1 ORDER BY created_at,envelope_id",
    [listingId],
  );
  return response.rows.map((row: Row) => envelopeFromRow(row));
}

export async function getAccessGrant(listingId: string, rawToken: string): Promise<AccessGrant | undefined> {
  const response = await pool.query(
    `SELECT g.* FROM dealroom_sessions s
      JOIN dealroom_grants g ON g.listing_id=$1
       AND (g.buyer_session_hash=s.session_token_hash OR
            (s.kind='authenticated' AND g.buyer_principal_id=s.principal_id))
     WHERE s.session_token_hash=$2 AND s.expires_at>now() AND s.revoked_at IS NULL
     ORDER BY g.granted_at DESC LIMIT 1`,
    [listingId, hashSessionToken(rawToken)],
  );
  const row = response.rows[0] as Row | undefined;
  return row ? grantFromRow(row, rawToken) : undefined;
}

export async function getAllGrantsForListing(listingId: string): Promise<AccessGrant[]> {
  const response = await pool.query(
    "SELECT * FROM dealroom_grants WHERE listing_id=$1 ORDER BY granted_at,grant_id",
    [listingId],
  );
  return response.rows.map((row: Row) => grantFromRow(row));
}

export async function addAuditEntry(
  listingId: string,
  event: AuditEvent,
  session: DemoSession,
  detail: string,
): Promise<AuditEntry> {
  const response = await pool.query(
    `INSERT INTO dealroom_audit(id,listing_id,event,actor_name,actor_role,detail)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [randomUUID(), listingId, event, session.name, session.role, detail],
  );
  return auditFromRow(response.rows[0] as Row);
}

export async function getAuditLog(listingId: string): Promise<AuditEntry[]> {
  const response = await pool.query(
    "SELECT * FROM dealroom_audit WHERE listing_id=$1 ORDER BY occurred_at,id",
    [listingId],
  );
  return response.rows.map((row: Row) => auditFromRow(row));
}

/** Demo-only signature transition: row lock, idempotent grant, and audit in ONE transaction. */
export async function completeDemoSignature(envelopeId: string, session: DemoSession): Promise<SignatureCompletion> {
  const sessionHash = hashSessionToken(session.sessionToken);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT * FROM dealroom_envelopes WHERE envelope_id=$1 FOR UPDATE",
      [envelopeId],
    );
    const envelope = locked.rows[0] as Row | undefined;
    if (!envelope) {
      await client.query("ROLLBACK");
      return { kind: "missing" };
    }
    if (envelope.buyer_session_hash !== sessionHash) {
      await client.query("ROLLBACK");
      return { kind: "forbidden" };
    }
    if (envelope.status === "signed") {
      const prior = await client.query(
        "SELECT * FROM dealroom_grants WHERE listing_id=$1 AND buyer_session_hash=$2",
        [envelope.listing_id, sessionHash],
      );
      const existingGrant = prior.rows[0] as Row | undefined;
      if (!existingGrant) throw new Error("Signed NDA is missing its access grant; manual reconciliation required");
      await client.query("COMMIT");
      return { kind: "ok", grant: grantFromRow(existingGrant, session.sessionToken), alreadySigned: true };
    }
    if (envelope.status !== "sent") {
      await client.query("ROLLBACK");
      return { kind: "forbidden" };
    }
    await client.query(
      "UPDATE dealroom_envelopes SET status='signed',signed_at=now() WHERE envelope_id=$1",
      [envelopeId],
    );
    const grants = await client.query(
      `INSERT INTO dealroom_grants(grant_id,listing_id,buyer_session_hash,buyer_name,envelope_id)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (listing_id,buyer_session_hash) DO NOTHING RETURNING *`,
      [randomUUID(), envelope.listing_id, sessionHash, session.name, envelopeId],
    );
    const grant = grants.rows[0] as Row | undefined;
    if (!grant) throw new Error("Conflicting access grant; manual reconciliation required");
    await client.query(
      `INSERT INTO dealroom_audit(id,listing_id,event,actor_name,actor_role,detail)
       VALUES($1,$2,'demo_signature_completed',$3,$4,$5),($6,$2,'access_grant_created',$3,$4,$7)`,
      [
        randomUUID(), envelope.listing_id, session.name, session.role,
        `Demo signature completed for envelope ${envelopeId}`,
        randomUUID(), `Access grant ${grant.grant_id} created for ${session.name}`,
      ],
    );
    await client.query("COMMIT");
    return { kind: "ok", grant: grantFromRow(grant, session.sessionToken), alreadySigned: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


/** External NDA issuance is reserved BEFORE the network call.
 * A timed-out send remains "created" until manually reconciled, preventing duplicate NDA emails.
 */
export async function reserveProviderEnvelope(
  listingId: string,
  session: DemoSession,
  signerEmail: string,
  testMode: boolean,
): Promise<{ envelope: Envelope; created: boolean }> {
  if (session.kind !== "authenticated" || !session.principalId || session.role !== "buyer") {
    throw new Error("An authenticated buyer is required to issue an external NDA");
  }
  const sessionHash = hashSessionToken(session.sessionToken);
  const inserted = await pool.query(
    `INSERT INTO dealroom_envelopes(
       envelope_id,listing_id,buyer_session_hash,buyer_principal_id,buyer_name,
       status,provider,signer_email,provider_test_mode
     ) VALUES($1,$2,$3,$4,$5,'created','DropboxSign',$6,$7)
       ON CONFLICT DO NOTHING RETURNING *`,
    [randomUUID(), listingId, sessionHash, session.principalId, session.name, signerEmail.toLowerCase(), testMode],
  );
  if (inserted.rows[0]) {
    return { envelope: envelopeFromRow(inserted.rows[0] as Row, session.sessionToken), created: true };
  }
  const prior = await pool.query(
    `SELECT * FROM dealroom_envelopes
     WHERE listing_id=$1 AND buyer_principal_id=$2
     ORDER BY created_at DESC LIMIT 1`,
    [listingId, session.principalId],
  );
  const row = prior.rows[0] as Row | undefined;
  if (!row || row.provider !== "DropboxSign" ||
      String(row.signer_email).toLowerCase() !== signerEmail.toLowerCase() ||
      row.provider_test_mode !== testMode) {
    throw new Error("A conflicting NDA already exists for this buyer and listing");
  }
  return { envelope: envelopeFromRow(row, session.sessionToken), created: false };
}

export async function recordProviderRequest(envelopeId: string, requestId: string): Promise<Envelope> {
  const updated = await pool.query(
    `UPDATE dealroom_envelopes SET provider_request_id=$2,status='sent'
     WHERE envelope_id=$1 AND provider='DropboxSign' AND status='created'
       AND provider_request_id IS NULL RETURNING *`,
    [envelopeId, requestId],
  );
  if (!updated.rows[0]) throw new Error("External NDA reservation needs manual reconciliation");
  return envelopeFromRow(updated.rows[0] as Row);
}

export async function findProviderEnvelope(requestId: string): Promise<Envelope | undefined> {
  const result = await pool.query(
    `SELECT * FROM dealroom_envelopes WHERE provider='DropboxSign' AND provider_request_id=$1`,
    [requestId],
  );
  const row = result.rows[0] as Row | undefined;
  return row ? envelopeFromRow(row) : undefined;
}

export type ProviderCompletion =
  | { kind: "missing" | "conflict" }
  | { kind: "ok"; grant: AccessGrant; alreadySigned: boolean };

/** Only call after verifying the callback HMAC and independently retrieving provider completion. */
export async function completeVerifiedProviderSignature(input: {
  providerRequestId: string;
  eventType: string;
  eventTime: number;
  eventHash: string;
}): Promise<ProviderCompletion> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT * FROM dealroom_envelopes
       WHERE provider='DropboxSign' AND provider_request_id=$1 FOR UPDATE`,
      [input.providerRequestId],
    );
    const envelope = locked.rows[0] as Row | undefined;
    if (!envelope) {
      await client.query("ROLLBACK");
      return { kind: "missing" };
    }
    if (!envelope.buyer_principal_id || !envelope.signer_email ||
        typeof envelope.provider_test_mode !== "boolean") {
      await client.query("ROLLBACK");
      return { kind: "conflict" };
    }
    if (envelope.status === "signed") {
      const past = await client.query(
        `SELECT * FROM dealroom_grants WHERE listing_id=$1 AND buyer_principal_id=$2`,
        [envelope.listing_id, envelope.buyer_principal_id],
      );
      const existing = past.rows[0] as Row | undefined;
      if (!existing || existing.envelope_id !== envelope.envelope_id) {
        throw new Error("Verified NDA grant inconsistency");
      }
      await client.query("COMMIT");
      return { kind: "ok", grant: grantFromRow(existing), alreadySigned: true };
    }
    if (envelope.status !== "sent") {
      await client.query("ROLLBACK");
      return { kind: "conflict" };
    }
    await client.query(
      `INSERT INTO dealroom_provider_events(id,provider_request_id,event_type,event_time,event_hash)
       VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [randomUUID(), input.providerRequestId, input.eventType, input.eventTime, input.eventHash],
    );
    const result = await client.query(
      `INSERT INTO dealroom_grants(
         grant_id,listing_id,buyer_session_hash,buyer_principal_id,buyer_name,envelope_id
       ) VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING RETURNING *`,
      [randomUUID(), envelope.listing_id, envelope.buyer_session_hash,
       envelope.buyer_principal_id, envelope.buyer_name, envelope.envelope_id],
    );
    const grant = result.rows[0] as Row | undefined;
    if (!grant) throw new Error("Another grant exists; manual reconciliation required");
    await client.query(
      "UPDATE dealroom_envelopes SET status='signed',signed_at=now() WHERE envelope_id=$1",
      [envelope.envelope_id],
    );
    await client.query(
      `INSERT INTO dealroom_audit(id,listing_id,event,actor_name,actor_role,detail)
       VALUES
         ($1,$2,'provider_signature_verified',$3,'buyer',$4),
         ($5,$2,'access_grant_created',$3,'buyer',$6)`,
      [randomUUID(), envelope.listing_id, envelope.buyer_name,
       "Dropbox Sign completion verified via independent provider API",
       randomUUID(), "Verified signature grant: " + String(grant.grant_id)],
    );
    await client.query("COMMIT");
    return { kind: "ok", grant: grantFromRow(grant), alreadySigned: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
