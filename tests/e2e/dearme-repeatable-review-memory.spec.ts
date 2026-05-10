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

interface DearMeOutputDocument {
  key: string;
  title: string;
  bodyPreview: string;
}

interface DearMeFeedbackTrace {
  headline: string;
  receipts?: string[];
}

interface DearMeOutput {
  id: string;
  kind: string;
  issueId: string;
  issueIdentifier: string | null;
  documents: DearMeOutputDocument[];
  reviewLoop: {
    state: string;
    feedbackTrace: DearMeFeedbackTrace | null;
  };
}

interface DearMeOutputsResponse {
  outputs: DearMeOutput[];
}

interface IssueDocumentResponse {
  latestRevisionId: string | null;
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

test.describe("DearMe repeatable review-memory smoke", () => {
  test("preserves another-pass receipts in the API and focused review surface", async ({ page }) => {
    const companyRes = await page.request.post(`${BASE_URL}/api/companies`, {
      data: { name: `E2E-DearMe-Review-Memory-${Date.now()}` },
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
              displayName: "Review Memory Founder",
              positioning: "turning private AI work into public proof with careful review gates",
              goals: ["show one practical proof loop before publishing"],
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

      const outputs = await fetchDearMeOutputs(page.request, company.id);
      const report = outputs.outputs.find((output) => output.kind === "weekly_report");
      expect(report).toBeTruthy();
      expect(report?.documents.some((document) => document.key === "dear-me-report")).toBe(true);

      const decisionNote = "Try a sharper angle from the launch proof.";
      const continueRes = await page.request.post(
        `${BASE_URL}/api/dearme/companies/${company.id}/outputs/${encodeURIComponent(report!.id)}/continue`,
        {
          data: {
            intent: "prepare_another_pass",
            decisionNote,
          },
        },
      );
      expect(continueRes.status()).toBe(202);
      const queued = await continueRes.json();
      expect(queued.wakeIssue).toBeUndefined();
      expect(queued.action).toBe("regenerate");
      expectNoHiddenTerms(JSON.stringify(queued.output));

      await page.waitForTimeout(1_100);

      const currentDocumentRes = await page.request.get(
        `${BASE_URL}/api/issues/${report!.issueId}/documents/dear-me-report`,
      );
      expect(currentDocumentRes.ok()).toBe(true);
      const currentDocument = (await currentDocumentRes.json()) as IssueDocumentResponse;
      expect(currentDocument.latestRevisionId).toBeTruthy();

      const updateRes = await page.request.put(
        `${BASE_URL}/api/issues/${report!.issueId}/documents/dear-me-report`,
        {
          data: {
            title: "Dear me report",
            format: "markdown",
            baseRevisionId: currentDocument.latestRevisionId,
            changeSummary: "E2E repeatable review-memory pass",
            body: [
              "# Dear me report",
              "",
              "## Work Completed",
              "- A sharper private report now leads with the launch proof and the first audience lane.",
              "",
              "## Drafts and Assets Ready for Review",
              "- The next draft uses one concrete proof before making any public claim.",
              "",
              "## Decisions Needed",
              "- Review the updated private work before anything public moves.",
              "",
              "## Outcomes and Signals",
              "- Report reference: repeatable review-memory pass.",
            ].join("\n"),
          },
        },
      );
      expect(updateRes.ok()).toBe(true);

      const refreshed = await fetchDearMeOutputs(page.request, company.id);
      const updatedReport = refreshed.outputs.find((output) => output.id === report!.id);
      expect(updatedReport).toBeTruthy();
      expect(updatedReport?.reviewLoop.state).toBe("needs_user_review");
      expect(updatedReport?.reviewLoop.feedbackTrace?.headline).toBe("Feedback applied");
      expect(updatedReport?.reviewLoop.feedbackTrace?.receipts).toContain(
        `Another pass requested: ${decisionNote}`,
      );
      expectNoHiddenTerms(JSON.stringify(updatedReport));

      await page.goto(
        `/${companyPrefix}/dearme?view=decisions&artifact=${encodeURIComponent(report!.id)}&intent=review`,
      );
      const focusedWork = page.locator('[aria-label="Focused work"]');
      await expect(focusedWork).toBeVisible();
      await expect(focusedWork.getByLabel("Feedback applied")).toBeVisible();
      await expect(focusedWork.getByText(`Another pass requested: ${decisionNote}`)).toBeVisible();
      expectNoHiddenTerms((await focusedWork.textContent()) ?? "");
    } finally {
      await page.request.delete(`${BASE_URL}/api/companies/${company.id}`).catch(() => undefined);
    }
  });
});
