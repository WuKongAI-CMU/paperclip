// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN,
  DEARME_OWNER_PROOF_FACT_SPECS,
  createDearMeFirstCyclePreview,
} from "@paperclipai/shared";
import { DearMeSitePreview } from "./DearMeSitePreview";
import { writeDearMeFirstCyclePreview } from "../lib/dearme-site-preview";

const mockCompanyContext = vi.hoisted(() => ({
  selectedCompanyId: "company-1" as string | null,
  selectedCompany: {
    id: "company-1",
    issuePrefix: "PET",
    name: "Peter Studio",
  } as { id: string; issuePrefix: string; name: string } | null,
  companies: [
    {
      id: "company-1",
      issuePrefix: "PET",
      name: "Peter Studio",
    },
  ],
  loading: false,
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => mockCompanyContext,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function createPreview() {
  const preview = createDearMeFirstCyclePreview("company-1", {
    brand: {
      displayName: "Peter Studio",
      positioning: "Known for turning research into practical AI products",
      goals: ["Grow owned audience"],
      audiences: ["Founders"],
      proofPoints: ["Shipped a working local product"],
      offers: ["Paid beta"],
      voiceSamples: ["Short, direct voice note.", "Plain language with concrete proof."],
      preferredChannels: ["linkedin", "newsletter", "portfolio"],
      constraints: ["Ask before publishing"],
      cadence: "weekly",
      budgetMonthlyCents: 25_000,
      autoDraftEnabled: true,
    },
  });

  return {
    ...preview,
    proofSequence: [
      {
        ...preview.proofSequence[0]!,
        sourceLabel: "Prepared from profile work",
      },
      preview.proofSequence[1]!,
      preview.proofSequence[2]!,
    ],
  };
}

async function flushReact() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("DearMeSitePreview", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("renders the proof-ready page from stored first-cycle data", async () => {
    const preview = createPreview();
    writeDearMeFirstCyclePreview(preview);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/PET/dearme/site-preview/peter-studio"]}>
          <Routes>
            <Route path="/:companyPrefix/dearme/site-preview/:handle" element={<DearMeSitePreview />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    await flushReact();

    const renderedText = container.textContent ?? "";

    expect(renderedText).toContain("Proof page for peter-studio");
    expect(container.textContent).toContain("dearme.app/peter-studio");
    expect(container.textContent).toContain(`Source proof: ${preview.portfolioProofCard.proofSource}`);
    expect(container.textContent).toContain(preview.portfolioProofCard.proposedCopy);
    expect(container.textContent).toContain("Aha bridge");
    expect(container.textContent).toContain("Review handoff");
    expect(container.textContent).toContain("Take this proof back to Work Ready");
    const proofPageReviewHandoff = container.querySelector('[aria-label="Proof page review handoff"]');
    expect(proofPageReviewHandoff).not.toBeNull();
    expect(proofPageReviewHandoff?.textContent).toContain("Next customer action");
    expect(proofPageReviewHandoff?.textContent).toContain("Review the proof pack in Work Ready first.");
    const reviewHandoffLinks = Array.from(proofPageReviewHandoff?.querySelectorAll("a") ?? []);
    expect(reviewHandoffLinks.find((link) => link.textContent?.includes("Review Work Ready"))?.getAttribute("href")).toBe(
      "/PET/dearme?view=brand-os#dearme-work-ready",
    );
    expect(reviewHandoffLinks.find((link) => link.textContent?.includes("Open Decisions"))?.getAttribute("href")).toBe(
      "/PET/dearme?view=decisions#dearme-decisions-needed",
    );
    expect(container.textContent).toContain("Your one sentence became a proof page and live next work");
    expect(container.textContent).toContain(preview.prompt);
    expect(container.textContent).toContain(preview.positioning);
    expect(container.textContent).toContain(`${preview.starterPosts.length} drafts and ${preview.opportunityShortlist.length} leads`);
    expect(container.textContent).toContain(`First lead: ${preview.opportunityShortlist[0]?.target}`);
    expect(container.querySelector('[aria-label="Proof page aha bridge"]')).not.toBeNull();
    expect(container.textContent).toContain("Sellable beta");
    expect(container.textContent).toContain("This proof page is enough to sell a private beta account");
    expect(container.textContent).toContain(
      "DearMe can sell and operate a manual paid beta now: first proof, launch-ready work, recovery, and reporting are visible before broad launch.",
    );
    expect(container.querySelector('[aria-label="Private beta sales receipt"]')).not.toBeNull();
    expect(container.textContent).toContain("Sellable package");
    expect(container.textContent).toContain(
      `First proof page, ${preview.starterPosts.length} drafts, ${preview.opportunityShortlist.length} leads`,
    );
    expect(container.textContent).toContain(
      "A manual paid beta account can start from this package without waiting for broad launch.",
    );
    expect(container.textContent).toContain("Aha moment");
    expect(container.textContent).toContain("Value is visible in the first session");
    expect(container.textContent).toContain("Operating promise");
    expect(container.textContent).toContain("Keeps preparing after the first pass");
    expect(container.textContent).toContain("Public scale boundary");
    expect(container.textContent).toContain(`${DEARME_OWNER_PROOF_FACT_SPECS.length} live receipt details left`);
    expect(container.textContent).toContain(
      "Broad launch waits for the selected delivery details and one guarded live receipt.",
    );
    const paidBetaFirstWeekPromise = container.querySelector('[aria-label="Paid beta first week promise"]');
    expect(paidBetaFirstWeekPromise).not.toBeNull();
    expect(paidBetaFirstWeekPromise?.textContent).toContain("First paid week promise");
    expect(paidBetaFirstWeekPromise?.textContent).toContain("First 5 minutes");
    expect(paidBetaFirstWeekPromise?.textContent).toContain("Proof is visible immediately");
    expect(paidBetaFirstWeekPromise?.textContent).toContain("First week");
    expect(paidBetaFirstWeekPromise?.textContent).toContain("Useful work keeps arriving");
    expect(paidBetaFirstWeekPromise?.textContent).toContain("Support follow-up");
    expect(paidBetaFirstWeekPromise?.textContent).toContain("Empty weeks get recovered");
    expect(paidBetaFirstWeekPromise?.textContent).toContain("Launch boundary");
    expect(paidBetaFirstWeekPromise?.textContent).toContain("Public moves stay deliberate");
    const privateBetaStartHandoff = container.querySelector('[aria-label="Private beta start handoff"]');
    expect(privateBetaStartHandoff).not.toBeNull();
    expect(privateBetaStartHandoff?.textContent).toContain("Ready to start a paid account");
    expect(privateBetaStartHandoff?.textContent).toContain(
      "Record paid access in DearMe, then start the first brand cycle.",
    );
    expect(privateBetaStartHandoff?.textContent).toContain("This page does not send, publish, or spend.");
    const paidBetaAccessLink = privateBetaStartHandoff?.querySelector("a");
    expect(paidBetaAccessLink?.textContent).toContain("Open paid beta access");
    expect(paidBetaAccessLink?.getAttribute("href")).toBe("/PET/dearme?view=brand-os#dearme-paid-beta-access");
    expect(container.textContent).toContain("Autonomous proof loop");
    expect(container.textContent).toContain("Proof ready, next work lined up, launch call preserved");
    expect(container.textContent).toContain("Proof ready");
    expect(container.textContent).toContain("Next work");
    expect(container.textContent).toContain("Launch call");
    expect(container.textContent).toContain("3 improvements are already lined up");
    expect(container.textContent).toContain("Launch proof");
    expect(container.textContent).toContain("Proof page is built. Three receipts make launch real.");
    expect(container.textContent).toContain(
      "Use the proof page now. Broad launch only needs the live-route details and your final launch call.",
    );
    expect(container.querySelector('[aria-label="Launch receipt proof needs"]')).not.toBeNull();
    expect(container.textContent).toContain("Professional-network delivery route");
    expect(container.textContent).toContain("Approved professional-network recipient");
    expect(container.textContent).toContain("Approved phone-message proof recipient");
    expect(container.textContent).toContain("Paste the delivery-route link for the first receipt check.");
    expect(container.textContent).toContain("The receipt stays behind the final launch call after the no-send check.");
    for (const fact of DEARME_OWNER_PROOF_FACT_SPECS) {
      expect(container.textContent).not.toContain(fact.safeExample);
      expect(container.textContent).not.toContain(fact.operatorLabel);
      expect(container.textContent).not.toContain(fact.provideAs);
      expect(container.textContent).not.toContain(fact.captureFlag);
      expect(container.textContent).not.toContain(fact.placeholder);
    }
    expect(container.textContent).toContain("First proof trail");
    expect(container.textContent).toContain("From one sentence to proof-ready page");
    for (const moment of preview.proofSequence) {
      expect(container.textContent).toContain(moment.window);
      expect(container.textContent).toContain(moment.title);
      expect(container.textContent).toContain(moment.preparedArtifact);
    }
    expect(container.textContent).toContain(
      "Sensitive or public claims stay behind the launch call while research and drafts keep moving.",
    );
    expect(container.textContent).toContain("Outreach stays staged until you choose the send path.");
    expect(container.textContent).toContain("Public page changes stay behind one launch decision.");
    expect(container.textContent).toContain("Live work receipts");
    expect(container.textContent).toContain("Who worked and what is ready");
    for (const item of preview.liveWorkTrail) {
      expect(container.textContent).toContain(item.action);
      expect(container.textContent).toContain(item.artifact);
    }
    expect(container.textContent).toContain(
      "Public posts, outreach, page changes, and spend are ready for one launch decision.",
    );
    expect(container.textContent).toContain("Voice Editor");
    expect(container.textContent).toContain("Content Producer");
    expect(container.textContent).toContain("Cycle report");
    expect(container.textContent).toContain("First-cycle report");
    for (const item of preview.cycleReport.items) {
      if (item.id !== "prepared-but-blocked") {
        expect(container.textContent).toContain(item.label);
      }
    }
    expect(container.textContent).toContain("Prepared behind the launch call");
    expect(container.textContent).toContain(
      "Public posts, outreach, page changes, and spend stay behind one launch decision while the team keeps preparing.",
    );
    expect(container.textContent).toContain("Keep the team preparing; choose the public move when ready.");
    expect(container.textContent).toContain("Value report");
    expect(container.textContent).toContain("First value report");
    expect(container.querySelector('[aria-label="Proof page value report"]')).not.toBeNull();
    expect(container.textContent).toContain("First five minutes");
    for (const item of preview.valueReport.items) {
      const customerValueText = (text: string) =>
        text
          .replace(/\bprivate proof page\b/gi, "proof page")
          .replace(/\bprivate route\b/gi, "proof route")
          .replace(/\bprivate pass\b/gi, "proof pass")
          .replace(/\bheld back\b/gi, "kept behind the launch call")
          .replace(/\bapproval boundaries\b/gi, "launch boundaries")
          .replace(/\bqueued\b/gi, "lined up");
      expect(container.textContent).toContain(customerValueText(item.label));
      expect(container.textContent).toContain(customerValueText(item.metric));
      expect(container.textContent).toContain(customerValueText(item.source));
    }
    expect(container.textContent).toContain("Next work lined up");
    expect(container.textContent).toContain("Keeps working");
    expect(container.textContent).toContain("Keeps working after the first proof");
    expect(container.textContent).toContain("Next proof cycle");
    for (const item of preview.continuationPlan.items) {
      expect(container.textContent).toContain(item.title);
      expect(container.textContent).toContain(item.preparedArtifact);
    }
    expect(container.textContent).toContain("Posting stays behind the launch call while the draft keeps improving.");
    expect(container.textContent).toContain(
      "Sending stays behind the launch call while the outreach angle keeps improving.",
    );
    expect(container.textContent).toContain("Opportunity ROI");
    expect(container.textContent).toContain("Opportunity ROI report");
    expect(container.querySelector('[aria-label="Opportunity ROI report"]')).not.toBeNull();
    for (const item of preview.opportunityRoiReport.items) {
      expect(container.textContent).toContain(item.leadTitle);
      expect(container.textContent).toContain(item.target);
      expect(container.textContent).toContain(`${item.score}/100`);
      expect(container.textContent).toContain(item.expectedReturn);
      expect(container.textContent).toContain(item.effort);
      expect(container.textContent).toContain(item.confidence);
      expect(container.textContent).toContain(item.nextAction);
      expect(container.textContent).toContain(item.source);
    }
    expect(container.textContent).toContain("Launch-call candidate");
    expect(container.textContent).toContain("Verify contact");
    expect(container.textContent).toContain("Warm intro path");
    expect(container.textContent).toContain("Prepared drafts");
    expect(container.textContent).toContain("Starter posts are ready for the launch call");
    for (const post of preview.starterPosts) {
      expect(container.textContent).toContain(post.title);
      expect(container.textContent).toContain(post.hook);
      expect(container.textContent).toContain(post.proofUsed);
    }
    expect(container.textContent).toContain("Keep this as a launch-ready draft for the publish path.");
    expect(container.textContent).toContain("Opportunity shortlist");
    expect(container.textContent).toContain("Five launch leads are prepared");
    for (const lead of preview.opportunityShortlist) {
      expect(container.textContent).toContain(lead.title);
      expect(container.textContent).toContain(lead.target);
      expect(container.textContent).toContain(lead.whyRelevant);
      expect(container.textContent).toContain(lead.outreachAngle);
      expect(container.textContent).toContain(lead.draftMessage);
      expect(container.textContent).toContain(lead.contactEvidence.sourceSignal);
    }
    expect(container.textContent).toContain("Proof address");
    expect(container.textContent).not.toContain("Private preview path");
    expect(container.textContent).not.toContain("/PET/dearme/site-preview");
    expect(container.textContent).not.toContain("Route");
    expect(renderedText).not.toContain("Private preview");
    expect(renderedText).not.toContain("Still waits");
    expect(renderedText).not.toMatch(/\bapproval\b/i);
    expect(renderedText).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
