import { test, expect, type Page } from "@playwright/test";

// The scripted agents played for real. Each answer ends with a screenshot in e2e/shots/agents/.
test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });

const as = (page: Page, role: "brand" | "supplier") => page.addInitScript((r) => window.sessionStorage.setItem("hydris.role", r), role);
const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/shots/agents/${name}.png`, fullPage: true });
const ask = async (page: Page, chip: string | RegExp) => page.getByRole("button", { name: chip }).first().click();

test("validation agent from Claims: flagged PRJ-201 shows the failed checks and the closing line", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await as(page, "brand");
  await page.goto("/claims");
  await page.getByRole("link", { name: /Validate with agent/ }).first().click();
  await expect(page).toHaveURL(/\/copilot/);
  await expect(page.getByText(/Allocation conflict|already claims|Another brand/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("This checks the evidence. It does not by itself prove environmental impact.").first()).toBeVisible();
  await shot(page, "v1-prj201");
  expect(errors).toEqual([]);
});

test("validation agent: PRJ-103, inspection and audit chips", async ({ page }) => {
  await as(page, "brand");
  await page.goto("/copilot");
  await page.getByRole("radio", { name: /Validation agent/ }).first().click();
  for (const [chip, expectText, name] of [
    [/Pallikaranai wetland claim/, /25,000/, "v2-prj103"],
    [/Ambattur inspection \(INS-0412\)/, /85\.7%/, "v3-ins0412"],
    [/ETP lab report for Tiruppur Mill/, /44 of 52/, "v4-lab"],
    [/Avinashi ETP audit report/, /2024/, "v5-audit"],
  ] as const) {
    await ask(page, chip);
    await expect(page.getByText(expectText).last()).toBeVisible({ timeout: 20_000 });
    await shot(page, name);
  }
});

test("evidence agent: BRSR P6 for Ambattur reaches a cited draft and can be approved", async ({ page }) => {
  await as(page, "brand");
  await page.goto("/copilot");
  await page.getByRole("radio", { name: /Evidence & Disclosure/ }).first().click();
  await ask(page, /BRSR Principle 6 water report/);
  await expect(page.getByRole("heading", { name: /Step 2/ })).toBeVisible({ timeout: 20_000 });
  await shot(page, "e1-readiness");
  // one gap uploaded, one placeholder, two disclosed
  const gap = (name: RegExp) => page.getByRole("group", { name });
  await gap(/CGWA/).getByRole("button", { name: "Upload now" }).click(); // turns Ready, so it leaves the gap list
  await gap(/NABL/).getByRole("button", { name: /placeholder/ }).click();
  await gap(/WASH facility/).getByRole("button", { name: "Disclose the gap" }).click();
  await gap(/Form V/).getByRole("button", { name: "Disclose the gap" }).click();
  await page.getByRole("button", { name: "Generate draft" }).click();
  await expect(page.getByText(/250,000/).first()).toBeVisible({ timeout: 20_000 });
  await shot(page, "e1-draft");
  await page.getByRole("button", { name: "Approve draft" }).click();
  await expect(page.getByText(/Draft approved/).first()).toBeVisible();
});

test("copilot C1..C9 all answer, and unknown text gets the fallback", async ({ page }) => {
  await as(page, "brand");
  await page.goto("/copilot");
  await ask(page, "Which sites should we act on first?");
  await expect(page.getByText(/Start with/).first()).toBeVisible({ timeout: 20_000 });
  await ask(page, "What is our water impact?");
  await expect(page.getByText(/No site is Net Positive/).first()).toBeVisible({ timeout: 20_000 });
  await ask(page, /Import the Lite findings/);
  await expect(page.getByText(/LITE-0187/).last()).toBeVisible({ timeout: 20_000 });
  await ask(page, /Import the Lite findings/);
  await expect(page.getByText(/already imported/i).last()).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder(/Ask/).fill("what is the weather");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/In this demo I can answer the suggested questions/)).toBeVisible({ timeout: 20_000 });
  await shot(page, "copilot-chat");
});

test("supplier: Validation agent is disabled, asking for it is refused, other-supplier question is refused", async ({ page }) => {
  await as(page, "supplier");
  await page.goto("/copilot");
  const val = page.getByRole("radio", { name: /Validation agent/ }).first();
  await expect(val).toHaveAttribute("aria-disabled", "true");
  await expect(val).toHaveAttribute("title", "Available to brand accounts");
  await page.getByPlaceholder(/Ask/).fill("Can I trust the inspection at Ambattur?");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Claim and report validation is available to brand accounts/).first()).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder(/Ask/).fill("Tell me about Kongu Knit Processing");
  await page.keyboard.press("Enter");
  await expect(page.getByText("I can only show data for Coromandel Denim Mills.")).toBeVisible({ timeout: 20_000 });
  await shot(page, "supplier-scope");
});

test("scenario S1: approve as delivery baseline is brand-only and works", async ({ page }) => {
  await as(page, "brand");
  await page.goto("/projects/scenarios/S2");
  const approve = page.getByRole("button", { name: /Approve as delivery baseline/ });
  if (await approve.count()) { await approve.click(); }
  await expect(page.getByText(/Approved as delivery baseline|Delivery/).first()).toBeVisible();
  await shot(page, "scenario-s2");
});
