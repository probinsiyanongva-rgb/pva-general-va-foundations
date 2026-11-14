/* ==========================================================================
   General Admin VA — Beginner Foundations: requirement manifest (v2.0.0)
   --------------------------------------------------------------------------
   Single source of truth for the hub and the certificate page.
   52 lesson requirements (44 existing activities + 8 new checks) and
   9 Final Project requirements; the Final Project also needs Finish Project
   to be pressed while all 9 pass (fp-complete, stored as completedAt).

   type   — the activity kind (decides how the activity library renders it)
   rule   — name of a structure-check function in shared/ga/validators.js.
            Requirements with a rule are re-checked against the stored answer
            every time eligibility is evaluated. A rule that is not registered
            fails safe (the requirement does not pass).
   new    — true for the 8 checks added to close objective gaps (spec A8);
            their wording is reviewed before they are built.
   ========================================================================== */
(function (root, factory) {
  const core = typeof module === "object" && module.exports ? require("../pva-core/progress-core.js") : root.PVACore;
  const api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PVAGA = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (PVACore) {
  "use strict";

  const MANIFEST_VERSION = "2.0.0";

  // [id, type, rule, isNew]
  const req = ([id, type, rule, isNew]) => ({ id, type, rule: rule || null, new: !!isNew });
  const lesson = (n, title, rows) => ({ n, title, href: `/lessons/lesson-${String(n).padStart(2, "0")}/`, requirements: rows.map(req) });

  const manifest = {
    version: MANIFEST_VERSION,
    courseId: "ga-foundations",
    lessons: [
      lesson(1, "What Does a General Admin VA Actually Do?", [
        ["l01-pay", "scenario"],
        ["l01-sort", "sort"],
        ["l01-limit", "scenario"],
        ["l01-ws", "work-sample", "l01-ws"],
      ]),
      lesson(2, "The Administrative Workflow: Request to Done", [
        ["l02-clarify", "written", "l02-clarify"],
        ["l02-skip", "scenario"],
        ["l02-ws", "work-sample", "l02-ws"],
      ]),
      lesson(3, "Professional Communication & Client Updates", [
        ["l03-john", "written", "l03-john"],
        ["l03-escalate", "scenario"],
        ["l03-ws", "work-sample", "l03-ws"],
      ]),
      lesson(4, "Email Management & Inbox Triage", [
        ["l04-triage", "triage"],
        ["l04-authority", "scenario"],
        ["l04-ws", "work-sample", "l04-ws"],
      ]),
      lesson(5, "Calendar & Appointment Management", [
        ["l05-schedule", "schedule", "l05-schedule"],
        ["l05-tz", "scenario"],
        ["l05-resched", "scenario", null, true],
        ["l05-ws", "work-sample", "l05-ws"],
      ]),
      lesson(6, "Digital Organization: Files & Documents", [
        ["l06-sort", "sort"],
        ["l06-version", "scenario"],
        ["l06-access", "scenario", null, true],
        ["l06-ws", "work-sample", "l06-ws"],
      ]),
      lesson(7, "Spreadsheets, Data Cleanup & Accuracy", [
        ["l07-standard", "choice-set"],
        ["l07-dupes", "identify"],
        ["l07-missing", "scenario"],
        ["l07-formula", "choice-set", null, true],
        ["l07-ws", "work-sample", "l07-ws"],
      ]),
      lesson(8, "Internet Research & Information Management", [
        ["l08-sources", "sort"],
        ["l08-compare", "table", "l08-compare"],
        ["l08-conflict", "scenario"],
        ["l08-fact", "triage", null, true],
        ["l08-ws", "work-sample", "l08-ws"],
      ]),
      lesson(9, "SOPs, Checklists & Definition of Done", [
        ["l09-gap", "identify"],
        ["l09-practice", "written", "l09-practice"],
        ["l09-exception", "scenario"],
        ["l09-follow", "scenario", null, true],
        ["l09-ws", "work-sample", "l09-ws"],
      ]),
      lesson(10, "Task Management, Priorities & Deadlines", [
        ["l10-sort", "sort"],
        ["l10-dependency", "scenario"],
        ["l10-conflict", "scenario"],
        ["l10-workload", "scenario", null, true],
        ["l10-ws", "work-sample", "l10-ws"],
      ]),
      lesson(11, "AI-Assisted Administrative Work", [
        ["l11-verify", "identify"],
        ["l11-privacy", "scenario"],
        ["l11-uses", "sort", null, true],
        ["l11-ws", "work-sample", "l11-ws"],
      ]),
      lesson(12, "Privacy, Security & Client Access", [
        ["l12-situations", "choice-set"],
        ["l12-network", "scenario"],
        ["l12-personal", "identify", null, true],
        ["l12-ws", "work-sample", "l12-ws"],
      ]),
      lesson(13, "Quality Assurance & Escalation", [
        ["l13-find", "identify"],
        ["l13-fixflag", "scenario"],
        ["l13-ws", "work-sample", "l13-ws"],
      ]),
    ],
    finalProject: {
      href: "/final-project/",
      title: "Your First Simulated Client — Northstar Home Services",
      completeId: "fp-complete",
      requirements: [
        ["fp-t1", "triage"],
        ["fp-t2", "schedule", "fp-t2"],
        ["fp-t3", "work-sample", "fp-t3"],
        ["fp-t4", "table", "fp-t4"],
        ["fp-t5", "work-sample", "fp-t5"],
        ["fp-t6", "work-sample", "fp-t6"],
        ["fp-t7", "work-sample", "fp-t7"],
        ["fp-t8", "scenario-explained", "fp-t8"],
        ["fp-checklist", "attestation", "fp-checklist"],
      ].map(req),
    },
  };

  const config = {
    storageKey: "pvaga:progress:v2",
    courseId: manifest.courseId,
    codePrefix: "GA",
    legacy: { key: "pva-gadmin-ft-progress" },
  };

  // Every rule name the manifest refers to; validators.js (WP2) must register all of them.
  const ruleNames = () =>
    [...new Set(manifest.lessons.flatMap((l) => l.requirements).concat(manifest.finalProject.requirements)
      .map((r) => r.rule).filter(Boolean))];

  // The one progress store used by the hub, every lesson, the Final Project and
  // the certificate page. Options are for tests (fake storage, fixed clock, rules).
  /* ---- Quick re-check state (WP3b correction pass, decision 5) ----
     One draft per lesson, "lNN:recheck", holding
       { v: 1, queue: [itemKey], items: { [itemKey]: { original: { wrong, firstWrongAt },
                                                       recheck: { attempts, wrong, passedAt } } } }
     `original` counts wrong answers on the lesson step; `recheck` counts re-check answers only.
     The queue holds items still to answer correctly in the re-check, in order. */
  const recheckDraftId = (n) => `l${String(n).padStart(2, "0")}:recheck`;
  const KEY_RE = /^[a-z0-9-]+#[a-z0-9-]+$/;
  const count = (v) => (Number.isInteger(v) && v >= 0 && v <= 100000 ? v : 0);
  const iso = (v) => (typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null);
  function readRecheck(n, getDraft) {
    const out = { v: 1, queue: [], items: {} };
    let raw = null;
    try { raw = JSON.parse(getDraft(recheckDraftId(n), "null")); } catch (e) { raw = null; }
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || !raw.items || typeof raw.items !== "object") return out;
    for (const [k, it] of Object.entries(raw.items)) {
      if (!KEY_RE.test(k) || !it || typeof it !== "object") continue;
      const o = it.original || {}, r = it.recheck || {};
      out.items[k] = {
        original: { wrong: count(o.wrong), firstWrongAt: iso(o.firstWrongAt) },
        recheck: { attempts: count(r.attempts), wrong: count(r.wrong), passedAt: iso(r.passedAt) },
      };
    }
    // An item initially answered wrong and not yet passed in the re-check is always pending,
    // even if it has dropped out of a tampered queue.
    const queue = Array.isArray(raw.queue) ? raw.queue.filter((k) => out.items[k]) : [];
    for (const [k, it] of Object.entries(out.items)) if (it.original.wrong > 0 && !it.recheck.passedAt && !queue.includes(k)) queue.push(k);
    out.queue = [...new Set(queue)].filter((k) => !out.items[k].recheck.passedAt);
    return out;
  }
  const recheckPending = (n, getDraft) => readRecheck(n, getDraft).queue;

  function createProgress(opts = {}) {
    const rules = opts.rules || (typeof globalThis !== "undefined" && globalThis.PVAGAValidators) || {};
    return PVACore.create({
      ...config, manifest, rules, storage: opts.storage, now: opts.now,
      completionGuard: (n, { getDraft }) => recheckPending(n, getDraft).length === 0,
    });
  }

  return { MANIFEST_VERSION, manifest, config, ruleNames, createProgress, recheck: { draftId: recheckDraftId, read: readRecheck, pending: recheckPending } };
});
