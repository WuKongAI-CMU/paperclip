import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import type { Db } from "@paperclipai/db";
import { agentApiKeys } from "@paperclipai/db";
import { and, eq, isNull } from "drizzle-orm";
import { DM_PROXY_HEADERS, isDearMeApiKey } from "@paperclipai/dearme-ai-proxy";
import { unauthorized } from "../errors.js";

function bearerTokenFromAuthorizationHeader(rawHeader: string | undefined): string | null {
  if (!rawHeader) return null;
  const [scheme, token, extra] = rawHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) return null;
  return token;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function requireDearMeApiKey(db: Db): RequestHandler {
  return async (req, _res, next) => {
    const token = bearerTokenFromAuthorizationHeader(req.get(DM_PROXY_HEADERS.authorization));
    if (!token || !isDearMeApiKey(token)) {
      throw unauthorized("DearMe API key required");
    }

    if (req.actor?.type === "agent") {
      next();
      return;
    }

    const keyHash = hashToken(token);
    const key = await db
      .select({
        id: agentApiKeys.id,
        agentId: agentApiKeys.agentId,
        companyId: agentApiKeys.companyId,
      })
      .from(agentApiKeys)
      .where(and(eq(agentApiKeys.keyHash, keyHash), isNull(agentApiKeys.revokedAt)))
      .then((rows) => rows[0] ?? null);

    if (!key) {
      throw unauthorized("DearMe API key required");
    }

    const agentId = key.agentId;
    const companyId = key.companyId;
    const keyId = key.id;

    if (!agentId || !companyId || !keyId) {
      throw unauthorized("DearMe API key required");
    }

    req.actor = {
      type: "agent",
      agentId,
      companyId,
      keyId,
      source: "agent_key",
    };

    next();
  };
}
