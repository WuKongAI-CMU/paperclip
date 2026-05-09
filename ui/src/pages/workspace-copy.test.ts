// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  EXECUTION_WORKSPACE_CONCRETE_REF_LABEL,
  EXECUTION_WORKSPACE_SOURCE_REF_LABEL,
  EXECUTION_WORKSPACE_SOURCE_REF_PLACEHOLDER,
  executionWorkspaceRunnerTypeLabel,
} from "./ExecutionWorkspaceDetail";
import { PROJECT_REMOTE_WORKSPACE_SOURCE_LABEL } from "./ProjectWorkspaceDetail";

describe("workspace customer-facing copy", () => {
  it("keeps workspace source and runner labels provider-safe", () => {
    expect(EXECUTION_WORKSPACE_SOURCE_REF_LABEL).toBe("Workspace source / ref");
    expect(EXECUTION_WORKSPACE_SOURCE_REF_PLACEHOLDER).toBe("/path/to/worktree or workspace ref");
    expect(EXECUTION_WORKSPACE_CONCRETE_REF_LABEL).toBe("Workspace ref");
    expect(PROJECT_REMOTE_WORKSPACE_SOURCE_LABEL).toBe("Remote workspace source");
    expect(executionWorkspaceRunnerTypeLabel("local_provider")).toBe("Local source runner");

    const renderedCopy = [
      EXECUTION_WORKSPACE_SOURCE_REF_LABEL,
      EXECUTION_WORKSPACE_SOURCE_REF_PLACEHOLDER,
      EXECUTION_WORKSPACE_CONCRETE_REF_LABEL,
      PROJECT_REMOTE_WORKSPACE_SOURCE_LABEL,
      executionWorkspaceRunnerTypeLabel("remote_provider"),
      executionWorkspaceRunnerTypeLabel("remote-managed"),
    ].join(" ");

    expect(renderedCopy).not.toMatch(/\bproviders?\b/i);
    expect(renderedCopy).not.toMatch(/\badapters?\b/i);
  });
});
