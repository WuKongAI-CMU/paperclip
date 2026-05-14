import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeFeedbackLearningProof,
  inspectDearMeFeedbackLearningContract,
  parseDearMeFeedbackLearningProofArgs,
  runDearMeFeedbackLearningProof,
} from "./dearme-feedback-learning-proof.ts";

test("DearMe feedback learning contract can be inspected synchronously for commercial gates", () => {
  const contract = inspectDearMeFeedbackLearningContract();

  assert.equal(contract.status, "ready");
  assert.equal(contract.proofCommand, "pnpm --silent dearme:feedback-learning-proof -- --check");
  assert.deepEqual(
    contract.checks.map((check) => [check.key, check.ready]),
    [
      ["feedback_becomes_private_work", true],
      ["memory_route_available", true],
      ["launch_boundary_preserved", true],
      ["no_external_action", true],
    ],
  );
  assert.match(contract.receipt.activeBrief, /Voice & Memory learning/);
  assert.equal(contract.receipt.voiceMemoryRoute, "/dearme?view=voice#dearme-voice-memory");
  assert.match(contract.noExternalActionGuarantee, /does not send, deploy, spend/);
});

test("DearMe feedback learning proof verifies review feedback becomes next-cycle memory", async () => {
  const proof = await runDearMeFeedbackLearningProof();
  const formatted = formatDearMeFeedbackLearningProof(proof).join("\n");

  assert.equal(proof.status, "ready");
  assert.equal(proof.voiceReviewLoop.status, "passed");
  assert.equal(proof.voiceReviewLoop.driftBlocked, true);
  assert.equal(proof.voiceReviewLoop.rewriteSuggested, true);
  assert.equal(proof.voiceReviewLoop.rewritePassed, true);
  assert.equal(proof.voiceReviewLoop.reviewLoopProven, true);
  assert.deepEqual(
    proof.checks.map((check) => [check.key, check.ready]),
    [
      ["voice_review_loop_blocks_drift", true],
      ["safe_rewrite_accepted", true],
      ["feedback_becomes_private_work", true],
      ["memory_route_available", true],
      ["launch_boundary_preserved", true],
      ["no_external_action", true],
    ],
  );
  assert.match(formatted, /DearMe feedback learning proof/);
  assert.match(formatted, /Feedback becomes private work/);
  assert.match(formatted, /Voice & Memory learning, recovery work/);
  assert.match(formatted, /Open Voice & Memory/);
  assert.match(formatted, /Public posts, outbound messages, page changes, and spend wait/);
  assert.match(formatted, /does not send, deploy, spend, call a live model/);
});

test("DearMe feedback learning proof parser validates command options", () => {
  assert.deepEqual(parseDearMeFeedbackLearningProofArgs(["--json", "--check"]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMeFeedbackLearningProofArgs(["--", "--help"]), {
    help: true,
    json: false,
    check: false,
  });
  assert.throws(
    () => parseDearMeFeedbackLearningProofArgs(["--company-id", "x"]),
    /unknown argument/,
  );
});
