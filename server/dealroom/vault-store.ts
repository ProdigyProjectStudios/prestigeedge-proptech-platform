import { randomUUID } from "node:crypto";
import { pool } from "../db";
import {
  decryptPdf, encryptPdf, vaultKey, validatePdf, vaultListingAllowed,
  type VaultCiphertext,
} from "./vault-crypto";

type Row = Record<string, any>;

export interface VaultActor {
  principalId: string;
  name: string;
  role: "buyer" | "admin";
}

export interface VaultDocument {
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

function rowToMeta(row: Row): VaultDocument {
  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    title: String(row.title),
    status: row.status as VaultDocument["status"],
    currentVersion: Number(row.current_version),
    filename: String(row.filename ?? ""),
    originalLength: Number(row.original_length ?? 0),
    sha256: String(row.sha256 ?? ""),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function hasProviderSignatureGrant(listingId: string, principalId: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM dealroom_grants g
      JOIN dealroom_envelopes e ON e.envelope_id=g.envelope_id
      WHERE g.listing_id=$1 AND g.buyer_principal_id=$2
        AND e.status='signed' AND e.provider='DropboxSign'
    ) AS permitted`,
    [listingId, principalId],
  );
  return r.rows[0]?.permitted === true;
}

async function recordAudit(
  executor: { query: (sql: string, values?: any[]) => Promise<unknown> },
  listingId: string,
  event: string,
  actor: VaultActor,
  documentId: string,
) {
  await executor.query(
    `INSERT INTO dealroom_audit(id,listing_id,event,actor_name,actor_role,detail)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), listingId, event, actor.name, actor.role, "Vault document: " + documentId],
  );
}

export async function listVaultDocuments(listingId: string, includeRevoked: boolean): Promise<VaultDocument[]> {
  if (!vaultListingAllowed(listingId)) return [];
  const result = await pool.query(
    `SELECT d.id,d.listing_id,d.title,d.status,d.current_version,d.created_at,
       v.filename,v.original_length,v.sha256
     FROM dealroom_documents d
     JOIN dealroom_document_versions v
       ON v.document_id=d.id AND v.version=d.current_version
     WHERE d.listing_id=$1 AND ($2::boolean OR d.status='active')
     ORDER BY d.created_at DESC,d.id`,
    [listingId, includeRevoked],
  );
  return result.rows.map((r: Row) => rowToMeta(r));
}

export async function getVaultDocumentMeta(id: string): Promise<VaultDocument | null> {
  const r = await pool.query(
    `SELECT d.id,d.listing_id,d.title,d.status,d.current_version,d.created_at,
       v.filename,v.original_length,v.sha256
     FROM dealroom_documents d JOIN dealroom_document_versions v
       ON v.document_id=d.id AND v.version=d.current_version
     WHERE d.id=$1`,
    [id],
  );
  return r.rows[0] ? rowToMeta(r.rows[0] as Row) : null;
}

