/* ==========================================================================
   Final Project — Your First Simulated Client (Northstar Home Services)   (v2.0, WP4)
   --------------------------------------------------------------------------
   Task data + wiring only; behaviour comes from shared/ga/activities.js.
     step 2   fp-t1         triage, 10 messages (answer key; spend decisions = Client review only)
     step 3   fp-t2         structured schedule (rule "fp-t2"); model only after a pass
     step 4   fp-t3         record cleaning, field-level checks (rule "fp-t3"); model only after a pass
     step 5   fp-t4         research table (rule "fp-t4")
     step 6   fp-t5         SOP (rule "fp-t5")
     step 7   fp-t6         task tracker + conflict note (rule "fp-t6")
     step 8   fp-t7         AI assistance (rule "fp-t7")
     step 9   fp-t8         safer response + explanation (rule "fp-t8")
     step 10  fp-checklist  all 8 statements (rule "fp-checklist")
     step 11  completion    Finish Project = markFinalProjectComplete(); report print + .html download
   Completion is current only while all 9 requirements pass and a current Finish exists;
   finalProject.completedAt is history (WP4 red-team F1, decision R2).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  const V = window.PVAGAValidators;
  const M = V.__meta;
  const h = A._h;
  const store = A.initPage({});

  /* ---- reveal-after-pass helper (M-02): the model never unlocks or records anything ---- */
  function lockedReveal(btnId, panelId, requirementId, noteText) {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    const note = h("p", { class: "small ga-reveal-note", id: `${btnId}-note` }, noteText);
    btn.after(note);
    btn.setAttribute("aria-describedby", note.id);
    const sync = () => {
      const ok = store.requirementStatus(requirementId).passed;
      btn.disabled = !ok;
      note.hidden = ok;
      if (!ok) panel.hidden = true;
    };
    btn.addEventListener("click", () => { if (!btn.disabled) panel.hidden = !panel.hidden; });
    store.on("progress", sync);
    sync();
  }

  /* ---- Task 1: email triage (fp-t1) ---- */
  const CATEGORIES = [
    { value: "reply", label: "Reply" },
    { value: "client_review", label: "Client review" },
    { value: "action", label: "Action" },
    { value: "waiting", label: "Waiting" },
    { value: "reference", label: "Reference" },
    { value: "archive", label: "Archive" },
  ];
  const EMAILS = [
    { id: "e1", text: "Kitchen faucet leak — customer wants a same-day visit", accept: ["action"], feedback: "Action — needs scheduling right away." },
    { id: "e2", text: "Monthly newsletter from a home-services supplier", accept: ["reference", "archive"], feedback: "Reference or Archive — no action needed." },
    { id: "e3", text: "Quote approved by customer, please schedule installation", accept: ["action"], feedback: "Action — move straight to scheduling." },
    { id: "e4", text: "Following up on a quote sent last week — no response yet", accept: ["waiting", "action"], feedback: "Waiting — track it and follow up if it stays quiet." },
    { id: "e5", text: "Insurance renewal invoice, $1,200, due in 10 days", accept: ["client_review"], feedback: "Client review — a payment of this size needs the owner's approval." },
    { id: "e6", text: "Thank-you note from a happy customer", accept: ["archive"], feedback: "Archive — nice to keep, no action needed." },
    { id: "e7", text: "Subcontractor asking about next week's schedule", accept: ["action"], feedback: "Action — needs a scheduling reply." },
    { id: "e8", text: "Customer disputing a charge on their invoice", accept: ["client_review"], feedback: "Client review — a billing dispute isn't yours to resolve alone." },
    { id: "e9", text: "Reminder: annual business permit renewal due next month", accept: ["action"], feedback: "Action — needs to go on the task tracker." },
    { id: "e10", text: "Spam-looking email about 'exclusive contractor leads'", accept: ["archive"], feedback: "Archive — not a real business inquiry." },
  ];
  A.TriageActivity({ container: document.getElementById("emailActivity"), requirementId: "fp-t1", categories: CATEGORIES, items: EMAILS });

  /* ---- Task 2: calendar (fp-t2) ---- */
  const times = [];
  for (let m = 8 * 60; m <= 16 * 60 + 30; m += 15) times.push(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
  const fmt = (t) => {
    const [hh, mm] = t.split(":").map(Number);
    return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
  };
  A.ScheduleActivity({
    container: document.getElementById("calActivity"),
    requirementId: "fp-t2",
    ruleName: "fp-t2",
    formatTime: fmt,
    days: M.FP_T2.days,
    items: Object.entries(M.FP_T2.items).map(([key, v]) => ({ key, label: v.label })),
    times,
    noteLabel: "What needs the owner's or customer's confirmation?",
  });
  lockedReveal("calRevealBtn", "calModel", "fp-t2", "Available once your schedule meets every rule.");

  /* ---- Task 3: spreadsheet cleanup (fp-t3) ---- */
  const t3 = A.CleanRecords({
    container: document.getElementById("t3Records"),
    idPrefix: "fp-t3",
    records: M.FP_T3_RECORDS,
    examples: M.FP_T3_EXAMPLES,
  });
  A.WrittenWork({
    container: document.getElementById("t3Check"),
    requirementId: "fp-t3",
    ruleName: "fp-t3",
    watch: [document.getElementById("t3Records")],
    fields: [{ key: "rules", label: "Cleaning rules you used (one per line)", type: "textarea", rows: 3, placeholder: "e.g. Title Case names" }],
    collect: (inputs) => ({ records: t3.getRecords(), rules: inputs.rules.value }),
  });
  const FLAG_LABEL = { none: "None", duplicate: "Duplicate", "missing-email": "Missing email", "ambiguous-date": "Ambiguous date" };
  document.getElementById("t3Model").append(
    h("strong", {}, "One answer that passes every check:"),
    h("div", { class: "ga-table-scroll" }, h("table", { class: "ref-table", style: "margin-top:8px;" },
      h("tr", {}, ...["Record", "Name", "Mobile", "Status", "Email", "Date added", "Flag", "Why"].map((t) => h("th", {}, t))),
      ...M.FP_T3_RECORDS.map((r) => h("tr", {},
        h("td", {}, r.id), h("td", {}, r.clean.name), h("td", {}, r.clean.mobile), h("td", {}, r.clean.status), h("td", {}, r.clean.email),
        h("td", {}, r.clean.date),
        h("td", {}, r.flag === "duplicate" ? `Duplicate of ${r.duplicateOf}` : FLAG_LABEL[r.flag]),
        h("td", {}, r.why + (r.clarification ? ` Clarification: “${r.clarification}”` : "")))))),
    h("p", { style: "margin:10px 0 0;" }, "Other consistent formats also pass — for example every number written as 09XX-XXX-0001, or every readable date as 20 Jan 2026."));
  lockedReveal("t3RevealBtn", "t3Model", "fp-t3", "Available once your cleaned records pass every check.");

  /* ---- Task 4: research (fp-t4) ---- */
  const T4_COLS = [
    { key: "tool", label: "Tool", type: "text" },
    { key: "price", label: "Price (or \"not published\")", type: "text" },
    { key: "features", label: "Key features", type: "textarea" },
    { key: "pros", label: "Pros", type: "textarea" },
    { key: "cons", label: "Cons", type: "textarea" },
    { key: "source", label: "Source (link or publisher)", type: "text" },
    { key: "checked", label: "Date checked", type: "text", placeholder: "e.g. 14 Nov 2026" },
  ];
  const t4Rows = document.getElementById("t4Rows");
  const t4 = A.RowTable({ container: t4Rows, idPrefix: "fp-t4", columns: T4_COLS, startRows: 3, rowNoun: "Tool", addLabel: "+ Add another tool" });
  A.WrittenWork({ container: document.getElementById("t4Check"), requirementId: "fp-t4", ruleName: "fp-t4", watch: [t4Rows], collect: () => ({ rows: t4.getRows() }) });

  /* ---- Task 5: SOP (fp-t5) ---- */
  const SOP = ["Purpose", "Trigger", "Inputs", "Tools/access", "Steps", "Exceptions", "Escalation", "Definition of done"];
  A.WrittenWork({
    container: document.getElementById("t5Fields"),
    requirementId: "fp-t5",
    ruleName: "fp-t5",
    fields: SOP.map((f) => ({ key: f, label: f, type: "textarea", rows: f === "Steps" ? 4 : 2 })),
    collect: (inputs) => ({ fields: Object.fromEntries(SOP.map((f) => [f, inputs[f].value])) }),
  });

  /* ---- Task 6: task management (fp-t6) ---- */
  const T6_COLS = [
    { key: "task", label: "Task", type: "text" },
    { key: "owner", label: "Owner", type: "text", placeholder: "e.g. VA, Owner" },
    { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"] },
    { key: "due", label: "Due", type: "text" },
    { key: "dependency", label: "Depends on", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["Not started", "In progress", "Waiting", "Done", "Blocked"] },
    { key: "next", label: "Next action", type: "text" },
  ];
  const t6Rows = document.getElementById("t6Rows");
  const t6 = A.RowTable({
    container: t6Rows,
    idPrefix: "fp-t6",
    columns: T6_COLS,
    rowNoun: "Task",
    addLabel: "+ Add another task",
    examples: [
      { task: "Owner attends the start of the approved kitchen installation", owner: "Owner", priority: "High", due: "Thu 8–10 AM", dependency: "Customer confirms Thursday", status: "Waiting", next: "Confirm Thursday with the customer" },
      { task: "Owner reviews and signs the $1,200 insurance renewal", owner: "Owner", priority: "High", due: "Thu (invoice due)", dependency: "Owner free only Thu 8–10 AM before site visits", status: "Not started", next: "Send the renewal papers to the owner" },
    ],
    startRows: 3,
  });
  A.WrittenWork({
    container: document.getElementById("t6Check"),
    requirementId: "fp-t6",
    ruleName: "fp-t6",
    watch: [t6Rows],
    fields: [{ key: "conflictNote", label: "Which tasks compete, and how would you resolve it with the owner?", type: "textarea", rows: 3 }],
    collect: (inputs) => ({ rows: t6.getRows(), conflictNote: inputs.conflictNote.value }),
  });

  /* ---- Task 7: AI assistance (fp-t7) ---- */
  A.WrittenWork({
    container: document.getElementById("t7Fields"),
    requirementId: "fp-t7",
    ruleName: "fp-t7",
    fields: [
      { key: "used", label: "What did you use AI for?", type: "textarea", rows: 2 },
      { key: "verify", label: "What did you check to verify the output before using it?", type: "textarea", rows: 3, placeholder: "e.g. checked names and dates against the original" },
      { key: "noConfidential", label: "I did not paste any confidential or personal data into the AI tool.", type: "checkbox" },
    ],
    collect: (inputs) => ({ used: inputs.used.value, verify: inputs.verify.value, noConfidential: inputs.noConfidential.checked }),
  });

  /* ---- Task 8: security (fp-t8) ---- */
  let t8Correct = store.getDraft("fp-t8:correct", "") === "true";
  let t8Work = null;
  A.ChoiceItem(document.getElementById("t8Choice"), { options: M.FP_T8.options }, {
    alreadyPassed: t8Correct,
    onResult(ok) {
      if (!ok) return;
      t8Correct = true;
      store.saveDraft("fp-t8:correct", "true");
      if (t8Work) t8Work.refresh();
    },
  });
  t8Work = A.WrittenWork({
    container: document.getElementById("t8Fields"),
    requirementId: "fp-t8",
    ruleName: "fp-t8",
    fields: [{ key: "explanation", label: "Briefly explain the safer action and the escalation path (who needs to know, and what should happen next).", type: "textarea", rows: 3 }],
    collect: (inputs) => ({ correct: t8Correct, explanation: inputs.explanation.value }),
  });

  /* ---- Final checklist (fp-checklist) ---- */
  const CHECKLIST = [
    "I understood each request before acting.",
    "I documented important assumptions and clarification questions.",
    "I prioritized work rather than simply processing it in arrival order.",
    "I checked my work before delivery.",
    "I stayed within the client's authority.",
    "I handled information responsibly.",
    "I communicated status and exceptions clearly.",
    "My files are organized and easy to understand.",
  ];
  A.WrittenWork({
    container: document.getElementById("checklistFields"),
    requirementId: "fp-checklist",
    ruleName: "fp-checklist",
    fields: CHECKLIST.map((label, i) => ({ key: `chk${i}`, label, type: "checkbox" })),
    collect: (inputs) => ({ checked: CHECKLIST.map((_, i) => inputs[`chk${i}`].checked) }),
  });

  /* ---- Completion, status and report (C-04, Q12, Q13, R3) ---- */
  const nameInput = document.getElementById("reportName");
  nameInput.value = store.getDraft("fp:report-name", "") || store.getCert().name || "";
  nameInput.addEventListener("input", () => store.saveDraft("fp:report-name", nameInput.value)); // never the certificate name (Q12)

  const answerOf = (id) => ((store.getRecord(id) || {}).answer) || {};
  const labelOf = (opts, v) => (opts.find((o) => o.value === v) || {}).label || v || "";
  function reportSections() {
    const t1 = answerOf("fp-t1");
    const t2 = answerOf("fp-t2");
    const t3a = answerOf("fp-t3");
    const t5a = answerOf("fp-t5");
    const t6a = answerOf("fp-t6");
    const t7a = answerOf("fp-t7");
    const t8a = answerOf("fp-t8");
    const flagText = (r) => (r.flag === "duplicate" ? `Duplicate of ${r.duplicateOf}` : FLAG_LABEL[r.flag || "none"]);
    return [
      { heading: "Task 1 — Email triage", table: { columns: ["Message", "Category"], rows: EMAILS.map((e) => [e.text, labelOf(CATEGORIES, t1[e.id])]) } },
      { heading: "Task 2 — Calendar", table: { columns: ["Item", "Day", "Start (Northstar time)"],
        rows: Object.entries(M.FP_T2.items).map(([k, v]) => [v.label, ((t2.placements || {})[k] || {}).day, ((t2.placements || {})[k] || {}).start ? fmt(t2.placements[k].start) : ""]) } },
      { heading: "Task 2 — Needs confirmation", text: t2.note },
      { heading: "Task 3 — Cleaned customer records", table: { columns: ["Record", "Name", "Mobile", "Status", "Email", "Date added", "Flag", "Clarification"],
        rows: (t3a.records || []).map((r) => [r.id, r.name, r.mobile, r.status, r.email, r.date, flagText(r), r.clarification]) } },
      { heading: "Task 3 — Cleaning rules", text: t3a.rules },
      { heading: "Task 4 — Software research", table: { columns: T4_COLS.map((c) => c.label),
        rows: (answerOf("fp-t4").rows || []).filter((r) => String(r.tool || "").trim()).map((r) => T4_COLS.map((c) => r[c.key])) } },
      { heading: "Task 5 — SOP: new customer booking", table: { columns: ["Part", "Content"], rows: SOP.map((f) => [f, (t5a.fields || {})[f]]) } },
      { heading: "Task 6 — Task tracker", table: { columns: T6_COLS.map((c) => c.label),
        rows: (t6a.rows || []).filter((r) => r.example !== true && String(r.task || "").trim()).map((r) => T6_COLS.map((c) => r[c.key])) } },
      { heading: "Task 6 — Competing tasks", text: t6a.conflictNote },
      { heading: "Task 7 — AI assistance", table: { columns: ["Question", "Answer"], rows: [
        ["What AI was used for", t7a.used], ["How the output was verified", t7a.verify],
        ["No confidential or personal data pasted", t7a.noConfidential === true ? "Confirmed" : "Not confirmed"]] } },
      { heading: "Task 8 — Security", table: { columns: ["Question", "Answer"], rows: [
        ["Safer response chosen", t8a.correct === true ? M.FP_T8.options.find((o) => o.correct).text : ""], ["Explanation", t8a.explanation]] } },
      { heading: "Final submission checklist", table: { columns: ["Statement", "Confirmed"],
        rows: CHECKLIST.map((c, i) => [c, ((answerOf("fp-checklist").checked || [])[i] === true) ? "Yes" : "No"]) } },
    ];
  }
  const REPORT = { title: "Northstar Home Services — Final Project Report", subtitle: "General Administrative VA — Beginner Foundations · Final Project" };
  const reportOpts = () => ({ ...REPORT, sections: reportSections(), learnerName: nameInput.value.trim() });

  const printBtn = document.getElementById("printReportBtn");
  const downloadBtn = document.getElementById("downloadReportBtn");
  const locked = document.getElementById("reportLocked");
  const statusEl = document.getElementById("completionStatus");
  function syncCompletion() {
    const ev = store.evaluate();
    const current = ev.finalProject.complete;
    // R3: report actions only while the project is currently complete.
    printBtn.disabled = !current;
    downloadBtn.disabled = !current;
    locked.hidden = current;
    locked.textContent = current ? "" : "Your report is available while every task meets its required parts and Finish Project has been pressed.";
    // Q13: say exactly how many lessons remain.
    const left = ev.lessons.length - ev.completedLessons;
    statusEl.textContent = !current
      ? "The project is not currently complete."
      : left === 0
        ? "All 13 lessons and the Final Project are complete. Together with your 13 lesson work samples, this project completes your 14-piece starter General Admin VA portfolio."
        : `Final Project complete. ${left} lesson${left === 1 ? "" : "s"} still to finish before your certificate.`;
  }
  store.on("progress", syncCompletion);
  printBtn.addEventListener("click", () => { if (!printBtn.disabled) A.printWorkSample(reportOpts()); });
  downloadBtn.addEventListener("click", () => {
    if (downloadBtn.disabled) return;
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    A.downloadReport(reportOpts(), `Northstar-Final-Project-Report-${stamp}.html`);
  });

  A.Stepper({
    finalProject: true,
    gates: { 2: "fp-t1", 3: "fp-t2", 4: "fp-t3", 5: "fp-t4", 6: "fp-t5", 7: "fp-t6", 8: "fp-t7", 9: "fp-t8", 10: "fp-checklist" },
    onComplete: syncCompletion,
  });
  syncCompletion();
})();
