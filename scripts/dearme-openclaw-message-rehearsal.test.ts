import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeOpenClawMessageRehearsal,
  parseDearMeOpenClawMessageRehearsalArgs,
  runDearMeOpenClawMessageRehearsal,
} from "./dearme-openclaw-message-rehearsal.ts";

const now = () => new Date("2026-05-11T12:00:00.000Z");

test("OpenClaw message rehearsal proves the shared Telegram and iMessage contract locally", async () => {
  const report = await runDearMeOpenClawMessageRehearsal({
    env: {
      OPENCLAW_GATEWAY_TOKEN: "real-token-that-must-be-overridden",
    },
    now,
  });
  const formatted = formatDearMeOpenClawMessageRehearsal(report).join("\n");

  assert.equal(report.status, "ready");
  assert.deepEqual(report.results.map((result) => result.target), [
    "telegram_message",
    "imessage_message",
  ]);
  assert.deepEqual(report.results.map((result) => result.status), [
    "delivered",
    "delivered",
  ]);
  assert.deepEqual(report.captured.map((item) => item.toolName), [
    "send_telegram_message",
    "send_imessage",
  ]);
  assert.deepEqual(report.captured.map((item) => item.channel), [
    "telegram",
    "imessage",
  ]);
  assert.deepEqual(report.captured[0]?.payloadKeys, ["body", "recipient"]);
  assert.deepEqual(report.captured[1]?.payloadKeys, ["body", "service", "to"]);
  assert.equal(report.captured[0]?.paperclipWakeToolName, "send_telegram_message");
  assert.equal(report.captured[1]?.paperclipWakeToolName, "send_imessage");
  assert.equal(report.liveProofStillRequired, true);
  assert.match(formatted, /Live proof still required/);
  assert.match(formatted, /--target openclaw_messages --live/);
});

test("OpenClaw message rehearsal report does not serialize tokens or message bodies", async () => {
  const report = await runDearMeOpenClawMessageRehearsal({ now });
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes("dearme-openclaw-message-rehearsal-token"), false);
  assert.equal(serialized.includes("Your private DearMe proof packet is ready"), false);
  assert.equal(serialized.includes("Dear me, day 1"), false);
});

test("OpenClaw message rehearsal parses check and json flags", () => {
  assert.deepEqual(parseDearMeOpenClawMessageRehearsalArgs([
    "--check",
    "--json",
  ]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMeOpenClawMessageRehearsalArgs(["--", "--json"]), {
    help: false,
    json: true,
    check: false,
  });
  assert.throws(
    () => parseDearMeOpenClawMessageRehearsalArgs(["--env-file", ".env"]),
    /unknown argument/,
  );
});
