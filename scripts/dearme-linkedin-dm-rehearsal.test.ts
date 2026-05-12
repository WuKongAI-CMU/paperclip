import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeLinkedInDmRehearsal,
  parseDearMeLinkedInDmRehearsalArgs,
  runDearMeLinkedInDmRehearsal,
} from "./dearme-linkedin-dm-rehearsal.ts";

const now = () => new Date("2026-05-11T12:00:00.000Z");

test("LinkedIn DM rehearsal proves the partner dispatch contract locally", async () => {
  const report = await runDearMeLinkedInDmRehearsal({
    env: {
      DEARME_LINKEDIN_DM_MESSAGES_URL: "https://real-endpoint.example.test/messages",
      DEARME_LINKEDIN_DM_CREDENTIAL_JSON: JSON.stringify({
        provider: "linkedin_partner",
        accessToken: "real-token-that-must-be-overridden",
        capabilities: ["send_dm"],
      }),
      DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "urn:li:person:real-recipient",
    },
    now,
  });
  const formatted = formatDearMeLinkedInDmRehearsal(report).join("\n");

  assert.equal(report.status, "ready");
  assert.deepEqual(report.results.map((result) => result.target), ["linkedin_dm"]);
  assert.deepEqual(report.results.map((result) => result.status), ["delivered"]);
  assert.equal(report.captured.length, 1);
  assert.equal(report.captured[0]?.target, "linkedin_dm");
  assert.equal(report.captured[0]?.toolName, "send_linkedin_dm");
  assert.equal(report.captured[0]?.method, "POST");
  assert.deepEqual(report.captured[0]?.headerKeys, [
    "Authorization",
    "Content-Type",
    "Idempotency-Key",
    "User-Agent",
  ]);
  assert.deepEqual(report.captured[0]?.payloadKeys, [
    "body",
    "context",
    "recipientUrn",
    "subject",
  ]);
  assert.deepEqual(report.captured[0]?.contextKeys, [
    "approvalId",
    "companyId",
    "issueId",
    "openclawRunId",
  ]);
  assert.equal(report.captured[0]?.authorizationScheme, "Bearer");
  assert.equal(report.captured[0]?.idempotencyKeyPresent, true);
  assert.equal(report.captured[0]?.subjectPresent, true);
  assert.equal(report.liveProofStillRequired, true);
  assert.match(formatted, /Live proof still required/);
  assert.match(formatted, /--target linkedin_dm --live/);
});

test("LinkedIn DM rehearsal report does not serialize tokens, recipients, or message bodies", async () => {
  const report = await runDearMeLinkedInDmRehearsal({
    env: {
      DEARME_LINKEDIN_DM_CREDENTIAL_JSON: JSON.stringify({
        provider: "linkedin_partner",
        accessToken: "real-token-that-must-be-overridden",
        capabilities: ["send_dm"],
      }),
      DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "urn:li:person:real-recipient",
      DEARME_LINKEDIN_DM_SMOKE_BODY: "real body that must be overridden",
    },
    now,
  });
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes("dearme-linkedin-dm-rehearsal-token"), false);
  assert.equal(serialized.includes("real-token-that-must-be-overridden"), false);
  assert.equal(serialized.includes("urn:li:person:dearme-rehearsal"), false);
  assert.equal(serialized.includes("urn:li:person:real-recipient"), false);
  assert.equal(serialized.includes("Your private DearMe proof packet is ready"), false);
  assert.equal(serialized.includes("real body that must be overridden"), false);
});

test("LinkedIn DM rehearsal parses check and json flags", () => {
  assert.deepEqual(parseDearMeLinkedInDmRehearsalArgs(["--check", "--json"]), {
    help: false,
    json: true,
    check: true,
  });
  assert.deepEqual(parseDearMeLinkedInDmRehearsalArgs(["--", "--json"]), {
    help: false,
    json: true,
    check: false,
  });
  assert.throws(
    () => parseDearMeLinkedInDmRehearsalArgs(["--env-file", ".env"]),
    /unknown argument/,
  );
});
