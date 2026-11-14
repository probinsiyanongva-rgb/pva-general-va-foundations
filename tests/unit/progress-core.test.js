// WP1 unit tests: PVA Core progress store + General Admin manifest.
// Covers RT-14/15/16/19/20, NT-01/02/03, RE-RT-06/07/09/10 and spec clarification 2.
const test = require("node:test");
const assert = require("node:assert");
const PVACore = require("../../shared/pva-core/progress-core.js");
const PVAGA = require("../../shared/ga/manifest.js");

const KEY = PVAGA.config.storageKey;
const V1_KEY = PVAGA.config.legacy.key;

/* ---------- fixtures ---------- */
class FakeStorage {
  constructor(init = {}, opts = {}) { this.data = { ...init }; this.opts = opts; this.writes = 0; }
  getItem(k) { if (this.opts.throwOnGet) throw new Error("SecurityError"); return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null; }
  setItem(k, v) {
    if (this.opts.throwOnSet) throw new Error("QuotaExceededError");
    this.writes++;
    if (this.opts.dropWrites) return; // silently lost (some in-app browsers)
    this.data[k] = String(v);
  }
  removeItem(k) { delete this.data[k]; }
}

// Test rules: an answer passes its structure check when answer.ok === true.
const TEST_RULES = Object.fromEntries(PVAGA.ruleNames().map((n) => [n, (a) => ({ ok: !!a && a.ok === true, missing: a && a.ok ? [] : ["test-missing"] })]));

function clock(start = Date.parse("2026-11-11T00:00:00Z")) {
  let t = start;
  const fn = () => new Date((t += 60000)).toISOString();
  fn.peek = () => new Date(t).toISOString();
  return fn;
}

function make(storage = new FakeStorage(), now = clock()) {
  return PVAGA.createProgress({ storage, rules: TEST_RULES, now });
}

const passAnswer = (r) => (r.rule ? { answer: { ok: true } } : { passed: true });

function completeLesson(p, n) {
  const l = PVAGA.manifest.lessons.find((x) => x.n === n);
  for (const r of l.requirements) p.recordAttempt(r.id, passAnswer(r));
  return p.markLessonComplete(n);
}
function completeAllLessons(p) { for (const l of PVAGA.manifest.lessons) completeLesson(p, l.n); }
function completeFinalProject(p) {
  for (const r of PVAGA.manifest.finalProject.requirements) p.recordAttempt(r.id, passAnswer(r));
  return p.markFinalProjectComplete();
}

