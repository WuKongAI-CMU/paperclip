import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMePaymentProviderContractProof,
  parseDearMePaymentProviderContractProofArgs,
  runDearMePaymentProviderContractProof,
} from "./dearme-payment-provider-contract-proof.ts";

test("DearMe payment provider contract proof maps Stripe-shaped checkout events", () => {
  const proof = runDearMePaymentProviderContractProof();
  const formatted = formatDearMePaymentProviderContractProof(proof).join("\n");

  assert.equal(proof.status, "ready");
  assert.equal(proof.provider, "stripe_payment_link");
  assert.equal(proof.acceptedProviderEvents.length, 2);
  assert.equal(proof.rejectedProviderEvents.length, 2);
  assert.equal(proof.projection.acceptedReceiptCount, 1);
  assert.equal(proof.projection.rejectedReceiptCount, 0);
  assert.equal(proof.projection.duplicateSuppressedCount, 1);
  assert.equal(proof.projection.activeAccountCount, 1);
  assert.deepEqual(
    proof.checks.map((item) => [item.key, item.ready]),
    [
      ["stripe_checkout_completed_maps_to_paid_receipt", true],
      ["unpaid_or_unmapped_checkout_does_not_unlock", true],
      ["checkout_session_idempotency_is_preserved", true],
      ["stripe_webhook_signature_guard_is_enforced", true],
      ["provider_contract_reuses_receipt_sync_projection", true],
      ["provider_contract_is_no_external_action", true],
    ],
  );
  assert.equal(proof.financeEvents.length, 1);
  assert.equal(proof.financeEvents[0]?.externalInvoiceId, "in_dearme_paid");
  assert.equal(JSON.stringify(proof).includes("whsec_"), false);
  assert.match(formatted, /DearMe payment provider contract proof/);
  assert.match(formatted, /Stripe checkout completed maps to paid receipt: ready/);
  assert.match(formatted, /Unpaid or unmapped checkout does not unlock: ready/);
  assert.match(formatted, /Stripe webhook signature guard is enforced: ready/);
  assert.match(formatted, /does not create checkout sessions, charge cards, call payment APIs/);
});

test("DearMe payment provider contract parser validates command options", () => {
  assert.deepEqual(parseDearMePaymentProviderContractProofArgs(["--json", "--check"]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMePaymentProviderContractProofArgs(["--", "--help"]), {
    help: true,
    json: false,
    check: false,
  });
  assert.throws(
    () => parseDearMePaymentProviderContractProofArgs(["--live"]),
    /unknown argument/,
  );
});
