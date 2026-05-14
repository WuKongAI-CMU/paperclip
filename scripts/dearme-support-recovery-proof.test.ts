import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeSupportRecoveryProof,
  parseDearMeSupportRecoveryProofArgs,
  runDearMeSupportRecoveryProof,
} from "./dearme-support-recovery-proof.ts";

test("DearMe support recovery proof verifies paid-user recovery and support handoff", () => {
  const proof = runDearMeSupportRecoveryProof();
  const formatted = formatDearMeSupportRecoveryProof(proof).join("\n");

  assert.equal(proof.status, "ready");
  assert.equal(proof.paidOpsStatus, "ready");
  assert.equal(proof.receipt.emptyWeekRecovery.visibleUsefulOutputs, 0);
  assert.equal(proof.receipt.emptyWeekRecovery.action, "Start recovery");
  assert.equal(proof.receipt.emptyWeekRecovery.supportAction, "Open support handoff");
  assert.equal(proof.receipt.emptyWeekRecovery.recoveryWorkRoute, "/dearme?view=decisions&work=PET-22");
  assert.equal(proof.receipt.emptyWeekRecovery.voiceMemoryRoute, "/dearme?view=voice#dearme-voice-memory");
  assert.equal(proof.receipt.stuckWork.state, "retry_limit_reached");
  assert.equal(proof.receipt.stuckWork.route, "/dearme?view=decisions&work=PET-8");
  assert.equal(proof.receipt.supportHandoff.action, "Send to Chief of Staff");
  assert.match(proof.receipt.supportHandoff.followUp, /Same-day private make-good/);
  assert.match(proof.receipt.supportHandoff.followUp, /next customer check-in/);
  assert.deepEqual(
    proof.checks.map((check) => [check.key, check.ready]),
    [
      ["paid_account_operable", true],
      ["empty_week_routes_to_recovery", true],
      ["recovery_creates_private_make_good", true],
      ["stuck_work_routes_to_support", true],
      ["support_handoff_becomes_feedback_work", true],
      ["support_follow_up_is_explicit", true],
      ["launch_boundary_preserved", true],
      ["no_external_action", true],
    ],
  );
  assert.match(formatted, /DearMe support recovery proof/);
  assert.match(formatted, /Empty-week recovery: 0 useful outputs -> Start recovery/);
  assert.match(formatted, /Open support handoff/);
  assert.match(formatted, /one voice-matched content, opportunity, portfolio, or report item/);
  assert.match(formatted, /Open stuck work -> \/dearme\?view=decisions&work=PET-8/);
  assert.match(formatted, /Voice & Memory learning, recovery work/);
  assert.match(formatted, /Support follow-up: Same-day private make-good/);
  assert.match(formatted, /No public send, launch, spend, account change, or irreversible move/);
  assert.match(formatted, /does not send messages, publish, deploy, spend/);
});

test("DearMe support recovery proof parser validates command options", () => {
  assert.deepEqual(parseDearMeSupportRecoveryProofArgs(["--json", "--check"]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMeSupportRecoveryProofArgs(["--", "--help"]), {
    help: true,
    json: false,
    check: false,
  });
  assert.throws(
    () => parseDearMeSupportRecoveryProofArgs(["--company-id", "x"]),
    /unknown argument/,
  );
});
