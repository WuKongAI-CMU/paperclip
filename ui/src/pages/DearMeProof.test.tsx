// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeProof } from "./DearMeProof";

const getPublicFeedMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/dearme", () => ({
  dearmeApi: {
    getPublicFeed: (limit: number) => getPublicFeedMock(limit),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("DearMeProof", () => {
  let container: HTMLDivElement;
  let root: Root | null;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    getPublicFeedMock.mockResolvedValue({
      items: [
        {
          id: "feed-1",
          kind: "published_post",
          summary: "Published the first founder dogfood proof note.",
          linkUrl: "https://example.com/proof-post",
          publishedAt: "2026-05-16T12:00:00.000Z",
        },
        {
          id: "feed-2",
          kind: "deployed_site",
          summary: "Deployed the first approved proof page.",
          linkUrl: "https://example.com/proof-page",
          publishedAt: "2026-05-15T12:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root!.unmount();
      });
    }
    queryClient.clear();
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  async function renderPage() {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <DearMeProof />
        </QueryClientProvider>,
      );
    });
    await flushReact();
  }

  it("renders public feed receipts from the DearMe proof API", async () => {
    await renderPage();

    expect(getPublicFeedMock).toHaveBeenCalledWith(12);
    expect(container.textContent).toContain("DearMe is using DearMe in public.");
    expect(container.textContent).toContain("Published post");
    expect(container.textContent).toContain("Published the first founder dogfood proof note.");
    expect(container.textContent).toContain("Proof page");
    expect(container.textContent).toContain("Deployed the first approved proof page.");
    expect([...container.querySelectorAll("a")].map((anchor) => anchor.href)).toContain(
      "https://example.com/proof-post",
    );
  });

  it("renders the empty state when no public proof is published yet", async () => {
    getPublicFeedMock.mockResolvedValueOnce({ items: [], nextCursor: null });

    await renderPage();

    expect(container.textContent).toContain("No public proof is published yet.");
    expect(container.textContent).toContain("Peter can opt in from his DearMe account");
  });

  it("renders a customer-safe error state when the feed request fails", async () => {
    getPublicFeedMock.mockRejectedValueOnce(new Error("network failed"));

    await renderPage();

    expect(container.textContent).toContain("Proof feed is unavailable.");
    expect(container.textContent).toContain("the latest receipts could not load");
  });

  it("does not expose hidden substrate or provider strings", async () => {
    await renderPage();
    const renderedText = container.textContent ?? "";

    expect(renderedText).not.toMatch(/Paperclip|OpenClaw|Symphony|Bedrock|Claude|GPT|Voyage|dm_sk_/);
  });
});