/* ---------- manifest ---------- */
test("manifest: 13 lessons, 52 lesson requirements, 8 new, 9 Final Project requirements, unique ids", () => {
  const m = PVAGA.manifest;
  const lessonReqs = m.lessons.flatMap((l) => l.requirements);
  assert.strictEqual(m.lessons.length, 13);
  assert.strictEqual(lessonReqs.length, 52);
  assert.deepStrictEqual(lessonReqs.filter((r) => r.new).map((r) => r.id),
    ["l05-resched", "l06-access", "l07-formula", "l08-fact", "l09-follow", "l10-workload", "l11-uses", "l12-personal"]);
  assert.strictEqual(m.finalProject.requirements.length, 9);
  const ids = lessonReqs.concat(m.finalProject.requirements).map((r) => r.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.strictEqual(m.version, "2.0.0");
});

test("manifest: every work sample and written activity is rule-checked", () => {
  const all = PVAGA.manifest.lessons.flatMap((l) => l.requirements).concat(PVAGA.manifest.finalProject.requirements);
  for (const r of all) {
    if (["work-sample", "written", "schedule", "table", "attestation", "scenario-explained"].includes(r.type)) {
      assert.ok(r.rule, `${r.id} must have a structure rule`);
    }
  }
  assert.strictEqual(PVAGA.ruleNames().length, 26);
});

/* ---------- storage + normalisation (RT-19, RT-20) ---------- */
test("malformed stored data never throws and yields an empty, valid state", () => {
  const fixtures = ["null", "[]", '"x"', "{oops", "{}", "42", JSON.stringify({ schema: 1, lessons: {} }),
    JSON.stringify({ schema: 2, course: "other-course", records: { "l01-pay": { status: "passed" } } }),
    '{"schema":2,"course":"ga-foundations","records":{"__proto__":{"status":"passed","polluted":true},"BAD ID":{},"l01-pay":{"status":"passed","firstPassAt":"not-a-date"}}}'];
  for (const raw of fixtures) {
    const p = make(new FakeStorage({ [KEY]: raw }));
    const ev = p.evaluate();
    assert.strictEqual(ev.eligible, false, raw);
    assert.strictEqual(ev.completedLessons, 0, raw);
    assert.strictEqual(p.requirementStatus("l01-pay").passed, false, raw);
    assert.strictEqual({}.polluted, undefined);
    assert.strictEqual({}.status, undefined);
    assert.ok(!Object.prototype.hasOwnProperty.call(p.snapshot().records, "__proto__"), raw);
  }
});

test("partial valid v2 data is kept", () => {
  const raw = { schema: 2, course: "ga-foundations", records: { "l01-pay": { status: "passed", attempts: 2, firstPassAt: "2026-11-01T00:00:00Z" } } };
  const p = make(new FakeStorage({ [KEY]: JSON.stringify(raw) }));
  assert.strictEqual(p.requirementStatus("l01-pay").passed, true);
  assert.strictEqual(p.getRecord("l01-pay").attempts, 2);
});

test("write failure switches to memory mode, emits once, never reports saved", () => {
  const p = make(new FakeStorage({}, { throwOnSet: true }));
  const events = [];
  p.on("storage-unavailable", (e) => events.push(e));
  const r1 = p.recordAttempt("l01-pay", { passed: true });
  const r2 = p.recordAttempt("l01-limit", { passed: true });
  assert.strictEqual(r1.saved, false);
  assert.strictEqual(r2.saved, false);
  assert.strictEqual(p.storageMode(), "memory");
  assert.strictEqual(r1.passed, true, "work continues for this page");
});

test("silently dropped writes are detected by read-back", () => {
  const p = make(new FakeStorage({}, { dropWrites: true }));
  assert.strictEqual(p.recordAttempt("l01-pay", { passed: true }).saved, false);
  assert.strictEqual(p.storageMode(), "memory");
});

test("blocked storage on read starts in memory mode without throwing", () => {
  const p = make(new FakeStorage({}, { throwOnGet: true }));
  assert.strictEqual(p.storageMode(), "memory");
  let told = 0;
  p.on("storage-unavailable", () => told++);
  assert.strictEqual(told, 1, "a page subscribing after the failure is still told (banner shows)");
  assert.strictEqual(p.issueCertificate().ok, false);
});

test("state round-trips through storage (reload restores progress and drafts)", () => {
  const s = new FakeStorage();
  const p1 = make(s);
  p1.recordAttempt("l01-pay", { passed: true });
  p1.saveDraft("l03-ws:clarify", 'Line 1\nHe said "yes" <b>');
  const p2 = make(s);
  assert.strictEqual(p2.requirementStatus("l01-pay").passed, true);
  assert.strictEqual(p2.getDraft("l03-ws:clarify"), 'Line 1\nHe said "yes" <b>');
});

/* ---------- V1 migration (NT-01, A2) ---------- */
test("V1 completions are shown but do not count; the V1 key is never modified", () => {
  const v1 = JSON.stringify({ lessons: { 1: { complete: true }, 4: { complete: true }, 99: { complete: true } }, finalProject: { task1_email: { complete: true } } });
  const s = new FakeStorage({ [V1_KEY]: v1 });
  const p = make(s);
  const ev = p.evaluate();
  assert.deepStrictEqual(ev.lessons.filter((l) => l.completedInV1Only).map((l) => l.n), [1, 4]);
  assert.strictEqual(ev.completedLessons, 0);
  assert.strictEqual(ev.finalProject.complete, false);
  assert.strictEqual(s.data[V1_KEY], v1, "V1 key unchanged");
});

/* ---------- mastery and rule semantics ---------- */
test("answer-key activity: wrong attempts do not pass; a pass is kept after later wrong attempts", () => {
  const p = make();
  assert.strictEqual(p.recordAttempt("l01-pay", { passed: false }).passed, false);
  assert.strictEqual(p.recordAttempt("l01-pay", { passed: true }).passed, true);
  assert.strictEqual(p.recordAttempt("l01-pay", { passed: false }).passed, true);
  assert.strictEqual(p.getRecord("l01-pay").attempts, 3);
});

test("rule-checked work: the latest answer decides; editing to fail makes it incomplete (NT-02)", () => {
  const p = make();
  assert.strictEqual(p.recordAttempt("l01-ws", { answer: { ok: true } }).passed, true);
  const firstPass = p.getRecord("l01-ws").firstPassAt;
  assert.strictEqual(p.recordAttempt("l01-ws", { answer: { ok: false } }).passed, false);
  assert.strictEqual(p.getRecord("l01-ws").firstPassAt, firstPass, "first pass time kept");
  assert.strictEqual(p.recordAttempt("l01-ws", { passed: true, answer: { ok: false } }).passed, false, "caller cannot force a pass");
});

test("a rule that is not registered fails safe", () => {
  const p = PVAGA.createProgress({ storage: new FakeStorage(), rules: {}, now: clock() });
  assert.strictEqual(p.recordAttempt("l01-ws", { answer: { ok: true } }).passed, false);
});

test("unknown requirement ids are rejected", () => {
  assert.throws(() => make().recordAttempt("l99-nope", { passed: true }));
});

test("a lesson cannot be marked complete until all its requirements pass", () => {
  const p = make();
  p.recordAttempt("l01-pay", { passed: true });
  assert.strictEqual(p.markLessonComplete(1).ok, false);
  assert.strictEqual(completeLesson(p, 1).ok, true);
  assert.strictEqual(p.evaluate().lessons[0].complete, true);
});

/* ---------- Final Project (RT-14, RT-15, C-05) ---------- */
test("Final Project completes only via Finish with all 9 requirements passing", () => {
  const p = make();
  const reqs = PVAGA.manifest.finalProject.requirements;
  for (const r of reqs.slice(0, 8)) p.recordAttempt(r.id, passAnswer(r));
  assert.strictEqual(p.markFinalProjectComplete().ok, false, "checklist missing");
  p.recordAttempt("fp-checklist", { answer: { ok: true } });
  assert.strictEqual(p.evaluate().finalProject.complete, false, "requirements alone are not completion");
  assert.strictEqual(p.markFinalProjectComplete().ok, true);
  assert.strictEqual(p.evaluate().finalProject.complete, true);
  p.recordAttempt("fp-t3", { answer: { ok: false } });
  assert.strictEqual(p.evaluate().finalProject.complete, false, "a broken stored answer re-opens the project");
});

/* ---------- eligibility (RT-16) ---------- */
test("eligibility fixtures: lessons only / FP only / all / all with one broken answer", () => {
  const a = make(); completeAllLessons(a);
  assert.strictEqual(a.isCertificateEligible(), false);

  const b = make(); completeFinalProject(b);
  assert.strictEqual(b.isCertificateEligible(), false);
  assert.strictEqual(b.evaluate().finalProject.complete, true);

  const c = make(); completeAllLessons(c); completeFinalProject(c);
  assert.strictEqual(c.isCertificateEligible(), true);

  const d = make(); completeAllLessons(d); completeFinalProject(d);
  d.recordAttempt("l09-ws", { answer: { ok: false } });
  const ev = d.evaluate();
  assert.strictEqual(ev.eligible, false);
  assert.deepStrictEqual(ev.remaining.map((x) => x.n || x.kind), [9]);
});

test("13 completed lessons are required; requirement passes without Finish do not count", () => {
  const p = make();
  for (const l of PVAGA.manifest.lessons) for (const r of l.requirements) p.recordAttempt(r.id, passAnswer(r));
  completeFinalProject(p);
  assert.strictEqual(p.evaluate().completedLessons, 0);
  assert.strictEqual(p.isCertificateEligible(), false);
});

/* ---------- completedAt (spec clarification 2, RE-RT-06) ---------- */
test("completedAt is set when full eligibility is first reached and is never overwritten", () => {
  const now = clock();
  const p = make(new FakeStorage(), now);
  completeAllLessons(p);
  assert.strictEqual(p.getCert().completedAt, null, "not eligible yet");
  const lastLessonPass = Object.values(p.snapshot().records).map((r) => r.firstPassAt).sort().pop();
  completeFinalProject(p);
  const first = p.getCert().completedAt;
  assert.ok(first, "recorded at eligibility");
  assert.ok(first > lastLessonPass, "not the latest requirement firstPassAt");

  // Eligibility lost, then regained: the original date stays.
  p.recordAttempt("fp-t4", { answer: { ok: false } });
  assert.strictEqual(p.isCertificateEligible(), false);
  p.recordAttempt("fp-t4", { answer: { ok: true } });
  p.markFinalProjectComplete();
  assert.strictEqual(p.isCertificateEligible(), true);
  assert.strictEqual(p.getCert().completedAt, first);

  // Generating later keeps the same date.
  p.setCertName("Maria Santos"); p.setCertAck(true);
  for (let i = 0; i < 5; i++) now();
  const issued = p.issueCertificate();
  assert.strictEqual(issued.ok, true);
  assert.strictEqual(issued.cert.completedAt, first);
  assert.ok(issued.cert.issuedAt > first);
  assert.strictEqual(p.issueCertificate().cert.issuedAt, issued.cert.issuedAt, "issuedAt kept on regeneration");
});

test("certificate requires eligibility, name, acknowledgement and working storage", () => {
  const p = make();
  assert.strictEqual(p.issueCertificate().reason, "not-eligible");
  completeAllLessons(p); completeFinalProject(p);
  assert.strictEqual(p.issueCertificate().reason, "name-required");
  p.setCertName("  Juan Dela Cruz  ");
  assert.strictEqual(p.issueCertificate().reason, "ack-required");
  p.setCertAck(true);
  const r = p.issueCertificate();
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.cert.name, "Juan Dela Cruz");
  assert.match(r.cert.code, /^GA-[0-9A-F]{4}-[0-9A-F]{4}$/);
});

