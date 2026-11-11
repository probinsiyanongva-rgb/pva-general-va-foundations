/* ==========================================================================
   Lesson 6 — Digital Organization: Files & Documents   (v2.0, WP3b)
   --------------------------------------------------------------------------
   Lesson data + wiring only; behaviour comes from shared/ga/activities.js.
     l06-sort     step 6  sort         8/8 (two items reworded per U-02, approved A4)
     l06-version  step 7  scenario     "Which file is actually final?"
     l06-access   step 8  scenario     NEW check 2 (wording approved 2026-11-11)
     l06-ws       step 9  work sample  Folder Structure + Naming Convention, rule "l06-ws"
   Scenario: correct answer and feedback unchanged; wrong options reworded so the
   correct answer is not the longest (audit M-01). The work sample gains a
   "Version rule" field (lesson objective: version control).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.PVAGAActivities;
  A.initPage({ lesson: 6 });

  const CHOICES = {
    "l06-version": [{ options: [
      { id: "o1", correct: false,
        text: "Use proposal-final.docx, since it says \"final\" in the name and was clearly marked as the finished one.",
        feedback: "\"Final\" in a filename isn't reliable evidence on its own — with four candidates, guessing risks using the wrong version." },
      { id: "o2", correct: true,
        text: "Confirm with the client or teammate which version is current, then rename it clearly and archive the others.",
        feedback: "Correct. Confirm which one is truly current, then rename it following a clear convention (e.g. 2026-08-30_ClientName_Proposal_v03) and archive or remove the rest so this never happens again." },
      { id: "o3", correct: false,
        text: "Delete the three older-looking files right away to reduce clutter, so only the newest-looking version remains.",
        feedback: "Deleting files you haven't confirmed are safe to remove is risky — you could lose real work. Confirm first, then clean up." },
    ] }],
    "l06-access": [{
      hint: "Think about the least access Rina needs: which folder, whether she will change anything, and how her access could be removed later.",
      options: [
        { id: "a1", correct: false,
          text: "Turn on \"Anyone with the link can edit\" for 02_Reports and send Rina the link, since that is the quickest setup.",
          feedback: "Anyone who gets the link could change or delete reports. Rina needs view access, for her account only." },
        { id: "a2", correct: true,
          text: "Share only the 02_Reports folder with Rina's own email address as Viewer, and record the date in the access log.",
          feedback: "Correct. Least access: only the folder she needs, only view rights, tied to her identity, and recorded so it can be removed later." },
        { id: "a3", correct: false,
          text: "Share the client's whole Drive with Rina as Editor, so she won't have to ask again when she needs other files.",
          feedback: "That's far broader than the task. Grant more access only when a new need is confirmed." },
        { id: "a4", correct: false,
          text: "Send Rina the client's own Google login so she can open the folder herself without anyone setting up a new share.",
          feedback: "Never share a client's credentials. Each person gets their own access." },
      ],
    }],
  };
  window.PVAGALesson = { n: 6, choices: CHOICES };

  /* ---- Step 6: sort a chaotic folder (l06-sort) ---- */
  A.SortActivity({
    container: document.getElementById("sortActivity"),
    requirementId: "l06-sort",
    bins: [
      { id: "admin", label: "01_Admin" },
      { id: "reports", label: "02_Reports" },
      { id: "archive", label: "03_Archive" },
      { id: "flag", label: "🚩 Flag / Don't File" },
    ],
    items: [
      { id: "f1", text: "Signed vendor contract", bin: "admin" },
      { id: "f2", text: "Chat screenshot showing a customer's phone number", bin: "flag" },
      { id: "f3", text: "Monthly sales report", bin: "reports" },
      { id: "f4", text: "Final signed proposal", bin: "admin" },
      { id: "f5", text: "Last year's completed project file", bin: "archive" },
      { id: "f6", text: "Duplicate invoice (already filed once)", bin: "flag" },
      { id: "f7", text: "Random personal download, unrelated to work", bin: "flag" },
      { id: "f8", text: "Outdated price list (superseded)", bin: "archive" },
    ],
  });

  /* ---- Step 7: which file is final? (l06-version) ---- */
  A.ChoiceActivity({ container: document.getElementById("versionActivity"), requirementId: "l06-version", items: CHOICES["l06-version"] });

  /* ---- Step 8: give the right access (l06-access, new check 2) ---- */
  A.ChoiceActivity({ container: document.getElementById("accessActivity"), requirementId: "l06-access", items: CHOICES["l06-access"] });

  /* ---- Step 9: Folder Structure + Naming Convention (l06-ws) ---- */
  const rowsEl = document.getElementById("folderRows");
  const COLS = [
    { key: "folder", label: "Folder", type: "text", placeholder: "e.g. 04_Contracts" },
    { key: "purpose", label: "Purpose", type: "text" },
    { key: "naming", label: "Naming convention", type: "text", placeholder: "Include a date or version, e.g. YYYY-MM-DD_Topic_v01" },
    { key: "access", label: "Who needs access?", type: "text" },
  ];
  const table = A.RowTable({
    container: rowsEl,
    idPrefix: "l06-ws",
    rowNoun: "Folder",
    addLabel: "+ Add another folder",
    columns: COLS,
    examples: [
      { folder: "01_Admin", purpose: "Routine administrative records", naming: "YYYY-MM-DD_Topic_v01", access: "Admin team" },
      { folder: "02_Reports", purpose: "Recurring reports", naming: "YYYY-MM_ReportName", access: "Client + authorized team" },
      { folder: "03_Archive", purpose: "Completed/outdated records", naming: "YYYY_Project_Document", access: "Restricted" },
    ],
    startRows: 2,
  });
  const work = A.WrittenWork({
    container: document.getElementById("folderCheck"),
    requirementId: "l06-ws",
    ruleName: "l06-ws",
    fields: [{ key: "versionRule", label: "Version rule", type: "textarea", rows: 3,
      hint: "How drafts are numbered, how the approved file is marked, and where old versions go.",
      placeholder: "e.g. Drafts are saved as _v01, _v02 …" }],
    watch: [rowsEl],
    collect: (inputs) => ({ rows: table.getRows(), versionRule: inputs.versionRule.value }),
    reviewNote: "Before you save it, review your completed folder structure: could a new teammate find any file, and tell which version is current, without asking you?",
  });
  const PREVIEW = [{ key: "folder", label: "Folder" }, { key: "purpose", label: "Purpose" }, { key: "naming", label: "Naming convention" }, { key: "access", label: "Access" }];
  const folderEl = document.getElementById("folderCheck");
  const preview = A.livePreview(document.getElementById("exportPreview"), { columns: PREVIEW, getRows: () => table.getRows(), label: "Folder structure preview", watch: [rowsEl] });
  const ruleLine = A._h("p", { class: "small" });
  document.getElementById("exportPreview").after(ruleLine);
  const drawRule = () => { ruleLine.textContent = `Version rule: ${work.inputs.versionRule.value.trim() || "—"}`; };
  folderEl.addEventListener("input", drawRule);
  drawRule();
  preview.refresh();

  document.getElementById("printBtn").addEventListener("click", () => {
    const filled = table.getRows().filter((r) => PREVIEW.some((c) => r[c.key] && String(r[c.key]).trim()));
    A.printWorkSample({
      title: "Folder Structure + Naming Convention",
      subtitle: "Lesson 6 · Digital Organization: Files & Documents",
      sections: [
        { heading: "Folders", table: { columns: PREVIEW.map((c) => c.label), rows: filled.map((r) => PREVIEW.map((c) => r[c.key])) } },
        { heading: "Version rule", text: work.inputs.versionRule.value },
      ],
    });
  });

  A.Stepper({ lesson: 6, gates: { 6: "l06-sort", 7: "l06-version", 8: "l06-access", 9: "l06-ws" } });
})();
