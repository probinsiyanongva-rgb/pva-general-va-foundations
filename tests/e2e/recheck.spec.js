// WP3b correction pass, decision 5: Quick re-check before lesson completion.
// Scenarios: first-try correct, first-try wrong then correct, repeated wrong re-check answers,
// refresh during the re-check, return visit with an incomplete re-check, the new Lesson 5
// question in the re-check, no feedback/hints/explanations during the re-check, the
// certificate is not unlocked by the re-check, accessibility and 320 px layout.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { SOLUTIONS, helpers } = require("./lesson-solutions");

const url = (n) => `/lessons/lesson-${String(n).padStart(2, "0")}/`;
const next = (page) => page.locator("#nextBtn");
const label = (page) => page.locator("#stepLabel");
const recheck = (page) => page.locator(".step-panel.active .ga-recheck");
const lessonComplete = (page, n) => page.evaluate((k) => PVAGAActivities.getStore().evaluate().lessons.find((l) => l.n === k).complete, n);
const rcState = (page, n) => page.evaluate((k) => PVAGA.recheck.read(k, (id, fb) => PVAGAActivities.getStore().getDraft(id, fb)), n);
const attempts = (page, id) => page.evaluate((i) => (PVAGAActivities.getStore().getRecord(i) || {}).attempts || 0, id);

async function fresh(page, n) {
  await page.goto(url(n));
  await page.evaluate(() => localStorage.clear());
  await page.goto(url(n));
}
async function stepNo(page) {
  const m = /^Step (\d+) of (\d+)$/.exec(await label(page).innerText());
  return m ? Number(m[1]) : null;
}
// Walks to the completion step. overrides[step] solves that step instead of SOLUTIONS.
async function walk(page, n, overrides = {}) {
  for (let guard = 0; guard < 20; guard++) {
    const st = await stepNo(page);
    if (!st) return;
    const solve = overrides[st] || SOLUTIONS[n].steps[st];
    if (solve) await solve(page);
    await next(page).click();
  }
}
const p = helpers.panel;
async function wrongThenRight(page, wrong, right) {
  await p(page).getByRole("button", { name: wrong }).first().click();
  await p(page).getByRole("button", { name: "Try again" }).first().click();
  await p(page).getByRole("button", { name: right }).first().click();
}
// Answers the re-check question currently shown with the option matching `re`.
const answer = (page, re) => recheck(page).locator(".ga-recheck-item").getByRole("button", { name: re }).click();
async function expectNoRevealInRecheck(page) {
  const box = recheck(page);
  await expect(box.locator(".ga-feedback, .ga-hint, .ga-sort-notes, .model-answer, .ga-option.is-correct, .ga-option.is-wrong")).toHaveCount(0);
  await expect(box).not.toContainText("Correct.");
  await expect(box).not.toContainText("Hint:");
}

test("first try correct: no re-check, the lesson completes as before", async ({ page }) => {
  await fresh(page, 3);
  await walk(page, 3);
  await expect(label(page)).toHaveText("Complete");
  await expect(page.locator(".ga-recheck")).toHaveCount(0);
  expect(await lessonComplete(page, 3)).toBe(true);
  expect((await rcState(page, 3)).queue).toEqual([]);
});

test("first try wrong then correct: re-check is required, shows no feedback, then completes", async ({ page }) => {
  await fresh(page, 3);
  await walk(page, 3, { 7: (pg) => wrongThenRight(pg, /^Sign it and send it back/, /^Escalate to the client/) });
  await expect(label(page)).toHaveText("Quick re-check");
  await expect(recheck(page)).toBeVisible();
  await expect(page.locator(".step-panel.active .completion-panel")).toBeHidden();
  await expect(recheck(page)).toContainText("1 question left");
  await expect(recheck(page)).toContainText("A vendor emails asking you to sign"); // the scenario is shown again
  await expectNoRevealInRecheck(page);
  expect(await lessonComplete(page, 3)).toBe(false);
  const before = await attempts(page, "l03-escalate");
  await answer(page, /^Escalate to the client/);
  await expect(label(page)).toHaveText("Complete");
  await expect(page.locator(".step-panel.active .completion-panel")).toBeVisible();
  expect(await lessonComplete(page, 3)).toBe(true);
  const st = await rcState(page, 3);
  expect(st.items["l03-escalate#0"].original.wrong).toBe(1);
  expect(st.items["l03-escalate#0"].recheck).toMatchObject({ attempts: 1, wrong: 0 });
  expect(st.items["l03-escalate#0"].recheck.passedAt).toBeTruthy();
  expect(await attempts(page, "l03-escalate")).toBe(before); // re-check answers are not requirement attempts
});

