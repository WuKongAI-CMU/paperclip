import { Router } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { HttpError } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { dearMeChannelConnectionsService } from "../services/dearme-channel-connections.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";

const xConnectionCallbackRequestSchema = z.object({
  code: z.string().trim().min(1).max(2048),
  state: z.string().trim().min(1).max(2048),
  redirectUri: z.string().trim().url().max(2048).optional(),
}).strict();

const xConnectionStartQuerySchema = z.object({
  issueId: z.string().trim().min(1).max(128).optional(),
  approvalId: z.string().trim().min(1).max(128).optional(),
  runId: z.string().trim().min(1).max(128).optional(),
  returnTo: z.string().trim().url().max(2048).optional(),
}).strict();

export interface DearMeXConnectionStartInput {
  companyId: string;
  userId: string;
  issueId?: string;
  approvalId?: string;
  openclawRunId?: string;
  returnTo?: string;
}

export interface DearMeXConnectionStartResult {
  oauthStartUrl: string;
}

export interface DearMeXConnectionCallbackExchangeInput {
  companyId: string;
  userId: string;
  code: string;
  state: string;
  redirectUri?: string;
}

export interface DearMeXConnectionCallbackExchangeResult {
  encryptedCredential: string;
  externalAccountId: string;
  externalDisplayName: string;
  scopes?: readonly string[] | null;
  expiresAt?: Date | null;
  returnTo?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DearMeXConnectionCallbackRoutesOptions {
  now?: () => Date;
  channelConnections?: Pick<
    ReturnType<typeof dearMeChannelConnectionsService>,
    "upsertActive"
  >;
  exchangeXConnection?: (
    input: DearMeXConnectionCallbackExchangeInput,
  ) => Promise<DearMeXConnectionCallbackExchangeResult>;
  startXConnection?: (
    input: DearMeXConnectionStartInput,
  ) => Promise<DearMeXConnectionStartResult>;
}

function trimmedOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function stringQueryValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function safeRedirectUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function dearmeChannelConnectionRoutes(
  db: Db,
  opts: DearMeXConnectionCallbackRoutesOptions = {},
) {
  const router = Router();
  const channelConnections = opts.channelConnections ?? dearMeChannelConnectionsService(db);
  const now = opts.now ?? (() => new Date());

  async function completeXConnection(input: DearMeXConnectionCallbackExchangeInput) {
    const exchange = opts.exchangeXConnection;
    if (!exchange) {
      throw new HttpError(503, "X connection exchange is not configured.");
    }

    const exchanged = await exchange(input);
    const encryptedCredential = trimmedOrNull(exchanged.encryptedCredential);
    const externalAccountId = trimmedOrNull(exchanged.externalAccountId);
    const externalDisplayName = trimmedOrNull(exchanged.externalDisplayName);
    if (!encryptedCredential || !externalAccountId || !externalDisplayName) {
      throw new HttpError(502, "X connection exchange returned incomplete data.");
    }

    const connection = await channelConnections.upsertActive({
      companyId: input.companyId,
      userId: input.userId,
      channel: "x",
      externalAccountId,
      externalDisplayName,
      encryptedCredential,
      scopes: exchanged.scopes ?? undefined,
      expiresAt: exchanged.expiresAt ?? undefined,
      lastRefreshedAt: now(),
      metadata: exchanged.metadata ?? undefined,
    });

    return {
      returnTo: safeRedirectUrl(exchanged.returnTo),
      body: {
        connected: true,
        channel: "x",
        companyId: connection.companyId,
        userId: connection.userId,
        externalAccountId: connection.externalAccountId,
        externalDisplayName: connection.externalDisplayName,
        scopes: connection.scopes ?? [],
        expiresAt: connection.expiresAt?.toISOString() ?? null,
      },
    };
  }

  router.get("/:companyId/x/start", async (req, res) => {
    const companyId = String(req.params.companyId ?? "").trim();
    if (!companyId) {
      throw new HttpError(400, "Validation error");
    }

    assertCompanyAccess(req, companyId);
    assertBoard(req);

    const start = opts.startXConnection;
    if (!start) {
      throw new HttpError(503, "X connection start is not configured.");
    }

    const query = xConnectionStartQuerySchema.parse({
      issueId: stringQueryValue(req.query.issueId),
      approvalId: stringQueryValue(req.query.approvalId),
      runId: stringQueryValue(req.query.runId),
      returnTo: stringQueryValue(req.query.returnTo),
    });
    const actor = getActorInfo(req);
    const started = await start({
      companyId,
      userId: actor.actorId,
      issueId: query.issueId,
      approvalId: query.approvalId,
      openclawRunId: query.runId,
      returnTo: query.returnTo,
    });
    const oauthStartUrl = trimmedOrNull(started.oauthStartUrl);
    if (!oauthStartUrl) {
      throw new HttpError(502, "X connection start returned incomplete data.");
    }

    res.redirect(302, oauthStartUrl);
  });

  router.get("/:companyId/x/callback", async (req, res) => {
    const companyId = String(req.params.companyId ?? "").trim();
    if (!companyId) {
      throw new HttpError(400, "Validation error");
    }

    assertCompanyAccess(req, companyId);
    assertBoard(req);

    const query = xConnectionCallbackRequestSchema.parse({
      code: stringQueryValue(req.query.code),
      state: stringQueryValue(req.query.state),
      redirectUri: stringQueryValue(req.query.redirectUri),
    });
    const actor = getActorInfo(req);
    const completed = await completeXConnection({
      companyId,
      userId: actor.actorId,
      code: query.code,
      state: query.state,
      redirectUri: query.redirectUri,
    });

    if (completed.returnTo) {
      res.redirect(302, completed.returnTo);
      return;
    }
    res.type("html").send("<!doctype html><title>X connected</title><p>X connected. You can close this tab.</p>");
  });

  router.post(
    "/:companyId/x/callback",
    validate(xConnectionCallbackRequestSchema),
    async (req, res) => {
      const companyId = String(req.params.companyId ?? "").trim();
      if (!companyId) {
        throw new HttpError(400, "Validation error");
      }

      assertCompanyAccess(req, companyId);
      assertBoard(req);

      const actor = getActorInfo(req);
      const completed = await completeXConnection({
        companyId,
        userId: actor.actorId,
        code: req.body.code,
        state: req.body.state,
        redirectUri: req.body.redirectUri,
      });

      res.json(completed.body);
    },
  );

  return router;
}
