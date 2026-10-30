import type { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticateToken, type AuthenticatedRequest } from "../auth";
import { demoAccessEnabled, demoListingAllowed } from "./security";
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


function safe(fn: (req: Request, res: Response) => Promise<unknown>) {
  // Express 4 does not automatically catch rejected async handler promises.
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

async function getSessionFromRequest(req: Request): Promise<store.DemoSession | null> {
  const token = req.headers["x-dr-session"];
  if (typeof token !== "string" || token.length > 256) return null;
  const session = await store.getSession(token);
  if (!session) return null;
  if (session.kind !== "authenticated") {
    return demoAccessEnabled() ? session : null;
  }

  // An authenticated Deal Room session is useless without its matching active account JWT.
  const jwtToken = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!jwtToken || !process.env.JWT_SECRET || !session.principalId) return null;
  try {
    const identity = jwt.verify(jwtToken, process.env.JWT_SECRET) as { id?: string };
    if (!identity.id || identity.id !== session.principalId) return null;
    const user = await storage.getUser(identity.id);
    if (!user?.isActive) return null;
    if (session.role === "admin" && user.role !== "admin" && user.role !== "agent") return null;
    if (session.role === "buyer" && user.role !== "client") return null;
    return session;
  } catch {
    return null;
  }
}

async function requireSession(req: Request, res: Response, role: store.DemoRole) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Deal Room session required." });
    return null;
  }
  if (session.role !== role) {
    res.status(403).json({ error: role === "admin" ? "Admin session required." : "Buyer session required." });
    return null;
  }
  return session;
}

function ensureListingScope(session: store.DemoSession, id: string, res: Response): boolean {
  if (demoListingAllowed(session.kind, id)) return true;
  res.status(403).json({ error: "Public demo sessions are restricted to synthetic listing MNA-2047." });
  return false;
}

