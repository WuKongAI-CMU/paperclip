import { resolveDearMeChannelCredential } from "./dearme-channel-credential.js";
import type { ChannelDispatch } from "./dearme-outbound-tool-wrapper.js";

const DEFAULT_META_GRAPH_API_BASE_URL = "https://graph.facebook.com/v25.0";
const META_CAMPAIGN_USER_AGENT = "DearMe/0.1";
const CAMPAIGN_NAME_LIMIT = 200;
const CAMPAIGN_OBJECTIVE_LIMIT = 80;
const CAMPAIGN_REF_LIMIT = 256;
const CAMPAIGN_CREATIVE_REF_LIMIT = 10;
const LEARNING_WINDOW_MIN_HOURS = 7 * 24;
const LEARNING_WINDOW_MAX_HOURS = 30 * 24;
const DAILY_BUDGET_LIMITS_USD = {
  test: 25,
  ramp: 100,
  scale: 500,
} as const;

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

export interface DearMeMetaCampaignDispatchConfig {
  graphApiBaseUrl?: string;
  fetch?: FetchLike;
  now?: () => Date;
  resolveCredential?: (encryptedCredential: string) => Promise<string>;
}

type DearMeMetaAdsProvider = "meta_ads" | "facebook_ads";
type DearMeMetaBudgetTier = keyof typeof DAILY_BUDGET_LIMITS_USD;

interface DearMeMetaAdsCredential {
  provider: DearMeMetaAdsProvider;
  tokenType: "Bearer";
  accessToken: string;
  adAccountId: string;
  scopes: readonly string[];
  expiresAt: Date | null;
}

interface CreateMetaCampaignPayload {
  campaign: {
    name: string;
    objective: string;
    dailyBudgetUsd: number;
    creativeRefs: readonly string[];
    audienceRef: string;
  };
  budgetTier: DearMeMetaBudgetTier;
  learningWindowHours: number;
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

function numberField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArrayField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!Array.isArray(value)) return null;
  const strings = value
    .map((item) => typeof item === "string" ? item.trim() : "")
    .filter(Boolean);
  return strings.length === value.length ? strings : null;
}

function textLength(value: string) {
  return Array.from(value).length;
}

function error(message: string): Awaited<ReturnType<ChannelDispatch>> {
  return { kind: "errored", error: message };
}

function authError(reason: string): Awaited<ReturnType<ChannelDispatch>> {
  return { kind: "auth-error", reason };
}

async function safeJson(response: FetchResponseLike) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isSupportedProvider(value: string | null): value is DearMeMetaAdsProvider {
  return value === "meta_ads" || value === "facebook_ads";
}

function isBudgetTier(value: string | null): value is DearMeMetaBudgetTier {
  return value === "test" || value === "ramp" || value === "scale";
}

function normalizeAdAccountId(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^act_\d{3,32}$/.test(trimmed)) return trimmed;
  if (/^\d{3,32}$/.test(trimmed)) return `act_${trimmed}`;
  return null;
}

