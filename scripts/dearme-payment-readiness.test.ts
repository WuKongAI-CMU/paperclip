import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  dearMePaymentReadinessEnvTemplate,
  formatDearMePaymentReadiness,
  formatDearMePaymentReadinessHumanHelp,
  inspectDearMePaymentReadiness,
  loadDearMePaymentReadinessEnv,
  parseDearMePaymentReadinessArgs,
} from "./dearme-payment-readiness.ts";

test("DearMe payment readiness keeps private beta sellable without hosted checkout", () => {
  const readiness = inspectDearMePaymentReadiness({});
  const formatted = formatDearMePaymentReadiness(readiness).join("\n");

  assert.equal(readiness.status, "sellable-private-beta");
  assert.equal(readiness.canSellPrivateBeta, true);
  assert.equal(readiness.manualPaidBeta.ready, true);
  assert.equal(readiness.canClaimSelfServeCheckout, false);
  assert.equal(readiness.hostedCheckout.ready, false);
  assert.equal(readiness.receiptSyncProof.ready, true);
  assert.equal(readiness.providerContractProof.ready, true);
  assert.deepEqual(readiness.hostedCheckout.blockers, [
    "DEARME_PAYMENT_LINK_URL is missing.",
    "DEARME_PAYMENT_RECEIPT_SYNC_SECRET or STRIPE_WEBHOOK_SECRET is missing.",
  ]);
  assert.match(formatted, /Sell private beta now: yes/);
  assert.match(formatted, /Claim self-serve checkout: no/);
  assert.match(formatted, /Receipt sync proof: ready/);
  assert.match(formatted, /Provider contract proof: ready/);
  assert.match(formatted, /raw-body webhook signature guarding/);
  assert.match(formatted, /does not create checkout sessions, charge cards, call payment APIs/);
  assert.match(formatted, /dearme:paid-loop-proof/);
  assert.match(formatted, /dearme:payment-receipt-sync-proof/);
  assert.match(formatted, /dearme:payment-provider-contract-proof/);
});

test("DearMe payment readiness marks hosted checkout ready when link and receipt sync exist", () => {
  const readiness = inspectDearMePaymentReadiness({
    DEARME_PAYMENT_LINK_URL: "https://payments.example.com/dearme-private-beta",
    DEARME_PAYMENT_RECEIPT_SYNC_SECRET: "whsec_test_secret_value",
    DEARME_PAYMENT_PROVIDER: "payment link",
  });
  const serialized = JSON.stringify(readiness);

  assert.equal(readiness.status, "self-serve-checkout-ready");
  assert.equal(readiness.canSellPrivateBeta, true);
  assert.equal(readiness.canClaimSelfServeCheckout, true);
  assert.equal(readiness.hostedCheckout.ready, true);
  assert.equal(readiness.receiptSyncProof.ready, true);
  assert.equal(readiness.providerContractProof.ready, true);
  assert.deepEqual(readiness.hostedCheckout.blockers, []);
  assert.match(readiness.hostedCheckout.summary, /payment link is configured/);
  assert.equal(serialized.includes("whsec_test_secret_value"), false);
  assert.equal(serialized.includes("payments.example.com"), false);
});

test("DearMe payment readiness rejects non-https payment links without leaking values", () => {
  const readiness = inspectDearMePaymentReadiness({
    DEARME_PAYMENT_LINK_URL: "http://localhost:3000/pay",
    STRIPE_WEBHOOK_SECRET: "stripe_webhook_secret_value",
  });
  const formatted = formatDearMePaymentReadiness(readiness).join("\n");

  assert.equal(readiness.canClaimSelfServeCheckout, false);
  assert.deepEqual(readiness.hostedCheckout.blockers, [
    "DEARME_PAYMENT_LINK_URL must be an https URL.",
  ]);
  assert.equal(formatted.includes("localhost:3000/pay"), false);
  assert.equal(formatted.includes("stripe_webhook_secret_value"), false);
});

