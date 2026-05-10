import { describe, expect, it } from "vitest";
import { buildPaperclipTaskMarkdown } from "../services/heartbeat.ts";

describe("buildPaperclipTaskMarkdown", () => {
  it("can pass active Voice & Memory context into hidden DearMe assignments", () => {
    const markdown = buildPaperclipTaskMarkdown({
      issue: {
        id: "issue-1",
        identifier: "DEAA-81",
        title: "DearMe Draft: Draft content batch",
        description: "Prepare the next private draft.",
      },
      issueDocuments: [],
      wakeComment: null,
      dearMeVoiceMemoryBrief: [
        "DearMe Voice & Memory brief:",
        "- Use these active private sources before drafting or revising.",
        "- Voice sample: Operator note: Short, direct note. Source: Manual note.",
        "- Proof point: Launch proof: Shipped a local AI team progress view.",
        "- Keep the next version private until the user reviews it.",
      ].join("\n"),
    });

    expect(markdown).toContain("DearMe task context:");
    expect(markdown).toContain("DearMe Voice & Memory brief:");
    expect(markdown).toContain("Use these active private sources");
    expect(markdown).toContain("Short, direct note.");
    expect(markdown).toContain("Keep the next version private");

    const serialized = markdown!.toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime", "workbench"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("can pass DearMe regeneration context without leaking worker internals", () => {
    const markdown = buildPaperclipTaskMarkdown({
      issue: {
        id: "issue-1",
        identifier: "DEAA-80",
        title: "DearMe Draft: Draft content batch",
        description: "Prepare a better private draft.",
      },
      issueDocuments: [],
      wakeComment: null,
      dearMeRegenerationBrief: [
        "DearMe regeneration brief:",
        "- Review signal: The user asked for changes to Content drafts.",
        "- User feedback: \"Make the proof more concrete.\"",
        "- Next draft direction: Revise the next private draft around the requested changes.",
        "- Keep the next version private until the user reviews it.",
      ].join("\n"),
    });

    expect(markdown).toContain("DearMe task context:");
    expect(markdown).toContain("DearMe regeneration brief:");
    expect(markdown).toContain("Make the proof more concrete.");
    expect(markdown).toContain("Keep the next version private");

    const serialized = markdown!.toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

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
