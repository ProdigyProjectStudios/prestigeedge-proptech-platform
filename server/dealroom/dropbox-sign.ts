import { createHmac, timingSafeEqual } from "node:crypto";

const API_ORIGIN = "https://api.hellosign.com/v3";

export interface DropboxSignConfig {
  apiKey: string;
  templateId: string;
  signerRole: string;
  clientId?: string;
  testMode: boolean;
}

export interface DropboxSignatureRequest {
  signature_request_id: string;
  is_complete: boolean;
  is_declined: boolean;
  has_error: boolean;
  test_mode: boolean;
  metadata?: Record<string, unknown>;
  signatures?: Array<{
    signer_email_address: string;
    status_code: string;
  }>;
}

export interface DropboxSignEvent {
  event: {
    event_time: string;
    event_type: string;
    event_hash: string;
    event_metadata?: {
      reported_for_app_id?: string | null;
    };
  };
  signature_request?: {
    signature_request_id?: string;
  };
}

export function signatureConfiguration(env: NodeJS.ProcessEnv = process.env): DropboxSignConfig | null {
  if (env.DEALROOM_SIGNATURE_PROVIDER !== "dropbox") return null;
  if (env.DEALROOM_STORAGE !== "postgres") return null;
  const apiKey = env.DROPBOX_SIGN_API_KEY?.trim();
  const templateId = env.DROPBOX_SIGN_TEMPLATE_ID?.trim();
  const signerRole = env.DROPBOX_SIGN_SIGNER_ROLE?.trim() || "Buyer";
  if (!apiKey || !templateId || !signerRole) return null;
  const testMode = env.DROPBOX_SIGN_TEST_MODE !== "false";
  if (!testMode && (env.DEALROOM_LIVE_SIGNATURES_ENABLED !== "true" || env.DEALROOM_NDA_LEGAL_APPROVED !== "true")) return null;
  return {
    apiKey,
    templateId,
    signerRole,
    clientId: env.DROPBOX_SIGN_CLIENT_ID?.trim() || undefined,
    testMode,
  };
}

export function canIssueNdaForListing(
  listingId: string,
  config: DropboxSignConfig,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (listingId === "MNA-2047") return config.testMode;
  // Do not expose real inventory until the public catalogue / confidential vault
  // classification and NDA contract have received explicit deployment signoff.
  return !config.testMode &&
    env.DEALROOM_REAL_INVENTORY_CLASSIFIED === "true" &&
    env.DEALROOM_NDA_LEGAL_APPROVED === "true" &&
    env.DEALROOM_LIVE_SIGNATURES_ENABLED === "true";
}

export function secureCompareHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function verifyDropboxEvent(
  payload: unknown,
  config: Pick<DropboxSignConfig, "apiKey" | "clientId">,
): payload is DropboxSignEvent {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Partial<DropboxSignEvent>;
  const event = data.event;
  if (!event || typeof event.event_time !== "string" ||
      !/^\d{9,12}$/.test(event.event_time) ||
      typeof event.event_type !== "string" ||
      event.event_type.length > 100 ||
      typeof event.event_hash !== "string") return false;
  // Docs: HMAC-SHA256(apiKey, event_time + event_type).
  const calculated = createHmac("sha256", config.apiKey)
    .update(event.event_time + event.event_type, "utf8")
    .digest("hex");
  if (!secureCompareHex(calculated, event.event_hash)) return false;
  if (config.clientId &&
      event.event_metadata?.reported_for_app_id !== config.clientId) return false;
  return true;
}

