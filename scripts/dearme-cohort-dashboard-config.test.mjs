#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL("../docs/dearme/ops/posthog-weekly-cohort-retention-dashboard.json", import.meta.url);

async function readDashboardConfig() {
  return JSON.parse(await readFile(dashboardPath, "utf8"));
}

test("DearMe weekly cohort retention dashboard config defines D1, D7, and D28 retention", async () => {
  const config = await readDashboardConfig();

  assert.equal(config.kind, "posthog-dashboard-config");
  assert.equal(config.name, "DearMe weekly cohort retention");
  assert.deepEqual(
    config.insights.map((insight) => insight.key),
    ["d1_retention", "d7_retention", "d28_retention"],
  );
  assert.deepEqual(
    config.insights.map((insight) => insight.query.source.totalIntervals),
    [2, 8, 29],
  );

  for (const insight of config.insights) {
    assert.equal(insight.query.kind, "InsightVizNode");
    assert.equal(insight.query.source.kind, "RetentionQuery");
    assert.equal(insight.query.source.targetEntity.event, "first_cycle_started");
    assert.equal(insight.query.source.returningEntity.event, "dearme_useful_work_viewed");
    assert.equal(insight.query.source.properties[0].key, "paid_beta_status");
    assert.equal(insight.query.source.properties[0].value, "active");
    assert.ok(insight.layout.sm.w > 0);
    assert.ok(insight.layout.xs.h > 0);
  }
});

test("DearMe weekly cohort retention dashboard config documents required event contracts", async () => {
  const config = await readDashboardConfig();
  const eventRoles = new Map(config.sourceEvents.map((event) => [event.role, event]));

  assert.equal(eventRoles.get("cohort_start")?.event, "first_cycle_started");
  assert.equal(eventRoles.get("return_signal")?.event, "dearme_useful_work_viewed");
  assert.equal(eventRoles.get("paid_filter")?.event, "dearme_first_payment");

  for (const sourceEvent of config.sourceEvents) {
    assert.ok(sourceEvent.requiredProperties.includes("company_id"));
    assert.ok(sourceEvent.requiredProperties.includes("user_id"));
  }
});

test("DearMe weekly cohort retention dashboard config is ops-safe", async () => {
  const configText = await readFile(dashboardPath, "utf8");

  assert.doesNotMatch(configText, /dm_sk_|re_[A-Za-z0-9_]+|sk_live_|whsec_|phc_/);
  assert.doesNotMatch(configText, /@aws-sdk\/client-bedrock/);
});
