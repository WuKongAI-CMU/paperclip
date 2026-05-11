function previewText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trimEnd()}...` : value;
}

export const DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN = new RegExp(
  [
    "openclaw(?:[_ -]?gateway)?",
    "symphony",
    "paperclip",
    "ok partner",
    "codex(?:[-_ ]?local)?",
    "dearme decisions?",
    "setup[_ -]?payload",
    "api[_ -]?keys?",
    "credentials?",
    "tokens?",
    "adapter[_ -]?type",
    "adaptertype",
    "model[- ]providers?",
    "models?",
    "adapters?",
    "providers?",
    "runtimes?",
    "raw control plane",
    "run[_ -]?ids?",
    "queues?",
    "queued",
    "workers?",
    "routines?",
    "workbench",
    "workstreams?",
    "work streams?",
    "issue comments?",
    "issue routes?",
    "approval routes?",
    "work products?",
    "workspaces?",
    "agents?",
    "admins?",
    "fingerprints?",
  ].map((term) => `\\b${term}\\b`).join("|"),
  "i",
);

export function compactDearMeCustomerText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dearMeCustomerSafeText(
  value: string | null | undefined,
  fallback: string,
  maxLength = 1_000,
) {
  let safe = compactDearMeCustomerText(value);
  for (const [pattern, replacement] of [
    [/\bOpenClaw[_ -]?gateway\b/gi, "DearMe"],
    [/\bOpenClaw\b/gi, "DearMe"],
    [/\bSymphony\b/gi, "DearMe"],
    [/\bPaperclip\b/gi, "DearMe"],
    [/\bOK Partner\b/gi, "DearMe"],
    [/\bcodex[-_ ]?local\b/gi, "private work area"],
    [/\bCodex\b/gi, "private work area"],
    [/\bDearMe decisions?\b/gi, "DearMe review"],
    [/\bsetup[_ -]?payload\b/gi, "setup details"],
    [/\bapi[_ -]?keys?\b/gi, "team access"],
    [/\bcredentials?\b/gi, "connection details"],
    [/\btokens?\b/gi, "private access details"],
    [/\badapter[_ -]?type\b|\badapterType\b/gi, "connector type"],
    [/\bmodel[- ]providers?\b/gi, "services"],
    [/\bmodels?\b/gi, "private checks"],
    [/\badapters?\b/gi, "connectors"],
    [/\bproviders?\b/gi, "services"],
    [/\bruntimes?\b/gi, "private work area"],
    [/\braw control plane\b/gi, "private operations"],
    [/\brun[_ -]?ids?\b|\brunIds?\b/gi, "work receipts"],
    [/\bqueue(?:d|s)?\b/gi, "work list"],
    [/\bworkers?\b/gi, "teammates"],
    [/\broutines?\b/gi, "cycle checks"],
    [/\badmins?\b/gi, "private operators"],
    [/\bfingerprints?\b/gi, "private markers"],
    [/\bworkbench\b/gi, "team progress"],
    [/\bworkstreams?\b/gi, "team updates"],
    [/\bwork streams?\b/gi, "team updates"],
    [/\bissue comments?\b/gi, "review notes"],
    [/\bissue routes?\b/gi, "private review links"],
    [/\bapproval routes?\b/gi, "review links"],
    [/\bwork products?\b/gi, "prepared work"],
    [/\bworkspaces?\b/gi, "private work areas"],
    [/\bagents?\b/gi, "teammates"],
  ] as const) {
    safe = safe.replace(pattern, replacement);
  }

  safe = safe.replace(/\s+/g, " ").trim();
  return previewText(safe || fallback, maxLength);
}
