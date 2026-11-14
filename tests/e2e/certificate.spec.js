// WP5: hub and certificate page. The four agreed fixtures (13 lessons only / Final Project only /
// all / all + one answer broken): hub and certificate always agree, eligibility is live.
// Also: D1 wording identical on screen, print and SVG; completedAt printed; issuance record; name
// lock and correction; names escaped; backup and restore asks first; reset wording; V1 badges;
// Lesson 13 completion text; storage banner; accessibility and 375/320 px layout.
const fs = require("fs");
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { KEY, build } = require("./progress-fixtures");
const { SOLUTIONS } = require("./lesson-solutions");

const FIX = { lessons: build("lessons"), fp: build("fp"), all: build("all"), broken: build("all-broken") };
const D1 = {
  title: "Certificate of Completion",
  lead: "This certifies that",
  body: "has completed the self-paced online course General Administrative VA — Beginner Foundations, including its required learning activities, interactive scenario assessments, practice activities, and an eight-task simulated client project.",
  scope: "Scope: This course is self-paced. Assessments are unproctored and completed in the learner's own browser. The learner's identity was not independently verified, and written work was not individually reviewed. This certificate is not a professional license, government qualification or accreditation, and it does not guarantee employment.",
};

async function load(page, state, path) {
  await page.goto("/404-seed");
  await page.evaluate(([k, v]) => { localStorage.clear(); if (v) localStorage.setItem(k, v); }, [KEY, state]);
  await page.goto(path);
}
const axe = async (page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations
  .filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
async function issue(page, name = "Maria Santos") {
  await page.getByLabel(/^Your name, as it should appear/).fill(name);
  await page.getByLabel(/^I've read the scope statement/).check();
  await page.getByRole("button", { name: "Generate my certificate" }).click();
  await expect(page.locator("#certificate")).toBeVisible();
}

for (const [kind, expected] of [["lessons", "Locked — 13 of 14 complete"], ["fp", "Locked — 1 of 14 complete"], ["all", "Ready"], ["broken", "Locked — 13 of 14 complete"]]) {
  test(`fixture "${kind}": hub and certificate page agree (${expected})`, async ({ page }) => {
    await load(page, FIX[kind], "/");
    await expect(page.locator("#certStatus")).toHaveText(expected);
    const hubEligible = await page.evaluate(() => PVAGA.createProgress({ rules: PVAGAValidators }).isCertificateEligible());
    await page.goto("/certificate/");
    await expect(page.locator("#certStatusLine")).toContainText(expected === "Ready" ? "Ready" : expected);
    const certEligible = await page.evaluate(() => PVAGA.createProgress({ rules: PVAGAValidators }).isCertificateEligible());
    expect(certEligible).toBe(hubEligible);
    expect(certEligible).toBe(kind === "all");
    const gen = page.getByRole("button", { name: "Generate my certificate" });
    await page.getByLabel(/^Your name, as it should appear/).fill("Maria Santos");
    await page.getByLabel(/^I've read the scope statement/).check();
    if (kind === "all") await expect(gen).toBeEnabled(); else await expect(gen).toBeDisabled();
    if (kind === "lessons") await expect(page.locator("#remainingList")).toContainText("Final Project: 0 of 9 tasks done");
    if (kind === "fp") await expect(page.locator("#remainingList li")).toHaveCount(13);
    if (kind === "broken") await expect(page.locator("#remainingList")).toContainText("Lesson 7");
  });
}

test("hub: lessons, Final Project and certificate cards show live status; rail marks the actual lessons", async ({ page }) => {
  await load(page, FIX.fp, "/");
  await expect(page.locator("#finalStatus")).toHaveText("✓ Complete");
  await expect(page.locator("#progressCount")).toHaveText("0");
  await load(page, FIX.lessons, "/");
  await expect(page.locator("#progressCount")).toHaveText("13");
  await expect(page.locator("#progressRail .seg.done")).toHaveCount(13);
  await expect(page.locator("#finalStatus")).toHaveText("Not started");
  await load(page, FIX.broken, "/");
  await expect(page.locator('[data-lesson="7"] .stamp')).toContainText("In progress");
  await expect(page.locator("#progressRail .seg").nth(6)).not.toHaveClass(/done/);
  await expect(page.locator("#progressRail .seg").nth(7)).toHaveClass(/done/);
  expect(await axe(page)).toEqual([]);
});

test("certificate: D1 wording identical on screen and SVG; completedAt printed; issuance record kept; locks when an answer breaks", async ({ page }) => {
  await load(page, FIX.all, "/certificate/");
  await issue(page);
  const sheet = page.locator("#certSheet");
  for (const t of Object.values(D1)) await expect(sheet).toContainText(t);
  const cert = await page.evaluate(() => PVAGA.createProgress({ rules: PVAGAValidators }).getCert());
  expect(cert.issuedAt).toBeTruthy();
  expect(cert.code).toMatch(/^GA-[0-9A-F]{4}-[0-9A-F]{4}$/);
  const d = new Date(cert.completedAt);
  const date = `${d.getDate()} ${["January","February","March","April","May","June","July","August","September","October","November","December"][d.getMonth()]} ${d.getFullYear()}`;
  await expect(sheet).toContainText(`Completed ${date} · Probinsiyanong VA · Reference ${cert.code}`);
  // SVG: same wording
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download certificate/ }).click()]);
  const svg = fs.readFileSync(await dl.path(), "utf8");
  const svgText = svg.replace(/<title>[\s\S]*?<\/title>/, "").replace(/<[^>]+>/g, " ").replace(/&apos;/g, "'").replace(/\s+/g, " ");
  for (const t of Object.values(D1)) expect(svgText).toContain(t);
  expect(svgText).toContain(`Completed ${date} · Probinsiyanong VA · Reference ${cert.code}`);
  expect(svgText).toContain("Maria Santos");
  // Regeneration keeps the same date and issue time
  await page.reload();
  const again = await page.evaluate(() => PVAGA.createProgress({ rules: PVAGAValidators }).getCert());
  expect(again.issuedAt).toBe(cert.issuedAt);
  expect(again.completedAt).toBe(cert.completedAt);
  // Break one answer: certificate locks, original date kept
  await page.evaluate(() => PVAGA.createProgress({ rules: PVAGAValidators }).recordAttempt("l07-ws", { answer: { rows: [] } }));
  await page.reload();
  await expect(page.locator("#certificate")).toBeHidden();
  await expect(page.locator("#certLocked")).toContainText(date);
  expect(await page.evaluate(() => PVAGA.createProgress({ rules: PVAGAValidators }).getCert().completedAt)).toBe(cert.completedAt);
});

