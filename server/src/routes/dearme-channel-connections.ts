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
}

function trimmedOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function dearmeChannelConnectionRoutes(
  db: Db,
  opts: DearMeXConnectionCallbackRoutesOptions = {},
) {
  const router = Router();
  const channelConnections = opts.channelConnections ?? dearMeChannelConnectionsService(db);
  const now = opts.now ?? (() => new Date());

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
      const exchange = opts.exchangeXConnection;
      if (!exchange) {
        throw new HttpError(503, "X connection exchange is not configured.");
      }

      const exchanged = await exchange({
        companyId,
        userId: actor.actorId,
        code: req.body.code,
        state: req.body.state,
        redirectUri: req.body.redirectUri,
      });

      const encryptedCredential = trimmedOrNull(exchanged.encryptedCredential);
      const externalAccountId = trimmedOrNull(exchanged.externalAccountId);
      const externalDisplayName = trimmedOrNull(exchanged.externalDisplayName);
      if (!encryptedCredential || !externalAccountId || !externalDisplayName) {
        throw new HttpError(502, "X connection exchange returned incomplete data.");
      }

      const connection = await channelConnections.upsertActive({
        companyId,
        userId: actor.actorId,
        channel: "x",
        externalAccountId,
        externalDisplayName,
        encryptedCredential,
        scopes: exchanged.scopes ?? undefined,
        expiresAt: exchanged.expiresAt ?? undefined,
        lastRefreshedAt: now(),
        metadata: exchanged.metadata ?? undefined,
      });

      res.json({
        connected: true,
        channel: "x",
        companyId: connection.companyId,
        userId: connection.userId,
        externalAccountId: connection.externalAccountId,
        externalDisplayName: connection.externalDisplayName,
        scopes: connection.scopes ?? [],
        expiresAt: connection.expiresAt?.toISOString() ?? null,
      });
    },
  );

  return router;
}
