// WP4: the Final Project on the v2.0 activity library.
// Gates (9 requirements), Finish-only completion, live current status vs historical completedAt
// (red-team F1, decision R2), Task 3 field-level checks and R5 (F2), report print/download (C-04, R3),
// report name (Q12), completion wording (Q13), V1 store untouched (Q14), accessibility and layout (F4).
const fs = require("fs");
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { FP_STEPS, T3, fillRecord } = require("./final-project-solution");
const { helpers } = require("./lesson-solutions");

const URL_FP = "/final-project/";
const SHOTS = process.env.PVA_SHOTS_DIR;
const next = (page) => page.locator("#nextBtn");
const label = (page) => page.locator("#stepLabel");
const panel = helpers.panel;
const passed = (page, id) => page.evaluate((i) => PVAGAActivities.getStore().requirementStatus(i).passed, id);
const fpState = (page) => page.evaluate(() => { const s = PVAGAActivities.getStore(); return { ev: s.evaluate().finalProject, eligible: s.evaluate().eligible, snap: s.snapshot().finalProject }; });

async function fresh(page) {
  await page.goto(URL_FP);
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL_FP);
}
async function stepNo(page) {
  const m = /^Step (\d+) of (\d+)$/.exec(await label(page).innerText());
  return m ? Number(m[1]) : null;
}
// Walk to step `stop` (or to the end), solving each gated step on the way.
async function walk(page, { stop = 99, each } = {}) {
  for (let guard = 0; guard < 14; guard++) {
    const st = await stepNo(page);
    if (!st || st >= stop) return;
    if (FP_STEPS[st]) await expect(next(page), `step ${st} starts locked`).toBeDisabled();
    if (each) await each(st);
    if (FP_STEPS[st]) await FP_STEPS[st](page);
    await expect(next(page), `step ${st} unlocks`).toBeEnabled();
    await next(page).click();
  }
}
async function axe(page) {
  const r = await new AxeBuilder({ page }).include(".step-panel.active").withTags(["wcag2a", "wcag2aa"]).analyze();
  return r.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test("genuine learner finishes; completion only on Finish; V1 store untouched; no page errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fresh(page);
  await page.evaluate(() => localStorage.setItem("pva-gadmin-ft-progress", '{"lessons":{}}'));
  expect(await page.evaluate(() => typeof window.PVAFT)).toBe("undefined");
  await walk(page, { stop: 10 });
  await FP_STEPS[10](page);
  await expect(next(page)).toHaveText("Finish Project →");
  expect((await fpState(page)).ev.complete, "requirements alone are not completion").toBe(false);
  await next(page).click();
  await expect(label(page)).toHaveText("Complete");
  const st = await fpState(page);
  expect(st.ev.complete).toBe(true);
  expect(st.ev.passed).toBe(9);
  expect(st.snap.completedAt).toBeTruthy();
  expect(await page.evaluate(() => localStorage.getItem("pva-gadmin-ft-progress"))).toBe('{"lessons":{}}');
  await expect(page.locator("#completionStatus")).toHaveText("Final Project complete. 13 lessons still to finish before your certificate.");
  expect(errors).toEqual([]);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/FP-complete.png`, fullPage: true });
});

test("wrong or filler work keeps each task locked (all 9 requirements)", async ({ page }) => {
  await fresh(page);
  const p = () => panel(page);
  const locked = async (id) => { await expect(next(page)).toBeDisabled(); expect(await passed(page, id)).toBe(false); };
  await next(page).click();
  // Task 1: a spend decision filed as Action
  for (const sel of await p().locator(".ga-item select").all()) await sel.selectOption("action");
  await p().getByRole("button", { name: "Check all" }).click();
  await locked("fp-t1");
  await FP_STEPS[2](page); await next(page).click();
  // Task 2: walk-through on Wednesday morning as the customer asked
  await FP_STEPS[3](page);
  await p().getByLabel("Customer walk-through (1 hour) — day", { exact: true }).selectOption("Wed");
  await p().getByLabel("Customer walk-through (1 hour)", { exact: true }).selectOption({ label: "9:00 AM" });
  await expect(p().locator(".ga-structure li", { hasText: "Wednesday morning" })).toContainText("✗");
  await locked("fp-t2");
  await FP_STEPS[3](page); await next(page).click();
  // Task 3: untouched table
  await p().getByLabel("Cleaning rules you used (one per line)").fill("Title Case\nPhones\nDates");
  await expect(p().locator(".ga-structure .ga-status")).toContainText("Missing");
  await locked("fp-t3");
  await FP_STEPS[4](page); await next(page).click();
  // Task 4: "today" is not a date checked
  await FP_STEPS[5](page);
  await p().locator('.ga-row:not([data-example="true"])').first().getByLabel(/^Date checked/).fill("today");
  await locked("fp-t4");
  await FP_STEPS[5](page); await next(page).click();
  // Task 5: filler
  for (const f of ["Purpose", "Trigger", "Inputs", "Tools/access", "Steps", "Exceptions", "Escalation", "Definition of done"]) await p().getByLabel(f, { exact: true }).fill("test test test test test test test");
  await locked("fp-t5");
  await FP_STEPS[6](page); await next(page).click();
  // Task 6: placeholder owner
  await FP_STEPS[7](page);
  await p().locator('.ga-row:not([data-example="true"])').first().getByLabel(/^Owner/).fill("tbd");
  await locked("fp-t6");
  await FP_STEPS[7](page); await next(page).click();
  // Task 7: confirmation left unticked
  await FP_STEPS[8](page);
  await p().getByLabel("I did not paste any confidential or personal data into the AI tool.").uncheck();
  await locked("fp-t7");
  await FP_STEPS[8](page); await next(page).click();
  // Task 8: wrong option, then copied feedback
  await p().getByRole("button", { name: /^Share the owner's login/ }).click();
  await p().getByLabel(/^Briefly explain/).fill("I won't share the owner's login. I tell the owner straight away and ask them to set up the subcontractor's own account, then confirm with the subcontractor once access works.");
  await locked("fp-t8");
  await p().getByRole("button", { name: "Try again" }).click();
  await p().getByRole("button", { name: /^Explain that credentials can't be shared/ }).click();
  await p().getByLabel(/^Briefly explain/).fill("If the software supports separate logins or delegated access, set that up (or flag it to the owner to set up) rather than sharing credentials — even under time pressure.");
  await expect(p().locator(".ga-structure li", { hasText: "own words" })).toContainText("○");
  await locked("fp-t8");
  await p().getByLabel(/^Briefly explain/).fill("I won't share the owner's login. I tell the owner straight away and ask them to set up the subcontractor's own account, then confirm with the subcontractor once access works.");
  await expect(next(page)).toBeEnabled();
  await next(page).click();
  // Checklist: 7 of 8
  await FP_STEPS[10](page);
  await p().locator(".ga-check input[type=checkbox]").last().uncheck();
  await locked("fp-checklist");
  expect((await fpState(page)).ev.complete).toBe(false);
});

test("Task 1: progressive disclosure — count first, then marks, never the accepted category", async ({ page }) => {
  await fresh(page);
  await next(page).click();
  const p = panel(page);
  for (const [msg, cat] of Object.entries({ "Kitchen faucet leak": "Action", "Insurance renewal invoice": "Action" })) await p.locator(".ga-item", { hasText: msg }).locator("select").selectOption({ label: cat });
  await p.getByRole("button", { name: "Check all" }).click();
  await expect(p.locator(".ga-result-line .ga-mark")).toHaveCount(0);
  await p.getByRole("button", { name: "Check all" }).click();
  await expect(p.locator(".ga-item", { hasText: "Insurance renewal invoice" }).locator(".ga-result-line")).toContainText("Not Action.");
  await expect(p).not.toContainText("Accepted");
  await expect(p).not.toContainText("needs the owner's approval");
  await expect(next(page)).toBeDisabled();
});

test("Task 3: R5 date and clarification are separate; guesses and blanks fail; checklist never names a record", async ({ page }) => {
  await fresh(page);
  await walk(page, { stop: 4 });
  await FP_STEPS[4](page);
  expect(await passed(page, "fp-t3")).toBe(true);
  const st = () => panel(page).locator(".ga-structure");
  for (const date of ["2026-04-03", "2026-03-04", ""]) {
    await fillRecord(page, "R5", { "Date added": date });
    await expect(st().locator("li", { hasText: "can't be read safely" })).toContainText("○");
    expect(await passed(page, "fp-t3")).toBe(false);
  }
  await fillRecord(page, "R5", { "Date added": "03/04/26", clarification: "" });
  expect(await passed(page, "fp-t3")).toBe(false);
  await fillRecord(page, "R5", { clarification: "Can you check with the customer whether 03/04/26 is 3 April or 4 March 2026?" });
  await expect(st().locator(".ga-status")).toHaveText(/Required parts complete/);
  expect(await st().innerText()).not.toMatch(/\bR[1-8]\b/);
  // Read-only originals are text, not inputs; each editable field names its record
  expect(await panel(page).locator(".ga-record-original input, .ga-record-original select, .ga-record-original textarea").count()).toBe(0);
  for (const inp of await panel(page).locator(".ga-record-edit input, .ga-record-edit select, .ga-record-edit textarea").all()) {
    expect(await inp.evaluate((el) => el.labels[0].textContent)).toMatch(/record R[1-8]$/);
  }
  // Example rows never count: they have no inputs and are not records in the answer
  expect(await panel(page).locator(".ga-record-example input").count()).toBe(0);
  const ids = await page.evaluate(() => PVAGAActivities.getStore().getRecord("fp-t3").answer.records.map((r) => r.id));
  expect(ids).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]);
});

test("model answers stay locked until the task passes, record nothing, and relock when it breaks (M-02)", async ({ page }) => {
  await fresh(page);
  await walk(page, { stop: 3 });
  const cal = panel(page).locator("#calRevealBtn");
  await expect(cal).toBeDisabled();
  await FP_STEPS[3](page);
  await expect(cal).toBeEnabled();
  await next(page).click();
  const btn = panel(page).locator("#t3RevealBtn");
  await expect(btn).toBeDisabled();
  await expect(panel(page).locator("#t3Model")).toBeHidden();
  await FP_STEPS[4](page);
  const attemptsBefore = await page.evaluate(() => PVAGAActivities.getStore().getRecord("fp-t3").attempts);
  await btn.click();
  await expect(panel(page).locator("#t3Model")).toBeVisible();
  expect(await page.evaluate(() => PVAGAActivities.getStore().getRecord("fp-t3").attempts)).toBe(attemptsBefore);
  await fillRecord(page, "R6", { Name: "LIZA TAN" });
  await expect(btn).toBeDisabled();
  await expect(panel(page).locator("#t3Model")).toBeHidden();
  await expect(next(page)).toBeDisabled();
});

test("F1/R2: a broken answer after completion → incomplete and ineligible after reload; completedAt kept; Finish needed again", async ({ page }) => {
  await fresh(page);
  await walk(page);
  await expect(label(page)).toHaveText("Complete");
  const before = await fpState(page);
  expect(before.ev.complete).toBe(true);
  // Modify a previously passing answer (Task 4) so its requirement fails
  await page.evaluate(() => {
    const s = PVAGAActivities.getStore();
    const a = s.getRecord("fp-t4").answer;
    a.rows[0].checked = "today";
    s.recordAttempt("fp-t4", { answer: a });
  });
  await expect(page.locator("#downloadReportBtn")).toBeDisabled(); // R3: live, even on the open page
  await expect(page.locator("#completionStatus")).toHaveText("The project is not currently complete.");
  await page.reload();
  const after = await fpState(page);
  expect(after.ev.complete).toBe(false);
  expect(after.eligible).toBe(false);
  expect(after.snap.completedAt).toBe(before.snap.completedAt);
  expect(after.snap.finishedAt).toBeNull();
  await expect(page.locator(".ga-note-banner-warn")).toBeVisible();
  await expect(label(page)).toHaveText("Step 5 of 10"); // back on the broken task
  // Fix it through the page; completion does not come back until Finish is pressed again
  await panel(page).locator('.ga-row:not([data-example="true"])').first().getByLabel(/^Date checked/).fill("14 Nov 2026");
  await expect(next(page)).toBeEnabled();
  expect((await fpState(page)).ev.complete).toBe(false);
  await page.reload();
  expect(await label(page).innerText()).not.toBe("Complete"); // never restored to the completion step without Finish
  while ((await stepNo(page)) && (await stepNo(page)) < 10) await next(page).click();
  await expect(next(page)).toHaveText("Finish Project →");
  await next(page).click();
  await expect(label(page)).toHaveText("Complete");
  const again = await fpState(page);
  expect(again.ev.complete).toBe(true);
  expect(again.snap.completedAt).toBe(before.snap.completedAt);
});

test("report: print sheet and .html download hold every task, name, date and disclaimer; offline; escaped; name kept apart from certificate", async ({ page, browser }) => {
  await fresh(page);
  await page.evaluate(() => PVAGAActivities.getStore().setCertName("Certificate Name"));
  await page.reload();
  await walk(page, { stop: 8 });
  await FP_STEPS[8](page);
  await panel(page).getByLabel("What did you use AI for?").fill("I used AI to pull the action items out of the <b>subcontractor</b> schedule email.");
  await next(page).click();
  await walk(page);
  await expect(label(page)).toHaveText("Complete");
  const name = page.locator("#reportName");
  await expect(name).toHaveValue("Certificate Name"); // prefilled from the certificate name
  await name.fill("Ana Report-Name");
  expect(await page.evaluate(() => PVAGAActivities.getStore().getCert().name)).toBe("Certificate Name"); // Q12
  // Print sheet
  await page.evaluate(() => { window.print = () => {}; });
  await page.locator("#printReportBtn").click();
  const sheet = page.locator(".print-sheet");
  for (const t of ["Northstar Home Services — Final Project Report", "Learner: Ana Report-Name", "Task 1 — Email triage", "Task 3 — Cleaned customer records",
                   "Task 8 — Security", "Final submission checklist", "Training work sample — fictional client. Not paid client work.", "Carlo Mendoza", "3 April 2026 or 4 March 2026"]) {
    await expect(sheet).toContainText(t);
  }
  // .html download
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#downloadReportBtn").click()]);
  expect(dl.suggestedFilename()).toMatch(/^Northstar-Final-Project-Report-\d{4}-\d{2}-\d{2}\.html$/);
  const html = fs.readFileSync(await dl.path(), "utf8");
  expect(html).toContain("Learner: Ana Report-Name");
  expect(html).toContain("&lt;b&gt;subcontractor&lt;/b&gt;");
  expect(html).not.toMatch(/<script|<link|<img|<iframe|\ssrc=|@import|url\(/i);
  for (const t of ["Task 2 — Calendar", "Task 4 — Software research", "Task 5 — SOP", "Task 6 — Task tracker", "Task 7 — AI assistance", "Report date", "Juan Santos"]) expect(html).toContain(t);
  // Opens offline with the same content
  const ctx = await browser.newContext({ offline: true });
  const off = await ctx.newPage();
  await off.setContent(html);
  await expect(off.locator("h1")).toHaveText("Northstar Home Services — Final Project Report");
  await expect(off.locator("body")).toContainText("Task 8 — Security");
  await ctx.close();
  // Reload: report and name restored
  await page.reload();
  await expect(label(page)).toHaveText("Complete");
  await expect(page.locator("#reportName")).toHaveValue("Ana Report-Name");
  await expect(page.locator("#downloadReportBtn")).toBeEnabled();
});

test("completion wording states how many lessons remain (Q13)", async ({ page }) => {
  await fresh(page);
  await walk(page);
  const status = page.locator("#completionStatus");
  for (const [done, text] of [[12, "Final Project complete. 1 lesson still to finish before your certificate."],
                               [13, "All 13 lessons and the Final Project are complete."]]) {
    await page.evaluate((n) => {
      const s = PVAGAActivities.getStore();
      const real = s.evaluate.bind(s);
      s.evaluate = () => ({ ...real(), completedLessons: n });
      s.refresh();
    }, done);
    await expect(status).toContainText(text);
  }
});

test("reload restores answers and step, never past the first locked step", async ({ page }) => {
  await fresh(page);
  await walk(page, { stop: 5 });
  await panel(page).locator('.ga-row:not([data-example="true"])').first().getByLabel(/^Tool/).fill("Jobber");
  await page.waitForTimeout(700);
  await page.reload();
  await expect(label(page)).toHaveText("Step 5 of 10");
  await expect(panel(page).locator('.ga-row:not([data-example="true"])').first().getByLabel(/^Tool/)).toHaveValue("Jobber");
  await page.locator("#prevBtn").click();
  await expect(panel(page).getByLabel("Name — record R5", { exact: true })).toHaveValue("Ana Garcia");
  await expect(panel(page).getByLabel("Clarification (optional — what needs confirming?) — record R5", { exact: true })).toHaveValue(T3.R5.clarification);
});

test("keyboard only: Task 1 can be completed with the keyboard", async ({ page }) => {
  await fresh(page);
  await next(page).click();
  const sels = panel(page).locator(".ga-item select");
  const target = { "Kitchen faucet leak": "action", "Monthly newsletter": "reference", "Quote approved by customer": "action", "Following up on a quote": "waiting",
    "Insurance renewal invoice": "client_review", "Thank-you note": "archive", "Subcontractor asking": "action", "Customer disputing a charge": "client_review",
    "business permit renewal": "action", "Spam-looking email": "archive" };
  const order = ["", "reply", "client_review", "action", "waiting", "reference", "archive"];
  for (const [msg, v] of Object.entries(target)) {
    const sel = panel(page).locator(".ga-item", { hasText: msg }).locator("select");
    await sel.focus();
    for (let i = 0; i < order.indexOf(v); i++) await page.keyboard.press("ArrowDown");
  }
  expect(await sels.count()).toBe(10);
  await panel(page).getByRole("button", { name: "Check all" }).focus();
  await page.keyboard.press("Enter");
  await expect(next(page)).toBeEnabled();
  await next(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(":focus")).toHaveText("Calendar");
});

test("axe: no serious/critical issues on any step; no overflow at 375 and 320 px; Task 3 visual QA", async ({ page }) => {
  await fresh(page);
  const issues = [];
  const over = [];
  await walk(page, { each: async (st) => {
    issues.push(...(await axe(page)).map((x) => `step ${st}: ${x}`));
    for (const w of [375, 320]) {
      await page.setViewportSize({ width: w, height: 800 });
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 0) over.push(`step ${st} @${w}: ${o}px`);
      if (SHOTS && st === 4) await page.screenshot({ path: `${SHOTS}/FP-task3-${w}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    if (SHOTS && st === 4) await page.screenshot({ path: `${SHOTS}/FP-task3-desktop.png`, fullPage: true });
  } });
  issues.push(...(await axe(page)).map((x) => `completion: ${x}`));
  expect(issues).toEqual([]);
  expect(over).toEqual([]);
});

test("Task 8 options are shuffled across reloads", async ({ page }) => {
  const positions = new Set();
  await fresh(page);
  for (let i = 0; i < 12; i++) {
    await page.reload();
    const texts = await page.locator("#t8Choice .ga-option").allInnerTexts();
    positions.add(texts.findIndex((t) => t.startsWith("Explain that credentials")));
  }
  expect(positions.size).toBeGreaterThan(1);
});
