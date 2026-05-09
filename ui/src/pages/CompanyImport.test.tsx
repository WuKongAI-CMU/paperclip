// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdapterPickerList } from "./CompanyImport";

vi.mock("../components/MarkdownBody", () => ({
  MarkdownBody: () => <div />,
}));

vi.mock("../components/AgentConfigForm", () => ({
  AgentConfigForm: () => <div />,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("CompanyImport adapter picker", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  it("describes imported agent runners as run methods", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <AdapterPickerList
          agents={[{ slug: "ops-agent", name: "Ops Agent", adapterType: "codex_local" }]}
          adapterOverrides={{}}
          expandedSlugs={new Set()}
          configValues={{}}
          onChangeAdapter={vi.fn()}
          onToggleExpand={vi.fn()}
          onChangeConfig={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Run methods");
    expect(container.textContent).toContain("configure runner");
    expect(container.textContent).not.toContain("Adapters");
    expect(container.textContent).not.toContain("configure adapter");

    act(() => {
      root.unmount();
    });
  });
});
