export const OPS_LISTING_ID = "MNA-2047";

export type DealStage =
  | "qualified"
  | "nda_requested"
  | "nda_signed"
  | "due_diligence"
  | "offer"
  | "won"
  | "lost";

const allowed: Record<DealStage, readonly DealStage[]> = {
  qualified: ["nda_requested", "lost"],
  nda_requested: ["nda_signed", "lost"],
  nda_signed: ["due_diligence", "lost"],
  due_diligence: ["offer", "lost"],
  offer: ["won", "lost", "due_diligence"],
  won: [],
  lost: [],
};

export function validStage(value: unknown): value is DealStage {
  return typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(allowed, value);
}

export function canTransition(
  from: DealStage,
  to: DealStage,
  hasVerifiedNda: boolean,
): boolean {
  if (!validStage(from) || !validStage(to)) return false;
  if (!allowed[from].includes(to)) return false;
  if (["nda_signed", "due_diligence", "offer", "won"].includes(to) && !hasVerifiedNda) {
    return false;
  }
  return true;
}

export function operationsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEALROOM_STORAGE === "postgres" && env.DEALROOM_OPERATIONS_ENABLED === "true";
}

/** Real listings cannot enter the demonstration pipeline regardless of environment flags. */
export function allowedOperationsListing(id: string): boolean {
  return id === OPS_LISTING_ID;
}

export function normalizeTask(input: { title: string; description?: string; dueAt?: string | null }) {
  const title = input.title?.trim();
  const description = (input.description ?? "").trim();
  if (!title || title.length > 200 || description.length > 2000) {
    throw new Error("Task title is required (maximum 200 characters); details limited to 2000 characters");
  }
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && (Number.isNaN(dueAt.getTime()) || dueAt.getTime() < Date.now() - 60_000)) {
    throw new Error("Task due date must be valid and not in the past");
  }
  return { title, description, dueAt };
}
