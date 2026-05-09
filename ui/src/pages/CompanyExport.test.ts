import type { CompanyPortabilityManifest } from "@paperclipai/shared";
import { describe, expect, it } from "vitest";
import { generateReadmeFromSelection } from "./CompanyExport";

describe("generateReadmeFromSelection", () => {
  it("uses DearMe product language in exported README content", () => {
    const readme = generateReadmeFromSelection(
      {
        agents: [
          {
            slug: "writer",
            name: "Writer",
            role: "agent",
            reportsToSlug: null,
          },
        ],
        projects: [
          {
            slug: "portfolio",
            name: "Portfolio",
            description: "Public proof updates",
          },
        ],
        issues: [],
        skills: [],
      } as unknown as CompanyPortabilityManifest,
      new Set(["agents/writer/AGENT.md", "projects/portfolio/PROJECT.md"]),
      "DearCo",
      "Personal brand ops",
    );

    expect(readme).toContain("This is a DearMe company package.");
    expect(readme).toContain("Use the DearMe company import screen with this GitHub URL or folder.");
    expect(readme).toContain("See DearMe for more information.");
    expect(readme).toContain("Exported from DearMe on");
    expect(readme).not.toContain("paperclipai");
    expect(readme).not.toContain("Paperclip");
    expect(readme).not.toContain("paperclip.ing");
  });
});
