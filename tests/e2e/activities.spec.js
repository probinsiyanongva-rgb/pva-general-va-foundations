// WP2: shared activity library, exercised in Chrome on the test harness page
// (tests/fixtures/activities-harness.html). Covers RT-01..06 (mechanics), RT-11, RT-17,
// RT-18, RT-19, RT-26..32, RT-34, NT-06 at library level. Lesson pages adopt it in WP3.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const HARNESS = "/tests/fixtures/activities-harness.html";
const next = (page) => page.locator("#stepperArea #nextBtn");
const reqStatus = (page, id) => page.evaluate((i) => PVAGAActivities.getStore().requirementStatus(i).passed, id);
const attempts = (page, id) => page.evaluate((i) => (PVAGAActivities.getStore().getRecord(i) || {}).attempts || 0, id);

test.beforeEach(async ({ page }) => {
  await page.goto(HARNESS + "?seed=7");
});

test("scenario: wrong answers never unlock; retry reshuffles; hint after two wrong; correct unlocks", async ({ page }) => {
  await next(page).click(); // step 1 is ungated
  await expect(page.locator("#stepLabel")).toHaveText("Step 2 of 4");
  await expect(next(page)).toBeDisabled();
  const scen = page.locator("#scenario");
  await scen.getByRole("button", { name: /Option A/ }).click();
  await expect(scen.locator(".ga-feedback")).toContainText("Not quite.");
  await expect(scen.locator(".ga-feedback")).toContainText("Feedback for A.");
  await expect(next(page)).toBeDisabled();
  expect(await reqStatus(page, "l01-pay")).toBe(false);
  await scen.getByRole("button", { name: "Try again" }).click();
  await scen.getByRole("button", { name: /Option C/ }).click();
  await expect(scen.locator(".ga-hint")).toBeVisible();
  await expect(next(page)).toBeDisabled();
  await scen.getByRole("button", { name: "Try again" }).click();
  await scen.getByRole("button", { name: /Option B/ }).click();
  await expect(scen.locator(".ga-feedback")).toContainText("Correct.");
  await expect(next(page)).toBeEnabled();
  expect(await reqStatus(page, "l01-pay")).toBe(true);
  expect(await attempts(page, "l01-pay")).toBe(3);
});

test("scenario options are shuffled: the correct option appears in more than one position (RT-17)", async ({ page }) => {
  const positions = new Set();
  for (let i = 0; i < 20; i++) {
    await page.goto(HARNESS); // no seed: Math.random
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const texts = await page.locator("#scenario .ga-option").allInnerTexts();
    positions.add(texts.findIndex((t) => t.includes("Option B")));
  }
  expect(positions.size).toBeGreaterThan(1);
});

test("sort: keyboard only, visible selected state; two bins show counts only, move and re-check (RT-11, M-15, m-08, decision 5)", async ({ page }) => {
  await page.evaluate(() => {
    const s = PVAGAActivities.getStore();
    s.recordAttempt("l01-pay", { passed: true });
  });
  await page.reload();
  await next(page).click(); // to step 2 (passed), then 3
  await next(page).click();
  await expect(page.locator("#stepLabel")).toHaveText("Step 3 of 4");
  const sort = page.locator("#sort");
  const chips = sort.locator(".ga-chip");
  // Place every chip in "Task" using only the keyboard.
  for (let i = 0; i < 4; i++) {
    const chip = sort.locator(".ga-pool .ga-chip").first();
    await chip.focus();
    await page.keyboard.press("Enter");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    const before = await chip.evaluate((el) => getComputedStyle(el, "::before").content);
    expect(before).toContain("Selected");
    await page.keyboard.press("Tab"); // past remaining chips to the first enabled bin button
    let guard = 0;
    while (!(await page.evaluate(() => document.activeElement.classList.contains("ga-bin-place"))) && guard++ < 10) await page.keyboard.press("Tab");
    await page.keyboard.press("Enter"); // "Task" bin is first
  }
  await sort.getByRole("button", { name: "Check my sorting" }).press("Enter");
  await expect(sort.locator(".ga-feedback")).toContainText("2 of 4");
  // Two bins: a ✗ would give the answer away, so no item is marked (decision 5).
  await expect(sort.locator(".ga-chip.is-wrong, .ga-chip.is-correct, .ga-chip .ga-mark")).toHaveCount(0);
  await sort.getByRole("button", { name: "Check my sorting" }).press("Enter");
  await expect(sort.locator(".ga-chip.is-wrong, .ga-chip .ga-mark")).toHaveCount(0);
  await expect(next(page)).toBeDisabled();
  // Move the skills to Skill.
  for (const name of ["Attention to detail", "Time management"]) {
    const chip = sort.locator(".ga-chip", { hasText: name });
    await chip.focus();
    await page.keyboard.press("Enter");
    await sort.locator('.ga-bin[data-bin="skill"] .ga-bin-place').press("Enter");
  }
  await sort.getByRole("button", { name: "Check my sorting" }).press("Enter");
  await expect(sort.locator(".ga-feedback")).toContainText("All 4 items are in the right bin.");
  await expect(next(page)).toBeEnabled();
  expect(await chips.count()).toBe(4);
});