test("certificate: print shows only the certificate on one landscape page", async ({ page }) => {
  await load(page, FIX.all, "/certificate/");
  await issue(page);
  await page.emulateMedia({ media: "print" });
  for (const id of ["#details", "#backup", "#remainingList"]) await expect(page.locator(id)).toBeHidden();
  await expect(page.locator("#certSheet")).toBeVisible();
  const pdf = await page.pdf({ landscape: true, format: "A4", preferCSSPageSize: true });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  expect(pages).toBe(1);
});

test("certificate: names are text (120 chars, markup); name locked after issue unless corrected", async ({ page }) => {
  await load(page, FIX.all, "/certificate/");
  const evil = '<img src=x onerror="window.__x=1">';
  await issue(page, evil);
  await expect(page.locator("#certSheet .ga-cert-name")).toHaveText(evil);
  expect(await page.locator("#certSheet img").count()).toBe(0);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download certificate/ }).click()]);
  const svg = fs.readFileSync(await dl.path(), "utf8");
  expect(svg).not.toContain("<img");
  expect(svg).toContain("&lt;img src=x onerror=&quot;window.__x=1&quot;&gt;");
  expect(await page.evaluate(() => window.__x)).toBeUndefined();
  // locked
  const name = page.getByLabel(/^Your name, as it should appear/);
  await expect(name).toHaveAttribute("readonly", "");
  // correction
  await page.getByRole("button", { name: "Correct my name" }).click();
  const long = "A".repeat(10) + " " + "Bautista-Dela Cruz y Santos ".repeat(5);
  await name.fill(long);
  await page.getByRole("button", { name: "Save corrected name" }).click();
  const cert = await page.evaluate(() => PVAGA.createProgress({ rules: PVAGAValidators }).getCert());
  expect(cert.name.length).toBeLessThanOrEqual(120);
  await expect(page.locator("#certSheet .ga-cert-name")).toHaveText(cert.name);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("backup and restore: restore shows the backup and asks first; cancel changes nothing; confirm restores", async ({ page }) => {
  await load(page, FIX.all, "/certificate/");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download progress backup/ }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^general-admin-va-progress-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await dl.path();
  await load(page, FIX.lessons, "/certificate/");
  await page.locator("#restoreFile").setInputFiles(file);
  await expect(page.locator("#restoreSummary")).toContainText("13 of 13 lessons complete, Final Project complete");
  await expect(page.locator("#restoreSummary")).toContainText("Final Project not complete");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("#certStatusLine")).toContainText("Locked — 13 of 14");
  await page.locator("#restoreFile").setInputFiles(file);
  await page.getByRole("button", { name: "Replace my progress with this backup" }).click();
  await expect(page.locator("#certStatusLine")).toContainText("Ready");
  await page.reload();
  await expect(page.locator("#certStatusLine")).toContainText("Ready");
  // a non-backup file is refused
  fs.writeFileSync("test-results/not-a-backup.json", '{"hello":1}');
  await page.locator("#restoreFile").setInputFiles("test-results/not-a-backup.json");
  await expect(page.locator("#restoreNote")).toHaveText("That file isn't a progress backup.");
  await expect(page.locator("#restorePanel")).toBeHidden();
});

