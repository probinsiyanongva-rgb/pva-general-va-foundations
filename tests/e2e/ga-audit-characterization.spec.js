// Characterisation of audit findings C-01/C-02 on the CURRENT General Admin pages.
// A "minimal-effort" learner chooses wrong answers wherever possible and types the
// fewest filler characters. Correct behaviour is that this learner CANNOT finish.
//
// On the v1 pages every page could be finished this way, so each test was marked
// test.fail(). WP3a/WP3b converted all 13 lessons; only the Final Project (WP4)
// remains a known defect. When WP4 lands, its test starts passing and Playwright
// reports "expected to fail but passed" -- empty KNOWN_DEFECT in that commit.
const { test, expect } = require("@playwright/test");

const LESSONS = Array.from({ length: 13 }, (_, i) => `/lessons/lesson-${String(i + 1).padStart(2, "0")}/`);
// Lessons converted to the v2.0 activity library (WP3a pilot, WP3b) -- no longer known defects.
const CONVERTED = new Set(LESSONS); // WP3a (Lesson 1) + WP3b (Lessons 2–13)
const KNOWN_DEFECT = new Set([...LESSONS, "/final-project/"].filter((u) => !CONVERTED.has(u))); // shrink as WP3/WP4 land

async function nextEnabled(page) {
  return page.evaluate(() => !document.getElementById("nextBtn").disabled);
}

async function tryUnlock(page) {
  const p = page.locator(".step-panel.active");

  // v2.0 activity library controls (WP3+). Same minimal-effort strategy:
  // take the first option shown and never press "Try again"; put every sort item
  // in the first bin; then fall through to the filler typing below.
  const v2opt = p.locator(".ga-option:not([disabled])");
  if (await v2opt.count()) await v2opt.first().click();
  if (await nextEnabled(page)) return;
  for (let g = 0; g < 20 && (await p.locator(".ga-pool .ga-chip").count()); g++) {
    await p.locator(".ga-pool .ga-chip").first().click();
    await p.locator(".ga-bin-place").first().click();
  }
  const sortCheck = p.getByRole("button", { name: "Check my sorting" });
  if ((await sortCheck.count()) && (await sortCheck.isEnabled())) await sortCheck.click();
  if (await nextEnabled(page)) return;

  const wrong = p.locator('.option-btn[data-correct="false"]');
  if (await wrong.count()) await wrong.first().click();
  if (await nextEnabled(page)) return;

  const opt = p.locator(".opt-btn");
  const seen = new Set();
  for (let i = 0; i < (await opt.count()); i++) {
    const b = opt.nth(i);
    const idx = await b.getAttribute("data-idx");
    if (seen.has(idx) || (await b.isDisabled())) continue;
    seen.add(idx);
    await b.click(); // first option in each group is wrong on the baseline
  }
  if (await nextEnabled(page)) return;

  while (await p.locator(".sort-pool .sort-chip").count()) {
    const chip = p.locator(".sort-pool .sort-chip").first();
    const ans = await chip.getAttribute("data-answer");
    const bins = p.locator(".sort-bin");
    for (let j = 0; j < (await bins.count()); j++) {
      if ((await bins.nth(j).getAttribute("data-bin")) !== ans) {
        await chip.click();
        await bins.nth(j).locator("h4").click();
        break;
      }
    }
  }
  if (await nextEnabled(page)) return;

  const sels = p.locator("select");
  for (let i = 0; i < (await sels.count()); i++) {
    const sel = sels.nth(i);
    if (await sel.isDisabled()) continue;
    const values = await sel.locator("option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    if (values.length) await sel.selectOption(values.includes("reply") ? "reply" : values[0]); // first choice, no thought
  }
  for (let i = 0; i < (await p.locator(".check-btn").count()); i++) await p.locator(".check-btn").nth(i).click();
  if (await nextEnabled(page)) return;

  for (const id of ["dupCheckBtn", "gapCheckBtn", "verifyCheckBtn", "findCheckBtn"]) {
    if (await p.locator("#" + id).count()) await p.locator("#" + id).click();
  }
  if (await nextEnabled(page)) return;

  // v1: the reveal unlocked the step. v2: it stays disabled until the work passes (M-02).
  const reveal = p.locator(".reveal-btn").first();
  if ((await reveal.count()) && (await reveal.isEnabled())) await reveal.click();
  if (await nextEnabled(page)) return;

  const tog = p.locator('.yn-toggle button[data-val="no"], .yn-toggle button[data-val="fail"]');
  for (let i = 0; i < (await tog.count()) && !(await nextEnabled(page)); i++) await tog.nth(i).click();
  if (await nextEnabled(page)) return;

  const cbs = p.locator(".final-checklist input[type=checkbox]");
  for (let i = 0; i < (await cbs.count()) && !(await nextEnabled(page)); i++) await cbs.nth(i).check();
  if (await nextEnabled(page)) return;

  for (const id of ["addRowBtn", "addTask6RowBtn"]) {
    const b = p.locator("#" + id);
    if ((await b.count()) && (await b.isVisible())) await b.click();
  }
  const fields = p.locator("textarea:visible, input[type=text]:visible");
  for (const L of [1, 6, 11, 16, 21]) {
    for (let i = 0; i < (await fields.count()); i++) {
      const f = fields.nth(i);
      const have = (await f.inputValue()).length;
      if (have >= L) continue;
      await f.pressSequentially("x".repeat(L - have));
      if (await nextEnabled(page)) return;
    }
  }
}

async function minimalEffortRun(page, url) {
  await page.goto(url);
  for (let guard = 0; guard < 16; guard++) {
    if ((await page.locator("#stepLabel").innerText()) === "Complete") return true;
    if (!(await nextEnabled(page))) await tryUnlock(page);
    if (!(await nextEnabled(page))) return false;
    await page.click("#nextBtn");
  }
  return false;
}

for (const url of [...LESSONS, "/final-project/"]) {
  test(`minimal-effort learner cannot finish ${url}`, async ({ page }) => {
    if (KNOWN_DEFECT.has(url)) test.fail(true, "Audit C-01/C-02: currently completable with wrong answers (fixed in WP3/WP4)");
    const finished = await minimalEffortRun(page, url);
    expect(finished).toBe(false);
  });
}
