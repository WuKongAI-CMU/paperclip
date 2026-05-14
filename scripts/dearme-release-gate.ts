import { fileURLToPath } from "node:url";
import {
  inspectDearMeProviderSmokeReadiness,
  type DearMeProviderSmokeReadiness,
} from "./dearme-provider-smoke.ts";
import { runDearMePaidLoopProof } from "./dearme-paid-loop-proof.ts";
import { runDearMePaidOpsProof } from "./dearme-paid-ops-proof.ts";
import { runDearMeSupportRecoveryProof } from "./dearme-support-recovery-proof.ts";
import { runDearMeCohortRetentionProof } from "./dearme-cohort-retention-proof.ts";
import { inspectDearMeFeedbackLearningContract } from "./dearme-feedback-learning-proof.ts";
import { inspectDearMePaymentReadiness } from "./dearme-payment-readiness.ts";
import {
  buildDearMeGoalAudit,
  formatDearMeGoalAudit,
  type DearMeGoalAudit,
  type DearMeGoalAuditItem,
  type DearMeGoalAuditItemKey,
} from "./dearme-goal-audit.ts";
import { loadDearMeProofEnv } from "./dearme-proof.ts";
import {
  dearMeProofFactsNeededFromReadiness,
  type DearMeProofFactNeed,
} from "./dearme-proof-facts.ts";
import {
  dearMeCustomerSafeLaunchNeed,
  dearMeOwnerProofFactSpec,
} from "../packages/shared/src/dearme-customer-text.ts";

type Env = Record<string, string | undefined>;

export type DearMeReleaseGateTarget = "private-proof" | "public-launch";

export interface DearMeReleaseGateArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  target: DearMeReleaseGateTarget;
  envFiles: string[];
}

export interface DearMeReleaseGateDecision {
  target: DearMeReleaseGateTarget;
  ready: boolean;
  verdict: string;
  evidence: string[];
  blockers: string[];
  commands: string[];
}

export interface DearMeReleaseGate {
  overall: "blocked" | "private-proof-ready" | "public-launch-ready";
  canUse: boolean;
  canPublish: boolean;
  privateProof: DearMeReleaseGateDecision;
  publicLaunch: DearMeReleaseGateDecision;
  factsNeeded: DearMeProofFactNeed[];
  operatorHandoff: DearMeReleaseGateOperatorHandoff;
  productReadiness: DearMeProductReadiness;
  commercialReadiness: DearMeCommercialReadiness;
  productComparison: DearMeProductComparison;
  nextAction: DearMeGoalAudit["nextAction"];
  audit: DearMeGoalAudit;
}

export interface DearMeProductReadiness {
  status: DearMeReleaseGate["overall"];
  headline: string;
  summary: string;
  publicLaunchNeeds: string[];
  operatorFactsNeeded: number;
  nextAction: {
    label: string;
    reason: string;
  };
}

export type DearMeCommercialReadinessStatus =
  | "blocked"
  | "sellable-private-beta"
  | "public-launch-ready";

export type DearMeCommercialReadinessItemStatus = "ready" | "blocked";

export interface DearMeCommercialReadinessItem {
  key:
    | "paid_access"
    | "payment_path"
    | "first_wow"
    | "weekly_value_receipt"
    | "account_health_receipt"
    | "paid_retention_pulse"
    | "empty_week_recovery"
    | "autonomy_contract"
    | "launch_boundary"
    | "cost_guardrail"
    | "feedback_learning"
    | "support_handoff";
  label: string;
  status: DearMeCommercialReadinessItemStatus;
  evidence: string[];
  remainingGap: string;
}

export interface DearMeCommercialReadiness {
  status: DearMeCommercialReadinessStatus;
  headline: string;
  summary: string;
  canSellPrivateBeta: boolean;
  canOperatePaidUsers: boolean;
  cannotClaimPublicLaunchUntil: string[];
  items: DearMeCommercialReadinessItem[];
}

export interface DearMeReleaseGateOperatorFact {
  label: string;
  provideAs: string;
  targets: DearMeProviderSmokeTarget[];
  sensitive: boolean;
  placeholder: string;
  captureFlag: string | null;
}

export interface DearMeReleaseGateOperatorHandoff {
  status: "blocked" | "ready";
  factsToCapture: DearMeReleaseGateOperatorFact[];
  captureCommand: string | null;
  handoffReceiptPreviewCommand: string | null;
  handoffReceiptCommand: string | null;
  checkCommand: string;
  guardedLiveCommands: string[];
  noSendGuarantee: true;
  safety: string[];
}

export type DearMeBenchmarkStatus = "ahead" | "matched" | "partial" | "behind";

export interface DearMeProductComparisonItem {
  benchmark: "Polsia" | "Naive/Paperclip" | "OpenClaw" | "DearMe architecture";
  status: DearMeBenchmarkStatus;
  summary: string;
  evidence: string[];
  remainingGap: string;
}

export interface DearMeProductComparison {
  verdict: string;
  items: DearMeProductComparisonItem[];
}