test("written work: filler and unchanged examples fail; labels never say Correct; genuine work passes (C-02, NT-06)", async ({ page }) => {
  await page.evaluate(() => { const s = PVAGAActivities.getStore(); s.recordAttempt("l01-pay", { passed: true }); s.recordAttempt("l01-sort", { passed: true }); });
  await page.reload();
  await next(page).click(); await next(page).click(); await next(page).click();
  await expect(page.locator("#stepLabel")).toHaveText("Step 4 of 4");
  const box = page.locator("#written .ga-structure");
  await expect(box.locator("h3")).toHaveText("Automatic structure check");
  await expect(box.locator(".ga-transparency")).toContainText("Not checked: whether your content is correct");
  await expect(box.locator(".ga-status")).toContainText("Missing:");
  const area = page.getByRole("textbox", { name: /Administrative area — area 2/ });
  await area.fill("Scheduling");
  await page.getByRole("textbox", { name: /Tasks you understand — area 2/ }).fill("aaaa aaaa test test test test");
  await page.getByRole("textbox", { name: /Skills needed — area 2/ }).fill("xxxx xxxx xxxx");
  await expect(box.locator(".ga-status")).toContainText("Missing:");
  await expect(next(page)).toBeDisabled();
  const rows = [
    ["Scheduling", "Booking client calls across time zones", "Attention to detail, planning"],
    ["Information", "Updating the contact spreadsheet every week", "Accuracy, consistency, organization"],
  ];
  for (let i = 0; i < rows.length; i++) {
    await page.getByRole("textbox", { name: new RegExp(`Administrative area — area ${i + 2}`) }).fill(rows[i][0]);
    await page.getByRole("textbox", { name: new RegExp(`Tasks you understand — area ${i + 2}`) }).fill(rows[i][1]);
    await page.getByRole("textbox", { name: new RegExp(`Skills needed — area ${i + 2}`) }).fill(rows[i][2]);
  }
  await expect(box.locator(".ga-status")).toContainText("Missing:"); // 2 learner rows; example row empty
  await page.getByRole("textbox", { name: /Tasks you understand — area 1/ }).fill("Sorting incoming email and sending confirmations");
  await page.getByRole("textbox", { name: /Skills needed — area 1/ }).fill("Clarity, tone, prioritizing");
  await expect(box.locator(".ga-status")).toHaveText("Required parts complete");
  await expect(next(page)).toBeEnabled();
  const text = await page.locator("#written").innerText();
  expect(text).not.toMatch(/\b(Correct|Passed|Approved|Reviewed)\b/);
});

test("autosave: answers and step restored exactly after reload; no markup injection (RT-26, M-10, E-04)", async ({ page }) => {
  await page.evaluate(() => { const s = PVAGAActivities.getStore(); s.recordAttempt("l01-pay", { passed: true }); s.recordAttempt("l01-sort", { passed: true }); });
  await page.reload();
  await next(page).click(); await next(page).click(); await next(page).click();
  const tricky = 'He said "yes" & <img src=x onerror="window.__pwned=1">\nSecond line';
  await page.getByRole("textbox", { name: /Tasks you understand — area 2/ }).fill(tricky);
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator("#stepLabel")).toHaveText("Step 4 of 4");
  await expect(page.getByRole("textbox", { name: /Tasks you understand — area 2/ })).toHaveValue(tricky);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.locator("#rows img").count()).toBe(0);
});

