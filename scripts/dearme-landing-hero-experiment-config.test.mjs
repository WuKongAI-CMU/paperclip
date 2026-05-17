import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const configPath = new URL("../docs/dearme/ops/posthog-landing-hero-experiment.json", import.meta.url);
const config = JSON.parse(readFileSync(configPath, "utf8"));

const EXPECTED_VARIANTS = ["control", "proof-first", "opportunity-first"];

test("defines the DearMe landing hero feature flag and three variants", () => {
  assert.equal(config.kind, "posthog-experiment-config");
  assert.equal(config.featureFlagKey, "dearme_landing_copy");
  assert.deepEqual(
    config.variants.map((variant) => variant.key),
    EXPECTED_VARIANTS,
  );
  assert.equal(config.variants.reduce((sum, variant) => sum + variant.trafficPercent, 0), 100);
});

test("captures the corrected hero experiment themes", () => {
  const byKey = new Map(config.variants.map((variant) => [variant.key, variant]));

  assert.equal(byKey.get("control")?.theme, "private_growth_team");
  assert.equal(byKey.get("proof-first")?.theme, "before_after");
  assert.match(byKey.get("proof-first")?.headline ?? "", /Before: scattered proof\. After:/);
  assert.equal(byKey.get("opportunity-first")?.theme, "weekly_letter_samples");
  assert.match(byKey.get("opportunity-first")?.headline ?? "", /weekly letter samples/);
});

test("requires 200 visitors per variant before auto-promoting a winner", () => {
  assert.equal(config.minimumVisitorsPerVariantBeforeWinner, 200);
  assert.equal(config.winnerSelection.mode, "auto_promote_when_clear");
  assert.match(config.winnerSelection.rule, /200 landing_viewed exposures/);
  assert.match(config.winnerSelection.rule, /landing_cta_submitted \/ landing_viewed/);
  assert.equal(config.winnerSelection.fallback, "keep_control");
});

test("keeps the landing event contract aligned with the UI", () => {
  assert.equal(config.exposureEvent, "landing_viewed");
  assert.equal(config.primaryMetric.event, "landing_cta_submitted");
  assert.deepEqual(config.requiredEventProperties.landing_viewed, [
    "landing_copy_variant",
    "landing_hero_theme",
  ]);
  assert.deepEqual(config.requiredEventProperties.landing_cta_submitted, [
    "landing_copy_variant",
    "landing_hero_theme",
    "positioning_length",
  ]);
});
