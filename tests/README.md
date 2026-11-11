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
| `e2e/ga-audit-characterization.spec.js` | Audit C-01/C-02: a wrong-answer, minimal-typing learner must not finish. Pages still affected are marked `test.fail()`; remove a page from `KNOWN_DEFECT` when WP3/WP4 fixes it |

Baselines in `fixtures/` were recorded on `main` @ 5778df5. Never regenerate them on a
later commit: `UPDATE_BASELINE=1` exists only to rebuild them on the baseline itself.

The `tests/` folder is deployed with the site (Pages publishes the repository root) but
contains no learner data; `node_modules/` is git-ignored and never deployed.
