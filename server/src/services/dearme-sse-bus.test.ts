/**
 * SSE bus contract coverage.
 *
 * Three rules drive these tests:
 *   1. Cross-tenant isolation — a listener for company A must never see
 *      events emitted under company B.
 *   2. Listener-level fault containment — a listener that throws is
 *      swallowed and never breaks emit() for other listeners.
 *   3. Emit guard — events without `companyId` are dropped (logged and
 *      silently discarded), never delivered.
 */

import { describe, expect, it } from "vitest";
import { createDearMeSseBus, type DearMeSseEvent } from "./dearme-sse-bus.js";

function makeEvent(companyId: string, partial?: Partial<DearMeSseEvent>): DearMeSseEvent {
  return {
    type: "work_loop_transition",
    emittedAt: new Date().toISOString(),
    scope: { companyId, issueId: "is_test", workLoopState: "work" },
    payload: { from: "intake", to: "triage", role: "chief_of_staff", reason: "test" },
    ...partial,
  } as DearMeSseEvent;
}

describe("dearmeSseBus", () => {
  it("delivers events scoped to the listening company", () => {
    const bus = createDearMeSseBus();
    const seen: DearMeSseEvent[] = [];
    bus.subscribe("co_a", (event) => seen.push(event));
    bus.emit(makeEvent("co_a"));
    expect(seen).toHaveLength(1);
  });

  it("does not deliver events from other companies", () => {
    const bus = createDearMeSseBus();
    const seenA: DearMeSseEvent[] = [];
    const seenB: DearMeSseEvent[] = [];
    bus.subscribe("co_a", (e) => seenA.push(e));
    bus.subscribe("co_b", (e) => seenB.push(e));
    bus.emit(makeEvent("co_a"));
    bus.emit(makeEvent("co_b"));
    expect(seenA).toHaveLength(1);
    expect(seenB).toHaveLength(1);
    expect(seenA[0]?.scope.companyId).toBe("co_a");
    expect(seenB[0]?.scope.companyId).toBe("co_b");
  });

  it("contains listener throws — others still receive", () => {
    const bus = createDearMeSseBus();
    const good: DearMeSseEvent[] = [];
    bus.subscribe("co_a", () => {
      throw new Error("listener bug");
    });
    bus.subscribe("co_a", (e) => good.push(e));
    bus.emit(makeEvent("co_a"));
    expect(good).toHaveLength(1);
  });

  it("drops events with missing companyId scope", () => {
    const bus = createDearMeSseBus();
    const seen: DearMeSseEvent[] = [];
    bus.subscribe("co_a", (e) => seen.push(e));
    bus.emit({
      ...makeEvent("co_a"),
      scope: { companyId: "" },
    } as DearMeSseEvent);
    expect(seen).toHaveLength(0);
  });

  it("unsubscribe stops further delivery", () => {
    const bus = createDearMeSseBus();
    const seen: DearMeSseEvent[] = [];
    const unsubscribe = bus.subscribe("co_a", (e) => seen.push(e));
    bus.emit(makeEvent("co_a"));
    unsubscribe();
    bus.emit(makeEvent("co_a"));
    expect(seen).toHaveLength(1);
  });
});
