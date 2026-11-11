/* ==========================================================================
   Lesson 2 — The Administrative Workflow: Request to Done   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
   Requirements (shared/ga/manifest.js):
     l02-clarify  step 6  written      clarification questions, rule "l02-clarify"
     l02-skip     step 7  scenario     "Spot the skipped stage"
     l02-ws       step 8  work sample  Client Request → Action Plan, rule "l02-ws"
   Correct answers and all feedback are unchanged from v1. The wrong options were
   reworded so the correct answer is not the longest (audit M-01). The action plan
   gains Priority and Depends on (lesson objective: priority and dependencies).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 2 });

  const CHOICES = {
    "l02-skip": [{ options: [
      { id: "o1", correct: false,
        text: "Plan — the VA never worked out the priority or the deadline before starting on the cleanup.",
        feedback: "Plan was fine here — the VA knew what to do and when. The problem showed up after the work was done, not before it started." },
      { id: "o2", correct: true,
        text: "Check — the VA reported completion without reviewing accuracy and completeness first.",
        feedback: "Correct. Reporting \"Done\" without reviewing accuracy and completeness first skips the Check stage — that's exactly how avoidable mistakes reach the client." },
      { id: "o3", correct: false,
        text: "Close — the VA didn't update the task tracker after sending the finished file.",
        feedback: "Close is about updating trackers/folders after the work is confirmed complete — it's a later problem than this one, which is about work that wasn't actually finished." },
    ] }],
  };
  window.PVAGALesson = { n: 2, choices: CHOICES };

  /* ---- Step 6: clarification questions (l02-clarify); model only after a valid attempt ---- */
  A.WrittenWork({
    container: document.getElementById("clarifyWork"),
    requirementId: "l02-clarify",
    ruleName: "l02-clarify",
    fields: [{ key: "text", label: "Write three clarification questions you'd send back.", type: "textarea", rows: 4, placeholder: "1) ...\n2) ...\n3) ..." }],
    revealButton: document.getElementById("clarifyRevealBtn"),
    revealPanel: document.getElementById("clarifyModel"),
  });

  /* ---- Step 7: spot the skipped stage (l02-skip) ---- */
  A.ChoiceActivity({ container: document.getElementById("skipActivity"), requirementId: "l02-skip", items: CHOICES["l02-skip"] });

  /* ---- Step 8: Client Request → Action Plan (l02-ws) ---- */
  const rowsEl = document.getElementById("planRows");
  const COLS = [
    { key: "request", label: "Request", type: "textarea" },
    { key: "outcome", label: "Desired outcome", type: "textarea" },
    { key: "questions", label: "Questions", type: "textarea", placeholder: "The questions you'd ask the client" },
    { key: "steps", label: "Steps", type: "textarea", placeholder: "One step per line, or number them 1. 2. 3." },
    { key: "deadline", label: "Deadline", type: "text", placeholder: "e.g. Tomorrow, 10 AM" },
    { key: "dod", label: "Definition of done", type: "textarea" },
    { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"] },
    { key: "dependsOn", label: "Depends on", type: "text", placeholder: "What this waits for, or \"none\"" },
  ];
  const table = A.RowTable({
    container: rowsEl,
    idPrefix: "l02-ws",
    rowNoun: "Request",
    addLabel: "+ Add another request",
    columns: COLS,
    starters: [{ request: "Organize the attached contacts spreadsheet and have it ready by tomorrow." }],
    startRows: 0,
  });
  const PREVIEW = [
    { key: "request", label: "Request" }, { key: "outcome", label: "Outcome" }, { key: "questions", label: "Questions" },
    { key: "steps", label: "Steps" }, { key: "deadline", label: "Deadline" }, { key: "dod", label: "Def. of done" },
    { key: "priority", label: "Priority" }, { key: "dependsOn", label: "Depends on" },
  ];
  A.livePreview(document.getElementById("exportPreview"), { columns: PREVIEW, getRows: () => table.getRows(), label: "Action plan preview", watch: [rowsEl] });

  A.WrittenWork({
    container: document.getElementById("planCheck"),
    requirementId: "l02-ws",
    ruleName: "l02-ws",
    watch: [rowsEl],
    collect: () => ({ rows: table.getRows() }),
    reviewNote: "Before you save it, review your completed Action Plan: could someone else follow your steps, and would they know exactly when the work is done?",
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    const rows = table.getRows().filter((r) => PREVIEW.some((c) => r[c.key] && String(r[c.key]).trim()));
    A.printWorkSample({
      title: "Client Request → Action Plan",
      subtitle: "Lesson 2 · The Administrative Workflow: Request to Done",
      sections: rows.map((r, i) => ({ heading: `Request ${i + 1}`, table: { columns: ["Part", "Plan"], rows: PREVIEW.map((c) => [c.label, r[c.key]]) } })),
    });
  });

  A.Stepper({ lesson: 2, gates: { 6: "l02-clarify", 7: "l02-skip", 8: "l02-ws" } });
})();