export function completedForExpectedSigner(
  request: DropboxSignatureRequest,
  expected: {
    providerRequestId: string;
    buyerEmail: string;
    envelopeId: string;
    listingId: string;
    testMode: boolean;
  },
): boolean {
  if (request.signature_request_id !== expected.providerRequestId ||
      request.is_complete !== true || request.is_declined !== false ||
      request.has_error !== false || request.test_mode !== expected.testMode) return false;

  // API metadata binds provider state back to the locally reserved envelope.
  if (request.metadata?.dealroom_envelope_id !== expected.envelopeId ||
      request.metadata?.dealroom_listing_id !== expected.listingId) return false;
  if (!Array.isArray(request.signatures) || request.signatures.length === 0) return false;
  if (!request.signatures.every(s => s.status_code === "signed")) return false;
  const matched = request.signatures.filter(
    s => typeof s.signer_email_address === "string" &&
      s.signer_email_address.toLowerCase() === expected.buyerEmail.toLowerCase(),
  );
  return matched.length === 1;
}

type FetchLike = typeof fetch;

export class DropboxSignClient {
  constructor(
    private readonly config: DropboxSignConfig,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const auth = Buffer.from(this.config.apiKey + ":", "utf8").toString("base64");
    const response = await this.fetcher(API_ORIGIN + path, {
      ...init,
      headers: {
        authorization: "Basic " + auth,
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      // Never print response bodies; they can contain sensitive recipient data.
      throw new Error("Dropbox Sign API request failed (HTTP " + response.status + ")");
    }
    return response.json();
  }

  async sendTemplatedNda(input: {
    envelopeId: string;
    listingId: string;
    buyerName: string;
    buyerEmail: string;
  }): Promise<{ providerRequestId: string; testMode: boolean }> {
    const body = new FormData();
    body.set("template_ids[0]", this.config.templateId);
    body.set("signers[0][role]", this.config.signerRole);
    body.set("signers[0][name]", input.buyerName);
    body.set("signers[0][email_address]", input.buyerEmail);
    body.set("title", "Prestige Edge | Confidential Listing " + input.listingId);
    body.set("subject", "Please review and sign your confidentiality agreement");
    body.set("message", "Please review the confidentiality agreement before accessing the listing's restricted materials.");
    body.set("metadata[dealroom_envelope_id]", input.envelopeId);
    body.set("metadata[dealroom_listing_id]", input.listingId);
    body.set("test_mode", this.config.testMode ? "1" : "0");
    if (this.config.clientId) body.set("client_id", this.config.clientId);

    const raw = await this.request("/signature_request/send_with_template", { method: "POST", body }) as {
      signature_request?: Partial<DropboxSignatureRequest>;
    };
    const result = raw.signature_request;
    if (!result || typeof result.signature_request_id !== "string" ||
        result.signature_request_id.length < 8 ||
        result.test_mode !== this.config.testMode) {
      // Ambiguous send: do not retry automatically, because it may have delivered email.
      throw new Error("Dropbox Sign returned an unrecognized signature request; reconcile manually");
    }
    return { providerRequestId: result.signature_request_id, testMode: this.config.testMode };
  }

  async getSignatureRequest(id: string): Promise<DropboxSignatureRequest> {
    if (!/^[a-zA-Z0-9_-]{8,150}$/.test(id)) throw new Error("Invalid provider request ID");
    const raw = await this.request("/signature_request/" + encodeURIComponent(id)) as {
      signature_request?: Partial<DropboxSignatureRequest>;
    };
    const result = raw.signature_request;
    if (!result || result.signature_request_id !== id ||
        typeof result.is_complete !== "boolean" ||
        typeof result.is_declined !== "boolean" ||
        typeof result.has_error !== "boolean" ||
        typeof result.test_mode !== "boolean") {
      throw new Error("Invalid Dropbox Sign status response");
    }
    return result as DropboxSignatureRequest;
  }
}

/** Dropbox Sign normally POSTs multipart/form-data with JSON in the 'json' form field. */
export function parseDropboxCallback(body: unknown): unknown {
  if (!body || typeof body !== "object") throw new Error("Invalid callback payload");
  const value = (body as { json?: unknown }).json;
  if (typeof value === "string") {
    if (value.length > 128_000) throw new Error("Callback too large");
    return JSON.parse(value);
  }
  return body;
}