type DearMeReleaseGateBase = Omit<
  DearMeReleaseGate,
  "operatorHandoff" | "productReadiness" | "commercialReadiness" | "productComparison"
>;
type DearMeProviderSmokeTarget = DearMeProviderSmokeReadiness["target"];

const PRIVATE_PROOF_ITEMS: readonly DearMeGoalAuditItemKey[] = [
  "architecture_status_spine",
  "donor_reuse_absorption",
  "symphony_coordination",
  "public_first_run_landing",
  "private_first_wow",
  "loopback_host_rehearsal",
  "voice_autonomy",
  "production_host_provider_auth",
  "production_host_live_wow",
  "openclaw_message_contract_rehearsal",
];

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function requiredItemsFor(
  audit: DearMeGoalAudit,
  target: DearMeReleaseGateTarget,
): DearMeGoalAuditItem[] {
  if (target === "public-launch") {
    return audit.items.filter((item) => item.requiredForGoal);
  }
  const byKey = new Map(audit.items.map((item) => [item.key, item]));
  return PRIVATE_PROOF_ITEMS
    .map((key) => byKey.get(key))
    .filter((item): item is DearMeGoalAuditItem => Boolean(item));
}

function blockersFor(items: readonly DearMeGoalAuditItem[]): string[] {
  return items
    .filter((item) => item.status !== "met")
    .flatMap((item) =>
      item.blockers.length > 0
        ? item.blockers.map((blocker) => `${item.label}: ${blocker}`)
        : [item.label]
    );
}

function commandsFor(items: readonly DearMeGoalAuditItem[]): string[] {
  return unique(
    items
      .filter((item) => item.status !== "met")
      .flatMap((item) => item.commands),
  );
}

function operatorFactPlaceholder(fact: DearMeProofFactNeed) {
  const spec = dearMeOwnerProofFactSpec(fact.provideAs);
  if (spec) return spec.placeholder;
  if (fact.sensitive) return "<keep-local-secret>";
  return "<approved-value>";
}

function operatorFactCaptureFlag(fact: DearMeProofFactNeed) {
  return dearMeOwnerProofFactSpec(fact.provideAs)?.captureFlag ?? null;
}

function buildOperatorHandoff(
  gate: DearMeReleaseGateBase,
): DearMeReleaseGateOperatorHandoff {
  const factsToCapture = gate.factsNeeded.map((fact): DearMeReleaseGateOperatorFact => ({
    label: fact.label,
    provideAs: fact.provideAs,
    targets: fact.targets,
    sensitive: fact.sensitive,
    placeholder: operatorFactPlaceholder(fact),
    captureFlag: operatorFactCaptureFlag(fact),
  }));
  const captureArgs = factsToCapture
    .filter((fact) => fact.captureFlag)
    .map((fact) => `${fact.captureFlag} ${fact.placeholder}`);
  const captureCommand = captureArgs.length > 0
    ? `pnpm --silent dearme:next-proof -- --target all ${captureArgs.join(" ")}`
    : null;
  const handoffReceiptPreviewCommand = captureArgs.length > 0
    ? "pnpm --silent dearme:next-proof -- --target all --no-write --handoff-receipt-file <launch-proof-handoff-receipt.txt>"
    : null;
  const handoffReceiptCommand = captureArgs.length > 0
    ? "pnpm --silent dearme:next-proof -- --target all --handoff-receipt-file <launch-proof-handoff-receipt.txt>"
    : null;
  const guardedLiveCommands = unique(
    gate.publicLaunch.commands.filter((command) =>
      command.includes("DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1")
    ),
  );

  return {
    status: factsToCapture.length > 0 ? "blocked" : "ready",
    factsToCapture,
    captureCommand,
    handoffReceiptPreviewCommand,
    handoffReceiptCommand,
    checkCommand: "pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check",
    guardedLiveCommands,
    noSendGuarantee: true,
    safety: [
      "The receipt preview command checks downloaded product facts in memory; it does not change the local env file.",
      "The capture command only writes local proof setup; it does not send messages, publish, deploy, or spend.",
      "Run the no-send check before any guarded live proof.",
      "Live proof still requires DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1.",
    ],
  };
}

function buildProductReadiness(
  gate: DearMeReleaseGateBase,
): DearMeProductReadiness {
  const publicLaunchNeeds = unique(gate.factsNeeded.map(dearMeCustomerSafeLaunchNeed));
  if (gate.canPublish) {
    return {
      status: gate.overall,
      headline: "Ready for public launch",
      summary: "DearMe has private proof, reuse, message delivery proof, and live-channel proof evidence.",
      publicLaunchNeeds,
      operatorFactsNeeded: gate.factsNeeded.length,
      nextAction: {
        label: "Prepare public release",
        reason: "Every required proof item is met by the release gate.",
      },
    };
  }
  if (gate.canUse) {
    return {
      status: gate.overall,
      headline: "Private proof is usable",
      summary: "DearMe can demonstrate the first wow privately, but public launch remains blocked until the current live-proof facts are supplied and verified.",
      publicLaunchNeeds,
      operatorFactsNeeded: gate.factsNeeded.length,
      nextAction: {
        label: "Supply approved live-proof details",
        reason: "Public launch needs owner-approved external delivery facts before any live send or campaign proof.",
      },
    };
  }
  return {
    status: gate.overall,
    headline: "Private proof is blocked",
    summary: "DearMe is still missing required product, reuse, host, or safe-contract proof before it should be used as a private demo.",
    publicLaunchNeeds,
    operatorFactsNeeded: gate.factsNeeded.length,
    nextAction: {
      label: "Repair private proof blockers",
      reason: "Private proof must be restored before public launch proof work continues.",
    },
  };
}