test("stepper: focus moves to the new step heading; label is a live region; lesson not marked complete while requirements are missing (m-03, C-05)", async ({ page }) => {
  await next(page).click();
  const focused = await page.evaluate(() => [document.activeElement.tagName, document.activeElement.textContent]);
  expect(focused).toEqual(["H2", "Scenario"]);
  await expect(page.locator("#stepLabel")).toHaveAttribute("role", "status");
  await page.evaluate(() => { const s = PVAGAActivities.getStore(); ["l01-pay", "l01-sort"].forEach((id) => s.recordAttempt(id, { passed: true })); });
  await page.evaluate(() => PVAGAActivities.getStore().recordAttempt("l01-ws", { answer: { rows: [
    { area: "A", tasks: "Sorting incoming email and sending confirmations", skills: "Clarity, tone, prioritizing" },
    { area: "B", tasks: "Booking client calls across time zones", skills: "Attention to detail, planning" },
    { area: "C", tasks: "Updating the contact spreadsheet every week", skills: "Accuracy, consistency, organization" }] } }));
  await page.reload();
  // Saved step is 2 (from above); all harness gates now pass, so we can continue to the end.
  for (let i = 0; i < 4 && (await page.locator("#stepLabel").innerText()) !== "Some activities still need to be completed"; i++) {
    if (await next(page).isVisible()) await next(page).click();
  }
  // l01-limit is not on the harness, so Lesson 1 must NOT be recorded complete.
  await expect(page.locator("#stepLabel")).toHaveText("Some activities still need to be completed");
  expect(await page.evaluate(() => PVAGAActivities.getStore().evaluate().lessons[0].complete)).toBe(false);
});

test("model answer: reveal stays disabled until a valid attempt and never sets the gate (RT-18, M-02)", async ({ page }) => {
  const reveal = page.locator("#johnReveal");
  await expect(reveal).toBeDisabled();
  const field = page.getByRole("textbox", { name: "Write the message you'd send" });
  await field.fill("I have two contacts listed as John. Could you confirm which one you'd like me to schedule with?");
  await page.waitForTimeout(600);
  await expect(reveal).toBeDisabled(); // copying the model is rejected
  expect(await reqStatus(page, "l03-john")).toBe(false);
  await field.fill("Which John should I invite: John Reyes from accounting or John Lim from the supplier?");
  await expect(reveal).toBeEnabled();
  expect(await reqStatus(page, "l03-john")).toBe(true);
  await reveal.click();
  await expect(page.locator("#johnModel")).toBeVisible();
});

test("triage: progressive disclosure — count, then ✗ without the accepted category, feedback once all correct (decision 5)", async ({ page }) => {
  const t = page.locator("#triage");
  await t.getByLabel("“Meeting moved”").selectOption("reply");
  await t.getByLabel("“Software renews for $499”").selectOption("client_review");
  await t.getByRole("button", { name: "Check all" }).click();
  await expect(t.locator(".ga-feedback")).toContainText("1 of 2 correct");
  await expect(t.locator(".ga-result-line .ga-mark")).toHaveCount(0);
  await expect(t).not.toContainText("Accepted");
  await t.getByRole("button", { name: "Check all" }).click();
  await expect(t.locator(".ga-result-line").nth(0)).toContainText("✗");
  await expect(t.locator(".ga-result-line").nth(0)).toContainText("Not Reply.");
  await expect(t.locator(".ga-result-line").nth(1)).toContainText("Right category.");
  await expect(t).not.toContainText("Accepted");
  await expect(t).not.toContainText("Update the calendar.");
  expect(await reqStatus(page, "l04-triage")).toBe(false);
  await t.getByLabel("“Meeting moved”").selectOption("action");
  await t.getByLabel("“Software renews for $499”").selectOption("client_review");
  await t.getByRole("button", { name: "Check all" }).click();
  await expect(t.locator(".ga-feedback")).toContainText("All 2 categorised correctly.");
  await expect(t.locator(".ga-result-line").nth(0)).toContainText("Update the calendar.");
  expect(await reqStatus(page, "l04-triage")).toBe(true);
});

