import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { and, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { heartbeatRuns, instanceUserRoles, invites } from "@paperclipai/db";
import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";
import { readPersistedDevServerStatus, toDevServerHealthStatus } from "../dev-server-status.js";
import { logger } from "../middleware/logger.js";
import { instanceSettingsService } from "../services/instance-settings.js";
import { serverVersion } from "../version.js";

type ProbeCheckStatus = "ok" | "failed";

type ProbeCheck = {
  name: "database" | "dearme_public_url" | "database_url";
  status: ProbeCheckStatus;
  durationMs: number;
  error?: string;
};

type HealthProbeRoutesOptions = {
  checkTimeoutMs?: number;
  now?: () => Date;
  uptimeSeconds?: () => number;
  version?: string;
};

const DEFAULT_CHECK_TIMEOUT_MS = 1_000;

function normalizeDurationMs(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function sanitizeProbeError(error: unknown) {
  if (error instanceof Error && error.message === "check_timeout") return "timeout";
  if (error instanceof Error && error.message.trim().length > 0) return "failed";
  return "failed";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("check_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function runProbeCheck(
  name: ProbeCheck["name"],
  action: () => Promise<void> | void,
  timeoutMs: number,
): Promise<ProbeCheck> {
  const startedAt = performance.now();
  try {
    await withTimeout(Promise.resolve().then(action), timeoutMs);
    return {
      name,
      status: "ok",
      durationMs: normalizeDurationMs(startedAt),
    };
  } catch (error) {
    return {
      name,
      status: "failed",
      durationMs: normalizeDurationMs(startedAt),
      error: sanitizeProbeError(error),
    };
  }
}

export function healthProbeRoutes(db?: Pick<Db, "execute">, opts: HealthProbeRoutesOptions = {}) {
  const router = Router();
  const checkTimeoutMs = opts.checkTimeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS;
  const getNow = opts.now ?? (() => new Date());
  const getUptimeSeconds = opts.uptimeSeconds ?? (() => process.uptime());
  const version = opts.version ?? serverVersion;

  router.get("/healthz", (_req, res) => {
    try {
      res.status(200).json({
        status: "ok",
        version,
        uptimeSeconds: Math.max(0, Math.floor(getUptimeSeconds())),
        now: getNow().toISOString(),
      });
    } catch {
      try {
        res.status(200).json({
          status: "ok",
          version,
          uptimeSeconds: 0,
          now: new Date().toISOString(),
        });
      } catch {
        res.status(200).end();
      }
    }
  });

  router.get("/readyz", async (_req, res) => {
    try {
      const checks = await Promise.all([
        runProbeCheck(
          "database",
          async () => {
            if (!db) throw new Error("database_unavailable");
            await db.execute(sql`SELECT 1`);
          },
          checkTimeoutMs,
        ),
        runProbeCheck(
          "dearme_public_url",
          () => {
            if (!process.env.DEARME_PUBLIC_URL?.trim()) throw new Error("missing_env");
          },
          checkTimeoutMs,
        ),
        runProbeCheck(
          "database_url",
          () => {
            if (!process.env.DATABASE_URL?.trim()) throw new Error("missing_env");
          },
          checkTimeoutMs,
        ),
      ]);
      const failedChecks = checks
        .filter((check) => check.status !== "ok")
        .map((check) => check.name);

      if (failedChecks.length > 0) {
        res.status(503).json({
          status: "not_ready",
          checks,
          failedChecks,
        });
        return;
      }

      res.status(200).json({
        status: "ready",
        checks,
      });
    } catch {
      res.status(503).json({
        status: "not_ready",
        checks: [
          {
            name: "database",
            status: "failed",
            durationMs: 0,
            error: "failed",
          },
        ],
        failedChecks: ["database"],
      });
    }
  });

  return router;
}

function shouldExposeFullHealthDetails(
  actorType: "none" | "board" | "agent" | null | undefined,
  deploymentMode: DeploymentMode,
) {
  if (deploymentMode !== "authenticated") return true;
  return actorType === "board" || actorType === "agent";
}

function hasDevServerStatusToken(providedToken: string | undefined) {
  const expectedToken = process.env.PAPERCLIP_DEV_SERVER_STATUS_TOKEN?.trim();
  const token = providedToken?.trim();
  if (!expectedToken || !token) return false;

  const expected = Buffer.from(expectedToken);
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function healthRoutes(
  db?: Db,
  opts: {
    deploymentMode: DeploymentMode;
    deploymentExposure: DeploymentExposure;
    authReady: boolean;
    companyDeletionEnabled: boolean;
  } = {
    deploymentMode: "local_trusted",
    deploymentExposure: "private",
    authReady: true,
    companyDeletionEnabled: true,
  },
) {
  const router = Router();

  router.get("/", async (req, res) => {
    const actorType = "actor" in req ? req.actor?.type : null;
    const exposeFullDetails = shouldExposeFullHealthDetails(
      actorType,
      opts.deploymentMode,
    );
    const exposeDevServerDetails =
      exposeFullDetails || hasDevServerStatusToken(req.get("x-paperclip-dev-server-status-token"));

    if (!db) {
      res.json(
        exposeFullDetails
          ? { status: "ok", version: serverVersion }
          : { status: "ok", deploymentMode: opts.deploymentMode },
      );
      return;
    }

    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      logger.warn({ err: error }, "Health check database probe failed");
      res.status(503).json({
        status: "unhealthy",
        version: serverVersion,
        error: "database_unreachable"
      });
      return;
    }

    let bootstrapStatus: "ready" | "bootstrap_pending" = "ready";
    let bootstrapInviteActive = false;
    if (opts.deploymentMode === "authenticated") {
      const roleCount = await db
        .select({ count: count() })
        .from(instanceUserRoles)
        .where(sql`${instanceUserRoles.role} = 'instance_admin'`)
        .then((rows) => Number(rows[0]?.count ?? 0));
      bootstrapStatus = roleCount > 0 ? "ready" : "bootstrap_pending";

      if (bootstrapStatus === "bootstrap_pending") {
        const now = new Date();
        const inviteCount = await db
          .select({ count: count() })
          .from(invites)
          .where(
            and(
              eq(invites.inviteType, "bootstrap_ceo"),
              isNull(invites.revokedAt),
              isNull(invites.acceptedAt),
              gt(invites.expiresAt, now),
            ),
          )
          .then((rows) => Number(rows[0]?.count ?? 0));
        bootstrapInviteActive = inviteCount > 0;
      }
    }

    const persistedDevServerStatus = readPersistedDevServerStatus();
    let devServer: ReturnType<typeof toDevServerHealthStatus> | undefined;
    if (exposeDevServerDetails && persistedDevServerStatus && typeof (db as { select?: unknown }).select === "function") {
      const instanceSettings = instanceSettingsService(db);
      const experimentalSettings = await instanceSettings.getExperimental();
      const activeRunCount = await db
        .select({ count: count() })
        .from(heartbeatRuns)
        .where(inArray(heartbeatRuns.status, ["queued", "running"]))
        .then((rows) => Number(rows[0]?.count ?? 0));

      devServer = toDevServerHealthStatus(persistedDevServerStatus, {
        autoRestartEnabled: experimentalSettings.autoRestartDevServerWhenIdle ?? false,
        activeRunCount,
      });
    }

    if (!exposeFullDetails) {
      res.json({
        status: "ok",
        deploymentMode: opts.deploymentMode,
        bootstrapStatus,
        bootstrapInviteActive,
        ...(devServer ? { devServer } : {}),
      });
      return;
    }

    res.json({
      status: "ok",
      version: serverVersion,
      deploymentMode: opts.deploymentMode,
      deploymentExposure: opts.deploymentExposure,
      authReady: opts.authReady,
      bootstrapStatus,
      bootstrapInviteActive,
      features: {
        companyDeletionEnabled: opts.companyDeletionEnabled,
      },
      ...(devServer ? { devServer } : {}),
    });
  });

  return router;
}
