import { test, expect, type Page } from "@playwright/test";

// The V2 demo journey (ADDENDUM 16) clicked through for real, brand then supplier.
test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });

const track = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
};

test("brand journey", async ({ page }) => {
  const errors = track(page);

  // Entry -> Portfolio
  await page.goto("/");
  await page.getByRole("button", { name: /Brand/ }).click();
  await expect(page).toHaveURL(/\/portfolio/);
  await expect(page.getByText("68.9%").first()).toBeVisible();
  await expect(page.getByText("62.6%").first()).toBeVisible();

  // Supplier -> factory
  await page.getByText("Coromandel Denim Mills").first().click();
  await expect(page).toHaveURL(/\/suppliers\/SUP5/);
  await page.getByText("Ambattur Denim Unit").first().click();
  await expect(page).toHaveURL(/\/factories\/F12/);
  await expect(page.getByText(/Ranked 1 of 14/)).toBeVisible();

  // Impact tab: 69.8%, 73.6%, Guide toggle 70.7%
  await page.getByRole("tab", { name: "Impact" }).click();
  await expect(page.getByText("69.8%").first()).toBeVisible();
  await expect(page.getByText("73.6%").first()).toBeVisible();
  await page.getByText("Guide-compatible", { exact: true }).click();
  await expect(page.getByText("70.7%").first()).toBeVisible();

  // Ranking: slider moves, reset restores
  await page.goto("/ranking");
  const first = page.locator('[role="row"][data-site]').first();
  await expect(first).toHaveAttribute("data-site", "F12");
  const slider = page.getByRole("slider").first();
  await slider.focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Reset to default" }).click();
  await expect(page.locator('[role="row"][data-site]').first()).toHaveAttribute("data-site", "F12");

  // Projects > Opportunities: import twice, no duplicate
  await page.goto("/projects");
  const imports = page.getByRole("button", { name: "Import as project opportunity" });
  await imports.nth(0).click();
  await imports.nth(1).click();
  await imports.nth(0).click();
  await expect(page.getByText(/Already imported as OPP-D\. No duplicate created\./)).toBeVisible();

  // Catalogue: OPP-G ineligible and last
  await page.getByRole("tab", { name: "Catalogue" }).click();
  await expect(page.getByText("Ineligible").first()).toBeVisible();
  await expect(page.getByText("4.45")).toBeVisible();

  // Scenarios: business case, approve
  await page.getByRole("tab", { name: "Scenarios" }).click();
  await expect(page.getByText("81.6%").first()).toBeVisible();
  await page.getByRole("button", { name: /Generate business case/ }).click();
  await expect(page.getByText(/Draft for review/).first()).toBeVisible();

  // Claims: validate PRJ-103 with agent
  await page.goto("/claims");
  await expect(page.getByText("Flagged").first()).toBeVisible();
  await page.getByRole("link", { name: /Validate with agent/ }).first().click();
  await expect(page).toHaveURL(/\/copilot/);

  // Copilot: C1 and off-track
  await page.goto("/copilot");
  await page.getByRole("button", { name: "Which suppliers are off-track?" }).click();
  await expect(page.getByText(/Erode Wet Process/).first()).toBeVisible({ timeout: 15_000 });

  expect(errors, "console errors").toEqual([]);
});

test("supplier journey", async ({ page }) => {
  const errors = track(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Supplier/ }).click();
  await expect(page).toHaveURL(/\/portfolio/);
  await expect(page.getByText("Coromandel Denim Mills").first()).toBeVisible();
  await expect(page.getByText("Kongu Knit Processing")).toHaveCount(0);
  await expect(page.getByText("Tiruppur Mill")).toHaveCount(0);

  await page.goto("/copilot");
  await expect(page.getByText("Brand only")).toBeVisible();
  await page.goto("/suppliers/SUP1");
  await expect(page).toHaveURL(/\/portfolio/); // supplier-detail is brand-only, so it redirects
  await page.goto("/factories/F01");
  await expect(page.getByText(/not found/i).first()).toBeVisible();

  await page.goto("/projects?tab=scenarios");
  await expect(page.getByRole("button", { name: /Approve as delivery baseline/ })).toHaveCount(0);

  await page.goto("/claims");
  await expect(page.getByRole("button", { name: /Validate with agent/ })).toHaveCount(0);
  expect(errors, "console errors").toEqual([]);
});
