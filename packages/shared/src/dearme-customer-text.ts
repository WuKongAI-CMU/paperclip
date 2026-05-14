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

export interface DearMeOwnerProofChecklistItem {
  label: string;
  summary: string;
}

export interface DearMeOwnerProofReplyTemplateLine {
  label: string;
  value: string;
}

export interface DearMeOwnerProofHandoffReceiptInput {
  values?: Record<string, string | null | undefined>;
}

export interface DearMeOwnerProofFactSpec {
  provideAs: string;
  label: string;
  summary: string;
  ownerPrompt: string;
  safeExample: string;
  boundary: string;
  operatorLabel: string;
  sensitive: boolean;
  placeholder: string;
  captureFlag: string;
}

export interface DearMeCustomerSafeLaunchFact {
  label: string;
  provideAs: string;
  sensitive: boolean;
}

export const DEARME_OWNER_PROOF_FACT_SPECS = [
  {
    provideAs: "DEARME_LINKEDIN_DM_MESSAGES_URL",
    label: "Professional-network delivery route",
    summary: "The route for the first live professional-network proof.",
    ownerPrompt: "Paste the delivery-route link for the first receipt check.",
    safeExample: "A messages page or delivery-route link selected for this proof pass.",
    boundary: "DearMe checks this in no-send mode before any live receipt can move.",
    operatorLabel: "LinkedIn partner messages endpoint",
    sensitive: false,
    placeholder: "<partner-messages-url>",
    captureFlag: "--linkedin-messages-url",
  },
  {
    provideAs: "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
    label: "Approved professional-network recipient",
    summary: "One real recipient selected for the first receipt check.",
    ownerPrompt: "Choose one real professional-network recipient for the proof pass.",
    safeExample: "A specific recipient profile or recipient detail selected for this proof pass.",
    boundary: "Only this selected recipient is used for the first guarded receipt.",
    operatorLabel: "LinkedIn approved smoke recipient",
    sensitive: false,
    placeholder: "<approved-linkedin-recipient-urn>",
    captureFlag: "--linkedin-recipient-urn",
  },
  {
    provideAs: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
    label: "Approved phone-message proof recipient",
    summary: "One real recipient selected for the shared phone-message proof.",
    ownerPrompt: "Choose one phone-message recipient for the shared proof pass.",
    safeExample: "A phone number or contact already cleared for the receipt check.",
    boundary: "The receipt stays behind the final launch call after the no-send check.",
    operatorLabel: "iMessage/SMS approved smoke recipient",
    sensitive: false,
    placeholder: "<approved-phone-or-imessage>",
    captureFlag: "--imessage-recipient",
  },
] as const satisfies readonly DearMeOwnerProofFactSpec[];

export const DEARME_LAUNCH_PROOF_GAP_ITEMS = DEARME_OWNER_PROOF_FACT_SPECS.map((fact) => ({
  label: fact.label,
  summary: fact.summary,
})) satisfies readonly DearMeLaunchProofGapItem[];

export const DEARME_LAUNCH_PROOF_HANDOFF_STEPS = [
  {
    label: "Use proof now",
    summary: "Review drafts, proof assets, reports, and launch calls while the team keeps working.",
  },
  {
    label: "Capture live details",
    summary: "Add the delivery route, professional-network recipient, and phone-message recipient for the guarded proof pass.",
  },
  {
    label: "Return with receipts before launch",
    summary: "Run the guarded proof pass, then bring the result back before any broad public launch.",
  },
] as const satisfies readonly DearMeLaunchProofHandoffStep[];

export const DEARME_OWNER_PROOF_CHECKLIST_ITEMS = [
  {
    label: "Only three facts are missing",
    summary: "Delivery route, professional-network recipient, and phone-message recipient.",
  },
  {
    label: "No-send check comes first",
    summary: "DearMe verifies the setup before anything is delivered publicly.",
  },
  {
    label: "Live receipt needs launch call",
    summary: "The guarded receipt pass stays behind the exact launch details you choose.",
  },
] as const satisfies readonly DearMeOwnerProofChecklistItem[];

export const DEARME_OWNER_PROOF_REPLY_TEMPLATE = [
  {
    label: "Delivery route",
    value: "delivery-route link",
  },
  {
    label: "Professional-network recipient",
    value: "selected recipient",
  },
  {
    label: "Phone-message recipient",
    value: "phone number or contact",
  },
] as const satisfies readonly DearMeOwnerProofReplyTemplateLine[];

export function dearMeOwnerProofFactSpec(provideAs: string) {
  return DEARME_OWNER_PROOF_FACT_SPECS.find((fact) => fact.provideAs === provideAs) ?? null;
}

