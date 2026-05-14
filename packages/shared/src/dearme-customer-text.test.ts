import { describe, expect, it } from "vitest";
import {
  DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN,
  DEARME_LAUNCH_PROOF_GAP_ITEMS,
  DEARME_LAUNCH_PROOF_HANDOFF_STEPS,
  DEARME_OWNER_PROOF_CHECKLIST_ITEMS,
  DEARME_OWNER_PROOF_FACT_SPECS,
  DEARME_OWNER_PROOF_REPLY_TEMPLATE,
  buildDearMeOwnerProofHandoffReceipt,
  compactDearMeCustomerText,
  dearMeOwnerProofFactSpec,
  dearMeCustomerSafeLaunchNeed,
  dearMeCustomerSafeText,
} from "./dearme-customer-text.js";

describe("DearMe customer text", () => {
  it("detects hidden implementation language without blocking product copy", () => {
    expect(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.test("OpenClaw provider token failed")).toBe(true);
    expect(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.test("Claude model-provider failed in the decision route")).toBe(true);
    expect(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.test("Your Website preview is ready for review")).toBe(false);
  });

  it("compacts generated text before customer-safe rendering", () => {
    expect(compactDearMeCustomerText("Ready\n\n```raw trace```\n  for review")).toBe("Ready for review");
  });

  it("translates hidden machinery into customer-safe language", () => {
    const text =
      "OpenClaw Symphony adapter provider runtime model setup_payload queued worker with API key token in raw control plane.";
    const safe = dearMeCustomerSafeText(text, "DearMe is preparing the next update.");

    expect(safe).toContain("A proof pass");
    expect(safe).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);
  });

  it("translates local proof fixture names into owner-facing language", () => {
    expect(
      dearMeCustomerSafeText(
        "DearMe Runtime Smoke 1778131117797",
        "DearMe Proof",
      ),
    ).toBe("DearMe Proof Check 1778131117797");
    expect(
      dearMeCustomerSafeText(
        "Private preview route: dearme.app/dearme runtime smoke 1778131117797.",
        "DearMe Proof",
      ),
    ).toBe("Private preview route: dearme.app/dearme proof check 1778131117797.");
  });

  it("translates internal private-work wording into product language", () => {
    expect(
      dearMeCustomerSafeText(
        "Private preparation created a private output; support notes become private feedback work before private cycles run.",
        "DearMe is preparing the next update.",
      ),
    ).toBe(
      "team preparation created a useful output; support notes become feedback work before brand cycles run.",
    );
    expect(
      dearMeCustomerSafeText(
        "Save the receipt; DearMe opens private brand work and private DearMe cycles from that record.",
        "DearMe is preparing the next update.",
      ),
    ).toBe(
      "Save the receipt; DearMe opens brand work and DearMe brand cycles from that record.",
    );
  });

  it("uses the fallback when text is empty after compaction", () => {
    expect(dearMeCustomerSafeText("   ", "DearMe is preparing the next update.")).toBe(
      "DearMe is preparing the next update.",
    );
  });

  it("keeps launch proof needs customer-safe and shared with product surfaces", () => {
    expect(DEARME_LAUNCH_PROOF_GAP_ITEMS.map((item) => item.label)).toEqual([
      "Professional-network delivery route",
      "Approved professional-network recipient",
      "Approved phone-message proof recipient",
    ]);
    expect(DEARME_LAUNCH_PROOF_GAP_ITEMS).toEqual(
      DEARME_OWNER_PROOF_FACT_SPECS.map(({ label, summary }) => ({ label, summary })),
    );
    expect(DEARME_OWNER_PROOF_FACT_SPECS.map((fact) => ({
      provideAs: fact.provideAs,
      operatorLabel: fact.operatorLabel,
      sensitive: fact.sensitive,
      captureFlag: fact.captureFlag,
      placeholder: fact.placeholder,
      ownerPrompt: fact.ownerPrompt,
      safeExample: fact.safeExample,
      boundary: fact.boundary,
    }))).toEqual([
      {
        provideAs: "DEARME_LINKEDIN_DM_MESSAGES_URL",
        operatorLabel: "LinkedIn partner messages endpoint",
        sensitive: false,
        captureFlag: "--linkedin-messages-url",
        placeholder: "<partner-messages-url>",
        ownerPrompt: "Paste the delivery-route link for the first receipt check.",
        safeExample: "A messages page or delivery-route link selected for this proof pass.",
        boundary: "DearMe checks this in no-send mode before any live receipt can move.",
      },
      {
        provideAs: "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
        operatorLabel: "LinkedIn approved smoke recipient",
        sensitive: false,
        captureFlag: "--linkedin-recipient-urn",
        placeholder: "<approved-linkedin-recipient-urn>",
        ownerPrompt: "Choose one real professional-network recipient for the proof pass.",
        safeExample: "A specific recipient profile or recipient detail selected for this proof pass.",
        boundary: "Only this selected recipient is used for the first guarded receipt.",
      },
      {
        provideAs: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
        operatorLabel: "iMessage/SMS approved smoke recipient",
        sensitive: false,
        captureFlag: "--imessage-recipient",
        placeholder: "<approved-phone-or-imessage>",
        ownerPrompt: "Choose one phone-message recipient for the shared proof pass.",
        safeExample: "A phone number or contact already cleared for the receipt check.",
        boundary: "The receipt stays behind the final launch call after the no-send check.",
      },
    ]);
    expect(dearMeOwnerProofFactSpec("DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT")?.label).toBe(
      "Approved phone-message proof recipient",
    );
    expect(dearMeOwnerProofFactSpec("UNKNOWN_FACT")).toBeNull();

    expect(
      dearMeCustomerSafeLaunchNeed({
        label: "LinkedIn partner messages endpoint",
        provideAs: "DEARME_LINKEDIN_DM_MESSAGES_URL",
        sensitive: false,
      }),
    ).toBe("Professional-network delivery route");
    expect(
      dearMeCustomerSafeLaunchNeed({
        label: "LinkedIn approved smoke recipient",
        provideAs: "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
        sensitive: false,
      }),
    ).toBe("Approved professional-network recipient");
    expect(
      dearMeCustomerSafeLaunchNeed({
        label: "iMessage/SMS approved smoke recipient",
        provideAs: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
        sensitive: false,
      }),
    ).toBe("Approved phone-message proof recipient");

    for (const fact of DEARME_OWNER_PROOF_FACT_SPECS) {
      expect(`${fact.label} ${fact.summary} ${fact.ownerPrompt} ${fact.safeExample} ${fact.boundary}`)
        .not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);
    }
  });

  it("keeps launch proof handoff steps customer-safe", () => {
    expect(DEARME_LAUNCH_PROOF_HANDOFF_STEPS.map((step) => step.label)).toEqual([
      "Use proof now",
      "Capture live details",
      "Return with receipts before launch",
    ]);

    for (const step of DEARME_LAUNCH_PROOF_HANDOFF_STEPS) {
      expect(`${step.label} ${step.summary}`).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);
    }
  });

  it("keeps owner proof checklist items customer-safe", () => {
    expect(DEARME_OWNER_PROOF_CHECKLIST_ITEMS.map((item) => item.label)).toEqual([
      "Only three facts are missing",
      "No-send check comes first",
      "Live receipt needs launch call",
    ]);

    for (const item of DEARME_OWNER_PROOF_CHECKLIST_ITEMS) {
      expect(`${item.label} ${item.summary}`).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);
    }
  });

  it("keeps the owner proof reply template customer-safe", () => {
    expect(DEARME_OWNER_PROOF_REPLY_TEMPLATE).toEqual([
      {
        label: "Delivery route",
        value: "delivery-route link",
      },
      {
        label: "Professional-network recipient",
        value: "selected recipient",
      },
      {
        label: "Phone-message recipient",
        value: "phone number or contact",
      },
    ]);

    for (const line of DEARME_OWNER_PROOF_REPLY_TEMPLATE) {
      expect(`${line.label} ${line.value}`).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);
    }
  });

  it("builds a customer-safe owner proof handoff receipt from captured details", () => {
    const emptyReceipt = buildDearMeOwnerProofHandoffReceipt();
    expect(emptyReceipt).toContain("DearMe launch-proof handoff");
    expect(emptyReceipt).toContain("0/3 details captured");
    expect(emptyReceipt).toContain("3 details still needed before the no-send setup check");
    expect(emptyReceipt).toContain("Professional-network delivery route: Needed");
    expect(emptyReceipt).toContain(
      "Capture command: fill the missing details above, then run dearme:next-proof with the approved values.",
    );
    expect(emptyReceipt).toContain("Boundary: no public message, page change, spend, or broad launch");
    expect(emptyReceipt).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);

    const readyReceipt = buildDearMeOwnerProofHandoffReceipt({
      values: {
        DEARME_LINKEDIN_DM_MESSAGES_URL: "https://www.linkedin.com/messaging/thread/example",
        DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "selected launch-proof recipient",
        DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: "+15551234567",
      },
    });

    expect(readyReceipt).toContain("3/3 details captured");
    expect(readyReceipt).toContain("ready for the no-send setup check");
    expect(readyReceipt).toContain(
      "Professional-network delivery route: Captured - https://www.linkedin.com/messaging/thread/example",
    );
    expect(readyReceipt).toContain("Approved professional-network recipient: Captured - selected launch-proof recipient");
    expect(readyReceipt).toContain("Approved phone-message proof recipient: Captured - +15551234567");
    expect(readyReceipt).toContain(
      "Capture command: pnpm --silent dearme:next-proof -- --target all --linkedin-messages-url 'https://www.linkedin.com/messaging/thread/example' --linkedin-recipient-urn 'selected launch-proof recipient' --imessage-recipient '+15551234567'",
    );
    expect(readyReceipt).toContain("Next: run the no-send setup check");
    expect(readyReceipt).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);
  });

  it("quotes owner proof capture command values safely", () => {
    const receipt = buildDearMeOwnerProofHandoffReceipt({
      values: {
        DEARME_LINKEDIN_DM_MESSAGES_URL: "https://www.linkedin.com/messaging/thread/o'hara",
        DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "recipient with ' quote",
        DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: "+15551234567",
      },
    });

    expect(receipt).toContain(
      "--linkedin-messages-url 'https://www.linkedin.com/messaging/thread/o'\"'\"'hara'",
    );
    expect(receipt).toContain("--linkedin-recipient-urn 'recipient with '\"'\"' quote'");
    expect(receipt).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);
  });
});
