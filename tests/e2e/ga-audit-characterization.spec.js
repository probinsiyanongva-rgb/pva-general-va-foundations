// Characterisation of audit findings C-01/C-02 on the CURRENT General Admin pages.
// A "minimal-effort" learner chooses wrong answers wherever possible and types the
// fewest filler characters. Correct behaviour is that this learner CANNOT finish.
//
// Today every page CAN be finished this way, so each test is marked test.fail():
// the suite stays green while documenting the defect. When WP3/WP4 fix a page,
// its test starts passing and Playwright reports "expected to fail but passed" --
// remove the test.fail() for that page in the same commit.
const { test, expect } = require("@playwright/test");

const LESSONS = Array.from({ length: 13 }, (_, i) => `/lessons/lesson-${String(i + 1).padStart(2, "0")}/`);
const KNOWN_DEFECT = new Set([...LESSONS, "/final-project/"]); // shrink as WP3/WP4 land

async function nextEnabled(page) {
  return page.evaluate(() => !document.getElementById("nextBtn").disabled);
}

async function tryUnlock(page) {
  const p = page.locator(".step-panel.active");
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
  for (let i = 0; i < (await sels.count()); i++) await sels.nth(i).selectOption("reply");
  for (let i = 0; i < (await p.locator(".check-btn").count()); i++) await p.locator(".check-btn").nth(i).click();
  if (await nextEnabled(page)) return;

  for (const id of ["dupCheckBtn", "gapCheckBtn", "verifyCheckBtn", "findCheckBtn"]) {
    if (await p.locator("#" + id).count()) await p.locator("#" + id).click();
  }
  if (await nextEnabled(page)) return;

  if (await p.locator(".reveal-btn").count()) await p.locator(".reveal-btn").first().click();
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
