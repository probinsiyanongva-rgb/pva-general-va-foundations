/* ==========================================================================
   Lesson 5 — Calendar & Appointment Management   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l05-schedule  step 6  structured schedule (spec T4), rule "l05-schedule", plus the
                           "which request can't fit?" question (correction pass, decision 3)
     l05-tz        step 7  scenario     "Whose 3 PM?"
     l05-resched   step 8  scenario     NEW check 1 (wording approved 2026-11-11)
     l05-ws        step 9  work sample  Client Calendar Plan, rule "l05-ws"
   Step 6 replaces the free-text schedule with start-time choices; the model
   schedule was corrected (audit M-05) and is shown only after the schedule passes.
   Scenario "Whose 3 PM?": correct answer and feedback unchanged; wrong options
   reworded so the correct answer is not the longest (audit M-01).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  const store = A.initPage({ lesson: 5 });

  const CHOICES = {
    "l05-tz": [{ options: [
      { id: "o1", correct: false,
        text: "Send the invite at 3 PM Manila time, since the client is in Manila.",
        feedback: "3 PM Manila time and 3 PM Berlin time are different moments — sending the invite without confirming whose 3 PM this is risks a real scheduling mistake." },
      { id: "o2", correct: true,
        text: "Confirm with the client which time zone they meant, then send the invite showing both time zones.",
        feedback: "Correct. Confirm which time zone the client meant, then build the invite with both time zones clearly visible so nobody has to guess." },
      { id: "o3", correct: false,
        text: "Pick whichever 3 PM looks more convenient for the Berlin team, and send the invite from there.",
        feedback: "Guessing which time zone is convenient for the Berlin team isn't your call to make silently — confirm with the client instead of assuming." },
    ] }],
    "l05-resched": [{
      hint: "You're allowed to move this call, but a new time only works if both people can attend. What should you check before proposing anything?",
      options: [
        { id: "r1", correct: false,
          text: "Move the call to Friday at 2:00 PM, the closest matching slot, and send both people the updated calendar invite right away.",
          feedback: "Friday at 2:00 PM may not be free for either person. Check the calendar and get agreement before you send an invite." },
        { id: "r2", correct: false,
          text: "Cancel the event and tell the client the bookkeeper can't make it, so that the client can choose a new time herself.",
          feedback: "The client gave you authority to handle this. Handing it back creates work for her, and cancelling loses the meeting." },
        { id: "r3", correct: true,
          text: "Check the client's calendar for free times, offer the bookkeeper two or three, and confirm the new time in writing.",
          feedback: "Correct. You have authority to reschedule, but only into times that are actually free. Check first, offer options, then confirm in writing and update the invite." },
        { id: "r4", correct: false,
          text: "Ask the bookkeeper to suggest a new time, then add whatever time they choose straight onto the client's calendar.",
          feedback: "Their preferred time may clash with the client's calendar or working hours. Offer times you have checked are free." },
      ],
    }],
    // Correction pass (decision 3): replaces the "focus block cannot fit" checkbox, which named the answer.
    "l05-cannotfit": [{
      prompt: "One request can't be placed today without breaking a client rule. Which one, and why?",
      hint: "Place the fixed meetings and lunch first. What is the longest free stretch left, and is any request longer than that?",
      options: [
        { id: "c1", correct: true, value: "focus",
          text: "The 2-hour focus block — with the meetings and lunch fixed, no free stretch of two hours is left between 9 and 5.",
          feedback: "Correct. Once the fixed meetings and lunch are in, the longest free stretch is 1 hour 45 minutes, so a 2-hour block can't fit. Flag it and let the client decide what moves." },
        { id: "c2", correct: false,
          text: "The prospect call — once the buffer and presentation are placed, the afternoon has no room left for a 30-minute call.",
          feedback: "There is room: 1:00–2:45 PM is free after lunch, and the call needs only 30 minutes." },
        { id: "c3", correct: false,
          text: "The 15-minute buffer — the vendor call runs until noon, so there is no gap left right before the presentation.",
          feedback: "The buffer fits from 2:45 to 3:00 PM. The vendor call ends at noon, hours before the presentation." },
        { id: "c4", correct: false,
          text: "Nothing — every request fits, as long as lunch is shortened to 30 minutes to make room for the focus time.",
          feedback: "Lunch is a client rule. Shortening it to make room is a decision for the client, not something to do on your own." },
      ],
    }],
  };
  window.PVAGALesson = { n: 5, choices: CHOICES };

  /* ---- Step 6: build the client's day (l05-schedule, spec T4) ---- */
  const times = [];
  for (let m = 9 * 60; m <= 16 * 60 + 45; m += 15) times.push(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
  const fmt = (t) => {
    const [hh, mm] = t.split(":").map(Number);
    return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
  };
  A.ScheduleActivity({
    container: document.getElementById("scheduleActivity"),
    requirementId: "l05-schedule",
    ruleName: "l05-schedule",
    formatTime: fmt,
    items: [
      { key: "team", label: "Team meeting (1 hour)" },
      { key: "vendor", label: "Vendor call (1 hour)" },
      { key: "presentation", label: "Client presentation (1 hour)" },
      { key: "buffer", label: "15-minute buffer" },
      { key: "prospect", label: "Prospect call (30 min)" },
    ],
    times,
    question: { key: "cannotFit", item: CHOICES["l05-cannotfit"][0] },
  });
  // Model schedule: only after the schedule meets every rule (audit M-02).
  const revealBtn = document.getElementById("dayRevealBtn");
  const model = document.getElementById("dayModel");
  const revealNote = A._h("p", { class: "small ga-reveal-note", id: "dayRevealNote" }, "Available once your schedule meets every rule.");
  revealBtn.after(revealNote);
  revealBtn.setAttribute("aria-describedby", "dayRevealNote");
  const syncReveal = () => {
    const ok = store.requirementStatus("l05-schedule").passed;
    revealBtn.disabled = !ok;
    revealNote.hidden = ok;
    if (!ok) model.hidden = true;
  };
  revealBtn.addEventListener("click", () => { model.hidden = !model.hidden; });
  store.on("progress", syncReveal);
  syncReveal();

  /* ---- Step 7: whose 3 PM? (l05-tz) ---- */
  A.ChoiceActivity({ container: document.getElementById("tzActivity"), requirementId: "l05-tz", items: CHOICES["l05-tz"] });

  /* ---- Step 8: reschedule a confirmed call (l05-resched, new check 1) ---- */
  A.ChoiceActivity({ container: document.getElementById("reschedActivity"), requirementId: "l05-resched", items: CHOICES["l05-resched"] });

  /* ---- Step 9: Client Calendar Plan (l05-ws) ---- */
  const rowsEl = document.getElementById("calRows");
  const COLS = [
    { key: "event", label: "Event", type: "text" },
    { key: "requested", label: "Requested time", type: "text" },
    { key: "confirmed", label: "Confirmed time", type: "text", placeholder: "e.g. 10:00 AM" },
    { key: "tz", label: "Time zone", type: "text", placeholder: "e.g. Manila (UTC+8)" },
    { key: "notes", label: "Prep/buffer & status", type: "text", placeholder: "e.g. 15-min buffer before; confirmed" },
  ];
  const table = A.RowTable({
    container: rowsEl,
    idPrefix: "l05-ws",
    rowNoun: "Event",
    addLabel: "+ Add another event",
    columns: COLS,
    examples: [
      { event: "Team meeting", requested: "10–11 AM", confirmed: "10–11 AM", tz: "Client's local time", notes: "No conflict" },
      { event: "Presentation", requested: "3–4 PM", confirmed: "3–4 PM", tz: "Client's local time", notes: "15-min buffer added before" },
    ],
    startRows: 4,
  });
  A.livePreview(document.getElementById("exportPreview"), { columns: COLS, getRows: () => table.getRows(), label: "Calendar plan preview", watch: [rowsEl] });

  A.WrittenWork({
    container: document.getElementById("calCheck"),
    requirementId: "l05-ws",
    ruleName: "l05-ws",
    watch: [rowsEl],
    collect: () => ({ rows: table.getRows() }),
    reviewNote: "Before you save it, review your completed Calendar Plan: does every confirmed time say which time zone it is in, and is prep or buffer time protected where it's needed?",
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    const filled = table.getRows().filter((r) => COLS.some((c) => r[c.key] && String(r[c.key]).trim()));
    A.printWorkSample({
      title: "Client Calendar Plan",
      subtitle: "Lesson 5 · Calendar & Appointment Management",
      sections: [{ heading: "Calendar plan", table: { columns: COLS.map((c) => c.label), rows: filled.map((r) => COLS.map((c) => r[c.key])) } }],
    });
  });

  A.Stepper({ lesson: 5, gates: { 6: "l05-schedule", 7: "l05-tz", 8: "l05-resched", 9: "l05-ws" } });
})();
