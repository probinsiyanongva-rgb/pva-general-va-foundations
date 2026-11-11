// WP1 in a real browser: the core and manifest load as plain <script> files on the
// Cloudflare runtime, use real localStorage, and handle blocked storage. No page uses
// them yet (wiring is WP2+), so the scripts are injected into the hub page here.
const { test, expect } = require("@playwright/test");

async function loadCore(page) {
  await page.goto("/");
  await page.addScriptTag({ url: "/shared/pva-core/progress-core.js" });
  await page.addScriptTag({ url: "/shared/ga/manifest.js" });
}

test("core + manifest expose PVACore/PVAGA and persist to localStorage", async ({ page }) => {
  await loadCore(page);
  const r = await page.evaluate(() => {
    const p = PVAGA.createProgress({ rules: {} });
    const a = p.recordAttempt("l01-pay", { passed: true });
    const raw = JSON.parse(localStorage.getItem("pvaga:progress:v2"));
    const p2 = PVAGA.createProgress({ rules: {} });
    return { core: PVACore.VERSION, manifest: PVAGA.MANIFEST_VERSION, saved: a.saved, mode: p.storageMode(),
      stored: raw.records["l01-pay"].status, reloaded: p2.requirementStatus("l01-pay").passed };
  });
  expect(r).toEqual({ core: "1.0.0", manifest: "2.0.0", saved: true, mode: "persistent", stored: "passed", reloaded: true });
});

test("the V1 key is read but left untouched; V1 lessons do not count", async ({ page }) => {
  await page.goto("/");
  const v1 = JSON.stringify({ lessons: { 1: { complete: true, at: "2026-09-01T00:00:00Z" } }, finalProject: {} });
  await page.evaluate((v) => localStorage.setItem("pva-gadmin-ft-progress", v), v1);
  await page.addScriptTag({ url: "/shared/pva-core/progress-core.js" });
  await page.addScriptTag({ url: "/shared/ga/manifest.js" });
  const r = await page.evaluate(() => {
    const ev = PVAGA.createProgress({ rules: {} }).evaluate();
    return { v1only: ev.lessons.filter((l) => l.completedInV1Only).map((l) => l.n), done: ev.completedLessons,
      v1: localStorage.getItem("pva-gadmin-ft-progress") };
  });
  expect(r.v1only).toEqual([1]);
  expect(r.done).toBe(0);
  expect(r.v1).toBe(v1);
  // The current V1 hub still reads its own key correctly.
  await page.reload();
  await expect(page.locator("#progressCount")).toHaveText("1");
});

test("blocked storage: memory mode, event fired, nothing thrown", async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new DOMException("blocked", "QuotaExceededError"); };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await loadCore(page);
  const r = await page.evaluate(() => {
    const p = PVAGA.createProgress({ rules: {} });
    let fired = 0;
    p.on("storage-unavailable", () => fired++);
    const a = p.recordAttempt("l01-pay", { passed: true });
    return { saved: a.saved, passed: a.passed, mode: p.storageMode(), fired };
  });
  expect(r).toEqual({ saved: false, passed: true, mode: "memory", fired: 1 });
  expect(errors).toEqual([]);
  await ctx.close();
});
