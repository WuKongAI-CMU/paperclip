import { describe, expect, it, vi } from "vitest";
import {
  sendDearMeWeeklyLetterEmails,
  type DearMeWeeklyLetterCandidate,
  type DearMeWeeklyLetterRepository,
} from "./dearme-weekly-letter-email.js";

function makeCandidate(overrides: Partial<DearMeWeeklyLetterCandidate> = {}): DearMeWeeklyLetterCandidate {
  return {
    companyId: "company-1",
    companyName: "DearMe Beta",
    userId: "user-1",
    recipientName: "Ada Lovelace",
    recipientEmail: "ada@example.test",
    timezone: "America/New_York",
    report: {
      issueId: "issue-1",
      documentId: "doc-1",
      title: "Dear me report",
      body: [
        "Completed work: prepared one useful proof update.",
        "",
        "Next bets: review the warm intro draft and the proof page.",
      ].join("\n"),
      updatedAt: new Date("2026-05-17T20:00:00.000Z"),
    },
    ...overrides,
  };
}

function makeRepository(input: {
  candidates?: DearMeWeeklyLetterCandidate[];
  sentKeys?: Set<string>;
} = {}) {
  const sentKeys = input.sentKeys ?? new Set<string>();
  const markSentCalls: Array<Parameters<DearMeWeeklyLetterRepository["markSent"]>[0]> = [];
  const repository: DearMeWeeklyLetterRepository = {
    async listCandidates() {
      return input.candidates ?? [makeCandidate()];
    },
    async hasSent({ companyId, localDate }) {
      return sentKeys.has(`${companyId}:${localDate}`);
    },
    async markSent(call) {
      markSentCalls.push(call);
      sentKeys.add(`${call.companyId}:${call.localDate}`);
    },
  };
  return { repository, markSentCalls };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

describe("DearMe weekly letter email", () => {
  it("sends the weekly letter during the recipient local Sunday 18:00 window", async () => {
    const { repository, markSentCalls } = makeRepository();
    const fetchMock = vi.fn(async () => jsonResponse({ id: "email_123" }));

    const result = await sendDearMeWeeklyLetterEmails({
      repository,
      resendApiKey: "re_test",
      fetch: fetchMock,
      emailsUrl: "https://email.example.test/messages",
      now: new Date("2026-05-17T22:05:00.000Z"),
      appUrl: "https://dearme.app",
    });

    expect(result).toMatchObject({
      skipped: false,
      ok: true,
      checkedCandidates: 1,
      dueCandidates: 1,
      sent: 1,
      failed: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstFetchCall = (fetchMock.mock.calls as unknown as Array<[string, { headers: Record<string, string>; body: string }]>)[0];
    expect(firstFetchCall?.[0]).toBe("https://email.example.test/messages");
    expect(firstFetchCall?.[1].headers).toMatchObject({
      "idempotency-key": "dearme-weekly-letter:company-1:2026-05-17",
    });
    const payload = JSON.parse(firstFetchCall?.[1].body ?? "{}");
    expect(payload).toMatchObject({
      to: ["ada@example.test"],
      subject: "Your DearMe letter for 2026-05-17",
    });
    expect(payload.text).toContain("Completed work");
    expect(payload.text).toContain("Nothing publishes, sends, deploys, or spends without your approval.");
    expect(markSentCalls).toEqual([
      expect.objectContaining({
        companyId: "company-1",
        localDate: "2026-05-17",
        reportDocumentId: "doc-1",
        providerMessageId: "email_123",
      }),
    ]);
  });

  it("does not send outside the recipient local weekly window", async () => {
    const { repository, markSentCalls } = makeRepository();
    const fetchMock = vi.fn(async () => jsonResponse({ id: "email_123" }));

    const result = await sendDearMeWeeklyLetterEmails({
      repository,
      resendApiKey: "re_test",
      fetch: fetchMock,
      now: new Date("2026-05-17T21:05:00.000Z"),
    });

    expect(result).toMatchObject({
      skipped: false,
      ok: true,
      dueCandidates: 0,
      sent: 0,
      failed: 0,
    });
    expect((result as { results: Array<{ reason?: string }> }).results[0]?.reason).toBe("not_sunday_18_local");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(markSentCalls).toHaveLength(0);
  });

  it("falls back to UTC when a saved timezone is invalid", async () => {
    const { repository, markSentCalls } = makeRepository({
      candidates: [makeCandidate({ timezone: "Invalid/Timezone" })],
    });
    const fetchMock = vi.fn(async () => jsonResponse({ id: "email_123" }));

    const result = await sendDearMeWeeklyLetterEmails({
      repository,
      resendApiKey: "re_test",
      fetch: fetchMock,
      now: new Date("2026-05-17T18:05:00.000Z"),
    });

    expect(result).toMatchObject({
      skipped: false,
      ok: true,
      dueCandidates: 1,
      sent: 1,
    });
    expect((result as { results: Array<{ timezone?: string; localDate?: string }> }).results[0]).toMatchObject({
      timezone: "UTC",
      localDate: "2026-05-17",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(markSentCalls).toHaveLength(1);
  });

  it("suppresses duplicate sends for the same company local date", async () => {
    const { repository, markSentCalls } = makeRepository({
      sentKeys: new Set(["company-1:2026-05-17"]),
    });
    const fetchMock = vi.fn(async () => jsonResponse({ id: "email_123" }));

    const result = await sendDearMeWeeklyLetterEmails({
      repository,
      resendApiKey: "re_test",
      fetch: fetchMock,
      now: new Date("2026-05-17T22:05:00.000Z"),
    });

    expect(result).toMatchObject({
      skipped: false,
      ok: true,
      dueCandidates: 1,
      sent: 0,
    });
    expect((result as { results: Array<{ reason?: string }> }).results[0]?.reason).toBe("already_sent");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(markSentCalls).toHaveLength(0);
  });

  it("skips without live network when the email API key is absent", async () => {
    const { repository } = makeRepository();
    const fetchMock = vi.fn(async () => jsonResponse({ id: "email_123" }));

    const result = await sendDearMeWeeklyLetterEmails({
      repository,
      resendApiKey: "",
      fetch: fetchMock,
      now: new Date("2026-05-17T22:05:00.000Z"),
    });

    expect(result).toEqual({
      skipped: true,
      reason: "dearme_resend_api_key_unset",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports missing weekly reports without sending", async () => {
    const { repository } = makeRepository({
      candidates: [makeCandidate({ report: null })],
    });
    const fetchMock = vi.fn(async () => jsonResponse({ id: "email_123" }));

    const result = await sendDearMeWeeklyLetterEmails({
      repository,
      resendApiKey: "re_test",
      fetch: fetchMock,
      now: new Date("2026-05-17T22:05:00.000Z"),
    });

    expect(result).toMatchObject({
      skipped: false,
      ok: true,
      dueCandidates: 1,
      sent: 0,
    });
    expect((result as { results: Array<{ reason?: string }> }).results[0]?.reason).toBe("weekly_report_missing");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
