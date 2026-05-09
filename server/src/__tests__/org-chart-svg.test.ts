import { describe, expect, it } from "vitest";
import { renderOrgChartSvg, type OrgNode } from "../routes/org-chart-svg.ts";

describe("renderOrgChartSvg", () => {
  it("uses a DearMe-facing watermark wordmark", () => {
    const orgTree: OrgNode[] = [
      {
        id: "agent-1",
        name: "Growth Lead",
        role: "cmo",
        status: "active",
        reports: [],
      },
    ];

    const svg = renderOrgChartSvg(orgTree, "warmth", { companyName: "DearMe Beta" });

    expect(svg).toContain(">DearMe<");
    expect(svg).not.toContain(">Paperclip<");
  });
});
