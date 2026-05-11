import { test, expect, type APIRequestContext } from "@playwright/test";

const PORT = Number(process.env.PAPERCLIP_E2E_PORT ?? 3199);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const HIDDEN_TERMS = [
  "paperclip",
  "openclaw",
  "symphony",
  "runtime",
  "provider",
  "adapter",
  "setup_payload",
  "setup payload",
  "model-provider",
  "model provider",
  "codex",
];

interface CompanyResponse {
  id: string;
  issuePrefix?: string | null;
  prefix?: string | null;
  urlKey?: string | null;
}

interface Approval {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
}

interface DearMeOutputReviewLoop {
  state: string;
  feedbackTrace: {
    headline: string;
    receipts?: string[];
  } | null;
}

interface DearMeOutput {
  id: string;
  kind: string;
  issueId: string;
  issueIdentifier: string | null;
  reviewLoop: DearMeOutputReviewLoop;
}

interface DearMeOutputsResponse {
  outputs: DearMeOutput[];
}

interface DearMeWorkbenchProgressItem {
  kind: string;
  title: string;
  summary: string;
  executionReadiness?: string | null;
  deliveryStatus?: string | null;
  deliveryExternalId?: string | null;
  deliveryExternalUrl?: string | null;
  nextStep?: string | null;
  issueId?: string | null;
  issueIdentifier?: string | null;
  outputId?: string | null;
  approvalId?: string | null;
}

interface DearMeWorkbenchDecision {
  kind: string;
  title: string;
  approvalId?: string | null;
  outputId?: string | null;
  riskGate?: string | null;
}

interface DearMeWorkbenchResponse {
  decisionsNeeded: DearMeWorkbenchDecision[];
  recentProgress: DearMeWorkbenchProgressItem[];
}

interface DearMeFirstCyclePreviewResponse {
  companyId: string;
  sitePreview: {
    handle: string;
    route: string;
  };
  starterPosts: Array<{
    id: string;
    channel: string;
    title: string;
    hook: string;
    body: string;
    proofUsed: string;
  }>;
  opportunityShortlist: Array<{
    title: string;
    target: string;
    whyRelevant: string;
    relevanceScore: number;
    contactEvidence: {
      status: string;
      sourceSignal: string;
      contactEmail?: string | null;
      contactHandle?: string | null;
      contactUrl?: string | null;
    };
    outreachAngle: string;
    draftMessage: string;
  }>;
  portfolioProofCard: {
    placement: string;
    proofSource: string;
    proposedCopy: string;
  };
  approvalBoundary: {
    label: string;
    summary: string;
    blockedActions: string[];
  };
}

function expectNoHiddenTerms(value: string) {
  const normalized = value.toLowerCase();
  for (const term of HIDDEN_TERMS) {
    expect(normalized, `Hidden substrate term leaked: ${term}`).not.toContain(term);
  }
}

async function fetchDearMeOutputs(
  request: APIRequestContext,
  companyId: string,
): Promise<DearMeOutputsResponse> {
  const res = await request.get(`${BASE_URL}/api/dearme/companies/${companyId}/outputs`);
  expect(res.ok()).toBe(true);
  return await res.json();
}

async function fetchDearMeWorkbench(
  request: APIRequestContext,
  companyId: string,
): Promise<DearMeWorkbenchResponse> {
  const res = await request.get(`${BASE_URL}/api/dearme/companies/${companyId}/workbench`);
  expect(res.ok()).toBe(true);
  return await res.json();
}

async function fetchPendingApprovals(
  request: APIRequestContext,
  companyId: string,
): Promise<Approval[]> {
  const res = await request.get(`${BASE_URL}/api/companies/${companyId}/approvals?status=pending`);
  expect(res.ok()).toBe(true);
  return await res.json();
}