test("after issue, the name is locked unless explicitly corrected (NT-07)", () => {
  const p = make();
  completeAllLessons(p); completeFinalProject(p);
  p.setCertName("Juan"); p.setCertAck(true); p.issueCertificate();
  const code1 = p.getCert().code;
  assert.strictEqual(p.setCertName("Someone Else").ok, false);
  assert.strictEqual(p.getCert().name, "Juan");
  assert.strictEqual(p.setCertName("Juan Dela Cruz", { correction: true }).ok, true);
  assert.notStrictEqual(p.getCert().code, code1, "code follows the corrected name");
  assert.strictEqual(p.setCertName("x".repeat(500), { correction: true }).ok, true);
  assert.strictEqual(p.getCert().name.length, 120);
});

/* ---------- backup / restore (RE-RT-07) ---------- */
test("backup round-trips exactly and restore requires confirmation", () => {
  const p1 = make();
  completeAllLessons(p1); completeFinalProject(p1);
  p1.saveDraft("l01-ws:tasks-1", "Sorting email");
  const backup = p1.exportBackup();

  const s2 = new FakeStorage();
  const p2 = make(s2);
  p2.recordAttempt("l01-pay", { passed: true });
  const ask = p2.restoreBackup(backup);
  assert.strictEqual(ask.ok, false);
  assert.strictEqual(ask.needsConfirmation, true);
  assert.strictEqual(ask.backup.lessonsComplete, 13);
  assert.strictEqual(ask.current.lessonsComplete, 0);
  assert.strictEqual(p2.evaluate().completedLessons, 0, "nothing replaced before confirmation");

  assert.strictEqual(p2.restoreBackup(backup, { confirmed: true }).ok, true);
  assert.deepStrictEqual(p2.snapshot(), p1.snapshot());
  assert.strictEqual(make(s2).getCert().completedAt, p1.getCert().completedAt, "completedAt preserved through restore and reload");
});

