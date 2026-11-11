// RT-36 (behaviour level): every Customer Support page renders exactly as on the
// migration baseline. Regenerate the fixture ONLY on the baseline commit:
//   UPDATE_BASELINE=1 npx playwright test customer-support-baseline
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const FIXTURE = path.join(__dirname, "../fixtures/cs-baseline-behaviour.json");
const PAGES = ["/customer-support/"]
  .concat(Array.from({ length: 13 }, (_, i) => `/customer-support/lessons/lesson-${String(i + 1).padStart(2, "0")}/`))
  .concat(["/customer-support/final-project/"]);

async function snapshot(page, url) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  return {
    title: await page.title(),
    h1: (await page.locator("h1").first().innerText()).trim(),
    stepPanels: await page.locator(".step-panel").count(),
    stepLabel: (await page.locator("#stepLabel").count()) ? (await page.locator("#stepLabel").innerText()).trim() : null,
    cards: await page.locator(".lesson-grid > *").count(),
    storageKeys: await page.evaluate(() => Object.keys(localStorage).sort()),
    errors,
  };
}

test("Customer Support pages match the baseline snapshot", async ({ browser }) => {
  const result = {};
  for (const url of PAGES) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    result[url] = await snapshot(page, url);
    await ctx.close();
  }
  if (process.env.UPDATE_BASELINE === "1") {
    fs.writeFileSync(FIXTURE, JSON.stringify(result, null, 2) + "\n");
    test.info().annotations.push({ type: "baseline", description: "fixture rewritten" });
    return;
  }
  const baseline = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  expect(result).toEqual(baseline);
  for (const url of PAGES) expect(result[url].errors, url).toEqual([]);
});