async function waitForRecentProgress(
  request: APIRequestContext,
  companyId: string,
  predicate: (item: DearMeWorkbenchProgressItem) => boolean,
  description: string,
): Promise<DearMeWorkbenchProgressItem> {
  const deadline = Date.now() + 10_000;
  let latestWorkbench: DearMeWorkbenchResponse | null = null;
  while (Date.now() < deadline) {
    latestWorkbench = await fetchDearMeWorkbench(request, companyId);
    const match = latestWorkbench.recentProgress.find(predicate);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${description}: ${JSON.stringify(latestWorkbench)}`);
}

test.describe("DearMe private handoff browser smoke", () => {
  test("turns final approval of prepared work into a private launch brief", async ({ page }) => {
    const companyRes = await page.request.post(`${BASE_URL}/api/companies`, {
      data: { name: `E2E-DearMe-Private-Handoff-${Date.now()}` },
    });
    expect(companyRes.ok()).toBe(true);
    const company = (await companyRes.json()) as CompanyResponse;
    const companyPrefix = company.issuePrefix ?? company.prefix ?? company.urlKey ?? "E2E";

    try {
      const paidBetaRes = await page.request.post(
        `${BASE_URL}/api/dearme/companies/${company.id}/paid-beta/access-events`,
        {
          data: {
            amountCents: 25_000,
            currency: "USD",
            description: "Founding beta payment",
          },
        },
      );
      expect(paidBetaRes.ok()).toBe(true);

      const firstCycleRes = await page.request.post(
        `${BASE_URL}/api/dearme/companies/${company.id}/first-cycle/start`,
        {
          data: {
            brand: {
              displayName: "Private Handoff Founder",
              positioning: "turning private proof into public momentum with careful review gates",
              goals: ["show one useful proof loop before publishing"],
              audiences: ["founders evaluating local AI workflows"],
              proofPoints: ["shipped a private-to-public product review loop"],
              offers: ["hands-on product architecture review"],
              voiceSamples: [
                "Short, direct, evidence-first notes.",
                "Show the receipt before asking for trust.",
              ],
              preferredChannels: ["linkedin", "newsletter", "portfolio"],
              constraints: ["No public claims before review"],
              cadence: "weekly",
              budgetMonthlyCents: 25_000,
              autoDraftEnabled: true,
            },
          },
        },
      );
      expect(firstCycleRes.ok()).toBe(true);
      const firstCyclePreview = (await firstCycleRes.json()) as DearMeFirstCyclePreviewResponse;

      await page.addInitScript(
        ({ storageKey, preview }) => {
          window.sessionStorage.setItem(storageKey, JSON.stringify(preview));
        },
        {
          storageKey: `dearme:first-cycle-preview:${firstCyclePreview.companyId}:${firstCyclePreview.sitePreview.handle}`,
          preview: firstCyclePreview,
        },
      );

      await page.goto(
        `/${companyPrefix}/dearme/site-preview/${encodeURIComponent(firstCyclePreview.sitePreview.handle)}`,
      );
      await expect(page.getByText(`Preview for ${firstCyclePreview.sitePreview.handle}`)).toBeVisible();
      await expect(page.getByText(`dearme.app/${firstCyclePreview.sitePreview.handle}`)).toBeVisible();
      await expect(page.getByText(`Source proof: ${firstCyclePreview.portfolioProofCard.proofSource}`)).toBeVisible();
      await expect(page.getByText(firstCyclePreview.portfolioProofCard.proposedCopy)).toBeVisible();
      await expect(page.getByText(firstCyclePreview.approvalBoundary.summary)).toBeVisible();
      await expect(page.getByText("Private address")).toBeVisible();
      await expect(page.getByText("Private preview path")).toHaveCount(0);
      await expect(page.getByText(`/${companyPrefix}/dearme/site-preview`, { exact: false })).toHaveCount(0);
      await expect(page.getByText("Route", { exact: true })).toHaveCount(0);

      const firstPost = firstCyclePreview.starterPosts.at(0);
      expect(firstPost).toBeDefined();
      if (!firstPost) throw new Error("Expected first-cycle preview to include a starter post");
      await expect(page.getByText("Starter posts are ready to review")).toBeVisible();
      const draftPanel = page.locator('[aria-label="Prepared starter drafts"]');
      await expect(draftPanel).toBeVisible();
      await expect(draftPanel).toContainText(firstPost.title);
      await expect(draftPanel).toContainText(firstPost.hook);
      await expect(draftPanel).toContainText(firstPost.body);
      await expect(draftPanel).toContainText(firstPost.proofUsed);

      const firstLead = firstCyclePreview.opportunityShortlist.at(0);
      expect(firstLead).toBeDefined();
      if (!firstLead) throw new Error("Expected first-cycle preview to include an opportunity lead");
      await expect(page.getByText("Five private targets are prepared")).toBeVisible();
      const opportunityPanel = page.locator('[aria-label="Private opportunity shortlist"]');
      await expect(opportunityPanel).toBeVisible();
      await expect(opportunityPanel).toContainText(firstLead.title);
      await expect(opportunityPanel).toContainText(firstLead.target);
      await expect(opportunityPanel).toContainText(`${firstLead.relevanceScore}/10`);
      await expect(opportunityPanel).toContainText(firstLead.contactEvidence.sourceSignal);
      await expect(opportunityPanel).toContainText(firstLead.whyRelevant);
      await expect(opportunityPanel).toContainText(firstLead.outreachAngle);
      await expect(opportunityPanel).toContainText(firstLead.draftMessage);

      expectNoHiddenTerms((await page.locator("body").textContent()) ?? "");

      const outputs = await fetchDearMeOutputs(page.request, company.id);
      const preparedOutput = outputs.outputs.find(
        (output) => output.kind === "content_drafts" && output.reviewLoop.state !== "approved",
      );
      expect(preparedOutput).toBeTruthy();
      expect(preparedOutput?.reviewLoop.state).toBe("needs_user_review");

      const reviewRes = await page.request.post(
        `${BASE_URL}/api/dearme/companies/${company.id}/outputs/${encodeURIComponent(preparedOutput!.id)}/reviews`,
        {
          data: {
            action: "approve",
            decisionNote: "Approved in DearMe. This prepared work represents me.",
          },
        },
      );
      expect(reviewRes.ok()).toBe(true);
      const reviewResult = await reviewRes.json();
      expect(reviewResult).toEqual(expect.objectContaining({
        status: "recorded",
        action: "approve",
        output: expect.objectContaining({
          id: preparedOutput!.id,
          reviewLoop: expect.objectContaining({
            state: "approved",
          }),
        }),
      }));

      const pendingApprovals = await fetchPendingApprovals(page.request, company.id);
      const nextMoveApproval = pendingApprovals.find((approval) =>
        approval.type === "dearme_output_next_move" &&
        approval.payload.outputId === preparedOutput!.id
      );
      expect(nextMoveApproval).toBeTruthy();
      expect(nextMoveApproval?.payload).toEqual(expect.objectContaining({
        riskGate: "publish_social",
        outputKind: "content_drafts",
        outputId: preparedOutput!.id,
      }));

      const pendingWorkbench = await fetchDearMeWorkbench(page.request, company.id);
      expect(pendingWorkbench.decisionsNeeded).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "approve_action",
            approvalId: nextMoveApproval!.id,
            outputId: preparedOutput!.id,
            riskGate: "publish_social",
          }),
        ]),
      );

      const finalApprovalRes = await page.request.post(
        `${BASE_URL}/api/approvals/${nextMoveApproval!.id}/approve`,
        {
          data: {
            decisionNote: "Final launch call approved inside DearMe.",
          },
        },
      );
      expect(finalApprovalRes.ok()).toBe(true);

      const workbench = await fetchDearMeWorkbench(page.request, company.id);
      const handoff = workbench.recentProgress.find(
        (item) => item.kind === "execution_handoff_prepared" && item.executionReadiness === "private_handoff_ready",
      );
      expect(handoff).toBeTruthy();
      expect(handoff).toEqual(expect.objectContaining({
        title: "Launch-ready posting brief prepared",
        summary: expect.stringContaining("launch-ready brief"),
        executionReadiness: "private_handoff_ready",
        nextStep: expect.stringContaining("channel-ready posting brief"),
        outputId: preparedOutput!.id,
        approvalId: nextMoveApproval!.id,
      }));
      expectNoHiddenTerms(JSON.stringify(workbench));

      await page.goto(
        `/${companyPrefix}/dearme?view=decisions&approval=${encodeURIComponent(nextMoveApproval!.id)}`,
      );
      const handoffPanel = page.locator('[aria-label="Launch-ready next step ready"]');
      await expect(handoffPanel).toBeVisible();
      await expect(handoffPanel).toContainText("Launch-ready next step");
      await expect(handoffPanel).toContainText("Launch-ready posting brief prepared");
      await expect(handoffPanel).toContainText("External action not run");
      await expect(handoffPanel).toContainText("channel-ready posting brief");
      await expect(handoffPanel).toContainText("Content drafts");
      expectNoHiddenTerms((await handoffPanel.textContent()) ?? "");

      await handoffPanel.getByRole("button", { name: "Open brief" }).click();
      await expect(page).toHaveURL(/\/dearme\?view=decisions&work=.*&artifact=.*/);
      await expect(page.url()).not.toContain("/issues/");
    } finally {
      await page.request.delete(`${BASE_URL}/api/companies/${company.id}`).catch(() => undefined);
    }
  });

  test("turns final approval of a Website preview into a delivered receipt", async ({ page }) => {
    const companyRes = await page.request.post(`${BASE_URL}/api/companies`, {
      data: { name: `E2E-DearMe-Website-Preview-${Date.now()}` },
    });
    expect(companyRes.ok()).toBe(true);
    const company = (await companyRes.json()) as CompanyResponse;
    const companyPrefix = company.issuePrefix ?? company.prefix ?? company.urlKey ?? "E2E";

    try {
      const paidBetaRes = await page.request.post(
        `${BASE_URL}/api/dearme/companies/${company.id}/paid-beta/access-events`,
        {
          data: {
            amountCents: 25_000,
            currency: "USD",
            description: "Founding beta payment",
          },
        },
      );
      expect(paidBetaRes.ok()).toBe(true);

      const firstCycleRes = await page.request.post(
        `${BASE_URL}/api/dearme/companies/${company.id}/first-cycle/start`,
        {
          data: {
            brand: {
              displayName: "Website Preview Founder",
              positioning: "turning shipped work into public proof with one clear approval gate",
              goals: ["show a useful site preview before publishing broadly"],
              audiences: ["founders evaluating autonomous personal brand teams"],
              proofPoints: ["approved a private Website preview from real work"],
              offers: ["hands-on product architecture review"],
              voiceSamples: [
                "Short, direct, evidence-first notes.",
                "Show the receipt before asking for trust.",
              ],
              preferredChannels: ["portfolio", "linkedin", "newsletter"],
              constraints: ["No public claims before review"],
              cadence: "weekly",
              budgetMonthlyCents: 25_000,
              autoDraftEnabled: true,
            },
          },
        },
      );
      expect(firstCycleRes.ok()).toBe(true);
      await firstCycleRes.json();

      const outputs = await fetchDearMeOutputs(page.request, company.id);
      const portfolioOutput = outputs.outputs.find(
        (output) => output.kind === "portfolio_update" && output.reviewLoop.state !== "approved",
      );
      expect(portfolioOutput).toBeTruthy();
      expect(portfolioOutput?.reviewLoop.state).toBe("needs_user_review");

      const reviewRes = await page.request.post(
        `${BASE_URL}/api/dearme/companies/${company.id}/outputs/${encodeURIComponent(portfolioOutput!.id)}/reviews`,
        {
          data: {
            action: "approve",
            decisionNote: "Approved in DearMe. This Website preview represents me.",
          },
        },
      );
      expect(reviewRes.ok()).toBe(true);
      const reviewResult = await reviewRes.json();
      expect(reviewResult).toEqual(expect.objectContaining({
        status: "recorded",
        action: "approve",
        output: expect.objectContaining({
          id: portfolioOutput!.id,
          reviewLoop: expect.objectContaining({
            state: "approved",
          }),
        }),
      }));

      const pendingApprovals = await fetchPendingApprovals(page.request, company.id);
      const nextMoveApproval = pendingApprovals.find((approval) =>
        approval.type === "dearme_output_next_move" &&
        approval.payload.outputId === portfolioOutput!.id
      );
      expect(nextMoveApproval).toBeTruthy();
      expect(nextMoveApproval?.payload).toEqual(expect.objectContaining({
        riskGate: "deploy_public_site",
        outputKind: "portfolio_update",
        outputId: portfolioOutput!.id,
        launchHandoff: expect.objectContaining({
          toolName: "deploy_site",
          channel: "dearme-cloud",
          gate: "deploy",
          riskGate: "deploy_public_site",
          payload: expect.objectContaining({
            customDomain: null,
            target: "preview",
          }),
        }),
      }));
      const launchHandoff = nextMoveApproval!.payload.launchHandoff as Record<string, unknown>;
      const launchPayload = launchHandoff.payload as Record<string, unknown>;
      const previewHandle = launchPayload.handle;
      expect(typeof previewHandle).toBe("string");
      const previewHandleString = previewHandle as string;
      expect(previewHandleString).toMatch(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/);

      const pendingWorkbench = await fetchDearMeWorkbench(page.request, company.id);
      expect(pendingWorkbench.decisionsNeeded).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "approve_action",
            approvalId: nextMoveApproval!.id,
            outputId: portfolioOutput!.id,
            riskGate: "deploy_public_site",
          }),
        ]),
      );

      const finalApprovalRes = await page.request.post(
        `${BASE_URL}/api/approvals/${nextMoveApproval!.id}/approve`,
        {
          data: {
            decisionNote: "Final Website preview delivery approved inside DearMe.",
          },
        },
      );
      expect(finalApprovalRes.ok()).toBe(true);

      const receipt = await waitForRecentProgress(
        page.request,
        company.id,
        (item) =>
          item.kind === "next_move_delivery_recorded" &&
          item.deliveryStatus === "delivered" &&
          item.outputId === portfolioOutput!.id &&
          item.approvalId === nextMoveApproval!.id,
        "delivered Website preview receipt",
      );
      expect(receipt).toEqual(expect.objectContaining({
        title: "Approved Website preview delivered",
        summary: expect.stringContaining("Delivery: delivered"),
        deliveryStatus: "delivered",
        deliveryExternalId: expect.stringMatching(/^dearme_preview_/),
        deliveryExternalUrl: expect.stringMatching(
          new RegExp(`^https://dearme\\.app/${previewHandleString}\\?preview=dearme_preview_`),
        ),
        nextStep: expect.stringContaining("Open the delivered Website preview"),
        outputId: portfolioOutput!.id,
        approvalId: nextMoveApproval!.id,
      }));
      expectNoHiddenTerms(JSON.stringify(receipt));

      await page.goto(
        `/${companyPrefix}/dearme?view=decisions&approval=${encodeURIComponent(nextMoveApproval!.id)}`,
      );
      const handoffPanel = page
        .locator('[aria-label="Delivery receipt delivered"]')
        .filter({ hasText: "Approved Website preview delivered" });
      await expect(handoffPanel).toHaveCount(1);
      await expect(handoffPanel).toBeVisible();
      await expect(handoffPanel).toContainText("Approved Website preview delivered");
      await expect(handoffPanel).toContainText("Delivered");
      await expect(handoffPanel).toContainText("Receipt recorded");
      await expect(handoffPanel).toContainText(`Reference ${receipt.deliveryExternalId}`);
      await expect(handoffPanel).toContainText("Open Website preview");
      await expect(handoffPanel).toContainText("Open the delivered Website preview");
      await expect(handoffPanel).not.toContainText("External action not run");
      const previewLink = handoffPanel.getByRole("link", { name: "Open Website preview" });
      await expect(previewLink).toHaveAttribute("href", receipt.deliveryExternalUrl!);
      expectNoHiddenTerms((await handoffPanel.textContent()) ?? "");
    } finally {
      await page.request.delete(`${BASE_URL}/api/companies/${company.id}`).catch(() => undefined);
    }
  });
});
