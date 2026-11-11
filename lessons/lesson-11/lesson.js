/* ==========================================================================
   Lesson 11 — AI-Assisted Administrative Work   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l11-verify   step 5  identify     exactly the 3 accurate items
     l11-privacy  step 6  scenario     "Faster, but is it safe?"
     l11-uses     step 7  sort         NEW check 7 (approved with addition 2026-11-11)
     l11-ws       step 8  work sample  AI-Assisted Administrative Workflow, rule "l11-ws"
   Scenario: correct answer and feedback unchanged; wrong options reworded so the
   correct answer is not the longest (audit M-01). The work sample gains
   "Never paste into AI".
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 11 });

  const CHOICES = {
    "l11-privacy": [{ options: [
      { id: "o1", correct: false,
        text: "Paste it in as it is — it's faster, the chatbot is well-known, and you'll delete the chat when you're done.",
        feedback: "Pasting real customer data into a public AI tool just because it's convenient is exactly what the privacy rule warns against — convenience isn't a good enough reason." },
      { id: "o2", correct: true,
        text: "Remove or replace identifying details before using AI, or use only a tool the client has approved for this kind of data.",
        feedback: "Correct. Use a version with names/identifying details replaced with placeholders, or use only a client-approved AI tool/configuration — follow the client's policy rather than defaulting to whatever's fastest." },
      { id: "o3", correct: false,
        text: "Don't use AI for any part of this reply, and write the whole thing by hand so that no customer information leaves your computer.",
        feedback: "Skipping AI assistance entirely isn't necessary — the issue is how it's used, not whether it's used at all. A safer approach (redacting details, using an approved tool) solves the actual problem." },
    ] }],
  };
  window.PVAGALesson = { n: 11, choices: CHOICES };

  /* ---- Step 5: verify the AI's work (l11-verify) ---- */
  A.IdentifyActivity({
    container: document.getElementById("verifyActivity"),
    requirementId: "l11-verify",
    prompt: "Tick each item that is accurate and safe to use as-is.",
    keepOrder: true,
    explainAll: true,
    options: [
      { id: "v1", text: "Draft a vendor update about the delayed shipment.", correct: true },
      { id: "v2", text: "Remind Dana to call the accountant by Friday.", correct: true },
      { id: "v3", text: "Schedule a call with the new supplier for tomorrow.", correct: false, note: "The email said \"sometime next week,\" not tomorrow — the AI invented a specific time that wasn't in the original request." },
      { id: "v4", text: "Check whether invoice INV-2291 was already paid.", correct: true },
      { id: "v5", text: "Follow up with the vendor about a refund.", correct: false, note: "Not mentioned anywhere in the original email — this was invented by the AI entirely." },
    ],
  });

  /* ---- Step 6: faster, but is it safe? (l11-privacy) ---- */
  A.ChoiceActivity({ container: document.getElementById("privacyActivity"), requirementId: "l11-privacy", items: CHOICES["l11-privacy"] });

  /* ---- Step 7: where does AI fit? (l11-uses, new check 7) ---- */
  A.SortActivity({
    container: document.getElementById("usesActivity"),
    requirementId: "l11-uses",
    hint: "For each task ask: is this a decision only the client can make? Does it involve personal or confidential data? If neither, AI can draft and you review.",
    bins: [
      { id: "draft", label: "AI draft + human review" },
      { id: "human", label: "Human decision only" },
      { id: "noai", label: "Don't put into AI" },
    ],
    items: [
      { id: "u1", text: "Turn your rough meeting notes into a first-draft action list", bin: "draft", feedback: "Good use. Check every item against your notes." },
      { id: "u2", text: "Draft a routine \"we received your request\" email template", bin: "draft", feedback: "Good use. Review tone and facts before saving." },
      { id: "u3", text: "Summarize a long public industry article for the client", bin: "draft", feedback: "Good use. Check figures against the article." },
      { id: "u4", text: "Decide whether to approve a customer's refund outside policy", bin: "human", feedback: "A business decision for the client, not the VA or AI." },
      { id: "u5", text: "Choose which vendor contract the client should sign", bin: "human", feedback: "Contract choices are the client's decision." },
      { id: "u6", text: "Clean a spreadsheet of customers' names, phone numbers and home addresses", bin: "noai", feedback: "Customer personal data. Only in a tool the client has approved for that data." },
      { id: "u7", text: "Paste the client's bank statement into a free AI tool to sort the expenses", bin: "noai", feedback: "Financial records are confidential. Use only a client-approved tool, or ask the client first." },
    ],
  });

  /* ---- Step 8: AI-Assisted Administrative Workflow (l11-ws) ---- */
  const rowsEl = document.getElementById("workflowRows");
  const COLS = [
    { key: "step", label: "Step", type: "text" },
    { key: "ai", label: "AI contribution", type: "textarea" },
    { key: "human", label: "Human verification", type: "textarea", placeholder: "What you check yourself, and against what" },
  ];
  const table = A.RowTable({
    container: rowsEl,
    idPrefix: "l11-ws",
    rowNoun: "Step",
    allowAdd: false,
    columns: COLS,
    starters: [
      { step: "Input", ai: "Summarize the fictional email", human: "Check summary against the original" },
      { step: "Extract", ai: "Identify action items", human: "Confirm every action exists in the source" },
      { step: "Organize", ai: "Draft task list", human: "Check priority/deadlines" },
      { step: "Output", ai: "Draft client update", human: "Review facts, tone, and authority" },
    ],
    startRows: 0,
  });
  const work = A.WrittenWork({
    container: document.getElementById("workflowCheck"),
    requirementId: "l11-ws",
    ruleName: "l11-ws",
    fields: [{ key: "neverPaste", label: "Never paste into AI", type: "textarea", rows: 2,
      hint: "The kinds of information you will keep out of AI tools for this task.",
      placeholder: "e.g. customer names, phone numbers …" }],
    watch: [rowsEl],
    collect: (inputs) => ({ rows: table.getRows(), neverPaste: inputs.neverPaste.value }),
    reviewNote: "Before you save it, review your completed workflow: for every AI step, is there a human check that would catch an invented or wrong detail?",
  });
  const checkEl = document.getElementById("workflowCheck");
  const rows = () => table.getRows().concat([{ step: "Never paste into AI", ai: work.inputs.neverPaste.value, human: "" }]);
  A.livePreview(document.getElementById("exportPreview"), { columns: COLS, getRows: rows, label: "Workflow preview", watch: [rowsEl, checkEl] });

  document.getElementById("printBtn").addEventListener("click", () => {
    A.printWorkSample({
      title: "AI-Assisted Administrative Workflow",
      subtitle: "Lesson 11 · AI-Assisted Administrative Work",
      sections: [
        { heading: "Workflow", table: { columns: COLS.map((c) => c.label), rows: table.getRows().map((r) => COLS.map((c) => r[c.key])) } },
        { heading: "Never paste into AI", text: work.inputs.neverPaste.value },
      ],
    });
  });

  A.Stepper({ lesson: 11, gates: { 5: "l11-verify", 6: "l11-privacy", 7: "l11-uses", 8: "l11-ws" } });
})();
