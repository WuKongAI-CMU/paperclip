import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

const PORT = Number(process.env.PAPERCLIP_E2E_PORT ?? 3199);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const MIN_TOUCH_TARGET_PX = 44;

const MOBILE_VIEWPORTS = [
  { name: "iPhone SE", width: 360, height: 640 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPad", width: 768, height: 1024 },
] as const;

interface CompanyResponse {
  id: string;
  issuePrefix?: string | null;
  prefix?: string | null;
  urlKey?: string | null;
}

async function createCompany(request: APIRequestContext): Promise<CompanyResponse> {
  const companyRes = await request.post(`${BASE_URL}/api/companies`, {
    data: { name: `E2E-DearMe-Mobile-QA-${Date.now()}` },
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
        description: "E2E mobile QA access",
      },
    },
  );
  expect(paidBetaRes.ok()).toBe(true);
}

async function expectNoHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          ariaLabel: element.getAttribute("aria-label"),
          className: element.getAttribute("class"),
          tagName: element.tagName.toLowerCase(),
          text: element.innerText?.replace(/\s+/g, " ").trim().slice(0, 90) ?? "",
          width: Math.round(rect.width),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter((element) => element.right > viewportWidth + 1 || element.left < -1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 5);
    return {
      bodyWidth,
      documentWidth,
      offenders,
      viewportWidth,
      overflowWidth: Math.max(documentWidth, bodyWidth) - viewportWidth,
    };
  });

  expect(
    overflow.overflowWidth,
    `${label} has horizontal overflow: viewport=${overflow.viewportWidth}, document=${overflow.documentWidth}, body=${overflow.bodyWidth}, offenders=${JSON.stringify(overflow.offenders)}`,
  ).toBeLessThanOrEqual(1);
}

async function expectTappable(locator: Locator, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box, `${label} should have a rendered box`).not.toBeNull();
  expect(box!.width, `${label} touch target width`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
  expect(box!.height, `${label} touch target height`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);

  const receivesPointerEvents = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth - 1);
    const y = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1);
    const topElement = document.elementFromPoint(x, y);
    return topElement === element || element.contains(topElement);
  });
  expect(receivesPointerEvents, `${label} should receive pointer events at its center`).toBe(true);
}

async function expectNamedCtasTappable(page: Page, names: Array<string | RegExp>, label: string) {
  for (const name of names) {
    await expectTappable(page.getByRole("button", { name }).first(), `${label} CTA "${name}"`);
  }
}

test.describe("DearMe mobile QA", () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test(`keeps landing, onboarding, and workbench usable at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const company = await createCompany(page.request);
      const companyPrefix = company.issuePrefix ?? company.prefix ?? company.urlKey ?? "E2E";
      await grantPaidBetaAccess(page.request, company.id);
      await page.addInitScript((companyId) => {
        window.localStorage.setItem("paperclip.selectedCompanyId", companyId);
      }, company.id);

      const knownFor = `Known for mobile proof quality at ${viewport.name}`;

      try {
        await page.goto("/landing");
        await expect(page.getByRole("heading", { name: "DearMe is a private AI growth team for one person." })).toBeVisible({
          timeout: 30_000,
        });
        await expectNoHorizontalScroll(page, `${viewport.name} landing`);
        await expectNamedCtasTappable(page, ["Start my first cycle"], `${viewport.name} landing`);

        await page.getByLabel("What do you want to be known for?").fill(knownFor);
        await page.getByRole("button", { name: "Start my first cycle" }).click();
        await expect(page).toHaveURL(new RegExp(`/${companyPrefix}/dearme\\?knownFor=`), { timeout: 30_000 });
        await expect(page.getByLabel("DearMe public first run")).toBeVisible();
        await expectNoHorizontalScroll(page, `${viewport.name} onboarding`);
        await expectNamedCtasTappable(
          page,
          ["Start my first proof pack", "Watch the team work live", "Review launch details"],
          `${viewport.name} onboarding`,
        );

        await page.getByRole("button", { name: "Start my first proof pack" }).click();
        const firstCycleReceipt = page.locator('section[aria-label="First cycle start receipt"]');
        await expect(firstCycleReceipt).toBeVisible({ timeout: 30_000 });
        await expectNoHorizontalScroll(page, `${viewport.name} first-cycle receipt`);
        await expectNamedCtasTappable(
          page,
          ["Review Work Ready", /Download/, "Open proof page"],
          `${viewport.name} first-cycle receipt`,
        );

        await page.getByRole("button", { name: "Review Work Ready" }).first().click();
        await expect(page).toHaveURL(/view=brand-os/, { timeout: 30_000 });
        await expect(page.getByLabel("Brand work ready").first()).toBeVisible({ timeout: 30_000 });
        await expectNoHorizontalScroll(page, `${viewport.name} workbench`);
        await expectNamedCtasTappable(page, ["Open Voice & Memory"], `${viewport.name} workbench`);
      } finally {
        await page.close().catch(() => undefined);
        await page.request.delete(`${BASE_URL}/api/companies/${company.id}`).catch(() => undefined);
      }
    });
  }
});
