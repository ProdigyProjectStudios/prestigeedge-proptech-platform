import { pool } from "../db";
import { postgresDealRoomEnabled } from "./security";

/** Fail startup rather than silently reverting sensitive workflows to memory. */
export async function ensureDealRoomStorageReady(): Promise<void> {
  if (!postgresDealRoomEnabled()) return;
  const tables = ["dealroom_sessions", "dealroom_envelopes", "dealroom_grants", "dealroom_audit"];
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name = ANY($1::text[])",
    [tables],
  );
  const present = new Set(result.rows.map((row: { table_name: string }) => row.table_name));
  const missing = tables.filter((table) => !present.has(table));
  if (missing.length) {
    throw new Error(
      "Deal Room PostgreSQL is selected but migration 20261030_dealroom_foundation.sql has not been applied. Missing: " +
      missing.join(", "),
    );
  }
  if (process.env.DEALROOM_SIGNATURE_PROVIDER === "dropbox") {
    if (!present.has("dealroom_provider_events")) {
      throw new Error("Dropbox Sign requires migration 20261030_dealroom_signatures.sql (missing dealroom_provider_events)");
    }
    const columns = await pool.query(
      `SELECT table_name,column_name FROM information_schema.columns
       WHERE table_schema=current_schema()
         AND table_name IN ('dealroom_envelopes','dealroom_grants')`,
    );
    const found = new Set(columns.rows.map((row: {table_name:string;column_name:string}) =>
      row.table_name + "." + row.column_name));
    for (const name of [
      "dealroom_envelopes.provider_request_id",
      "dealroom_envelopes.buyer_principal_id",
      "dealroom_envelopes.signer_email",
      "dealroom_envelopes.provider_test_mode",
      "dealroom_grants.buyer_principal_id",
    ]) {
      if (!found.has(name)) {
        throw new Error("Dropbox Sign migration missing column: " + name);
      }
    }
  }
}