function parseCreateMetaCampaignPayload(
  payload: unknown,
): { ok: true; value: CreateMetaCampaignPayload } | { ok: false; error: string } {
  const record = asRecord(payload);
  if (!record) return { ok: false, error: "meta-campaign-payload-invalid" };

  const campaign = asRecord(record.campaign);
  if (!campaign) return { ok: false, error: "meta-campaign-payload-missing-campaign" };

  const name = stringField(campaign, "name");
  if (!name) return { ok: false, error: "meta-campaign-payload-missing-name" };
  if (textLength(name) > CAMPAIGN_NAME_LIMIT) {
    return { ok: false, error: "meta-campaign-name-too-long" };
  }

  const objective = stringField(campaign, "objective");
  if (!objective) return { ok: false, error: "meta-campaign-payload-missing-objective" };
  if (textLength(objective) > CAMPAIGN_OBJECTIVE_LIMIT) {
    return { ok: false, error: "meta-campaign-objective-too-long" };
  }

  const budgetTier = stringField(record, "budgetTier");
  if (!isBudgetTier(budgetTier)) return { ok: false, error: "meta-campaign-budget-tier-invalid" };

  const dailyBudgetUsd = numberField(campaign, "dailyBudgetUsd");
  if (dailyBudgetUsd === null || dailyBudgetUsd <= 0) {
    return { ok: false, error: "meta-campaign-daily-budget-invalid" };
  }
  if (dailyBudgetUsd > DAILY_BUDGET_LIMITS_USD[budgetTier]) {
    return { ok: false, error: `meta-campaign-daily-budget-exceeds-${budgetTier}-tier` };
  }

  const creativeRefs = stringArrayField(campaign, "creativeRefs");
  if (!creativeRefs || creativeRefs.length === 0) {
    return { ok: false, error: "meta-campaign-creative-refs-invalid" };
  }
  if (creativeRefs.length > CAMPAIGN_CREATIVE_REF_LIMIT) {
    return { ok: false, error: "meta-campaign-too-many-creative-refs" };
  }
  if (creativeRefs.some((ref) => textLength(ref) > CAMPAIGN_REF_LIMIT)) {
    return { ok: false, error: "meta-campaign-creative-ref-too-long" };
  }

  const audienceRef = stringField(campaign, "audienceRef");
  if (!audienceRef) return { ok: false, error: "meta-campaign-payload-missing-audience-ref" };
  if (textLength(audienceRef) > CAMPAIGN_REF_LIMIT) {
    return { ok: false, error: "meta-campaign-audience-ref-too-long" };
  }

  const learningWindowHours = numberField(record, "learningWindowHours");
  if (
    learningWindowHours === null ||
    learningWindowHours < LEARNING_WINDOW_MIN_HOURS ||
    learningWindowHours > LEARNING_WINDOW_MAX_HOURS
  ) {
    return { ok: false, error: "meta-campaign-learning-window-invalid" };
  }

  return {
    ok: true,
    value: {
      campaign: {
        name,
        objective,
        dailyBudgetUsd,
        creativeRefs,
        audienceRef,
      },
      budgetTier,
      learningWindowHours,
    },
  };
}

function parseCredentialPayload(plaintext: string, now: Date) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return authError("meta-campaign-credential-invalid-json");
  }

  const record = asRecord(parsed);
  const provider = record ? stringField(record, "provider") : null;
  if (!record || !isSupportedProvider(provider)) {
    return authError("meta-campaign-credential-invalid-provider");
  }

  const accessToken = stringField(record, "accessToken");
  if (!accessToken) return authError("meta-campaign-credential-missing-access-token");

  const adAccountId = normalizeAdAccountId(stringField(record, "adAccountId"));
  if (!adAccountId) return authError("meta-campaign-credential-invalid-ad-account-id");

  const scopes = stringArrayField(record, "scopes") ?? [];
  if (!scopes.includes("ads_management")) {
    return authError("meta-campaign-credential-missing-ads-management-scope");
  }

  const expiresAtRaw = record.expiresAt;
  let expiresAt: Date | null = null;
  if (typeof expiresAtRaw === "string" && expiresAtRaw.trim().length > 0) {
    expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) return authError("meta-campaign-credential-invalid-expiry");
    if (expiresAt.getTime() <= now.getTime()) return authError("meta-campaign-credential-expired");
  }

  const tokenType = stringField(record, "tokenType") ?? "bearer";
  if (tokenType.toLowerCase() !== "bearer") {
    return authError("meta-campaign-credential-unsupported-token-type");
  }

  return {
    kind: "credential" as const,
    credential: {
      provider,
      tokenType: "Bearer",
      accessToken,
      adAccountId,
      scopes,
      expiresAt,
    } satisfies DearMeMetaAdsCredential,
  };
}

export async function resolveDearMeMetaCampaignCredential(encryptedCredential: string) {
  return resolveDearMeChannelCredential(encryptedCredential, "meta-campaign");
}

function normalizeGraphApiBaseUrl(graphApiBaseUrl: string) {
  const trimmed = graphApiBaseUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false as const, error: "meta-campaign-graph-api-url-invalid" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false as const, error: "meta-campaign-graph-api-url-invalid" };
  }
  return { ok: true as const, value: parsed.toString().replace(/\/$/, "") };
}

