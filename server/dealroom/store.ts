import * as memory from "./memory-store";
import * as postgres from "./postgres-store";
import { postgresDealRoomEnabled } from "./security";
import type { AccessGrant, AuditEntry, AuditEvent, DemoRole, DemoSession, Envelope } from "./memory-store";

export type { AccessGrant, AuditEntry, AuditEvent, DemoRole, DemoSession, Envelope, EnvelopeStatus } from "./memory-store";
export type SignatureCompletion = postgres.SignatureCompletion;

export function isPersistent() {
  return postgresDealRoomEnabled();
}

export async function createDemoSession(role: DemoRole): Promise<DemoSession> {
  return isPersistent() ? postgres.createDemoSession(role) : memory.createDemoSession(role);
}

export async function createAuthenticatedSession(role: DemoRole, name: string, principalId: string): Promise<DemoSession> {
  if (!isPersistent()) throw new Error("Authenticated Deal Room requires PostgreSQL storage");
  return postgres.createAuthenticatedSession(role, name, principalId);
}

export async function getSession(token: string): Promise<DemoSession | undefined> {
  if (isPersistent()) return postgres.getSession(token);
  const session = memory.getSession(token);
  // A demo bearer token cannot remain valid indefinitely even in memory mode.
  return session && Date.now() - session.createdAt.getTime() < 12 * 60 * 60 * 1000 ? session : undefined;
}

export async function createEnvelope(listingId: string, session: DemoSession): Promise<Envelope> {
  return isPersistent() ? postgres.createEnvelope(listingId, session) : memory.createEnvelope(listingId, session);
}

export async function getEnvelopeByBuyer(listingId: string, token: string): Promise<Envelope | undefined> {
  return isPersistent() ? postgres.getEnvelopeByBuyer(listingId, token) : memory.getEnvelopeByBuyer(listingId, token);
}

export async function getEnvelopeForSession(envelopeId: string, token: string): Promise<Envelope | undefined> {
  if (isPersistent()) return postgres.getEnvelopeForSession(envelopeId, token);
  const envelope = memory.getEnvelope(envelopeId);
  return envelope?.buyerSessionToken === token ? envelope : undefined;
}

export async function getAllEnvelopesForListing(listingId: string): Promise<Envelope[]> {
  return isPersistent() ? postgres.getAllEnvelopesForListing(listingId) : memory.getAllEnvelopesForListing(listingId);
}

export async function getAccessGrant(listingId: string, token: string): Promise<AccessGrant | undefined> {
  return isPersistent() ? postgres.getAccessGrant(listingId, token) : memory.getAccessGrant(listingId, token);
}

export async function getAllGrantsForListing(listingId: string): Promise<AccessGrant[]> {
  return isPersistent() ? postgres.getAllGrantsForListing(listingId) : memory.getAllGrantsForListing(listingId);
}

export async function addAuditEntry(listingId: string, event: AuditEvent, session: DemoSession, detail: string): Promise<AuditEntry> {
  return isPersistent()
    ? postgres.addAuditEntry(listingId, event, session, detail)
    : memory.addAuditEntry(listingId, event, session, detail);
}

export async function getAuditLog(listingId: string): Promise<AuditEntry[]> {
  return isPersistent() ? postgres.getAuditLog(listingId) : memory.getAuditLog(listingId);
}

export async function completeDemoSignature(envelopeId: string, session: DemoSession): Promise<SignatureCompletion> {
  if (session.kind === "authenticated") return { kind: "forbidden" };
  if (isPersistent()) return postgres.completeDemoSignature(envelopeId, session);
  const envelope = memory.getEnvelope(envelopeId);
  if (!envelope) return { kind: "missing" };
  if (envelope.buyerSessionToken !== session.sessionToken) return { kind: "forbidden" };
  if (envelope.status === "signed") {
    const prior = memory.getAccessGrant(envelope.listingId, session.sessionToken);
    if (!prior) throw new Error("Signed NDA has no access grant");
    return { kind: "ok", grant: prior, alreadySigned: true };
  }
  if (envelope.status !== "sent") return { kind: "forbidden" };
  memory.markEnvelopeSigned(envelopeId);
  const grant = memory.createAccessGrant(envelope.listingId, session, envelopeId);
  memory.addAuditEntry(envelope.listingId, "demo_signature_completed", session, `Demo signature completed for envelope ${envelopeId}`);
  memory.addAuditEntry(envelope.listingId, "access_grant_created", session, `Access grant ${grant.grantId} created for ${session.name}`);
  return { kind: "ok", grant, alreadySigned: false };
}


// External NDA signing is never available in memory mode.
export function reserveProviderEnvelope(listingId: string, session: DemoSession, signerEmail: string, testMode: boolean) {
  if (!isPersistent()) throw new Error("Provider NDA issuance requires PostgreSQL");
  return postgres.reserveProviderEnvelope(listingId, session, signerEmail, testMode);
}

export function recordProviderRequest(envelopeId: string, providerRequestId: string) {
  if (!isPersistent()) throw new Error("Provider NDA issuance requires PostgreSQL");
  return postgres.recordProviderRequest(envelopeId, providerRequestId);
}

export function findProviderEnvelope(providerRequestId: string) {
  if (!isPersistent()) throw new Error("Provider callback handling requires PostgreSQL");
  return postgres.findProviderEnvelope(providerRequestId);
}

export function completeVerifiedProviderSignature(input: {
  providerRequestId: string;
  eventType: string;
  eventTime: number;
  eventHash: string;
}) {
  if (!isPersistent()) throw new Error("Provider callback handling requires PostgreSQL");
  return postgres.completeVerifiedProviderSignature(input);
}
