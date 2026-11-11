/* ==========================================================================
   Lesson 12 — Privacy, Security & Client Access   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l12-situations  step 4  3 single-choice items, all correct
     l12-network     step 5  scenario     "Working from a co-working space"
     l12-personal    step 6  identify     NEW check 8 (approved with addition 2026-11-11)
     l12-ws          step 7  work sample  VA Security Checklist, rule "l12-ws"
   Correct answers and explanations unchanged from v1; wrong options reworded where
   the correct answer was the longest (audit M-01).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 12 });

  const situation = (prompt, reason, opts) => ({
    prompt,
    options: opts.map(([text, correct], i) => ({ id: `o${i + 1}`, text, correct, feedback: reason })),
  });
  const CHOICES = {
    "l12-situations": [
      situation("A client asks you to use their personal password even though delegated access is available.",
        "Use delegated access if available and authorized — it avoids sharing a master password unnecessarily.",
        [["Use the personal password since it's simpler.", false],
         ["Use delegated access, since it's available and authorized.", true],
         ["Set up your own separate account without telling the client.", false]]),
      situation("You receive a spreadsheet containing customer personal information and need to copy some of it into another system.",
        "Confirm the business need, approved destination, access controls, and handling rules before moving personal information anywhere.",
        [["Copy everything into the new system right away to save time, then tidy up the extra columns afterwards.", false],
         ["Confirm the business need, approved destination, access controls, and handling rules first.", true],
         ["Ask a coworker informally how they usually handle it, without involving the client.", false]]),
      situation("You accidentally send a confidential attachment to the wrong recipient.",
        "Report the incident promptly; don't hide it. Delay only makes the situation harder to contain.",
        [["Say nothing and hope it goes unnoticed, since the recipient will probably just delete it.", false],
         ["Report the incident promptly according to the client's security/incident process.", true],
         ["Wait to see if the wrong recipient replies before doing anything about it.", false]]),
    ],
    "l12-network": [{ options: [
      { id: "o1", correct: false,
        text: "Log in anyway — it's just a quick check, and you'll be done before anyone on the network notices.",
        feedback: "Sensitive systems like banking portals deserve a trusted connection — public wifi carries real risk, even for a \"quick\" check." },
      { id: "o2", correct: true,
        text: "Wait until you're on a secured connection, or use a VPN if the client's policy allows one.",
        feedback: "Correct. Wait for a secured connection (or a client-approved VPN) before accessing sensitive systems — a few minutes' delay is a small cost next to the risk." },
      { id: "o3", correct: false,
        text: "Log in, but close the tab and clear the browser history as soon as you've finished checking.",
        feedback: "Speed doesn't protect data on an open network — the risk exists the moment you connect, however briefly." },
    ] }],
  };
  window.PVAGALesson = { n: 12, choices: CHOICES };

  /* ---- Step 4: three quick situations (l12-situations) ---- */
  A.ChoiceActivity({ container: document.getElementById("situationsActivity"), requirementId: "l12-situations", items: CHOICES["l12-situations"] });

  /* ---- Step 5: public wifi (l12-network) ---- */
  A.ChoiceActivity({ container: document.getElementById("networkActivity"), requirementId: "l12-network", items: CHOICES["l12-network"] });

  /* ---- Step 6: spot the personal information (l12-personal, new check 8) ---- */
  A.IdentifyActivity({
    container: document.getElementById("personalActivity"),
    requirementId: "l12-personal",
    prompt: "Tick every item that is personal or confidential information.",
    hint: "Ask of each item: could it identify a specific person, or reveal something private about their money or health? Information that is the same for every customer is business information.",
    successText: "Names, contact details and home addresses identify a person. Payment details are confidential. Health information is sensitive personal information under the Philippine Data Privacy Act of 2012 and needs extra care. Office hours, published fees, service lists and internal product codes describe the business, not a person. This is general awareness, not legal advice.",
    options: [
      { id: "p1", text: "Customer name: Ana Reyes", correct: true, note: "A name identifies a specific person." },
      { id: "p2", text: "Mobile number: 0917 555 0142", correct: true, note: "Contact details identify a specific person." },
      { id: "p3", text: "Home address: 12 Mabini St., Cebu City", correct: true, note: "A home address identifies a specific person." },
      { id: "p4", text: "Payment card: Visa ending 4417", correct: true, note: "Payment details are confidential." },
      { id: "p5", text: "Technician note: \"Customer mentioned she is recovering from surgery\"", correct: true, note: "Health information is sensitive personal information and needs extra care." },
      { id: "b1", text: "Northstar office hours: Mon–Sat, 8 AM–5 PM", correct: false, note: "Office hours describe the business, not a person." },
      { id: "b2", text: "Standard call-out fee: ₱500", correct: false, note: "A published fee is the same for every customer." },
      { id: "b3", text: "Service categories: Plumbing, Electrical, Cleaning", correct: false, note: "A service list describes the business, not a person." },
      { id: "b4", text: "Product line code: PL-02", correct: false, note: "An internal product code describes the business, not a person." },
    ],
  });

  /* ---- Step 7: VA Security Checklist (l12-ws) ---- */
  const ITEMS = [
    "MFA enabled where available",
    "Access is limited to what I need",
    "I use approved tools and storage",
    "I know how confidential information should be handled",
    "I know where to report a security incident",
    "I understand the offboarding process",
  ];
  const rowsEl = document.getElementById("checklistRows");
  const yn = A.ChoiceRows({
    container: rowsEl,
    idPrefix: "l12-ws",
    items: ITEMS,
    choices: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
    notePlaceholder: "For No, what you will do about it",
  });
  const collect = () => ({ items: yn.collect() });

  A.WrittenWork({
    container: document.getElementById("checklistCheck"),
    requirementId: "l12-ws",
    ruleName: "l12-ws",
    watch: [rowsEl],
    collect,
    reviewNote: "Before you save it, review your completed checklist: is every answer honest, and does every No have a concrete next step?",
  });
  const rows = () => collect().items.map((x, i) => ({ item: ITEMS[i], answer: yn.labelOf(x.answer), note: x.note }));
  const PREVIEW = [{ key: "item", label: "Item" }, { key: "answer", label: "Yes / No" }, { key: "note", label: "Notes" }];
  A.livePreview(document.getElementById("exportPreview"), { columns: PREVIEW, getRows: rows, label: "Security checklist preview", watch: [rowsEl] });

  document.getElementById("printBtn").addEventListener("click", () => {
    A.printWorkSample({
      title: "VA Security Checklist",
      subtitle: "Lesson 12 · Privacy, Security & Client Access",
      sections: [{ heading: "Checklist", table: { columns: PREVIEW.map((c) => c.label), rows: rows().map((r) => [r.item, r.answer, r.note]) } }],
    });
  });

  A.Stepper({ lesson: 12, gates: { 4: "l12-situations", 5: "l12-network", 6: "l12-personal", 7: "l12-ws" } });
})();
