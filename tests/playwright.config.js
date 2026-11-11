// Regression suite for General Admin VA v2.0.
// Serves the repository root with Cloudflare's own Pages runtime (wrangler pages dev),
// so routing, _headers and 404 handling match the Cloudflare deployment.
const { defineConfig } = require("@playwright/test");
const path = require("path");

const PORT = Number(process.env.PVA_TEST_PORT || 8790);
const SITE_ROOT = path.resolve(__dirname, "..");

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PVA_BASE_URL || `http://127.0.0.1:${PORT}`,
    channel: process.env.PVA_BROWSER_CHANNEL || "chrome",
    headless: true,
  },
  webServer: process.env.PVA_BASE_URL
    ? undefined
    : {
        command: `npx wrangler pages dev "${SITE_ROOT}" --port ${PORT} --ip 127.0.0.1 --compatibility-date=2026-11-10`,
        url: `http://127.0.0.1:${PORT}/`,
        reuseExistingServer: false,
        timeout: 120_000,
        cwd: __dirname,
      },
});
