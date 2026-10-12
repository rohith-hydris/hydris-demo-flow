import { defineConfig } from "@playwright/test";

// Runs against a production build on its own port, so it never touches a dev server on :3000.
// Build first (npm run build); `npm run shots` does both.
export default defineConfig({
  testDir: "e2e",
  outputDir: "e2e/.results",
  reporter: "list",
  use: { baseURL: "http://localhost:3111" },
  webServer: { command: "npx next start -p 3111", url: "http://localhost:3111", reuseExistingServer: true, timeout: 60_000 },
});
