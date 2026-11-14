/* ==========================================================================
   Lesson 8 — Internet Research & Information Management   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l08-sources   step 5  sort         6/6
     l08-compare   step 6  table        rule "l08-compare" (price or "not published", source, date)
     l08-conflict  step 7  scenario     "Conflicting prices"
     l08-fact      step 8  triage       NEW check 4 (wording approved 2026-11-11)
     l08-ws        step 9  work sample  Client Research Brief, rule "l08-ws"
   Step 6 no longer invites estimates; it adds "Date checked" (audit M-07).
   Scenario: correct answer and feedback unchanged; wrong options reworded so the
   correct answer is not the longest (audit M-01).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 8 });

  const CHOICES = {
    "l08-conflict": [{ options: [
      { id: "o1", correct: false,
        text: "Report $10/user/month as a reasonable average of the two prices, since both sources look credible.",
        feedback: "Averaging two prices from different dates produces a number that isn't real — pricing pages change, and the older figure is likely just outdated." },
      { id: "o2", correct: true,
        text: "Check the vendor's own pricing page directly and report that, noting the date you checked.",
        feedback: "Correct. The vendor's own current pricing page is the primary source and most likely to be accurate right now — note the date you checked it." },
      { id: "o3", correct: false,
        text: "Report the older $8 figure, since it was the first price you found and it's the lower of the two.",
        feedback: "The two-year-old figure is very likely stale — pricing changes, and reporting it without checking currency risks giving the client wrong information." },
    ] }],
  };
  window.PVAGALesson = { n: 8, choices: CHOICES };

  /* ---- Step 5: judge the sources (l08-sources) ---- */
  A.SortActivity({
    container: document.getElementById("sourcesActivity"),
    requirementId: "l08-sources",
    bins: [{ id: "primary", label: "Primary source" }, { id: "secondary", label: "Reputable secondary" }, { id: "caution", label: "Treat with caution" }],
    items: [
      { id: "s1", text: "The software vendor's own official pricing page", bin: "primary" },
      { id: "s2", text: "The vendor's official product documentation", bin: "primary" },
      { id: "s3", text: "A well-known tech review site's comparison, published this month", bin: "secondary" },
      { id: "s4", text: "A reputable industry publication's roundup, checked for date", bin: "secondary" },
      { id: "s5", text: "An anonymous forum comment with no sources given", bin: "caution" },
      { id: "s6", text: "A 5-year-old blog post about pricing", bin: "caution" },
    ],
  });

  /* ---- Step 6: compare the options (l08-compare) ---- */
  const cmpEl = document.getElementById("researchRows");
  const CMP = [
    { key: "tool", label: "Tool", type: "text" },
    { key: "price", label: "Price checked", type: "text", placeholder: "As published, or \"not published\"" },
    { key: "features", label: "Key features", type: "textarea" },
    { key: "pros", label: "Pros", type: "textarea" },
    { key: "cons", label: "Cons", type: "textarea" },
    { key: "source", label: "Source", type: "text", placeholder: "Link or publisher, e.g. vendor pricing page" },
    { key: "checked", label: "Date checked", type: "text", placeholder: "e.g. 11 Nov 2026" },
  ];
  const cmp = A.RowTable({ container: cmpEl, idPrefix: "l08-compare", rowNoun: "Tool", addLabel: "+ Add another tool", columns: CMP, startRows: 3 });
  A.WrittenWork({
    container: document.getElementById("researchCheck"),
    requirementId: "l08-compare",
    ruleName: "l08-compare",
    watch: [cmpEl],
    collect: () => ({ rows: cmp.getRows() }),
  });

  /* ---- Step 7: conflicting prices (l08-conflict) ---- */
  A.ChoiceActivity({ container: document.getElementById("conflictActivity"), requirementId: "l08-conflict", items: CHOICES["l08-conflict"] });

  /* ---- Step 8: fact, assumption, or needs checking? (l08-fact, new check 4) ---- */
  A.TriageActivity({
    container: document.getElementById("factActivity"),
    requirementId: "l08-fact",
    categories: [{ value: "fact", label: "Fact (sourced)" }, { value: "assumption", label: "Assumption" }, { value: "verify", label: "Needs verification" }],
    hint: "For each statement ask two questions. Does a source you can check actually say it? How current and direct is that source? Predictions and estimates have no source.",
    items: A.shuffle([
      { id: "f1", text: "The vendor's pricing page, checked today, lists the Team plan at $10 per user per month.", accept: ["fact"], feedback: "Primary source; record the page and today's date." },
      { id: "f2", text: "The vendor's help center says the free plan allows up to 3 projects.", accept: ["fact"], feedback: "Primary source; record the article and the date you checked it." },
      { id: "f3", text: "This tool will probably be easy for the whole team to learn.", accept: ["assumption"], feedback: "A prediction; no source states it." },
      { id: "f4", text: "Switching will save the team about 5 hours a week.", accept: ["assumption"], feedback: "Your estimate; label it as one in the brief." },
      { id: "f5", text: "A 2023 forum post says the tool has no mobile app.", accept: ["verify"], feedback: "Old, unofficial source; check the vendor's site." },
      { id: "f6", text: "A review site says it connects to Google Calendar, but doesn't link to the vendor.", accept: ["verify"], feedback: "Secondhand claim; confirm with the vendor." },
    ]),
  });

  /* ---- Step 9: Client Research Brief (l08-ws) ---- */
  const FIELDS = [
    { key: "question", label: "Client question", type: "textarea", rows: 2, placeholder: "Write it as a question, ending with ?" },
    { key: "criteria", label: "Criteria", type: "textarea", rows: 2, placeholder: "e.g. price, core features, team size fit" },
    { key: "findings", label: "Findings", type: "textarea", rows: 4 },
    { key: "caveats", label: "Important caveats", type: "textarea", rows: 2, placeholder: "e.g. prices checked on a specific date and may change" },
    { key: "sources", label: "Sources", type: "textarea", rows: 2, placeholder: "One per line, each with where it came from and the date checked" },
  ];
  const briefEl = document.getElementById("briefWork");
  const work = A.WrittenWork({
    container: briefEl,
    requirementId: "l08-ws",
    ruleName: "l08-ws",
    fields: FIELDS,
    reviewNote: "Before you save it, review your completed brief: is every price and claim traceable to a source and a date, and are your own estimates labelled as assumptions?",
  });
  const rows = () => FIELDS.map((f) => ({ part: f.label, text: work.inputs[f.key].value }));
  A.livePreview(document.getElementById("exportPreview"), { columns: [{ key: "part", label: "Section" }, { key: "text", label: "Brief" }], getRows: rows, label: "Research brief preview", watch: [briefEl] });

  document.getElementById("printBtn").addEventListener("click", () => {
    const tools = cmp.getRows().filter((r) => (r.tool || "").trim());
    A.printWorkSample({
      title: "Client Research Brief",
      subtitle: "Lesson 8 · Internet Research & Information Management",
      sections: rows().map((r) => ({ heading: r.part, text: r.text })).concat(tools.length
        ? [{ heading: "Comparison", table: { columns: CMP.map((c) => c.label), rows: tools.map((r) => CMP.map((c) => r[c.key])) } }]
        : []),
    });
  });

  A.Stepper({ lesson: 8, gates: { 5: "l08-sources", 6: "l08-compare", 7: "l08-conflict", 8: "l08-fact", 9: "l08-ws" } });
})();
