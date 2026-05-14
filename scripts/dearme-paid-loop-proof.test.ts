import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMePaidLoopProof,
  parseDearMePaidLoopProofArgs,
  runDearMePaidLoopProof,
} from "./dearme-paid-loop-proof.ts";

test("DearMe paid loop proof shows receipt-backed access unlocks first-cycle work", () => {
  const proof = runDearMePaidLoopProof();
  const formatted = formatDearMePaidLoopProof(proof).join("\n");

  assert.equal(proof.status, "ready");
  assert.equal(proof.beforePayment.accessStatus, "trial");
  assert.equal(proof.beforePayment.canStartBrandTeam, false);
  assert.match(proof.beforePayment.firstCycleBlocker ?? "", /Add a paid beta credit purchase/);
  assert.equal(proof.afterPayment.accessStatus, "active");
  assert.equal(proof.afterPayment.netPaidCents, 25_000);
  assert.equal(proof.afterPayment.remainingCreditCents, 25_000);
  assert.equal(proof.afterPayment.latestExternalInvoiceId, "manual-smoke-paid-loop");
  assert.equal(proof.afterPayment.firstCycleBlocker, null);
  assert.equal(proof.afterPayment.canStartBrandTeam, true);
  assert.deepEqual(
    proof.checks.map((check) => [check.key, check.ready]),
    [
      ["trial_blocks_first_cycle", true],
      ["receipt_activates_paid_access", true],
      ["paid_access_unblocks_first_cycle", true],
      ["receipt_reference_preserved", true],
    ],
  );
  assert.match(formatted, /Before payment: trial/);
  assert.match(formatted, /After payment: active/);
  assert.match(formatted, /first cycle unblocked/);
  assert.match(formatted, /does not charge cards, call payment APIs, send messages/);
});

test("DearMe paid loop proof accepts explicit receipt details", () => {
  const proof = runDearMePaidLoopProof({
    companyId: "company-paid",
    amountCents: 50_000,
    currency: "usd",
    externalInvoiceId: "manual-paid-500",
    occurredAt: "2026-05-14T18:30:00.000Z",
  });

  assert.equal(proof.companyId, "company-paid");
  assert.equal(proof.receipt.amountCents, 50_000);
  assert.equal(proof.receipt.currency, "USD");
  assert.equal(proof.receipt.externalInvoiceId, "manual-paid-500");
  assert.equal(proof.afterPayment.netPaidCents, 50_000);
  assert.equal(proof.afterPayment.latestExternalInvoiceId, "manual-paid-500");
  assert.equal(proof.status, "ready");
});

test("DearMe paid loop proof parser validates command options", () => {
  assert.deepEqual(
    parseDearMePaidLoopProofArgs([
      "--json",
      "--check",
      "--company-id",
      "company-paid",
      "--amount-cents=75000",
      "--currency",
      "usd",
      "--external-invoice-id",
      "manual-paid-750",
      "--occurred-at=2026-05-14T18:30:00.000Z",
    ]),
    {
      help: false,
      json: true,
      check: true,
      companyId: "company-paid",
      amountCents: 75_000,
      currency: "USD",
      externalInvoiceId: "manual-paid-750",
      occurredAt: "2026-05-14T18:30:00.000Z",
    },
  );
  assert.throws(
    () => parseDearMePaidLoopProofArgs(["--amount-cents", "0"]),
    /positive integer/,
  );
  assert.throws(
    () => parseDearMePaidLoopProofArgs(["--currency", "US"]),
    /three-letter code/,
  );
});
