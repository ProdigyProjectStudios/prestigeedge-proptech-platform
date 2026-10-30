import {
  canIssueNdaForListing,
  completedForExpectedSigner,
  parseDropboxCallback,
  verifyDropboxEvent,
  type DropboxSignConfig,
  type DropboxSignEvent,
  type DropboxSignatureRequest,
} from "./dropbox-sign";

export type ProviderEnvelopeSnapshot = {
  envelopeId: string;
  listingId: string;
  provider: string;
  providerRequestId?: string;
  buyerPrincipalId?: string;
  signerEmail?: string;
  providerTestMode?: boolean;
  createdAt: Date;
};

export type CallbackDeps = {
  findProviderEnvelope(id: string): Promise<ProviderEnvelopeSnapshot | undefined>;
  readProviderStatus(id: string): Promise<DropboxSignatureRequest>;
  commitVerified(input: {
    providerRequestId: string;
    eventType: string;
    eventTime: number;
    eventHash: string;
  }): Promise<{ kind: "ok" | "missing" | "conflict"; alreadySigned?: boolean }>;
};

export type CallbackDecision =
  | { status: 200; accepted: true; completed: boolean }
  | { status: 400 | 401 | 409 | 503; accepted: false; completed: false };

/** Provider sends notifications, not authority to grant access.
 * Verify HMAC, match a locally issued request, re-read status from Dropbox Sign,
 * and commit the grant in a single DB transaction. No unverified callback can grant access.
 */
export async function processDropboxCallback(
  body: unknown,
  config: DropboxSignConfig,
  deps: CallbackDeps,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CallbackDecision> {
  let callback: unknown;
  try {
    callback = parseDropboxCallback(body);
  } catch {
    return { status: 400, accepted: false, completed: false };
  }
  if (!verifyDropboxEvent(callback, config)) {
    return { status: 401, accepted: false, completed: false };
  }
  const verified = callback as DropboxSignEvent;
  if (verified.event.event_type !== "signature_request_all_signed") {
    return { status: 200, accepted: true, completed: false };
  }
  const providerRequestId = verified.signature_request?.signature_request_id;
  if (!providerRequestId || !/^[a-zA-Z0-9_-]{8,150}$/.test(providerRequestId)) {
    return { status: 400, accepted: false, completed: false };
  }
  const envelope = await deps.findProviderEnvelope(providerRequestId);
  // An account-level callback can include unrelated Dropbox Sign requests.
  if (!envelope) return { status: 200, accepted: true, completed: false };
  if (envelope.provider !== "DropboxSign" ||
      envelope.providerRequestId !== providerRequestId ||
      !envelope.buyerPrincipalId || !envelope.signerEmail ||
      typeof envelope.providerTestMode !== "boolean") {
    return { status: 409, accepted: false, completed: false };
  }
  const eventTime = Number(verified.event.event_time);
  if (!Number.isSafeInteger(eventTime) ||
      eventTime < Math.floor(envelope.createdAt.getTime() / 1000) - 60 ||
      eventTime > Math.floor(Date.now() / 1000) + 300) {
    return { status: 401, accepted: false, completed: false };
  }
  if (!canIssueNdaForListing(
    envelope.listingId, { ...config, testMode: envelope.providerTestMode }, env,
  )) {
    return { status: 409, accepted: false, completed: false };
  }

  // Fail closed and allow Dropbox Sign to retry if the provider API is unavailable.
  let provider: DropboxSignatureRequest;
  try {
    provider = await deps.readProviderStatus(providerRequestId);
  } catch {
    return { status: 503, accepted: false, completed: false };
  }
  const valid = completedForExpectedSigner(provider, {
    providerRequestId, envelopeId: envelope.envelopeId,
    listingId: envelope.listingId, buyerEmail: envelope.signerEmail,
    testMode: envelope.providerTestMode,
  });
  if (!valid) return { status: 503, accepted: false, completed: false };

  const outcome = await deps.commitVerified({
    providerRequestId,
    eventType: verified.event.event_type,
    eventTime,
    eventHash: verified.event.event_hash,
  });
  if (outcome.kind !== "ok") return { status: 409, accepted: false, completed: false };
  return { status: 200, accepted: true, completed: true };
}
