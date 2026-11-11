# General Admin VA v2.0 — regression suite

Runs against the repository root served by Cloudflare's own Pages runtime
(`wrangler pages dev`), so routing, `_headers` and 404 handling match Cloudflare.
Browser: the system Google Chrome (`channel: "chrome"`); override with `PVA_BROWSER_CHANNEL`.

```
cd tests
./run_all.sh                                   # branch safety + unit + end-to-end
PVA_BASE_URL=https://<preview>.pages.dev ./run_all.sh   # against a Cloudflare preview
```

| File | Covers |
| --- | --- |
| `run_all.sh` | NT-08 branch safety: `main`, `production`, `rc/v2.0-migration` must not move |
| `unit/cs-isolation.test.js` | RT-36 (files): Customer Support files and the shared files it loads are byte-identical to the baseline |
| `e2e/customer-support-baseline.spec.js` | RT-36 (behaviour): every Customer Support page renders as on the baseline |
| `e2e/site-integrity.spec.js` | Internal links, Cloudflare headers, 404 page |
| `unit/progress-core.test.js` | WP1: storage normalisation, failure modes, V1 read, mastery and rule semantics, Final Project completion, eligibility, `completedAt`, certificate record, backup/restore |
| `e2e/progress-core-browser.spec.js` | WP1 in Chrome: script loading, real localStorage, V1 key untouched, blocked storage |
| `unit/validators.test.js` | WP2: every structure rule — genuine answers pass; empty, filler, copied models and unchanged examples fail; schedule, dataset and research violations; labels never claim correctness |
| `e2e/activities.spec.js` | WP2 activity library on `fixtures/activities-harness.html`: mastery and retry, shuffle, keyboard sorting, written-work checklist, autosave, reveal gating, print sheet, storage banner, contrast, axe-core, 375/320 px |
| `e2e/ga-audit-characterization.spec.js` | Audit C-01/C-02: a wrong-answer, minimal-typing learner must not finish. Pages still affected are marked `test.fail()`; remove a page from `KNOWN_DEFECT` when WP3/WP4 fixes it |
| `e2e/lesson-01.spec.js` | WP3a pilot, Lesson 1 page: wrong answers and filler cannot finish, genuine completion recorded in the v2 store (V1 key untouched), keyboard sort, reload restore with step cap, completed banner, print sheet, axe-core per gated step, no overflow at 375/320 px. `PVA_SHOTS_DIR=<dir>` writes screenshots |

Baselines in `fixtures/` were recorded on `main` @ 5778df5. Never regenerate them on a
later commit: `UPDATE_BASELINE=1` exists only to rebuild them on the baseline itself.

`fixtures/activities-harness.html` is a test-only page (marked `noindex`); its sample items are placeholders, not course content.

The `tests/` folder is deployed with the site (Pages publishes the repository root) but
contains no learner data; `node_modules/` is git-ignored and never deployed.
