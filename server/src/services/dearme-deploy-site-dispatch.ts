import { createHash } from "node:crypto";
import type { ChannelDispatch } from "./dearme-outbound-tool-wrapper.js";

const DEFAULT_SITE_BASE_URL = "https://dearme.app";
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "docs",
  "login",
  "onboard",
  "settings",
  "signup",
  "status",
  "support",
  "www",
]);
const ARTIFACT_REF_LIMIT = 512;

export interface DearMeDeploySiteDispatchConfig {
  siteBaseUrl?: string;
  allowProduction?: boolean;
  allowCustomDomains?: boolean;
}

interface DeploySitePayload {
  handle: string;
  artifactRef: string;
  customDomain: string | null;
  target: "preview" | "production";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function hasField(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function error(message: string): Awaited<ReturnType<ChannelDispatch>> {
  return { kind: "errored", error: message };
}

function parseCustomDomain(
  record: Record<string, unknown>,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (!hasField(record, "customDomain") || record.customDomain === null) {
    return { ok: true, value: null };
  }
  const customDomain = stringField(record, "customDomain");
  if (!customDomain) return { ok: false, error: "deploy-site-custom-domain-invalid" };
  return normalizeCustomDomain(customDomain);
}

const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeCustomDomain(value: string): { ok: true; value: string } | { ok: false; error: string } {
  if (/\s/.test(value)) return { ok: false, error: "deploy-site-custom-domain-invalid" };

  let parsed: URL;
  try {
    parsed = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    return { ok: false, error: "deploy-site-custom-domain-invalid" };
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    return { ok: false, error: "deploy-site-custom-domain-invalid" };
  }

  const hostname = parsed.hostname.toLowerCase();
  const labels = hostname.split(".");
  if (
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => !DOMAIN_LABEL_PATTERN.test(label))
  ) {
    return { ok: false, error: "deploy-site-custom-domain-invalid" };
  }

  return { ok: true, value: hostname };
}

function parseDeploySitePayload(
  payload: unknown,
): { ok: true; value: DeploySitePayload } | { ok: false; error: string } {
  const record = asRecord(payload);
  if (!record) return { ok: false, error: "deploy-site-payload-invalid" };

  const handle = stringField(record, "handle");
  if (!handle) return { ok: false, error: "deploy-site-payload-missing-handle" };
  if (handle !== handle.toLowerCase() || !HANDLE_PATTERN.test(handle) || RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: "deploy-site-handle-invalid" };
  }

  const artifactRef = stringField(record, "artifactRef");
  if (!artifactRef) return { ok: false, error: "deploy-site-payload-missing-artifact-ref" };
  if (Array.from(artifactRef).length > ARTIFACT_REF_LIMIT) {
    return { ok: false, error: "deploy-site-artifact-ref-too-long" };
  }

  const target = stringField(record, "target");
  if (target !== "preview" && target !== "production") {
    return { ok: false, error: "deploy-site-target-invalid" };
  }

  const customDomain = parseCustomDomain(record);
  if (!customDomain.ok) return customDomain;
  return {
    ok: true,
    value: {
      handle,
      artifactRef,
      customDomain: customDomain.value,
      target,
    },
  };
}

function normalizeSiteBaseUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("deploy-site-base-url-invalid");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function deploymentId(input: {
  handle: string;
  artifactRef: string;
  target: "preview" | "production";
  idempotencyKey: string;
  customDomain: string | null;
}) {
  const hash = createHash("sha256")
    .update(`${input.target}:${input.handle}:${input.artifactRef}:${input.customDomain ?? ""}:${input.idempotencyKey}`)
    .digest("hex")
    .slice(0, 16);
  return `dearme_${input.target}_${hash}`;
}

function siteUrl(input: {
  baseUrl: string;
  handle: string;
  target: "preview" | "production";
  deploymentId: string;
  customDomain: string | null;
}) {
  const url = input.customDomain
    ? new URL(`https://${input.customDomain}/`)
    : new URL(`${input.baseUrl}/${encodeURIComponent(input.handle)}`);
  if (input.target === "preview") {
    url.searchParams.set("preview", input.deploymentId);
  }
  return input.target === "production" ? url.toString().replace(/\/$/, "") : url.toString();
}

export function createDearMeDeploySiteDispatch(
  config: DearMeDeploySiteDispatchConfig = {},
): ChannelDispatch {
  const baseUrl = normalizeSiteBaseUrl(config.siteBaseUrl ?? DEFAULT_SITE_BASE_URL);
  const allowProduction = config.allowProduction ?? false;
  const allowCustomDomains = config.allowCustomDomains ?? false;

  return async (input) => {
    if (input.toolName !== "deploy_site") {
      return error(`deploy-site-dispatch-binding-mismatch:${input.toolName}`);
    }

    const payload = parseDeploySitePayload(input.payload);
    if (!payload.ok) return error(payload.error);
    if (payload.value.customDomain && !allowCustomDomains) {
      return error("deploy-site-custom-domain-unconfigured");
    }
    if (payload.value.target === "production" && !allowProduction) {
      return error("deploy-site-production-host-unconfigured");
    }

    const id = deploymentId({
      handle: payload.value.handle,
      artifactRef: payload.value.artifactRef,
      target: payload.value.target,
      idempotencyKey: input.dispatchContext.idempotencyKey,
      customDomain: payload.value.customDomain,
    });

    return {
      kind: "delivered",
      externalId: id,
      externalUrl: siteUrl({
        baseUrl,
        handle: payload.value.handle,
        target: payload.value.target,
        deploymentId: id,
        customDomain: payload.value.customDomain,
      }),
      paid: false,
      paidUsd: undefined,
    };
  };
}
