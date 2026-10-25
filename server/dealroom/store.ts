import { randomUUID } from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DemoRole = "buyer" | "admin";

export interface DemoSession {
  sessionToken: string;
  role: DemoRole;
  name: string;
  createdAt: Date;
}

export type EnvelopeStatus = "created" | "sent" | "signed" | "declined";

export interface Envelope {
  envelopeId: string;
  listingId: string;
  buyerSessionToken: string;
  buyerName: string;
  status: EnvelopeStatus;
  provider: "DemoSignatureProvider";
  createdAt: Date;
  signedAt?: Date;
}

export interface AccessGrant {
  grantId: string;
  listingId: string;
  buyerSessionToken: string;
  buyerName: string;
  envelopeId: string;
  grantedAt: Date;
}

export type AuditEvent =
  | "listing_viewed"
  | "nda_requested"
  | "envelope_created"
  | "demo_signature_completed"
  | "access_grant_created"
  | "confidential_accessed"
  | "cim_accessed";

export interface AuditEntry {
  id: string;
  listingId: string;
  event: AuditEvent;
  actorName: string;
  actorRole: DemoRole;
  detail: string;
  timestamp: Date;
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

const sessions = new Map<string, DemoSession>();
const envelopes = new Map<string, Envelope>();
// key: `${sessionToken}:${listingId}`
const accessGrants = new Map<string, AccessGrant>();
const auditLog: AuditEntry[] = [];

// ─── Session helpers ─────────────────────────────────────────────────────────

const DEMO_NAMES: Record<DemoRole, string> = {
  buyer: "Ava Morgan",
  admin: "Jordan Lee",
};

export function createDemoSession(role: DemoRole): DemoSession {
  const sessionToken = randomUUID();
  const session: DemoSession = {
    sessionToken,
    role,
    name: DEMO_NAMES[role],
    createdAt: new Date(),
  };
  sessions.set(sessionToken, session);
  return session;
}

export function getSession(token: string): DemoSession | undefined {
  return sessions.get(token);
}

// ─── Envelope helpers ─────────────────────────────────────────────────────────

export function createEnvelope(listingId: string, session: DemoSession): Envelope {
  const env: Envelope = {
    envelopeId: randomUUID(),
    listingId,
    buyerSessionToken: session.sessionToken,
    buyerName: session.name,
    status: "sent",
    provider: "DemoSignatureProvider",
    createdAt: new Date(),
  };
  envelopes.set(env.envelopeId, env);
  return env;
}

export function getEnvelopeByBuyer(
  listingId: string,
  sessionToken: string
): Envelope | undefined {
  for (const env of envelopes.values()) {
    if (env.listingId === listingId && env.buyerSessionToken === sessionToken) {
      return env;
    }
  }
  return undefined;
}

export function getEnvelope(envelopeId: string): Envelope | undefined {
  return envelopes.get(envelopeId);
}

export function markEnvelopeSigned(envelopeId: string): Envelope | undefined {
  const env = envelopes.get(envelopeId);
  if (!env) return undefined;
  env.status = "signed";
  env.signedAt = new Date();
  return env;
}

export function getAllEnvelopesForListing(listingId: string): Envelope[] {
  return [...envelopes.values()].filter((e) => e.listingId === listingId);
}

// ─── Access Grant helpers ─────────────────────────────────────────────────────

export function createAccessGrant(
  listingId: string,
  session: DemoSession,
  envelopeId: string
): AccessGrant {
  const grant: AccessGrant = {
    grantId: randomUUID(),
    listingId,
    buyerSessionToken: session.sessionToken,
    buyerName: session.name,
    envelopeId,
    grantedAt: new Date(),
  };
  accessGrants.set(`${session.sessionToken}:${listingId}`, grant);
  return grant;
}

export function getAccessGrant(
  listingId: string,
  sessionToken: string
): AccessGrant | undefined {
  return accessGrants.get(`${sessionToken}:${listingId}`);
}

export function getAllGrantsForListing(listingId: string): AccessGrant[] {
  return [...accessGrants.values()].filter((g) => g.listingId === listingId);
}

// ─── Audit Log helpers ────────────────────────────────────────────────────────

export function addAuditEntry(
  listingId: string,
  event: AuditEvent,
  session: DemoSession,
  detail: string
): AuditEntry {
  const entry: AuditEntry = {
    id: randomUUID(),
    listingId,
    event,
    actorName: session.name,
    actorRole: session.role,
    detail,
    timestamp: new Date(),
  };
  auditLog.push(entry);
  return entry;
}

export function getAuditLog(listingId: string): AuditEntry[] {
  return auditLog.filter((e) => e.listingId === listingId);
}
