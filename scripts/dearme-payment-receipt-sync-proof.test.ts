import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMePaymentReceiptSyncProof,
  parseDearMePaymentReceiptSyncProofArgs,
  runDearMePaymentReceiptSyncProof,
} from "./dearme-payment-receipt-sync-proof.ts";

test("DearMe payment receipt sync proof projects hosted checkout receipts into paid access", () => {
  const proof = runDearMePaymentReceiptSyncProof();
  const formatted = formatDearMePaymentReceiptSyncProof(proof).join("\n");

  assert.equal(proof.status, "ready");
  assert.equal(proof.projection.acceptedReceiptCount, 3);
  assert.equal(proof.projection.rejectedReceiptCount, 2);
  assert.equal(proof.projection.duplicateSuppressedCount, 1);
  assert.equal(proof.projection.existingDuplicateSuppressedCount, 1);
  assert.equal(proof.projection.activatedStatus, "active");
  assert.equal(proof.projection.protectedStatus, "trial");
  assert.equal(proof.projection.refundedRemainingCreditCents, 15_000);
  assert.equal(proof.projection.activeAccountCount, 2);
  assert.deepEqual(
    proof.checks.map((item) => [item.key, item.ready]),
    [
      ["verified_paid_receipt_creates_credit", true],
      ["unverified_or_unpaid_receipts_do_not_unlock", true],
      ["duplicate_receipts_are_idempotent", true],
      ["ledger_replay_is_idempotent", true],
      ["refund_receipt_reduces_paid_credit", true],
      ["cohort_projection_uses_existing_paid_access_logic", true],
      ["receipt_sync_is_no_external_action", true],
    ],
  );
  assert.equal(proof.financeEvents.filter((event) => event.direction === "credit").length, 2);
  assert.equal(proof.financeEvents.filter((event) => event.direction === "debit").length, 1);
  assert.equal(JSON.stringify(proof).includes("whsec_"), false);
  assert.match(formatted, /DearMe payment receipt sync proof/);
  assert.match(formatted, /3 accepted receipts, 2 rejected receipts, 1 duplicate suppressed, 1 ledger replay suppressed/);
  assert.match(formatted, /Unverified or unpaid receipts do not unlock: ready/);
  assert.match(formatted, /does not create checkout sessions, charge cards, call payment APIs/);
});

test("DearMe payment receipt sync proof parser validates command options", () => {
  assert.deepEqual(parseDearMePaymentReceiptSyncProofArgs(["--json", "--check"]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMePaymentReceiptSyncProofArgs(["--", "--help"]), {
    help: true,
    json: false,
    check: false,
  });
  assert.throws(
    () => parseDearMePaymentReceiptSyncProofArgs(["--live"]),
    /unknown argument/,
  );
});