test("invalid backups are rejected with a reason", () => {
  const p = make();
  assert.strictEqual(p.restoreBackup("not json", { confirmed: true }).error, "not-json");
  assert.strictEqual(p.restoreBackup(JSON.stringify({ hello: 1 }), { confirmed: true }).error, "not-a-backup");
  const other = JSON.parse(make().exportBackup()); other.course = "real-estate"; other.state.course = "real-estate";
  assert.strictEqual(p.restoreBackup(JSON.stringify(other), { confirmed: true }).error, "different-course");
  assert.strictEqual(p.restoreBackup("x".repeat(2000001), { confirmed: true }).error, "too-large");
});

/* ---------- manifest version bump (NT-03) ---------- */
test("a newer manifest version re-checks stored answers without crashing", () => {
  const s = new FakeStorage();
  const p1 = make(s);
  completeAllLessons(p1); completeFinalProject(p1);
  const stricter = { ...TEST_RULES, "l03-ws": () => ({ ok: false, missing: ["new rule"] }) };
  const manifest2 = { ...PVAGA.manifest, version: "2.1.0" };
  const p2 = PVACore.create({ ...PVAGA.config, manifest: manifest2, rules: stricter, storage: s, now: clock() });
  const ev = p2.evaluate();
  assert.strictEqual(ev.eligible, false);
  assert.deepStrictEqual(ev.remaining.map((x) => x.n), [3]);
  assert.ok(ev.completedAt, "the recorded completion date itself is kept");
});

