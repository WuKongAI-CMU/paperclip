// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDearMeFirstCyclePreview } from "@paperclipai/shared";
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
        sourceLabel: "Prepared from private Brand OS work",
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
    expect(container.textContent).toContain("Private address");
    expect(container.textContent).not.toContain("Private preview path");
    expect(container.textContent).not.toContain("/PET/dearme/site-preview");
    expect(container.textContent).not.toContain("Route");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