test("identify: ticking everything or nothing fails; the exact set passes (M-08 mechanics)", async ({ page }) => {
  const idf = page.locator("#identify");
  const check = idf.getByRole("button", { name: "Check my answer" });
  await check.click();
  await expect(idf.locator(".ga-feedback")).toContainText("2 missed");
  for (const name of ["1. Maria Cruz", "2. MARIA CRUZ", "3. Juan Dela Cruz", "5. juan dela cruz"]) await idf.getByLabel(name).check();
  await check.click();
  await expect(idf.locator(".ga-feedback")).toContainText("2 ticked that shouldn't be");
  expect(await reqStatus(page, "l07-dupes")).toBe(false);
  await idf.getByLabel("1. Maria Cruz").uncheck();
  await idf.getByLabel("3. Juan Dela Cruz").uncheck();
  await check.click();
  await expect(idf.locator(".ga-feedback")).toContainText("Exactly right.");
  expect(await reqStatus(page, "l07-dupes")).toBe(true);
});

test("schedule: each broken rule is listed; the can't-fit question is required (NT-05, M-05, decision 3)", async ({ page }) => {
  const sch = page.locator("#schedule");
  const set = async (label, v) => sch.getByLabel(label).selectOption(v);
  await set("Team meeting", "10:00"); await set("Vendor call", "11:00"); await set("Client presentation", "15:00");
  await set("15-minute buffer", "14:45"); await set("Prospect call (30 min)", "12:00");
  await expect(sch.locator(".ga-status")).toContainText("not met");
  await expect(sch.locator("li", { hasText: "Lunch (12–1 PM) kept free" })).toContainText("✗");
  await set("Prospect call (30 min)", "13:30");
  await expect(sch.locator("li", { hasText: "Identified the request that can't fit" })).toContainText("✗");
  await expect(sch.locator(".ga-structure")).not.toContainText("focus");
  expect(await reqStatus(page, "l05-schedule")).toBe(false);
  await sch.getByRole("button", { name: /prospect call \(harness\)/ }).click();
  await expect(sch.locator(".ga-schedule-question .ga-feedback")).toContainText("Feedback for prospect.");
  expect(await reqStatus(page, "l05-schedule")).toBe(false);
  await sch.getByRole("button", { name: "Try again" }).click();
  await sch.getByRole("button", { name: /focus block \(harness\)/ }).click();
  await expect(sch.locator(".ga-status")).toHaveText("All scheduling rules met.");
  expect(await reqStatus(page, "l05-schedule")).toBe(true);
});

test("choice set passes only when every item is correct", async ({ page }) => {
  const cs = page.locator("#choiceSet");
  await cs.getByRole("button", { name: "Right 1" }).click();
  await cs.getByRole("button", { name: "Wrong 2" }).click();
  expect(await reqStatus(page, "l12-situations")).toBe(false);
  await cs.locator(".ga-item").nth(1).getByRole("button", { name: "Try again" }).click();
  await cs.getByRole("button", { name: "Right 2" }).click();
  expect(await reqStatus(page, "l12-situations")).toBe(true);
});

test("print: only the work sample prints, with header, footer and line breaks kept (M-14, RT-30)", async ({ page }) => {
  await page.evaluate(() => { window.print = () => {}; });
  await page.evaluate(() => PVAGAActivities.printWorkSample({ title: "General Admin Task Map", subtitle: "Lesson 1",
    sections: [{ heading: "Notes", text: "Line one\nLine two" }] }));
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-sheet")).toBeVisible();
  await expect(page.locator("main")).toBeHidden();
  await expect(page.locator(".print-sheet .ps-footer")).toContainText("Training work sample — fictional client");
  const ws = await page.locator(".print-sheet .ps-text").evaluate((el) => getComputedStyle(el).whiteSpace);
  expect(ws).toBe("pre-wrap");
});

test("blocked storage shows the banner on load (M-03, RT-19)", async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException("blocked", "QuotaExceededError"); }; });
  const page = await ctx.newPage();
  await page.goto(HARNESS);
  await expect(page.locator(".ga-storage-banner")).toBeVisible();
  await expect(page.locator(".ga-storage-banner")).toHaveAttribute("role", "alert");
  await ctx.close();
});

