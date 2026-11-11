/* ==========================================================================
   Lesson 13 — Quality Assurance & Escalation   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l13-find     step 4  identify     all 10 real issues, none of the 3 distractors (M-08)
     l13-fixflag  step 5  scenario     "Fix it, or flag it?"
     l13-ws       step 6  work sample  QA Checklist + issue report, rule "l13-ws"
   Step 4: three issue types that are not in the report were added, and the report's
   giveaway annotations were replaced with what a reviewer would actually see (M-08).
   Scenario: correct answer and feedback unchanged; wrong options reworded so the
   correct answer is not the longest (audit M-01).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 13 });

  const CHOICES = {
    "l13-fixflag": [{ options: [
      { id: "o1", correct: false,
        text: "Escalate both the typo and the discount amount to the client, so nothing changes without their approval.",
        feedback: "Escalating a typo wastes the client's attention on something you're fully capable of fixing yourself — not every issue needs their involvement." },
      { id: "o2", correct: true,
        text: "Fix the typo yourself, and flag the discount amount to the client for approval.",
        feedback: "Correct. Fix the ordinary mistake (the typo) yourself — it's safe and within your authority. Flag the discount, since approving spend isn't your call to make." },
      { id: "o3", correct: false,
        text: "Leave both as they are, since the report is otherwise done and the deadline is close.",
        feedback: "Ignoring the authority issue means an unapproved discount could go out under the client's name — that's exactly the kind of thing that needs to be flagged, not skipped." },
    ] }],
  };
  window.PVAGALesson = { n: 13, choices: CHOICES };

  /* ---- Step 4: find the mistakes (l13-find) ---- */
  A.IdentifyActivity({
    container: document.getElementById("findActivity"),
    requirementId: "l13-find",
    prompt: "Tick every issue type that is in the report.",
    successText: "All ten real issues found, and none of the issue types that aren't in the report.",
    options: [
      { id: "date", text: "Wrong date", correct: true, note: "\"March 32, 2026\" isn't a real date." },
      { id: "attachment", text: "Missing attachment", correct: true, note: "The email says a file is attached, but none is." },
      { id: "status", text: "Inconsistent status", correct: true, note: "\"Overdue\", \"overdue\", and \"OVERDUE - FOLLOW UP\" are three different values for the same status." },
      { id: "formula", text: "Incorrect formula", correct: true, note: "=SUM(B2:B10)*2 doubles the total for no stated reason." },
      { id: "version", text: "Wrong file version", correct: true, note: "The filename doesn't reliably say which version is current." },
      { id: "link", text: "Broken link", correct: true, note: "The dashboard link returns a 404." },
      { id: "duplicate", text: "Duplicate record", correct: true, note: "\"Ana Reyes\" and \"Ana R.\" are the same person, left unresolved." },
      { id: "filename", text: "Unclear filename", correct: true, note: "\"Invoice_Tracker_v2_final_reallyfinal.xlsx\" is exactly the pattern this course warned against." },
      { id: "assumption", text: "Unsupported assumption", correct: true, note: "Records were deleted based on an assumption, without confirming first." },
      { id: "exception", text: "Unreported exception", correct: true, note: "INV-2291 was handled differently and only mentioned after the fact." },
      { id: "greeting", text: "Missing greeting", correct: false, note: "Not in this report: it opens with \"Hi Team,\"." },
      { id: "subject", text: "Missing subject line", correct: false, note: "Not in this report: the subject \"Weekly Invoice Update\" is there." },
      { id: "count", text: "Missing invoice count", correct: false, note: "Not in this report: it says 12 invoices were processed." },
    ],
  });

  /* ---- Step 5: fix it, or flag it? (l13-fixflag) ---- */
  A.ChoiceActivity({ container: document.getElementById("fixActivity"), requirementId: "l13-fixflag", items: CHOICES["l13-fixflag"] });

  /* ---- Step 6: QA Checklist + issue report (l13-ws) ---- */
  const QA_ITEMS = ["Correct", "Complete", "Consistent", "Compliant", "Clear"];
  const rowsEl = document.getElementById("qaRows");
  const qa = A.ChoiceRows({
    container: rowsEl,
    idPrefix: "l13-ws",
    items: QA_ITEMS,
    choices: [{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }],
    noteLabel: "Evidence",
    notePlaceholder: "What you checked, and what you found",
  });
  const work = A.WrittenWork({
    container: document.getElementById("qaCheck"),
    requirementId: "l13-ws",
    ruleName: "l13-ws",
    fields: [{ key: "issueReport", label: "Issue report", type: "textarea", rows: 4,
      hint: "What happened, what you did about it, and what still remains or what you recommend." }],
    watch: [rowsEl],
    collect: (inputs) => ({ checks: qa.collect().map((x) => ({ result: x.answer, evidence: x.note })), issueReport: inputs.issueReport.value }),
    reviewNote: "Before you save it, review your completed QA Checklist: would the evidence convince someone who didn't see the work, and does the issue report say clearly what still needs to happen?",
  });
  const checkEl = document.getElementById("qaCheck");
  const PREVIEW = [{ key: "check", label: "Check" }, { key: "result", label: "Pass/Fail" }, { key: "evidence", label: "Evidence" }];
  const rows = () => qa.collect().map((x, i) => ({ check: QA_ITEMS[i], result: qa.labelOf(x.answer), evidence: x.note }))
    .concat([{ check: "Issue report", result: "", evidence: work.inputs.issueReport.value }]);
  A.livePreview(document.getElementById("exportPreview"), { columns: PREVIEW, getRows: rows, label: "QA checklist preview", watch: [rowsEl, checkEl] });

  document.getElementById("printBtn").addEventListener("click", () => {
    A.printWorkSample({
      title: "QA Checklist",
      subtitle: "Lesson 13 · Quality Assurance & Escalation",
      sections: [
        { heading: "Five-question check", table: { columns: PREVIEW.map((c) => c.label), rows: rows().slice(0, QA_ITEMS.length).map((r) => [r.check, r.result, r.evidence]) } },
        { heading: "Issue report", text: work.inputs.issueReport.value },
      ],
    });
  });

  A.Stepper({ lesson: 13, gates: { 4: "l13-find", 5: "l13-fixflag", 6: "l13-ws" } });
})();
