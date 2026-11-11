// WP3a pilot: Lesson 1 on the v2.0 activity library, served by the Cloudflare Pages runtime.
// Proves on the real page (not the harness) that:
//  - wrong answers and filler cannot finish the lesson (C-01/C-02);
//  - a genuine learner can finish, and completion is recorded in the v2 store only;
//  - the sort works by keyboard; answers and step restore after reload;
//  - print produces the learner's work sample; axe has no serious/critical issues;
//  - the page has no horizontal overflow at 375 px and 320 px.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const URL = "/lessons/lesson-01/";
const SHOTS = process.env.PVA_SHOTS_DIR; // optional: write handoff screenshots here
const next = (page) => page.locator("#nextBtn");
const label = (page) => page.locator("#stepLabel");
const active = (page) => page.locator(".step-panel.active");
const passed = (page, id) => page.evaluate((i) => PVAGAActivities.getStore().requirementStatus(i).passed, id);
const lessonComplete = (page) => page.evaluate(() => PVAGAActivities.getStore().evaluate().lessons.find((l) => l.n === 1).complete);
const shot = async (page, name, opts = {}) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); };

const SORT = {
  "Schedule a meeting": "Task", "Attention to detail": "Skill", "Clean a spreadsheet": "Task",
  "Professional communication": "Skill", "Organize a Google Drive folder": "Task",
  "Research five software options": "Task", "Time management": "Skill", "Draft a client update": "Task",
};
const GOOD_ROWS = [
  ["Communication", "Sorting the inbox and sending meeting confirmations", "Clear writing, professional tone"],
  ["Scheduling", "Booking calls across time zones and resolving conflicts", "Time management, attention to detail"],
  ["Information", "Keeping the shared drive organized and named consistently", "Organization, consistency, judgment"],
];

async function toStep(page, n) {
  for (let g = 0; g < 10 && (await label(page).innerText()) !== `Step ${n} of 8`; g++) await next(page).click();
  await expect(label(page)).toHaveText(`Step ${n} of 8`);
}
async function answerChoice(page, correctText) {
  await active(page).getByRole("button", { name: correctText }).click();
}
async function sortAllCorrectly(page) {
  const panel = active(page);
  for (const [item, bin] of Object.entries(SORT)) {
    await panel.locator(".ga-chip", { hasText: item }).click();
    await panel.locator(".ga-bin", { has: page.locator("h4", { hasText: new RegExp(`^${bin}$`) }) }).locator(".ga-bin-place").click();
  }
  await panel.getByRole("button", { name: "Check my sorting" }).click();
}
async function fillTaskMap(page, rows) {
  const grids = active(page).locator(".ga-row");
  for (let i = 0; i < rows.length; i++) {
    if (i >= (await grids.count())) await active(page).getByRole("button", { name: "+ Add another area" }).click();
    const g = grids.nth(i);
    await g.locator("input").fill(rows[i][0]);
    await g.locator("textarea").nth(0).fill(rows[i][1]);
    await g.locator("textarea").nth(1).fill(rows[i][2]);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL);
});

test("page loads the v2 library only; legacy progress scripts are gone", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload();
  expect(await page.evaluate(() => [typeof PVAGAActivities, typeof PVACore, typeof window.PVAProgress])).toEqual(["object", "object", "undefined"]);
  await expect(page.locator("body")).toHaveClass(/ga-v2/);
  await expect(label(page)).toHaveText("Step 1 of 8");
  expect(errors).toEqual([]);
});

test("wrong answers keep Continue locked on steps 4 and 7; hint-free retry still requires the right answer", async ({ page }) => {
  await toStep(page, 4);
  await expect(next(page)).toBeDisabled();
  await answerChoice(page, /Work as quickly as you can/);
  await expect(active(page).locator(".ga-feedback")).toContainText("Try again.");
  await expect(next(page)).toBeDisabled();
  await active(page).getByRole("button", { name: "Try again" }).click();
  await answerChoice(page, /Rely on the spreadsheet skills/);
  await expect(next(page)).toBeDisabled();
  expect(await passed(page, "l01-pay")).toBe(false);
  await active(page).getByRole("button", { name: "Try again" }).click();
  await answerChoice(page, /Clarify what "clean" means/);
  await expect(next(page)).toBeEnabled();
  expect(await passed(page, "l01-pay")).toBe(true);

  await next(page).click(); await next(page).click(); // 5 (ungated) -> 6
  await sortAllCorrectly(page);
  await next(page).click();
  await expect(label(page)).toHaveText("Step 7 of 8");
  await answerChoice(page, /Approve the refund/);
  await expect(next(page)).toBeDisabled();
  expect(await passed(page, "l01-limit")).toBe(false);
});