/* ---------- reset ---------- */
test("reset clears progress but leaves the V1 key and V1 history alone", () => {
  const v1 = JSON.stringify({ lessons: { 2: { complete: true } } });
  const s = new FakeStorage({ [V1_KEY]: v1 });
  const p = make(s);
  completeLesson(p, 1);
  assert.strictEqual(p.reset(), true);
  const ev = make(s).evaluate();
  assert.strictEqual(ev.completedLessons, 0);
  assert.deepStrictEqual(ev.lessons.filter((l) => l.completedInV1Only).map((l) => l.n), [2]);
  assert.strictEqual(s.data[V1_KEY], v1);
});

test("core reports its version", () => {
  assert.strictEqual(PVACore.VERSION, "1.0.0");
  assert.strictEqual(make().version, "1.0.0");
});

/* ---------- Quick re-check completion guard (WP3b correction pass, decision 5) ---------- */
const RC = PVAGA.recheck;
const rcState = (items, queue) => JSON.stringify({ v: 1, queue: queue || Object.keys(items), items });
const wrongOnce = (passedAt = null) => ({ original: { wrong: 1, firstWrongAt: "2026-11-14T00:00:00Z" }, recheck: { attempts: passedAt ? 1 : 0, wrong: 0, passedAt } });

test("re-check: an outstanding re-check blocks lesson completion and the certificate", () => {
  const p = make();
  completeAllLessons(p);
  completeFinalProject(p);
  // Start again with a fresh store where Lesson 5 has an outstanding re-check
  const q = make();
  for (const l of PVAGA.manifest.lessons) if (l.n !== 5) completeLesson(q, l.n);
  completeFinalProject(q);
  q.saveDraft(RC.draftId(5), rcState({ "l05-tz#0": wrongOnce() }));
  const r = completeLesson(q, 5);
  assert.deepStrictEqual(r, { ok: false, saved: false, reason: "completion-guard" });
  const ev = q.evaluate();
  assert.strictEqual(ev.lessons.find((l) => l.n === 5).complete, false);
  assert.strictEqual(ev.eligible, false);
  assert.strictEqual(ev.completedAt, null);
  // Passing the re-check lets the normal completion through
  q.saveDraft(RC.draftId(5), rcState({ "l05-tz#0": wrongOnce("2026-11-14T01:00:00Z") }, []));
  assert.strictEqual(q.markLessonComplete(5).ok, true);
  assert.strictEqual(q.evaluate().eligible, true);
});

