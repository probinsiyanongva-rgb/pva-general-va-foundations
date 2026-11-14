// WP5 fixtures: real v2 progress states built with the real engine and rules from genuine
// answers (tests/fixtures/good-answers.js), so the hub and certificate page re-validate them.
const V = require("../../shared/ga/validators.js");
const PVAGA = require("../../shared/ga/manifest.js");
const GOOD = require("../fixtures/good-answers.js");

const KEY = PVAGA.config.storageKey;
function build(kind) {
  const data = {};
  const storage = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; } };
  const p = PVAGA.createProgress({ storage, rules: V });
  const pass = (r) => p.recordAttempt(r.id, r.rule ? { answer: GOOD[r.rule] } : { passed: true });
  if (kind === "lessons" || kind === "all" || kind === "all-broken") {
    for (const l of PVAGA.manifest.lessons) { l.requirements.forEach(pass); p.markLessonComplete(l.n); }
  }
  if (kind === "fp" || kind === "all" || kind === "all-broken") {
    PVAGA.manifest.finalProject.requirements.forEach(pass);
    p.markFinalProjectComplete();
  }
  if (kind === "all-broken") p.recordAttempt("l07-ws", { answer: { rows: [], rules: "", qaCheck: "" } }); // one stored answer now fails
  return data[KEY];
}
module.exports = { KEY, build };
