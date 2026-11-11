(function () {
  const LESSON_ID = 1;
  const TOTAL_STEPS = 9; // includes completion screen
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  // Gate: some steps require an interaction before "Continue" is enabled
  const gatedSteps = { 4: false, 6: false, 7: false, 8: false };

  function buildRail() {
    rail.innerHTML = "";
    for (let i = 1; i <= TOTAL_STEPS - 1; i++) { // exclude completion screen from the rail
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
    if (gatedSteps.hasOwnProperty(current)) {
      nextBtn.disabled = !gatedSteps[current];
    } else {
      nextBtn.disabled = false;
    }
  }

  prevBtn.addEventListener("click", () => { if (current > 1) show(current - 1); });
  nextBtn.addEventListener("click", () => { if (current < TOTAL_STEPS) show(current + 1); });

  // ---- Scenario helper (used by step 4 and step 7) ----
  function wireScenario(containerId, feedbackId, gateStep) {
    const container = document.getElementById(containerId);
    const feedback = document.getElementById(feedbackId);
    if (!container) return;
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
  wireScenario("scenarioOptions", "scenarioFeedback", 4);
  wireScenario("branchOptions", "branchFeedback", 7);

  // ---- Sorting activity (step 6) ----
  const sortItems = [
    { text: "Schedule a meeting", answer: "task" },
    { text: "Attention to detail", answer: "skill" },
    { text: "Clean a spreadsheet", answer: "task" },
    { text: "Professional communication", answer: "skill" },
    { text: "Organize a Google Drive folder", answer: "task" },
    { text: "Research five software options", answer: "task" },
    { text: "Time management", answer: "skill" },
    { text: "Draft a client update", answer: "task" },
  ];
  let sortCorrectCount = 0;
  let sortSelectedChip = null;

  function initSort() {
    const pool = document.getElementById("sortPool");
    // simple shuffle
    const shuffled = [...sortItems].sort(() => Math.random() - 0.5);
    shuffled.forEach((item, idx) => {
      const chip = document.createElement("div");
      chip.className = "sort-chip";
      chip.textContent = item.text;
      chip.draggable = true;
      chip.dataset.answer = item.answer;
      chip.dataset.id = "chip-" + idx;
      chip.tabIndex = 0;
      chip.setAttribute("role", "button");
      chip.setAttribute("aria-label", item.text + " — draggable, or press Enter then choose a bin");

      chip.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", chip.dataset.id);
      });
      chip.addEventListener("click", () => {
        // tap-to-select fallback for touch/keyboard
        if (chip.getAttribute("draggable") === "false") return;
        document.querySelectorAll(".sort-chip.tap-selected").forEach((c) => c.classList.remove("tap-selected"));
        chip.classList.add("tap-selected");
        sortSelectedChip = chip;
      });
      chip.id = chip.dataset.id;
      pool.appendChild(chip);
    });

    [document.getElementById("binTask"), document.getElementById("binSkill")].forEach((bin) => {
      bin.addEventListener("dragover", (e) => { e.preventDefault(); bin.classList.add("dragover"); });
      bin.addEventListener("dragleave", () => bin.classList.remove("dragover"));
      bin.addEventListener("drop", (e) => {
        e.preventDefault();
        bin.classList.remove("dragover");
        const id = e.dataTransfer.getData("text/plain");
        const chip = document.getElementById(id);
        if (chip) placeChip(chip, bin);
      });
      bin.addEventListener("click", () => {
        if (sortSelectedChip) {
          placeChip(sortSelectedChip, bin);
          sortSelectedChip = null;
        }
      });
    });
  }

  function placeChip(chip, bin) {
    if (chip.getAttribute("draggable") === "false") return; // already placed
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

  // ---- Work sample: General Admin Task Map ----
  const rowsContainer = document.getElementById("taskMapRows");
  const exportPreview = document.getElementById("exportPreview");
  let rowCount = 0;

  const starterAreas = ["Communication", "Scheduling", "Information"];

  function addRow(prefill) {
    rowCount++;
    const row = document.createElement("div");
    row.className = "task-map-row";
    row.innerHTML = `
      <div>
        <div class="col-label">Administrative area</div>
        <input type="text" class="area-input" value="${prefill || ""}" placeholder="e.g. Communication">
      </div>
      <div>
        <div class="col-label">Tasks you understand</div>
        <textarea class="tasks-input" rows="2" placeholder="e.g. Sorting incoming email, sending confirmations"></textarea>
      </div>
      <div>
        <div class="col-label">Skills needed to do them well</div>
        <textarea class="skills-input" rows="2" placeholder="e.g. Clarity, tone, prioritizing"></textarea>
      </div>
    `;
    rowsContainer.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".task-map-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Area</th><th>Tasks</th><th>Skills</th></tr>';
    rows.forEach((row) => {
      const area = row.querySelector(".area-input").value.trim();
      const tasks = row.querySelector(".tasks-input").value.trim();
      const skills = row.querySelector(".skills-input").value.trim();
      if (area || tasks || skills) filled++;
      html += `<tr><td>${escapeHtml(area) || "—"}</td><td>${escapeHtml(tasks) || "—"}</td><td>${escapeHtml(skills) || "—"}</td></tr>`;
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[8] = filled >= 2; // require at least 2 meaningfully filled rows
    updateGate();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow(""));
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  starterAreas.forEach((a) => addRow(a));

  show(1);
})();
