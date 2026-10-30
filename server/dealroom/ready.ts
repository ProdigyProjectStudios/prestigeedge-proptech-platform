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
}
