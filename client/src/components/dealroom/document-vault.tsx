import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Download, FileText, LockKeyhole, RefreshCw, ShieldCheck, UploadCloud, XCircle } from "lucide-react";

interface VaultDocument {
  id: string;
  listingId: string;
  title: string;
  status: "active" | "revoked";
  currentVersion: number;
  filename: string;
  originalLength: number;
  sha256: string;
  createdAt: string;
}

function vaultHeaders(): Record<string, string> {
  const session = sessionStorage.getItem("dr_session_token");
  const account = localStorage.getItem("token");
  return {
    ...(session ? { "X-DR-Session": session } : {}),
    ...(account ? { Authorization: "Bearer " + account } : {}),
  };
}

export function DocumentVaultPanel({ listingId, staff }: { listingId: string; staff: boolean }) {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [title, setTitle] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const cap = await fetch("/api/dealroom/capabilities");
      const flags = await cap.json();
      if (!flags.privateDocumentVault) {
        setEnabled(false);
        setDocuments([]);
        return;
      }
      setEnabled(true);
      const response = await fetch(
        "/api/dealroom/listings/" + encodeURIComponent(listingId) + "/documents",
        { headers: vaultHeaders(), cache: "no-store" },
      );
      if (!response.ok) {
        setError(response.status === 403
          ? "A verified provider NDA is required to access the private documents."
          : "Could not load the private document index.");
        return;
      }
      const data = await response.json() as { documents: VaultDocument[] };
      setDocuments(data.documents);
    } catch {
      setError("Could not connect to the vault.");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setError("Select a PDF document first."); return; }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("PDF must be 5 MiB or smaller.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", selectedFile);
      if (!selectedDocId) data.append("title", title.trim());
      const endpoint = selectedDocId
        ? "/api/dealroom/documents/" + encodeURIComponent(selectedDocId) + "/versions"
        : "/api/dealroom/listings/" + encodeURIComponent(listingId) + "/documents";
      const response = await fetch(endpoint, {
        method: "POST", headers: vaultHeaders(), body: data,
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Vault upload failed.");
      setSelectedFile(null);
      setSelectedDocId("");
      setTitle("");
      setNotice("Encrypted PDF version saved. Buyers need a verified NDA to download it.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vault upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const download = async (doc: VaultDocument) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        "/api/dealroom/documents/" + encodeURIComponent(doc.id) + "/download",
        { headers: vaultHeaders(), cache: "no-store" },
      );
      if (!response.ok) throw new Error("Document download denied or unavailable.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (doc: VaultDocument) => {
    if (!window.confirm("Revoke access to this document and all its versions?")) return;
    setLoading(true);
    try {
      const response = await fetch(
        "/api/dealroom/documents/" + encodeURIComponent(doc.id),
        { method: "DELETE", headers: vaultHeaders() },
      );
      if (!response.ok) throw new Error("Document revocation failed.");
      setNotice("Document access revoked.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revocation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!enabled && !error) return null;

  return (
    <section className="bg-luxe-surface border border-luxe-border/50 mt-6">
      <div className="px-6 py-5 border-b border-luxe-border/30 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <LockKeyhole className="w-4 h-4 text-luxe-bronze" strokeWidth={1.5} />
            <h3 className="text-[11px] uppercase tracking-[0.25em] text-luxe-text">Private Document Vault</h3>
          </div>
          <p className="text-xs text-luxe-text-muted mt-2">
            Encrypted PDF versions · Verified access · Synthetic portfolio records only
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest border border-luxe-border/50 px-3 py-2 text-luxe-text-muted hover:text-luxe-bronze">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {notice && <p className="mx-6 mt-4 text-xs text-emerald-400">{notice}</p>}
      {error && <p className="mx-6 mt-4 text-xs text-rose-400">{error}</p>}

      {staff && enabled && (
        <form onSubmit={upload} className="px-6 py-5 border-b border-luxe-border/30 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs text-luxe-text-muted">
            Document title
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Confidential information memo" required={!selectedDocId}
              disabled={Boolean(selectedDocId)}
              className="mt-1 w-full h-10 px-3 bg-luxe-bg border border-luxe-border/50 text-luxe-text focus:border-luxe-bronze outline-none" />
          </label>
          <label className="text-xs text-luxe-text-muted">
            Select PDF (up to 5 MiB)
            <input type="file" accept=".pdf,application/pdf" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full py-2 text-xs text-luxe-text-muted file:mr-3 file:bg-luxe-bg file:border file:border-luxe-border/50 file:text-luxe-text file:px-2 file:py-1" />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={loading || !selectedFile}
              className="h-10 w-full flex items-center justify-center gap-2 bg-luxe-bronze text-luxe-bg text-[10px] uppercase tracking-widest disabled:opacity-50">
              <UploadCloud className="h-4 w-4" />
              {selectedDocId ? "Upload New Version" : "Encrypt & Upload"}
            </button>
          </div>
          {selectedDocId && (
            <button type="button" onClick={() => setSelectedDocId("")}
              className="text-left text-[10px] uppercase tracking-widest text-luxe-bronze md:col-span-3">
              Cancel new-version upload
            </button>
          )}
        </form>
      )}

      <div className="divide-y divide-luxe-border/20">
        {documents.length === 0 && (
          <p className="px-6 py-9 text-xs text-luxe-text-muted">
            {loading ? "Loading private records…" : "No authorized documents available."}
          </p>
        )}
        {documents.map(doc => (
          <div key={doc.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <FileText className="h-5 w-5 text-luxe-bronze shrink-0" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-luxe-text">{doc.title}</p>
              <p className="text-[10px] text-luxe-text-muted mt-1">
                Version {doc.currentVersion} · {Math.ceil(doc.originalLength / 1024)} KB · {doc.filename}
                {doc.status === "revoked" && " · REVOKED"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {doc.status === "active" && (
                <button type="button" onClick={() => void download(doc)} disabled={loading}
                  className="h-8 px-3 flex items-center gap-1.5 border border-luxe-bronze/40 text-luxe-bronze text-[10px] uppercase tracking-widest">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              )}
              {staff && doc.status === "active" && (
                <>
                  <button type="button" onClick={() => { setSelectedDocId(doc.id); setTitle(doc.title); }}
                    className="h-8 px-3 border border-luxe-border/50 text-luxe-text-muted text-[10px] uppercase tracking-widest">
                    New version
                  </button>
                  <button type="button" onClick={() => void revoke(doc)}
                    className="h-8 px-3 flex items-center gap-1 border border-rose-500/30 text-rose-300 text-[10px] uppercase tracking-widest">
                    <XCircle className="h-3.5 w-3.5" /> Revoke
                  </button>
                </>
              )}
              {doc.status === "active" && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
