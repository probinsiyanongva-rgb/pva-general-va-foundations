// WP3b: Lessons 2–13 on the v2.0 activity library (same checks as the approved Lesson 1 pilot).
// For every converted lesson:
//   - a genuine learner can finish, and completion is recorded in the v2 store;
//   - every gated step starts locked;
//   - axe-core finds no serious/critical issues on each gated step;
//   - no horizontal overflow at 320 px on any step;
//   - the correct answer is never the longest option (M-01); for the 8 new checks
//     it is never the shortest either (spec: shared rules for new checks).
// Wrong-answer / filler learners are covered by ga-audit-characterization.spec.js.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { SOLUTIONS } = require("./lesson-solutions");

const SHOTS = process.env.PVA_SHOTS_DIR;
const url = (n) => `/lessons/lesson-${String(n).padStart(2, "0")}/`;
const next = (page) => page.locator("#nextBtn");
const label = (page) => page.locator("#stepLabel");

async function fresh(page, n) {
  await page.goto(url(n));
  await page.evaluate(() => localStorage.clear());
  await page.goto(url(n));
}
async function stepNo(page) {
  const t = await label(page).innerText();
  const m = /^Step (\d+) of (\d+)$/.exec(t);
  return m ? { n: Number(m[1]), total: Number(m[2]) } : null;
}
async function axeScan(page) {
  const r = await new AxeBuilder({ page }).include(".step-panel.active").withTags(["wcag2a", "wcag2aa"]).analyze();
  return r.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((x) => x.target.join(" ")).join(", ")}`);
}

// Walks the lesson. Gated steps must start locked; they are solved with SOLUTIONS[n].steps[step]
// unless `each` returns true (it solved the step itself). `each` runs on every step.
async function walk(page, n, { each } = {}) {
  const sol = SOLUTIONS[n];
  for (let guard = 0; guard < 20; guard++) {
    const st = await stepNo(page);
    if (!st) break;
    const gated = !!sol.steps[st.n];
    if (gated) await expect(next(page), `L${n} step ${st.n} starts locked`).toBeDisabled();
    const handled = each ? await each(st, gated) : false;
    if (gated && !handled) await sol.steps[st.n](page);
    await expect(next(page), `L${n} step ${st.n} unlocks`).toBeEnabled();
    await next(page).click();
  }
}

for (const n of Object.keys(SOLUTIONS).map(Number)) {
  test.describe(`Lesson ${n}`, () => {
    test("genuine learner finishes; completion recorded in the v2 store", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await fresh(page, n);
      expect(await page.evaluate(() => typeof window.PVAProgress)).toBe("undefined");
      await walk(page, n);
      await expect(label(page)).toHaveText("Complete");
      const done = await page.evaluate((k) => PVAGAActivities.getStore().evaluate().lessons.find((l) => l.n === k).complete, n);
      expect(done).toBe(true);
      expect(errors).toEqual([]);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/L${String(n).padStart(2, "0")}-complete.png`, fullPage: true });
    });

    test("axe: no serious/critical issues on any gated step (before and after solving)", async ({ page }) => {
      await fresh(page, n);
      const sol = SOLUTIONS[n];
      const found = [];
      await walk(page, n, {
        each: async (st, gated) => {
          if (!gated) return false;
          for (const v of await axeScan(page)) found.push(`step ${st.n} (before): ${v}`);
          await sol.steps[st.n](page);
          for (const v of await axeScan(page)) found.push(`step ${st.n} (after): ${v}`);
          if (SHOTS) await page.screenshot({ path: `${SHOTS}/L${String(n).padStart(2, "0")}-step${st.n}-desktop.png`, fullPage: true });
          return true;
        },
      });
      expect(found).toEqual([]);
    });

    test("no horizontal overflow at 320px on any step", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await fresh(page, n);
      const over = [];
      await walk(page, n, {
        each: async (st) => {
          const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (o > 0) over.push(`step ${st.n}: ${o}px`);
        },
      });
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 0) over.push(`completion: ${o}px`);
      expect(over).toEqual([]);
    });

    test("answer length is not a cue (M-01); new checks: correct is never longest or shortest", async ({ page }) => {
      await fresh(page, n);
      const data = await page.evaluate(() => ({ choices: (window.PVAGALesson || {}).choices || {}, reqs: PVAGA.manifest.lessons }));
      const lesson = data.reqs.find((l) => l.n === n);
      const isNew = (id) => lesson.requirements.some((r) => r.id === id && r.new);
      const issues = [];
      for (const [id, items] of Object.entries(data.choices)) {
        items.forEach((item, i) => {
          const lens = item.options.map((o) => o.text.length);
          const right = item.options.find((o) => o.correct);
          if (!right) return issues.push(`${id}#${i}: no correct option`);
          const others = item.options.filter((o) => o !== right).map((o) => o.text.length);
          // A tie is not a cue; only a uniquely longest (or, for new checks, uniquely shortest) correct answer is.
          if (right.text.length > Math.max(...others)) issues.push(`${id}#${i}: correct is the longest (${lens.join("/")})`);
          if (isNew(id) && right.text.length < Math.min(...others)) issues.push(`${id}#${i}: correct is the shortest (${lens.join("/")})`);
        });
      }
      expect(issues).toEqual([]);
    });
  });
}
