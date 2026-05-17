#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const funnelPath = new URL("../docs/dearme/ops/posthog-funnel.json", import.meta.url);

const expectedFunnelEvents = [
  "landing_viewed",
  "landing_cta_submitted",
  "signup_started",
  "signup_completed",
  "first_cycle_started",
  "first_cycle_completed",
  "pricing_viewed",
  "checkout_started",
  "checkout_completed",
];

async function readFunnelConfig() {
  return JSON.parse(await readFile(funnelPath, "utf8"));
}

test("DearMe PostHog funnel config defines the activation-to-payment event order", async () => {
  const config = await readFunnelConfig();

  assert.equal(config.kind, "posthog-dashboard-config");
  assert.equal(config.name, "DearMe activation-to-payment funnel");
  assert.deepEqual(
    config.funnel.steps.map((step) => step.event),
    expectedFunnelEvents,
  );
  assert.deepEqual(
    config.funnel.steps.map((step) => step.order),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(config.funnel.target.overallConversion, ">=2.0%");
  assert.equal(config.funnel.target.minimumVisitorsBeforeReadout, 200);
});

test("DearMe PostHog funnel config bakes in per-step conversion targets", async () => {
  const config = await readFunnelConfig();
  const targets = new Map(config.funnel.steps.map((step) => [step.event, step.targetFromPrevious]));

  assert.equal(targets.get("landing_viewed"), "100%");
  assert.equal(targets.get("landing_cta_submitted"), ">=18%");
  assert.equal(targets.get("signup_started"), ">=75%");
  assert.equal(targets.get("signup_completed"), ">=80%");
  assert.equal(targets.get("first_cycle_started"), ">=70%");
  assert.equal(targets.get("first_cycle_completed"), ">=60%");
  assert.equal(targets.get("pricing_viewed"), ">=55%");
  assert.equal(targets.get("checkout_started"), ">=45%");
  assert.equal(targets.get("checkout_completed"), ">=70%");

  for (const step of config.funnel.steps) {
    assert.ok(step.requiredProperties.length > 0, `${step.event} must document its event contract`);
  }
});

test("DearMe PostHog funnel config has importable dashboard insights", async () => {
  const config = await readFunnelConfig();
  const primaryInsight = config.insights.find((insight) => insight.key === "activation_to_payment_funnel");

  assert.ok(primaryInsight);
  assert.equal(primaryInsight.query.kind, "InsightVizNode");
  assert.equal(primaryInsight.query.source.kind, "FunnelsQuery");
  assert.deepEqual(
    primaryInsight.query.source.series.map((series) => series.event),
    expectedFunnelEvents,
  );

  for (const insight of config.insights) {
    assert.ok(insight.layout.sm.w > 0);
    assert.ok(insight.layout.xs.h > 0);
  }
});

test("DearMe PostHog funnel config is ops-safe", async () => {
  const configText = await readFile(funnelPath, "utf8");

  assert.doesNotMatch(configText, /dm_sk_|re_[A-Za-z0-9_]+|sk_live_|whsec_|phc_/);
  assert.doesNotMatch(configText, /@aws-sdk\/client-bedrock/);
});
