/* ==========================================================================
   PVA Core v1.0.0 — progress, storage, eligibility and certificate record
   --------------------------------------------------------------------------
   Course-neutral. A course passes its own configuration: storage key,
   course ID, requirement manifest, rule functions, and (optionally) a legacy
   V1 storage key to read. Nothing here is specific to one course, and nothing
   is loaded from another site: each course keeps its own copy of this file.

   Static, no-login model: everything lives in the learner's browser.
   These checks guide honest self-paced completion; they are not tamper-proof.
   ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PVACore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.0.0";
  const SCHEMA = 2;
  const BACKUP_FORMAT = "pva-progress-backup";
  const BACKUP_FORMAT_VERSION = 1;
  const LIMITS = {
    idLength: 120,
    draftChars: 20000,
    answerJsonChars: 60000,
    nameChars: 120,
    codeChars: 32,
    backupBytes: 2000000,
  };
  const ID_RE = /^[a-z0-9][a-z0-9:_-]*$/;
  const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  /* ---------- small helpers ---------- */
  const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const isISO = (v) => typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));
  const isId = (k) => typeof k === "string" && k.length <= LIMITS.idLength && ID_RE.test(k) && !FORBIDDEN_KEYS.has(k);
  const clone = (v) => JSON.parse(JSON.stringify(v));

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).toUpperCase().padStart(8, "0");
  }

  function emptyState(cfg) {
    return {
      schema: SCHEMA,
      course: cfg.courseId,
      manifestVersion: cfg.manifest.version,
      records: {},
      drafts: {},
      lessons: {},
      finalProject: { completedAt: null },
      cert: { name: "", ack: false, issuedAt: null, completedAt: null, code: null },
      legacyV1: null,
    };
  }

  /* ---------- normalisation: never trust stored or restored data ---------- */
  function normalize(raw, cfg) {
    const out = emptyState(cfg);
    if (!isPlainObject(raw) || raw.schema !== SCHEMA || raw.course !== cfg.courseId) return out;

    if (isPlainObject(raw.records)) {
      for (const [id, r] of Object.entries(raw.records)) {
        if (!isId(id) || !isPlainObject(r)) continue;
        const rec = {
          status: r.status === "passed" ? "passed" : "attempted",
          attempts: Number.isInteger(r.attempts) && r.attempts >= 0 && r.attempts <= 100000 ? r.attempts : 0,
          firstPassAt: isISO(r.firstPassAt) ? r.firstPassAt : null,
        };
        if (r.answer !== undefined) {
          try {
            const s = JSON.stringify(r.answer);
            if (typeof s === "string" && s.length <= LIMITS.answerJsonChars) rec.answer = JSON.parse(s);
          } catch (e) { /* drop unserialisable answer */ }
        }
        if (rec.status === "passed" && !rec.firstPassAt) rec.status = "attempted";
        out.records[id] = rec;
      }
    }
    if (isPlainObject(raw.drafts)) {
      for (const [id, v] of Object.entries(raw.drafts)) {
        if (isId(id) && typeof v === "string") out.drafts[id] = v.slice(0, LIMITS.draftChars);
      }
    }
    if (isPlainObject(raw.lessons)) {
      for (const [n, v] of Object.entries(raw.lessons)) {
        const num = Number(n);
        if (Number.isInteger(num) && num >= 1 && num <= cfg.manifest.lessons.length && isPlainObject(v) && isISO(v.completedAt)) {
          out.lessons[String(num)] = { completedAt: v.completedAt };
        }
      }
    }
    if (isPlainObject(raw.finalProject) && isISO(raw.finalProject.completedAt)) {
      out.finalProject.completedAt = raw.finalProject.completedAt;
    }
    if (isPlainObject(raw.cert)) {
      const c = raw.cert;
      if (typeof c.name === "string") out.cert.name = c.name.slice(0, LIMITS.nameChars);
      out.cert.ack = c.ack === true;
      if (isISO(c.issuedAt)) out.cert.issuedAt = c.issuedAt;
      if (isISO(c.completedAt)) out.cert.completedAt = c.completedAt;
      if (typeof c.code === "string" && c.code.length <= LIMITS.codeChars) out.cert.code = c.code;
    }
    if (isPlainObject(raw.legacyV1) && Array.isArray(raw.legacyV1.lessons) && isISO(raw.legacyV1.importedAt)) {
      out.legacyV1 = {
        lessons: raw.legacyV1.lessons.filter((n) => Number.isInteger(n) && n >= 1 && n <= cfg.manifest.lessons.length),
        importedAt: raw.legacyV1.importedAt,
      };
    }
    return out;
  }

  function validateConfig(cfg) {
    const need = ["storageKey", "courseId", "manifest"];
    for (const k of need) if (!cfg || !cfg[k]) throw new Error("PVACore: missing config." + k);
    const m = cfg.manifest;
    if (!Array.isArray(m.lessons) || !m.finalProject || !Array.isArray(m.finalProject.requirements)) {
      throw new Error("PVACore: manifest must have lessons[] and finalProject.requirements[]");
    }
    const seen = new Set();
    const all = m.lessons.flatMap((l) => l.requirements).concat(m.finalProject.requirements);
    for (const r of all) {
      if (!isId(r.id)) throw new Error("PVACore: invalid requirement id " + r.id);
      if (seen.has(r.id)) throw new Error("PVACore: duplicate requirement id " + r.id);
      seen.add(r.id);
    }
  }

  /* ======================================================================
     create(config) -> progress store for one course
     ====================================================================== */
  function create(cfg) {
    validateConfig(cfg);
    const manifest = cfg.manifest;
    const rules = cfg.rules || {};
    const now = typeof cfg.now === "function" ? cfg.now : () => new Date().toISOString();
    const listeners = {};
    const reqIndex = new Map();
    manifest.lessons.forEach((l) => l.requirements.forEach((r) => reqIndex.set(r.id, { ...r, lesson: l.n })));
    manifest.finalProject.requirements.forEach((r) => reqIndex.set(r.id, { ...r, lesson: null }));

    let storage = null;
    try { storage = cfg.storage || (typeof localStorage !== "undefined" ? localStorage : null); } catch (e) { storage = null; }
    let mode = storage ? "persistent" : "memory";
    let state;

    function emit(name, detail) {
      (listeners[name] || []).forEach((fn) => { try { fn(detail); } catch (e) { /* listener errors never break progress */ } });
    }
    function storageFailed(reason) {
      if (mode !== "memory") {
        mode = "memory";
        emit("storage-unavailable", { reason });
      }
    }

    function readRaw(key) {
      if (mode === "memory" || !storage) return { ok: false };
      try {
        return { ok: true, value: storage.getItem(key) };
      } catch (e) {
        storageFailed("read-error");
        return { ok: false };
      }
    }

    function load() {
      const r = readRaw(cfg.storageKey);
      let parsed = null;
      if (r.ok && r.value) {
        try { parsed = JSON.parse(r.value); } catch (e) { parsed = null; }
      }
      state = normalize(parsed, cfg);
      importLegacy();
    }

    // Writes, then reads back to confirm. Any mismatch counts as failure.
    function persist() {
      state.manifestVersion = manifest.version;
      if (mode === "memory" || !storage) { storageFailed("no-storage"); return false; }
      const text = JSON.stringify(state);
      try {
        storage.setItem(cfg.storageKey, text);
        if (storage.getItem(cfg.storageKey) !== text) { storageFailed("read-back-mismatch"); return false; }
        return true;
      } catch (e) {
        storageFailed("write-error");
        return false;
      }
    }

    // V1 data is read once and never modified. V1 completions are shown, not counted.
    function importLegacy() {
      if (state.legacyV1 || !cfg.legacy || !cfg.legacy.key) return;
      const r = readRaw(cfg.legacy.key);
      const lessons = [];
      if (r.ok && r.value) {
        try {
          const v1 = JSON.parse(r.value);
          if (isPlainObject(v1) && isPlainObject(v1.lessons)) {
            for (const [n, v] of Object.entries(v1.lessons)) {
              const num = Number(n);
              if (Number.isInteger(num) && num >= 1 && num <= manifest.lessons.length && isPlainObject(v) && v.complete === true) lessons.push(num);
            }
          }
        } catch (e) { /* malformed V1 data: nothing to import */ }
      }
      state.legacyV1 = { lessons: lessons.sort((a, b) => a - b), importedAt: now() };
      persist();
    }

    /* ---------- requirement evaluation ---------- */
    function requirementStatus(id) {
      const req = reqIndex.get(id);
      if (!req) return { known: false, passed: false, missing: ["Unknown requirement"] };
      const rec = state.records[id];
      if (!rec || rec.status !== "passed") return { known: true, passed: false, missing: ["Not completed yet"] };
      if (req.rule) {
        const fn = rules[req.rule];
        if (typeof fn !== "function") return { known: true, passed: false, missing: ["Check not available"] };
        let res;
        try { res = fn(rec.answer); } catch (e) { res = { ok: false, missing: ["Check could not run"] }; }
        if (!res || res.ok !== true) return { known: true, passed: false, missing: (res && res.missing) || ["Required parts missing"] };
      }
      return { known: true, passed: true, missing: [] };
    }

    const lessonReqs = (n) => (manifest.lessons.find((l) => l.n === n) || { requirements: [] }).requirements;
    const lessonRequirementsPass = (n) => lessonReqs(n).length > 0 && lessonReqs(n).every((r) => requirementStatus(r.id).passed);
    const finalRequirementsPass = () => manifest.finalProject.requirements.every((r) => requirementStatus(r.id).passed);

    function evaluate() {
      const lessons = manifest.lessons.map((l) => {
        const passed = l.requirements.filter((r) => requirementStatus(r.id).passed).length;
        const reqsOk = passed === l.requirements.length;
        const complete = reqsOk && !!(state.lessons[String(l.n)] && state.lessons[String(l.n)].completedAt);
        return {
          n: l.n,
          passed,
          total: l.requirements.length,
          complete,
          completedInV1Only: !complete && !!(state.legacyV1 && state.legacyV1.lessons.includes(l.n)),
        };
      });
      const fpPassed = manifest.finalProject.requirements.filter((r) => requirementStatus(r.id).passed).length;
      const fpReqsOk = fpPassed === manifest.finalProject.requirements.length;
      const finalProject = {
        passed: fpPassed,
        total: manifest.finalProject.requirements.length,
        complete: fpReqsOk && !!state.finalProject.completedAt,
      };
      const remaining = [];
      lessons.forEach((l) => { if (!l.complete) remaining.push({ kind: "lesson", n: l.n, passed: l.passed, total: l.total }); });
      if (!finalProject.complete) remaining.push({ kind: "finalProject", passed: finalProject.passed, total: finalProject.total });
      const eligible = remaining.length === 0;
      return {
        lessons,
        finalProject,
        completedLessons: lessons.filter((l) => l.complete).length,
        eligible,
        remaining,
        completedAt: state.cert.completedAt,
        storage: mode,
      };
    }

    // Evaluates and records the first moment full eligibility is reached.
    // cert.completedAt is written once and never overwritten (spec clarification 2).
    function refresh() {
      const ev = evaluate();
      if (ev.eligible && !state.cert.completedAt) {
        state.cert.completedAt = now();
        persist();
        ev.completedAt = state.cert.completedAt;
        emit("eligible", { completedAt: state.cert.completedAt });
      }
      emit("progress", ev);
      return ev;
    }

    /* ---------- mutations ---------- */
    function recordAttempt(id, { passed, answer } = {}) {
      const req = reqIndex.get(id);
      if (!req) throw new Error("PVACore: unknown requirement " + id);
      const rec = state.records[id] || { status: "attempted", attempts: 0, firstPassAt: null };
      rec.attempts += 1;
      if (req.rule) {
        // Rule-checked work: the latest submission is the evidence; the rule decides.
        rec.answer = answer === undefined ? null : clone(answer);
        let ok = false;
        const fn = rules[req.rule];
        if (typeof fn === "function") { try { ok = fn(rec.answer).ok === true; } catch (e) { ok = false; } }
        rec.status = ok ? "passed" : "attempted";
        if (ok && !rec.firstPassAt) rec.firstPassAt = now();
      } else if (passed === true) {
        // Answer-key activity: once answered correctly it stays passed.
        if (rec.status !== "passed") {
          rec.status = "passed";
          rec.firstPassAt = rec.firstPassAt || now();
          if (answer !== undefined) rec.answer = clone(answer);
        }
      }
      state.records[id] = rec;
      const saved = persist();
      refresh();
      return { passed: requirementStatus(id).passed, attempts: rec.attempts, saved };
    }

    function markLessonComplete(n) {
      if (!lessonRequirementsPass(n)) return { ok: false, saved: false };
      const key = String(n);
      if (!state.lessons[key]) state.lessons[key] = { completedAt: now() };
      const saved = persist();
      refresh();
      return { ok: true, saved };
    }

    // Recorded only when every Final Project requirement passes at this moment.
    function markFinalProjectComplete() {
      if (!finalRequirementsPass()) return { ok: false, saved: false };
      if (!state.finalProject.completedAt) state.finalProject.completedAt = now();
      const saved = persist();
      refresh();
      return { ok: true, saved };
    }

    function saveDraft(fieldId, text) {
      if (!isId(fieldId)) throw new Error("PVACore: invalid draft id " + fieldId);
      state.drafts[fieldId] = String(text == null ? "" : text).slice(0, LIMITS.draftChars);
      return persist();
    }
    const getDraft = (fieldId, fallback = "") => (Object.prototype.hasOwnProperty.call(state.drafts, fieldId) ? state.drafts[fieldId] : fallback);

    /* ---------- certificate record ---------- */
    function setCertName(name, { correction = false } = {}) {
      const clean = String(name == null ? "" : name).trim().slice(0, LIMITS.nameChars);
      if (state.cert.issuedAt && clean !== state.cert.name && !correction) return { ok: false, reason: "name-locked" };
      state.cert.name = clean;
      if (state.cert.issuedAt) state.cert.code = makeCode(clean, state.cert.completedAt);
      return { ok: true, saved: persist() };
    }
    function setCertAck(ack) {
      state.cert.ack = ack === true;
      return { ok: true, saved: persist() };
    }
    function makeCode(name, completedAt) {
      const h = fnv1a(`${cfg.courseId}|${name}|${completedAt}`);
      return `${cfg.codePrefix || "PVA"}-${h.slice(0, 4)}-${h.slice(4, 8)}`;
    }
    function issueCertificate() {
      const ev = refresh();
      if (!ev.eligible) return { ok: false, reason: "not-eligible", evaluation: ev };
      if (!state.cert.name) return { ok: false, reason: "name-required" };
      if (!state.cert.ack) return { ok: false, reason: "ack-required" };
      if (mode !== "persistent") return { ok: false, reason: "storage-unavailable" };
      if (!state.cert.issuedAt) state.cert.issuedAt = now();
      state.cert.code = makeCode(state.cert.name, state.cert.completedAt);
      const saved = persist();
      if (!saved) return { ok: false, reason: "storage-unavailable" };
      return { ok: true, cert: clone(state.cert) };
    }

    /* ---------- backup / restore ---------- */
    function summarize(s) {
      const tmpEval = (() => { const keep = state; state = s; try { return evaluate(); } finally { state = keep; } })();
      return {
        lessonsComplete: tmpEval.completedLessons,
        requirementsPassed: Object.values(s.records).filter((r) => r.status === "passed").length,
        finalProjectComplete: tmpEval.finalProject.complete,
        certificateCompletedAt: s.cert.completedAt,
      };
    }
    function exportBackup() {
      return JSON.stringify({
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        course: cfg.courseId,
        core: VERSION,
        exportedAt: now(),
        state,
      }, null, 2);
    }
    function inspectBackup(text) {
      if (typeof text !== "string" || text.length === 0) return { ok: false, error: "empty" };
      if (text.length > LIMITS.backupBytes) return { ok: false, error: "too-large" };
      let data;
      try { data = JSON.parse(text); } catch (e) { return { ok: false, error: "not-json" }; }
      if (!isPlainObject(data) || data.format !== BACKUP_FORMAT || data.formatVersion !== BACKUP_FORMAT_VERSION) return { ok: false, error: "not-a-backup" };
      if (data.course !== cfg.courseId) return { ok: false, error: "different-course" };
      if (!isPlainObject(data.state) || data.state.schema !== SCHEMA || data.state.course !== cfg.courseId) return { ok: false, error: "unsupported-version" };
      const normalized = normalize(data.state, cfg);
      return {
        ok: true,
        exportedAt: isISO(data.exportedAt) ? data.exportedAt : null,
        backup: summarize(normalized),
        current: summarize(state),
        normalized,
      };
    }
    // Restoring replaces current progress, so it requires explicit confirmation.
    function restoreBackup(text, { confirmed = false } = {}) {
      const info = inspectBackup(text);
      if (!info.ok) return info;
      if (!confirmed) return { ok: false, needsConfirmation: true, exportedAt: info.exportedAt, backup: info.backup, current: info.current };
      state = info.normalized;
      const saved = persist();
      refresh();
      return { ok: true, saved };
    }

    function reset() {
      const legacy = state.legacyV1;
      state = emptyState(cfg);
      state.legacyV1 = legacy; // V1 history stays visible; the V1 key itself is never touched
      return persist();
    }

    load();

    return {
      version: VERSION,
      // Storage can fail while the store is being created, before a page subscribes.
      // Late subscribers to "storage-unavailable" are told immediately, so the banner always shows.
      on(name, fn) {
        (listeners[name] = listeners[name] || []).push(fn);
        if (name === "storage-unavailable" && mode === "memory") {
          try { fn({ reason: "already-unavailable" }); } catch (e) { /* ignore */ }
        }
      },
      storageMode: () => mode,
      isPersistent: () => mode === "persistent",
      requirementStatus,
      evaluate,
      refresh,
      isCertificateEligible: () => refresh().eligible,
      recordAttempt,
      markLessonComplete,
      markFinalProjectComplete,
      saveDraft,
      getDraft,
      getRecord: (id) => (state.records[id] ? clone(state.records[id]) : null),
      getCert: () => clone(state.cert),
      setCertName,
      setCertAck,
      issueCertificate,
      exportBackup,
      inspectBackup,
      restoreBackup,
      reset,
      snapshot: () => clone(state),
    };
  }

  return { VERSION, SCHEMA, LIMITS, create, normalize };
});
