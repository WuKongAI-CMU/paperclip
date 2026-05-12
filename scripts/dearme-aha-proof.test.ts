import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEARME_FIRST_CYCLE_STARTER_POST_COUNT } from "../packages/shared/src/validators/dearme.ts";
import {
  createDearMeAhaProofSample,
  exportDearMePrivateSitePreview,
  formatDearMeAhaProofReport,
  inspectDearMeAhaProofPreview,
  parseDearMeAhaProofArgs,
  renderDearMePrivateSitePreviewHtml,
  runDearMeAhaProof,
} from "./dearme-aha-proof.ts";

test("DearMe aha proof proves the first private five-minute loop", () => {
  const { report, preview } = runDearMeAhaProof();

  assert.equal(report.status, "ready");
  assert.deepEqual(report.checks.map((item) => item.key), [
    "one_sentence_start",
    "aha_bridge_contract",
    "five_minute_sequence",
    "live_work_receipts",
    "cycle_report_contract",
    "private_outputs",
    "recurring_private_work",
    "phone_ready_private_site",
    "minimum_team",
    "approval_boundaries",
    "public_launch_proof_needs",
    "customer_language",
  ]);
  assert.equal(report.checks.every((item) => item.ready), true);
  assert.deepEqual(preview.proofSequence.map((step) => step.window), [
    "0-30s",
    "60-120s",
    "3-5min",
  ]);
  assert.deepEqual(preview.proofSequence.map((step) => step.preparedArtifact), [
    "Voice profile and known-for line",
    "Audience shortlist and first opportunity",
    "Private proof page move",
  ]);
  assert.deepEqual(preview.liveWorkTrail.map((item) => item.action), [
    "Studying your voice",
    "Finding likely audiences",
    "Drafting first moves",
    "Preparing your private proof",
    "Ready for your launch call",
  ]);
  assert.deepEqual(preview.liveWorkTrail.map((item) => item.ownerRole), [
    "voice_editor",
    "opportunity_scout",
    "content_producer",
    "portfolio_builder",
    "chief_of_staff",
  ]);
  assert.deepEqual(preview.liveWorkTrail.map((item) => item.status), [
    "ready",
    "ready",
    "ready",
    "ready",
    "your_call",
  ]);
  assert.equal(preview.cycleReport.title, "First-cycle report");
  assert.deepEqual(preview.cycleReport.items.map((item) => item.label), [
    "What moved while you were away",
    "Ready for your launch call",
    "Prepared but blocked",
    "Next private cycle",
  ]);
  assert.deepEqual(preview.cycleReport.items.map((item) => item.status), ["moved", "ready", "blocked", "next"]);
  assert.deepEqual(preview.cycleReport.items.map((item) => item.source), [
    "Live work receipts",
    "Private proof pack",
    "Launch boundary",
    "Next private pass",
  ]);
  assert.equal(preview.starterPosts.length, DEARME_FIRST_CYCLE_STARTER_POST_COUNT);
  assert.equal(preview.opportunityShortlist.length, 5);
  assert.equal(preview.sitePreview.status, "private_preview");
  assert.equal(preview.continuationPlan.title, "Keeps working after the first proof");
  assert.equal(preview.continuationPlan.nextReview, "Next private review");
  assert.equal(preview.continuationPlan.items.length, 3);
  assert.deepEqual(preview.continuationPlan.items.map((item) => item.preparedArtifact), [
    "Next proof-backed draft",
    "Updated opportunity angle",
    "Updated private proof card",
  ]);
  assert.deepEqual(preview.approvalBoundary.blockedActions, [
    "Post publicly",
    "Send outreach",
    "Update the public page",
    "Spend budget",
  ]);
});

test("DearMe aha proof sample starts from one positioning answer", () => {
  const sample = createDearMeAhaProofSample();

  assert.equal(sample.brand.displayName, "Peter");
  assert.equal(sample.brand.positioning, "Known for turning AI research into practical local products");
  assert.deepEqual(sample.brand.goals, ["Turn shipping proof into clear public content"]);
  assert.deepEqual(sample.brand.audiences, ["Founders evaluating local AI workflows"]);
  assert.equal(sample.brand.voiceSamples.length, 2);
});

test("DearMe aha proof blocks hidden customer language", () => {
  const { preview } = runDearMeAhaProof();
  const report = inspectDearMeAhaProofPreview({
    ...preview,
    growthPlan: {
      ...preview.growthPlan,
      summary: "OpenClaw provider setup is ready.",
    },
  });

  const languageCheck = report.checks.find((item) => item.key === "customer_language");
  assert.equal(report.status, "blocked");
  assert.equal(languageCheck?.ready, false);
  assert.deepEqual(languageCheck?.evidence, ["hiddenTerm=OpenClaw"]);
});