function buildCampaignsUrl(graphApiBaseUrl: string, adAccountId: string) {
  return `${graphApiBaseUrl}/${encodeURIComponent(adAccountId)}/campaigns`;
}

function buildMetaCampaignRequest(payload: CreateMetaCampaignPayload) {
  const body = new URLSearchParams();
  body.set("name", payload.campaign.name);
  body.set("objective", payload.campaign.objective);
  body.set("status", "PAUSED");
  body.set("special_ad_categories", "[]");
  body.set("buying_type", "AUCTION");
  body.set("daily_budget", String(Math.round(payload.campaign.dailyBudgetUsd * 100)));
  return body.toString();
}

function responseRecord(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.data) ?? record;
}

function buildAdsManagerUrl(adAccountId: string, campaignId: string) {
  const accountId = adAccountId.startsWith("act_") ? adAccountId.slice(4) : adAccountId;
  const params = new URLSearchParams({
    act: accountId,
    selected_campaign_ids: campaignId,
  });
  return `https://business.facebook.com/adsmanager/manage/campaigns?${params.toString()}`;
}

export function createDearMeMetaCampaignDispatch(
  config: DearMeMetaCampaignDispatchConfig = {},
): ChannelDispatch {
  const fetchImpl: FetchLike =
    config.fetch ?? ((url, init) => fetch(url, init as RequestInit));
  const now = config.now ?? (() => new Date());
  const resolveCredential = config.resolveCredential ?? resolveDearMeMetaCampaignCredential;

  return async (input) => {
    if (input.toolName !== "create_meta_campaign") {
      return error(`meta-campaign-dispatch-binding-mismatch:${input.toolName}`);
    }

    const payload = parseCreateMetaCampaignPayload(input.payload);
    if (!payload.ok) return error(payload.error);

    const graphApiBaseUrl = normalizeGraphApiBaseUrl(
      config.graphApiBaseUrl ?? DEFAULT_META_GRAPH_API_BASE_URL,
    );
    if (!graphApiBaseUrl.ok) return error(graphApiBaseUrl.error);

    let plaintextCredential: string;
    try {
      plaintextCredential = await resolveCredential(input.encryptedCredential);
    } catch (caught) {
      const message = caught instanceof Error && caught.message.trim().length > 0
        ? caught.message.trim()
        : "meta-campaign-credential-resolve-failed";
      return authError(message);
    }

    const parsedCredential = parseCredentialPayload(plaintextCredential, now());
    if (parsedCredential.kind !== "credential") return parsedCredential;

    let response: FetchResponseLike;
    try {
      response = await fetchImpl(
        buildCampaignsUrl(graphApiBaseUrl.value, parsedCredential.credential.adAccountId),
        {
          method: "POST",
          headers: {
            Authorization: `${parsedCredential.credential.tokenType} ${parsedCredential.credential.accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Idempotency-Key": input.dispatchContext.idempotencyKey.slice(0, 256),
            "User-Agent": META_CAMPAIGN_USER_AGENT,
          },
          body: buildMetaCampaignRequest(payload.value),
        },
      );
    } catch (caught) {
      const message = caught instanceof Error && caught.message.trim().length > 0
        ? caught.message.trim()
        : "request-failed";
      return error(`meta-campaign-request-failed:${message}`);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return authError(`meta-campaign-auth-failed:${response.status}`);
      }
      return error(`meta-campaign-create-failed:${response.status}`);
    }

    const body = responseRecord(await safeJson(response));
    const campaignId =
      body ? stringField(body, "id") ?? stringField(body, "campaignId") ?? stringField(body, "metaCampaignId") : null;
    if (!campaignId) return error("meta-campaign-returned-incomplete-data");

    return {
      kind: "delivered",
      externalId: campaignId,
      externalUrl: buildAdsManagerUrl(parsedCredential.credential.adAccountId, campaignId),
      paid: true,
      paidUsd: payload.value.campaign.dailyBudgetUsd,
    };
  };
}