test("sort: wrong placements are marked and keep Continue locked until fixed", async ({ page }) => {
  await toStep(page, 4);
  await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click();
  const panel = active(page);
  const chips = panel.locator(".ga-pool .ga-chip");
  while (await chips.count()) { await chips.first().click(); await panel.locator(".ga-bin-place").first().click(); }
  await panel.getByRole("button", { name: "Check my sorting" }).click();
  await expect(panel.locator(".ga-feedback")).toContainText("5 of 8 are in the right bin");
  await expect(panel.locator(".ga-chip.is-wrong")).toHaveCount(3);
  await expect(next(page)).toBeDisabled();
  for (const item of ["Attention to detail", "Professional communication", "Time management"]) {
    await panel.locator(".ga-chip", { hasText: item }).click();
    await panel.locator(".ga-bin", { has: page.locator("h4", { hasText: /^Skill$/ }) }).locator(".ga-bin-place").click();
  }
  await panel.getByRole("button", { name: "Check my sorting" }).click();
  await expect(next(page)).toBeEnabled();
});

test("sort is fully keyboard operable", async ({ page }) => {
  await toStep(page, 4);
  await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click();
  const panel = active(page);
  for (const [item, bin] of Object.entries(SORT)) {
    await panel.locator(".ga-chip", { hasText: item }).focus();
    await page.keyboard.press("Enter");
    const place = panel.locator(".ga-bin", { has: page.locator("h4", { hasText: new RegExp(`^${bin}$`) }) }).locator(".ga-bin-place");
    await place.focus();
    await page.keyboard.press("Enter");
  }
  await panel.getByRole("button", { name: "Check my sorting" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel.locator(".ga-feedback")).toContainText("All 8 items are in the right bin.");
  expect(await passed(page, "l01-sort")).toBe(true);
});

test("Task Map: filler and duplicate rows do not pass; three genuine rows do", async ({ page }) => {
  await toStep(page, 4); await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click(); await sortAllCorrectly(page);
  await next(page).click(); await answerChoice(page, /Escalate to the client/);
  await next(page).click();
  await expect(label(page)).toHaveText("Step 8 of 8");
  const status = active(page).locator(".ga-structure .ga-status");
  await expect(status).toContainText("Missing:");

  await fillTaskMap(page, [["Communication", "xxxx", "xxx"], ["Scheduling", "x x x x", "y y y"], ["Information", "a", "b"]]);
  await expect(status).toContainText("Missing:");
  await expect(next(page)).toBeDisabled();

  const dup = [GOOD_ROWS[0], GOOD_ROWS[0], GOOD_ROWS[0]];
  await fillTaskMap(page, dup);
  await expect(status).toContainText("No two rows are the same");
  await expect(next(page)).toBeDisabled();

  await fillTaskMap(page, GOOD_ROWS);
  await expect(status).toHaveText("Required parts complete");
  await expect(active(page).locator(".ga-transparency")).toBeVisible();
  await expect(next(page)).toBeEnabled();
  // preview mirrors the learner's rows
  await expect(page.locator("#exportPreview td").first()).toHaveText("Communication");
});

test("genuine learner finishes; completion is recorded in the v2 store and the V1 key is untouched", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("pva-gadmin-ft-progress", JSON.stringify({ completed: [] })));
  await page.reload();
  expect(await lessonComplete(page)).toBe(false);
  await shot(page, "l01-step1", { fullPage: false });
  await toStep(page, 4);
  await answerChoice(page, /Clarify what "clean" means/);
  await shot(page, "l01-step4-correct");
  await next(page).click(); await next(page).click();
  await sortAllCorrectly(page);
  await shot(page, "l01-step6-sorted");
  await next(page).click();
  await answerChoice(page, /Escalate to the client/);
  await next(page).click();
  await fillTaskMap(page, GOOD_ROWS);
  await expect(active(page).locator(".ga-status")).toHaveText("Required parts complete");
  await shot(page, "l01-step8-taskmap");
  await expect(next(page)).toHaveText("Finish Lesson →");
  await next(page).click();
  await expect(label(page)).toHaveText("Complete");
  await shot(page, "l01-complete");
  expect(await lessonComplete(page)).toBe(true);
  const raw = await page.evaluate(() => [localStorage.getItem("pvaga:progress:v2"), localStorage.getItem("pva-gadmin-ft-progress")]);
  expect(raw[0]).toContain("l01-ws");
  expect(raw[1]).toBe(JSON.stringify({ completed: [] }));
});

