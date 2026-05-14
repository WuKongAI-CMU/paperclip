import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  formatDearMeNextProofHumanHelp,
  formatDearMeNextProofSetup,
  loadDearMeNextProofFactCaptures,
  parseDearMeNextProofArgs,
  parseDearMeOwnerProofHandoffReceipt,
  prepareDearMeNextProofSetup,
  targetFromDearMeReleaseGate,
} from "./dearme-next-proof.ts";
import type { DearMeReleaseGate } from "./dearme-release-gate.ts";
import {
  buildDearMeOwnerProofHandoffReceipt,
  DEARME_OWNER_PROOF_FACT_SPECS,
  DEARME_OWNER_PROOF_REPLY_TEMPLATE,
} from "../packages/shared/src/dearme-customer-text.ts";

function sampleValueForOwnerProofFact(provideAs: string) {
  if (provideAs === "DEARME_LINKEDIN_DM_MESSAGES_URL") {
    return "https://partner.example.test/messages";
  }
  if (provideAs === "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN") {
    return "urn:li:person:lead-1";
  }
  if (provideAs === "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT") {
    return "+15551234567";
  }
  throw new Error(`Missing sample value for owner proof fact: ${provideAs}`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("DearMe next proof args parse provider target aliases and env controls", () => {
  const args = parseDearMeNextProofArgs([
    "--",
    "--target",
    "openclaw",
    "--",
    "--env-file",
    "local-proof.env",
    "--force",
    "--json",
  ]);

  assert.deepEqual(args, {
    help: false,
    json: true,
    humanHelpMarkdown: false,
    force: true,
    noWrite: false,
    target: "openclaw_messages",
    envFile: "local-proof.env",
    handoffReceiptFile: null,
    factCaptures: [],
  });
  assert.deepEqual(
    {
      target: parseDearMeNextProofArgs(["--target", "openclaw", "--", "--json"]).target,
      json: parseDearMeNextProofArgs(["--target", "openclaw", "--", "--json"]).json,
    },
    { target: "openclaw_messages", json: true },
  );
});

test("DearMe next proof args parse the generated human-support markdown flag", () => {
  const args = parseDearMeNextProofArgs([
    "--target",
    "all",
    "--human-help-markdown",
  ]);

  assert.equal(args.target, "all");
  assert.equal(args.humanHelpMarkdown, true);
});

test("DearMe next proof args parse the owner handoff receipt file", () => {
  const args = parseDearMeNextProofArgs([
    "--target=all",
    "--handoff-receipt-file",
    "launch-proof-receipt.txt",
  ]);

  assert.equal(args.target, "all");
  assert.equal(args.handoffReceiptFile, "launch-proof-receipt.txt");
});

test("DearMe next proof args parse non-secret fact capture flags", () => {
  const factCaptureArgs = DEARME_OWNER_PROOF_FACT_SPECS.flatMap((spec, index) => {
    const value = sampleValueForOwnerProofFact(spec.provideAs);
    return index % 2 === 0 ? [spec.captureFlag, value] : [`${spec.captureFlag}=${value}`];
  });
  const args = parseDearMeNextProofArgs([
    "--target=linkedin",
    ...factCaptureArgs,
  ]);

  assert.deepEqual(
    args.factCaptures,
    DEARME_OWNER_PROOF_FACT_SPECS.map((spec) => ({
      key: spec.provideAs,
      value: sampleValueForOwnerProofFact(spec.provideAs),
    })),
  );
});

test("DearMe next proof parses product handoff receipts into local fact captures", () => {
  const values = Object.fromEntries(
    DEARME_OWNER_PROOF_FACT_SPECS.map((spec) => [
      spec.provideAs,
      sampleValueForOwnerProofFact(spec.provideAs),
    ]),
  );
  const receipt = buildDearMeOwnerProofHandoffReceipt({ values });

  assert.deepEqual(
    parseDearMeOwnerProofHandoffReceipt(receipt),
    DEARME_OWNER_PROOF_FACT_SPECS.map((spec) => ({
      key: spec.provideAs,
      value: sampleValueForOwnerProofFact(spec.provideAs),
    })),
  );
  assert.deepEqual(
    parseDearMeOwnerProofHandoffReceipt(buildDearMeOwnerProofHandoffReceipt()),
    [],
  );
});

test("DearMe next proof loads product handoff receipt files before setup", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-receipt-file-"));
  const receiptPath = join(dir, "launch-proof-receipt.txt");
  try {
    const receipt = buildDearMeOwnerProofHandoffReceipt({
      values: {
        DEARME_LINKEDIN_DM_MESSAGES_URL: "https://partner.example.test/messages",
        DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: "+15551234567",
      },
    });
    await writeFile(receiptPath, receipt);
    const args = parseDearMeNextProofArgs([
      "--target=all",
      "--handoff-receipt-file",
      "launch-proof-receipt.txt",
      "--linkedin-messages-url",
      "https://override.example.test/messages",
    ]);

    assert.deepEqual(await loadDearMeNextProofFactCaptures(args, dir), [
      {
        key: "DEARME_LINKEDIN_DM_MESSAGES_URL",
        value: "https://override.example.test/messages",
      },
      {
        key: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
        value: "+15551234567",
      },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof previews fact captures in no-write mode without touching env", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-no-write-facts-"));
  const envPath = join(dir, ".dearme-proof.env");
  try {
    const originalEnv = [
      "OPENCLAW_GATEWAY_URL=ws://127.0.0.1:3001",
      "OPENCLAW_GATEWAY_TOKEN=secret-token",
      "DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT=local-chat",
      "DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY=Private proof is ready.",
      "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=",
      "DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY=Private proof is ready.",
      "DEARME_OPENCLAW_IMESSAGE_SMOKE_SERVICE=imessage",
      "",
    ].join("\n");
    await writeFile(envPath, originalEnv);

    const setup = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "openclaw_messages",
      envFile: ".dearme-proof.env",
      noWrite: true,
      baseEnv: { HOME: dir },
      factCaptures: [{
        key: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
        value: "+15551234567",
      }],
    });
    const output = formatDearMeNextProofSetup(setup).join("\n");

    assert.equal(setup.envStatus, "skipped");
    assert.equal(setup.noSendCheck.status, "ready");
    assert.deepEqual(setup.noSendCheck.blockedTargets, []);
    assert.equal(await readFile(envPath, "utf8"), originalEnv);
    assert.match(output, /Provided local facts for this no-write check:/);
    assert.match(output, /iMessage\/SMS approved smoke recipient: DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT \(value hidden\)/);
    assert.doesNotMatch(output, /\+15551234567/);
    assert.doesNotMatch(output, /secret-token/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof target follows the release gate next action", () => {
  const gate = {
    nextAction: {
      label: "OpenClaw shared Telegram/iMessage message proof",
      reason: "Blocked by imessage_message.",
      command: "pnpm --silent dearme:next-proof -- --target openclaw_messages",
    },
  } as DearMeReleaseGate;

  assert.equal(targetFromDearMeReleaseGate(gate), "openclaw_messages");
});

test("DearMe next proof creates the local proof env and prints no-send readiness", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-"));
  try {
    const setup = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "openclaw_messages",
      envFile: ".dearme-proof.env",
      baseEnv: {
        HOME: dir,
        OPENCLAW_GATEWAY_TOKEN: "secret-token",
      },
    });
    const output = formatDearMeNextProofSetup(setup).join("\n");
    const contents = await readFile(join(dir, ".dearme-proof.env"), "utf8");

    assert.equal(setup.envStatus, "created");
    assert.equal(setup.target, "openclaw_messages");
    assert.match(contents, /OPENCLAW_GATEWAY_URL=/);
    assert.match(contents, /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=/);
    assert.match(contents, /--env-file \.dearme-proof\.env --check --target openclaw_messages/);
    assert.match(output, /pnpm --silent dearme:provider-smoke -- --env-file \.dearme-proof\.env --check --target openclaw_messages/);
    assert.match(output, /DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file \.dearme-proof\.env --target openclaw_messages --live/);
    assert.match(output, /imessage_message: blocked/);
    assert.match(output, /Facts needed before any live run:/);
    assert.match(output, /OpenClaw gateway URL: provide OPENCLAW_GATEWAY_URL or DEARME_USE_LOCAL_OPENCLAW_CONFIG=1 for telegram_message, imessage_message/);
    assert.match(output, /OpenClaw gateway auth: provide OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH for telegram_message, imessage_message \(keep value local; do not paste secrets\)/);
    assert.match(output, /iMessage\/SMS approved smoke recipient: provide DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT for imessage_message/);
    assert.match(output, /Owner handoff:/);
    assert.match(output, /status: blocked/);
    assert.match(output, /Owner facts needed before public launch proof/);
    assert.match(output, /Capture command: pnpm --silent dearme:next-proof -- --target openclaw_messages --imessage-recipient <approved-phone-or-imessage>/);
    assert.match(output, /Check first: pnpm --silent dearme:provider-smoke -- --env-file \.dearme-proof\.env --check --target openclaw_messages/);
    assert.equal(setup.ownerHandoff.status, "blocked");
    assert.equal(setup.ownerHandoff.noSendGuarantee, true);
    assert.equal(setup.ownerHandoff.requiresLiveGuard, true);
    assert.equal(setup.ownerHandoff.captureCommand?.includes("--imessage-recipient"), true);
    assert.equal(setup.ownerHandoff.liveOrRunCommand, setup.commands.liveOrRun);
    assert.equal(
      setup.ownerHandoff.safety.some((item) => item.includes("does not send messages")),
      true,
    );
    assert.deepEqual(
      setup.factsNeeded.find((fact) => fact.provideAs === "OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH"),
      {
        label: "OpenClaw gateway auth",
        provideAs: "OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH",
        targets: ["telegram_message", "imessage_message"],
        sensitive: true,
      },
    );
    assert.doesNotMatch(output, /secret-token/);
    assert.doesNotMatch(JSON.stringify(setup.factsNeeded), /secret-token/);
    assert.doesNotMatch(contents, /\.dearme-provider-smoke\.env/);
    assert.doesNotMatch(output, /\.dearme-provider-smoke\.env/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof summarizes OpenClaw lanes when only phone proof is waiting", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-openclaw-summary-"));
  try {
    const setup = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "openclaw_messages",
      envFile: ".dearme-proof.env",
      noWrite: true,
      baseEnv: {
        HOME: dir,
        OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:3030",
        OPENCLAW_GATEWAY_TOKEN: "secret-token",
        DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT: "approved-chat",
        DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY: "Private proof is ready.",
      },
    });
    const output = formatDearMeNextProofSetup(setup).join("\n");

    assert.deepEqual(setup.ownerHandoff.proofLanes, [
      {
        target: "telegram_message",
        status: "ready",
        description: "send one Telegram message through the configured OpenClaw gateway",
        waitingOn: [],
        liveGuardRequired: true,
        nextStep: "Run the no-send check, then the guarded live proof.",
      },
      {
        target: "imessage_message",
        status: "waiting",
        description: "send one iMessage/SMS through the configured OpenClaw gateway",
        waitingOn: ["iMessage/SMS approved smoke recipient"],
        liveGuardRequired: true,
        nextStep: "Provide iMessage/SMS approved smoke recipient, then run the no-send check.",
      },
    ]);
    assert.match(output, /Proof lane summary:/);
    assert.match(output, /telegram_message: ready\. Run the no-send check, then the guarded live proof\. Guarded live proof required\./);
    assert.match(output, /imessage_message: waiting on iMessage\/SMS approved smoke recipient\. Provide iMessage\/SMS approved smoke recipient, then run the no-send check\. Guarded live proof required\./);
    assert.equal(setup.noSendCheck.status, "blocked");
    assert.deepEqual(setup.noSendCheck.blockedTargets, [{
      target: "imessage_message",
      waitingOn: ["iMessage/SMS approved smoke recipient"],
    }]);
    assert.match(output, /No-send check result:/);
    assert.match(output, /status: blocked/);
    assert.match(output, /imessage_message: waiting on iMessage\/SMS approved smoke recipient/);
    assert.doesNotMatch(output, /secret-token/);
    assert.doesNotMatch(JSON.stringify(setup.ownerHandoff), /secret-token/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof builds an owner handoff capture command for approved external proof facts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-owner-handoff-"));
  try {
    const setup = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "linkedin_dm",
      envFile: ".dearme-proof.env",
      noWrite: true,
      baseEnv: {
        HOME: dir,
        DEARME_LINKEDIN_DM_CREDENTIAL_JSON: JSON.stringify({
          provider: "linkedin_partner",
          accessToken: "li-token",
          capabilities: ["send_dm"],
        }),
        DEARME_LINKEDIN_DM_SMOKE_BODY: "Private proof packet is ready.",
      },
    });
    const output = formatDearMeNextProofSetup(setup).join("\n");

    assert.equal(setup.envStatus, "skipped");
    assert.deepEqual(
      setup.ownerHandoff.factsToProvide.map((fact) => fact.provideAs),
      [
        "DEARME_LINKEDIN_DM_MESSAGES_URL",
        "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
      ],
    );
    assert.equal(
      setup.ownerHandoff.captureCommand,
      "pnpm --silent dearme:next-proof -- --target linkedin_dm --linkedin-messages-url <partner-messages-url> --linkedin-recipient-urn <approved-linkedin-recipient-urn>",
    );
    assert.equal(
      setup.ownerHandoff.handoffReceiptPreviewCommand,
      "pnpm --silent dearme:next-proof -- --target linkedin_dm --no-write --handoff-receipt-file <launch-proof-handoff-receipt.txt>",
    );
    assert.equal(
      setup.ownerHandoff.handoffReceiptCommand,
      "pnpm --silent dearme:next-proof -- --target linkedin_dm --handoff-receipt-file <launch-proof-handoff-receipt.txt>",
    );
    assert.equal(setup.ownerHandoff.status, "blocked");
    assert.equal(setup.ownerHandoff.noSendGuarantee, true);
    assert.equal(setup.ownerHandoff.requiresLiveGuard, true);
    assert.match(output, /LinkedIn partner messages endpoint: DEARME_LINKEDIN_DM_MESSAGES_URL=<partner-messages-url>/);
    assert.match(output, /LinkedIn approved smoke recipient: DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN=<approved-linkedin-recipient-urn>/);
    assert.match(output, /Preview receipt without writing: pnpm --silent dearme:next-proof -- --target linkedin_dm --no-write --handoff-receipt-file <launch-proof-handoff-receipt\.txt>/);
    assert.match(output, /If preview passes, import receipt: pnpm --silent dearme:next-proof -- --target linkedin_dm --handoff-receipt-file <launch-proof-handoff-receipt\.txt>/);
    assert.doesNotMatch(output, /li-token/);
    assert.doesNotMatch(JSON.stringify(setup.ownerHandoff), /li-token/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe human support queue stays aligned with the generated owner proof handoff", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-human-queue-"));
  try {
    const setup = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "all",
      envFile: ".dearme-proof.env",
      noWrite: true,
      baseEnv: {
        HOME: dir,
        DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "1",
        DEARME_DEPLOY_SITE_BASE_URL: "https://dearme.example.test",
        DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF: "dist/dearme-private-proof/peter-studio/index.html",
        DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT: "DearMe proof page ready",
        DEARME_LINKEDIN_DM_CREDENTIAL_JSON: JSON.stringify({
          provider: "linkedin_partner",
          accessToken: "li-token",
          capabilities: ["send_dm"],
        }),
        DEARME_LINKEDIN_DM_SMOKE_BODY: "Private proof packet is ready.",
        OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:3030",
        OPENCLAW_GATEWAY_TOKEN: "secret-token",
        DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT: "approved-chat",
        DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY: "Private proof is ready.",
        DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY: "Private proof is ready.",
        DEARME_OPENCLAW_IMESSAGE_SMOKE_SERVICE: "imessage",
        DEARME_META_CAMPAIGN_CREDENTIAL_JSON: JSON.stringify({
          accessToken: "meta-token",
          adAccountId: "act_123",
          pageId: "page_123",
        }),
      },
    });
    const help = await readFile(
      new URL("../docs/NEEDS_HUMAN_HELP.md", import.meta.url),
      "utf8",
    );

    assert.equal(setup.ownerHandoff.status, "blocked");
    assert.deepEqual(
      setup.ownerHandoff.factsToProvide.map((fact) => fact.provideAs),
      DEARME_OWNER_PROOF_FACT_SPECS.map((fact) => fact.provideAs),
    );
    for (const fact of DEARME_OWNER_PROOF_FACT_SPECS) {
      assert.match(help, new RegExp(fact.provideAs));
    }
    for (const line of DEARME_OWNER_PROOF_REPLY_TEMPLATE) {
      assert.match(help, new RegExp(`${line.label}:`));
    }
    assert.match(help, /Current generated proof handoff status:/);
    assert.match(help, /Captured details: none in the local proof setup\./);
    assert.match(help, /send, publish, deploy, or spend/);
    assert.ok(setup.ownerHandoff.captureCommand);
    assert.ok(setup.ownerHandoff.handoffReceiptPreviewCommand);
    assert.ok(setup.ownerHandoff.handoffReceiptCommand);
    assert.match(help, new RegExp(escapeRegExp(setup.ownerHandoff.captureCommand)));
    assert.match(help, new RegExp(escapeRegExp(setup.ownerHandoff.handoffReceiptPreviewCommand)));
    assert.match(help, new RegExp(escapeRegExp(setup.ownerHandoff.handoffReceiptCommand)));
    assert.match(help, new RegExp(escapeRegExp(setup.ownerHandoff.checkCommand)));
    assert.match(help, new RegExp(escapeRegExp(setup.ownerHandoff.liveOrRunCommand)));
    assert.doesNotMatch(help, /li-token|secret-token|meta-token/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof generates the Peter-facing human support queue entry", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-human-help-"));
  try {
    const setup = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "all",
      envFile: ".dearme-proof.env",
      noWrite: true,
      baseEnv: {
        HOME: dir,
        DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "1",
        DEARME_DEPLOY_SITE_BASE_URL: "https://dearme.example.test",
        DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF: "dist/dearme-private-proof/peter-studio/index.html",
        DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT: "DearMe proof page ready",
        DEARME_LINKEDIN_DM_CREDENTIAL_JSON: JSON.stringify({
          provider: "linkedin_partner",
          accessToken: "li-token",
          capabilities: ["send_dm"],
        }),
        DEARME_LINKEDIN_DM_SMOKE_BODY: "Private proof packet is ready.",
        OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:3030",
        OPENCLAW_GATEWAY_TOKEN: "secret-token",
        DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT: "approved-chat",
        DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY: "Private proof is ready.",
        DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY: "Private proof is ready.",
        DEARME_OPENCLAW_IMESSAGE_SMOKE_SERVICE: "imessage",
        DEARME_META_CAMPAIGN_CREDENTIAL_JSON: JSON.stringify({
          accessToken: "meta-token",
          adAccountId: "act_123",
          pageId: "page_123",
        }),
      },
    });
    const markdown = formatDearMeNextProofHumanHelp(setup, { date: "2026-05-14" }).join("\n");

    assert.match(markdown, /^### 2026-05-14 - External live-proof recipients/);
    assert.match(markdown, /Delivery route:/);
    assert.match(markdown, /Professional-network recipient:/);
    assert.match(markdown, /Phone-message recipient:/);
    for (const fact of DEARME_OWNER_PROOF_FACT_SPECS) {
      assert.match(markdown, new RegExp(fact.provideAs));
    }
    assert.match(markdown, /Captured details: 0\/3\./);
    assert.match(markdown, /No-send check: blocked\./);
    assert.match(markdown, new RegExp(escapeRegExp(setup.ownerHandoff.captureCommand ?? "")));
    assert.match(markdown, new RegExp(escapeRegExp(setup.ownerHandoff.checkCommand)));
    assert.match(markdown, new RegExp(escapeRegExp(setup.ownerHandoff.liveOrRunCommand)));
    assert.match(markdown, /does not send, publish, deploy, or spend/);
    assert.doesNotMatch(markdown, /li-token|secret-token|meta-token/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof augments an existing env with missing target keys", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-"));
  const envPath = join(dir, ".dearme-proof.env");
  try {
    await writeFile(envPath, "OPENCLAW_GATEWAY_URL=ws://127.0.0.1:3001\n");

    const augmented = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "openclaw_messages",
      envFile: ".dearme-proof.env",
      baseEnv: { HOME: dir },
    });
    const contents = await readFile(envPath, "utf8");

    assert.equal(augmented.envStatus, "augmented");
    assert.match(contents, /OPENCLAW_GATEWAY_URL=ws:\/\/127\.0\.0\.1:3001/);
    assert.match(contents, /# Added by dearme:next-proof for openclaw_messages/);
    assert.match(contents, /OPENCLAW_GATEWAY_TOKEN=/);
    assert.match(contents, /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=/);
    assert.doesNotMatch(contents, /\.dearme-provider-smoke\.env/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof captures local facts without printing captured values", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-facts-"));
  const envPath = join(dir, ".dearme-proof.env");
  try {
    await writeFile(envPath, [
      "OPENCLAW_GATEWAY_URL=ws://127.0.0.1:3001",
      "OPENCLAW_GATEWAY_TOKEN=secret-token",
      "DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT=local-chat",
      "DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY=Private proof is ready.",
      "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=",
      "",
    ].join("\n"));

    const setup = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "openclaw_messages",
      envFile: ".dearme-proof.env",
      baseEnv: { HOME: dir },
      factCaptures: [{
        key: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
        value: "+15551234567",
      }],
    });
    const contents = await readFile(envPath, "utf8");
    const output = formatDearMeNextProofSetup(setup).join("\n");

    assert.equal(setup.envStatus, "augmented");
    assert.equal(setup.readiness.every((item) => item.ready), true);
    assert.deepEqual(setup.factsNeeded, []);
    assert.deepEqual(setup.capturedFacts, [{
      key: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
      label: "iMessage/SMS approved smoke recipient",
      sensitive: false,
    }]);
    assert.match(contents, /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT="\+15551234567"/);
    assert.match(output, /Captured local facts:/);
    assert.match(output, /iMessage\/SMS approved smoke recipient: DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT \(value hidden\)/);
    assert.equal(setup.ownerHandoff.status, "ready");
    assert.equal(setup.ownerHandoff.headline, "Ready for guarded live proof");
    assert.equal(setup.ownerHandoff.captureCommand, null);
    assert.equal(setup.ownerHandoff.handoffReceiptPreviewCommand, null);
    assert.equal(setup.ownerHandoff.handoffReceiptCommand, null);
    assert.equal(setup.ownerHandoff.noSendGuarantee, true);
    assert.equal(setup.ownerHandoff.requiresLiveGuard, true);
    assert.equal(setup.noSendCheck.status, "ready");
    assert.deepEqual(setup.noSendCheck.blockedTargets, []);
    assert.match(output, /status: ready/);
    assert.match(output, /No-send check result:/);
    assert.match(output, /blocked: none/);
    assert.match(output, /Ready for guarded live proof/);
    assert.match(output, /Provide: no owner facts missing/);
    assert.doesNotMatch(output, /\+15551234567/);
    assert.doesNotMatch(JSON.stringify(setup.capturedFacts), /\+15551234567/);
    assert.doesNotMatch(JSON.stringify(setup.ownerHandoff), /\+15551234567/);
    assert.doesNotMatch(output, /secret-token/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof captures product handoff receipt facts without printing values", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-receipt-facts-"));
  const envPath = join(dir, ".dearme-proof.env");
  try {
    await writeFile(envPath, [
      "DEARME_LINKEDIN_DM_CREDENTIAL_JSON={\"provider\":\"linkedin_partner\",\"accessToken\":\"li-token\",\"capabilities\":[\"send_dm\"]}",
      "DEARME_LINKEDIN_DM_MESSAGES_URL=",
      "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN=",
      "DEARME_LINKEDIN_DM_SMOKE_BODY=Private proof packet is ready.",
      "OPENCLAW_GATEWAY_URL=ws://127.0.0.1:3001",
      "OPENCLAW_GATEWAY_TOKEN=secret-token",
      "DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT=local-chat",
      "DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY=Private proof is ready.",
      "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=",
      "",
    ].join("\n"));
    const receipt = buildDearMeOwnerProofHandoffReceipt({
      values: Object.fromEntries(
        DEARME_OWNER_PROOF_FACT_SPECS.map((spec) => [
          spec.provideAs,
          sampleValueForOwnerProofFact(spec.provideAs),
        ]),
      ),
    });

    const setup = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "all",
      envFile: ".dearme-proof.env",
      baseEnv: { HOME: dir },
      factCaptures: parseDearMeOwnerProofHandoffReceipt(receipt),
    });
    const contents = await readFile(envPath, "utf8");
    const output = formatDearMeNextProofSetup(setup).join("\n");

    assert.equal(setup.readiness.find((item) => item.target === "linkedin_dm")?.ready, true);
    assert.equal(setup.readiness.find((item) => item.target === "imessage_message")?.ready, true);
    assert.deepEqual(
      setup.capturedFacts.map((fact) => fact.key),
      DEARME_OWNER_PROOF_FACT_SPECS.map((spec) => spec.provideAs),
    );
    assert.match(contents, /DEARME_LINKEDIN_DM_MESSAGES_URL="https:\/\/partner\.example\.test\/messages"/);
    assert.match(contents, /DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN="urn:li:person:lead-1"/);
    assert.match(contents, /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT="\+15551234567"/);
    assert.match(output, /Captured local facts:/);
    assert.match(output, /LinkedIn partner messages endpoint: DEARME_LINKEDIN_DM_MESSAGES_URL \(value hidden\)/);
    assert.match(output, /LinkedIn approved smoke recipient: DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN \(value hidden\)/);
    assert.match(output, /iMessage\/SMS approved smoke recipient: DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT \(value hidden\)/);
    assert.equal(
      setup.noSendCheck.blockedTargets.some((item) => item.target === "linkedin_dm"),
      false,
    );
    assert.equal(
      setup.noSendCheck.blockedTargets.some((item) => item.target === "imessage_message"),
      false,
    );
    assert.match(output, /No-send check result:/);
    assert.equal(setup.noSendCheck.checkedTargets.includes("linkedin_dm"), true);
    assert.equal(setup.noSendCheck.checkedTargets.includes("imessage_message"), true);
    assert.match(output, /local readiness only; no messages, publishes, deploys, spend, or live provider calls ran/);
    assert.doesNotMatch(output, /partner\.example\.test/);
    assert.doesNotMatch(output, /urn:li:person:lead-1/);
    assert.doesNotMatch(output, /\+15551234567/);
    assert.doesNotMatch(output, /li-token|secret-token/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DearMe next proof preserves an existing env once target keys are present unless forced", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-"));
  const envPath = join(dir, ".dearme-proof.env");
  try {
    await writeFile(envPath, "OPENCLAW_GATEWAY_URL=ws://127.0.0.1:3001\n");

    await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "openclaw_messages",
      envFile: ".dearme-proof.env",
      baseEnv: { HOME: dir },
    });

    const alreadyAugmented = await readFile(envPath, "utf8");
    const preserved = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "openclaw_messages",
      envFile: ".dearme-proof.env",
      baseEnv: { HOME: dir },
    });
    assert.equal(preserved.envStatus, "preserved");
    assert.equal(await readFile(envPath, "utf8"), alreadyAugmented);

    const overwritten = await prepareDearMeNextProofSetup({
      cwd: dir,
      target: "openclaw_messages",
      envFile: ".dearme-proof.env",
      force: true,
      baseEnv: { HOME: dir },
    });
    assert.equal(overwritten.envStatus, "overwritten");
    assert.match(await readFile(envPath, "utf8"), /OPENCLAW_GATEWAY_TOKEN=/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
