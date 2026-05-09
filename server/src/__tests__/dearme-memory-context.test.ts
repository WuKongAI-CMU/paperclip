import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { activityLog, companies, createDb, issues, routines } from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "../services/dearme-brand-blueprint-apply.js";
import { dearmeMemoryContextService } from "../services/dearme-memory-context.js";
import { routineService } from "../services/routines.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres DearMe memory context tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefix(id: string) {
  return `DM${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function countOccurrences(value: string, pattern: string) {
  return value.split(pattern).length - 1;
}

describeEmbeddedPostgres("DearMe memory context routine refresh", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-memory-context-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`));
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompany() {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "DearMe Beta",
      issuePrefix: issuePrefix(companyId),
      requireBoardApprovalForNewAgents: false,
    });
    return companyId;
  }

  async function seedParentIssue(companyId: string, originKind: string, title: string) {
    const [issue] = await db
      .insert(issues)
      .values({
        companyId,
        title,
        status: "backlog",
        priority: "medium",
        originKind,
        originId: randomUUID(),
      })
      .returning();
    return issue;
  }

  async function seedMemoryRows(companyId: string) {
    await db.insert(activityLog).values([
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-voice-1",
        details: {
          kind: "voice_sample",
          title: "Operator note",
          body: "Short, direct note.",
          sourceLabel: "Manual note",
        },
        createdAt: new Date("2026-05-08T14:00:00.000Z"),
      },
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-proof-1",
        details: {
          kind: "proof_point",
          title: "Launch proof",
          body: "Shipped a local AI workbench that turns private logs into reviewable outputs.",
        },
        createdAt: new Date("2026-05-08T14:05:00.000Z"),
      },
    ]);
  }

  it("refreshes already-created DearMe routines with latest Voice & Memory updates", async () => {
    const companyId = await seedCompany();
    const brandOsIssue = await seedParentIssue(
      companyId,
      DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
      "DearMe: Review Brand OS for Peter",
    );
    const otherIssue = await seedParentIssue(companyId, "manual", "Manual routine parent");
    const routinesSvc = routineService(db);

    const dearmeRoutine = await routinesSvc.create(
      companyId,
      {
        projectId: null,
        goalId: null,
        parentIssueId: brandOsIssue.id,
        title: "DearMe: Weekly growth cycle",
        description: [
          "Weekly growth cycle for Peter.",
          "",
          "Deliverables:",
          "- Draft posts",
          "",
          "Operating boundary:",
          "This routine may plan, research, and draft privately.",
        ].join("\n"),
        assigneeAgentId: null,
        priority: "medium",
        status: "active",
        concurrencyPolicy: "coalesce_if_active",
        catchUpPolicy: "skip_missed",
        variables: [],
      },
      { userId: "user-1" },
    );
    const otherRoutine = await routinesSvc.create(
      companyId,
      {
        projectId: null,
        goalId: null,
        parentIssueId: otherIssue.id,
        title: "Generic weekly loop",
        description: "This should not receive DearMe memory.",
        assigneeAgentId: null,
        priority: "medium",
        status: "active",
        concurrencyPolicy: "coalesce_if_active",
        catchUpPolicy: "skip_missed",
        variables: [],
      },
      { userId: "user-1" },
    );
    await seedMemoryRows(companyId);

    const firstRefresh = await dearmeMemoryContextService(db).refreshRoutineMemoryContext(
      companyId,
      { userId: "user-1" },
    );

    expect(firstRefresh).toEqual({
      memoryCount: 2,
      routineCount: 1,
      updated: 1,
      skipped: 0,
    });

    const [updatedDearMeRoutine] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, dearmeRoutine.id));
    const [untouchedRoutine] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, otherRoutine.id));
    const description = updatedDearMeRoutine.description ?? "";

    expect(description).toContain("Latest saved Voice & Memory updates:");
    expect(description).toContain(
      "Voice sample: Operator note: Short, direct note. Source: Manual note.",
    );
    expect(description).toContain(
      "Proof point: Launch proof: Shipped a local AI workbench that turns private logs into reviewable outputs.",
    );
    expect(description).toContain("Operating boundary:");
    expect(description.indexOf("Latest saved Voice & Memory updates:")).toBeLessThan(
      description.indexOf("Operating boundary:"),
    );
    expect(updatedDearMeRoutine.latestRevisionNumber).toBe(2);
    expect(untouchedRoutine.description).toBe("This should not receive DearMe memory.");
    expect(untouchedRoutine.latestRevisionNumber).toBe(1);

    const secondRefresh = await dearmeMemoryContextService(db).refreshRoutineMemoryContext(
      companyId,
      { userId: "user-1" },
    );
    const [afterSecondRefresh] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, dearmeRoutine.id));

    expect(secondRefresh).toEqual({
      memoryCount: 2,
      routineCount: 1,
      updated: 0,
      skipped: 1,
    });
    expect(countOccurrences(afterSecondRefresh.description ?? "", "Latest saved Voice & Memory updates:")).toBe(1);
    expect(afterSecondRefresh.latestRevisionNumber).toBe(2);

    await db.insert(activityLog).values({
      companyId,
      actorType: "user",
      actorId: "user-1",
      action: "dearme.memory_updated",
      entityType: "dearme_memory",
      entityId: "memory-voice-1",
      details: {
        kind: "voice_sample",
        title: "Revised operator note",
        body: "Sharper revised voice source.",
        sourceLabel: "Manual note",
        revisionOf: "memory-voice-1",
      },
      createdAt: new Date("2026-05-08T14:10:00.000Z"),
    });

    const revisionRefresh = await dearmeMemoryContextService(db).refreshRoutineMemoryContext(
      companyId,
      { userId: "user-1" },
    );
    const [afterRevisionRefresh] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, dearmeRoutine.id));
    const revisedDescription = afterRevisionRefresh.description ?? "";

    expect(revisionRefresh).toEqual({
      memoryCount: 2,
      routineCount: 1,
      updated: 1,
      skipped: 0,
    });
    expect(revisedDescription).toContain(
      "Voice sample: Revised operator note: Sharper revised voice source. Source: Manual note.",
    );
    expect(revisedDescription).not.toContain("Voice sample: Operator note: Short, direct note.");
  });

  it("removes retired Voice & Memory sources from DearMe routines", async () => {
    const companyId = await seedCompany();
    const brandOsIssue = await seedParentIssue(
      companyId,
      DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
      "DearMe: Review Brand OS for Peter",
    );
    const routinesSvc = routineService(db);

    const dearmeRoutine = await routinesSvc.create(
      companyId,
      {
        projectId: null,
        goalId: null,
        parentIssueId: brandOsIssue.id,
        title: "DearMe: Weekly growth cycle",
        description: "Weekly growth cycle for Peter.",
        assigneeAgentId: null,
        priority: "medium",
        status: "active",
        concurrencyPolicy: "coalesce_if_active",
        catchUpPolicy: "skip_missed",
        variables: [],
      },
      { userId: "user-1" },
    );

    await db.insert(activityLog).values({
      companyId,
      actorType: "user",
      actorId: "user-1",
      action: "dearme.memory_updated",
      entityType: "dearme_memory",
      entityId: "memory-retired",
      details: {
        kind: "voice_sample",
        title: "Old voice note",
        body: "This source should stop guiding private work.",
        sourceLabel: "Manual note",
      },
      createdAt: new Date("2026-05-08T14:00:00.000Z"),
    });

    await dearmeMemoryContextService(db).refreshRoutineMemoryContext(
      companyId,
      { userId: "user-1" },
    );
    const [withMemory] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, dearmeRoutine.id));
    expect(withMemory.description ?? "").toContain("Old voice note");

    await db.insert(activityLog).values({
      companyId,
      actorType: "user",
      actorId: "user-1",
      action: "dearme.memory_archived",
      entityType: "dearme_memory",
      entityId: "memory-retired",
      details: {
        memoryId: "memory-retired",
        reason: "user_retired_source",
      },
      createdAt: new Date("2026-05-08T14:05:00.000Z"),
    });

    const refresh = await dearmeMemoryContextService(db).refreshRoutineMemoryContext(
      companyId,
      { userId: "user-1" },
    );
    const [withoutMemory] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, dearmeRoutine.id));

    expect(refresh).toEqual({
      memoryCount: 0,
      routineCount: 1,
      updated: 1,
      skipped: 0,
    });
    expect(withoutMemory.description ?? "").not.toContain("Latest saved Voice & Memory updates:");
    expect(withoutMemory.description ?? "").not.toContain("Old voice note");
  });
});
