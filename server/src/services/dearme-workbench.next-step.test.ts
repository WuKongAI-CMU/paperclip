import { describe, expect, it } from "vitest";
import { SHARED_LAUNCH_READY_NEXT_STEP } from "./dearme-workbench.js";

describe("DearMe workbench shared launch-ready next step", () => {
  it("keeps the proof-pack next step aligned across workbench projections", () => {
    expect(SHARED_LAUNCH_READY_NEXT_STEP).toBe(
      "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move still waits for your launch approval.",
    );
  });
});
