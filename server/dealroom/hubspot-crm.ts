import { validStage, type DealStage, OPS_LISTING_ID } from "./operations-policy";

export interface HubSpotConfig {
  token: string;
  pipelineId: string;
  stages: Record<DealStage, string>;
  apiVersion: "v3";
}

const STAGES: readonly DealStage[] = [
  "qualified","nda_requested","nda_signed","due_diligence","offer","won","lost",
];

export function hubspotConfig(env: NodeJS.ProcessEnv = process.env): HubSpotConfig | null {
  if (env.DEALROOM_OPERATIONS_ENABLED !== "true" ||
      env.DEALROOM_CRM_PROVIDER !== "hubspot" ||
      env.DEALROOM_CRM_SYNC_ENABLED !== "true") return null;
  const token = env.HUBSPOT_ACCESS_TOKEN?.trim();
  const pipelineId = env.HUBSPOT_DEAL_PIPELINE_ID?.trim();
  if (!token || !pipelineId || !/^[a-zA-Z0-9_-]{1,100}$/.test(pipelineId)) return null;
  const stages = {} as Record<DealStage, string>;
  for (const stage of STAGES) {
    const field = "HUBSPOT_STAGE_" + stage.toUpperCase();
    const value = env[field]?.trim();
    if (!value || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) return null;
    stages[stage] = value;
  }
  return { token, pipelineId, stages, apiVersion: "v3" };
}

export interface DealSnapshot {
  id: string;
  listingId: string;
  stage: DealStage;
  crmObjectId?: string | null;
}

export function hubspotProperties(input: DealSnapshot, config: HubSpotConfig): Record<string, string> {
  if (input.listingId !== OPS_LISTING_ID || !validStage(input.stage)) {
    throw new Error("HubSpot sync accepts only the synthetic Deal Room workflow");
  }
  return {
    dealname: "PRESTIGE EDGE DEMO | " + input.id,
    pipeline: config.pipelineId,
    dealstage: config.stages[input.stage],
    description: "Synthetic Prestige Edge case MNA-2047. Training / demonstration record only.",
  };
}

export class HubSpotClient {
  constructor(private readonly config: HubSpotConfig, private readonly transport: typeof fetch = fetch) {}

  async upsertSyntheticDeal(input: DealSnapshot): Promise<string> {
    const current = input.crmObjectId?.trim() || "";
    if (current && !/^[0-9]{1,20}$/.test(current)) throw Error("Invalid HubSpot deal ID");
    const body = JSON.stringify({ properties: hubspotProperties(input, this.config) });
    // Explicit unique object ID for updates. Initial POST is never auto-retried
    // because a timeout could mean that HubSpot created an object.
    const url = current
      ? "https://api.hubapi.com/crm/v3/objects/deals/" + encodeURIComponent(current)
      : "https://api.hubapi.com/crm/v3/objects/deals";
    const response = await this.transport(url, {
      method: current ? "PATCH" : "POST",
      headers: {
        authorization: "Bearer " + this.config.token,
        "content-type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      // Never include provider body, recipient information or bearer token in errors.
      throw new Error("HubSpot API request failed (HTTP " + response.status + ")");
    }
    const parsed = await response.json() as { id?: unknown };
    if (typeof parsed.id !== "string" || !/^[0-9]{1,20}$/.test(parsed.id)) {
      throw new Error("Unrecognized HubSpot deal confirmation; manual reconciliation needed");
    }
    if (current && parsed.id !== current) throw new Error("HubSpot update returned a conflicting deal ID");
    return parsed.id;
  }
}
