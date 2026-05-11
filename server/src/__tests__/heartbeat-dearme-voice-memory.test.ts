import { describe, expect, it, vi } from "vitest";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "../services/dearme-brand-blueprint-apply.js";
import { buildDearMeIssueVoiceMemoryBrief } from "../services/heartbeat.js";

function dbReturningMemoryRows(rows: unknown[]) {
  return {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: vi.fn(async () => rows),
          }),
        }),
      }),
    })),
  };
}

describe("buildDearMeIssueVoiceMemoryBrief", () => {
  it("does not attach private memory to non-DearMe assignments", async () => {
    const db = dbReturningMemoryRows([]);

    const brief = await buildDearMeIssueVoiceMemoryBrief({
      db: db as never,
      companyId: "company-1",
      issue: { originKind: "manual" },
    });

    expect(brief).toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("builds a customer-safe hidden assignment brief from active Voice & Memory", async () => {
    const db = dbReturningMemoryRows([
      {
        id: "archive-row",
        action: "dearme.memory_archived",
        entityId: "old-source",
        details: {},
      },
      {
        id: "hidden-row",
        action: "dearme.memory_updated",
        entityId: "hidden-source",
        details: {
          kind: "proof_point",
          title: "Paperclip adapter provider workspace runtime setup_payload",
          body: "OpenClaw model provider workbench issue route token should stay hidden.",
          sourceLabel: "Symphony execution route API key",
        },
      },
      {
        id: "old-row",
        action: "dearme.memory_updated",
        entityId: "old-source",
        details: {
          kind: "voice_sample",
          title: "Retired note",
          body: "Do not use this retired source.",
        },
      },
    ]);

    const brief = await buildDearMeIssueVoiceMemoryBrief({
      db: db as never,
      companyId: "company-1",
      issue: { originKind: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND },
    });

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(brief).toContain("DearMe Voice & Memory brief:");
    expect(brief).toContain("Proof point: A private pass:");
    expect(brief).toContain("DearMe services team progress private review links private access details");
    expect(brief).not.toContain("Retired note");
    expect(brief).not.toMatch(
      /\b(Paperclip|OpenClaw|Symphony|adapter|provider|setup_payload|model provider|workbench|issue route|execution route|API key|token|workspace|runtime)\b/i,
    );
  });

  it("orders hidden assignment memory for the DearMe output being drafted", async () => {
    const db = dbReturningMemoryRows([
      {
        id: "proof-row",
        action: "dearme.memory_updated",
        entityId: "proof-source",
        details: {
          kind: "proof_point",
          title: "Case study win",
          body: "Shipped a reliable private review flow with measurable approval quality.",
        },
      },
      {
        id: "voice-row",
        action: "dearme.memory_updated",
        entityId: "voice-source",
        details: {
          kind: "voice_sample",
          title: "Launch note",
          body: "Here is what shipped, why it matters, and what I learned.",
        },
      },
    ]);

    const brief = await buildDearMeIssueVoiceMemoryBrief({
      db: db as never,
      companyId: "company-1",
      issue: {
        originKind: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
        originFingerprint: "operation-draft_content_batch",
      },
    });

    expect(brief).not.toBeNull();
    expect(brief!.indexOf("Voice sample: Launch note")).toBeLessThan(
      brief!.indexOf("Proof point: Case study win"),
    );
  });
});