test("DearMe payment readiness parses args and env files", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "dearme-payment-"));
  try {
    const envPath = join(tempDir, ".dearme-payment.env");
    await writeFile(
      envPath,
      [
        "DEARME_PAYMENT_LINK_URL=https://payments.example.com/dearme",
        "DEARME_PAYMENT_RECEIPT_SYNC_SECRET='receipt_secret'",
      ].join("\n"),
      "utf8",
    );

    assert.deepEqual(parseDearMePaymentReadinessArgs(["--json", "--check-hosted", "--env-file", envPath]), {
      help: false,
      json: true,
      humanHelpMarkdown: false,
      checkPrivateBeta: false,
      checkHosted: true,
      printEnvTemplate: false,
      envFiles: [envPath],
    });
    assert.equal(parseDearMePaymentReadinessArgs(["--check"]).checkPrivateBeta, true);
    assert.equal(parseDearMePaymentReadinessArgs(["--print-env-template"]).printEnvTemplate, true);

    const env = await loadDearMePaymentReadinessEnv([envPath], {});
    const readiness = inspectDearMePaymentReadiness(env);
    assert.equal(readiness.canClaimSelfServeCheckout, true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("DearMe payment readiness parses the human-support markdown flag", () => {
  const args = parseDearMePaymentReadinessArgs(["--human-help-markdown", "--env-file", ".dearme-payment.env"]);

  assert.equal(args.humanHelpMarkdown, true);
  assert.deepEqual(args.envFiles, [".dearme-payment.env"]);
});

test("DearMe payment readiness env template names only local setup variables", () => {
  const template = dearMePaymentReadinessEnvTemplate();

  assert.match(template, /DEARME_PAYMENT_LINK_URL=/);
  assert.match(template, /DEARME_PAYMENT_RECEIPT_SYNC_SECRET=/);
  assert.match(template, /dearme:payment-receipt-sync-proof/);
  assert.match(template, /dearme:payment-provider-contract-proof/);
  assert.match(template, /Manual private-beta receipt recording works without these/);
  assert.doesNotMatch(template, /whsec_/);
});

test("DearMe payment readiness generates a Peter-facing checkout support request", () => {
  const readiness = inspectDearMePaymentReadiness({});
  const markdown = formatDearMePaymentReadinessHumanHelp(readiness, { date: "2026-05-14" }).join("\n");

  assert.match(markdown, /^### 2026-05-14 - Self-serve checkout configuration/);
  assert.match(markdown, /Payment link:/);
  assert.match(markdown, /Receipt sync configured:/);
  assert.match(markdown, /Provider label:/);
  assert.match(markdown, /DEARME_PAYMENT_LINK_URL/);
  assert.match(markdown, /DEARME_PAYMENT_RECEIPT_SYNC_SECRET/);
  assert.match(markdown, /STRIPE_WEBHOOK_SECRET/);
  assert.match(markdown, /Claim self-serve checkout: no/);
  assert.match(markdown, /pnpm --silent dearme:payment-readiness -- --print-env-template > \.dearme-payment\.env/);
  assert.match(markdown, /pnpm --silent dearme:payment-readiness -- --env-file \.dearme-payment\.env --check-hosted/);
  assert.match(markdown, /dearme:payment-receipt-sync-proof/);
  assert.match(markdown, /dearme:payment-provider-contract-proof/);
  assert.match(markdown, /does not create checkout sessions, charge cards, call payment APIs/);
});

test("DearMe payment readiness support request does not leak configured payment values", () => {
  const readiness = inspectDearMePaymentReadiness({
    DEARME_PAYMENT_LINK_URL: "https://payments.example.com/dearme-private-beta",
    STRIPE_WEBHOOK_SECRET: "whsec_secret_value",
    DEARME_PAYMENT_PROVIDER: "stripe",
  });
  const markdown = formatDearMePaymentReadinessHumanHelp(readiness, { date: "2026-05-14" }).join("\n");

  assert.match(markdown, /Hosted checkout: ready/);
  assert.match(markdown, /Claim self-serve checkout: yes/);
  assert.match(markdown, /Needed values:\n\n- None/);
  assert.doesNotMatch(markdown, /payments\.example\.com/);
  assert.doesNotMatch(markdown, /whsec_secret_value/);
});

test("DearMe human support queue stays aligned with hosted checkout readiness", async () => {
  const help = await readFile(
    new URL("../docs/NEEDS_HUMAN_HELP.md", import.meta.url),
    "utf8",
  );

  assert.match(help, /Self-serve checkout configuration/);
  assert.match(help, /DEARME_PAYMENT_LINK_URL/);
  assert.match(help, /DEARME_PAYMENT_RECEIPT_SYNC_SECRET/);
  assert.match(help, /STRIPE_WEBHOOK_SECRET/);
  assert.match(help, /Payment link:/);
  assert.match(help, /Receipt sync configured:/);
  assert.match(help, /Provider label:/);
  assert.match(help, /pnpm --silent dearme:payment-readiness -- --human-help-markdown/);
  assert.match(help, /pnpm --silent dearme:payment-readiness -- --env-file \.dearme-payment\.env --check-hosted/);
  assert.match(help, /pnpm --silent dearme:payment-receipt-sync-proof -- --check/);
  assert.match(help, /pnpm --silent dearme:payment-provider-contract-proof -- --check/);
  assert.match(help, /does not create checkout sessions, charge\s+cards, call payment APIs/);
  assert.doesNotMatch(help, /whsec_[A-Za-z0-9_]+/);
});
