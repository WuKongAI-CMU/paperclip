import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDearMePaymentProviderContractProof } from "./dearme-payment-provider-contract-proof.ts";
import { runDearMePaymentReceiptSyncProof } from "./dearme-payment-receipt-sync-proof.ts";

type Env = Record<string, string | undefined>;

const PAYMENT_LINK_ENV = "DEARME_PAYMENT_LINK_URL";
const RECEIPT_SYNC_ENV = "DEARME_PAYMENT_RECEIPT_SYNC_SECRET";
const STRIPE_WEBHOOK_ENV = "STRIPE_WEBHOOK_SECRET";
const PAYMENT_PROVIDER_ENV = "DEARME_PAYMENT_PROVIDER";

export interface DearMePaymentReadinessArgs {
  help: boolean;
  json: boolean;
  humanHelpMarkdown: boolean;
  checkPrivateBeta: boolean;
  checkHosted: boolean;
  printEnvTemplate: boolean;
  envFiles: string[];
}

export interface DearMePaymentReadinessPath {
  key: "manual_paid_beta" | "hosted_checkout";
  label: string;
  ready: boolean;
  summary: string;
  blockers: string[];
}

export interface DearMePaymentReadiness {
  status: "sellable-private-beta" | "self-serve-checkout-ready";
  canSellPrivateBeta: boolean;
  canClaimSelfServeCheckout: boolean;
  manualPaidBeta: DearMePaymentReadinessPath;
  hostedCheckout: DearMePaymentReadinessPath;
  receiptSyncProof: {
    ready: boolean;
    command: string;
    summary: string;
  };
  providerContractProof: {
    ready: boolean;
    command: string;
    summary: string;
  };
  nextAction: string;
  noExternalActionGuarantee: string;
}

function envValue(env: Env, key: string): string {
  return env[key]?.trim() ?? "";
}

