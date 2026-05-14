import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeCohortRetentionProof,
  parseDearMeCohortRetentionProofArgs,
  runDearMeCohortRetentionProof,
} from "./dearme-cohort-retention-proof.ts";

test("DearMe cohort retention proof verifies paid-user weekly value and renewal routing", () => {
  const proof = runDearMeCohortRetentionProof();
  const formatted = formatDearMeCohortRetentionProof(proof).join("\n");

  assert.equal(proof.status, "ready");
  assert.equal(proof.cohort.paidAccountCount, 3);
  assert.equal(proof.cohort.measuredWeekCount, 9);
  assert.equal(proof.cohort.visibleUsefulOutputCount, 29);
  assert.equal(proof.cohort.feedbackLearningCount, 6);
  assert.equal(proof.cohort.recoveryWeekCount, 3);
  assert.equal(proof.cohort.supportHandoffCount, 2);
  assert.deepEqual(proof.cohort.artifactCoverage, [
    "content",
    "opportunity",
    "portfolio",
    "report",
    "voice_memory",
    "launch_decision",
  ]);
  assert.deepEqual(
    proof.accounts.map((account) => [account.companyId, account.state, account.riskOwner]),
    [
      ["dearme-retention-founder", "renewal_ready", "autonomous_team"],
      ["dearme-retention-recovered", "recovered", "autonomous_team"],
      ["dearme-retention-support", "at_risk_support", "chief_of_staff"],
    ],
  );
  assert.deepEqual(
    proof.checks.map((item) => [item.key, item.ready]),
    [
      ["paid_cohort_has_measurable_weeks", true],
      ["weekly_value_covers_core_outputs", true],
      ["retention_risk_routes_to_recovery_or_support", true],
      ["feedback_becomes_next_cycle_learning", true],
      ["launch_boundary_preserved", true],
      ["paid_event_source_contract_ready", true],
      ["paid_ops_and_recovery_proofs_stay_green", true],
    ],
  );
  assert.match(formatted, /DearMe cohort retention proof/);
  assert.match(formatted, /Cohort retention analytics: 3 paid accounts, 9 measured weeks, 29 visible useful outputs/);
  assert.match(formatted, /Renewal states: 1 renewal-ready, 1 recovered, 1 at-risk with support owner/);
  assert.match(formatted, /dearme-retention-support: at_risk_support/);
  assert.match(formatted, /Feedback becomes next-cycle learning: ready/);
  assert.match(formatted, /Paid event source contract is ready: ready/);
  assert.match(formatted, /does not charge cards, call payment APIs, send messages/);
});

test("DearMe cohort retention proof parser validates command options", () => {
  assert.deepEqual(parseDearMeCohortRetentionProofArgs(["--json", "--check"]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMeCohortRetentionProofArgs(["--", "--help"]), {
    help: true,
    json: false,
    check: false,
  });
  assert.throws(
    () => parseDearMeCohortRetentionProofArgs(["--cohort-id", "x"]),
    /unknown argument/,
  );
});
