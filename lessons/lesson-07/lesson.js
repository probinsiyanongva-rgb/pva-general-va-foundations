/* ==========================================================================
   Lesson 7 — Spreadsheets, Data Cleanup & Accuracy   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l07-standard  step 5  4 single-choice items, all correct (options shuffled)
     l07-dupes     step 6  identify     exactly records 2 and 5
     l07-missing   step 7  scenario     "Missing required field"
     l07-formula   step 8  2 items      NEW check 3 (wording approved 2026-11-11)
     l07-ws        step 9  work sample  Cleaned Client Spreadsheet, rule "l07-ws"
   Correct answers and explanations unchanged from v1. Wrong options in two
   standardisation items and in the scenario were reworded so the correct answer
   is not the longest (audit M-01). The work sample gains "Quality check performed".
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 7 });

  // v1 standardisation items: one explanation per item, shown after any answer.
  const std = (prompt, bad, reason, opts) => ({
    prompt: `${prompt} ${bad}`,
    options: opts.map(([text, correct], i) => ({ id: `s${i + 1}`, text, correct, feedback: reason })),
  });
  const CHOICES = {
    "l07-standard": [
      std("Name field contains:", "maria cruz / Maria Cruz / MARIA CRUZ",
        "One agreed capitalization convention (Title Case) — pick one and apply it everywhere.",
        [["maria cruz", false], ["Maria Cruz", true], ["MARIA CRUZ", false]]),
      std("Phone field contains:", "0917-123-4567 / +639171234567",
        "Standardization means matching what the client's system expects, not just picking one that looks tidy.",
        [["Whichever format is shorter to type", false], ["The client's required format", true], ["Mixed formats, since both are technically valid", false]]),
      std("Date field contains:", "01/02/26 / 2026-02-01",
        "01/02/26 is genuinely ambiguous (Jan 2 or Feb 1?) — one unambiguous standard removes the guesswork.",
        [["01/02/26, since it's shorter and most people in the Philippines read it the same way", false],
         ["2026-02-01 (or another single agreed format), applied consistently", true],
         ["Leave both formats as they are — the context around each date makes it clear", false]]),
      std("Status field contains:", "active / Active / ACTIVE",
        "Controlled values matter for filtering and formulas — inconsistent casing can silently break both.",
        [["Whichever version the majority of rows already use, so fewer cells need to change", false],
         ["Active (or another single controlled value), applied everywhere", true],
         ["Leave as-is — sorting and filtering still mostly work with mixed capitals", false]]),
    ],
    "l07-missing": [{ options: [
      { id: "o1", correct: false,
        text: "Delete the incomplete record so the sheet looks clean and every remaining row is complete.",
        feedback: "Deleting an incomplete record could mean losing a real contact the client still needs — that's a bigger risk than leaving it flagged." },
      { id: "o2", correct: true,
        text: "Flag the record for the client's review and leave the field blank with a note.",
        feedback: "Correct. Flag it clearly (e.g. a \"Missing info\" column or note) and let the client decide — don't guess or quietly remove data." },
      { id: "o3", correct: false,
        text: "Fill in a placeholder email so no required field is left blank in the file.",
        feedback: "Inventing a placeholder email creates false data that looks real — worse than an honest blank, since nobody would know to double-check it." },
    ] }],
    "l07-formula": [
      { prompt: "Column D (rows 2 to 101) holds each contact's Status: \"Active\" or \"Inactive\". Which formula counts the Active contacts?",
        hint: "You need to count cells that meet a condition. Which formula counts rather than adds, and which condition matches the question?",
        options: [
          { id: "a1", correct: true, text: "=COUNTIF(D2:D101,\"Active\")",
            feedback: "Correct. COUNTIF counts the cells in D2:D101 that match \"Active\". It ignores capitalisation, so \"active\" and \"ACTIVE\" are counted too, but standardise the values anyway for filters and exports." },
          { id: "a2", correct: false, text: "=COUNTIF(D2:D101,\"Inactive\")",
            feedback: "This counts the Inactive contacts, the opposite of what was asked. Read the condition in the quotes." },
          { id: "a3", correct: false, text: "=SUMIF(D2:D101,\"Active\")",
            feedback: "SUMIF adds up numbers in matching rows. These cells hold text, so the result is 0." },
          { id: "a4", correct: false, text: "=COUNTA(D2:D101)",
            feedback: "This counts every non-empty cell, so Active and Inactive are counted together." },
        ] },
      { prompt: "The client wants to see only the contacts in Cebu, without losing anyone else's record. What do you do?",
        hint: "The client wants to see fewer rows, not have fewer rows. Which option changes only what is shown?",
        options: [
          { id: "b1", correct: true, text: "Turn on a filter for the City column and show only \"Cebu\".",
            feedback: "Correct. A filter hides rows without changing or deleting them." },
          { id: "b2", correct: false, text: "Sort by City, then delete every row that isn't Cebu.",
            feedback: "That deletes other contacts. Sorting reorders rows; it doesn't hide them." },
          { id: "b3", correct: false, text: "Copy the Cebu rows to a new sheet and delete the original sheet.",
            feedback: "The original data is lost. Never delete the source to make a view." },
          { id: "b4", correct: false, text: "Use Find and Replace to blank out every other city name.",
            feedback: "That damages the data for every non-Cebu contact." },
        ] },
    ],
  };
  window.PVAGALesson = { n: 7, choices: CHOICES };

  /* ---- Step 5: pick the standardized version (l07-standard) ---- */
  A.ChoiceActivity({ container: document.getElementById("stdActivity"), requirementId: "l07-standard", items: CHOICES["l07-standard"] });

  /* ---- Step 6: spot the duplicates (l07-dupes) ---- */
  const records = [
    "1. Maria Cruz — 0917-123-4567 — Active",
    "2. MARIA CRUZ — +639171234567 — ACTIVE",
    "3. Juan Dela Cruz — 0918-222-3333 — Active",
    "4. Ana Reyes — 0919-444-5555 — Active",
    "5. juan dela cruz — 0918-222-3333 — active",
    "6. Ben Santos — 0920-666-7777 — Inactive",
    "7. Liza Cruz — 0921-888-9999 — Active",
    "8. Carlo Tan — 0922-000-1111 — Active",
  ];
  const DUP_NOTES = {
    2: "Record 2 is the same person as record 1, just reformatted — it's the later duplicate.",
    5: "Record 5 is the same person as record 3, just reformatted — it's the later duplicate.",
    1: "Record 1 is the first occurrence. Tick the later entry (record 2) instead.",
    3: "Record 3 is the first occurrence. Tick the later entry (record 5) instead.",
  };
  A.IdentifyActivity({
    container: document.getElementById("dupActivity"),
    requirementId: "l07-dupes",
    prompt: "Tick each later, duplicate entry.",
    keepOrder: true,
    options: records.map((text, i) => ({
      id: `r${i + 1}`, text, correct: i + 1 === 2 || i + 1 === 5,
      note: DUP_NOTES[i + 1] || "This is a genuinely different contact.",
    })),
  });

  /* ---- Step 7: missing required field (l07-missing) ---- */
  A.ChoiceActivity({ container: document.getElementById("missingActivity"), requirementId: "l07-missing", items: CHOICES["l07-missing"] });

  /* ---- Step 8: count and filter (l07-formula, new check 3; both items required) ---- */
  A.ChoiceActivity({ container: document.getElementById("formulaActivity"), requirementId: "l07-formula", items: CHOICES["l07-formula"] });

  /* ---- Step 9: Cleaned Client Spreadsheet (l07-ws) ---- */
  const rowsEl = document.getElementById("cleanRows");
  const COLS = [
    { key: "original", label: "Original", type: "textarea" },
    { key: "cleaned", label: "Cleaned", type: "textarea" },
  ];
  const table = A.RowTable({
    container: rowsEl,
    idPrefix: "l07-ws",
    rowNoun: "Record",
    addLabel: "+ Add another record",
    columns: COLS,
    examples: [
      { original: "maria cruz, 0917-123-4567, active", cleaned: "Maria Cruz, +63 917 123 4567, Active" },
      { original: "JUAN DELA CRUZ, 0918.222.3333, ACTIVE", cleaned: "Juan Dela Cruz, +63 918 222 3333, Active" },
    ],
    startRows: 4,
  });
  const work = A.WrittenWork({
    container: document.getElementById("cleanCheck"),
    requirementId: "l07-ws",
    ruleName: "l07-ws",
    fields: [
      { key: "rules", label: "Rules you used (capitalization, date format, phone format, etc.)", type: "textarea", rows: 3,
        placeholder: "e.g. Title Case names, dates as YYYY-MM-DD, phone as +63XXXXXXXXXX", hint: "One rule per line, or separate them with commas." },
      { key: "qaCheck", label: "Quality check performed", type: "textarea", rows: 3,
        hint: "What you checked after cleaning, and how." },
    ],
    watch: [rowsEl],
    collect: (inputs) => ({ rows: table.getRows(), rules: inputs.rules.value, qaCheck: inputs.qaCheck.value }),
    reviewNote: "Before you save it, review your cleaned records against the originals: is every change explained by one of your rules, and is nothing lost?",
  });
  const checkEl = document.getElementById("cleanCheck");
  const rows = () => table.getRows().concat([
    { original: "Rules used", cleaned: work.inputs.rules.value },
    { original: "Quality check performed", cleaned: work.inputs.qaCheck.value },
  ]);
  A.livePreview(document.getElementById("exportPreview"), { columns: COLS, getRows: rows, label: "Cleaned spreadsheet preview", watch: [rowsEl, checkEl] });

  document.getElementById("printBtn").addEventListener("click", () => {
    const filled = table.getRows().filter((r) => (r.original || "").trim() || (r.cleaned || "").trim());
    A.printWorkSample({
      title: "Cleaned Client Spreadsheet",
      subtitle: "Lesson 7 · Spreadsheets, Data Cleanup & Accuracy",
      sections: [
        { heading: "Records", table: { columns: ["Original", "Cleaned"], rows: filled.map((r) => [r.original, r.cleaned]) } },
        { heading: "Rules used", text: work.inputs.rules.value },
        { heading: "Quality check performed", text: work.inputs.qaCheck.value },
      ],
    });
  });

  A.Stepper({ lesson: 7, gates: { 5: "l07-standard", 6: "l07-dupes", 7: "l07-missing", 8: "l07-formula", 9: "l07-ws" } });
})();
