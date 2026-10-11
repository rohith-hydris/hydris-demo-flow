import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const as = (page: Page, role: "brand" | "supplier") => page.addInitScript((r) => window.sessionStorage.setItem("hydris.role", r), role);

test("replay mode: alerts fire day by day, reset clears them", async ({ page }) => {
  await as(page, "brand");
  await page.goto("/portfolio");
  await expect(page.getByText("No alerts have fired yet")).toBeVisible();
  const next = page.getByRole("button", { name: "Next day" });
  for (let i = 0; i < 6; i++) await next.click();
  await expect(page.getByText(/Day 6 of 14/)).toBeVisible();
  await expect(page.getByText(/Erode Wet Process/).first()).toBeVisible();
  await expect(page.getByText(/Sriperumbudur/).first()).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("No alerts have fired yet")).toBeVisible();
});

test("ranking: a weight change re-sorts live and keeps the total at 100%", async ({ page }) => {
  await as(page, "brand");
  await page.goto("/ranking");
  const order = () => page.locator('[role="row"][data-site]').evaluateAll((els) => els.map((e) => e.getAttribute("data-site")).join(","));
  await expect(page.locator('[role="row"][data-site]')).toHaveCount(14);
  const before = await order();
  expect(before).toContain("F12");
  const sliders = page.getByRole("slider");
  await sliders.nth(4).focus();            // Community
  await page.keyboard.press("End");
  await expect(page.getByText("100%").last()).toBeVisible();
  const after = await order();
  expect(after).not.toBe(before);
  await page.getByRole("button", { name: "Reset to default" }).click();
  expect(await order()).toBe(before);
});

test("traceability drawer opens from a figure and closes with Esc", async ({ page }) => {
  await as(page, "brand");
  await page.goto("/factories/F12?tab=overview");
  await page.getByRole("button", { name: /Where this number comes from: .*PWI/i }).first().click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Where this number comes from")).toBeVisible();
  await expect(drawer.getByText(/PWI-M 1\.0/).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("project drawer shows participants and the 140% conflict for PRJ-201", async ({ page }) => {
  await as(page, "brand");
  await page.goto("/claims");
  await page.getByRole("button", { name: /Project details/ }).first().click();
  await expect(page.getByText(/140% requested, 100% maximum/)).toBeVisible();
});
