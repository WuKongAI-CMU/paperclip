import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMePaidEventSourceProof,
  parseDearMePaidEventSourceProofArgs,
  runDearMePaidEventSourceProof,
} from "./dearme-paid-event-source-proof.ts";

test("DearMe paid event source proof maps paid receipts into retention analytics", () => {
  const proof = runDearMePaidEventSourceProof();
  const formatted = formatDearMePaidEventSourceProof(proof).join("\n");

  assert.equal(proof.status, "ready");
  assert.equal(proof.projection.paidAccountCount, 3);
  assert.equal(proof.projection.activeAccountCount, 3);
  assert.equal(proof.projection.measuredWeekCount, 9);
  assert.equal(proof.projection.visibleUsefulOutputCount, 29);
  assert.equal(proof.projection.feedbackLearningCount, 6);
  assert.equal(proof.projection.recoveryEventCount, 3);
  assert.equal(proof.projection.privateSupportHandoffCount, 2);
  assert.equal(proof.projection.launchDecisionEventCount, 6);
  assert.deepEqual(new Set(proof.projection.artifactCoverage), new Set([
    "content",
    "opportunity",
    "portfolio",
    "report",
    "voice_memory",
    "launch_decision",
  ]));
  assert.deepEqual(new Set(proof.projection.sourceCoverage), new Set([
    "finance_ledger",
    "workbench_run_ledger",
    "workbench_output",
    "voice_memory",
    "decision_queue",
    "support_recovery",
  ]));
  assert.deepEqual(
    proof.checks.map((item) => [item.key, item.ready]),
    [
      ["paid_access_comes_from_finance_ledger", true],
      ["weekly_value_events_cover_core_artifacts", true],
      ["feedback_and_recovery_are_event_sourced", true],
      ["launch_boundary_events_are_explicit", true],
      ["cohort_projection_reuses_paid_access_logic", true],
      ["event_contract_is_no_external_action", true],
    ],
  );
  assert.ok(proof.events.every((event) => event.noExternalAction));
  assert.match(formatted, /DearMe paid event source proof/);
  assert.match(formatted, /3 active paid accounts, 9 measured weeks, 29 weekly value events/);
  assert.match(formatted, /finance_ledger/);
  assert.match(formatted, /Launch boundary events are explicit: ready/);
  assert.match(formatted, /does not charge cards, call payment APIs, send messages/);
});

test("DearMe paid event source proof parser validates command options", () => {
  assert.deepEqual(parseDearMePaidEventSourceProofArgs(["--json", "--check"]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMePaidEventSourceProofArgs(["--", "--help"]), {
    help: true,
    json: false,
    check: false,
  });
  assert.throws(
    () => parseDearMePaidEventSourceProofArgs(["--source", "live"]),
    /unknown argument/,
  );
});
