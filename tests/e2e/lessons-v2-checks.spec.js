// WP3b: behaviours the spec requires beyond "a genuine learner can finish".
//  - the 8 new checks: a wrong answer shows its explanation and keeps Continue locked;
//    the hint appears only after the second failed attempt (spec: shared rules);
//  - U-01: Purpose and Steps are accepted either way in the Lesson 9 gap check;
//  - M-09: the $499 renewal is Client review only;
//  - M-02: model answers stay locked until the learner's own work passes;
//  - M-10: answers and progress survive a reload; a completed lesson shows the banner.
const { test, expect } = require("@playwright/test");
const { SOLUTIONS, helpers } = require("./lesson-solutions");
const { panel, choose, sort, triage, identify } = helpers;

const url = (n) => `/lessons/lesson-${String(n).padStart(2, "0")}/`;
const next = (page) => page.locator("#nextBtn");
async function goToStep(page, n, step) {
  await page.goto(url(n));
  await page.evaluate(() => localStorage.clear());
  await page.goto(url(n));
  for (let s = 1; s < step; s++) {
    if (SOLUTIONS[n].steps[s]) await SOLUTIONS[n].steps[s](page);
    await next(page).click();
  }
  await expect(page.locator("#stepLabel")).toHaveText(new RegExp(`^Step ${step} of`));
}
const hint = (page) => panel(page).locator(".ga-hint");
const passed = (page, id) => page.evaluate((i) => PVAGAActivities.getStore().requirementStatus(i).passed, id);

