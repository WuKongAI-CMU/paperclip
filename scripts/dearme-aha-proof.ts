import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createDearMeFirstCyclePreview,
  dearMeFirstCyclePreviewSchema,
  DEARME_FIRST_CYCLE_CONCERN_GATES,
  DEARME_FIRST_CYCLE_PROOF_WINDOWS,
  DEARME_FIRST_CYCLE_STARTER_POST_COUNT,
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
  exportSiteDir: string | null;
}

export interface DearMeAhaProofCheck {
  key:
    | "one_sentence_start"
    | "five_minute_sequence"
    | "private_outputs"
    | "recurring_private_work"
    | "phone_ready_private_site"
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
    exportSite: string;
  };
}

const DEFAULT_COMPANY_ID = "dearme-aha-proof";
const DEFAULT_SITE_EXPORT_DIR = "dist/dearme-private-proof";

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
    exportSiteDir: null,
  };

  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check" || arg === "--status") {
      args.check = true;
    } else if (arg === "--print-sample") {
      args.printSample = true;
    } else if (arg === "--export-site") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--export-site requires a directory");
      args.exportSiteDir = next;
      index += 1;
    } else if (arg.startsWith("--export-site=")) {
      const value = arg.slice("--export-site=".length);
      if (!value) throw new Error("--export-site requires a directory");
      args.exportSiteDir = value;
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

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLines(items: readonly string[]) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderCard(title: string, body: string, details: readonly string[]) {
  return `<article class="card">
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(body)}</p>
    ${details.length > 0 ? `<ul>${renderLines(details)}</ul>` : ""}
  </article>`;
}

export function renderDearMePrivateSitePreviewHtml(preview: DearMeFirstCyclePreviewResponse): string {
  const displayName = preview.sitePreview.handle
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ") || "DearMe";
  const proofCards = preview.proofSequence.map((step) =>
    renderCard(step.title, step.summary, [
      `${step.window}: ${step.preparedArtifact}`,
      step.sourceLabel ? `From: ${step.sourceLabel}` : "",
      `Waits: ${step.approvalBoundary}`,
    ].filter(Boolean)),
  ).join("\n");
  const continuationCards = preview.continuationPlan.items.map((item) =>
    renderCard(item.title, item.summary, [
      `Prepared: ${item.preparedArtifact}`,
      `Waits: ${item.approvalBoundary}`,
    ]),
  ).join("\n");
  const starterPostCards = preview.starterPosts.map((post) =>
    renderCard(post.title, post.text, [
      `Voice check: ${post.voiceScore}`,
      `Proof: ${post.proofUsed}`,
      `Waits: ${post.approvalBoundary}`,
    ]),
  ).join("\n");
  const opportunityCards = preview.opportunityShortlist.slice(0, 3).map((lead) =>
    renderCard(lead.label, lead.whyRelevant, [
      `Angle: ${lead.outreachAngle}`,
      `Waits: ${lead.approvalBoundary}`,
    ]),
  ).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(displayName)} - DearMe private proof</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f5f0;
      color: #17201b;
    }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(1080px, calc(100vw - 32px)); margin: 0 auto; padding: 28px 0 44px; }
    .hero { display: grid; gap: 16px; padding: 28px 0 22px; border-bottom: 1px solid #d8d2c4; }
    .eyebrow { margin: 0; color: #59655c; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 760px; font-size: clamp(30px, 6vw, 56px); line-height: 1.02; letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 22px; letter-spacing: 0; }
    h3 { margin: 0; font-size: 16px; letter-spacing: 0; }
    p { line-height: 1.55; }
    .summary { max-width: 760px; margin: 0; color: #3d4941; font-size: 17px; }
    .route { display: inline-flex; width: fit-content; max-width: 100%; padding: 8px 10px; border: 1px solid #c9c1b3; border-radius: 8px; background: #fffaf0; color: #273128; font-size: 14px; overflow-wrap: anywhere; }
    section { padding: 24px 0 0; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .card { border: 1px solid #d8d2c4; border-radius: 8px; background: #fffdf8; padding: 14px; min-width: 0; }
    .card p { margin: 8px 0 0; color: #465148; font-size: 14px; }
    ul { margin: 12px 0 0; padding-left: 18px; color: #59655c; font-size: 13px; line-height: 1.5; }
    .boundary { background: #e9f3ef; border-color: #b8d2c5; }
    .footer { margin-top: 24px; color: #667067; font-size: 12px; }
    @media (max-width: 780px) {
      main { width: min(100vw - 24px, 680px); padding-top: 18px; }
      .grid { grid-template-columns: 1fr; }
      .hero { padding-top: 18px; }
    }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <p class="eyebrow">DearMe private proof</p>
      <h1>${escapeHtml(displayName)} has a private growth team already working.</h1>
      <p class="summary">${escapeHtml(preview.growthPlan.summary)}</p>
      <span class="route">${escapeHtml(preview.sitePreview.route)}</span>
    </header>

    <section aria-label="First proof trail">
      <h2>From one sentence to private proof</h2>
      <div class="grid">${proofCards}</div>
    </section>

    <section aria-label="Keeps working">
      <h2>${escapeHtml(preview.continuationPlan.title)}</h2>
      <p class="summary">${escapeHtml(preview.continuationPlan.summary)}</p>
      <div class="grid">${continuationCards}</div>
    </section>

    <section aria-label="Prepared drafts">
      <h2>Prepared drafts</h2>
      <div class="grid">${starterPostCards}</div>
    </section>

    <section aria-label="Opportunity shortlist">
      <h2>Opportunity shortlist</h2>
      <div class="grid">${opportunityCards}</div>
    </section>

    <section aria-label="Launch boundary">
      <article class="card boundary">
        <h2>${escapeHtml(preview.approvalBoundary.label)}</h2>
        <p>${escapeHtml(preview.approvalBoundary.summary)}</p>
        <ul>${renderLines(preview.approvalBoundary.blockedActions)}</ul>
      </article>
    </section>

    <p class="footer">Private preview artifact. Nothing is sent, published, deployed, or spent until approved.</p>
  </main>
</body>
</html>`;
}

export async function exportDearMePrivateSitePreview(
  preview: DearMeFirstCyclePreviewResponse,
  outputDir = DEFAULT_SITE_EXPORT_DIR,
) {
  const exportDir = join(outputDir, preview.sitePreview.handle);
  const htmlPath = join(exportDir, "index.html");
  const jsonPath = join(exportDir, "proof.json");
  const html = renderDearMePrivateSitePreviewHtml(preview);

  await mkdir(exportDir, { recursive: true });
  await writeFile(htmlPath, html, "utf8");
  await writeFile(jsonPath, JSON.stringify(preview, null, 2), "utf8");

  return {
    directory: exportDir,
    htmlPath,
    jsonPath,
    handle: preview.sitePreview.handle,
    route: preview.sitePreview.route,
    htmlBytes: Buffer.byteLength(html, "utf8"),
  };
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
  const staticHtml = renderDearMePrivateSitePreviewHtml(preview);
  const staticHtmlHiddenMatch = DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.exec(staticHtml);
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
        preview.starterPosts.length === DEARME_FIRST_CYCLE_STARTER_POST_COUNT &&
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
      "phone_ready_private_site",
      "Phone-ready private site artifact",
      staticHtml.includes('<meta name="viewport" content="width=device-width, initial-scale=1" />') &&
        staticHtml.includes(preview.sitePreview.route) &&
        staticHtml.includes(preview.continuationPlan.title) &&
        staticHtml.includes(preview.approvalBoundary.label) &&
        staticHtmlHiddenMatch === null,
      "The same proof contract can render as a static private site artifact before a real host deploy smoke.",
      [
        `route=${preview.sitePreview.route}`,
        `exportCommand=pnpm --silent dearme:aha-proof -- --export-site ${DEFAULT_SITE_EXPORT_DIR}`,
        `htmlBytes=${Buffer.byteLength(staticHtml, "utf8")}`,
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
      exportSite: `pnpm --silent dearme:aha-proof -- --export-site ${DEFAULT_SITE_EXPORT_DIR}`,
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
  lines.push(`- ${report.commands.exportSite}`);
  return lines;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:aha-proof -- [--check] [--json] [--print-sample] [--export-site <dir>]

Proves the local, private first-five-minute DearMe wow loop from the existing
first-cycle preview contract. This proof does not send, publish, deploy to
production, spend, or call a live model. Default action is --check. The
--export-site option writes a static private proof artifact for host smoke
preparation without making it public.`);
}

async function main() {
  try {
    const parsed = parseDearMeAhaProofArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const { report, preview } = runDearMeAhaProof();
    const exportResult = parsed.exportSiteDir
      ? await exportDearMePrivateSitePreview(preview, parsed.exportSiteDir)
      : null;
    if (parsed.json) {
      console.log(JSON.stringify(
        parsed.printSample ? { report, preview, exportResult } : { report, exportResult },
        null,
        2,
      ));
    } else if (parsed.printSample) {
      console.log(JSON.stringify(preview, null, 2));
    } else {
      for (const line of formatDearMeAhaProofReport(report)) {
        console.log(line);
      }
      if (exportResult) {
        console.log("");
        console.log("Static private site export:");
        console.log(`- html: ${exportResult.htmlPath}`);
        console.log(`- proof: ${exportResult.jsonPath}`);
        console.log(`- route: ${exportResult.route}`);
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
