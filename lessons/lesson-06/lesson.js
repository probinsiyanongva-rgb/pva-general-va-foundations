(function () {
  const LESSON_ID = 6;
  const TOTAL_STEPS = 9;
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 6: false, 7: false, 8: false };

  function buildRail() {
    rail.innerHTML = "";
    for (let i = 1; i <= TOTAL_STEPS - 1; i++) {
      const seg = document.createElement("div");
      seg.className = "seg" + (i < current ? " done" : i === current ? " active" : "");
      rail.appendChild(seg);
    }
  }

  function show(step) {
    current = step;
    panels.forEach((p) => p.classList.toggle("active", Number(p.dataset.step) === step));
    buildRail();
    if (step >= TOTAL_STEPS) {
      stepNav.style.display = "none";
      label.textContent = "Complete";
      window.PVAFT.markLessonComplete(LESSON_ID);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    stepNav.style.display = "flex";
    label.textContent = "Step " + step + " of " + (TOTAL_STEPS - 1);
    prevBtn.style.visibility = step === 1 ? "hidden" : "visible";
    nextBtn.textContent = step === TOTAL_STEPS - 1 ? "Finish Lesson →" : "Continue →";
    updateGate();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateGate() {
    if (gatedSteps.hasOwnProperty(current)) nextBtn.disabled = !gatedSteps[current];
    else nextBtn.disabled = false;
  }

  prevBtn.addEventListener("click", () => { if (current > 1) show(current - 1); });
  nextBtn.addEventListener("click", () => { if (current < TOTAL_STEPS) show(current + 1); });

  // ---- Step 6: sort the chaotic folder ----
  const sortItems = [
    { text: "Signed vendor contract", answer: "admin" },
    { text: "Reference screenshot of a chat conversation", answer: "admin" },
    { text: "Monthly sales report", answer: "reports" },
    { text: "Draft proposal (in progress)", answer: "admin" },
    { text: "Last year's completed project file", answer: "archive" },
    { text: "Duplicate invoice (already filed once)", answer: "flag" },
    { text: "Random personal download, unrelated to work", answer: "flag" },
    { text: "Outdated price list (superseded)", answer: "archive" },
  ];
  let sortCorrectCount = 0;
  let sortSelectedChip = null;

  function initSort() {
    const pool = document.getElementById("sortPool");
    const shuffled = [...sortItems].sort(() => Math.random() - 0.5);
    shuffled.forEach((item, idx) => {
      const chip = document.createElement("div");
      chip.className = "sort-chip";
      chip.textContent = item.text;
      chip.draggable = true;
      chip.dataset.answer = item.answer;
      chip.dataset.id = "fchip-" + idx;
      chip.tabIndex = 0;
      chip.setAttribute("role", "button");
      chip.setAttribute("aria-label", item.text + " — draggable, or press Enter then choose a bin");
      chip.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", chip.dataset.id));
      chip.addEventListener("click", () => {
        if (chip.getAttribute("draggable") === "false") return;
        document.querySelectorAll(".sort-chip.tap-selected").forEach((c) => c.classList.remove("tap-selected"));
        chip.classList.add("tap-selected");
        sortSelectedChip = chip;
      });
      chip.id = chip.dataset.id;
      pool.appendChild(chip);
    });

    ["binAdmin", "binReports", "binArchive", "binFlag"].forEach((id) => {
      const bin = document.getElementById(id);
      bin.addEventListener("dragover", (e) => { e.preventDefault(); bin.classList.add("dragover"); });
      bin.addEventListener("dragleave", () => bin.classList.remove("dragover"));
      bin.addEventListener("drop", (e) => {
        e.preventDefault();
        bin.classList.remove("dragover");
        const cid = e.dataTransfer.getData("text/plain");
        const chip = document.getElementById(cid);
        if (chip) placeChip(chip, bin);
      });
      bin.addEventListener("click", () => {
        if (sortSelectedChip) { placeChip(sortSelectedChip, bin); sortSelectedChip = null; }
      });
    });
  }

  function placeChip(chip, bin) {
    if (chip.getAttribute("draggable") === "false") return;
    const correct = chip.dataset.answer === bin.dataset.bin;
    chip.classList.add(correct ? "placed-correct" : "placed-incorrect");
    chip.setAttribute("draggable", "false");
    chip.classList.remove("tap-selected");
    chip.style.cursor = "default";
    bin.querySelector(".bin-contents").appendChild(chip);
    if (correct) sortCorrectCount++;
    document.getElementById("sortScore").textContent = sortCorrectCount + " of " + sortItems.length + " placed correctly.";
    if (document.querySelectorAll(".sort-chip[draggable='false']").length === sortItems.length) {
      gatedSteps[6] = true;
      updateGate();
    }
  }
  initSort();

  // ---- Step 7: version-control scenario ----
  (function wireScenario() {
    const container = document.getElementById("scenarioOptions");
    const feedback = document.getElementById("scenarioFeedback");
    const buttons = Array.from(container.querySelectorAll(".option-btn"));
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const correct = btn.dataset.correct === "true";
        buttons.forEach((b) => (b.disabled = true));
        btn.classList.add(correct ? "selected-correct" : "selected-incorrect");
        feedback.textContent = (correct ? "✓ " : "✗ ") + btn.dataset.feedback;
        feedback.className = "feedback-box show " + (correct ? "correct" : "incorrect");
        gatedSteps[7] = true;
        updateGate();
      });
    });
  })();

  // ---- Step 8: Folder Structure + Naming Convention work sample ----
  const rowsContainer = document.getElementById("folderRows");
  const exportPreview = document.getElementById("exportPreview");

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "folder-row";
    row.innerHTML = `
      <div><div class="col-label">Folder</div><input type="text" class="f-folder" value="${esc(prefill.folder || "")}"></div>
      <div><div class="col-label">Purpose</div><input type="text" class="f-purpose" value="${esc(prefill.purpose || "")}"></div>
      <div><div class="col-label">Naming convention</div><input type="text" class="f-naming" value="${esc(prefill.naming || "")}"></div>
      <div><div class="col-label">Who needs access?</div><input type="text" class="f-access" value="${esc(prefill.access || "")}"></div>
    `;
    rowsContainer.appendChild(row);
    row.querySelectorAll("input").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".folder-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Folder</th><th>Purpose</th><th>Naming convention</th><th>Access</th></tr>';
    rows.forEach((row) => {
      const vals = [
        row.querySelector(".f-folder").value.trim(),
        row.querySelector(".f-purpose").value.trim(),
        row.querySelector(".f-naming").value.trim(),
        row.querySelector(".f-access").value.trim(),
      ];
      if (vals.some((v) => v.length > 0)) filled++;
      html += "<tr>" + vals.map((v) => `<td>${esc(v) || "—"}</td>`).join("") + "</tr>";
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[8] = filled >= 4; // encourage adding at least one beyond the 3 starters
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ folder: "01_Admin", purpose: "Routine administrative records", naming: "YYYY-MM-DD_Topic_v01", access: "Admin team" });
  addRow({ folder: "02_Reports", purpose: "Recurring reports", naming: "YYYY-MM_ReportName", access: "Client + authorized team" });
  addRow({ folder: "03_Archive", purpose: "Completed/outdated records", naming: "YYYY_Project_Document", access: "Restricted" });

  show(1);
})();
