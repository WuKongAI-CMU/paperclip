import { describe, expect, it, vi } from "vitest";
import { checkDearMeSupportResponseSla } from "./dearme-support-sla.js";

function plainResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe("DearMe support response SLA", () => {
  it("sends one Loops event when a Plain thread waits more than 24 hours", async () => {
    const fetchMock = vi.fn(async () => plainResponse({
      data: {
        threads: {
          edges: [
            {
              node: {
                id: "thread-overdue",
                status: "open",
                waitingSince: "2026-05-14T06:00:00.000Z",
                lastAgentResponseAt: "2026-05-13T20:00:00.000Z",
              },
            },
            {
              node: {
                id: "thread-fresh",
                status: "open",
                waitingSince: "2026-05-16T06:00:00.000Z",
              },
            },
            {
              node: {
                id: "thread-answered",
                status: "open",
                waitingSince: "2026-05-14T06:00:00.000Z",
                lastAgentResponseAt: "2026-05-14T07:00:00.000Z",
              },
            },
          ],
        },
      },
    }));
    const sendEvent = vi.fn(async () => ({ skipped: false as const, ok: true as const, status: 200 }));

    await expect(checkDearMeSupportResponseSla({
      fetch: fetchMock,
      plainApiKey: "plain_test_key",
      loopsApiKey: "loops_test_key",
      alertEmail: "peter@example.test",
      now: new Date("2026-05-16T07:00:00.000Z"),
      sendEvent,
    })).resolves.toMatchObject({
      skipped: false,
      ok: true,
      checkedThreads: 3,
      overdueThreads: [
        {
          id: "thread-overdue",
          waitingSince: "2026-05-14T06:00:00.000Z",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://core-api.uk.plain.com/graphql/v1",
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer plain_test_key",
          "content-type": "application/json",
        },
      }),
    );
    const firstFetchCall = (fetchMock.mock.calls as unknown as Array<[string, { body: string }]>)[0];
    const requestBody = JSON.parse(firstFetchCall[1].body);
    expect(requestBody.query).toContain("DearMeSupportSlaThreads");
    expect(requestBody.variables).toEqual({ first: 50 });

    expect(sendEvent).toHaveBeenCalledWith({
      email: "peter@example.test",
      eventName: "dearme_support_overdue",
      properties: {
        overdueThreadCount: 1,
        overdueThreadIds: "thread-overdue",
        oldestWaitingHours: 49,
        checkedAt: "2026-05-16T07:00:00.000Z",
      },
    }, {
      apiKey: "loops_test_key",
    });
  });

  it("does not send an event when every open thread is inside the SLA", async () => {
    const fetchMock = vi.fn(async () => plainResponse({
      data: {
        threads: {
          nodes: [
            {
              id: "thread-fresh",
              status: "open",
              waitingSinceAt: "2026-05-16T06:30:00.000Z",
            },
          ],
        },
      },
    }));
    const sendEvent = vi.fn();

    await expect(checkDearMeSupportResponseSla({
      fetch: fetchMock,
      plainApiKey: "plain_test_key",
      alertEmail: "peter@example.test",
      now: new Date("2026-05-16T07:00:00.000Z"),
      sendEvent,
    })).resolves.toEqual({
      skipped: false,
      ok: true,
      checkedThreads: 1,
      overdueThreads: [],
      event: null,
    });
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("skips without live network when Plain is not configured", async () => {
    const fetchMock = vi.fn();
    const sendEvent = vi.fn();

    await expect(checkDearMeSupportResponseSla({
      fetch: fetchMock,
      plainApiKey: "",
      alertEmail: "peter@example.test",
      sendEvent,
    })).resolves.toEqual({
      skipped: true,
      reason: "dearme_plain_api_key_unset",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("reports a configuration failure when overdue threads exist but no alert email is set", async () => {
    const fetchMock = vi.fn(async () => plainResponse({
      data: {
        threads: {
          edges: [
            {
              node: {
                id: "thread-overdue",
                status: "open",
                lastCustomerMessageAt: "2026-05-14T06:00:00.000Z",
              },
            },
          ],
        },
      },
    }));
    const sendEvent = vi.fn();

    await expect(checkDearMeSupportResponseSla({
      fetch: fetchMock,
      plainApiKey: "plain_test_key",
      alertEmail: "",
      now: new Date("2026-05-16T07:00:00.000Z"),
      sendEvent,
    })).resolves.toMatchObject({
      skipped: false,
      ok: false,
      overdueThreads: [{ id: "thread-overdue" }],
      event: {
        skipped: true,
        reason: "dearme_support_sla_alert_email_unset",
      },
    });
    expect(sendEvent).not.toHaveBeenCalled();
  });
});
