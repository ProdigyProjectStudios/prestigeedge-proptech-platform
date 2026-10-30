import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { DocumentVaultPanel } from "@/components/dealroom/document-vault";
import { DealOperationsPanel } from "@/components/dealroom/deal-operations";
import { Shield, Lock, FileText, ChevronLeft, CheckCircle, AlertCircle, Clock, Eye, Download, User, Settings, Search, Building2, TrendingUp, MapPin, Users, ChevronRight, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoRole = "buyer" | "admin";

interface DemoSession {
  sessionToken: string;
  role: DemoRole;
  name: string;
  kind?: "demo" | "authenticated";
}

interface PublicTeaser {
  listingId: string;
  title: string;
  industry: string;
  region: string;
  revenueRange: string;
  ebitdaRange: string;
  askingPriceRange: string;
  established: string;
  employees: string;
  summary: string;
  highlights: string[];
}

interface NDAStatus {
  hasEnvelope: boolean;
  envelopeId: string | null;
  envelopeStatus: string | null;
  envelopeProvider?: string | null;
  providerTestMode?: boolean | null;
  hasAccess: boolean;
  grantId: string | null;
}

interface ConfidentialRecord {
  companyName: string;
  legalName: string;
  address: string;
  yearFounded: number;
  revenue: number;
  ebitda: number;
  ebitdaMargin: string;
  netIncome: number;
  askingPrice: number;
  evEbitdaMultiple: string;
  sellerNotes: string;
}

interface CIMSection {
  heading: string;
  body: string;
}

interface AdminView {
  listing: PublicTeaser;
  envelopes: Array<{
    envelopeId: string;
    buyerName: string;
    status: string;
    provider: string;
    createdAt: string;
    signedAt?: string;
  }>;
  grants: Array<{
    grantId: string;
    buyerName: string;
    envelopeId: string;
    grantedAt: string;
  }>;
  auditLog: Array<{
    id: string;
    event: string;
    actorName: string;
    actorRole: string;
    detail: string;
    timestamp: string;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_KEY = "dr_session_token";

function getStoredToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

function storeToken(token: string) {
  sessionStorage.setItem(SESSION_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

function drFetch(path: string, opts: RequestInit = {}) {
  const token = getStoredToken();
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-DR-Session": token } : {}),
      ...(localStorage.getItem("token") ? { Authorization: "Bearer " + localStorage.getItem("token") } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const EVENT_LABELS: Record<string, string> = {
  listing_viewed: "Listing Viewed",
  nda_requested: "NDA Requested",
  envelope_created: "Envelope Created",
  demo_signature_completed: "Signature Completed",
  provider_nda_sent: "Provider NDA Sent",
  provider_signature_verified: "Provider Signature Verified",
  vault_document_uploaded: "Vault Document Uploaded",
  vault_document_versioned: "Vault Document Versioned",
  vault_document_downloaded: "Vault Document Downloaded",
  vault_document_revoked: "Vault Document Revoked",
  ops_deal_created: "Deal Created",
  ops_stage_changed: "Deal Stage Updated",
  ops_task_created: "Task Created",
  ops_task_updated: "Task Updated",
  access_grant_created: "Access Grant Created",
  confidential_accessed: "Confidential Record Accessed",
  cim_accessed: "CIM Accessed",
};

const EVENT_ICONS: Record<string, typeof Eye> = {
  listing_viewed: Eye,
  nda_requested: FileText,
  envelope_created: FileText,
  demo_signature_completed: CheckCircle,
  provider_nda_sent: FileText,
  provider_signature_verified: Shield,
  vault_document_uploaded: FileText,
  vault_document_versioned: FileText,
  vault_document_downloaded: Download,
  vault_document_revoked: Lock,
  ops_deal_created: Building2,
  ops_stage_changed: TrendingUp,
  ops_task_created: FileText,
  ops_task_updated: CheckCircle,
  access_grant_created: Shield,
  confidential_accessed: Lock,
  cim_accessed: Download,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function DemoModeBanner({
  session, demoAccess, hasAccountLogin, onSwitch, onUseAccount,
}: {
  session: DemoSession | null;
  demoAccess: boolean;
  hasAccountLogin: boolean;
  onSwitch: (role: DemoRole) => void;
  onUseAccount: () => void;
}) {
  const accountMode = session?.kind === "authenticated";
  return (
    <div className="border-b border-luxe-bronze/30 bg-luxe-bronze/5">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-[9px] uppercase tracking-[0.25em] text-luxe-bronze border border-luxe-bronze/40 px-2 py-1">
            {accountMode ? "Authenticated account" : "Synthetic portfolio demo"}
          </span>
          {session && <span className="text-xs text-luxe-text-muted">
            {session.name} <span className="text-luxe-bronze">({session.role})</span>
          </span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {demoAccess && !accountMode && (
            <>
              <span className="text-[9px] uppercase tracking-widest text-luxe-text-muted mr-1">Preview role:</span>
              <button type="button" onClick={() => onSwitch("buyer")}
                className={session?.role === "buyer"
                  ? "h-8 px-3 text-[10px] uppercase tracking-widest border border-luxe-bronze bg-luxe-bronze text-luxe-bg"
                  : "h-8 px-3 text-[10px] uppercase tracking-widest border border-luxe-border/50 text-luxe-text-muted hover:border-luxe-bronze/50"}>
                Buyer
              </button>
              <button type="button" onClick={() => onSwitch("admin")}
                className={session?.role === "admin"
                  ? "h-8 px-3 text-[10px] uppercase tracking-widest border border-luxe-bronze bg-luxe-bronze text-luxe-bg"
                  : "h-8 px-3 text-[10px] uppercase tracking-widest border border-luxe-border/50 text-luxe-text-muted hover:border-luxe-bronze/50"}>
                Admin
              </button>
            </>
          )}
          {hasAccountLogin && !accountMode && (
            <button type="button" onClick={onUseAccount}
              className="h-8 px-3 text-[10px] uppercase tracking-widest border border-luxe-bronze/60 text-luxe-bronze hover:bg-luxe-bronze/10">
              <Shield className="h-3 w-3 inline mr-2" />Use my account
            </button>
          )}
          {!demoAccess && !hasAccountLogin && (
            <Link href="/login">
              <span className="text-[10px] uppercase tracking-widest border border-luxe-bronze/60 text-luxe-bronze px-4 py-2 cursor-pointer">
                Sign in for Deal Room access
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-luxe-bg border border-luxe-border/40 px-5 py-4">
      <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1.5">{label}</div>
      <div className="font-serif text-lg text-luxe-text">{value}</div>
    </div>
  );
}

function LockedOverlay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-14 h-14 border border-luxe-border/40 flex items-center justify-center">
        <Lock className="h-6 w-6 text-luxe-text-muted" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-luxe-text-muted text-center max-w-xs">{message}</p>
    </div>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function LookupScreen({ onFound }: { onFound: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = query.trim();
    if (!id) return;
    setLoading(true);
    const res = await drFetch(`/api/dealroom/listings/${encodeURIComponent(id)}`);
    setLoading(false);
    if (res.ok) {
      onFound(id);
    } else {
      setError("No listing found for that ID. Try MNA-2047 or a property UUID.");
    }
  };

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <div className="text-center mb-10">
        <div className="text-[10px] uppercase tracking-[0.35em] text-luxe-text-muted mb-3">Confidential Deal Room</div>
        <h2 className="font-serif italic text-3xl text-luxe-text">Listing Lookup</h2>
        <p className="text-xs text-luxe-text-muted mt-3 leading-relaxed">
          Enter a listing ID to access the blind teaser. Confidential details require NDA completion.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. MNA-2047"
          className="flex-1 h-11 bg-luxe-surface border border-luxe-border/50 text-luxe-text placeholder:text-luxe-text-muted/50 px-4 text-sm focus:outline-none focus:border-luxe-bronze"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-11 px-5 bg-luxe-bronze text-luxe-bg text-[10px] uppercase tracking-widest font-medium hover:bg-luxe-bronze-light transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" strokeWidth={1.5} />}
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function TeaserScreen({
  listing,
  session,
  ndaStatus,
  onRequestNDA,
  onViewConfidential,
  onRefreshStatus,
  loading,
}: {
  listing: PublicTeaser;
  session: DemoSession | null;
  ndaStatus: NDAStatus | null;
  onRequestNDA: () => void;
  onViewConfidential: () => void;
  onRefreshStatus: () => void;
  loading: boolean;
}) {
  const isBuyer = session?.role === "buyer";
  const hasAccess = ndaStatus?.hasAccess;
  const hasPending = ndaStatus?.hasEnvelope && !hasAccess;
  const externalNda = ndaStatus?.envelopeProvider === "DropboxSign";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[9px] uppercase tracking-[0.3em] text-luxe-bronze border border-luxe-bronze/40 px-2 py-0.5">{listing.listingId}</span>
            <span className="text-[9px] uppercase tracking-widest text-luxe-text-muted border border-luxe-border/40 px-2 py-0.5">Blind Teaser</span>
          </div>
          <h1 className="font-serif italic text-2xl md:text-3xl text-luxe-text">{listing.title}</h1>
          <div className="flex items-center gap-1.5 mt-2">
            <MapPin className="h-3.5 w-3.5 text-luxe-bronze" strokeWidth={1.5} />
            <span className="text-xs text-luxe-text-muted">{listing.region}</span>
          </div>
        </div>

        {/* NDA / Access CTA */}
        {isBuyer && (
          <div className="shrink-0">
            {hasAccess ? (
              <button
                onClick={onViewConfidential}
                className="h-11 px-5 bg-emerald-900/40 border border-emerald-500/40 text-emerald-400 text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-900/60 transition-colors"
              >
                <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                View Confidential Record
              </button>
            ) : hasPending ? (
              <button type="button" onClick={externalNda ? onRefreshStatus : onRequestNDA} disabled={loading}
                className="h-11 px-5 bg-luxe-surface border border-luxe-bronze/40 text-luxe-text text-[10px] uppercase tracking-widest flex items-center gap-2 hover:border-luxe-bronze disabled:opacity-50">
                <Clock className="h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
                {externalNda ? "Refresh NDA Verification" : "Continue Demo NDA"}
              </button>
            ) : (
              <button
                onClick={onRequestNDA}
                disabled={loading}
                className="h-11 px-5 bg-luxe-bronze text-luxe-bg text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-luxe-bronze-light transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" strokeWidth={1.5} />}
                Request NDA Access
              </button>
            )}
          </div>
        )}
        {!session && (
          <div className="shrink-0 text-[10px] uppercase tracking-widest text-luxe-text-muted border border-luxe-border/40 px-4 py-3 text-center">
            Select buyer role to<br />request NDA access
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-luxe-border/20 mb-8">
        <StatCard label="Industry" value={listing.industry} />
        <StatCard label="Revenue Range" value={listing.revenueRange} />
        <StatCard label="EBITDA Range" value={listing.ebitdaRange} />
        <StatCard label="Asking Price" value={listing.askingPriceRange} />
        <StatCard label="Established" value={listing.established} />
        <StatCard label="Employees" value={listing.employees} />
      </div>

      {/* Summary */}
      <div className="bg-luxe-surface border border-luxe-border/40 p-6 mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-3">Deal Summary</div>
        <p className="text-sm text-luxe-text leading-relaxed">{listing.summary}</p>
      </div>

      {/* Highlights */}
      <div className="bg-luxe-surface border border-luxe-border/40 p-6 mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-4">Key Highlights</div>
        <ul className="space-y-2">
          {listing.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-luxe-text">
              <ChevronRight className="h-4 w-4 text-luxe-bronze shrink-0 mt-0.5" strokeWidth={1.5} />
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* Confidential lock notice */}
      {!hasAccess && (
        <div className="border border-luxe-border/40 bg-luxe-bg px-6 py-5 flex items-start gap-4">
          <Lock className="h-5 w-5 text-luxe-text-muted shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Confidential Information Withheld</div>
            <p className="text-xs text-luxe-text-muted leading-relaxed">
              The company name, exact location, detailed financials, seller notes, and CIM are available only after NDA execution.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function NDAConfirmScreen({
  envelopeId,
  buyerName,
  onSign,
  onBack,
  loading,
}: {
  envelopeId: string;
  buyerName: string;
  onSign: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div className="max-w-lg mx-auto px-4 py-14">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors mb-10">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back
      </button>
      <div className="text-center mb-10">
        <div className="w-14 h-14 border border-luxe-bronze/40 flex items-center justify-center mx-auto mb-5">
          <FileText className="h-6 w-6 text-luxe-bronze" strokeWidth={1.5} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.35em] text-luxe-text-muted mb-3">NDA Review</div>
        <h2 className="font-serif italic text-2xl text-luxe-text mb-2">Mutual Non-Disclosure Agreement</h2>
        <p className="text-xs text-luxe-text-muted leading-relaxed">
          This agreement governs access to confidential information for listing MNA-2047.
        </p>
      </div>

      <div className="bg-luxe-surface border border-luxe-border/50 p-6 mb-6 space-y-4 text-xs text-luxe-text-muted leading-relaxed">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-bronze mb-1">Receiving Party</div>
            <div className="text-luxe-text">{buyerName}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-bronze mb-1">Listing ID</div>
            <div className="text-luxe-text">MNA-2047</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-bronze mb-1">Envelope ID</div>
            <div className="text-luxe-text font-mono text-[10px] break-all">{envelopeId}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-bronze mb-1">Provider</div>
            <div className="text-luxe-text">DemoSignatureProvider</div>
          </div>
        </div>
        <hr className="border-luxe-border/30" />
        <p>
          The Receiving Party agrees to hold all Confidential Information received in connection with listing MNA-2047 in strict confidence, to use such information solely for the purpose of evaluating the referenced transaction, and not to disclose such information to any third party without prior written consent of the Disclosing Party.
        </p>
        <p>
          This agreement is binding upon execution and shall remain in effect for a period of two (2) years from the date of signature.
        </p>
        <p className="text-[10px] italic text-luxe-text-muted/60">
          This is a demonstration NDA generated by DemoSignatureProvider. No legal obligation is created.
        </p>
      </div>

      <button
        onClick={onSign}
        disabled={loading}
        className="w-full h-12 bg-luxe-bronze text-luxe-bg text-[10px] uppercase tracking-[0.25em] font-medium hover:bg-luxe-bronze-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processing Signature…</>
        ) : (
          <><CheckCircle className="h-4 w-4" strokeWidth={1.5} /> Complete Demo Signature</>
        )}
      </button>
      <p className="text-[10px] text-luxe-text-muted/60 text-center mt-3">
        Signature is processed server-side and cannot be bypassed client-side.
      </p>
    </div>
  );
}

function ConfidentialScreen({
  record,
  cim,
  grantId,
  onLoadCIM,
  cimLoading,
}: {
  record: ConfidentialRecord;
  cim: { sections: CIMSection[] } | null;
  grantId: string;
  onLoadCIM: () => void;
  cimLoading: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center">
          <CheckCircle className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-emerald-400">NDA Executed — Access Granted</div>
          <div className="text-[10px] text-luxe-text-muted font-mono mt-0.5">Grant ID: {grantId}</div>
        </div>
      </div>

      {/* Confidential record */}
      <div className="bg-luxe-surface border border-luxe-border/50 mb-6">
        <div className="px-6 py-4 border-b border-luxe-border/30 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">Confidential Listing Record — MNA-2047</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Company Name</div>
            <div className="font-serif text-lg text-luxe-text">{record.companyName}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Legal Entity</div>
            <div className="text-sm text-luxe-text">{record.legalName}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Address</div>
            <div className="text-sm text-luxe-text">{record.address}</div>
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="bg-luxe-surface border border-luxe-border/50 mb-6">
        <div className="px-6 py-4 border-b border-luxe-border/30 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">Detailed Financials (TTM)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-luxe-border/20">
          {[
            { l: "Revenue", v: fmtCurrency(record.revenue) },
            { l: "EBITDA", v: fmtCurrency(record.ebitda) },
            { l: "EBITDA Margin", v: record.ebitdaMargin },
            { l: "Net Income", v: fmtCurrency(record.netIncome) },
            { l: "Asking Price", v: fmtCurrency(record.askingPrice) },
            { l: "EV / EBITDA", v: record.evEbitdaMultiple },
          ].map(({ l, v }) => (
            <div key={l} className="bg-luxe-surface px-5 py-4">
              <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">{l}</div>
              <div className="font-serif text-base text-luxe-text">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Seller notes */}
      <div className="bg-luxe-surface border border-luxe-border/50 p-6 mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-3">Confidential Seller Notes</div>
        <p className="text-sm text-luxe-text leading-relaxed">{record.sellerNotes}</p>
      </div>

      {/* CIM Panel */}
      <div className="bg-luxe-surface border border-luxe-border/50">
        <div className="px-6 py-4 border-b border-luxe-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">Confidential Information Memorandum</span>
          </div>
          {!cim && (
            <button
              onClick={onLoadCIM}
              disabled={cimLoading}
              className="h-8 px-4 bg-luxe-bronze text-luxe-bg text-[9px] uppercase tracking-widest hover:bg-luxe-bronze-light transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {cimLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" strokeWidth={1.5} />}
              Load CIM
            </button>
          )}
        </div>
        {cim ? (
          <div className="p-6 space-y-6">
            {cim.sections.map((s, i) => (
              <div key={i}>
                <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-bronze mb-2">{s.heading}</div>
                <p className="text-sm text-luxe-text leading-relaxed">{s.body}</p>
                {i < cim.sections.length - 1 && <hr className="mt-5 border-luxe-border/20" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-xs text-luxe-text-muted">
            Click "Load CIM" to retrieve the Confidential Information Memorandum via a protected server route.
          </div>
        )}
      </div>
    </div>
  );
}

function AdminScreen({ data }: { data: AdminView }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.35em] text-luxe-text-muted mb-2">Admin — Deal Room</div>
        <h1 className="font-serif italic text-2xl text-luxe-text">{data.listing.listingId} — {data.listing.title}</h1>
      </div>

      {/* Envelopes */}
      <div className="bg-luxe-surface border border-luxe-border/50 mb-6">
        <div className="px-6 py-4 border-b border-luxe-border/30 flex items-center gap-2">
          <FileText className="h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">NDA Envelopes ({data.envelopes.length})</span>
        </div>
        {data.envelopes.length === 0 ? (
          <div className="px-6 py-8 text-xs text-luxe-text-muted text-center">No envelopes yet.</div>
        ) : (
          <div className="divide-y divide-luxe-border/20">
            {data.envelopes.map((env) => (
              <div key={env.envelopeId} className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Buyer</div>
                  <div className="text-sm text-luxe-text">{env.buyerName}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Status</div>
                  <span className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 ${
                    env.status === "signed"
                      ? "border-emerald-500/40 text-emerald-400"
                      : "border-luxe-bronze/40 text-luxe-bronze"
                  }`}>{env.status}</span>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Provider</div>
                  <div className="text-xs text-luxe-text-muted">{env.provider}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">{env.signedAt ? "Signed" : "Created"}</div>
                  <div className="text-xs text-luxe-text-muted">{fmtTime(env.signedAt ?? env.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Access Grants */}
      <div className="bg-luxe-surface border border-luxe-border/50 mb-6">
        <div className="px-6 py-4 border-b border-luxe-border/30 flex items-center gap-2">
          <Shield className="h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">Access Grants ({data.grants.length})</span>
        </div>
        {data.grants.length === 0 ? (
          <div className="px-6 py-8 text-xs text-luxe-text-muted text-center">No access grants yet.</div>
        ) : (
          <div className="divide-y divide-luxe-border/20">
            {data.grants.map((g) => (
              <div key={g.grantId} className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Buyer</div>
                  <div className="text-sm text-luxe-text">{g.buyerName}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Grant ID</div>
                  <div className="text-[10px] font-mono text-luxe-text-muted break-all">{g.grantId}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Granted</div>
                  <div className="text-xs text-luxe-text-muted">{fmtTime(g.grantedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div className="bg-luxe-surface border border-luxe-border/50">
        <div className="px-6 py-4 border-b border-luxe-border/30 flex items-center gap-2">
          <Clock className="h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">Audit Timeline ({data.auditLog.length})</span>
        </div>
        {data.auditLog.length === 0 ? (
          <div className="px-6 py-8 text-xs text-luxe-text-muted text-center">No audit entries yet.</div>
        ) : (
          <div className="p-6">
            <div className="relative space-y-0">
              {[...data.auditLog].reverse().map((entry, i) => {
                const Icon = EVENT_ICONS[entry.event] ?? Eye;
                const isLast = i === data.auditLog.length - 1;
                return (
                  <div key={entry.id} className="flex gap-4 pb-6 relative">
                    {/* Timeline line */}
                    {!isLast && <div className="absolute left-4 top-8 bottom-0 w-px bg-luxe-border/30" />}
                    <div className="w-8 h-8 shrink-0 bg-luxe-bg border border-luxe-border/50 flex items-center justify-center z-10">
                      <Icon className="h-3.5 w-3.5 text-luxe-bronze" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-0.5">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-luxe-text">
                          {EVENT_LABELS[entry.event] ?? entry.event}
                        </span>
                        <span className="text-[10px] text-luxe-text-muted">{fmtTime(entry.timestamp)}</span>
                      </div>
                      <p className="text-xs text-luxe-text-muted leading-relaxed">{entry.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Screen = "lookup" | "teaser" | "nda-confirm" | "confidential" | "admin";

export default function DealRoomPage() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [screen, setScreen] = useState<Screen>("lookup");
  const [listingId, setListingId] = useState<string | null>(null);
  const [listing, setListing] = useState<PublicTeaser | null>(null);
  const [ndaStatus, setNdaStatus] = useState<NDAStatus | null>(null);
  const [pendingEnvelopeId, setPendingEnvelopeId] = useState<string | null>(null);
  const [confidentialRecord, setConfidentialRecord] = useState<ConfidentialRecord | null>(null);
  const [cim, setCim] = useState<{ sections: CIMSection[] } | null>(null);
  const [grantId, setGrantId] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [demoAccess, setDemoAccess] = useState(true);
  const [hasAccountLogin, setHasAccountLogin] = useState(() => Boolean(localStorage.getItem("token")));

  useEffect(() => {
    fetch("/api/dealroom/capabilities")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDemoAccess(data.demoAccess === true); })
      .catch(() => {});
  }, []);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    drFetch("/api/dealroom/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSession({ sessionToken: token, role: data.role, name: data.name, kind: data.kind });
      })
      .catch(() => {});
  }, []);

  const switchRole = useCallback(async (role: DemoRole) => {
    clearToken();
    setSession(null);
    // Keep listing + listingId so the new session lands back on the teaser
    setScreen(listing ? "teaser" : "lookup");
    setNdaStatus(null);
    setConfidentialRecord(null);
    setCim(null);
    setAdminData(null);
    setPendingEnvelopeId(null);
    setGrantId(null);
    setError("");

    const res = await fetch("/api/dealroom/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) return;
    const data = await res.json();
    storeToken(data.sessionToken);
    setSession(data);
  }, [listing]);

  const useAccountSession = useCallback(async () => {
    const jwtToken = localStorage.getItem("token");
    if (!jwtToken) { setError("Sign in to your account first."); return; }
    setLoading(true);
    setError("");
    const response = await fetch("/api/dealroom/auth-session", {
      method: "POST",
      headers: { Authorization: "Bearer " + jwtToken, "Content-Type": "application/json" },
    });
    setLoading(false);
    if (!response.ok) { setError("Could not open authenticated Deal Room session."); return; }
    const data = await response.json() as DemoSession;
    clearToken();
    storeToken(data.sessionToken);
    setSession(data);
    setScreen(listing ? "teaser" : "lookup");
    setNdaStatus(null);
    setNotice("Account session active. External signing will be handled by the provider, not a demo button.");
    setHasAccountLogin(true);
  }, [listing]);

  const loadListing = useCallback(async (id: string) => {
    setLoading(true);
    const res = await drFetch(`/api/dealroom/listings/${encodeURIComponent(id)}`);
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setListing(data.listing);
    setScreen("teaser");

    // Also fetch NDA status for buyers
    if (session?.role === "buyer") {
      const sr = await drFetch(`/api/dealroom/listings/${encodeURIComponent(id)}/status`);
      if (sr.ok) setNdaStatus(await sr.json());
    }
  }, [session]);

  const handleListingFound = useCallback((id: string) => {
    setListingId(id);
    loadListing(id);
  }, [loadListing]);

  // When session is set to admin, auto-load admin view for current listingId
  const loadAdminView = useCallback(async (id: string) => {
    setLoading(true);
    const aRes = await drFetch(`/api/dealroom/admin/listings/${encodeURIComponent(id)}`);
    setLoading(false);
    if (aRes.ok) {
      setAdminData(await aRes.json());
      setScreen("admin");
    }
  }, []);

  useEffect(() => {
    if (session?.role === "admin" && screen !== "admin" && listingId) {
      loadAdminView(listingId);
    }
  }, [session, loadAdminView, screen, listingId]);

  const refreshStatus = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    const sr = await drFetch("/api/dealroom/listings/" + encodeURIComponent(listingId) + "/status");
    setLoading(false);
    if (!sr.ok) { setError("Could not refresh the NDA verification status."); return; }
    const status = await sr.json() as NDAStatus;
    setNdaStatus(status);
    if (status.hasAccess) setNotice("The completed NDA has been verified and access was granted.");
    else setNotice("Awaiting the provider's signature verification.");
  }, [listingId]);

  const handleRequestNDA = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError("");
    const res = await drFetch(`/api/dealroom/listings/${encodeURIComponent(listingId)}/nda`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error || "Failed to issue NDA.");
      return;
    }
    const data = await res.json();
    setPendingEnvelopeId(data.envelopeId);
    if (session?.kind === "authenticated") {
      setNdaStatus({
        hasEnvelope: true, envelopeId: data.envelopeId, envelopeStatus: data.status,
        envelopeProvider: data.provider, providerTestMode: data.testMode,
        hasAccess: data.status === "signed", grantId: null,
      });
      setNotice(data.testMode
        ? "Dropbox Sign test NDA emailed. Test signatures are not legally binding. Return here to refresh verification."
        : "Signature request emailed. Return here to refresh verification.");
      setScreen("teaser");
    } else {
      setScreen("nda-confirm");
    }
  }, [listingId, session]);

  const handleSign = useCallback(async () => {
    if (!pendingEnvelopeId || !listingId) return;
    setLoading(true);
    setError("");
    const res = await drFetch(`/api/dealroom/envelopes/${pendingEnvelopeId}/sign`, { method: "POST" });
    setLoading(false);
    if (!res.ok) { setError("Signature processing failed."); return; }
    const signData = await res.json();
    setGrantId(signData.grantId);

    const cr = await drFetch(`/api/dealroom/listings/${encodeURIComponent(listingId)}/confidential`);
    if (!cr.ok) { setError("Access grant created but confidential fetch failed."); return; }
    const crData = await cr.json();
    setConfidentialRecord(crData.record);
    setScreen("confidential");
  }, [pendingEnvelopeId, listingId]);

  // Used both after signing and when a returning buyer already has a grant
  const handleViewConfidential = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError("");
    const res = await drFetch(`/api/dealroom/listings/${encodeURIComponent(listingId)}/confidential`);
    setLoading(false);
    if (!res.ok) {
      setError("Could not load confidential record. Ensure your NDA is signed.");
      return;
    }
    const data = await res.json();
    setConfidentialRecord(data.record);
    setGrantId(data.grantId);
    setScreen("confidential");
  }, [listingId]);

  const handleLoadCIM = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    const res = await drFetch(`/api/dealroom/listings/${encodeURIComponent(listingId)}/cim`);
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setCim(data.cim);
    }
  }, [listingId]);

  return (
    <div className="min-h-screen bg-luxe-bg text-luxe-text">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full bg-luxe-bg/95 backdrop-blur-sm border-b border-luxe-border/30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 md:h-14">
            <Link href="/">
              <span className="font-serif text-lg md:text-xl tracking-wide text-luxe-text cursor-pointer">
                PRESTIGE<span className="text-luxe-bronze">EDGE</span>
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-[9px] uppercase tracking-[0.35em] text-luxe-text-muted border border-luxe-border/30 px-2 py-0.5">Deal Room</span>
              <Link href="/">
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors cursor-pointer">
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />Back
                </span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Review / account session banner */}
      <DemoModeBanner session={session} demoAccess={demoAccess} hasAccountLogin={hasAccountLogin} onSwitch={switchRole} onUseAccount={useAccountSession} />

      {notice && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="border border-luxe-bronze/30 bg-luxe-bronze/5 px-4 py-3 text-xs text-luxe-text">
            {notice}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="flex items-start gap-3 bg-rose-950/30 border border-rose-500/30 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        </div>
      )}

      {/* Screens */}
      {screen === "lookup" && <LookupScreen onFound={handleListingFound} />}

      {screen === "teaser" && listing && (
        <TeaserScreen
          listing={listing}
          session={session}
          ndaStatus={ndaStatus}
          onRequestNDA={handleRequestNDA}
          onViewConfidential={handleViewConfidential}
          onRefreshStatus={refreshStatus}
          loading={loading}
        />
      )}

      {screen === "nda-confirm" && pendingEnvelopeId && session && (
        <NDAConfirmScreen
          envelopeId={pendingEnvelopeId}
          buyerName={session.name}
          onSign={handleSign}
          onBack={() => setScreen("teaser")}
          loading={loading}
        />
      )}

      {screen === "confidential" && confidentialRecord && grantId && (
        <>
          <ConfidentialScreen
            record={confidentialRecord}
            cim={cim}
            grantId={grantId}
            onLoadCIM={handleLoadCIM}
            cimLoading={loading}
          />
          {session?.kind === "authenticated" && listingId && (
            <div className="max-w-4xl mx-auto px-4 pb-12">
              <DocumentVaultPanel listingId={listingId} staff={false} />
            </div>
          )}
        </>
      )}

      {screen === "admin" && adminData && loading === false && (
        <>
          <AdminScreen data={adminData} />
          {session?.kind === "authenticated" && listingId && (
            <div className="max-w-5xl mx-auto px-4 pb-12">
              <DocumentVaultPanel listingId={listingId} staff />
            </div>
          )}
          {session?.kind === "authenticated" && (
            <DealOperationsPanel />
          )}
        </>
      )}
      {screen === "admin" && loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-luxe-bronze" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
