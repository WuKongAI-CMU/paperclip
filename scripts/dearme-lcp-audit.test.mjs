import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateDearMeLcpAudit,
  formatDearMeLcpAuditSummary,
  parseDearMeLcpAuditArgs,
} from "./dearme-lcp-audit.mjs";

function lighthouseResult(overrides = {}) {
  return {
    finalDisplayedUrl: "http://127.0.0.1:4173/",
    audits: {
      "largest-contentful-paint": { numericValue: 1800 },
      "cumulative-layout-shift": { numericValue: 0.03 },
      "interaction-to-next-paint": { numericValue: 120 },
      ...overrides,
    },
  };
}

test("evaluates a passing landing performance report", () => {
  const report = evaluateDearMeLcpAudit(lighthouseResult());

  assert.equal(report.passed, true);
  assert.deepEqual(
    report.checks.map((check) => [check.id, check.passed]),
    [
      ["largest-contentful-paint", true],
      ["cumulative-layout-shift", true],
      ["interaction-to-next-paint", true],
    ],
  );
  assert.match(formatDearMeLcpAuditSummary(report), /^PASS DearMe landing performance:/);
});

test("fails when any target exceeds the configured threshold", () => {
  const report = evaluateDearMeLcpAudit(
    lighthouseResult({
      "largest-contentful-paint": { numericValue: 2601 },
      "cumulative-layout-shift": { numericValue: 0.02 },
      "interaction-to-next-paint": { numericValue: 90 },
    }),
  );

  assert.equal(report.passed, false);
  assert.equal(report.checks.find((check) => check.id === "largest-contentful-paint")?.passed, false);
  assert.match(formatDearMeLcpAuditSummary(report), /^FAIL DearMe landing performance:/);
});

test("fails when Lighthouse omits an expected metric", () => {
  const report = evaluateDearMeLcpAudit(
    lighthouseResult({
      "interaction-to-next-paint": { notApplicable: true },
    }),
  );

  assert.equal(report.passed, false);
  assert.equal(report.metrics.interactionToNextPaintMs, null);
  assert.match(formatDearMeLcpAuditSummary(report), /INP missing <= 200ms/);
});

test("accepts a scripted interaction metric when Lighthouse omits INP", () => {
  const report = evaluateDearMeLcpAudit(
    lighthouseResult({
      "interaction-to-next-paint": { notApplicable: true },
    }),
    undefined,
    72,
  );

  assert.equal(report.passed, true);
  assert.equal(report.metrics.interactionToNextPaintMs, 72);
});

test("parses CLI flags and environment overrides", () => {
  const config = parseDearMeLcpAuditArgs(
    ["--", "--url", "http://localhost:3000/", "--output", "tmp/lcp.json", "--lcp-ms", "2400", "--cls", "0.08", "--inp-ms", "180"],
    {
      DEARME_LCP_AUDIT_URL: "http://127.0.0.1:4173/",
      DEARME_LCP_AUDIT_OUTPUT: "dearme-lcp-audit.json",
    },
  );

  assert.equal(config.url, "http://localhost:3000/");
  assert.equal(config.outputPath, "tmp/lcp.json");
  assert.equal(config.startPreview, false);
  assert.deepEqual(config.thresholds, {
    largestContentfulPaintMs: 2400,
    cumulativeLayoutShift: 0.08,
    interactionToNextPaintMs: 180,
  });
});
