import { test, expect, type Page } from "@playwright/test";

// Visits every route as each role at desktop and tablet width, fails on console errors or sideways scroll,
// and saves a full-page screenshot per view to e2e/shots/<role>-<width>/<route>.png.
const routes = [
  "/portfolio", "/ranking", "/impact", "/projects", "/claims", "/copilot", "/methodology",
  "/suppliers/SUP5", "/factories/F12", "/factories/F12?tab=risk", "/factories/F12?tab=impact",
  "/factories/F12?tab=projects", "/factories/F12?tab=evidence", "/projects/scenarios/S1", "/projects?tab=catalogue", "/projects?tab=scenarios", "/methodology?tab=methods", "/methodology?tab=issues", "/methodology?tab=decisions",
];
const brandOnly = ["/suppliers/SUP5"];
const widths = [{ name: "1280", width: 1280, height: 900 }, { name: "768", width: 768, height: 1024 }];

async function setRole(page: Page, role: "brand" | "supplier") {
  await page.addInitScript((r) => window.sessionStorage.setItem("hydris.role", r), role);
}

// Entry screen has no role yet.
for (const w of widths) {
  test(`entry @ ${w.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: w.width, height: w.height });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `e2e/shots/entry-${w.name}.png`, fullPage: true });
    expect(errors, "console errors").toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}

for (const role of ["brand", "supplier"] as const) {
  for (const w of widths) {
    test.describe(`${role} @ ${w.name}`, () => {
      test.use({ viewport: { width: w.width, height: w.height }, reducedMotion: "reduce" });
      for (const route of routes) {
        if (role === "supplier" && brandOnly.includes(route)) continue;
        test(route, async ({ page }) => {
          const errors: string[] = [];
          page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
          page.on("pageerror", (e) => errors.push(e.message));
          await setRole(page, role);
          await page.goto(route);
          await page.waitForLoadState("networkidle");
          await page.screenshot({ path: `e2e/shots/${role}-${w.name}/${route.replace(/[/?=]/g, "_")}.png`, fullPage: true });
          expect(errors, "console errors").toEqual([]);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          expect(overflow, "horizontal overflow (px)").toBeLessThanOrEqual(0);
        });
      }
    });
  }
}