export function registerDealRoomRoutes(app: Express) {
  // Introspection prevents clients from conflating a simulated workflow with verified signing.
  app.get("/api/dealroom/capabilities", safe(async (_req, res) => {
    return res.json({
      demoAccess: demoAccessEnabled(),
      durableStorage: store.isPersistent(),
      verifiedProviderSigning: false,
      privateDocumentVault: false,
      crmOutboundSync: false,
    });
  }));

  // The demo endpoint intentionally allows buyer/admin role switching for synthetic MNA-2047.
  // It is disabled by default on production deployments.
  app.post("/api/dealroom/session", safe(async (req, res) => {
    if (!demoAccessEnabled()) {
      return res.status(403).json({ error: "Public Deal Room demo sessions are disabled." });
    }
    const role = req.body?.role;
    if (role !== "buyer" && role !== "admin") {
      return res.status(400).json({ error: "role must be 'buyer' or 'admin'." });
    }
    const session = await store.createDemoSession(role);
    return res.json({
      sessionToken: session.sessionToken,
      role: session.role,
      name: session.name,
      kind: "demo",
    });
  }));

  // Real users are assigned roles from their authenticated agency account, never request body.
  // The caller must use both its ordinary Authorization bearer and returned X-DR-Session.
  app.post("/api/dealroom/auth-session", authenticateToken, safe(async (req, res) => {
    if (!store.isPersistent() || !process.env.JWT_SECRET) {
      return res.status(503).json({ error: "Authenticated Deal Room requires PostgreSQL and JWT_SECRET." });
    }
    const user = (req as AuthenticatedRequest).user;
    if (!user?.isActive) return res.status(401).json({ error: "Authentication required." });
    const role: store.DemoRole = user.role === "admin" || user.role === "agent" ? "admin" : "buyer";
    const session = await store.createAuthenticatedSession(role, user.name, user.id);
    return res.json({
      sessionToken: session.sessionToken,
      role: session.role,
      name: session.name,
      kind: "authenticated",
    });
  }));

  app.get("/api/dealroom/session", safe(async (req, res) => {
    const session = await getSessionFromRequest(req);
    if (!session) return res.status(401).json({ error: "No active Deal Room session." });
    return res.json({ role: session.role, name: session.name, kind: session.kind ?? "demo" });
  }));

  app.get("/api/dealroom/listings/:id", safe(async (req, res) => {
    const { id } = req.params;
    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });
    const session = await getSessionFromRequest(req);
    if (session && demoListingAllowed(session.kind, id)) {
      await store.addAuditEntry(id, "listing_viewed", session, session.name + " viewed teaser for " + id);
    }
    return res.json({ listing: teaser });
  }));

  app.get("/api/dealroom/listings/:id/status", safe(async (req, res) => {
    const session = await requireSession(req, res, "buyer");
    if (!session) return;
    const { id } = req.params;
    if (!ensureListingScope(session, id, res)) return;
    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });
    const envelope = await store.getEnvelopeByBuyer(id, session.sessionToken);
    const grant = await store.getAccessGrant(id, session.sessionToken);
    return res.json({
      hasEnvelope: !!envelope,
      envelopeId: envelope?.envelopeId ?? null,
      envelopeStatus: envelope?.status ?? null,
      hasAccess: !!grant,
      grantId: grant?.grantId ?? null,
    });
  }));

  app.post("/api/dealroom/listings/:id/nda", safe(async (req, res) => {
    const session = await requireSession(req, res, "buyer");
    if (!session) return;
    const { id } = req.params;
    if (!ensureListingScope(session, id, res)) return;
    // Do NOT issue a real-account NDA from a simulated signature provider.
    if (session.kind === "authenticated") {
      return res.status(503).json({ error: "Verified e-signature provider not configured. No access has been granted." });
    }
    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });
    const existing = await store.getEnvelopeByBuyer(id, session.sessionToken);
    if (existing) {
      return res.json({
        envelopeId: existing.envelopeId,
        status: existing.status,
        buyerName: session.name,
        alreadyExisted: true,
      });
    }
    const envelope = await store.createEnvelope(id, session);
    await store.addAuditEntry(id, "nda_requested", session, session.name + " requested synthetic NDA access for " + id);
    await store.addAuditEntry(id, "envelope_created", session, "Demo envelope " + envelope.envelopeId + " created via " + signatureProvider.name);
    return res.status(201).json({
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      buyerName: session.name,
      provider: envelope.provider,
    });
  }));

  app.post("/api/dealroom/envelopes/:envelopeId/sign", safe(async (req, res) => {
    const session = await requireSession(req, res, "buyer");
    if (!session) return;
    if (session.kind === "authenticated") {
      return res.status(409).json({ error: "Browser signing is disabled for authenticated accounts; verified provider confirmation is required." });
    }
    const { envelopeId } = req.params;
    const envelope = await store.getEnvelopeForSession(envelopeId, session.sessionToken);
    if (!envelope) return res.status(404).json({ error: "Envelope not found for this session." });
    if (!ensureListingScope(session, envelope.listingId, res)) return;
    const outcome = await store.completeDemoSignature(envelopeId, session);
    if (outcome.kind === "missing") return res.status(404).json({ error: "Envelope not found." });
    if (outcome.kind === "forbidden") return res.status(403).json({ error: "Envelope cannot be signed by this buyer." });
    return res.json({ success: true, grantId: outcome.grant.grantId, alreadySigned: outcome.alreadySigned });
  }));

  app.get("/api/dealroom/listings/:id/confidential", safe(async (req, res) => {
    const session = await requireSession(req, res, "buyer");
    if (!session) return;
    const { id } = req.params;
    if (!ensureListingScope(session, id, res)) return;
    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });
    const grant = await store.getAccessGrant(id, session.sessionToken);
    if (!grant) {
      return res.status(403).json({
        error: "Access denied.",
        reason: "A completed and verified NDA is required for confidential details.",
        code: "NO_ACCESS_GRANT",
      });
    }
    await store.addAuditEntry(id, "confidential_accessed", session, session.name + " accessed confidential record for " + id);
    const record = await resolveConfidential(id);
    return res.json({ record, grantId: grant.grantId });
  }));

  app.get("/api/dealroom/listings/:id/cim", safe(async (req, res) => {
    const session = await requireSession(req, res, "buyer");
    if (!session) return;
    const { id } = req.params;
    if (!ensureListingScope(session, id, res)) return;
    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });
    const grant = await store.getAccessGrant(id, session.sessionToken);
    if (!grant) {
      return res.status(403).json({
        error: "Access denied.",
        reason: "Document access requires a signed NDA.",
        code: "NO_ACCESS_GRANT",
      });
    }
    await store.addAuditEntry(id, "cim_accessed", session, session.name + " accessed synthetic CIM for " + id);
    const cim = await resolveCIM(id);
    return res.json({ cim, grantId: grant.grantId });
  }));

  app.get("/api/dealroom/admin/listings/:id", safe(async (req, res) => {
    const session = await requireSession(req, res, "admin");
    if (!session) return;
    const { id } = req.params;
    if (!ensureListingScope(session, id, res)) return;
    const teaser = await resolveTeaser(id);
    if (!teaser) return res.status(404).json({ error: "Listing not found." });
    const envelopes = await store.getAllEnvelopesForListing(id);
    const grants = await store.getAllGrantsForListing(id);
    const auditEntries = await store.getAuditLog(id);
    const safeEnvelopes = envelopes.map(({ buyerSessionToken: _token, ...envelope }) => envelope);
    const safeGrants = grants.map(({ buyerSessionToken: _token, ...grant }) => grant);
    return res.json({ listing: teaser, envelopes: safeEnvelopes, grants: safeGrants, auditLog: auditEntries });
  }));
}
