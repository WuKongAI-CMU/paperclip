import assert from "node:assert/strict";
import test from "node:test";
import {
  createDearMeAhaProofSample,
  formatDearMeAhaProofReport,
  inspectDearMeAhaProofPreview,
  parseDearMeAhaProofArgs,
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
  assert.match(formatted, /pnpm --silent dearme:aha-proof -- --check/);
  assert.doesNotMatch(formatted, /OPENCLAW_GATEWAY_TOKEN/);
  assert.doesNotMatch(formatted, /DEARME_LINKEDIN_DM_CREDENTIAL_JSON/);
});

test("DearMe aha proof parses CLI flags", () => {
  assert.deepEqual(parseDearMeAhaProofArgs(["--"]).check, false);
  assert.equal(parseDearMeAhaProofArgs(["--check"]).check, true);
  assert.equal(parseDearMeAhaProofArgs(["--status"]).check, true);
  assert.equal(parseDearMeAhaProofArgs(["--json"]).json, true);
  assert.equal(parseDearMeAhaProofArgs(["--print-sample"]).printSample, true);
  assert.equal(parseDearMeAhaProofArgs(["--help"]).help, true);
  assert.throws(() => parseDearMeAhaProofArgs(["--bad"]), /unknown argument/);
});