function hasReceiptSync(env: Env): boolean {
  return envValue(env, RECEIPT_SYNC_ENV).length > 0 || envValue(env, STRIPE_WEBHOOK_ENV).length > 0;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function inspectDearMePaymentReadiness(env: Env = process.env): DearMePaymentReadiness {
  const paymentLink = envValue(env, PAYMENT_LINK_ENV);
  const providerContractProof = runDearMePaymentProviderContractProof();
  const receiptSyncProof = runDearMePaymentReceiptSyncProof();
  const blockers: string[] = [];

  if (!paymentLink) {
    blockers.push(`${PAYMENT_LINK_ENV} is missing.`);
  } else if (!isHttpsUrl(paymentLink)) {
    blockers.push(`${PAYMENT_LINK_ENV} must be an https URL.`);
  }

  if (!hasReceiptSync(env)) {
    blockers.push(`${RECEIPT_SYNC_ENV} or ${STRIPE_WEBHOOK_ENV} is missing.`);
  }

  if (receiptSyncProof.status !== "ready") {
    blockers.push("pnpm --silent dearme:payment-receipt-sync-proof -- --check is blocked.");
  }
  if (providerContractProof.status !== "ready") {
    blockers.push("pnpm --silent dearme:payment-provider-contract-proof -- --check is blocked.");
  }

  const hostedReady = blockers.length === 0;
  const providerLabel = envValue(env, PAYMENT_PROVIDER_ENV) || "hosted checkout";

  return {
    status: hostedReady ? "self-serve-checkout-ready" : "sellable-private-beta",
    canSellPrivateBeta: true,
    canClaimSelfServeCheckout: hostedReady,
    manualPaidBeta: {
      key: "manual_paid_beta",
      label: "Private beta payment path",
      ready: true,
      summary:
        "Manual receipt recording can unlock paid beta access through the existing finance ledger.",
      blockers: [],
    },
    hostedCheckout: {
      key: "hosted_checkout",
      label: "Hosted checkout",
      ready: hostedReady,
      summary: hostedReady
        ? `${providerLabel} is configured with a customer-facing payment link and receipt sync.`
        : "Self-serve checkout is not claimable until the payment link and receipt sync are configured.",
      blockers,
    },
    receiptSyncProof: {
      ready: receiptSyncProof.status === "ready",
      command: "pnpm --silent dearme:payment-receipt-sync-proof -- --check",
      summary:
        "Local receipt-sync proof verifies signed paid receipts, unpaid/unsigned rejection, idempotency, refunds, and paid-access projection.",
    },
    providerContractProof: {
      ready: providerContractProof.status === "ready",
      command: "pnpm --silent dearme:payment-provider-contract-proof -- --check",
      summary:
        "Local provider-contract proof maps Stripe Payment Link/Checkout-shaped completed events into DearMe hosted checkout receipts, including raw-body webhook signature guarding, before paid-access projection.",
    },
    nextAction: hostedReady
      ? "Run pnpm --silent dearme:paid-loop-proof -- --check, keep pnpm --silent dearme:payment-receipt-sync-proof -- --check and pnpm --silent dearme:payment-provider-contract-proof -- --check green, then run a guarded provider receipt sync smoke before broad public self-serve checkout claims."
      : "Keep selling private beta through recorded receipts, run pnpm --silent dearme:paid-loop-proof -- --check, pnpm --silent dearme:payment-receipt-sync-proof -- --check, and pnpm --silent dearme:payment-provider-contract-proof -- --check, then configure hosted payment link plus receipt sync before claiming self-serve checkout.",
    noExternalActionGuarantee:
      "This check does not create checkout sessions, charge cards, call payment APIs, send messages, publish, deploy, or spend.",
  };
}

export function formatDearMePaymentReadiness(readiness: DearMePaymentReadiness): string[] {
  const lines = ["DearMe payment readiness"];
  lines.push(`- Status: ${readiness.status}`);
  lines.push(`- ${readiness.manualPaidBeta.label}: ready. ${readiness.manualPaidBeta.summary}`);
  const hostedBlockers = readiness.hostedCheckout.blockers.length > 0
    ? ` Missing: ${readiness.hostedCheckout.blockers.join(" ")}`
    : "";
  lines.push(
    `- ${readiness.hostedCheckout.label}: ${readiness.hostedCheckout.ready ? "ready" : "blocked"}. ${readiness.hostedCheckout.summary}${hostedBlockers}`,
  );
  lines.push(`- Sell private beta now: ${readiness.canSellPrivateBeta ? "yes" : "no"}`);
  lines.push(`- Claim self-serve checkout: ${readiness.canClaimSelfServeCheckout ? "yes" : "no"}`);
  lines.push(
    `- Receipt sync proof: ${readiness.receiptSyncProof.ready ? "ready" : "blocked"}. ${readiness.receiptSyncProof.summary}`,
  );
  lines.push(
    `- Provider contract proof: ${readiness.providerContractProof.ready ? "ready" : "blocked"}. ${readiness.providerContractProof.summary}`,
  );
  lines.push(`- No-send/no-spend guarantee: ${readiness.noExternalActionGuarantee}`);
  lines.push(`- Next action: ${readiness.nextAction}`);
  return lines;
}

function markdownCodeBlock(language: string, value: string) {
  return ["```" + language, value, "```"];
}

export function formatDearMePaymentReadinessHumanHelp(
  readiness: DearMePaymentReadiness,
  options: { date?: string } = {},
): string[] {
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const hostedStatus = readiness.hostedCheckout.ready ? "ready" : "blocked";
  const hostedBlockers = readiness.hostedCheckout.blockers.length > 0
    ? readiness.hostedCheckout.blockers.join(" ")
    : "none";
  const neededValues = readiness.hostedCheckout.ready
    ? ["- None. Keep the local payment proofs green before public checkout claims."]
    : [
      `- \`${PAYMENT_LINK_ENV}\`: customer-facing HTTPS hosted payment link for the DearMe offer.`,
      `- \`${RECEIPT_SYNC_ENV}\` or \`${STRIPE_WEBHOOK_ENV}\`: receipt-sync or webhook signing secret, kept local/server-side.`,
      `- \`${PAYMENT_PROVIDER_ENV}\`: optional customer-safe provider label for the checkout surface.`,
    ];

  const lines = [
    `### ${date} - Self-serve checkout configuration`,
    "",
    "- Needs help from: Peter",
    "- What they need to do: provide the real hosted payment link and signed receipt/webhook configuration for DearMe self-serve checkout.",
    "- Why agents cannot do it: this involves real payment-provider setup, secrets, pricing/account judgment, and a customer-facing checkout URL.",
    "- Blocking: no for private-beta sales or paid-user operations; yes before self-serve checkout can be claimed publicly.",
    "- Estimated human time: 10-20 minutes once the payment provider offer is ready.",
    "- Agents continue after result by: checking payment readiness locally, keeping receipt-sync and provider-contract proofs green, then exposing checkout only when the product marks it ready.",
    "",
    "Needed values:",
    "",
    ...neededValues,
    "",
    "Reply template for Peter:",
    "",
    ...markdownCodeBlock("text", [
      "Payment link:",
      "Receipt sync configured:",
      "Provider label:",
    ].join("\n")),
    "",
    "Current generated payment readiness:",
    "",
    `- Status: ${readiness.status}.`,
    `- Private beta sales: ${readiness.canSellPrivateBeta ? "ready now" : "blocked"}.`,
    `- Hosted checkout: ${hostedStatus}.`,
    `- Claim self-serve checkout: ${readiness.canClaimSelfServeCheckout ? "yes" : "no"}.`,
    `- Blockers: ${hostedBlockers}`,
    `- No-spend guarantee: ${readiness.noExternalActionGuarantee}`,
    "",
    "Local setup template:",
    "",
    ...markdownCodeBlock(
      "bash",
      "pnpm --silent dearme:payment-readiness -- --print-env-template > .dearme-payment.env",
    ),
    "",
    "Required local checks before claiming checkout:",
    "",
    ...markdownCodeBlock("bash", [
      "pnpm --silent dearme:payment-readiness -- --env-file .dearme-payment.env --check-hosted",
      readiness.receiptSyncProof.command,
      readiness.providerContractProof.command,
    ].join("\n")),
    "",
    "Safety notes:",
    "",
    "- This handoff does not create checkout sessions, charge cards, call payment APIs, publish, deploy, or spend.",
    "- Payment secrets must stay in local/server environment configuration, not in chat, docs, screenshots, or customer-facing copy.",
    "- Manual private-beta receipt recording remains the sellable path until hosted checkout is fully configured.",
  ];

  return lines;
}

export function dearMePaymentReadinessEnvTemplate(): string {
  return [
    "# Optional self-serve payment path. Manual private-beta receipt recording works without these.",
    "# Keep the local receipt-sync and provider contracts green before claiming hosted checkout:",
    "# pnpm --silent dearme:payment-receipt-sync-proof -- --check",
    "# pnpm --silent dearme:payment-provider-contract-proof -- --check",
    `${PAYMENT_LINK_ENV}=`,
    `${RECEIPT_SYNC_ENV}=`,
    `# ${STRIPE_WEBHOOK_ENV}=`,
    `${PAYMENT_PROVIDER_ENV}=hosted checkout`,
  ].join("\n");
}

export function parseDearMePaymentReadinessArgs(argv: readonly string[]): DearMePaymentReadinessArgs {
  const args: DearMePaymentReadinessArgs = {
    help: false,
    json: false,
    humanHelpMarkdown: false,
    checkPrivateBeta: false,
    checkHosted: false,
    printEnvTemplate: false,
    envFiles: [],
  };
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index]!;
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--human-help-markdown") {
      args.humanHelpMarkdown = true;
    } else if (arg === "--check") {
      args.checkPrivateBeta = true;
    } else if (arg === "--check-hosted") {
      args.checkHosted = true;
    } else if (arg === "--print-env-template") {
      args.printEnvTemplate = true;
    } else if (arg === "--env-file") {
      const value = normalizedArgv[index + 1];
      if (!value) throw new Error("--env-file requires a path");
      args.envFiles.push(value);
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      args.envFiles.push(arg.slice("--env-file=".length));
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function parseEnvFile(content: string): Env {
  const parsed: Env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

export async function loadDearMePaymentReadinessEnv(
  envFiles: readonly string[],
  baseEnv: Env = process.env,
): Promise<Env> {
  const env: Env = { ...baseEnv };
  for (const envFile of envFiles) {
    const content = await readFile(resolve(envFile), "utf8");
    Object.assign(env, parseEnvFile(content));
  }
  return env;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:payment-readiness -- [--json] [--human-help-markdown] [--check] [--check-hosted] [--env-file <path>]

Checks the commercial payment path without calling payment APIs.

Modes:
  --check          Require the private-beta manual receipt path to be sellable.
  --check-hosted   Require hosted self-serve checkout to be configured.
  --human-help-markdown
                   Print the Peter-facing self-serve checkout support request.

Setup:
  pnpm --silent dearme:payment-readiness -- --print-env-template > .dearme-payment.env
  pnpm --silent dearme:payment-readiness -- --env-file .dearme-payment.env
`);
}

async function main() {
  try {
    const args = parseDearMePaymentReadinessArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }
    if (args.printEnvTemplate) {
      console.log(dearMePaymentReadinessEnvTemplate());
      return;
    }

    const env = await loadDearMePaymentReadinessEnv(args.envFiles, process.env);
    const readiness = inspectDearMePaymentReadiness(env);
    if (args.json) {
      console.log(JSON.stringify({ readiness }, null, 2));
    } else if (args.humanHelpMarkdown) {
      for (const line of formatDearMePaymentReadinessHumanHelp(readiness)) {
        console.log(line);
      }
    } else {
      for (const line of formatDearMePaymentReadiness(readiness)) {
        console.log(line);
      }
    }

    if (args.checkPrivateBeta && !readiness.canSellPrivateBeta) {
      process.exitCode = 1;
    }
    if (args.checkHosted && !readiness.canClaimSelfServeCheckout) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entrypoint === fileURLToPath(import.meta.url)) {
  void main();
}