test("reload restores answers and step, never past the first incomplete activity", async ({ page }) => {
  await toStep(page, 4);
  await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click();
  await expect(label(page)).toHaveText("Step 6 of 8");
  await page.reload();
  await expect(label(page)).toHaveText("Step 6 of 8");
  await page.locator("#prevBtn").click(); await page.locator("#prevBtn").click();
  await expect(active(page).locator(".ga-option.is-correct")).toContainText('Clarify what "clean" means');
  await toStep(page, 6);
  await sortAllCorrectly(page);
  await next(page).click(); await answerChoice(page, /Escalate to the client/);
  await next(page).click();
  await fillTaskMap(page, GOOD_ROWS.slice(0, 2));
  await page.waitForTimeout(700); // autosave debounce
  // a stored step beyond the first locked gate is capped
  await page.evaluate(() => PVAGAActivities.getStore().saveDraft("l01:step", "9"));
  await page.reload();
  await expect(label(page)).toHaveText("Step 8 of 8");
  await expect(active(page).locator(".ga-row").nth(1).locator("textarea").first()).toHaveValue(GOOD_ROWS[1][1]);
  await expect(next(page)).toBeDisabled();
});

test("returning after completion shows the completed banner and saved work", async ({ page }) => {
  await toStep(page, 4); await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click(); await sortAllCorrectly(page);
  await next(page).click(); await answerChoice(page, /Escalate to the client/);
  await next(page).click(); await fillTaskMap(page, GOOD_ROWS);
  await expect(next(page)).toBeEnabled();
  await next(page).click();
  await expect(label(page)).toHaveText("Complete");
  await page.reload();
  await expect(page.locator(".ga-note-banner")).toContainText("You completed this lesson.");
  await shot(page, "l01-return-banner");
});

test("print builds a work sample sheet with the learner's rows only", async ({ page }) => {
  await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await toStep(page, 4); await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click(); await sortAllCorrectly(page);
  await next(page).click(); await answerChoice(page, /Escalate to the client/);
  await next(page).click(); await fillTaskMap(page, GOOD_ROWS);
  await page.locator("#printBtn").click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
  const sheet = page.locator(".print-sheet");
  await expect(sheet.locator("h1")).toHaveText("General Admin Task Map");
  await expect(sheet.locator("tbody tr")).toHaveCount(3);
  await expect(sheet.locator(".ps-footer")).toContainText("checked for required parts only");
  await page.emulateMedia({ media: "print" });
  await shot(page, "l01-print", { fullPage: true });
});