function commercialStatus(
  gate: DearMeReleaseGateBase,
): DearMeCommercialReadinessStatus {
  if (!gate.canUse) return "blocked";
  return gate.canPublish ? "public-launch-ready" : "sellable-private-beta";
}

function commercialItem(
  item: Omit<DearMeCommercialReadinessItem, "status"> & {
    ready: boolean;
  },
): DearMeCommercialReadinessItem {
  const { ready, ...rest } = item;
  return {
    ...rest,
    status: ready ? "ready" : "blocked",
  };
}

function buildCommercialReadiness(
  gate: DearMeReleaseGateBase,
  operatorHandoff: DearMeReleaseGateOperatorHandoff,
  productReadiness: DearMeProductReadiness,
  env: Env = process.env,
): DearMeCommercialReadiness {
  const voiceEvidence = metEvidence(gate.audit, ["voice_autonomy"]);
  const paidLoopProof = runDearMePaidLoopProof();
  const paidOpsProof = runDearMePaidOpsProof();
  const supportRecoveryProof = runDearMeSupportRecoveryProof();
  const cohortRetentionProof = runDearMeCohortRetentionProof();
  const feedbackLearningContract = inspectDearMeFeedbackLearningContract();
  const paymentReadiness = inspectDearMePaymentReadiness(env);
  const privatePaymentPathReady =
    paidLoopProof.status === "ready" && paymentReadiness.canSellPrivateBeta;
  const paidOpsReady = paidOpsProof.status === "ready";
  const supportRecoveryReady = supportRecoveryProof.status === "ready";
  const cohortRetentionReady = cohortRetentionProof.status === "ready";
  const feedbackLearningReady = feedbackLearningContract.status === "ready";
  const supportHandoffReady = operatorHandoff.status === "ready" ||
    (operatorHandoff.captureCommand !== null && operatorHandoff.noSendGuarantee);
  const launchBoundaryReady = gate.canUse &&
    (gate.canPublish || (gate.factsNeeded.length > 0 && operatorHandoff.noSendGuarantee));
  const cannotClaimPublicLaunchUntil = gate.canPublish
    ? []
    : productReadiness.publicLaunchNeeds.length > 0
      ? productReadiness.publicLaunchNeeds
      : gate.publicLaunch.blockers;
  const status = commercialStatus(gate);
  const items: DearMeCommercialReadinessItem[] = [
    commercialItem({
      key: "paid_access",
      label: "Paid beta access",
      ready: gate.canUse && paidLoopProof.status === "ready",
      evidence: gate.canUse && paidLoopProof.status === "ready"
        ? [
          "Private proof is usable, so paid beta access can unlock private brand-team preparation.",
          "Paid-loop proof shows trial access blocks first-cycle work until a paid beta receipt is recorded.",
          "The recorded receipt activates paid access and removes the first-cycle paid-beta blocker.",
        ]
        : [],
      remainingGap: gate.canUse
        ? paidLoopProof.status === "ready"
          ? "Paid-loop proof shows a recorded receipt activates access and unblocks first-cycle work; Self-serve checkout can stay separate until broadened."
          : "Repair pnpm --silent dearme:paid-loop-proof -- --check before selling paid beta access."
        : "Restore private proof before selling access.",
    }),
    commercialItem({
      key: "payment_path",
      label: "Payment path proof",
      ready: gate.canUse && privatePaymentPathReady,
      evidence: gate.canUse && privatePaymentPathReady
        ? [
          paymentReadiness.manualPaidBeta.summary,
          paidLoopProof.checks.find((check) => check.key === "receipt_activates_paid_access")?.summary ??
            "Paid-loop proof activates paid access from a recorded receipt.",
          paymentReadiness.canClaimSelfServeCheckout
            ? paymentReadiness.hostedCheckout.summary
            : "Hosted checkout remains a separate blocked proof path, so private beta can sell now without overstating self-serve readiness.",
          paymentReadiness.receiptSyncProof.summary,
          paymentReadiness.providerContractProof.summary,
        ]
        : [],
      remainingGap: gate.canUse
        ? paymentReadiness.canClaimSelfServeCheckout
          ? "Local receipt-sync and provider-contract proofs are ready with the hosted payment link and receipt sync setup; run a guarded provider receipt sync smoke before broad public self-serve checkout claims."
          : `${paymentReadiness.nextAction} Re-run pnpm --silent dearme:payment-readiness before any hosted checkout claim.`
        : "Restore private proof before relying on payment-path readiness.",
    }),
    commercialItem({
      key: "first_wow",
      label: "Five-minute first wow",
      ready: gate.privateProof.ready,
      evidence: gate.privateProof.evidence,
      remainingGap: gate.privateProof.ready
        ? "Keep measuring real onboarding users; no release-gate blocker remains for private proof."
        : "Repair private first-run, host, reuse, or safe-contract blockers.",
    }),
    commercialItem({
      key: "weekly_value_receipt",
      label: "Weekly value receipt",
      ready: gate.canUse && cohortRetentionReady,
      evidence: gate.canUse && cohortRetentionReady
        ? [
          "Paid beta workbench shows useful outputs, weekly report coverage, opportunity/proof coverage, and the empty-week trigger together.",
          "The receipt makes a paid week measurable by customer-visible outcomes instead of internal activity.",
          "Cohort-retention proof verifies weekly value analytics across content, opportunities, portfolio, reports, Voice & Memory, and launch decisions.",
          "Paid-event-source proof maps finance, workbench, Voice & Memory, decision, and support receipts into those retention analytics.",
        ]
        : [],
      remainingGap: gate.canUse
        ? cohortRetentionReady
          ? "Cohort-retention proof verifies weekly value analytics and its paid-event-source contract is ready for live paid-user events as cohorts start."
          : "Repair pnpm --silent dearme:cohort-retention-proof -- --check before claiming weekly value analytics."
        : "Restore private proof before claiming weekly value delivery.",
    }),
    commercialItem({
      key: "account_health_receipt",
      label: "Paid account health receipt",
      ready: gate.canUse && paidOpsReady,
      evidence: gate.canUse && paidOpsReady
        ? [
          "Paid account health combines useful work, Voice & Memory confidence, launch calls, and spend clarity.",
          "Paid-ops proof routes healthy paid accounts, trial previews, near-guardrail accounts, and paused spend-review accounts to the right next action.",
          "The account is treated as healthy only when outcomes are visible enough to support renewal.",
        ]
        : [],
      remainingGap: gate.canUse
        ? paidOpsReady
          ? "Paid-ops proof routes healthy, trial, near-guardrail, and paused accounts; connect the health receipt to live paid-user retention signals before broad self-serve launch."
          : "Repair pnpm --silent dearme:paid-ops-proof -- --check before claiming paid account health."
        : "Restore private proof before claiming paid account health.",
    }),
    commercialItem({
      key: "paid_retention_pulse",
      label: "Paid retention pulse",
      ready: gate.canUse && paidOpsReady && cohortRetentionReady,
      evidence: gate.canUse && paidOpsReady && cohortRetentionReady
        ? [
          "Brand OS now combines visible value, Voice & Memory risk, review risk, and risk owner into one weekly renewal signal.",
          "Paid-ops proof keeps healthy cohorts operable and escalates trial, warning, and hard-stop accounts before they become silent retention failures.",
          "Empty paid weeks route to recovery and support; repeated capped paths route to stuck work and support.",
          "Cohort-retention proof turns weekly paid-user outcomes into renewal-ready, recovered, and support-owned risk states.",
          "Paid-event-source proof keeps those states connected to local finance, workbench, memory, decision, and support receipts.",
        ]
        : [],
      remainingGap: gate.canUse
        ? !paidOpsReady
          ? "Repair pnpm --silent dearme:paid-ops-proof -- --check before claiming a paid retention pulse."
          : cohortRetentionReady
          ? "Cohort-retention proof keeps the renewal pulse measurable; its paid-event-source contract is ready for real paid-cohort events after live usage starts."
          : "Repair pnpm --silent dearme:cohort-retention-proof -- --check before claiming paid retention analytics."
        : "Restore private proof before claiming a paid retention pulse.",
    }),
    commercialItem({
      key: "empty_week_recovery",
      label: "Empty-week recovery",
      ready: gate.canUse && supportRecoveryReady,
      evidence: gate.canUse && supportRecoveryReady
        ? [
          "A paid account with zero useful deliverables gets a visible make-good path instead of silent activity.",
          "Recovery uses the existing work stream, Voice & Memory plan, and support handoff rather than a separate retention subsystem.",
          "Support-recovery proof verifies empty-week recovery, stuck-work routing, and private support feedback handling.",
        ]
        : [],
      remainingGap: gate.canUse
        ? supportRecoveryReady
          ? "Support-recovery proof verifies empty-week recovery and support routing; validate it against real paid weeks."
          : "Repair pnpm --silent dearme:support-recovery-proof -- --check before claiming empty-week recovery."
        : "Restore private proof before claiming retention recovery.",
    }),
    commercialItem({
      key: "autonomy_contract",
      label: "Autonomy contract receipt",
      ready: gate.canUse,
      evidence: gate.canUse
        ? [
          "Brand OS shows what DearMe can research privately, prepare in parallel, and hold for a launch call.",
          "The receipt keeps autonomous work moving without exposing donor terms or creating another approval system.",
        ]
        : [],
      remainingGap: gate.canUse
        ? "Validate the autonomy contract against real paid-user support cases and live launch calls."
        : "Restore private proof before claiming autonomous paid-user operation.",
    }),
    commercialItem({
      key: "launch_boundary",
      label: "Review and launch boundary",
      ready: launchBoundaryReady,
      evidence: launchBoundaryReady
        ? [
          "The gate separates private usability from public launch readiness.",
          "External launch and live proof remain behind approved facts and explicit live confirmation.",
        ]
        : [],
      remainingGap: launchBoundaryReady
        ? "Keep the boundary visible until all live proof receipts are verified."
        : "Restore the release boundary before running paid private cycles.",
    }),
    commercialItem({
      key: "cost_guardrail",
      label: "Cost and cycle guardrail",
      ready: gate.canUse && paidOpsReady,
      evidence: gate.canUse && paidOpsReady
        ? [
          "Paid beta cycles run through the existing access and monthly spend guardrail contract.",
          "Paid-ops proof blocks trial and exhausted accounts while allowing healthy paid accounts to continue.",
        ]
        : [],
      remainingGap: gate.canUse
        ? paidOpsReady
          ? "Paid-ops proof blocks trial and exhausted accounts while allowing healthy paid accounts to continue; add live payment-provider reconciliation before broad self-serve sales."
          : "Repair pnpm --silent dearme:paid-ops-proof -- --check before claiming paid cycle guardrails."
        : "Restore private proof before paid cycle guardrails matter.",
    }),
    commercialItem({
      key: "feedback_learning",
      label: "Feedback and memory learning",
      ready: voiceEvidence.length > 0 && feedbackLearningReady && cohortRetentionReady,
      evidence: voiceEvidence.length > 0 && feedbackLearningReady && cohortRetentionReady
        ? [
          ...voiceEvidence,
          "Feedback-learning contract keeps review feedback private, saves the note, opens Voice & Memory, and preserves launch boundaries.",
          "Cohort-retention proof carries learned feedback through the paid-event-source contract into paid-user retention analytics before real paid events replace local receipts.",
        ]
        : voiceEvidence,
      remainingGap: voiceEvidence.length > 0
        ? !feedbackLearningReady
          ? `Repair ${feedbackLearningContract.proofCommand} before claiming autonomous learning.`
          : cohortRetentionReady
          ? "Feedback-learning proof and cohort-retention proof verify private review-to-Voice & Memory learning plus paid-user feedback analytics, with the paid-event-source contract ready for real paid feedback events as cohorts start."
          : "Repair pnpm --silent dearme:cohort-retention-proof -- --check before claiming paid-user feedback analytics."
        : "Restore Voice & Memory proof before claiming autonomous learning.",
    }),
    commercialItem({
      key: "support_handoff",
      label: "Human support handoff",
      ready: supportHandoffReady && supportRecoveryReady,
      evidence: supportHandoffReady && supportRecoveryReady
        ? operatorHandoff.status === "ready"
          ? [
            "No owner-supplied live proof facts are missing for the current release gate.",
            "Support-recovery proof keeps paid-user recovery and support notes private before any external action.",
          ]
          : [
            "The gate lists the exact owner-approved facts still needed before live proof.",
            "The capture step is local-only and protected by a no-send check.",
            "Support-recovery proof keeps paid-user recovery and support notes private before any external action.",
          ]
        : [],
      remainingGap: supportHandoffReady
        ? supportRecoveryReady
          ? "Support-recovery proof verifies paid-user recovery/support routing; owner support is only needed for approved external details, hosted checkout setup, live proof, public launch, or spend-sensitive actions."
          : "Repair pnpm --silent dearme:support-recovery-proof -- --check before claiming paid-user support handoff readiness."
        : "Create a concrete owner handoff before selling paid beta access.",
    }),
  ];
  const canSellPrivateBeta = gate.canUse && privatePaymentPathReady;
  const canOperatePaidUsers = canSellPrivateBeta &&
    items.every((item) => item.status === "ready");

  return {
    status,
    headline: status === "public-launch-ready"
      ? "Commercially ready for public launch"
      : status === "sellable-private-beta"
        ? "Sellable and operable as a private beta"
        : "Not ready to sell",
    summary: status === "public-launch-ready"
      ? "DearMe can be sold, operated, and publicly launched under the current proof gate."
      : status === "sellable-private-beta"
        ? "DearMe can be sold as a private beta with manual paid access and operated for paying users while broad public launch waits for live proof receipts."
        : "DearMe should not be sold until private proof, launch boundary, and operating handoff are restored.",
    canSellPrivateBeta,
    canOperatePaidUsers,
    cannotClaimPublicLaunchUntil,
    items,
  };
}

