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
    "--target",
    "openclaw",
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
  });
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
    assert.doesNotMatch(output, /secret-token/);
    assert.doesNotMatch(contents, /\.dearme-provider-smoke\.env/);
    assert.doesNotMatch(output, /\.dearme-provider-smoke\.env/);
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
