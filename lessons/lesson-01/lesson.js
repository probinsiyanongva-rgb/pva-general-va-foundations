/* ==========================================================================
   Lesson 1 — What Does a General Admin VA Actually Do?   (v2.0, WP3a pilot)
   --------------------------------------------------------------------------
   Lesson data + wiring only. All behaviour comes from the shared activity
   library (shared/ga/activities.js). Requirements (shared/ga/manifest.js):
     l01-pay   step 4  scenario  "What is the client really paying for?"
     l01-sort  step 6  sort      "Task or Skill?"
     l01-limit step 7  scenario  "Recognize the limit"
     l01-ws    step 8  work sample (General Admin Task Map), rule "l01-ws"
   Correct answers, feedback and sort items are unchanged from v1. WP3a revision:
   the wrong options in both scenarios were reworded so the correct answer is
   not the longest option (audit M-01 length cue); their meaning is unchanged.
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  const h = A._h;
  A.initPage({ lesson: 1 });

  /* ---- Step 4: what the client is really paying for (l01-pay) ---- */
  A.ChoiceActivity({
    container: document.getElementById("payActivity"),
    requirementId: "l01-pay",
    items: [{ options: [
          {
                "id": "o1",
                "text": "Work as quickly as you can — the client called it simple, so a fast turnaround is what they will value most.",
                "correct": false,
                "feedback": "Speed matters, but a fast result that's wrong or inconsistent isn't reliable work — and reliability is what the client is actually paying for."
          },
          {
                "id": "o2",
                "text": "Clarify what \"clean\" means, then apply accuracy, consistency, and a quality check — the same as any other task.",
                "correct": true,
                "feedback": "Correct. \"Simple\" describes the client's expectation, not the standard of work. You'd still confirm what \"clean\" means, apply it consistently, and check accuracy — the five qualities of reliable work (accuracy, completeness, consistency, timeliness, clarity) apply even to small tasks."
          },
          {
                "id": "o3",
                "text": "Rely on the spreadsheet skills you already have — on a cleanup task like this, knowing the software is what matters most.",
                "correct": false,
                "feedback": "Software knowledge is only one part of the service. Judgment, accuracy, consistency, timeliness, and clarity matter just as much — sometimes more."
          }
    ] }],
  });

  /* ---- Step 6: Task or Skill? (l01-sort) ---- */
  A.SortActivity({
    container: document.getElementById("sortActivity"),
    requirementId: "l01-sort",
    bins: [{ id: "task", label: "Task" }, { id: "skill", label: "Skill" }],
    items: [
      { id: "s1", text: "Schedule a meeting", bin: "task" },
      { id: "s2", text: "Attention to detail", bin: "skill" },
      { id: "s3", text: "Clean a spreadsheet", bin: "task" },
      { id: "s4", text: "Professional communication", bin: "skill" },
      { id: "s5", text: "Organize a Google Drive folder", bin: "task" },
      { id: "s6", text: "Research five software options", bin: "task" },
      { id: "s7", text: "Time management", bin: "skill" },
      { id: "s8", text: "Draft a client update", bin: "task" },
    ],
  });

  /* ---- Step 7: recognize the limit (l01-limit) ---- */
  A.ChoiceActivity({
    container: document.getElementById("limitActivity"),
    requirementId: "l01-limit",
    items: [{ options: [
          {
                "id": "o1",
                "text": "Approve the refund — it's faster, it keeps the customer happy, and it stops the complaint before it reaches the client.",
                "correct": false,
                "feedback": "Approving a refund outside policy is a financial commitment — that's outside a beginner General Admin VA's authority, even if it seems like it would resolve the complaint quickly."
          },
          {
                "id": "o2",
                "text": "Escalate to the client: explain the situation is outside the usual policy window and ask how they'd like to proceed.",
                "correct": true,
                "feedback": "Correct. This is a financial decision outside standard policy — exactly the kind of thing to escalate rather than decide yourself. You'd flag it to the client with the relevant facts and let them decide."
          },
          {
                "id": "o3",
                "text": "Hold off on replying to the customer until the client happens to bring it up, so you don't say the wrong thing.",
                "correct": false,
                "feedback": "Ignoring it doesn't protect the client — it just delays a decision they need to make, and the customer is still waiting. Escalating with the facts is the professional path."
          }
    ] }],
  });

  /* ---- Step 8: General Admin Task Map (l01-ws) ---- */
  const table = A.RowTable({
    container: document.getElementById("taskMapRows"),
    idPrefix: "l01-ws",
    rowNoun: "Area",
    addLabel: "+ Add another area",
    columns: [
      { key: "area", label: "Administrative area", type: "text", placeholder: "e.g. Communication" },
      { key: "tasks", label: "Tasks you understand", type: "textarea", placeholder: "e.g. Sorting incoming email, sending confirmations" },
      { key: "skills", label: "Skills needed to do them well", type: "textarea", placeholder: "e.g. Clarity, tone, prioritizing" },
    ],
    starters: [{ area: "Communication" }, { area: "Scheduling" }, { area: "Information" }],
    startRows: 0,
  });
  const collect = () => ({ rows: table.getRows() });

  // Preview, built with textContent only. Desktop: the v1 three-column table.
  // Narrow screens (v2.css, <= 600px): one stacked card per area with its own
  // Area / Tasks / Skills labels. CSS shows exactly one of the two.
  const preview = document.getElementById("exportPreview");
  function renderPreview() {
    const rows = table.getRows();
    const val = (text) => (text && String(text).trim() ? String(text) : "—");
    const cell = (tag, text) => h(tag, {}, val(text));
    const desktop = h("table", { class: "ref-table ga-preview-table" },
      h("tr", {}, cell("th", "Area"), cell("th", "Tasks"), cell("th", "Skills")),
      ...rows.map((r) => h("tr", {}, cell("td", r.area), cell("td", r.tasks), cell("td", r.skills))));
    const field = (label, text) => h("div", { class: "ga-preview-field" }, h("dt", {}, label), h("dd", {}, val(text)));
    const mobile = h("ol", { class: "ga-preview-cards", "aria-label": "Task Map preview" },
      ...rows.map((r) => h("li", { class: "ga-preview-card" },
        h("dl", {}, field("Area", r.area), field("Tasks", r.tasks), field("Skills", r.skills)))));
    preview.replaceChildren(desktop, mobile);
  }
  const rowsEl = document.getElementById("taskMapRows");
  rowsEl.addEventListener("input", renderPreview);
  rowsEl.addEventListener("click", (e) => { if (e.target.closest(".btn")) setTimeout(renderPreview, 0); });
  renderPreview();

  A.WrittenWork({
    container: document.getElementById("taskMapCheck"),
    requirementId: "l01-ws",
    ruleName: "l01-ws",
    watch: [rowsEl],
    collect,
    reviewNote: "Before you save it, review your completed Task Map: read each row and check that the tasks are specific and the skills are the ones needed to do those tasks well.",
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    const rows = table.getRows().filter((r) => [r.area, r.tasks, r.skills].some((v) => v && v.trim()));
    A.printWorkSample({
      title: "General Admin Task Map",
      subtitle: "Lesson 1 · What Does a General Admin VA Actually Do?",
      sections: [{ heading: "Task map", table: { columns: ["Administrative area", "Tasks I understand", "Skills needed to do them well"], rows: rows.map((r) => [r.area, r.tasks, r.skills]) } }],
    });
  });

  /* ---- Stepper: Continue unlocks only from a correct, current state ---- */
  A.Stepper({ lesson: 1, gates: { 4: "l01-pay", 6: "l01-sort", 7: "l01-limit", 8: "l01-ws" } });
})();