function itemByKey(
  audit: DearMeGoalAudit,
  key: DearMeGoalAuditItemKey,
): DearMeGoalAuditItem | undefined {
  return audit.items.find((item) => item.key === key);
}

function itemMet(audit: DearMeGoalAudit, key: DearMeGoalAuditItemKey): boolean {
  return itemByKey(audit, key)?.status === "met";
}

function metEvidence(
  audit: DearMeGoalAudit,
  keys: readonly DearMeGoalAuditItemKey[],
): string[] {
  return keys
    .map((key) => itemByKey(audit, key))
    .filter((item): item is DearMeGoalAuditItem => item?.status === "met")
    .map((item) => item.label);
}

function providerReadinessFor(
  readiness: readonly DearMeProviderSmokeReadiness[],
  target: DearMeProviderSmokeTarget,
): DearMeProviderSmokeReadiness | undefined {
  return readiness.find((item) => item.target === target);
}

function providerReadinessEvidence(
  readiness: readonly DearMeProviderSmokeReadiness[],
  target: DearMeProviderSmokeTarget,
  label: string,
): string[] {
  const item = providerReadinessFor(readiness, target);
  if (!item) return [];
  if (item.ready) return [`${label} readiness has no missing setup facts.`];
  if (item.missing.length === 0) return [`${label} readiness is blocked.`];
  return [`${label} readiness is missing ${item.missing.join(", ")}.`];
}

