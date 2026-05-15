// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEARME_OWNER_PROOF_HANDOFF_RECEIPT_FILENAME,
  downloadDearMeOwnerProofHandoffReceipt,
  downloadDearMeReceipt,
} from "./dearme-receipt-download";

describe("dearme-receipt-download", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let click: ReturnType<typeof vi.fn>;
  let anchor: HTMLAnchorElement;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:fake");
    revokeObjectURL = vi.fn();
    click = vi.fn();

    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    anchor = document.createElement("a");
    anchor.click = click;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a blob and a transient anchor to trigger the download", () => {
    downloadDearMeReceipt("hello", "test.txt");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe("test.txt");
    expect(anchor.rel).toBe("noopener");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect(document.body.contains(anchor)).toBe(false);
  });

  it("defaults the owner proof handoff filename for the convenience wrapper", () => {
    downloadDearMeOwnerProofHandoffReceipt("payload");

    expect(anchor.download).toBe(DEARME_OWNER_PROOF_HANDOFF_RECEIPT_FILENAME);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("no-ops when URL.createObjectURL is missing", () => {
    const original = URL.createObjectURL;
    (URL as unknown as { createObjectURL?: unknown }).createObjectURL = undefined;

    expect(() => downloadDearMeReceipt("x", "x.txt")).not.toThrow();
    expect(click).not.toHaveBeenCalled();

    URL.createObjectURL = original;
  });
});
