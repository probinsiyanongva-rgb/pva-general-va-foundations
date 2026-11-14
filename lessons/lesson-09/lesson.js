/* ==========================================================================
   Lesson 9 — SOPs, Checklists & Definition of Done   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l09-gap        step 3  identify     per-element feedback; Purpose and Steps
                                         accepted either way (U-01, approved A4)
     l09-practice   step 4  written      8 SOP parts, rule "l09-practice"; model after it passes
     l09-exception  step 5  scenario     "The SOP doesn't cover this"
     l09-follow     step 6  scenario     NEW check 5 (approved as written 2026-11-11)
     l09-ws         step 7  work sample  Administrative SOP, rule "l09-ws"
   Scenario: correct answer and feedback unchanged; wrong options reworded so the
   correct answer is not the longest (audit M-01).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 9 });

  const SOP_FIELDS = ["Purpose", "Trigger", "Inputs", "Tools/access", "Steps", "Exceptions", "Escalation", "Definition of done"];

  const CHOICES = {
    "l09-exception": [{ options: [
      { id: "o1", correct: false,
        text: "Send the standard reminder anyway, since the SOP says to send one for every overdue invoice.",
        feedback: "The SOP is a guide, not a substitute for judgment — sending an automatic reminder to a client who says they've already paid could make a delicate situation worse." },
      { id: "o2", correct: true,
        text: "Pause, flag this specific case to the client, and note it as a gap in the SOP for later.",
        feedback: "Correct. Pause on this one case, flag it to the client, and note the gap so the SOP can be updated — that's exactly what \"identify missing steps and exceptions\" means in practice." },
      { id: "o3", correct: false,
        text: "Skip this invoice quietly and move on to the next one, so the rest of the run isn't delayed.",
        feedback: "Silently skipping the invoice without telling anyone leaves the client unaware there's an issue — flagging it is what turns a gap into something the process can improve from." },
    ] }],
    "l09-follow": [{
      hint: "Find where you are in the SOP's numbered steps. What comes next, and does anything here make these invoices an exception?",
      options: [
        { id: "f1", correct: false,
          text: "Write a friendlier reminder for the three clients yourself, because the approved template sounds too formal to you.",
          feedback: "The SOP says to use the approved reminder. Suggest a template change to the client separately." },
        { id: "f2", correct: true,
          text: "Update the tracker status for each of the three invoices, then send the approved reminder email to those clients.",
          feedback: "Correct. Steps 3 and 4, in order, with the approved template." },
        { id: "f3", correct: false,
          text: "Send the reminders right away and update the tracker on Monday, so the clients hear from you before the weekend.",
          feedback: "Skipping step 3 leaves the tracker wrong over the weekend. The Definition of done requires it updated today." },
        { id: "f4", correct: false,
          text: "Save the tracker in Drive now and hold the reminders until next Friday, so you can check the invoices once more.",
          feedback: "Overdue invoices that aren't exceptions get a reminder this week. Holding them breaks the SOP." },
      ],
    }],
  };
  window.PVAGALesson = { n: 9, choices: CHOICES };

  /* ---- Step 3: spot what's missing (l09-gap) ---- */
  const GAP = {
    "Purpose": ["either", "Arguable either way. The instruction implies why it exists (keeping overdue invoices followed up) but never says so — ticked or not, this is accepted."],
    "Trigger": [false, "\"Every Friday\" says when the process starts, so the trigger is reasonably clear."],
    "Inputs": [true, "It doesn't say which invoice list or which tracker to start from."],
    "Tools/access": [true, "It doesn't name the system, the tracker or the Drive folder, or what access you need."],
    "Steps": ["either", "Arguable either way. There is a rough order (check, update, email, save) but no detail on how to do each step — ticked or not, this is accepted."],
    "Exceptions": [true, "Nothing says what to do with a disputed invoice or a client on a payment plan."],
    "Escalation": [true, "Nothing says when the client should be involved."],
    "Definition of done": [true, "Nothing says what \"finished\" looks like."],
  };
  A.IdentifyActivity({
    container: document.getElementById("gapActivity"),
    requirementId: "l09-gap",
    prompt: "Tick each element the instruction leaves vague or undefined.",
    keepOrder: true,
    explainAll: true,
    options: SOP_FIELDS.map((f, i) => ({ id: `g${i + 1}`, text: f, correct: GAP[f][0], note: GAP[f][1] })),
  });

  /* ---- Step 4: write a stronger SOP (l09-practice); model only after it passes ---- */
  const sopFields = () => SOP_FIELDS.map((f) => ({ key: f, label: f, type: "textarea", rows: 2 }));
  A.WrittenWork({
    container: document.getElementById("sopPracticeFields"),
    requirementId: "l09-practice",
    ruleName: "l09-practice",
    fields: sopFields(),
    collect: (inputs) => ({ fields: Object.fromEntries(SOP_FIELDS.map((f) => [f, inputs[f].value])) }),
    revealButton: document.getElementById("sopRevealBtn"),
    revealPanel: document.getElementById("sopModel"),
  });

  /* ---- Step 5: the SOP doesn't cover this (l09-exception) ---- */
  A.ChoiceActivity({ container: document.getElementById("exceptionActivity"), requirementId: "l09-exception", items: CHOICES["l09-exception"] });

  /* ---- Step 6: follow the SOP (l09-follow, new check 5) ---- */
  A.ChoiceActivity({ container: document.getElementById("followActivity"), requirementId: "l09-follow", items: CHOICES["l09-follow"] });

  /* ---- Step 7: Administrative SOP (l09-ws) ---- */
  const finalEl = document.getElementById("sopFinalFields");
  const work = A.WrittenWork({
    container: finalEl,
    requirementId: "l09-ws",
    ruleName: "l09-ws",
    fields: sopFields(),
    collect: (inputs) => ({ fields: Object.fromEntries(SOP_FIELDS.map((f) => [f, inputs[f].value])) }),
    reviewNote: "Before you save it, review your completed SOP: could someone who has never done this task follow it, handle the exceptions, and know when it's done?",
  });
  const rows = () => SOP_FIELDS.map((f) => ({ part: f, text: work.inputs[f].value }));
  A.livePreview(document.getElementById("exportPreview"), { columns: [{ key: "part", label: "SOP part" }, { key: "text", label: "Your SOP" }], getRows: rows, label: "SOP preview", watch: [finalEl] });

  document.getElementById("printBtn").addEventListener("click", () => {
    A.printWorkSample({
      title: "Administrative SOP",
      subtitle: "Lesson 9 · SOPs, Checklists & Definition of Done",
      sections: rows().map((r) => ({ heading: r.part, text: r.text })),
    });
  });

  A.Stepper({ lesson: 9, gates: { 3: "l09-gap", 4: "l09-practice", 5: "l09-exception", 6: "l09-follow", 7: "l09-ws" } });
})();
