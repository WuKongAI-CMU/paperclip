import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const PORT = Number(process.env.PAPERCLIP_E2E_PORT ?? 3199);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const CUSTOMER_SURFACE_FORBIDDEN_TERMS = [
  "paperclip",
  "openclaw",
  "symphony",
  "bedrock",
  "dm_sk_",
  "claude",
  "gpt",
  "voyage",
  "model-provider",
  "model provider",
];

interface CompanyResponse {
  id: string;
  issuePrefix?: string | null;
  prefix?: string | null;
  urlKey?: string | null;
}

interface BrowserBugbashGuards {
  assertClean: () => void;
}

function attachBugbashGuards(page: Page): BrowserBugbashGuards {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      failedResponses.push(`${status} ${response.url()}`);
    }
  });

  return {
    assertClean: () => {
      expect(consoleErrors, "browser console errors").toEqual([]);
      expect(pageErrors, "uncaught browser errors").toEqual([]);
      expect(failedResponses, "browser requests returning 4xx/5xx").toEqual([]);
    },
  };
}

async function expectNoCustomerSurfaceLeak(page: Page, label: string) {
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const term of CUSTOMER_SURFACE_FORBIDDEN_TERMS) {
    expect(bodyText, `${label} leaked customer-hidden term: ${term}`).not.toContain(term);
  }
}

async function createCompany(request: APIRequestContext): Promise<CompanyResponse> {
  const companyRes = await request.post(`${BASE_URL}/api/companies`, {
    data: { name: `E2E-DearMe-Onboarding-Bugbash-${Date.now()}` },
  });
  expect(companyRes.ok()).toBe(true);
  return await companyRes.json();
}

async function grantPaidBetaAccess(request: APIRequestContext, companyId: string) {
  const paidBetaRes = await request.post(
    `${BASE_URL}/api/dearme/companies/${companyId}/paid-beta/access-events`,
    {
      data: {
        amountCents: 2_900,
        currency: "USD",
        description: "E2E onboarding bugbash access",
      },
    },
  );
  expect(paidBetaRes.ok()).toBe(true);
}

test.describe("DearMe onboarding bugbash", () => {
  test("runs landing to first cycle without browser errors, failed requests, or customer-language leaks", async ({ page }) => {
    const company = await createCompany(page.request);
    const companyPrefix = company.issuePrefix ?? company.prefix ?? company.urlKey ?? "E2E";
    await grantPaidBetaAccess(page.request, company.id);
    await page.addInitScript((companyId) => {
      window.localStorage.setItem("paperclip.selectedCompanyId", companyId);
    }, company.id);

    const guards = attachBugbashGuards(page);
    const knownFor = "Known for turning shipped product proof into practical AI operating systems";

    try {
      await page.goto("/landing");
      await expect(page.getByRole("heading", { name: "DearMe is a private AI growth team for one person." })).toBeVisible({
        timeout: 30_000,
      });
      await page.getByLabel("What do you want to be known for?").fill(knownFor);
      await expectNoCustomerSurfaceLeak(page, "public landing");

      await page.getByRole("button", { name: "Start my first cycle" }).click();
      await expect(page).toHaveURL(new RegExp(`/${companyPrefix}/dearme\\?knownFor=`), { timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "DearMe grows your personal brand while you work." })).toBeVisible();
      await expect(page.getByLabel("DearMe public first run")).toBeVisible();
      await expect(page.getByLabel("What do you want to be known for?")).toHaveValue(knownFor);
      await expectNoCustomerSurfaceLeak(page, "first-run workroom");

      await page.getByRole("button", { name: "Start my first proof pack" }).click();
      const firstCycleReceipt = page.locator('section[aria-label="First cycle start receipt"]');
      await expect(firstCycleReceipt).toBeVisible({ timeout: 30_000 });
      await expect(firstCycleReceipt.getByText("First brand cycle started")).toBeVisible();
      await expect(firstCycleReceipt.getByText("Launch call gated")).toBeVisible();
      await expect(page.getByLabel("First-run live work receipts")).toBeVisible();
      await expectNoCustomerSurfaceLeak(page, "first-cycle receipt");

      guards.assertClean();
    } finally {
      await page.close().catch(() => undefined);
      await page.request.delete(`${BASE_URL}/api/companies/${company.id}`).catch(() => undefined);
    }
  });
});
