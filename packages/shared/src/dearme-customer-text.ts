function previewText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trimEnd()}...` : value;
}

const DEARME_CUSTOMER_HIDDEN_LANGUAGE_TERMS = [
  "openclaw(?:[_ -]?gateway)?",
  "symphony",
  "paperclip",
  "ok partner",
  "omx",
  "claude",
  "gemini",
  "codex(?:[-_ ]?local)?",
  "dearme decisions?",
  "setup[_ -]?payload",
  "api[_ -]?keys?",
  "credentials?",
  "tokens?",
  "adapter[_ -]?type",
  "adaptertype",
  "model[-_ ]?providers?",
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
  "execution routes?",
  "decision routes?",
  "work products?",
  "workspaces?",
  "workspace sources?",
  "agents?",
  "admins?",
  "fingerprints?",
] as const;

export const DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN = new RegExp(
  DEARME_CUSTOMER_HIDDEN_LANGUAGE_TERMS.map((term) => `\\b${term}\\b`).join("|"),
  "i",
);

export interface DearMeLaunchProofGapItem {
  label: string;
  summary: string;
}

export interface DearMeLaunchProofHandoffStep {
  label: string;
  summary: string;
}

export interface DearMeCustomerSafeLaunchFact {
  label: string;
  provideAs: string;
  sensitive: boolean;
}

export const DEARME_LAUNCH_PROOF_GAP_ITEMS = [
  {
    label: "Professional-network delivery route",
    summary: "The approved route for the first live professional-network proof.",
  },
  {
    label: "Approved professional-network recipient",
    summary: "One real recipient selected for the first receipt check.",
  },
  {
    label: "Approved phone-message proof recipient",
    summary: "One real recipient selected for the shared phone-message proof.",
  },
] as const satisfies readonly DearMeLaunchProofGapItem[];

export const DEARME_LAUNCH_PROOF_HANDOFF_STEPS = [
  {
    label: "Use private proof now",
    summary: "Review drafts, proof assets, reports, and launch calls while everything stays private.",
  },
  {
    label: "Capture approved live details",
    summary: "Add the delivery route, professional-network recipient, and phone-message recipient only after owner approval.",
  },
  {
    label: "Return with receipts before launch",
    summary: "Run the guarded proof pass, then bring the result back before any broad public launch.",
  },
] as const satisfies readonly DearMeLaunchProofHandoffStep[];

const DEARME_CUSTOMER_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bOpenClaw[_ -]?gateway\b/gi, "DearMe"],
  [/\bOpenClaw\b/gi, "DearMe"],
  [/\bSymphony\b/gi, "DearMe"],
  [/\bPaperclip\b/gi, "DearMe"],
  [/\bOK Partner\b/gi, "DearMe"],
  [/\bOMX\b/gi, "DearMe"],
  [/\bClaude\b/gi, "DearMe"],
  [/\bGemini\b/gi, "DearMe"],
  [/\bcodex[-_ ]?local\b/gi, "private work area"],
  [/\bCodex\b/gi, "private work area"],
  [/\bDearMe decisions?\b/gi, "DearMe review"],
  [/\bsetup[_ -]?payload\b/gi, "setup details"],
  [/\bapi[_ -]?keys?\b/gi, "team access"],
  [/\bcredentials?\b/gi, "connection details"],
  [/\btokens?\b/gi, "private access details"],
  [/\badapter[_ -]?type\b|\badapterType\b/gi, "connector type"],
  [/\bmodel[-_ ]?providers?\b/gi, "services"],
  [/\bmodels?\b/gi, "private checks"],
  [/\badapters?\b/gi, "connectors"],
  [/\bproviders?\b/gi, "services"],
  [/\bruntimes?\b/gi, "private pass"],
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
  [/\bexecution routes?\b/gi, "private action links"],
  [/\bdecision routes?\b/gi, "review links"],
  [/\bwork products?\b/gi, "prepared work"],
  [/\bworkspace sources?\b/gi, "private work areas"],
  [/\bworkspaces?\b/gi, "private work areas"],
  [/\bagents?\b/gi, "teammates"],
];

export function compactDearMeCustomerText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dearMeCustomerSafeLaunchNeed(fact: DearMeCustomerSafeLaunchFact) {
  const key = fact.provideAs.toLowerCase();
  const text = `${fact.label} ${fact.provideAs}`.toLowerCase();
  if (key.includes("messages_url")) return "Professional-network delivery route";
  if (key.includes("smoke_recipient_urn")) return "Approved professional-network recipient";
  if (text.includes("linkedin")) return "Approved professional-network proof details";
  if (text.includes("imessage") || text.includes("sms")) return "Approved phone-message proof recipient";
  if (text.includes("telegram")) return "Approved chat proof recipient";
  if (text.includes("credential") || fact.sensitive) {
    return "Local live-proof authorization kept outside customer-facing surfaces";
  }
  if (text.includes("host") || text.includes("deploy") || text.includes("site")) {
    return "Phone-reachable proof page configuration";
  }
  return "Current live-proof handoff fact";
}

export function dearMeCustomerSafeText(
  value: string | null | undefined,
  fallback: string,
  maxLength = 1_000,
) {
  let safe = compactDearMeCustomerText(value);
  for (const [pattern, replacement] of DEARME_CUSTOMER_TEXT_REPLACEMENTS) {
    safe = safe.replace(pattern, replacement);
  }

  safe = safe
    .replace(/\bDearMe(?:\s+DearMe)+\b/gi, "DearMe")
    .replace(
      /\bDearMe\s+(?:connectors?|connections?)\s+services?\s+private\s+(?:work\s+areas?|areas?|pass(?:es)?)\s+private\s+(?:checks?|pass(?:es)?)\s+setup\s+(?:details|notes?)\b/gi,
      "A private pass",
    )
    .replace(/\s+/g, " ")
    .trim();

  return previewText(safe || fallback, maxLength);
}
