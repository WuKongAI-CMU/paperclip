import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { dearmeRoutes } from "../routes/dearme.js";

type DearMeRouteOptions = NonNullable<Parameters<typeof dearmeRoutes>[1]>;

function createApp(sendLifecycleEvent: DearMeRouteOptions["sendLifecycleEvent"]) {
  const app = express();
  app.use(express.json());
  app.use("/api/dearme", dearmeRoutes({} as never, { sendLifecycleEvent }));
  app.use(errorHandler);
  return app;
}

describe("DearMe landing exit waitlist route", () => {
  it("accepts a landing exit email and sends the Loops lifecycle event", async () => {
    const sendLifecycleEvent = vi.fn(async () => ({
      skipped: false as const,
      ok: true as const,
      status: 200,
    }));
    const app = createApp(sendLifecycleEvent);

    const response = await request(app)
      .post("/api/dearme/landing-exit-waitlist")
      .send({
        email: "reader@example.com",
        landingCopyVariant: "control",
        landingHeroTheme: "private_growth_team",
      });

    expect(response.status).toBe(202);
    expect(response.body.status).toBe("accepted");
    expect(sendLifecycleEvent).toHaveBeenCalledWith({
      email: "reader@example.com",
      eventName: "dearme_landing_exit",
      properties: {
        source: "landing_exit_intent",
        landingCopyVariant: "control",
        landingHeroTheme: "private_growth_team",
      },
    });
  });

  it("rejects invalid waitlist emails before calling Loops", async () => {
    const sendLifecycleEvent = vi.fn();
    const app = createApp(sendLifecycleEvent);

    const response = await request(app)
      .post("/api/dearme/landing-exit-waitlist")
      .send({
        email: "not-an-email",
        landingCopyVariant: "control",
      });

    expect(response.status).toBe(400);
    expect(sendLifecycleEvent).not.toHaveBeenCalled();
  });
});