function quoteDearMeOwnerProofCommandArg(value: string) {
  return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function buildDearMeOwnerProofCaptureCommand(values: Record<string, string | null | undefined>) {
  const args: string[] = [];

  for (const fact of DEARME_OWNER_PROOF_FACT_SPECS) {
    const value = values[fact.provideAs]?.trim();
    if (!value) {
      return null;
    }

    args.push(`${fact.captureFlag} ${quoteDearMeOwnerProofCommandArg(value)}`);
  }

  return `pnpm --silent dearme:next-proof -- --target all ${args.join(" ")}`;
}

export function buildDearMeOwnerProofHandoffReceipt(
  input: DearMeOwnerProofHandoffReceiptInput = {},
) {
  const values = input.values ?? {};
  const captured = DEARME_OWNER_PROOF_FACT_SPECS.filter((fact) => values[fact.provideAs]?.trim());
  const remainingCount = DEARME_OWNER_PROOF_FACT_SPECS.length - captured.length;
  const status = remainingCount === 0
    ? "ready for the no-send setup check"
    : `${remainingCount} detail${remainingCount === 1 ? "" : "s"} still needed before the no-send setup check`;
  const detailLines = DEARME_OWNER_PROOF_FACT_SPECS.map((fact) => {
    const value = values[fact.provideAs]?.trim();
    const state = value
      ? `Captured - ${dearMeCustomerSafeText(value, "captured detail", 180)}`
      : "Needed";
    return `- ${fact.label}: ${state}`;
  });
  const captureCommand = buildDearMeOwnerProofCaptureCommand(values);

  return [
    "DearMe launch-proof handoff",
    `Status: ${captured.length}/${DEARME_OWNER_PROOF_FACT_SPECS.length} details captured; ${status}.`,
    "Details:",
    ...detailLines,
    captureCommand
      ? `Capture command: ${captureCommand}`
      : "Capture command: fill the missing details above, then run dearme:next-proof with the approved values.",
    "Next: run the no-send setup check, then return with the receipt before any broad public launch.",
    "Boundary: no public message, page change, spend, or broad launch moves from this handoff.",
  ].join("\n");
}

const DEARME_CUSTOMER_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bDearMe Runtime Smoke\b/g, "DearMe Proof Check"],
  [/\bdearme runtime smoke\b/g, "dearme proof check"],
  [/\bruntime smoke\b/gi, "proof check"],
  [/\bprivate preparation\b/gi, "team preparation"],
  [/\bprivate feedback work\b/gi, "feedback work"],
  [/\bprivate brand work\b/gi, "brand work"],
  [/\bprivate DearMe cycles\b/gi, "DearMe brand cycles"],
  [/\bprivate-cycle\b/gi, "brand-cycle"],
  [/\bprivate cycles\b/gi, "brand cycles"],
  [/\bprivate output\b/gi, "useful output"],
  [/\bprivate work\b/gi, "brand work"],
  [/\bOpenClaw[_ -]?gateway\b/gi, "DearMe"],
  [/\bOpenClaw\b/gi, "DearMe"],
  [/\bSymphony\b/gi, "DearMe"],
  [/\bPaperclip\b/gi, "DearMe"],
  [/\bOK Partner\b/gi, "DearMe"],
  [/\bOMX\b/gi, "DearMe"],
  [/\bClaude\b/gi, "DearMe"],
  [/\bGemini\b/gi, "DearMe"],
  [/\bcodex[-_ ]?local\b/gi, "work area"],
  [/\bCodex\b/gi, "work area"],
  [/\bDearMe decisions?\b/gi, "DearMe review"],
  [/\bsetup[_ -]?payload\b/gi, "setup details"],
  [/\bapi[_ -]?keys?\b/gi, "team access"],
  [/\bcredentials?\b/gi, "connection details"],
  [/\btokens?\b/gi, "access details"],
  [/\badapter[_ -]?type\b|\badapterType\b/gi, "connector type"],
  [/\bmodel[-_ ]?providers?\b/gi, "services"],
  [/\bmodels?\b/gi, "proof checks"],
  [/\badapters?\b/gi, "connectors"],
  [/\bproviders?\b/gi, "services"],
  [/\bruntimes?\b/gi, "proof pass"],
  [/\braw control plane\b/gi, "operations"],
  [/\brun[_ -]?ids?\b|\brunIds?\b/gi, "work receipts"],
  [/\bqueue(?:d|s)?\b/gi, "work list"],
  [/\bworkers?\b/gi, "teammates"],
  [/\broutines?\b/gi, "cycle checks"],
  [/\badmins?\b/gi, "operators"],
  [/\bfingerprints?\b/gi, "markers"],
  [/\bworkbench\b/gi, "team progress"],
  [/\bworkstreams?\b/gi, "team updates"],
  [/\bwork streams?\b/gi, "team updates"],
  [/\bissue comments?\b/gi, "review notes"],
  [/\bissue routes?\b/gi, "review links"],
  [/\bapproval routes?\b/gi, "review links"],
  [/\bexecution routes?\b/gi, "action links"],
  [/\bdecision routes?\b/gi, "review links"],
  [/\bwork products?\b/gi, "prepared work"],
  [/\bworkspace sources?\b/gi, "work areas"],
  [/\bworkspaces?\b/gi, "work areas"],
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
  if (text.includes("linkedin")) return "Professional-network proof details";
  if (text.includes("imessage") || text.includes("sms")) return "Approved phone-message proof recipient";
  if (text.includes("telegram")) return "Chat proof recipient";
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
      /\bDearMe\s+(?:connectors?|connections?)\s+services?\s+(?:private|proof)\s+(?:work\s+areas?|areas?|pass(?:es)?)\s+(?:private|proof)\s+(?:checks?|pass(?:es)?)\s+setup\s+(?:details|notes?)\b/gi,
      "A proof pass",
    )
    .replace(/\s+/g, " ")
    .trim();

  return previewText(safe || fallback, maxLength);
}