test("hub reset says it resets everything, including the Final Project", async ({ page }) => {
  await load(page, FIX.all, "/");
  let msg = "";
  page.once("dialog", (d) => { msg = d.message(); d.dismiss(); });
  await page.locator("#resetProgressBtn").click();
  expect(msg).toContain("the Final Project");
  await expect(page.locator("#certStatus")).toHaveText("Ready");
  page.once("dialog", (d) => d.accept());
  await page.locator("#resetProgressBtn").click();
  await expect(page.locator("#certStatus")).toHaveText("Locked — 0 of 14 complete");
});

test("storage blocked: hub and certificate page show the banner; Generate stays disabled", async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException("blocked", "QuotaExceededError"); }; });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator(".ga-storage-banner")).toBeVisible();
  await page.goto("/certificate/");
  await expect(page.locator(".ga-storage-banner")).toHaveAttribute("role", "alert");
  await expect(page.getByRole("button", { name: "Generate my certificate" })).toBeDisabled();
  await ctx.close();
});

test("certificate page: axe and 375/320 px layout, locked and issued", async ({ page }) => {
  for (const state of [FIX.fp, FIX.all]) {
    await load(page, state, "/certificate/");
    if (state === FIX.all) await issue(page);
    expect(await axe(page)).toEqual([]);
    for (const w of [375, 320]) {
      await page.setViewportSize({ width: w, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${w}px`).toBeLessThanOrEqual(0);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await load(page, FIX.lessons, "/");
  for (const w of [375, 320]) {
    await page.setViewportSize({ width: w, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `hub ${w}px`).toBeLessThanOrEqual(0);
  }
});

test("Lesson 13 completion states actual progress (W2)", async ({ page }) => {
  // Only Lesson 13 done: 12 others remain
  await page.goto("/lessons/lesson-13/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/lessons/lesson-13/");
  for (let g = 0; g < 12; g++) {
    const m = /^Step (\d+) of/.exec(await page.locator("#stepLabel").innerText());
    if (!m) break;
    if (SOLUTIONS[13].steps[m[1]]) await SOLUTIONS[13].steps[m[1]](page);
    await page.locator("#nextBtn").click();
  }
  await expect(page.locator("#l13DoneHeading")).toHaveText("Lesson 13 complete.");
  await expect(page.locator("#l13DoneText")).toContainText("12 other lessons still to finish (Lessons 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)");
  // Everything complete: the full message
  await load(page, FIX.all, "/lessons/lesson-13/");
  await expect(page.locator("#l13DoneHeading")).toHaveText("All 13 lessons complete.");
  await expect(page.locator("#l13DoneText")).toContainText("Your Final Project is complete too");
  await load(page, FIX.lessons, "/lessons/lesson-13/");
  await expect(page.locator("#l13DoneText")).toContainText("One thing left: bring it all together in the Final Project.");
});