test("contrast of v2 tokens meets WCAG (M-13, RT-29)", async ({ page }) => {
  const ratios = await page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((n) => { const c = n / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const kraft = document.querySelector(".btn-kraft");
    const eyebrow = document.querySelector(".harness-block .eyebrow");
    const cs = (el) => getComputedStyle(el);
    const input = document.querySelector(".ga-field input");
    return {
      kraftButton: cr(cs(kraft).color, cs(kraft).backgroundColor),
      eyebrowOnPaper: cr(cs(eyebrow).color, "rgb(250, 248, 242)"),
      inputBorder: cr(cs(input).borderTopColor, "rgb(255, 255, 255)"),
    };
  });
  expect(ratios.kraftButton).toBeGreaterThanOrEqual(4.5);
  expect(ratios.eyebrowOnPaper).toBeGreaterThanOrEqual(4.5);
  expect(ratios.inputBorder).toBeGreaterThanOrEqual(3);
});

test("axe-core: no serious or critical accessibility violations on the harness (RT-27)", async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const bad = results.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.length}`);
  expect(bad).toEqual([]);
});

test("no sideways scrolling at 375 and 320 px (M-16, RT-32)", async ({ browser }) => {
  for (const width of [375, 320]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(HARNESS);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    await ctx.close();
  }
});

test("leaving or reloading a page never overwrites a stored passing answer with an untouched form (found in WP2)", async ({ page }) => {
  const good = { rows: [
    { area: "A", tasks: "Sorting incoming email and sending confirmations", skills: "Clarity, tone, prioritizing" },
    { area: "B", tasks: "Booking client calls across time zones", skills: "Attention to detail, planning" },
    { area: "C", tasks: "Updating the contact spreadsheet every week", skills: "Accuracy, consistency, organization" }] };
  await page.evaluate((a) => PVAGAActivities.getStore().recordAttempt("l01-ws", { answer: a }), good);
  for (let i = 0; i < 2; i++) await page.reload();
  await page.goto("/");
  await page.goto(HARNESS);
  expect(await reqStatus(page, "l01-ws")).toBe(true);
  expect(await page.evaluate(() => PVAGAActivities.getStore().getRecord("l01-ws").answer.rows[2].area)).toBe("C");
});

test("sort with three or more bins: count first, ✗ from the second failed check (never the right bin), explanations once right (decision 5)", async ({ page }) => {
  const s3 = page.locator("#sort3");
  const place = async (item, bin) => {
    await s3.locator(".ga-chip", { hasText: item }).click();
    await s3.locator(`.ga-bin[data-bin="${bin}"] .ga-bin-place`).click();
  };
  await place("Belongs in A", "b"); await place("Belongs in B", "a"); await place("Belongs in C", "c");
  const check = s3.getByRole("button", { name: "Check my sorting" });
  await check.click();
  await expect(s3.locator(".ga-feedback")).toContainText("1 of 3 are in the right bin");
  await expect(s3.locator(".ga-chip .ga-mark")).toHaveCount(0);
  await expect(s3.locator(".ga-sort-notes")).toBeHidden();
  await check.click();
  await expect(s3.locator(".ga-chip.is-wrong")).toHaveCount(2);
  await expect(s3.locator(".ga-feedback")).toContainText("Items marked ✗");
  await expect(s3.locator(".ga-sort-notes")).toBeHidden();
  await expect(s3).not.toContainText("Explanation for");
  await place("Belongs in A", "a"); await place("Belongs in B", "b");
  await check.click();
  await expect(s3.locator(".ga-feedback")).toContainText("All 3 items are in the right bin.");
  await expect(s3.locator(".ga-sort-notes li")).toHaveCount(3);
});

test("identify: failed checks show counts only, never per-item notes (decision 5)", async ({ page }) => {
  const idf = page.locator("#identify");
  await idf.getByLabel("1. Maria Cruz").check();
  await idf.getByRole("button", { name: "Check my answer" }).click();
  await expect(idf.locator(".ga-feedback")).toContainText("2 missed, 1 ticked that shouldn't be");
  await expect(idf.locator(".ga-result-line .ga-mark")).toHaveCount(0);
});
