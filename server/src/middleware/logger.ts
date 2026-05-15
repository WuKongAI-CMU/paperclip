import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { readConfigFile } from "../config-file.js";
import { resolveDefaultLogsDir, resolveHomeAwarePath } from "../home-paths.js";
import { shouldSilenceHttpSuccessLog } from "./http-log-policy.js";

function resolveServerLogDir(): string {
  const envOverride = process.env.PAPERCLIP_LOG_DIR?.trim();
  if (envOverride) return resolveHomeAwarePath(envOverride);

  const fileLogDir = readConfigFile()?.logging.logDir?.trim();
  if (fileLogDir) return resolveHomeAwarePath(fileLogDir);

  return resolveDefaultLogsDir();
}

const logDir = resolveServerLogDir();
fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, "server.log");

export const LOG_REDACTION_TOKEN = "***REDACTED***";

const SENSITIVE_LOG_KEY_RE =
  /^(authorization|password|passwd|secret|token|api[-_]?key|cookie|set-cookie)$/i;
const SENSITIVE_LOG_VALUE_RE =
  /\b(?:dm_sk_[A-Za-z0-9_-]+|re_[A-Za-z0-9_-]{8,}|sk_live_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+|phc_[A-Za-z0-9_-]+)\b/g;
const EMAIL_LOG_VALUE_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function redactLogText(value: string): string {
  return value
    .replace(SENSITIVE_LOG_VALUE_RE, LOG_REDACTION_TOKEN)
    .replace(EMAIL_LOG_VALUE_RE, LOG_REDACTION_TOKEN);
}

export function redactLogValue<T>(value: T): T {
  if (typeof value === "string") return redactLogText(value) as T;
  if (Array.isArray(value)) return value.map((entry) => redactLogValue(entry)) as T;
  if (!isPlainObject(value)) return value;

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = SENSITIVE_LOG_KEY_RE.test(key) ? LOG_REDACTION_TOKEN : redactLogValue(entry);
  }
  return redacted as T;
}

export const logger = pino({
  level: "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers.set-cookie",
      "headers.authorization",
      "headers.cookie",
    ],
    censor: LOG_REDACTION_TOKEN,
  },
  formatters: {
    log(object) {
      return redactLogValue(object);
    },
  },
  hooks: {
    logMethod(inputArgs, method) {
      method.apply(this, inputArgs.map((arg) => redactLogValue(arg)) as Parameters<typeof method>);
    },
  },
}, pino.transport({
  targets: [
    {
      target: "pino/file",
      options: { destination: 1 },
      level: "info",
    },
    {
      target: "pino/file",
      options: { destination: logFile, mkdir: true },
      level: "debug",
    },
  ],
}));

export const httpLogger = pinoHttp({
  logger,
  genReqId(req) {
    const incoming = req.headers["x-request-id"];
    if (typeof incoming === "string" && incoming.trim()) return incoming.trim();
    if (Array.isArray(incoming)) {
      const first = incoming.find((value) => value.trim());
      if (first) return first.trim();
    }
    return randomUUID();
  },
  customLogLevel(_req, res, err) {
    if (shouldSilenceHttpSuccessLog(_req.method, _req.url, res.statusCode)) {
      return "silent";
    }
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage(req, res, err) {
    const ctx = (res as any).__errorContext;
    const errMsg = ctx?.error?.message || err?.message || (res as any).err?.message || "unknown error";
    return `${req.method} ${req.url} ${res.statusCode} — ${errMsg}`;
  },
  customProps(req, res) {
    const baseProps = {
      requestId: req.id,
    };
    if (res.statusCode >= 400) {
      const ctx = (res as any).__errorContext;
      if (ctx) {
        return {
          ...baseProps,
          errorContext: ctx.error,
          reqBody: ctx.reqBody,
          reqParams: ctx.reqParams,
          reqQuery: ctx.reqQuery,
        };
      }
      const props: Record<string, unknown> = {};
      const { body, params, query } = req as any;
      if (body && typeof body === "object" && Object.keys(body).length > 0) {
        props.reqBody = body;
      }
      if (params && typeof params === "object" && Object.keys(params).length > 0) {
        props.reqParams = params;
      }
      if (query && typeof query === "object" && Object.keys(query).length > 0) {
        props.reqQuery = query;
      }
      if ((req as any).route?.path) {
        props.routePath = (req as any).route.path;
      }
      return { ...baseProps, ...props };
    }
    return baseProps;
  },
});