test("DearMe aha proof output is operator-readable without leaking secrets", () => {
  const { report } = runDearMeAhaProof();
  const formatted = formatDearMeAhaProofReport(report).join("\n");

  assert.match(formatted, /DearMe aha proof/);
  assert.match(formatted, /Status: ready/);
  assert.match(formatted, /Aha bridge: ready/);
  assert.match(formatted, /Five-minute private wow sequence: ready/);
  assert.match(formatted, /Live work receipts: ready/);
  assert.match(formatted, /Cycle report contract: ready/);
  assert.match(formatted, /Recurring private work: ready/);
  assert.match(formatted, /Phone-ready private site artifact: ready/);
  assert.match(formatted, /Public launch proof needs: ready/);
  assert.match(formatted, /hostSmoke=host-smoke\.json/);
  assert.match(formatted, /pnpm --silent dearme:aha-proof -- --check/);
  assert.match(formatted, /pnpm --silent dearme:aha-proof -- --export-site dist\/dearme-private-proof/);
  assert.doesNotMatch(formatted, /OPENCLAW_GATEWAY_TOKEN/);
  assert.doesNotMatch(formatted, /DEARME_LINKEDIN_DM_CREDENTIAL_JSON/);
});

test("DearMe aha proof renders a static private site artifact without hidden terms", () => {
  const { report, preview } = runDearMeAhaProof();
  const html = renderDearMePrivateSitePreviewHtml(preview);
  const siteCheck = report.checks.find((item) => item.key === "phone_ready_private_site");

  assert.equal(siteCheck?.ready, true);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1" \/>/);
  assert.match(html, /DearMe private proof/);
  assert.match(html, /dearme\.app\/peter-studio/);
  assert.match(html, /Current proof, next pass, launch call/);
  assert.match(html, /3 private improvements are already lined up/);
  assert.match(html, /Your one sentence became a private proof system/);
  assert.match(html, /Private proof is ready\. Public launch waits for three live receipts/);
  assert.match(html, /Professional-network delivery route/);
  assert.match(html, /Approved professional-network recipient/);
  assert.match(html, /Approved phone-message proof recipient/);
  assert.match(html, /DearMe checks this in no-send mode/);
  assert.match(html, /You answered/);
  assert.match(html, /It prepared/);
  assert.match(html, /5 drafts and 5 leads/);
  assert.match(html, /Still waits/);
  assert.match(html, /From one sentence to private proof/);
  assert.match(html, /Live work receipts/);
  assert.match(html, /Studying your voice/);
  assert.match(html, /Voice Editor/);
  assert.match(html, /Ready for your launch call/);
  assert.match(html, /First-cycle report/);
  assert.match(html, /What moved while you were away/);
  assert.match(html, /Prepared but blocked/);
  assert.match(html, /DearMe keeps working privately/);
  assert.match(html, /Keeps working after the first proof/);
  assert.match(html, /What Peter wants to become known for/);
  assert.match(html, /The positioning to test this week/);
  assert.match(html, /Direct customer lead/);
  assert.match(html, /Outreach waits for approval/);
  assert.match(html, /Nothing is sent, published, deployed, or spent until approved/);
  assert.equal((html.match(/aria-label="Launch boundary"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /undefined/);
  assert.doesNotMatch(html, /<p><\/p>/);
  assert.doesNotMatch(html, /<h3><\/h3>/);
  assert.doesNotMatch(html, /OpenClaw|Paperclip|Symphony|provider|credential|token|workbench/i);
});

test("DearMe aha proof exports private site HTML, proof JSON, and host smoke manifest", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-aha-proof-site-"));
  const { preview } = runDearMeAhaProof();

  try {
    const result = await exportDearMePrivateSitePreview(preview, dir);
    const html = await readFile(result.htmlPath, "utf8");
    const proof = JSON.parse(await readFile(result.jsonPath, "utf8")) as unknown;
    const manifest = JSON.parse(await readFile(result.hostSmokePath, "utf8")) as {
      version: number;
      handle: string;
      route: string;
      files: { html: string; proof: string };
      expectedText: string;
      checks: {
        viewport: boolean;
        customerSafeLanguage: boolean;
        starterDraftCount: number;
        opportunityCount: number;
        liveWorkTrailCount: number;
        liveWorkTrail: {
          actions: string[];
          ownerRoles: string[];
          statuses: string[];
          artifacts: string[];
        };
        cycleReportCount: number;
        cycleReport: {
          title: string;
          labels: string[];
          ownerRoles: string[];
          statuses: string[];
          sources: string[];
        };
        continuationCount: number;
        continuation: {
          title: string;
          nextReview: string;
          preparedArtifacts: string[];
          ownerRoles: string[];
          approvalBoundaries: string[];
        };
        launchProofNeedCount: number;
        launchProofNeeds: {
          labels: string[];
          summaries: string[];
          boundaries: string[];
        };
      };
      checksums: { htmlSha256: string; proofSha256: string };
    };

    assert.equal(result.handle, "peter-studio");
    assert.equal(result.route, "dearme.app/peter-studio");
    assert.equal(result.htmlPath, join(dir, "peter-studio", "index.html"));
    assert.equal(result.jsonPath, join(dir, "peter-studio", "proof.json"));
    assert.equal(result.hostSmokePath, join(dir, "peter-studio", "host-smoke.json"));
    assert.equal(result.expectedText, "Peter Studio has a private growth team already working");
    assert.equal(result.htmlBytes, Buffer.byteLength(html, "utf8"));
    assert.match(result.htmlSha256, /^[a-f0-9]{64}$/);
    assert.match(html, /Next private review/);
    assert.match(html, /Updated private proof card/);
    assert.deepEqual(proof, preview);
    assert.deepEqual(manifest.files, { html: "index.html", proof: "proof.json" });
    assert.equal(manifest.version, 1);
    assert.equal(manifest.handle, "peter-studio");
    assert.equal(manifest.route, "dearme.app/peter-studio");
    assert.equal(manifest.expectedText, result.expectedText);
    assert.equal(manifest.checks.viewport, true);
    assert.equal(manifest.checks.customerSafeLanguage, true);
    assert.equal(manifest.checks.starterDraftCount, DEARME_FIRST_CYCLE_STARTER_POST_COUNT);
    assert.equal(manifest.checks.opportunityCount, 5);
    assert.equal(manifest.checks.liveWorkTrailCount, 5);
    assert.deepEqual(manifest.checks.liveWorkTrail, {
      actions: [
        "Studying your voice",
        "Finding likely audiences",
        "Drafting first moves",
        "Preparing your private proof",
        "Ready for your launch call",
      ],
      ownerRoles: [
        "voice_editor",
        "opportunity_scout",
        "content_producer",
        "portfolio_builder",
        "chief_of_staff",
      ],
      statuses: ["ready", "ready", "ready", "ready", "your_call"],
      artifacts: [
        "Voice profile and known-for line",
        "Audience shortlist and first opportunity",
        "5 starter drafts",
        "Private proof page move",
        "Launch boundary",
      ],
    });
    assert.equal(manifest.checks.cycleReportCount, 4);
    assert.deepEqual(manifest.checks.cycleReport, {
      title: "First-cycle report",
      labels: [
        "What moved while you were away",
        "Ready for your launch call",
        "Prepared but blocked",
        "Next private cycle",
      ],
      ownerRoles: ["chief_of_staff", "chief_of_staff", "voice_editor", "portfolio_builder"],
      statuses: ["moved", "ready", "blocked", "next"],
      sources: [
        "Live work receipts",
        "Private proof pack",
        "Launch boundary",
        "Next private pass",
      ],
    });
    assert.equal(manifest.checks.continuationCount, 3);
    assert.deepEqual(manifest.checks.continuation, {
      title: "Keeps working after the first proof",
      nextReview: "Next private review",
      preparedArtifacts: [
        "Next proof-backed draft",
        "Updated opportunity angle",
        "Updated private proof card",
      ],
      ownerRoles: ["content_producer", "opportunity_scout", "portfolio_builder"],
      approvalBoundaries: [
        "The draft can improve privately; posting waits for approval.",
        "The outreach can be prepared privately; sending waits for approval.",
        "The page can be staged privately; public changes wait for approval.",
      ],
    });
    assert.equal(manifest.checks.launchProofNeedCount, 3);
    assert.deepEqual(manifest.checks.launchProofNeeds.labels, [
      "Professional-network delivery route",
      "Approved professional-network recipient",
      "Approved phone-message proof recipient",
    ]);
    assert.deepEqual(manifest.checks.launchProofNeeds.boundaries, [
      "DearMe checks this in no-send mode before any live receipt can move.",
      "Only this selected recipient is used for the first guarded receipt.",
      "The receipt still waits for owner approval after the no-send check.",
    ]);
    assert.match(manifest.checksums.htmlSha256, /^[a-f0-9]{64}$/);
    assert.match(manifest.checksums.proofSha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe aha proof parses CLI flags", () => {
  assert.deepEqual(parseDearMeAhaProofArgs(["--"]).check, false);
  assert.equal(parseDearMeAhaProofArgs(["--check"]).check, true);
  assert.equal(parseDearMeAhaProofArgs(["--status"]).check, true);
  assert.equal(parseDearMeAhaProofArgs(["--json"]).json, true);
  assert.equal(parseDearMeAhaProofArgs(["--print-sample"]).printSample, true);
  assert.equal(parseDearMeAhaProofArgs(["--export-site", "dist/proof"]).exportSiteDir, "dist/proof");
  assert.equal(parseDearMeAhaProofArgs(["--export-site=dist/proof"]).exportSiteDir, "dist/proof");
  assert.equal(parseDearMeAhaProofArgs(["--help"]).help, true);
  assert.throws(() => parseDearMeAhaProofArgs(["--bad"]), /unknown argument/);
  assert.throws(() => parseDearMeAhaProofArgs(["--export-site"]), /requires a directory/);
});