test("axe: no serious or critical violations on each gated step", async ({ page }) => {
  const scan = async () => {
    const r = await new AxeBuilder({ page }).include(".step-panel.active").withTags(["wcag2a", "wcag2aa"]).analyze();
    return r.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.length}`);
  };
  await toStep(page, 4); expect(await scan()).toEqual([]);
  await answerChoice(page, /Work as quickly as you can/); expect(await scan()).toEqual([]);
  await active(page).getByRole("button", { name: "Try again" }).click();
  await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click(); expect(await scan()).toEqual([]);
  await sortAllCorrectly(page); expect(await scan()).toEqual([]);
  await next(page).click(); await answerChoice(page, /Escalate to the client/); expect(await scan()).toEqual([]);
  await next(page).click(); await fillTaskMap(page, GOOD_ROWS); expect(await scan()).toEqual([]);
});

for (const width of [375, 320]) {
  test(`no horizontal overflow at ${width}px on any step`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    for (let n = 1; n <= 4; n++) { await toStep(page, n); expect(await overflow(), `step ${n}`).toBeLessThanOrEqual(0); }
    await answerChoice(page, /Clarify what "clean" means/);
    await next(page).click(); expect(await overflow(), "step 5").toBeLessThanOrEqual(0);
    await next(page).click();
    expect(await overflow(), "step 6").toBeLessThanOrEqual(0);
    await sortAllCorrectly(page);
    await next(page).click(); await answerChoice(page, /Escalate to the client/);
    expect(await overflow(), "step 7").toBeLessThanOrEqual(0);
    await next(page).click();
    await fillTaskMap(page, GOOD_ROWS);
    expect(await overflow(), "step 8").toBeLessThanOrEqual(0);
    await next(page).click();
    expect(await overflow(), "completion").toBeLessThanOrEqual(0);
  });
}

// ---------------- WP3a review revisions ----------------

async function choiceTexts(page) {
  return active(page).locator(".ga-option").evaluateAll((els) => els.map((e) => e.textContent.trim()));
}

test("answer length is not a cue: the correct option is never the longest (steps 4 and 7)", async ({ page }) => {
  await toStep(page, 4);
  let texts = await choiceTexts(page);
  const pay = texts.find((t) => t.startsWith('Clarify what "clean" means'));
  expect(texts).toHaveLength(3);
  expect(Math.max(...texts.map((t) => t.length))).toBeGreaterThan(pay.length);
  await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click(); await sortAllCorrectly(page); await next(page).click();
  texts = await choiceTexts(page);
  const limit = texts.find((t) => t.startsWith("Escalate to the client"));
  expect(texts).toHaveLength(3);
  expect(Math.max(...texts.map((t) => t.length))).toBeGreaterThan(limit.length);
  // and no option is wildly shorter than the rest (within 20% of the longest)
  for (const t of texts) expect(t.length).toBeGreaterThan(0.8 * Math.max(...texts.map((x) => x.length)));
});

async function reachTaskMap(page) {
  await toStep(page, 4); await answerChoice(page, /Clarify what "clean" means/);
  await next(page).click(); await next(page).click(); await sortAllCorrectly(page);
  await next(page).click(); await answerChoice(page, /Escalate to the client/);
  await next(page).click();
  await expect(label(page)).toHaveText("Step 8 of 8");
}

test("Task Map check: no reference to a missing checklist; review instruction shown instead", async ({ page }) => {
  await reachTaskMap(page);
  const box = active(page).locator(".ga-structure");
  await expect(box).not.toContainText(/checklist/i);
  await expect(box.locator(".ga-review-note")).toHaveText(/^Before you save it, review your completed Task Map/);
});

test("preview: three-column table on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await reachTaskMap(page);
  await fillTaskMap(page, GOOD_ROWS);
  await expect(page.locator("#exportPreview .ga-preview-table")).toBeVisible();
  await expect(page.locator("#exportPreview .ga-preview-cards")).toBeHidden();
  await expect(page.locator("#exportPreview .ga-preview-table th")).toHaveText(["Area", "Tasks", "Skills"]);
  await expect(page.locator("#exportPreview .ga-preview-table tr")).toHaveCount(4);
});

for (const width of [375, 320]) {
  test(`preview at ${width}px: one stacked, labelled card per area, readable line length`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await reachTaskMap(page);
    await fillTaskMap(page, GOOD_ROWS);
    const cards = page.locator("#exportPreview .ga-preview-card");
    await expect(page.locator("#exportPreview .ga-preview-table")).toBeHidden();
    await expect(cards).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(cards.nth(i).locator("dt")).toHaveText(["Area", "Tasks", "Skills"]);
      await expect(cards.nth(i).locator("dd")).toHaveText(GOOD_ROWS[i]);
    }
    // Readability: each value gets (almost) the full card width, at body size, and the
    // longest sample task wraps to at most 3 lines.
    const m = await cards.first().evaluate((card) => {
      const dd = card.querySelectorAll("dd");
      const cs = getComputedStyle(dd[1]);
      return { card: card.clientWidth, dd: Math.min(...[...dd].map((d) => d.clientWidth)), font: parseFloat(cs.fontSize),
        lines: Math.round(dd[1].getBoundingClientRect().height / parseFloat(cs.lineHeight)) };
    });
    expect(m.dd).toBeGreaterThanOrEqual(m.card - 30);
    expect(m.font).toBeGreaterThanOrEqual(15);
    expect(m.lines).toBeLessThanOrEqual(3);
    // edits update the cards live
    await active(page).locator(".ga-row").first().locator("input").fill("Inbox and messages");
    await expect(cards.first().locator("dd").first()).toHaveText("Inbox and messages");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

// Handoff evidence: the same screens at desktop, 375 px and 320 px (only when PVA_SHOTS_DIR is set).
for (const [name, width] of [["desktop", 1280], ["375", 375], ["320", 320]]) {
  test(`screenshots at ${name}`, async ({ page }) => {
    test.skip(!SHOTS, "set PVA_SHOTS_DIR to capture handoff screenshots");
    await page.setViewportSize({ width, height: width > 1000 ? 900 : 780 });
    const panel = (n) => shot(page, `${name}-${n}`, { fullPage: true });
    await toStep(page, 4); await panel("step4-scenario");
    await answerChoice(page, /Clarify what "clean" means/); await panel("step4-correct");
    await next(page).click(); await next(page).click(); await panel("step6-sort");
    await sortAllCorrectly(page); await panel("step6-sorted");
    await next(page).click(); await panel("step7-scenario");
    await answerChoice(page, /Escalate to the client/);
    await next(page).click(); await fillTaskMap(page, GOOD_ROWS);
    await expect(active(page).locator(".ga-status")).toHaveText("Required parts complete");
    await panel("step8-taskmap");
    await page.locator("#exportBox").scrollIntoViewIfNeeded();
    await page.locator("#exportBox").screenshot({ path: `${SHOTS}/${name}-step8-preview.png` });
    await next(page).click(); await panel("complete");
  });
}

test("Try again appears only after a wrong answer (hidden before answering and after a correct answer)", async ({ page }) => {
  await toStep(page, 4);
  const retry = active(page).getByRole("button", { name: "Try again" });
  await expect(retry).toBeHidden();
  await answerChoice(page, /Work as quickly as you can/);
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(retry).toBeHidden();
  await answerChoice(page, /Clarify what "clean" means/);
  await expect(retry).toBeHidden();
});
