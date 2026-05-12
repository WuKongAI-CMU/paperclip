import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  formatDearMeNextProofSetup,
  parseDearMeNextProofArgs,
  prepareDearMeNextProofSetup,
  targetFromDearMeReleaseGate,
} from "./dearme-next-proof.ts";
import type { DearMeReleaseGate } from "./dearme-release-gate.ts";

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
    force: true,
    noWrite: false,
    target: "openclaw_messages",
    envFile: "local-proof.env",
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

test("DearMe next proof args parse non-secret fact capture flags", () => {
  const args = parseDearMeNextProofArgs([
    "--target=linkedin",
    "--imessage-recipient",
    "+15551234567",
    "--linkedin-messages-url=https://partner.example.test/messages",
    "--linkedin-recipient-urn",
    "urn:li:person:lead-1",
  ]);

  assert.deepEqual(args.factCaptures, [
    {
      key: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
      value: "+15551234567",
    },
    {
      key: "DEARME_LINKEDIN_DM_MESSAGES_URL",
      value: "https://partner.example.test/messages",
    },
    {
      key: "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
      value: "urn:li:person:lead-1",
    },
  ]);
});

test("DearMe next proof rejects fact capture in no-write mode", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-next-proof-no-write-facts-"));
  try {
    await assert.rejects(
      prepareDearMeNextProofSetup({
        cwd: dir,
        target: "openclaw_messages",
        envFile: ".dearme-proof.env",
        noWrite: true,
        baseEnv: { HOME: dir },
        factCaptures: [{
          key: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
          value: "+15551234567",
        }],
      }),
      /--no-write cannot be used with fact capture flags/,
    );
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
    assert.equal(setup.ownerHandoff.safety[0]?.includes("does not send messages"), true);
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
    assert.equal(setup.ownerHandoff.status, "blocked");
    assert.equal(setup.ownerHandoff.noSendGuarantee, true);
    assert.equal(setup.ownerHandoff.requiresLiveGuard, true);
    assert.match(output, /LinkedIn partner messages endpoint: DEARME_LINKEDIN_DM_MESSAGES_URL=<partner-messages-url>/);
    assert.match(output, /LinkedIn approved smoke recipient: DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN=<approved-linkedin-recipient-urn>/);
    assert.doesNotMatch(output, /li-token/);
    assert.doesNotMatch(JSON.stringify(setup.ownerHandoff), /li-token/);
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
    assert.equal(setup.ownerHandoff.noSendGuarantee, true);
    assert.equal(setup.ownerHandoff.requiresLiveGuard, true);
    assert.match(output, /status: ready/);
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
