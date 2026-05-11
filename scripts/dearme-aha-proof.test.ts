import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
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
    "five_minute_sequence",
    "private_outputs",
    "recurring_private_work",
    "phone_ready_private_site",
    "minimum_team",
    "approval_boundaries",
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
  assert.equal(preview.starterPosts.length, 3);
  assert.equal(preview.opportunityShortlist.length, 5);
  assert.equal(preview.sitePreview.status, "private_preview");
  assert.equal(preview.continuationPlan.title, "Keeps working after the first proof");
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
  assert.match(formatted, /Five-minute private wow sequence: ready/);
  assert.match(formatted, /Recurring private work: ready/);
  assert.match(formatted, /Phone-ready private site artifact: ready/);
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
  assert.match(html, /From one sentence to private proof/);
  assert.match(html, /Keeps working after the first proof/);
  assert.match(html, /Nothing is sent, published, deployed, or spent until approved/);
  assert.doesNotMatch(html, /OpenClaw|Paperclip|Symphony|provider|credential|token|workbench/i);
});

test("DearMe aha proof exports private site HTML and proof JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-aha-proof-site-"));
  const { preview } = runDearMeAhaProof();

  try {
    const result = await exportDearMePrivateSitePreview(preview, dir);
    const html = await readFile(result.htmlPath, "utf8");
    const proof = JSON.parse(await readFile(result.jsonPath, "utf8")) as unknown;

    assert.equal(result.handle, "peter-studio");
    assert.equal(result.route, "dearme.app/peter-studio");
    assert.equal(result.htmlPath, join(dir, "peter-studio", "index.html"));
    assert.equal(result.jsonPath, join(dir, "peter-studio", "proof.json"));
    assert.equal(result.htmlBytes, Buffer.byteLength(html, "utf8"));
    assert.match(html, /Updated private proof card/);
    assert.deepEqual(proof, preview);
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
