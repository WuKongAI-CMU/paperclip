// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DearMeChecklist,
  DearMeCockpitGrid,
  DearMeEvidenceGrid,
  DearMeEmptyState,
  DearMeFocusSurface,
  DearMeHero,
  DearMeMetricStrip,
  DearMePageShell,
  DearMePanel,
  DearMeSectionBoundary,
  DearMeWorkbenchCard,
  DearMeWorkbenchSectionHeader,
} from "./DearMeShell";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function render(ui: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(ui);
  });

  return container;
}

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
  }
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
});

function CrashingSection(): ReactNode {
  throw new Error("DearMe section failed");
}

describe("DearMeShell", () => {
  it("renders shell, hero, actions, and panels with stable surface markers", () => {
    const page = render(
      <DearMePageShell>
        <DearMeHero
          eyebrow="DearMe / Team workbench"
          title="Your personal brand growth team"
          description="Your team prepares the moves. You approve what represents you."
          actions={<button type="button">Preview Brand OS</button>}
        />
        <DearMePanel aria-label="Decisions needed">Review 3 prepared moves</DearMePanel>
      </DearMePageShell>,
    );

    expect(page.querySelector('[data-dearme-surface="page-shell"]')).not.toBeNull();
    expect(page.querySelector('[data-dearme-surface="hero"]')).not.toBeNull();
    expect(page.querySelector('[data-dearme-surface="panel"]')).not.toBeNull();
    expect(page.textContent).toContain("Your personal brand growth team");
    expect(page.textContent).toContain("Preview Brand OS");
    expect(page.textContent).toContain("Review 3 prepared moves");
  });

  it("renders workbench chrome with stable surface markers", () => {
    const page = render(
      <DearMePanel aria-label="My AI team today">
        <DearMeWorkbenchSectionHeader
          icon={TestIcon}
          eyebrow="My AI team today"
          title="Your DearMe team is ready to start"
          description="Team is working. Decisions stay with you."
          trailing={<span>Working now</span>}
        />
        <DearMeMetricStrip className="mt-5">
          <div>Team</div>
          <div>Work ready</div>
        </DearMeMetricStrip>
        <DearMeCockpitGrid variant="primary">
          <div>Team at work</div>
          <div>Dear me letter</div>
        </DearMeCockpitGrid>
      </DearMePanel>,
    );

    expect(page.querySelector('[data-dearme-surface="workbench-section-header"]')).not.toBeNull();
    expect(page.querySelector('[data-dearme-surface="metric-strip"]')).not.toBeNull();
    expect(page.querySelector('[data-dearme-surface="cockpit-grid"]')).not.toBeNull();
    expect(page.textContent).toContain("Your DearMe team is ready to start");
    expect(page.textContent).toContain("Working now");
  });

  it("renders focused decisions with evidence markers", () => {
    const page = render(
      <DearMeFocusSurface aria-label="Focused decision">
        <DearMeWorkbenchSectionHeader
          icon={TestIcon}
          eyebrow="Decision focused"
          title="Approve the prepared move"
          description="Your team prepared the move. You keep the final call."
        />
        <DearMeEvidenceGrid className="mt-4">
          <div>Prepared work</div>
          <div>State</div>
          <div>Trust boundary</div>
        </DearMeEvidenceGrid>
      </DearMeFocusSurface>,
    );

    expect(page.querySelector('[data-dearme-surface="focus-surface"]')).not.toBeNull();
    expect(page.querySelector('[data-dearme-surface="evidence-grid"]')).not.toBeNull();
    expect(page.textContent).toContain("Approve the prepared move");
    expect(page.textContent).toContain("Trust boundary");
  });

  it("renders workbench cards with reusable DearMe markers", () => {
    const page = render(
      <DearMeWorkbenchCard
        eyebrow="Opportunity Scout"
        title="Podcast lead is ready"
        description="Your team found a warm opening and prepared the outreach angle."
        badge={<span>Decision ready</span>}
        footer="Updated today"
        action={<button type="button">Review</button>}
      />,
    );

    expect(page.querySelector('[data-dearme-surface="workbench-card"]')).not.toBeNull();
    expect(page.textContent).toContain("Opportunity Scout");
    expect(page.textContent).toContain("Podcast lead is ready");
    expect(page.textContent).toContain("Decision ready");
    expect(page.textContent).toContain("Review");
  });

  it("renders empty states with reusable DearMe markers", () => {
    const page = render(
      <DearMeEmptyState
        icon={TestIcon}
        title="No Voice & Memory saved yet"
        description="Add one real sample so the team can protect your voice."
        actions={<button type="button">Add sample</button>}
      >
        <span>Voice sample</span>
      </DearMeEmptyState>,
    );

    expect(page.querySelector('[data-dearme-surface="empty-state"]')).not.toBeNull();
    expect(page.textContent).toContain("No Voice & Memory saved yet");
    expect(page.textContent).toContain("Add one real sample");
    expect(page.textContent).toContain("Voice sample");
    expect(page.textContent).toContain("Add sample");
  });

  it("renders centered empty states for preview surfaces", () => {
    const page = render(
      <DearMeEmptyState
        align="center"
        icon={TestIcon}
        title="First cycle preview"
        description="Preview the team and first-cycle artifacts before anything is applied."
      />,
    );

    expect(page.querySelector('[data-dearme-surface="empty-state"]')).not.toBeNull();
    expect(page.querySelector(".text-center")).not.toBeNull();
    expect(page.textContent).toContain("First cycle preview");
  });

  it("renders checklists with reusable DearMe markers", () => {
    const page = render(
      <DearMeChecklist
        icon={TestIcon}
        items={["Voice Profile", "Starter posts", "Opportunity lead"]}
        aria-label="First-cycle artifacts"
      />,
    );

    expect(page.querySelector('[data-dearme-surface="checklist"]')).not.toBeNull();
    expect(page.querySelectorAll('[data-dearme-surface="checklist-item"]')).toHaveLength(3);
    expect(page.textContent).toContain("Voice Profile");
    expect(page.textContent).toContain("Opportunity lead");
  });

  it("contains section failures behind DearMe customer-safe copy", () => {
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const page = render(
      <DearMeSectionBoundary onError={onError}>
        <CrashingSection />
      </DearMeSectionBoundary>,
    );

    expect(page.textContent).toContain("DearMe could not load this section");
    expect(page.textContent).not.toContain("Paperclip");
    expect(page.textContent).not.toContain("OpenClaw");
    expect(page.textContent).not.toContain("adapter");
    expect(page.textContent).not.toContain("provider");
    expect(page.textContent).not.toContain("setup_payload");
    expect(page.textContent).not.toContain("OK Partner");
    expect(onError).toHaveBeenCalledOnce();
  });
});

function TestIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" className={className} />;
}
