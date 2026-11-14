// WP6 verification additions (test-only):
//   RT-17 / RE-RT-02  correct-option position varies over 50 loads (spec wording)
//   RE-RT-03          the "pick the longest option" strategy fails
//   RT-27             axe on the 404 page (completes "all General Admin pages")
//   RT-37 / RE-RT-01  end to end: a genuine learner earns the certificate through the real pages;
//                     a click-through bot that picks first options and types filler earns nothing
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { SOLUTIONS } = require("./lesson-solutions");
const { FP_STEPS } = require("./final-project-solution");

const next = (page) => page.locator("#nextBtn");
const label = (page) => page.locator("#stepLabel");
const active = (page) => page.locator(".step-panel.active");
const url = (n) => `/lessons/lesson-${String(n).padStart(2, "0")}/`;
const seriousAxe = async (page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations
  .filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);

test("RT-17 / RE-RT-02: the correct option's position varies over 50 loads", async ({ page }) => {
  test.setTimeout(180_000);
  // Lesson 5 has three single-choice items on one page (two scenarios + the can't-fit question).
  const seen = { tz: new Set(), resched: new Set(), cannotfit: new Set() };
  await page.goto(url(5));
  await page.evaluate(() => localStorage.clear());
  for (let i = 0; i < 50; i++) {
    await page.reload();
    const pos = await page.evaluate(() => {
      const at = (sel, re) => [...document.querySelectorAll(`${sel} .ga-option`)].findIndex((b) => re.test(b.textContent));
      return {
        tz: at("#tzActivity", /^Confirm with the client which time zone/),
        resched: at("#reschedActivity", /^Check the client's calendar/),
        cannotfit: at("#scheduleActivity", /^The 2-hour focus block/),
      };
    });
    for (const k of Object.keys(seen)) seen[k].add(pos[k]);
  }
  for (const [k, s] of Object.entries(seen)) {
    expect(s.has(-1), `${k}: correct option always present`).toBe(false);
    expect(s.size, `${k}: positions over 50 loads`).toBeGreaterThanOrEqual(3);
  }
});

test("RE-RT-03: always picking the longest option fails (cannot earn the certificate)", async ({ page }) => {
  // Every active single-choice item, as each page hands it to the activity library.
  await page.addInitScript(() => {
    window.__items = [];
    let lib;
    Object.defineProperty(window, "PVAGAActivities", {
      configurable: true, get: () => lib,
      set(v) {
        const c = v.ChoiceActivity, s = v.ScheduleActivity, it = v.ChoiceItem;
        v.ChoiceActivity = (o) => { o.items.forEach((x) => window.__items.push(x)); return c(o); };
        v.ScheduleActivity = (o) => { if (o.question) window.__items.push(o.question.item); return s(o); };
        v.ChoiceItem = (el, x, o) => { window.__items.push(x); return it(el, x, o); };
        lib = v;
      },
    });
  });
  let total = 0, longestWins = 0;
  const blocked = [];
  for (const target of [...Array.from({ length: 13 }, (_, i) => url(i + 1)), "/final-project/"]) {
    await page.goto(target);
    const items = await page.evaluate(() => window.__items.map((it) => it.options.map((o) => ({ len: o.text.length, ok: !!o.correct }))));
    let fails = 0;
    for (const opts of items) {
      total++;
      const longest = opts.reduce((a, b) => (b.len > a.len ? b : a));
      if (longest.ok && opts.filter((o) => o.len === longest.len).length === 1) longestWins++; else fails++;
    }
    if (fails > 0) blocked.push(target);
  }
  expect(total).toBe(30);
  expect(longestWins / total, "longest option is right in a minority of items").toBeLessThan(0.5);
  // A learner who always picks the longest option is stopped somewhere in the course, so the
  // certificate (which needs every lesson and the Final Project) can't be earned that way.
  expect(blocked.length).toBeGreaterThan(0);
  console.log(`longest-option strategy: right on ${longestWins} of ${total}; blocked on ${blocked.length} pages`);
});

test("RT-27: the 404 page has no serious or critical accessibility issues", async ({ page }) => {
  const r = await page.goto("/this-page-does-not-exist/");
  expect(r.status()).toBe(404);
  expect(await seriousAxe(page)).toEqual([]);
  for (const w of [375, 320]) {
    await page.setViewportSize({ width: w, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${w}px`).toBeLessThanOrEqual(0);
  }
});

test("RT-37 / RE-RT-01: a genuine learner earns the certificate through the real pages", async ({ page }) => {
  test.setTimeout(600_000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("#certStatus")).toHaveText("Locked — 0 of 14 complete");
  // Lesson 1 (pilot page has its own step helpers)
  await page.goto(url(1));
  const choose = (re) => active(page).getByRole("button", { name: re }).click();
  for (let g = 0; g < 3; g++) await next(page).click();
  await choose(/Clarify what "clean" means/); await next(page).click(); await next(page).click();
  const SORT = { "Schedule a meeting": "Task", "Attention to detail": "Skill", "Clean a spreadsheet": "Task", "Professional communication": "Skill",
    "Organize a Google Drive folder": "Task", "Research five software options": "Task", "Time management": "Skill", "Draft a client update": "Task" };
  for (const [item, bin] of Object.entries(SORT)) {
    await active(page).locator(".ga-chip", { hasText: item }).click();
    await active(page).locator(".ga-bin", { has: page.locator("h4", { hasText: new RegExp(`^${bin}$`) }) }).locator(".ga-bin-place").click();
  }
  await active(page).getByRole("button", { name: "Check my sorting" }).click(); await next(page).click();
  await choose(/Escalate to the client/); await next(page).click();
  const ROWS = [["Communication", "Sorting the inbox and sending meeting confirmations", "Clear writing, professional tone"],
    ["Scheduling", "Booking calls across time zones and resolving conflicts", "Time management, attention to detail"],
    ["Information", "Keeping the shared drive organized and named consistently", "Organization, consistency, judgment"]];
  const grids = active(page).locator(".ga-row");
  for (let i = 0; i < ROWS.length; i++) {
    if (i >= (await grids.count())) await active(page).getByRole("button", { name: "+ Add another area" }).click();
    await grids.nth(i).locator("input").fill(ROWS[i][0]);
    await grids.nth(i).locator("textarea").nth(0).fill(ROWS[i][1]);
    await grids.nth(i).locator("textarea").nth(1).fill(ROWS[i][2]);
  }
  await next(page).click();
  await expect(label(page)).toHaveText("Complete");
  // Lessons 2–13
  for (let n = 2; n <= 13; n++) {
    await page.goto(url(n));
    for (let g = 0; g < 14; g++) {
      const m = /^Step (\d+) of/.exec(await label(page).innerText());
      if (!m) break;
      if (SOLUTIONS[n].steps[m[1]]) await SOLUTIONS[n].steps[m[1]](page);
      await next(page).click();
    }
    await expect(label(page), `Lesson ${n}`).toHaveText("Complete");
  }
  await expect(page.locator("#l13DoneHeading")).toHaveText("All 13 lessons complete.");
  // Final Project
  await page.goto("/final-project/");
  for (let g = 0; g < 14; g++) {
    const m = /^Step (\d+) of/.exec(await label(page).innerText());
    if (!m) break;
    if (FP_STEPS[m[1]]) await FP_STEPS[m[1]](page);
    await next(page).click();
  }
  await expect(label(page)).toHaveText("Complete");
  await expect(page.locator("#completionStatus")).toContainText("All 13 lessons and the Final Project are complete.");
  // Hub and certificate
  await page.goto("/");
  await expect(page.locator("#certStatus")).toHaveText("Ready");
  await expect(page.locator("#progressCount")).toHaveText("13");
  await page.goto("/certificate/");
  await expect(page.locator("#certStatusLine")).toContainText("Ready");
  await page.getByLabel(/^Your name, as it should appear/).fill("Ana Reyes");
  await page.getByLabel(/^I've read the scope statement/).check();
  await page.getByRole("button", { name: "Generate my certificate" }).click();
  await expect(page.locator("#certSheet")).toContainText("Ana Reyes");
  await expect(page.locator("#certSheet")).toContainText("has completed the self-paced online course General Administrative VA — Beginner Foundations");
  expect(errors).toEqual([]);
});

test("RE-RT-01: a click-through bot (first option, filler text) earns nothing anywhere", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  for (const target of [...Array.from({ length: 13 }, (_, i) => url(i + 1)), "/final-project/"]) {
    await page.goto(target);
    for (let g = 0; g < 14; g++) {
      if ((await label(page).innerText()) === "Complete") break;
      const opt = active(page).locator(".ga-option:not([disabled])");
      if (await opt.count()) await opt.first().click();
      for (const f of await active(page).locator("textarea:visible, input[type=text]:visible").all()) await f.fill("test test test test test");
      for (const s of await active(page).locator("select:visible").all()) {
        const v = await s.locator("option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
        if (v.length) await s.selectOption(v[0]);
      }
      for (const b of await active(page).getByRole("button", { name: /^(Check|Check all|Check my answer|Check my sorting)$/ }).all()) if (await b.isEnabled()) await b.click();
      if (await next(page).isDisabled()) break;
      await next(page).click();
    }
  }
  await page.goto("/");
  await expect(page.locator("#certStatus")).toHaveText("Locked — 0 of 14 complete");
  await expect(page.locator("#progressCount")).toHaveText("0");
  expect(await page.evaluate(() => PVAGA.createProgress({ rules: PVAGAValidators }).isCertificateEligible())).toBe(false);
});
