import type { Express, NextFunction, Request, Response } from "express";
import { storage } from "../storage";
import type { DemoSession } from "./store";
import * as ops from "./operations-store";
import { allowedOperationsListing, operationsEnabled, validStage } from "./operations-policy";
import { hubspotConfig } from "./hubspot-crm";

function safe(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}

export function registerOperationsRoutes(
  app: Express,
  getSession: (req: Request) => Promise<DemoSession | null>,
) {
  async function staff(req: Request, res: Response): Promise<ops.OperationsActor | null> {
    if (!operationsEnabled()) {
      res.status(503).json({ error: "Deal operations are not configured." });
      return null;
    }
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: "Authenticated agency account required." });
      return null;
    }
    if (session.kind !== "authenticated" || session.role !== "admin" || !session.principalId) {
      res.status(403).json({ error: "Agency staff session required." });
      return null;
    }
    return { principalId: session.principalId, name: session.name, role: "admin" };
  }

  app.get("/api/dealroom/ops/capabilities", safe(async (_req, res) => {
    return res.json({
      enabled: operationsEnabled(),
      crmConfigured: Boolean(hubspotConfig()),
      syntheticOnly: true,
    });
  }));

  app.get("/api/dealroom/ops", safe(async (req, res) => {
    if (!(await staff(req, res))) return;
    res.setHeader("Cache-Control", "no-store");
    const [deals, tasks, outbox] = await Promise.all([
      ops.listDeals(), ops.listTasks(), ops.listCrmOutbox(),
    ]);
    return res.json({ deals, tasks, outbox, crmConfigured: Boolean(hubspotConfig()) });
  }));

  app.post("/api/dealroom/ops/deals", safe(async (req, res) => {
    const actor = await staff(req, res);
    if (!actor) return;
    const { listingId, buyerId, notes } = req.body ?? {};
    if (!allowedOperationsListing(listingId) || !validUuid(buyerId) ||
        (notes !== undefined && (typeof notes !== "string" || notes.length > 2000))) {
      return res.status(400).json({ error: "Synthetic listing ID, buyer UUID, and bounded notes required." });
    }
    const buyer = await storage.getUser(buyerId);
    if (!buyer?.isActive || buyer.role !== "client") {
      return res.status(400).json({ error: "An existing active client account is required." });
    }
    const result = await ops.createDeal({ listingId, buyerId, notes, actor });
    return res.status(result.created ? 201 : 200).json(result);
  }));

  app.patch("/api/dealroom/ops/deals/:id/stage", safe(async (req, res) => {
    const actor = await staff(req, res);
    if (!actor) return;
    if (!validUuid(req.params.id) || !validStage(req.body?.stage)) {
      return res.status(400).json({ error: "Valid deal ID and stage required." });
    }
    try {
      const changed = await ops.transitionDeal({ dealId: req.params.id, stage: req.body.stage, actor });
      if (!changed) return res.status(404).json({ error: "Deal not found." });
      return res.json(changed);
    } catch (error) {
      if (error instanceof Error && /Transition is invalid|Invalid deal stage/.test(error.message)) {
        return res.status(409).json({ error: error.message });
      }
      throw error;
    }
  }));

  app.post("/api/dealroom/ops/deals/:id/tasks", safe(async (req, res) => {
    const actor = await staff(req, res);
    if (!actor) return;
    if (!validUuid(req.params.id) || typeof req.body?.title !== "string") {
      return res.status(400).json({ error: "Deal and task title are required." });
    }
    try {
      const task = await ops.createTask({
        dealId: req.params.id, title: req.body.title,
        description: req.body.description, dueAt: req.body.dueAt, actor,
      });
      if (!task) return res.status(404).json({ error: "Deal not found." });
      return res.status(201).json({ task });
    } catch (error) {
      if (error instanceof Error && /Task title|Task due date/.test(error.message)) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
  }));

  app.patch("/api/dealroom/ops/tasks/:id", safe(async (req, res) => {
    const actor = await staff(req, res);
    if (!actor) return;
    if (!validUuid(req.params.id) || !["open", "done", "canceled"].includes(req.body?.status)) {
      return res.status(400).json({ error: "Valid task ID and status required." });
    }
    const updated = await ops.updateTaskStatus(req.params.id, req.body.status, actor);
    if (!updated) return res.status(404).json({ error: "Task not found." });
    return res.json({ updated: true });
  }));

  app.post("/api/dealroom/ops/crm/dispatch", safe(async (req, res) => {
    if (!(await staff(req, res))) return;
    if (req.body?.confirm !== "sync-synthetic") {
      return res.status(400).json({ error: "Explicit synthetic CRM sync confirmation required." });
    }
    const result = await ops.dispatchOneCrmJob();
    if (result.kind === "disabled") return res.status(503).json({ error: "HubSpot CRM sync is not configured." });
    return res.json(result);
  }));
}
