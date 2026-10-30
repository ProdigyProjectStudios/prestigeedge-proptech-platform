import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { allowedOperationsListing, canTransition, normalizeTask, validStage, type DealStage } from "./operations-policy";
import { hubspotConfig, HubSpotClient } from "./hubspot-crm";

type Row = Record<string, any>;
export type OperationsActor = { principalId: string; name: string; role: "admin" };
export type DealRow = {
  id: string;
  listingId: string;
  buyerId: string;
  ownerId: string;
  stage: DealStage;
  crmObjectId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

function rowToDeal(row: Row): DealRow {
  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    buyerId: String(row.buyer_id),
    ownerId: String(row.owner_id),
    stage: row.stage as DealStage,
    crmObjectId: row.crm_object_id ? String(row.crm_object_id) : null,
    notes: String(row.notes),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function audit(
  client: { query: (sql: string, params?: any[]) => Promise<unknown> },
  listingId: string, event: string, actor: OperationsActor, description: string,
) {
  await client.query(
    "INSERT INTO dealroom_audit(id,listing_id,event,actor_name,actor_role,detail) VALUES($1,$2,$3,$4,'admin',$5)",
    [randomUUID(), listingId, event, actor.name, description],
  );
}

async function addOutbox(
  client: { query: (sql: string, params?: any[]) => Promise<unknown> },
  deal: DealRow,
) {
  // Never store buyer email, phone, property address or private documents in CRM payload.
  await client.query(
    `INSERT INTO dealroom_crm_outbox(id,deal_id,event_type,payload)
      VALUES($1,$2,'dealstage_changed',$3)`,
    [randomUUID(), deal.id, JSON.stringify({
      listingId: deal.listingId, dealId: deal.id, stage: deal.stage, synthetic: true,
    })],
  );
}

export async function listDeals(): Promise<DealRow[]> {
  const r = await pool.query(
    "SELECT * FROM dealroom_deals WHERE listing_id='MNA-2047' ORDER BY updated_at DESC,id",
  );
  return r.rows.map((row: Row) => rowToDeal(row));
}

export async function createDeal(input: {
  listingId: string;
  buyerId: string;
  notes?: string;
  actor: OperationsActor;
}): Promise<{ deal: DealRow; created: boolean }> {
  if (!allowedOperationsListing(input.listingId)) throw new Error("Operations are limited to fictional listing MNA-2047");
  if (input.notes && input.notes.length > 2000) throw Error("Deal notes exceed limit");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `INSERT INTO dealroom_deals(id,listing_id,buyer_id,owner_id,notes)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (listing_id,buyer_id) DO NOTHING RETURNING *`,
      [randomUUID(), input.listingId, input.buyerId, input.actor.principalId, input.notes?.trim() ?? ""],
    );
    const created = Boolean(r.rows[0]);
    const existing = r.rows[0] ?? (await client.query(
      "SELECT * FROM dealroom_deals WHERE listing_id=$1 AND buyer_id=$2",
      [input.listingId, input.buyerId],
    )).rows[0];
    if (!existing) throw Error("Unable to resolve new or existing deal");
    const deal = rowToDeal(existing as Row);
    if (created) {
      await addOutbox(client, deal);
      await audit(client, input.listingId, "ops_deal_created", input.actor, "Created fictional pipeline deal " + deal.id);
    }
    await client.query("COMMIT");
    return { deal, created };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function transitionDeal(input: {
  dealId: string;
  stage: DealStage;
  actor: OperationsActor;
}): Promise<{ deal: DealRow; changed: boolean } | null> {
  if (!validStage(input.stage)) throw Error("Invalid deal stage");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT * FROM dealroom_deals WHERE id=$1 AND listing_id='MNA-2047' FOR UPDATE",
      [input.dealId],
    );
    const before = locked.rows[0] as Row | undefined;
    if (!before) {
      await client.query("ROLLBACK");
      return null;
    }
    const prior = rowToDeal(before);
    if (prior.stage === input.stage) {
      await client.query("COMMIT");
      return { deal: prior, changed: false };
    }
    const verified = await client.query(
      `SELECT EXISTS(
         SELECT 1 FROM dealroom_grants g
         JOIN dealroom_envelopes e ON e.envelope_id=g.envelope_id
         WHERE g.listing_id=$1 AND g.buyer_principal_id=$2
           AND e.provider='DropboxSign' AND e.status='signed'
       ) AS verified`,
      [prior.listingId, prior.buyerId],
    );
    if (!canTransition(prior.stage, input.stage, verified.rows[0]?.verified === true)) {
      throw Error("Transition is invalid or requires a verified provider NDA");
    }
    const updated = await client.query(
      "UPDATE dealroom_deals SET stage=$2,updated_at=now() WHERE id=$1 RETURNING *",
      [input.dealId, input.stage],
    );
    const deal = rowToDeal(updated.rows[0] as Row);
    await addOutbox(client, deal);
    await audit(client, deal.listingId, "ops_stage_changed", input.actor,
      "Deal " + deal.id + ": " + prior.stage + " → " + deal.stage);
    await client.query("COMMIT");
    return { deal, changed: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function listTasks(dealId?: string) {
  const r = dealId
    ? await pool.query(
      `SELECT t.* FROM dealroom_tasks t JOIN dealroom_deals d ON d.id=t.deal_id
       WHERE d.listing_id='MNA-2047' AND t.deal_id=$1 ORDER BY t.created_at DESC,t.id`,
      [dealId],
    )
    : await pool.query(
      `SELECT t.* FROM dealroom_tasks t JOIN dealroom_deals d ON d.id=t.deal_id
       WHERE d.listing_id='MNA-2047' ORDER BY t.created_at DESC,t.id`,
    );
  return r.rows.map((row: Row) => ({
    id: String(row.id), dealId: String(row.deal_id), title: String(row.title),
    description: String(row.description), assignedTo: String(row.assigned_to),
    status: String(row.status), dueAt: row.due_at ? new Date(row.due_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  }));
}

export async function createTask(input: {
  dealId: string; title: string; description?: string; dueAt?: string | null; actor: OperationsActor;
}) {
  const normalized = normalizeTask(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deal = (await client.query(
      "SELECT * FROM dealroom_deals WHERE id=$1 AND listing_id='MNA-2047'",
      [input.dealId],
    )).rows[0] as Row | undefined;
    if (!deal) { await client.query("ROLLBACK"); return null; }
    const taskId = randomUUID();
    await client.query(
      `INSERT INTO dealroom_tasks(id,deal_id,title,description,assigned_to,due_at)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [taskId, input.dealId, normalized.title, normalized.description,
        input.actor.principalId, normalized.dueAt],
    );
    await audit(client, "MNA-2047", "ops_task_created", input.actor, "Task " + taskId + " for deal " + input.dealId);
    await client.query("COMMIT");
    return { id: taskId, ...normalized };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTaskStatus(taskId: string, status: "open" | "done" | "canceled", actor: OperationsActor) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = (await client.query(
      `UPDATE dealroom_tasks t SET status=$2,
        completed_at=(CASE WHEN $2='done' THEN now() ELSE NULL END)
       FROM dealroom_deals d
       WHERE t.id=$1 AND t.deal_id=d.id AND d.listing_id='MNA-2047'
       RETURNING t.*`,
      [taskId, status],
    )).rows[0] as Row | undefined;
    if (row) await audit(client, "MNA-2047", "ops_task_updated", actor, "Task " + taskId + " → " + status);
    await client.query("COMMIT");
    return Boolean(row);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function listCrmOutbox() {
  const r=await pool.query(
    `SELECT o.id,o.deal_id,o.event_type,o.status,o.attempts,o.available_at,
         o.external_object_id,o.last_error,o.delivered_at,o.created_at
     FROM dealroom_crm_outbox o JOIN dealroom_deals d ON d.id=o.deal_id
     WHERE d.listing_id='MNA-2047'
     ORDER BY o.created_at DESC,o.id LIMIT 100`,
  );
  return r.rows.map((row: Row) => ({
    id: String(row.id), dealId: String(row.deal_id), eventType: String(row.event_type),
    status: String(row.status), attempts: Number(row.attempts),
    availableAt: new Date(row.available_at).toISOString(),
    externalObjectId: row.external_object_id ? String(row.external_object_id) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

/** Operator-invoked delivery only. Uncertain creates remain locked for manual reconciliation. */
export async function dispatchOneCrmJob(): Promise<{
  kind: "disabled" | "empty" | "delivered" | "review_required";
  eventId?: string;
}> {
  const config = hubspotConfig();
  if (!config) return { kind: "disabled" };
  const client = await pool.connect();
  let event: Row | undefined;
  let deal: Row | undefined;
  try {
    await client.query("BEGIN");
    const claimed = await client.query(
      `SELECT o.*,d.listing_id,d.stage,d.crm_object_id
       FROM dealroom_crm_outbox o JOIN dealroom_deals d ON d.id=o.deal_id
       WHERE o.status='pending' AND o.available_at<=now()
         AND d.listing_id='MNA-2047'
       ORDER BY o.created_at,o.id FOR UPDATE OF o SKIP LOCKED LIMIT 1`,
    );
    event = claimed.rows[0] as Row | undefined;
    if (!event) { await client.query("COMMIT"); return { kind: "empty" }; }
    deal = event;
    await client.query(
      `UPDATE dealroom_crm_outbox SET status='processing',attempts=attempts+1,claimed_at=now()
       WHERE id=$1`,
      [event.id],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  if (!event || !deal) return { kind: "empty" };
  try {
    // The remote side receives only synthetic stage/ID fields; never buyer or vault data.
    const objectId = await new HubSpotClient(config).upsertSyntheticDeal({
      id: String(event.deal_id),
      listingId: String(deal.listing_id),
      stage: deal.stage as DealStage,
      crmObjectId: deal.crm_object_id ? String(deal.crm_object_id) : undefined,
    });
    const trx = await pool.connect();
    try {
      await trx.query("BEGIN");
      await trx.query(
        "UPDATE dealroom_deals SET crm_object_id=$2 WHERE id=$1 AND listing_id='MNA-2047'",
        [event.deal_id, objectId],
      );
      await trx.query(
        `UPDATE dealroom_crm_outbox SET status='delivered',delivered_at=now(),
           external_object_id=$2,last_error=NULL WHERE id=$1 AND status='processing'`,
        [event.id, objectId],
      );
      await trx.query("COMMIT");
    } catch (error) {
      await trx.query("ROLLBACK").catch(() => {});
      // The external request may already have committed; do not retry blindly.
      throw error;
    } finally { trx.release(); }
    return { kind: "delivered", eventId: String(event.id) };
  } catch {
    // Unknown creates are never automatically retried, preventing duplicate provider deals.
    await pool.query(
      `UPDATE dealroom_crm_outbox SET status='review_required',
         last_error='Provider result requires manual review' WHERE id=$1 AND status='processing'`,
      [event.id],
    );
    return { kind: "review_required", eventId: String(event.id) };
  }
}
