/* ==========================================================================
   Lesson 4 — Email Management & Inbox Triage   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l04-triage     step 6  triage       6/6 in an accepted category
     l04-authority  step 7  scenario     "What's the right move?"
     l04-ws         step 8  work sample  Inbox Triage Sheet, rule "l04-ws"
   Messages and explanations unchanged from v1, except the answer key for the
   $499 renewal: spend decisions are Client review only (audit M-09, consistent
   with the Final Project). Scenario: correct answer and feedback unchanged; wrong
   options reworded so the correct answer is not the longest (audit M-01).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 4 });

  const CATEGORIES = [
    { value: "reply", label: "Reply" },
    { value: "client_review", label: "Client review" },
    { value: "action", label: "Action" },
    { value: "waiting", label: "Waiting" },
    { value: "reference", label: "Reference" },
    { value: "archive", label: "Archive" },
  ];

  const CHOICES = {
    "l04-authority": [{ options: [
      { id: "o1", correct: false,
        text: "Reply promising the refund today, since that prevents a bad review and keeps the customer happy.",
        feedback: "Promising a refund outside policy is a financial commitment — outside a General Admin VA's authority, even under pressure like a review threat." },
      { id: "o2", correct: true,
        text: "Flag it to the client as Client review, noting it's outside standard policy and time-sensitive.",
        feedback: "Correct. This is a Client review case (outside standard policy) with real urgency. Flag it to the client with the details and let them decide — that's the professional move, not a delay." },
      { id: "o3", correct: false,
        text: "Leave it in the inbox until you have time — it's just one customer, and reviews blow over.",
        feedback: "Ignoring an urgent, policy-adjacent email doesn't protect the client — it just lets the situation get worse while nobody who has authority knows about it." },
    ] }],
  };
  window.PVAGALesson = { n: 4, choices: CHOICES };

  /* ---- Step 6: classify the inbox (l04-triage) ---- */
  A.TriageActivity({
    container: document.getElementById("triageActivity"),
    requirementId: "l04-triage",
    categories: CATEGORIES,
    legend: "Pick a category for each message, then check your answers.",
    items: [
      { id: "t1", text: "Meeting moved from 10 AM to 2 PM", accept: ["action"], feedback: "Action — update/confirm the calendar." },
      { id: "t2", text: "Industry newsletter", accept: ["reference", "archive"], feedback: "Reference or Archive — no immediate action needed." },
      { id: "t3", text: "Proposal needs client approval", accept: ["client_review"], feedback: "Client review — send or flag for approval." },
      { id: "t4", text: "Checking in on information requested last week", accept: ["action", "waiting"], feedback: "Action — check the previous request, and log it as a follow-up." },
      { id: "t5", text: "Software renews tomorrow for $499", accept: ["client_review"], feedback: "Client review — confirm the client's instruction before it renews." },
      { id: "t6", text: "Thank you; issue resolved", accept: ["archive"], feedback: "Archive — the conversation is complete." },
    ],
  });

  /* ---- Step 7: authority scenario (l04-authority) ---- */
  A.ChoiceActivity({ container: document.getElementById("authorityActivity"), requirementId: "l04-authority", items: CHOICES["l04-authority"] });

  /* ---- Step 8: Inbox Triage Sheet (l04-ws) ---- */
  const rowsEl = document.getElementById("triageRows");
  const COLS = [
    { key: "email", label: "Email #", type: "text" },
    { key: "sender", label: "Sender", type: "text" },
    { key: "subject", label: "Subject", type: "text" },
    { key: "category", label: "Category", type: "select", options: CATEGORIES },
    { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"] },
    { key: "action", label: "Action", type: "text", placeholder: "What you'll do next" },
    { key: "owner", label: "Owner", type: "text" },
    { key: "followup", label: "Follow-up", type: "text", placeholder: "Needed for Waiting, e.g. Fri 10 AM" },
    { key: "status", label: "Status", type: "text" },
  ];
  const table = A.RowTable({
    container: rowsEl,
    idPrefix: "l04-ws",
    rowNoun: "Message",
    addLabel: "+ Add another message",
    columns: COLS,
    examples: [
      { email: "1", sender: "ops@vendor.com", subject: "Meeting moved from 10 AM to 2 PM", category: "action", priority: "Medium", action: "Update calendar", owner: "You", followup: "—", status: "Open" },
      { email: "2", sender: "customer@example.com", subject: "Refund threat re: 1-star review", category: "client_review", priority: "High", action: "Flag to client", owner: "Client", followup: "Today", status: "Open" },
    ],
    startRows: 3,
  });
  const catLabel = (v) => (CATEGORIES.find((c) => c.value === v) || {}).label || v;
  const rows = () => table.getRows().map((r) => ({ ...r, category: catLabel(r.category) }));
  A.livePreview(document.getElementById("exportPreview"), { columns: COLS, getRows: rows, label: "Triage sheet preview", watch: [rowsEl] });

  A.WrittenWork({
    container: document.getElementById("triageCheck"),
    requirementId: "l04-ws",
    ruleName: "l04-ws",
    watch: [rowsEl],
    collect: () => ({ rows: table.getRows() }),
    reviewNote: "Before you save it, review your completed Triage Sheet: would the client agree with each category, and is every decision that needs their approval marked Client review?",
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    const filled = rows().filter((r) => COLS.some((c) => r[c.key] && String(r[c.key]).trim()));
    A.printWorkSample({
      title: "Inbox Triage Sheet",
      subtitle: "Lesson 4 · Email Management & Inbox Triage",
      sections: [{ heading: "Triage sheet", table: { columns: COLS.map((c) => c.label), rows: filled.map((r) => COLS.map((c) => r[c.key])) } }],
    });
  });

  A.Stepper({ lesson: 4, gates: { 6: "l04-triage", 7: "l04-authority", 8: "l04-ws" } });
})();
