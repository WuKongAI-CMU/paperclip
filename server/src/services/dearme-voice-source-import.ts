import { JSDOM } from "jsdom";

type FetchInitLike = {
  headers?: Record<string, string>;
  redirect?: "error" | "follow" | "manual";
};

type FetchResponseLike = {
  ok: boolean;
  status: number;
  headers?: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
};

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

export type DearMeVoiceSourceImportFailureReason =
  | "invalid_source_url"
  | "source_unavailable"
  | "source_too_short";

export type DearMeVoiceSourceImportResult =
  | {
      ok: true;
      sourceUrl: string;
      body: string;
      extractedCharacterCount: number;
    }
  | {
      ok: false;
      reason: DearMeVoiceSourceImportFailureReason;
      status?: number;
    };

export interface DearMeVoiceSourceImportOptions {
  fetch?: FetchLike;
}

const MAX_FETCHED_CHARACTERS = 100_000;
const MAX_SAMPLE_CHARACTERS = 4_000;
const MIN_SAMPLE_CHARACTERS = 20;
const LOCAL_HOSTS = new Set(["localhost", "0.0.0.0", "::1"]);

export async function importDearMeVoiceSource(
  sourceUrl: string,
  options: DearMeVoiceSourceImportOptions = {},
): Promise<DearMeVoiceSourceImportResult> {
  const parsed = parseImportUrl(sourceUrl);
  if (!parsed) return { ok: false, reason: "invalid_source_url" };

  const fetchImpl = resolveFetch(options);
  const response = await fetchImpl(parsed.toString(), {
    redirect: "error",
    headers: {
      accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
    },
  });

  if (!response.ok) {
    return { ok: false, reason: "source_unavailable", status: response.status };
  }

  const contentType = response.headers?.get("content-type") ?? "";
  const rawText = (await response.text()).slice(0, MAX_FETCHED_CHARACTERS);
  const extractedText = extractReadableText(rawText, contentType);
  if (extractedText.length < MIN_SAMPLE_CHARACTERS) {
    return { ok: false, reason: "source_too_short" };
  }

  return {
    ok: true,
    sourceUrl: parsed.toString(),
    body: extractedText.slice(0, MAX_SAMPLE_CHARACTERS),
    extractedCharacterCount: extractedText.length,
  };
}

function parseImportUrl(sourceUrl: string) {
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (isPrivateHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isPrivateHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (LOCAL_HOSTS.has(normalized) || normalized.endsWith(".local")) return true;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return false;

  const octets = normalized.split(".").map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function extractReadableText(rawText: string, contentType: string) {
  if (contentType.toLowerCase().includes("html") || /<html|<body|<article|<main/i.test(rawText)) {
    const dom = new JSDOM(rawText);
    const document = dom.window.document;
    document.querySelectorAll("script, style, noscript, svg").forEach((node) => node.remove());
    return normalizeVoiceText(document.body?.textContent ?? document.documentElement.textContent ?? "");
  }

  return normalizeVoiceText(rawText);
}

function normalizeVoiceText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function resolveFetch(options: DearMeVoiceSourceImportOptions): FetchLike {
  if (options.fetch) return options.fetch;
  const fetchImpl = (globalThis as typeof globalThis & { fetch?: FetchLike }).fetch;
  if (!fetchImpl) {
    throw new Error("Fetch is not available for DearMe voice source import.");
  }
  return fetchImpl;
}