// Wrong answers per new check: [lesson, step, requirement, doWrong(page), doRight(page)]
const NEW_CHECKS = [
  [5, 8, "l05-resched", (p) => choose(p, /^Move the call to Friday/), (p) => choose(p, /^Check the client's calendar/)],
  [6, 8, "l06-access", (p) => choose(p, /^Turn on "Anyone with the link/), (p) => choose(p, /^Share only the 02_Reports folder/)],
  [7, 8, "l07-formula", (p) => choose(p, /^=COUNTA\(D2:D101\)$/), (p) => choose(p, /^=COUNTIF\(D2:D101,"Active"\)$/, /^Turn on a filter/)],
  [8, 8, "l08-fact", (p) => triage(p, { "lists the Team plan": "Assumption" }), (p) => SOLUTIONS[8].steps[8](p)],
  [9, 6, "l09-follow", (p) => choose(p, /^Write a friendlier reminder/), (p) => choose(p, /^Update the tracker status/)],
  [10, 7, "l10-workload", (p) => choose(p, /^Start with the shortest task/), (p) => choose(p, /^Reply now: the three requests/)],
  [11, 7, "l11-uses", (p) => sort(p, { "rough meeting notes": "Human decision", "we received": "AI draft", "public industry": "AI draft", "refund outside": "Human decision", "vendor contract": "Human decision", "home addresses": "Don't put", "bank statement": "Don't put" }),
    async (p) => { await p.locator(".ga-chip", { hasText: "rough meeting notes" }).click(); await p.locator(".ga-bin", { has: p.locator("h4", { hasText: "AI draft" }) }).locator(".ga-bin-place").click(); await panel(p).getByRole("button", { name: "Check my sorting" }).click(); }],
  [12, 6, "l12-personal", (p) => identify(p, ["Customer name", "Mobile number", "Home address", "Payment card", "Product line code"]),
    async (p) => { await panel(p).locator(".ga-check", { hasText: "Product line code" }).locator("input").uncheck(); await identify(p, ["Technician note"]); }],
];

for (const [n, step, id, wrong, right] of NEW_CHECKS) {
  test(`new check ${id}: wrong keeps Continue locked with an explanation; hint only after the 2nd wrong attempt`, async ({ page }) => {
    await goToStep(page, n, step);
    await expect(next(page)).toBeDisabled();
    await expect(hint(page).first()).toBeHidden();
    await wrong(page);
    await expect(panel(page).locator(".ga-feedback").first()).toContainText(/Not quite|Not yet|in the right bin|correct/);
    await expect(next(page)).toBeDisabled();
    expect(await passed(page, id)).toBe(false);
    await expect(hint(page).first()).toBeHidden(); // one wrong attempt: no hint yet
    const retry = panel(page).getByRole("button", { name: "Try again" });
    if (await retry.count()) await retry.first().click();
    await wrong(page);
    await expect(hint(page).first()).toBeVisible();
    await expect(hint(page).first()).toContainText(/^Hint: /);
    if (await retry.count()) await retry.first().click();
    await right(page);
    await expect(next(page)).toBeEnabled();
    expect(await passed(page, id)).toBe(true);
  });
}

test("U-01: Lesson 9 gap check accepts Purpose and Steps ticked or not, with per-element feedback", async ({ page }) => {
  const base = ["Inputs", "Tools/access", "Exceptions", "Escalation", "Definition of done"];
  await goToStep(page, 9, 3);
  await identify(page, [...base, "Purpose", "Steps"]);
  await expect(next(page)).toBeEnabled();
  await expect(panel(page).locator(".ga-check", { hasText: "Purpose" }).locator(".ga-result-line")).toContainText("Arguable either way");
  await expect(panel(page).locator(".ga-check", { hasText: "Trigger" }).locator(".ga-result-line")).toContainText("Every Friday");
  await goToStep(page, 9, 3);
  await identify(page, ["Inputs", "Tools/access", "Exceptions", "Escalation"]); // misses Definition of done
  await expect(next(page)).toBeDisabled();
  await expect(panel(page).locator(".ga-check", { hasText: "Definition of done" }).locator(".ga-result-line")).toContainText("finished");
});

test("M-09: the $499 renewal is Client review only (Action is no longer accepted)", async ({ page }) => {
  await goToStep(page, 4, 6);
  await triage(page, {
    "Meeting moved": "Action", "Industry newsletter": "Reference", "Proposal needs client approval": "Client review",
    "Checking in on information": "Waiting", "Software renews tomorrow": "Action", "Thank you; issue resolved": "Archive",
  });
  await expect(next(page)).toBeDisabled();
  await expect(panel(page).locator(".ga-item", { hasText: "Software renews tomorrow" }).locator(".ga-result-line")).toContainText("Accepted: Client review.");
});

for (const [n, step, btn] of [[2, 6, "#clarifyRevealBtn"], [3, 6, "#johnRevealBtn"], [5, 6, "#dayRevealBtn"], [9, 4, "#sopRevealBtn"]]) {
  test(`M-02: Lesson ${n} model answer stays locked until the learner's work passes`, async ({ page }) => {
    await goToStep(page, n, step);
    const reveal = panel(page).locator(btn);
    await expect(reveal).toBeDisabled();
    await expect(panel(page).locator(".model-answer")).toBeHidden();
    await expect(panel(page).locator(".ga-reveal-note")).toBeVisible();
    await SOLUTIONS[n].steps[step](page);
    await expect(reveal).toBeEnabled();
    await reveal.click();
    await expect(panel(page).locator(".model-answer")).toBeVisible();
  });
}

for (const n of [2, 4, 8, 12, 13]) {
  test(`M-10: Lesson ${n} work sample and step survive a reload; completed lesson shows the banner`, async ({ page }) => {
    const steps = Object.keys(SOLUTIONS[n].steps).map(Number);
    const ws = Math.max(...steps);
    await goToStep(page, n, ws);
    await SOLUTIONS[n].steps[ws](page);
    await page.waitForTimeout(700); // autosave debounce
    await page.reload();
    await expect(page.locator("#stepLabel")).toHaveText(new RegExp(`^Step ${ws} of`));
    await expect(panel(page).locator(".ga-structure .ga-status").first()).toHaveText("Required parts complete");
    await next(page).click();
    await expect(page.locator("#stepLabel")).toHaveText("Complete");
    await page.reload();
    await expect(page.locator(".ga-note-banner")).toContainText("You completed this lesson.");
  });
}