test("re-check: never a new way to unlock — a passed re-check cannot complete a lesson whose requirements fail", () => {
  const p = make();
  p.saveDraft(RC.draftId(3), rcState({ "l03-escalate#0": wrongOnce("2026-11-14T01:00:00Z") }, []));
  assert.strictEqual(p.markLessonComplete(3).ok, false);
  const ev = p.evaluate();
  assert.strictEqual(ev.completedLessons, 0);
  assert.strictEqual(ev.eligible, false);
  // The re-check state is a draft only: it writes no requirement records and no lesson completion
  const st = JSON.parse(p.exportBackup()).state;
  assert.deepStrictEqual(st.records, {});
  assert.deepStrictEqual(st.lessons, {});
});

test("re-check: a tampered queue cannot hide an item still owed; malformed entries are ignored", () => {
  const p = make();
  const items = { "l07-standard#1": wrongOnce(), "bad key": wrongOnce(), "l07-missing#0": { original: { wrong: 2 }, recheck: { passedAt: "not a date" } } };
  p.saveDraft(RC.draftId(7), JSON.stringify({ v: 1, queue: [], items }));
  const pending = RC.pending(7, p.getDraft);
  assert.deepStrictEqual(pending.sort(), ["l07-missing#0", "l07-standard#1"]);
  assert.strictEqual(completeLesson(p, 7).ok, false);
});

test("re-check: original wrong answers and re-check answers are recorded separately", () => {
  const p = make();
  p.saveDraft(RC.draftId(9), rcState({ "l09-follow#0": { original: { wrong: 3, firstWrongAt: "2026-11-14T00:00:00Z" }, recheck: { attempts: 2, wrong: 1, passedAt: "2026-11-14T02:00:00Z" } } }, []));
  const st = RC.read(9, p.getDraft);
  assert.deepStrictEqual(st.items["l09-follow#0"].original, { wrong: 3, firstWrongAt: "2026-11-14T00:00:00Z" });
  assert.deepStrictEqual(st.items["l09-follow#0"].recheck, { attempts: 2, wrong: 1, passedAt: "2026-11-14T02:00:00Z" });
  assert.deepStrictEqual(st.queue, []);
});

test("re-check: state survives a reload and a backup restore; a lesson completed earlier stays complete", () => {
  const storage = new FakeStorage();
  const p = make(storage);
  completeLesson(p, 2);
  p.saveDraft(RC.draftId(4), rcState({ "l04-authority#0": wrongOnce() }));
  const reloaded = make(storage);
  assert.deepStrictEqual(RC.pending(4, reloaded.getDraft), ["l04-authority#0"]);
  const other = make();
  assert.strictEqual(other.restoreBackup(reloaded.exportBackup(), { confirmed: true }).ok, true);
  assert.deepStrictEqual(RC.pending(4, other.getDraft), ["l04-authority#0"]);
  // Lesson 2 was already complete; a later re-check entry for it does not undo that
  other.saveDraft(RC.draftId(2), rcState({ "l02-skip#0": wrongOnce() }));
  assert.strictEqual(other.markLessonComplete(2).ok, true);
  assert.strictEqual(other.evaluate().lessons.find((l) => l.n === 2).complete, true);
});
