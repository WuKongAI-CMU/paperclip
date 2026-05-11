import { describe, expect, it } from "vitest";
import { buildPortfolioUpdateLaunchHandoff } from "./dearme-output-handoff.js";

describe("buildPortfolioUpdateLaunchHandoff", () => {
  it("builds a deploy_site handoff from the private preview route", () => {
    const result = buildPortfolioUpdateLaunchHandoff({
      documents: [
        {
          id: "doc-1",
          key: "portfolio-update",
          title: "Portfolio update",
          format: "markdown",
          revisionNumber: 3,
          bodyPreview: [
            "Page section: proof cards",
            "Proof source: local-first product launch notes",
            "Private preview route: dearme.app/peter-studio",
            "Proposed copy: Built a local-first AI operating layer with approval gates.",
            "Deploy boundary: The public site update waits for one launch decision.",
          ].join("\n"),
          updatedAt: "2026-05-07T16:31:00.000Z",
        },
      ],
      workProducts: [],
      latestUpdate: null,
    });

    expect(result).toEqual({
      toolName: "deploy_site",
      channel: "dearme-cloud",
      gate: "deploy",
      riskGate: "deploy_public_site",
      payload: {
        handle: "peter-studio",
        artifactRef: "document:doc-1:r3",
        customDomain: null,
        target: "preview",
      },
    });
  });

  it("returns null when the private preview route is absent", () => {
    expect(buildPortfolioUpdateLaunchHandoff({
      documents: [
        {
          id: "doc-1",
          key: "portfolio-update",
          title: "Portfolio update",
          format: "markdown",
          revisionNumber: 1,
          bodyPreview: "Proposed copy: A site update waits for approval.",
          updatedAt: "2026-05-07T16:31:00.000Z",
        },
      ],
      workProducts: [],
      latestUpdate: null,
    })).toBeNull();
  });
});