function buildProductComparison(
  gate: DearMeReleaseGateBase,
  providerReadiness: readonly DearMeProviderSmokeReadiness[],
): DearMeProductComparison {
  const audit = gate.audit;
  const naiveAbsorbed = itemMet(audit, "donor_reuse_absorption") &&
    itemMet(audit, "symphony_coordination");
  const polsiaPrivateWow = itemMet(audit, "public_first_run_landing") &&
    itemMet(audit, "private_first_wow") &&
    itemMet(audit, "production_host_live_wow");
  const openClawContract = itemMet(audit, "openclaw_message_contract_rehearsal");
  const openClawLive = itemMet(audit, "openclaw_message_reuse");
  const architectureSpine = itemMet(audit, "architecture_status_spine");
  const telegramReady = providerReadinessFor(providerReadiness, "telegram_message")?.ready === true;
  const imessageReady = providerReadinessFor(providerReadiness, "imessage_message")?.ready === true;
  const openClawEvidence = [
    ...metEvidence(audit, [
      "openclaw_message_contract_rehearsal",
      "openclaw_message_reuse",
    ]),
    ...providerReadinessEvidence(providerReadiness, "telegram_message", "Telegram message"),
    ...providerReadinessEvidence(providerReadiness, "imessage_message", "iMessage/SMS"),
  ];

  return {
    verdict: gate.canPublish
      ? "DearMe matches the target benchmark set: private wow, substrate reuse, OpenClaw live proof, and public-launch evidence are all met."
      : gate.canUse
        ? "DearMe has matched the Naive/Paperclip reuse layer and reached a private Polsia-style wow; the remaining benchmark gap is live external channel proof."
        : "DearMe is still behind the benchmark set because private proof is not fully usable.",
    items: [
      {
        benchmark: "Polsia",
        status: gate.canPublish ? "matched" : polsiaPrivateWow ? "partial" : "behind",
        summary: polsiaPrivateWow
          ? "Public first-run landing, private first-wow, and phone-reachable proof are present."
          : "The cold-start landing or first-five-minute wow is not yet fully proven.",
        evidence: metEvidence(audit, [
          "public_first_run_landing",
          "private_first_wow",
          "production_host_live_wow",
        ]),
        remainingGap: gate.canPublish
          ? "None for the current release gate."
          : "Live external channel/provider proof must be verified before claiming Polsia-level public readiness.",
      },
      {
        benchmark: "Naive/Paperclip",
        status: naiveAbsorbed ? "matched" : "behind",
        summary: naiveAbsorbed
          ? "Control-plane reuse and worktree absorption are clean on the current head."
          : "Control-plane reuse or Symphony absorption is not fully proven.",
        evidence: metEvidence(audit, [
          "donor_reuse_absorption",
          "symphony_coordination",
        ]),
        remainingGap: naiveAbsorbed
          ? "None for the current release gate."
          : "Finish worktree/Symphony absorption before treating the substrate as reused.",
      },
      {
        benchmark: "OpenClaw",
        status: openClawLive ? "matched" : openClawContract ? "partial" : "behind",
        summary: openClawContract
          ? telegramReady && !imessageReady
            ? "The shared message gateway contract is proven locally and Telegram setup is ready; iMessage/SMS recipient proof is still the blocker."
            : "The shared message gateway contract is proven locally; live iMessage/SMS proof is still the blocker."
          : "The shared message gateway contract is not yet proven.",
        evidence: openClawEvidence,
        remainingGap: openClawLive
          ? "None for the current release gate."
          : telegramReady && !imessageReady
            ? "Supply the approved phone-message proof recipient and run guarded live proof; Telegram setup is already ready."
          : "Supply the approved phone-message proof recipient and run guarded live proof.",
      },
      {
        benchmark: "DearMe architecture",
        status: architectureSpine && gate.canUse ? "matched" : "behind",
        summary: architectureSpine
          ? "The product has one status spine separating private usability from public launch readiness."
          : "The product lacks a verified status spine.",
        evidence: metEvidence(audit, [
          "architecture_status_spine",
          "private_first_wow",
          "live_provider_set",
        ]),
        remainingGap: gate.canPublish
          ? "None for the current release gate."
          : "Keep public launch blocked until live provider truth is real.",
      },
    ],
  };
}

