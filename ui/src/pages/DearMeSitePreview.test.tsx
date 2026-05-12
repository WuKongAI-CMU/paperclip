// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN,
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
        sourceLabel: "Prepared from private profile work",
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

  it("renders the smokeable private preview from stored first-cycle data", async () => {
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

    expect(container.textContent).toContain("Preview for peter-studio");
    expect(container.textContent).toContain("dearme.app/peter-studio");
    expect(container.textContent).toContain(`Source proof: ${preview.portfolioProofCard.proofSource}`);
    expect(container.textContent).toContain(preview.portfolioProofCard.proposedCopy);
    expect(container.textContent).toContain(preview.approvalBoundary.summary);
    expect(container.textContent).toContain("Private proof loop");
    expect(container.textContent).toContain("Current proof, next pass, launch call");
    expect(container.textContent).toContain("Proof ready");
    expect(container.textContent).toContain("Next pass");
    expect(container.textContent).toContain("Launch call");
    expect(container.textContent).toContain("3 private improvements are already lined up");
    expect(container.textContent).toContain("First proof trail");
    expect(container.textContent).toContain("From one sentence to private proof");
    for (const moment of preview.proofSequence) {
      expect(container.textContent).toContain(moment.window);
      expect(container.textContent).toContain(moment.title);
      expect(container.textContent).toContain(moment.preparedArtifact);
      expect(container.textContent).toContain(moment.approvalBoundary);
    }
    expect(container.textContent).toContain("Live work receipts");
    expect(container.textContent).toContain("Who worked and what is ready");
    for (const item of preview.liveWorkTrail) {
      expect(container.textContent).toContain(item.action);
      expect(container.textContent).toContain(item.artifact);
    }
    expect(container.textContent).toContain("Voice Editor");
    expect(container.textContent).toContain("Content Producer");
    expect(container.textContent).toContain("Cycle report");
    expect(container.textContent).toContain("First-cycle report");
    for (const item of preview.cycleReport.items) {
      expect(container.textContent).toContain(item.label);
      expect(container.textContent).toContain(item.summary);
      expect(container.textContent).toContain(item.source);
    }
    expect(container.textContent).toContain("Keeps working");
    expect(container.textContent).toContain("Keeps working after the first proof");
    expect(container.textContent).toContain("Next private pass");
    for (const item of preview.continuationPlan.items) {
      expect(container.textContent).toContain(item.title);
      expect(container.textContent).toContain(item.preparedArtifact);
      expect(container.textContent).toContain(item.approvalBoundary);
    }
    expect(container.textContent).toContain("Prepared drafts");
    expect(container.textContent).toContain("Starter posts are ready to review");
    for (const post of preview.starterPosts) {
      expect(container.textContent).toContain(post.title);
      expect(container.textContent).toContain(post.hook);
      expect(container.textContent).toContain(post.body);
      expect(container.textContent).toContain(post.proofUsed);
    }
    expect(container.textContent).toContain("Opportunity shortlist");
    expect(container.textContent).toContain("Five private targets are prepared");
    for (const lead of preview.opportunityShortlist) {
      expect(container.textContent).toContain(lead.title);
      expect(container.textContent).toContain(lead.target);
      expect(container.textContent).toContain(lead.whyRelevant);
      expect(container.textContent).toContain(lead.outreachAngle);
      expect(container.textContent).toContain(lead.draftMessage);
      expect(container.textContent).toContain(lead.contactEvidence.sourceSignal);
    }
    expect(container.textContent).toContain("Private address");
    expect(container.textContent).not.toContain("Private preview path");
    expect(container.textContent).not.toContain("/PET/dearme/site-preview");
    expect(container.textContent).not.toContain("Route");
    expect(container.textContent ?? "").not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