export async function createVaultDocument(input: {
  listingId: string;
  title: string;
  filename: string;
  mime: string;
  bytes: Buffer;
  actor: VaultActor;
}): Promise<VaultDocument> {
  if (input.actor.role !== "admin" || !vaultListingAllowed(input.listingId)) {
    throw new Error("Vault upload is restricted to synthetic inventory staff");
  }
  if (!input.title.trim() || input.title.trim().length > 200) throw new Error("Invalid title");
  const safeName = validatePdf(input.bytes, input.filename, input.mime);
  const docId = randomUUID();
  const encrypted = encryptPdf(input.bytes, vaultKey(), { listingId: input.listingId, documentId: docId, version: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO dealroom_documents(id,listing_id,title,created_by,current_version)
       VALUES($1,$2,$3,$4,1)`,
      [docId, input.listingId, input.title.trim(), input.actor.principalId],
    );
    await client.query(
      `INSERT INTO dealroom_document_versions(
         id,document_id,version,filename,original_length,sha256,iv,auth_tag,ciphertext,uploaded_by
       ) VALUES($1,$2,1,$3,$4,$5,$6,$7,$8,$9)`,
      [randomUUID(), docId, safeName, encrypted.originalLength,
       encrypted.sha256, encrypted.iv, encrypted.tag, encrypted.ciphertext, input.actor.principalId],
    );
    await recordAudit(client, input.listingId, "vault_document_uploaded", input.actor, docId);
    await client.query("COMMIT");
    const result = await getVaultDocumentMeta(docId);
    if (!result) throw new Error("Vault metadata missing after upload");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function addVaultVersion(input: {
  documentId: string;
  filename: string;
  mime: string;
  bytes: Buffer;
  actor: VaultActor;
}): Promise<VaultDocument> {
  if (input.actor.role !== "admin") throw new Error("Staff access required");
  const safeName = validatePdf(input.bytes, input.filename, input.mime);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      "SELECT * FROM dealroom_documents WHERE id=$1 FOR UPDATE", [input.documentId],
    );
    const row = r.rows[0] as Row | undefined;
    if (!row || row.status !== "active" || !vaultListingAllowed(row.listing_id)) {
      await client.query("ROLLBACK");
      throw new Error("Active synthetic vault document not found");
    }
    const version = Number(row.current_version) + 1;
    const encrypted = encryptPdf(input.bytes, vaultKey(), {
      listingId: String(row.listing_id), documentId: input.documentId, version,
    });
    await client.query(
      `INSERT INTO dealroom_document_versions(
         id,document_id,version,filename,original_length,sha256,iv,auth_tag,ciphertext,uploaded_by
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [randomUUID(), input.documentId, version, safeName, encrypted.originalLength,
       encrypted.sha256, encrypted.iv, encrypted.tag, encrypted.ciphertext, input.actor.principalId],
    );
    await client.query(
      "UPDATE dealroom_documents SET current_version=$2 WHERE id=$1",
      [input.documentId, version],
    );
    await recordAudit(client, String(row.listing_id), "vault_document_versioned", input.actor, input.documentId);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  const current = await getVaultDocumentMeta(input.documentId);
  if (!current) throw new Error("Versioned document metadata missing");
  return current;
}

export async function revokeVaultDocument(id: string, actor: VaultActor): Promise<VaultDocument | null> {
  if (actor.role !== "admin") throw new Error("Staff required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = (await client.query(
      `UPDATE dealroom_documents SET status='revoked',revoked_at=now()
       WHERE id=$1 AND listing_id='MNA-2047' AND status='active'
       RETURNING *`,
      [id],
    )).rows[0] as Row | undefined;
    if (row) await recordAudit(client, String(row.listing_id), "vault_document_revoked", actor, id);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  return getVaultDocumentMeta(id);
}

export async function readVaultDocument(
  id: string,
  actor: VaultActor,
): Promise<{ bytes: Buffer; metadata: VaultDocument } | null> {
  const r = await pool.query(
    `SELECT d.id,d.listing_id,d.title,d.status,d.current_version,d.created_at,
       v.filename,v.original_length,v.sha256,v.iv,v.auth_tag,v.ciphertext
     FROM dealroom_documents d
     JOIN dealroom_document_versions v ON v.document_id=d.id AND v.version=d.current_version
     WHERE d.id=$1 AND d.status='active' AND d.listing_id='MNA-2047'`,
    [id],
  );
  const row = r.rows[0] as Row | undefined;
  if (!row) return null;
  if (actor.role === "buyer" &&
      !(await hasProviderSignatureGrant(String(row.listing_id), actor.principalId))) {
    throw new Error("Verified external NDA grant required for document access");
  }
  const data: VaultCiphertext = {
    iv: row.iv as Buffer, tag: row.auth_tag as Buffer,
    ciphertext: row.ciphertext as Buffer,
    sha256: String(row.sha256),
    originalLength: Number(row.original_length),
  };
  const bytes = decryptPdf(data, vaultKey(), {
    listingId: String(row.listing_id), documentId: id, version: Number(row.current_version),
  });
  await recordAudit(pool, String(row.listing_id), "vault_document_downloaded", actor, id);
  return { bytes, metadata: rowToMeta(row) };
}
