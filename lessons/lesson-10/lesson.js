(function () {
  const LESSON_ID = 10;
  const TOTAL_STEPS = 8; // 7 content steps + completion
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 4: false, 5: false, 6: false, 7: false };

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

  // ---- Step 4: urgency/importance sort ----
  const sortItems = [
    { text: "Client's website is down right now", answer: "do_first" },
    { text: "Software subscription expires and renews tomorrow", answer: "do_first" },
    { text: "Prepare a monthly report due in three weeks", answer: "schedule" },
    { text: "Update today's task tracker with completed items", answer: "schedule" },
    { text: "Vendor marks a routine email 'ASAP' though it isn't client priority", answer: "quick" },
    { text: "Reply to a low-priority newsletter comment", answer: "later" },
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
      chip.dataset.id = "tchip-" + idx;
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

    ["binDoFirst", "binSchedule", "binQuick", "binLater"].forEach((id) => {
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
      gatedSteps[4] = true;
      updateGate();
    }
  }
  initSort();

  // ---- Step 5 & 6: scenarios ----
  function wireScenario(containerId, feedbackId, gateStep) {
    const container = document.getElementById(containerId);
    const feedback = document.getElementById(feedbackId);
    const buttons = Array.from(container.querySelectorAll(".option-btn"));
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const correct = btn.dataset.correct === "true";
        buttons.forEach((b) => (b.disabled = true));
        btn.classList.add(correct ? "selected-correct" : "selected-incorrect");
        feedback.textContent = (correct ? "✓ " : "✗ ") + btn.dataset.feedback;
        feedback.className = "feedback-box show " + (correct ? "correct" : "incorrect");
        gatedSteps[gateStep] = true;
        updateGate();
      });
    });
  }
  wireScenario("scenarioOptions", "scenarioFeedback", 5);
  wireScenario("conflictOptions", "conflictFeedback", 6);

  // ---- Step 7: work sample ----
  const rowsContainer = document.getElementById("trackerRows");
  const exportPreview = document.getElementById("exportPreview");
  const COLS = ["task", "priority", "due", "dependency", "status", "next", "followup"];
  const COL_LABELS = ["Task", "Priority", "Due", "Dependency", "Status", "Next action", "Follow-up"];

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "tracker-row";
    row.innerHTML = COLS.map((c, i) => `
      <div>
        <div class="col-label">${COL_LABELS[i]}</div>
        <input type="text" class="f-${c}" value="${esc(prefill[c] || "")}">
      </div>
    `).join("");
    rowsContainer.appendChild(row);
    row.querySelectorAll("input").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".tracker-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr>' + COL_LABELS.map((l) => `<th>${l}</th>`).join("") + "</tr>";
    rows.forEach((row) => {
      const vals = COLS.map((c) => row.querySelector(".f-" + c).value.trim());
      if (vals.some((v) => v.length > 0)) filled++;
      html += "<tr>" + vals.map((v) => `<td>${esc(v) || "—"}</td>`).join("") + "</tr>";
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[7] = filled >= 3;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ task: "Reply to vendor 'urgent' email", priority: "Low", due: "Today", dependency: "—", status: "Not started", next: "Send brief acknowledgment", followup: "Tomorrow" });
  addRow({ task: "Finish monthly report", priority: "High", due: "Today, noon", dependency: "—", status: "In progress", next: "Finalize numbers section", followup: "—" });

  show(1);
})();