function decisionFor(
  audit: DearMeGoalAudit,
  target: DearMeReleaseGateTarget,
): DearMeReleaseGateDecision {
  const items = requiredItemsFor(audit, target);
  const missingRequiredAuditItems = target === "private-proof" &&
    items.length !== PRIVATE_PROOF_ITEMS.length;
  const blockers = blockersFor(items);
  const ready = !missingRequiredAuditItems && items.length > 0 &&
    items.every((item) => item.status === "met");

  const missing = missingRequiredAuditItems
    ? [
      `release gate is missing ${PRIVATE_PROOF_ITEMS.length - items.length} private-proof audit item(s)`,
      ...blockers,
    ]
    : blockers;
  const evidence = items
    .filter((item) => item.status === "met")
    .map((item) => item.label);

  if (target === "private-proof") {
    return {
      target,
      ready,
      verdict: ready
        ? "Private/internal proof is usable: DearMe can show the public first-run, first wow, absorbed reuse, host proof, and OpenClaw message contract without unsafe live actions."
        : "Private/internal proof is blocked: the local product proof is missing required architecture, reuse, host, or safe-contract evidence.",
      evidence,
      blockers: missing,
      commands: commandsFor(items),
    };
  }

  return {
    target,
    ready: audit.complete && ready,
    verdict: audit.complete && ready
      ? "Public launch is ready: every required product, reuse, OpenClaw message, and live provider proof item is met."
      : "Public launch is blocked: DearMe still needs real live channel/provider proof before a formal release claim.",
    evidence,
    blockers: missing,
    commands: commandsFor(items),
  };
}