test("repeated wrong re-check answers: no explanation, item stays queued, completion waits", async ({ page }) => {
  await fresh(page, 3);
  await walk(page, 3, { 7: (pg) => wrongThenRight(pg, /^Sign it and send it back/, /^Escalate to the client/) });
  for (let i = 0; i < 2; i++) {
    await answer(page, /^Sign it and send it back/);
    await expect(recheck(page).locator(".ga-recheck-status")).toHaveText("Not yet — this question will come back after the others.");
    await expectNoRevealInRecheck(page);
    await expect(recheck(page)).toContainText("1 question left");
    expect(await lessonComplete(page, 3)).toBe(false);
  }
  await answer(page, /^Escalate to the client/);
  await expect(label(page)).toHaveText("Complete");
  const st = await rcState(page, 3);
  expect(st.items["l03-escalate#0"].original.wrong).toBe(1);
  expect(st.items["l03-escalate#0"].recheck).toMatchObject({ attempts: 3, wrong: 2 });
});

test("Lesson 5: the new can't-fit question and other wrong items join the re-check; refresh resumes it", async ({ page }) => {
  await fresh(page, 5);
  await walk(page, 5, {
    6: async (pg) => {
      for (const [item, time] of [["Team meeting", "10:00 AM"], ["Vendor call", "11:00 AM"], ["Client presentation", "3:00 PM"], ["15-minute buffer", "2:45 PM"], ["Prospect call", "1:00 PM"]]) {
        await p(pg).getByLabel(item).selectOption({ label: time });
      }
      await wrongThenRight(pg, /^Nothing — every request fits/, /^The 2-hour focus block — /);
      await helpers.complete(pg);
    },
    7: (pg) => wrongThenRight(pg, /^Send the invite at 3 PM Manila time/, /^Confirm with the client which time zone/),
  });
  await expect(label(page)).toHaveText("Quick re-check");
  await expect(recheck(page)).toContainText("2 questions left");
  const st = await rcState(page, 5);
  expect(st.queue.sort()).toEqual(["l05-schedule#cannotfit", "l05-tz#0"]);
  // Answer whichever question is first, then refresh mid re-check
  const first = st.queue[0];
  await answer(page, first === "l05-tz#0" ? /^Confirm with the client which time zone/ : /^The 2-hour focus block — /);
  await expect(recheck(page)).toContainText("1 question left");
  await page.reload();
  await expect(label(page)).toHaveText("Quick re-check");
  await expect(recheck(page)).toContainText("1 question left");
  await expectNoRevealInRecheck(page);
  expect(await lessonComplete(page, 5)).toBe(false);
  if (first === "l05-tz#0") {
    await expect(recheck(page)).toContainText("Prospect call (30 minutes)"); // the rules box comes with the question
    await answer(page, /^The 2-hour focus block — /);
  } else await answer(page, /^Confirm with the client which time zone/);
  await expect(label(page)).toHaveText("Complete");
  expect(await lessonComplete(page, 5)).toBe(true);
});

test("return visit with an incomplete re-check: resumes on the completion step; the lesson is not counted meanwhile", async ({ page }) => {
  await fresh(page, 3);
  await walk(page, 3, { 7: (pg) => wrongThenRight(pg, /^Sign it and send it back/, /^Escalate to the client/) });
  await expect(label(page)).toHaveText("Quick re-check");
  await page.goto("/"); // leave the lesson (the hub moves to the v2 store in WP4)
  await page.goto(url(3));
  expect(await lessonComplete(page, 3)).toBe(false);
  await expect(label(page)).toHaveText("Quick re-check");
  await expect(recheck(page)).toContainText("1 question left");
  // Calling completion directly is refused while the re-check is outstanding
  expect(await page.evaluate(() => PVAGAActivities.getStore().markLessonComplete(3))).toEqual({ ok: false, saved: false, reason: "completion-guard" });
  await answer(page, /^Escalate to the client/);
  await expect(label(page)).toHaveText("Complete");
});

test("the re-check never unlocks the certificate on its own", async ({ page }) => {
  await fresh(page, 3);
  // A re-check record marked passed, with no lesson requirements passed
  await page.evaluate(() => {
    const s = PVAGAActivities.getStore();
    s.saveDraft("l03:recheck", JSON.stringify({ v: 1, queue: [], items: { "l03-escalate#0": { original: { wrong: 1 }, recheck: { attempts: 1, wrong: 0, passedAt: new Date().toISOString() } } } }));
  });
  const r = await page.evaluate(() => { const s = PVAGAActivities.getStore(); return { mark: s.markLessonComplete(3), ev: s.evaluate() }; });
  expect(r.mark.ok).toBe(false);
  expect(r.ev.completedLessons).toBe(0);
  expect(r.ev.eligible).toBe(false);
});

test("re-check: axe finds no serious/critical issues; no horizontal overflow at 320px", async ({ page }) => {
  await fresh(page, 3);
  await walk(page, 3, { 7: (pg) => wrongThenRight(pg, /^Sign it and send it back/, /^Escalate to the client/) });
  const r = await new AxeBuilder({ page }).include(".step-panel.active").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => v.id)).toEqual([]);
  await expect(page.locator(":focus")).toHaveText("Quick re-check");
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
