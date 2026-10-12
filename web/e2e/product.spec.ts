import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const UPC = "036000291452";
const GTIN = "0036000291452";

test("[SCAN-1] [SCAN-9] [PAGE-1] type a barcode, see the scored product and its rules", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Or type the barcode number").fill(UPC);
  await page.getByRole("button", { name: "Look up" }).click();

  await expect(page).toHaveURL(`/p/${GTIN}`);
  await expect(page.getByRole("heading", { name: "Crunchy Oat Bars" })).toBeVisible();
  await expect(page.getByText("/ 100", { exact: true })).toBeVisible();
  await expect(page.getByText("Mediocre", { exact: true })).toBeVisible(); // capped at 49 by E250 (ADD-5)
  await expect(page.getByRole("heading", { name: "Every rule applied" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Source for Sugars" })).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await expect(
    page.locator("footer").getByText("Educational information, not medical advice."),
  ).toBeVisible();
});

test("[PAGE-14] product and home pages have no WCAG 2.1 AA violations", async ({ page }) => {
  for (const path of ["/", `/p/${GTIN}`]) {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, `${path}: ${results.violations.map((v) => v.id)}`).toEqual([]);
  }
});

test("[PAGE-11] invalid and unreachable barcodes show a message, not a crash", async ({ page }) => {
  await page.goto("/p/123");
  await expect(page.getByRole("heading", { name: "That barcode isn't valid" })).toBeVisible();

  // Not in the DB, and OFF is unreachable in e2e, so the API answers 503.
  await page.goto("/p/4006381333931");
  await expect(page.getByRole("heading", { name: "Try again in a moment" })).toBeVisible();
});

test("[SCAN-2] [SCAN-11] scanning loads nothing from third-party hosts", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["camera"]);
  const hosts = new Set<string>();
  page.on("request", (req) => hosts.add(new URL(req.url()).hostname));

  await page.goto("/");
  await page.getByRole("button", { name: "Scan a barcode" }).click();
  await expect(page.getByRole("button", { name: "Stop scanning" })).toBeVisible();
  await page.waitForTimeout(1500); // let the detector (and WASM, if used) load and run
  await page.getByRole("button", { name: "Stop scanning" }).click();

  expect([...hosts].filter((h) => h !== "127.0.0.1" && h !== "localhost")).toEqual([]);
});

test("[PWA-2] home opens offline; product data is never served from the cache", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Open Food Scanner" })).toBeVisible();

  const failed = await page.goto(`/p/${GTIN}`).catch(() => null);
  if (failed) await expect(page.getByText("Crunchy Oat Bars")).toHaveCount(0);
  await context.setOffline(false);
});

test("[ALT-10] [RECALL-12] the recall banner shows, and an alternative opens its product page", async ({
  page,
}) => {
  await page.goto(`/p/${GTIN}`);
  const banner = page.getByRole("status").filter({ hasText: "FDA" });
  await expect(
    banner.getByRole("heading", { name: "A related FDA recall is on record" }),
  ).toBeVisible();
  await expect(banner).toContainText("Undeclared peanut");

  const strip = page.getByRole("region", { name: "Better-scored alternatives" });
  await expect(strip).toContainText("In cereal bars");
  await strip.getByRole("link", { name: /Plain Oat Bars/ }).click();

  await expect(page).toHaveURL("/p/0000000000017");
  await expect(page.getByRole("heading", { name: "Plain Oat Bars", level: 1 })).toBeVisible();
});
