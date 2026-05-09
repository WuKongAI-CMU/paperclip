import { describe, expect, it } from "vitest";
import { buildPaperclipTaskMarkdown } from "../services/heartbeat.ts";

describe("buildPaperclipTaskMarkdown", () => {
  it("includes attached issue document context and update protocol", () => {
    const markdown = buildPaperclipTaskMarkdown({
      issue: {
        id: "issue-1",
        identifier: "DEAA-79",
        title: "DearMe Draft: Draft weekly Dear me report",
        description: "Update the attached report document.",
      },
      issueDocuments: [
        {
          key: "dear-me-report",
          title: "Dear me report",
          format: "markdown",
          latestRevisionId: "revision-1",
          latestRevisionNumber: 1,
          body: "# Dear me report\n\n## Work Completed\nSeed setup.",
        },
      ],
      wakeComment: null,
    });

    expect(markdown).toContain("Attached issue documents:");
    expect(markdown).toContain("Document `dear-me-report`");
    expect(markdown).toContain("latestRevisionId");
    expect(markdown).toContain("revision-1");
    expect(markdown).toContain("Attached document update protocol:");
    expect(markdown).toContain("do not satisfy that request with only a workspace file");
    expect(markdown).toContain("as one quoted header argument");
    expect(markdown).toContain('api_headers+=(-H "Authorization: Bearer $PAPERCLIP_API_KEY")');
    expect(markdown).toContain("--data-binary @payload.json");
    expect(markdown).toContain('PUT "$PAPERCLIP_API_URL/api/issues/issue-1/documents/dear-me-report"');
    expect(markdown).toContain("baseRevisionId");
    expect(markdown).toContain("# Dear me report");
  });
});
