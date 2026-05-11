import { fileURLToPath } from "node:url";
import {
  createDearMeFirstCyclePreview,
  dearMeFirstCyclePreviewSchema,
  DEARME_FIRST_CYCLE_CONCERN_GATES,
  DEARME_FIRST_CYCLE_PROOF_WINDOWS,
  type DearMeFirstCyclePreview,
  type DearMeFirstCyclePreviewResponse,
} from "../packages/shared/src/validators/dearme.ts";
import {
  DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN,
} from "../packages/shared/src/dearme-customer-text.ts";

export interface DearMeAhaProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  printSample: boolean;
}

export interface DearMeAhaProofCheck {
  key:
    | "one_sentence_start"
    | "five_minute_sequence"
    | "private_outputs"
    | "recurring_private_work"
    | "minimum_team"
    | "approval_boundaries"
    | "customer_language";
  label: string;
  ready: boolean;
  summary: string;
  evidence: string[];
}

export interface DearMeAhaProofReport {
  status: "ready" | "blocked";
  summary: string;
  sample: {
    companyId: string;
    handle: string;
    prompt: string;
    positioning: string;
  };
  checks: DearMeAhaProofCheck[];
  commands: {
    check: string;
    json: string;
    printSample: string;
  };
}

const DEFAULT_COMPANY_ID = "dearme-aha-proof";

function sameValues(actual: readonly string[], expected: readonly string[]) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function check(
  key: DearMeAhaProofCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
  evidence: string[],
): DearMeAhaProofCheck {
  return { key, label, ready, summary, evidence };
}

