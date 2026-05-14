import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMePaidOpsProof,
  parseDearMePaidOpsProofArgs,
  runDearMePaidOpsProof,
} from "./dearme-paid-ops-proof.ts";

test("DearMe paid operations proof verifies cohort routing and guardrails", () => {
  const proof = runDearMePaidOpsProof();
  const formatted = formatDearMePaidOpsProof(proof).join("\n");

  assert.equal(proof.status, "ready");
  assert.equal(proof.cohorts.empty.state, "empty");
  assert.equal(proof.cohorts.healthy.state, "operable");
  assert.equal(proof.cohorts.healthy.activeAccountCount, 2);
  assert.equal(proof.cohorts.healthy.decisionRequiredAccountCount, 0);
  assert.equal(proof.cohorts.attention.state, "attention");
  assert.equal(proof.cohorts.attention.hardStopAccountCount, 1);
  assert.equal(proof.cohorts.attention.warningAccountCount, 1);
  assert.equal(proof.cohorts.attention.trialAccountCount, 1);
  assert.deepEqual(
    proof.cohorts.attention.attentionAccounts.map((account) => [
      account.companyId,
      account.state,
      account.nextAction,
    ]),
    [
      ["dearme-ops-hard-stop", "hard_stop", "Review monthly spend"],
      ["dearme-ops-trial", "trial_preview", "Record paid beta access"],
      [
        "dearme-ops-warning",
        "warning",
        "Your team can keep preparing work, but expensive moves should stay visible before the next private cycle runs.",
      ],
    ],
  );
  assert.equal(proof.privateCycleBlockers.healthy, null);
  assert.match(proof.privateCycleBlockers.trial ?? "", /Add a paid beta credit purchase/);
  assert.match(proof.privateCycleBlockers.hardStop ?? "", /spending cycles should pause/);
  assert.deepEqual(
    proof.checks.map((check) => [check.key, check.ready]),
    [
      ["empty_cohort_not_live_operations", true],
      ["healthy_paid_accounts_operable", true],
      ["attention_accounts_prioritized", true],
      ["private_cycle_blockers_enforced", true],
      ["cohort_totals_preserve_paid_credit", true],
    ],
  );
  assert.match(formatted, /DearMe paid operations proof/);
  assert.match(formatted, /Healthy cohort: Cohort operable/);
  assert.match(formatted, /Attention cohort: Spend review needed/);
  assert.match(formatted, /dearme-ops-hard-stop: Review before more spend/);
  assert.match(formatted, /does not charge cards, call payment APIs, send messages/);
});

test("DearMe paid operations proof parser validates command options", () => {
  assert.deepEqual(parseDearMePaidOpsProofArgs(["--json", "--check"]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMePaidOpsProofArgs(["--", "--help"]), {
    help: true,
    json: false,
    check: false,
  });
  assert.throws(
    () => parseDearMePaidOpsProofArgs(["--company-id", "x"]),
    /unknown argument/,
  );
});
