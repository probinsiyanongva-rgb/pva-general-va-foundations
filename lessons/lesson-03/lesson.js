/* ==========================================================================
   Lesson 3 — Professional Communication & Client Updates   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l03-john      step 6  written      message about the two Johns, rule "l03-john"
     l03-escalate  step 7  scenario     "Escalate, or handle it?"
     l03-ws        step 8  work sample  Client Communication Pack, rule "l03-ws"
   Correct answer and all feedback unchanged from v1; wrong options reworded so the
   correct answer is not the longest (audit M-01).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 3 });

  const CHOICES = {
    "l03-escalate": [{ options: [
      { id: "o1", correct: false,
        text: "Sign it and send it back — it keeps the work moving, and the vendor is waiting on a reply.",
        feedback: "Signing anything with new pricing/contract terms is a decision that exceeds a General Admin VA's authority — this is exactly the kind of thing to escalate first, not handle to save time." },
      { id: "o2", correct: true,
        text: "Escalate to the client — explain what the vendor sent and ask how they'd like to proceed.",
        feedback: "Correct. This is a contractual/financial decision, squarely outside your authority. Flag it to the client with the relevant details and let them decide how to proceed." },
      { id: "o3", correct: false,
        text: "Don't reply — a contract question isn't really an admin task, so it can wait for now.",
        feedback: "Ignoring the email doesn't protect the client — it just delays a decision they need to make, and leaves the vendor unanswered." },
    ] }],
  };
  window.PVAGALesson = { n: 3, choices: CHOICES };

  /* ---- Step 6: the two Johns (l03-john); model only after a valid attempt ---- */
  A.WrittenWork({
    container: document.getElementById("johnWork"),
    requirementId: "l03-john",
    ruleName: "l03-john",
    fields: [{ key: "text", label: "Write the message you'd send.", type: "textarea", rows: 3, placeholder: "Hi ..." }],
    revealButton: document.getElementById("johnRevealBtn"),
    revealPanel: document.getElementById("johnModel"),
  });

  /* ---- Step 7: escalate, or handle it? (l03-escalate) ---- */
  A.ChoiceActivity({ container: document.getElementById("escalateActivity"), requirementId: "l03-escalate", items: CHOICES["l03-escalate"] });

  /* ---- Step 8: Client Communication Pack (l03-ws) ---- */
  const MESSAGES = [
    { key: "clarify", label: "1. Clarification request", placeholder: "what you understand + what's unclear + the specific question" },
    { key: "progress", label: "2. Progress update", placeholder: "Context + Status + Action + Next step" },
    { key: "completion", label: "3. Completion update", placeholder: "What was completed, what matters, anything pending" },
    { key: "delay", label: "4. Delay notice", placeholder: "the issue + likely impact + a practical option" },
    { key: "error", label: "5. Error report", placeholder: "what happened → what you did → what remains → what you recommend" },
  ];
  const packEl = document.getElementById("packWork");
  const work = A.WrittenWork({
    container: packEl,
    requirementId: "l03-ws",
    ruleName: "l03-ws",
    fields: MESSAGES.map((m) => ({ key: m.key, label: m.label, type: "textarea", rows: 3, placeholder: m.placeholder })),
    reviewNote: "Before you save it, review your completed Communication Pack: read each message as the client would. Is it clear what happened and what happens next?",
  });
  const rows = () => MESSAGES.map((m) => ({ message: m.label.replace(/^\d\.\s*/, ""), text: work.inputs[m.key].value }));
  const PREVIEW = [{ key: "message", label: "Message" }, { key: "text", label: "Text" }];
  A.livePreview(document.getElementById("exportPreview"), { columns: PREVIEW, getRows: rows, label: "Communication pack preview", watch: [packEl] });

  document.getElementById("printBtn").addEventListener("click", () => {
    A.printWorkSample({
      title: "Client Communication Pack",
      subtitle: "Lesson 3 · Professional Communication & Client Updates",
      sections: rows().map((r) => ({ heading: r.message, text: r.text })),
    });
  });

  A.Stepper({ lesson: 3, gates: { 6: "l03-john", 7: "l03-escalate", 8: "l03-ws" } });
})();
