/**
 * Signature Provider Abstraction
 *
 * In production, replace DemoSignatureProvider with a real adapter
 * (e.g. DocuSignProvider or DropboxSignProvider) that implements this
 * interface. The deal room routes only call methods on this interface —
 * swap the provider export below and no other server code changes.
 *
 * Production replacement path:
 *   1. Implement `createEnvelope` → POST to DocuSign eSign API, return envelopeId.
 *   2. Implement `getEnvelopeStatus` → GET DocuSign envelope status.
 *   3. Implement `verifyWebhook` → validate DocuSign HMAC signature on the
 *      inbound Connect webhook. On "envelope-completed" event, call
 *      `createAccessGrant()` from the store. Never trust a client-side callback.
 */

export interface SignatureProvider {
  name: string;
  createEnvelope(params: {
    listingId: string;
    buyerName: string;
    buyerEmail?: string;
    documentTitle: string;
  }): Promise<{ envelopeId: string; signingUrl?: string }>;

  getEnvelopeStatus(envelopeId: string): Promise<{
    status: "created" | "sent" | "signed" | "declined";
    signedAt?: Date;
  }>;

  verifyWebhook(payload: unknown, signature: string): boolean;
}

// ─── DemoSignatureProvider ────────────────────────────────────────────────────
// No external API calls. Simulates the provider contract for proof purposes.

export class DemoSignatureProvider implements SignatureProvider {
  readonly name = "DemoSignatureProvider";

  async createEnvelope(params: {
    listingId: string;
    buyerName: string;
    documentTitle: string;
  }): Promise<{ envelopeId: string }> {
    // In production: POST to DocuSign/DropboxSign here.
    // Return their envelopeId and a signingUrl for redirect.
    const envelopeId = `DEMO-${params.listingId}-${Date.now()}`;
    return { envelopeId };
  }

  async getEnvelopeStatus(envelopeId: string): Promise<{
    status: "created" | "sent" | "signed" | "declined";
    signedAt?: Date;
  }> {
    // In production: GET /v2.1/accounts/{accountId}/envelopes/{envelopeId}
    return { status: "sent" };
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    // In production: verify DocuSign Connect HMAC-SHA256 signature.
    // Never trust the webhook payload without this check.
    // A demonstration provider must never authenticate a real callback.
    return false;
  }
}

// ─── Active provider (swap this to go live) ───────────────────────────────────
export const signatureProvider: SignatureProvider = new DemoSignatureProvider();