export function parseDearMeAhaProofArgs(argv: readonly string[]): DearMeAhaProofArgs {
  const args: DearMeAhaProofArgs = {
    help: false,
    json: false,
    check: false,
    printSample: false,
  };

  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  for (const arg of normalizedArgv) {
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check" || arg === "--status") {
      args.check = true;
    } else if (arg === "--print-sample") {
      args.printSample = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

export function createDearMeAhaProofSample(): DearMeFirstCyclePreview {
  return dearMeFirstCyclePreviewSchema.parse({
    handle: "Peter Studio",
    brand: {
      displayName: "Peter",
      positioning: "Known for turning AI research into practical local products",
      goals: ["Turn shipping proof into clear public content"],
      audiences: ["Founders evaluating local AI workflows"],
      proofPoints: ["Shipped an autonomous local product that customers can run"],
      offers: ["Paid beta for personal brand growth"],
      voiceSamples: [
        "Direct, specific, evidence-backed writing.",
        "Short notes with concrete next steps.",
      ],
      preferredChannels: ["linkedin", "portfolio", "x"],
      constraints: [
        "Keep the first pass private until publish, send, public-site change, or spend is approved.",
      ],
      cadence: "weekly",
      budgetMonthlyCents: 25_000,
      autoDraftEnabled: true,
    },
  });
}

export function inspectDearMeAhaProofPreview(
  preview: DearMeFirstCyclePreviewResponse,
): DearMeAhaProofReport {
  const windows = preview.proofSequence.map((step) => step.window);
  const preparedArtifacts = preview.proofSequence.map((step) => step.preparedArtifact);
  const ownerRoles = new Set<string>([
    preview.growthPlan.ownerRole,
    preview.voiceProfile.ownerRole,
    preview.portfolioProofCard.ownerRole,
    ...preview.starterPosts.map((post) => post.ownerRole),
    ...preview.opportunityShortlist.map((lead) => lead.ownerRole),
    ...preview.autonomyPlan.autonomousSteps.map((step) => step.ownerRole),
  ]);
  const serializedPreview = JSON.stringify(preview);
  const hiddenMatch = DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.exec(serializedPreview);
  const outputCount =
    1 +
    preview.starterPosts.length +
    preview.opportunityShortlist.length +
    1 +
    1 +
    1 +
    preview.continuationPlan.items.length;
  const checks: DearMeAhaProofCheck[] = [
    check(
      "one_sentence_start",
      "One-sentence start",
      preview.prompt === "What do you want to become known for?" && preview.positioning.length > 0,
      "A single positioning answer creates the first private growth cycle.",
      [
        `prompt=${preview.prompt}`,
        `positioning=${preview.positioning}`,
      ],
    ),
    check(
      "five_minute_sequence",
      "Five-minute private wow sequence",
      sameValues(windows, DEARME_FIRST_CYCLE_PROOF_WINDOWS),
      "The preview keeps the Polsia-style 0-30s, 60-120s, and 3-5min rhythm as a shared contract.",
      [
        `windows=${windows.join(",")}`,
        `preparedArtifacts=${preparedArtifacts.join(" | ")}`,
      ],
    ),
    check(
      "private_outputs",
      "Private output package",
      preview.voiceProfile.status === "ready_for_gate" &&
        preview.starterPosts.length === 3 &&
        preview.opportunityShortlist.length === 5 &&
        preview.sitePreview.status === "private_preview" &&
        preview.growthPlan.nextActions.length >= 3,
      "The local sample produces enough private work to feel alive without sending or deploying.",
      [
        `outputs=${outputCount}`,
        `starterPosts=${preview.starterPosts.length}`,
        `opportunities=${preview.opportunityShortlist.length}`,
        `siteStatus=${preview.sitePreview.status}`,
      ],
    ),
    check(
      "recurring_private_work",
      "Recurring private work",
      preview.continuationPlan.items.length === 3 &&
        preview.continuationPlan.items.some((item) => item.ownerRole === "content_producer") &&
        preview.continuationPlan.items.some((item) => item.ownerRole === "opportunity_scout") &&
        preview.continuationPlan.items.some((item) => item.ownerRole === "portfolio_builder"),
      "The first proof pack shows what DearMe keeps improving next instead of ending at a static demo.",
      [
        `cadence=${preview.continuationPlan.cadence}`,
        `nextReview=${preview.continuationPlan.nextReview}`,
        `nextArtifacts=${preview.continuationPlan.items.map((item) => item.preparedArtifact).join(" | ")}`,
      ],
    ),
    check(
      "minimum_team",
      "Minimum runnable team",
      ["chief_of_staff", "content_producer", "opportunity_scout"].every((role) => ownerRoles.has(role)),
      "The first wow loop depends on the smallest real team instead of claiming every planned role is required.",
      [`ownerRoles=${Array.from(ownerRoles).sort().join(",")}`],
    ),
    check(
      "approval_boundaries",
      "Launch boundaries only",
      sameValues(preview.autonomyPlan.waitsFor, DEARME_FIRST_CYCLE_CONCERN_GATES) &&
        sameValues(preview.approvalBoundary.blockedActions, [
          "Post publicly",
          "Send outreach",
          "Update the public page",
          "Spend budget",
        ]),
      "Private work continues automatically while public or costly actions wait for approval.",
      [
        `waitsFor=${preview.autonomyPlan.waitsFor.join(",")}`,
        `blockedActions=${preview.approvalBoundary.blockedActions.join(" | ")}`,
      ],
    ),
    check(
      "customer_language",
      "Customer-safe language",
      hiddenMatch === null,
      "The generated customer-visible preview does not leak backstage substrate terms.",
      hiddenMatch ? [`hiddenTerm=${hiddenMatch[0]}`] : ["hiddenTerm=none"],
    ),
  ];

  const ready = checks.every((item) => item.ready);
  return {
    status: ready ? "ready" : "blocked",
    summary: ready
      ? "Local private five-minute aha proof is ready without sends, public deploys, spend, or live model calls."
      : "Local private five-minute aha proof is blocked; inspect failed checks before claiming Polsia-level first wow.",
    sample: {
      companyId: preview.companyId,
      handle: preview.sitePreview.handle,
      prompt: preview.prompt,
      positioning: preview.positioning,
    },
    checks,
    commands: {
      check: "pnpm --silent dearme:aha-proof -- --check",
      json: "pnpm --silent dearme:aha-proof -- --json",
      printSample: "pnpm --silent dearme:aha-proof -- --print-sample",
    },
  };
}

export function runDearMeAhaProof(
  sample: DearMeFirstCyclePreview = createDearMeAhaProofSample(),
  companyId = DEFAULT_COMPANY_ID,
): { report: DearMeAhaProofReport; preview: DearMeFirstCyclePreviewResponse } {
  const preview = createDearMeFirstCyclePreview(companyId, sample);
  return {
    preview,
    report: inspectDearMeAhaProofPreview(preview),
  };
}

export function formatDearMeAhaProofReport(report: DearMeAhaProofReport): string[] {
  const lines = [
    "DearMe aha proof",
    `Status: ${report.status}`,
    report.summary,
    "",
    "Checks:",
  ];
  for (const item of report.checks) {
    lines.push(`- ${item.label}: ${item.ready ? "ready" : "blocked"}. ${item.summary}`);
    for (const evidence of item.evidence) {
      lines.push(`  ${evidence}`);
    }
  }

  lines.push("");
  lines.push("Commands:");
  lines.push(`- ${report.commands.check}`);
  lines.push(`- ${report.commands.json}`);
  lines.push(`- ${report.commands.printSample}`);
  return lines;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:aha-proof -- [--check] [--json] [--print-sample]

Proves the local, private first-five-minute DearMe wow loop from the existing
first-cycle preview contract. This proof does not send, publish, deploy to
production, spend, or call a live model. Default action is --check.`);
}

async function main() {
  try {
    const parsed = parseDearMeAhaProofArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const { report, preview } = runDearMeAhaProof();
    if (parsed.json) {
      console.log(JSON.stringify(parsed.printSample ? { report, preview } : { report }, null, 2));
    } else if (parsed.printSample) {
      console.log(JSON.stringify(preview, null, 2));
    } else {
      for (const line of formatDearMeAhaProofReport(report)) {
        console.log(line);
      }
    }

    if (report.status !== "ready") {
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
