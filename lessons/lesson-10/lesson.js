/* ==========================================================================
   Lesson 10 — Task Management, Priorities & Deadlines   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l10-sort        step 4  sort         6/6 (one item reworded per U-03, approved A4)
     l10-dependency  step 5  scenario     "Why is Task B late?"
     l10-conflict    step 6  scenario     "Two urgent requests"
     l10-workload    step 7  scenario     NEW check 6 (wording approved 2026-11-11)
     l10-ws          step 8  work sample  Administrative Task Tracker, rule "l10-ws"
   Scenarios: correct answers and feedback unchanged; wrong options reworded so the
   correct answer is not the longest (audit M-01). The tracker gains Owner (m-04).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 10 });

  const CHOICES = {
    "l10-dependency": [{ options: [
      { id: "o1", correct: false,
        text: "Apologize, say you're running behind on Task B, and promise you'll try to finish it sooner than planned.",
        feedback: "Apologizing without explaining the real cause leaves the client thinking you're behind schedule, when the actual blocker is outside your control." },
      { id: "o2", correct: true,
        text: "Explain that Task B depends on final copy from the product team, which hasn't arrived yet, and ask if they can help follow up.",
        feedback: "Correct. Naming the dependency clearly shows the client exactly what's blocking progress and who needs to act — not just that you're \"behind.\"" },
      { id: "o3", correct: false,
        text: "Start drafting Task B with placeholder content now, so that something is ready to show if the client checks in this afternoon.",
        feedback: "Starting on placeholder content risks wasted work and confusion once real copy arrives — better to flag the dependency and wait or follow up." },
    ] }],
    "l10-conflict": [{ options: [
      { id: "o1", correct: false,
        text: "The vendor email first, since it's marked \"URGENT\" and the vendor will be waiting on your answer.",
        feedback: "A vendor's own \"URGENT\" label doesn't override the client's stated deadline — the client's priorities are what actually define priority here, not how loudly a sender frames their request." },
      { id: "o2", correct: true,
        text: "The report due at noon, since that's the client's own deadline — with a brief \"got it, will reply shortly\" to the vendor.",
        feedback: "Correct. The client-defined deadline (today by noon) is a real commitment; the vendor's self-labeled urgency isn't automatically higher priority. A brief acknowledgment to the vendor buys time without dropping the report." },
      { id: "o3", correct: false,
        text: "Try to do both at the same time, switching between the report and the vendor reply so that neither one is left waiting too long.",
        feedback: "Splitting focus on both at once usually means neither gets done well, and the deadline that actually matters (the client's) is the one that slips." },
    ] }],
    "l10-workload": [{
      hint: "Add up the estimated hours and compare them with the time you have left. Who should decide what happens to the work that won't fit?",
      options: [
        { id: "w1", correct: false,
          text: "Start with the shortest task and keep working into the evening, so all three are done today without asking the client.",
          feedback: "Unplanned overtime hides the real workload, and rushed work raises errors. The client can't plan around what they don't know." },
        { id: "w2", correct: false,
          text: "Work through the requests in the order they arrived, then tell the client at 5:00 PM which ones did not get finished.",
          feedback: "Arrival order isn't priority, and 5:00 PM is too late for the client to adjust." },
        { id: "w3", correct: true,
          text: "Reply now: the three requests total about 9 hours, you have about 5 hours left today, so ask which tasks come first.",
          feedback: "Correct. Communicate workload early, with numbers, and let the client set priorities." },
        { id: "w4", correct: false,
          text: "Do a quick, partial version of all three tasks so each one is at least started, then send everything at 5:00 PM.",
          feedback: "Three unfinished results usually help less than one or two finished ones. Ask first." },
      ],
    }],
  };
  window.PVAGALesson = { n: 10, choices: CHOICES };

  /* ---- Step 4: urgency and importance (l10-sort) ---- */
  A.SortActivity({
    container: document.getElementById("sortActivity"),
    requirementId: "l10-sort",
    bins: [
      { id: "do_first", label: "Do first (urgent & important)" },
      { id: "schedule", label: "Schedule (important, not urgent)" },
      { id: "quick", label: "Quick or flag (urgent, low impact)" },
      { id: "later", label: "Batch for later (neither)" },
    ],
    items: [
      { id: "p1", text: "Client's website is down right now", bin: "do_first" },
      { id: "p2", text: "Software subscription expires and renews tomorrow", bin: "do_first" },
      { id: "p3", text: "Prepare a monthly report due in three weeks", bin: "schedule" },
      { id: "p4", text: "Update the tracker before tomorrow's 9 AM handoff", bin: "schedule" },
      { id: "p5", text: "Vendor marks a routine email 'ASAP' though it isn't client priority", bin: "quick" },
      { id: "p6", text: "Reply to a low-priority newsletter comment", bin: "later" },
    ],
  });

  A.ChoiceActivity({ container: document.getElementById("dependencyActivity"), requirementId: "l10-dependency", items: CHOICES["l10-dependency"] });
  A.ChoiceActivity({ container: document.getElementById("conflictActivity"), requirementId: "l10-conflict", items: CHOICES["l10-conflict"] });
  A.ChoiceActivity({ container: document.getElementById("workloadActivity"), requirementId: "l10-workload", items: CHOICES["l10-workload"] });

  /* ---- Step 8: Administrative Task Tracker (l10-ws) ---- */
  const rowsEl = document.getElementById("trackerRows");
  const COLS = [
    { key: "task", label: "Task", type: "text" },
    { key: "owner", label: "Owner", type: "text", placeholder: "Who does it" },
    { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"] },
    { key: "due", label: "Due", type: "text" },
    { key: "dependency", label: "Dependency", type: "text", placeholder: "What it waits on, or \"—\"" },
    { key: "status", label: "Status", type: "select", options: ["Not started", "In progress", "Waiting", "Done", "Blocked"] },
    { key: "next", label: "Next action", type: "text" },
    { key: "followup", label: "Follow-up", type: "text", placeholder: "e.g. Thu 2 PM" },
  ];
  const table = A.RowTable({
    container: rowsEl,
    idPrefix: "l10-ws",
    rowNoun: "Task",
    addLabel: "+ Add another task",
    columns: COLS,
    examples: [
      { task: "Reply to vendor 'urgent' email", owner: "You", priority: "Low", due: "Today", dependency: "—", status: "Not started", next: "Send brief acknowledgment", followup: "Tomorrow" },
      { task: "Finish monthly report", owner: "You", priority: "High", due: "Today, noon", dependency: "—", status: "In progress", next: "Finalize numbers section", followup: "—" },
    ],
    startRows: 3,
  });
  A.livePreview(document.getElementById("exportPreview"), { columns: COLS, getRows: () => table.getRows(), label: "Task tracker preview", watch: [rowsEl] });

  A.WrittenWork({
    container: document.getElementById("trackerCheck"),
    requirementId: "l10-ws",
    ruleName: "l10-ws",
    watch: [rowsEl],
    collect: () => ({ rows: table.getRows() }),
    reviewNote: "Before you save it, review your completed tracker: does every task have one owner and a clear next action, and would the client see at a glance what is blocked and why?",
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    const filled = table.getRows().filter((r) => COLS.some((c) => r[c.key] && String(r[c.key]).trim()));
    A.printWorkSample({
      title: "Administrative Task Tracker",
      subtitle: "Lesson 10 · Task Management, Priorities & Deadlines",
      sections: [{ heading: "Task tracker", table: { columns: COLS.map((c) => c.label), rows: filled.map((r) => COLS.map((c) => r[c.key])) } }],
    });
  });

  A.Stepper({ lesson: 10, gates: { 4: "l10-sort", 5: "l10-dependency", 6: "l10-conflict", 7: "l10-workload", 8: "l10-ws" } });
})();
