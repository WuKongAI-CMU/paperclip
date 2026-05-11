// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  buildDearMeBrandBlueprintExecutionPlan,
  createDearMeBrandBlueprint,
  summarizeDearMeBrandBlueprint,
} from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalPayloadRenderer, approvalLabel } from "./ApprovalPayload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("approvalLabel", () => {
  it("uses payload titles for generic board approvals", () => {
    expect(
      approvalLabel("request_board_approval", {
        title: "Reply with an ASCII frog",
      }),
    ).toBe("Board Approval: Reply with an ASCII frog");
  });

  it("uses product language for DearMe brand blueprint approvals", () => {
    expect(
      approvalLabel("dearme_brand_blueprint_apply", {
        title: "Create private team profile for Peter",
      }),
    ).toBe("Private team profile: Create private team profile for Peter");
  });

  it("uses product language for DearMe output decisions", () => {
    expect(
      approvalLabel("dearme_output_next_move", {
        title: "Review the weekly letter",
      }),
    ).toBe("DearMe Decision: Review the weekly letter");
  });
});

describe("ApprovalPayloadRenderer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("renders request_board_approval payload fields without falling back to raw JSON", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ApprovalPayloadRenderer
          type="request_board_approval"
          payload={{
            title: "Reply with an ASCII frog",
            summary: "Board asked for approval before posting the frog.",
            recommendedAction: "Approve the frog reply.",
            nextActionOnApproval: "Post the frog comment on the issue.",
            risks: ["The frog might be too powerful."],
            proposedComment: "(o)<",
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Reply with an ASCII frog");
    expect(container.textContent).toContain("Board asked for approval before posting the frog.");
    expect(container.textContent).toContain("Approve the frog reply.");
    expect(container.textContent).toContain("Post the frog comment on the issue.");
    expect(container.textContent).toContain("The frog might be too powerful.");
    expect(container.textContent).toContain("(o)<");
    expect(container.textContent).not.toContain("\"recommendedAction\"");

    act(() => {
      root.unmount();
    });
  });

  it("can hide the repeated title when the card header already shows it", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ApprovalPayloadRenderer
          type="request_board_approval"
          hidePrimaryTitle
          payload={{
            title: "Reply with an ASCII frog",
            summary: "Board asked for approval before posting the frog.",
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Board asked for approval before posting the frog.");
    expect(container.textContent).not.toContain("TitleReply with an ASCII frog");

    act(() => {
      root.unmount();
    });
  });

  it("renders DearMe output approvals without raw JSON fallback", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ApprovalPayloadRenderer
          type="dearme_output_next_move"
          payload={{
            title: "Review the weekly letter",
            summary: "DearMe prepared a private draft for review.",
            recommendedAction: "Launch it after one pass.",
            nextActionOnApproval: "Queue the public move.",
            proposedComment: "Launch after final review.",
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Review the weekly letter");
    expect(container.textContent).toContain("DearMe prepared a private draft for review.");
    expect(container.textContent).toContain("Launch it after one pass.");
    expect(container.textContent).toContain("Queue the public move.");
    expect(container.textContent).not.toContain("\"recommendedAction\"");
    expect(container.textContent).not.toContain("\"proposedComment\"");

    act(() => {
      root.unmount();
    });
  });

  it("renders hire-agent run methods without raw substrate identifiers", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ApprovalPayloadRenderer
          type="hire_agent"
          payload={{
            name: "Draft Partner",
            role: "content_operator",
            adapterType: "codex_local",
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Run method");
    expect(container.textContent).toContain("Local workspace");
    expect(container.textContent).not.toContain("Adapter");
    expect(container.textContent).not.toContain("codex_local");
    expect(container.textContent).not.toContain("Codex");

    act(() => {
      root.unmount();
    });
  });

  it("renders DearMe Brand OS approval details without raw JSON fallback", () => {
    const root = createRoot(container);
    const blueprint = createDearMeBrandBlueprint({
      displayName: "Peter Studio",
      positioning: "A useful operating system for Peter's public work.",
      goals: ["Grow owned audience"],
      audiences: ["Founders"],
      proofPoints: ["Shipped a working local agent product"],
      offers: ["Paid beta"],
      voiceSamples: ["Short, direct operator note.", "Plain language with concrete proof."],
      preferredChannels: ["linkedin", "newsletter", "portfolio"],
      constraints: ["Ask before publishing"],
      cadence: "weekly",
      budgetMonthlyCents: 25_000,
      autoDraftEnabled: true,
    });
    const summary = summarizeDearMeBrandBlueprint(blueprint);

    act(() => {
      root.render(
        <ApprovalPayloadRenderer
          type="dearme_brand_blueprint_apply"
          payload={{
            title: summary.title,
            summary: summary.summary,
            recommendedAction: summary.recommendedAction,
            nextActionOnApproval: summary.nextActionOnApproval,
            risks: blueprint.gates.map((gate) => `${gate.label}: ${gate.reason}`),
            approvalNote: "Only draft privately until I review the first batch.",
            brandBlueprint: blueprint,
            executionPlan: buildDearMeBrandBlueprintExecutionPlan(blueprint),
          }}
        />,
      );
    });

    expect(container.textContent).toContain("DearMe will create");
    expect(container.textContent).toContain("Peter Studio");
    expect(container.textContent).toContain("Voice ready");
    expect(container.textContent).toContain("$250.00");
    expect(container.textContent).toContain("Review before approving");
    expect(container.textContent).toContain("On approval");
    expect(container.textContent).toContain("Growth team");
    expect(container.textContent).toContain("First operations");
    expect(container.textContent).toContain("Publish social post");
    expect(container.textContent).not.toContain("\"brandBlueprint\"");
    expect(container.textContent).not.toContain("\"recommendedAction\"");
    expect(container.textContent).not.toContain("setup_payload");
    expect(container.textContent).not.toContain("Paperclip");

    act(() => {
      root.unmount();
    });
  });

  it("renders DearMe team summaries with repeated roles without React key warnings", () => {
    const root = createRoot(container);
    const blueprint = createDearMeBrandBlueprint({
      displayName: "Peter Studio",
      positioning: "A useful operating system for Peter's public work.",
      goals: ["Grow owned audience"],
      audiences: ["Founders"],
      proofPoints: ["Shipped a working local agent product"],
      offers: ["Paid beta"],
      voiceSamples: ["Short, direct operator note.", "Plain language with concrete proof."],
      preferredChannels: ["linkedin", "newsletter", "portfolio"],
      constraints: ["Ask before publishing"],
      cadence: "weekly",
      budgetMonthlyCents: 25_000,
      autoDraftEnabled: true,
    });
    const duplicatedMember = blueprint.team.find((member) => member.role === "content_producer") ?? blueprint.team[0];
    const blueprintWithRepeatedRole = {
      ...blueprint,
      team: [
        ...blueprint.team,
        {
          ...duplicatedMember,
          name: `${duplicatedMember.name} backup`,
        },
      ],
    };
    const summary = summarizeDearMeBrandBlueprint(blueprintWithRepeatedRole);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      act(() => {
        root.render(
          <ApprovalPayloadRenderer
            type="dearme_brand_blueprint_apply"
            payload={{
              title: summary.title,
              summary: summary.summary,
              recommendedAction: summary.recommendedAction,
              nextActionOnApproval: summary.nextActionOnApproval,
              risks: blueprintWithRepeatedRole.gates.map((gate) => `${gate.label}: ${gate.reason}`),
              brandBlueprint: blueprintWithRepeatedRole,
              executionPlan: buildDearMeBrandBlueprintExecutionPlan(blueprintWithRepeatedRole),
            }}
          />,
        );
      });

      expect(container.textContent).toContain("Growth team");
      expect(container.textContent).toContain(`${duplicatedMember.name} backup`);
      expect(
        consoleError.mock.calls.some((call) =>
          call.some((value) => String(value).includes("Encountered two children with the same key")),
        ),
      ).toBe(false);
    } finally {
      consoleError.mockRestore();
      act(() => {
        root.unmount();
      });
    }
  });
});
