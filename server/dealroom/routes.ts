import type { Express, Request, Response } from "express";
import * as store from "./store";
import { signatureProvider } from "./signature-provider";
import { PUBLIC_TEASER, CONFIDENTIAL_RECORD, LISTING_ID } from "./seed";
import { storage } from "../storage";

// ─── Helpers: resolve any listing ID to teaser / confidential / CIM ───────────

function priceRangeStr(price: number): string {
  const lo = Math.floor(price / 5_000_000) * 5_000_000;
  const hi = lo + 5_000_000;
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(0)}M`
      : `$${(n / 1_000).toFixed(0)}K`;
  return `${fmt(lo)} – ${fmt(hi)}`;
}

async function resolveTeaser(id: string): Promise<object | null> {
  if (id === LISTING_ID) return PUBLIC_TEASER;

  const prop = await storage.getProperty(id);
  if (!prop) return null;

  const parts = prop.location.split(",");
  const city = parts[0]?.trim() ?? prop.location;
  const state = parts[1]?.trim() ?? "";

  return {
    listingId: id,
    title: `${prop.propertyType} — ${city}`,
    industry: prop.propertyType,
    region: state ? `${city}, ${state}` : city,
    revenueRange: priceRangeStr(prop.price),
    ebitdaRange: "—",
    askingPriceRange: priceRangeStr(prop.price),
    established: `${prop.beds} bed / ${prop.baths} bath`,
    employees: `${prop.sqft.toLocaleString()} sq ft`,
    summary: prop.description.length > 220
      ? prop.description.slice(0, 220) + "…"
      : prop.description,
    highlights: prop.features.slice(0, 5),
  };
}

async function resolveConfidential(id: string): Promise<object | null> {
  if (id === LISTING_ID) {
    const { cimContent: _cim, ...record } = CONFIDENTIAL_RECORD;
    return record;
  }

  const prop = await storage.getProperty(id);
  if (!prop) return null;

  return {
    companyName: prop.title,
    legalName: prop.title,
    address: prop.address,
    yearFounded: new Date(prop.createdAt).getFullYear(),
    revenue: prop.price,
    ebitda: 0,
    ebitdaMargin: "N/A",
    netIncome: 0,
    askingPrice: prop.price,
    evEbitdaMultiple: "N/A",
    sellerNotes: prop.features.length
      ? prop.features.join(" · ")
      : "Contact listing agent for additional details.",
  };
}

async function resolveCIM(id: string): Promise<object | null> {
  if (id === LISTING_ID) return CONFIDENTIAL_RECORD.cimContent;

  const prop = await storage.getProperty(id);
  if (!prop) return null;

  return {
    sections: [
      { heading: "Property Overview", body: prop.description },
      {
        heading: "Location & Address",
        body: prop.address,
      },
      {
        heading: "Property Specifications",
        body: `${prop.beds} bedrooms · ${prop.baths} bathrooms · ${prop.sqft.toLocaleString()} sq ft · ${prop.propertyType}`,
      },
      {
        heading: "Key Features",
        body: prop.features.length
          ? prop.features.join("\n")
          : "Contact agent for full feature list.",
      },
      {
        heading: "Asking Price",
        body: `$${prop.price.toLocaleString()} — contact listing agent for showing schedule and offer procedures.`,
      },
    ],
  };
}

// ─── Session middleware ───────────────────────────────────────────────────────

function getSessionFromRequest(req: Request): store.DemoSession | null {
  const token = req.headers["x-dr-session"] as string | undefined;
  if (!token) return null;
  return store.getSession(token) ?? null;
}

function requireBuyerSession(
  req: Request,
  res: Response
): store.DemoSession | null {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Deal room session required." });
    return null;
  }
  if (session.role !== "buyer") {
    res.status(403).json({ error: "Buyer session required." });
    return null;
  }
  return session;
}

function requireAdminSession(
  req: Request,
  res: Response
): store.DemoSession | null {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Deal room session required." });
    return null;
  }
  if (session.role !== "admin") {
    res.status(403).json({ error: "Admin session required." });
    return null;
  }
  return session;
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerDealRoomRoutes(app: Express) {
  // POST /api/dealroom/session — create demo session (server-side, role-safe)
  app.post("/api/dealroom/session", (req: Request, res: Response) => {
    const { role } = req.body as { role?: string };
    if (role !== "buyer" && role !== "admin") {
      return res.status(400).json({ error: "role must be 'buyer' or 'admin'" });
    }
    const session = store.createDemoSession(role);
    return res.json({
      sessionToken: session.sessionToken,
      role: session.role,
      name: session.name,
    });
  });

  // GET /api/dealroom/session — validate & return current session info
  app.get("/api/dealroom/session", (req: Request, res: Response) => {
    const session = getSessionFromRequest(req);
    if (!session) return res.status(401).json({ error: "No active deal room session." });
    return res.json({ role: session.role, name: session.name });
  });

  // GET /api/dealroom/listings/:id — public blind teaser (no auth required)
  app.get("/api/dealroom/listings/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });

    const session = getSessionFromRequest(req);
    if (session) {
      store.addAuditEntry(id, "listing_viewed", session, `${session.name} viewed the blind teaser for ${id}`);
    }
    return res.json({ listing: teaser });
  });

  // GET /api/dealroom/listings/:id/status — buyer NDA/access status
  app.get("/api/dealroom/listings/:id/status", async (req: Request, res: Response) => {
    const session = requireBuyerSession(req, res);
    if (!session) return;
    const { id } = req.params;

    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });

    const envelope = store.getEnvelopeByBuyer(id, session.sessionToken);
    const grant = store.getAccessGrant(id, session.sessionToken);

    return res.json({
      hasEnvelope: !!envelope,
      envelopeId: envelope?.envelopeId ?? null,
      envelopeStatus: envelope?.status ?? null,
      hasAccess: !!grant,
      grantId: grant?.grantId ?? null,
    });
  });

  // POST /api/dealroom/listings/:id/nda — request NDA, create envelope
  app.post("/api/dealroom/listings/:id/nda", async (req: Request, res: Response) => {
    const session = requireBuyerSession(req, res);
    if (!session) return;
    const { id } = req.params;

    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });

    const existing = store.getEnvelopeByBuyer(id, session.sessionToken);
    if (existing) {
      return res.json({ envelopeId: existing.envelopeId, status: existing.status, buyerName: session.name, alreadyExisted: true });
    }

    const envelope = store.createEnvelope(id, session);
    store.addAuditEntry(id, "nda_requested", session, `${session.name} requested NDA access for ${id}`);
    store.addAuditEntry(id, "envelope_created", session, `Demo envelope ${envelope.envelopeId} created via ${signatureProvider.name}`);

    return res.status(201).json({
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      buyerName: session.name,
      provider: envelope.provider,
    });
  });

  // POST /api/dealroom/envelopes/:envelopeId/sign — complete demo signature
  app.post("/api/dealroom/envelopes/:envelopeId/sign", (req: Request, res: Response) => {
    const session = requireBuyerSession(req, res);
    if (!session) return;
    const { envelopeId } = req.params;

    const envelope = store.getEnvelope(envelopeId);
    if (!envelope) return res.status(404).json({ error: "Envelope not found." });
    if (envelope.buyerSessionToken !== session.sessionToken) {
      return res.status(403).json({ error: "Envelope belongs to a different session." });
    }
    if (envelope.status === "signed") {
      const grant = store.getAccessGrant(envelope.listingId, session.sessionToken);
      return res.json({ success: true, alreadySigned: true, grantId: grant?.grantId });
    }

    store.markEnvelopeSigned(envelopeId);
    const grant = store.createAccessGrant(envelope.listingId, session, envelopeId);

    store.addAuditEntry(envelope.listingId, "demo_signature_completed", session, `${session.name} completed demo signature on envelope ${envelopeId}`);
    store.addAuditEntry(envelope.listingId, "access_grant_created", session, `Access grant ${grant.grantId} created for ${session.name} on listing ${envelope.listingId}`);

    return res.json({ success: true, grantId: grant.grantId });
  });

  // GET /api/dealroom/listings/:id/confidential — server-gated confidential data
  app.get("/api/dealroom/listings/:id/confidential", async (req: Request, res: Response) => {
    const session = requireBuyerSession(req, res);
    if (!session) return;
    const { id } = req.params;

    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });

    const grant = store.getAccessGrant(id, session.sessionToken);
    if (!grant) {
      return res.status(403).json({
        error: "Access denied.",
        reason: "A completed NDA signature is required to access confidential details.",
        code: "NO_ACCESS_GRANT",
      });
    }

    store.addAuditEntry(id, "confidential_accessed", session, `${session.name} accessed confidential record for ${id}`);

    const record = await resolveConfidential(id);
    return res.json({ record, grantId: grant.grantId });
  });

  // GET /api/dealroom/listings/:id/cim — gated CIM / property document
  app.get("/api/dealroom/listings/:id/cim", async (req: Request, res: Response) => {
    const session = requireBuyerSession(req, res);
    if (!session) return;
    const { id } = req.params;

    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });

    const grant = store.getAccessGrant(id, session.sessionToken);
    if (!grant) {
      return res.status(403).json({
        error: "Access denied.",
        reason: "Document access requires a completed NDA signature.",
        code: "NO_ACCESS_GRANT",
      });
    }

    store.addAuditEntry(id, "cim_accessed", session, `${session.name} accessed document for ${id}`);

    const cim = await resolveCIM(id);
    return res.json({ cim, grantId: grant.grantId });
  });

  // GET /api/dealroom/admin/listings/:id — full admin deal room view
  app.get("/api/dealroom/admin/listings/:id", async (req: Request, res: Response) => {
    const session = requireAdminSession(req, res);
    if (!session) return;
    const { id } = req.params;

    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });

    const envelopes = store.getAllEnvelopesForListing(id);
    const grants = store.getAllGrantsForListing(id);
    const auditEntries = store.getAuditLog(id);

    const safeEnvelopes = envelopes.map(({ buyerSessionToken: _bst, ...e }) => e);
    const safeGrants = grants.map(({ buyerSessionToken: _bst, ...g }) => g);

    return res.json({
      listing: teaser,
      envelopes: safeEnvelopes,
      grants: safeGrants,
      auditLog: auditEntries,
    });
  });
}