export function summarizeDearMeReleaseGate(
  audit: DearMeGoalAudit,
  providerReadiness: readonly DearMeProviderSmokeReadiness[] = [],
  env: Env = process.env,
): DearMeReleaseGate {
  const privateProof = decisionFor(audit, "private-proof");
  const publicLaunch = decisionFor(audit, "public-launch");
  const base = {
    overall: publicLaunch.ready
      ? "public-launch-ready"
      : privateProof.ready
        ? "private-proof-ready"
        : "blocked",
    canUse: privateProof.ready,
    canPublish: publicLaunch.ready,
    privateProof,
    publicLaunch,
    factsNeeded: dearMeProofFactsNeededFromReadiness(providerReadiness),
    nextAction: audit.nextAction,
    audit,
  };
  const operatorHandoff = buildOperatorHandoff(base);
  const productReadiness = buildProductReadiness(base);
  const commercialReadiness = buildCommercialReadiness(
    base,
    operatorHandoff,
    productReadiness,
    env,
  );
  const productComparison = buildProductComparison(base, providerReadiness);
  return {
    ...base,
    operatorHandoff,
    productReadiness,
    commercialReadiness,
    productComparison,
  };
}

export function formatDearMeReleaseGate(gate: DearMeReleaseGate): string[] {
  const lines = [
    "DearMe release gate",
    gate.canPublish
      ? "Verdict: usable and ready for public launch."
      : gate.canUse
        ? "Verdict: usable for private/internal proof, not ready for public launch."
        : "Verdict: not yet usable for private proof or public launch.",
    "",
    `Private proof: ${gate.privateProof.ready ? "ready" : "blocked"}. ${gate.privateProof.verdict}`,
    `Public launch: ${gate.publicLaunch.ready ? "ready" : "blocked"}. ${gate.publicLaunch.verdict}`,
  ];

  if (gate.privateProof.evidence.length > 0) {
    lines.push("");
    lines.push("Private proof evidence:");
    for (const item of gate.privateProof.evidence) {
      lines.push(`- ${item}`);
    }
  }

  if (gate.publicLaunch.blockers.length > 0) {
    lines.push("");
    lines.push("Public launch blockers:");
    for (const item of gate.publicLaunch.blockers) {
      lines.push(`- ${item}`);
    }
  }

  if (gate.factsNeeded.length > 0) {
    lines.push("");
    lines.push("Facts needed before live proof:");
    for (const fact of gate.factsNeeded) {
      const sensitivity = fact.sensitive ? " (sensitive; keep local)" : "";
      lines.push(`- ${fact.label}: provide ${fact.provideAs}${sensitivity}`);
    }
  }

  if (gate.productReadiness.publicLaunchNeeds.length > 0) {
    lines.push("");
    lines.push("Product readiness needs:");
    for (const need of gate.productReadiness.publicLaunchNeeds) {
      lines.push(`- ${need}`);
    }
  }

  lines.push("");
  lines.push("Commercial readiness:");
  lines.push(`- ${gate.commercialReadiness.status}: ${gate.commercialReadiness.headline}`);
  lines.push(`- ${gate.commercialReadiness.summary}`);
  lines.push(`- Sell private beta: ${gate.commercialReadiness.canSellPrivateBeta ? "yes" : "no"}`);
  lines.push(`- Operate paid users: ${gate.commercialReadiness.canOperatePaidUsers ? "yes" : "no"}`);
  if (gate.commercialReadiness.cannotClaimPublicLaunchUntil.length > 0) {
    lines.push("- Cannot claim public launch until:");
    for (const gap of gate.commercialReadiness.cannotClaimPublicLaunchUntil) {
      lines.push(`  - ${gap}`);
    }
  }
  for (const item of gate.commercialReadiness.items) {
    lines.push(`- ${item.label}: ${item.status}. ${item.remainingGap}`);
  }

  lines.push("");
  lines.push("Operator handoff:");
  lines.push(`- status: ${gate.operatorHandoff.status}`);
  if (gate.operatorHandoff.captureCommand) {
    lines.push(`- Capture approved facts locally: ${gate.operatorHandoff.captureCommand}`);
  } else {
    lines.push("- Capture approved facts locally: no non-secret owner facts missing.");
  }
  if (gate.operatorHandoff.handoffReceiptCommand) {
    if (gate.operatorHandoff.handoffReceiptPreviewCommand) {
      lines.push(`- Preview the product handoff receipt without writing: ${gate.operatorHandoff.handoffReceiptPreviewCommand}`);
    }
    lines.push(`- If preview passes, import the product handoff receipt: ${gate.operatorHandoff.handoffReceiptCommand}`);
  }
  lines.push(`- No-send check: ${gate.operatorHandoff.checkCommand}`);
  if (gate.operatorHandoff.guardedLiveCommands.length > 0) {
    lines.push("- Guarded live proof:");
    for (const command of gate.operatorHandoff.guardedLiveCommands) {
      lines.push(`  - ${command}`);
    }
  }

  lines.push("");
  lines.push("Benchmark comparison:");
  lines.push(`- ${gate.productComparison.verdict}`);
  for (const item of gate.productComparison.items) {
    lines.push(`- ${item.benchmark}: ${item.status}. ${item.summary}`);
    if (item.remainingGap) {
      lines.push(`  Remaining gap: ${item.remainingGap}`);
    }
  }

  lines.push("");
  lines.push("Next action:");
  lines.push(`- ${gate.productReadiness.nextAction.label}: ${gate.productReadiness.nextAction.reason}`);
  if (gate.factsNeeded.length > 0) {
    lines.push("- Do not run live provider proof until those facts are present and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 is set.");
  } else if (gate.nextAction.command) {
    lines.push(`- Run: ${gate.nextAction.command}`);
  }

  lines.push("");
  lines.push("Underlying goal audit (debug detail):");
  lines.push(...formatDearMeGoalAudit(gate.audit));

  return lines;
}

