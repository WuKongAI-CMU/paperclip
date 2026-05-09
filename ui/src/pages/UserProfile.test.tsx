// @vitest-environment jsdom

import { act } from "react";
import type { ComponentProps, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserProfile } from "./UserProfile";

const getUserProfileMock = vi.hoisted(() => vi.fn());
const setBreadcrumbsMock = vi.hoisted(() => vi.fn());

vi.mock("../api/userProfiles", () => ({
  userProfilesApi: {
    get: (companyId: string, userSlug: string) => getUserProfileMock(companyId, userSlug),
  },
}));

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "DearMe", issuePrefix: "DEAR" },
  }),
}));

vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: setBreadcrumbsMock }),
}));

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string } & ComponentProps<"a">) => (
    <a href={to} {...props}>{children}</a>
  ),
  useParams: () => ({ userSlug: "jane-example" }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("UserProfile", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    getUserProfileMock.mockResolvedValue({
      user: {
        id: "user-1",
        slug: "jane-example",
        name: "Jane Example",
        email: "jane@example.com",
        image: null,
        membershipRole: "owner",
        membershipStatus: "active",
        joinedAt: new Date("2026-05-01T00:00:00.000Z"),
      },
      stats: [
        {
          key: "last7",
          label: "Last 7 days",
          touchedIssues: 1,
          createdIssues: 1,
          completedIssues: 1,
          assignedOpenIssues: 0,
          commentCount: 2,
          activityCount: 4,
          costCents: 125,
          inputTokens: 100,
          cachedInputTokens: 50,
          outputTokens: 25,
          costEventCount: 1,
        },
        {
          key: "last30",
          label: "Last 30 days",
          touchedIssues: 1,
          createdIssues: 1,
          completedIssues: 1,
          assignedOpenIssues: 0,
          commentCount: 2,
          activityCount: 4,
          costCents: 125,
          inputTokens: 100,
          cachedInputTokens: 50,
          outputTokens: 25,
          costEventCount: 1,
        },
        {
          key: "all",
          label: "All time",
          touchedIssues: 1,
          createdIssues: 1,
          completedIssues: 1,
          assignedOpenIssues: 0,
          commentCount: 2,
          activityCount: 4,
          costCents: 125,
          inputTokens: 100,
          cachedInputTokens: 50,
          outputTokens: 25,
          costEventCount: 1,
        },
      ],
      daily: Array.from({ length: 14 }, (_, index) => ({
        date: `2026-05-${String(index + 1).padStart(2, "0")}`,
        activityCount: index === 13 ? 1 : 0,
        completedIssues: index === 13 ? 1 : 0,
        costCents: index === 13 ? 125 : 0,
        inputTokens: index === 13 ? 100 : 0,
        cachedInputTokens: index === 13 ? 50 : 0,
        outputTokens: index === 13 ? 25 : 0,
      })),
      recentIssues: [],
      recentActivity: [],
      topAgents: [
        {
          agentId: "agent-1",
          agentName: "Content lead",
          costCents: 125,
          inputTokens: 100,
          cachedInputTokens: 50,
          outputTokens: 25,
        },
      ],
      topProviders: [
        {
          provider: "openai",
          biller: "openrouter",
          model: "gpt-5-mini",
          costCents: 125,
          inputTokens: 100,
          cachedInputTokens: 50,
          outputTokens: 25,
        },
      ],
    });
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("uses product-safe model usage language instead of provider wording", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <UserProfile />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    expect(getUserProfileMock).toHaveBeenCalledWith("company-1", "jane-example");
    expect(container.textContent).toContain("Model and spend mix");
    expect(container.textContent).toContain("OpenAI / gpt-5-mini");
    expect(container.textContent).toContain("Billed via OpenRouter");
    expect(container.textContent).not.toContain(["Provider", "mix"].join(" "));
    expect(container.textContent).not.toMatch(/\bprovider\b/i);

    await act(async () => {
      root.unmount();
    });
  });
});