export function parseDearMeReleaseGateArgs(argv: readonly string[]): DearMeReleaseGateArgs {
  const args: DearMeReleaseGateArgs = {
    help: false,
    json: false,
    check: false,
    target: "public-launch",
    envFiles: [],
  };
  const normalizedArgv = argv.filter((arg) => arg !== "--");

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--target") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--target requires a value");
      args.target = parseTarget(next);
      index += 1;
    } else if (arg.startsWith("--target=")) {
      args.target = parseTarget(arg.slice("--target=".length));
    } else if (arg === "--env-file") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--env-file requires a value");
      args.envFiles.push(next);
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      const envFile = arg.slice("--env-file=".length);
      if (!envFile) throw new Error("--env-file requires a value");
      args.envFiles.push(envFile);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function parseTarget(value: string): DearMeReleaseGateTarget {
  if (value === "private-proof" || value === "public-launch") return value;
  throw new Error("--target must be private-proof or public-launch");
}

function printHelp() {
  console.log(`Usage: pnpm dearme:release-gate -- [--check] [--json] [--target private-proof|public-launch] [--env-file <path>]

Answers the product question "can people use it?" separately from the release
question "can we publish it?". The private-proof target can pass without live
sends or spend. The public-launch target is the default and only passes when the
full DearMe goal audit is complete.`);
}

async function main() {
  try {
    const parsed = parseDearMeReleaseGateArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const env = await loadDearMeProofEnv(parsed.envFiles, process.env);
    const gate = summarizeDearMeReleaseGate(
      await buildDearMeGoalAudit(parsed.envFiles, process.env),
      inspectDearMeProviderSmokeReadiness(env, "all"),
      env,
    );
    if (parsed.json) {
      console.log(JSON.stringify({ gate }, null, 2));
    } else {
      for (const line of formatDearMeReleaseGate(gate)) {
        console.log(line);
      }
    }

    const targetDecision = parsed.target === "private-proof"
      ? gate.privateProof
      : gate.publicLaunch;
    if (parsed.check && !targetDecision.ready) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entrypoint) {
  void main();
}
