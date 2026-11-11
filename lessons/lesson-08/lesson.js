(function () {
  const LESSON_ID = 8;
  const TOTAL_STEPS = 9;
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 5: false, 6: false, 7: false, 8: false };

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

  // ---- Step 5: sort sources by quality ----
  const sortItems = [
    { text: "The software vendor's own official pricing page", answer: "primary" },
    { text: "The vendor's official product documentation", answer: "primary" },
    { text: "A well-known tech review site's comparison, published this month", answer: "secondary" },
    { text: "A reputable industry publication's roundup, checked for date", answer: "secondary" },
    { text: "An anonymous forum comment with no sources given", answer: "caution" },
    { text: "A 5-year-old blog post about pricing", answer: "caution" },
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
      chip.dataset.id = "schip-" + idx;
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

    ["binPrimary", "binSecondary", "binCaution"].forEach((id) => {
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
      gatedSteps[5] = true;
      updateGate();
    }
  }
  initSort();

  // ---- Step 6: comparison table ----
  const researchRows = document.getElementById("researchRows");

  function addResearchRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "research-row";
    row.innerHTML = `
      <div><div class="col-label">Tool</div><input type="text" class="r-tool" value="${esc(prefill.tool || "")}"></div>
      <div><div class="col-label">Price checked</div><input type="text" class="r-price" value="${esc(prefill.price || "")}"></div>
      <div><div class="col-label">Key features</div><textarea class="r-features" rows="2">${esc(prefill.features || "")}</textarea></div>
      <div><div class="col-label">Pros</div><textarea class="r-pros" rows="2"></textarea></div>
      <div><div class="col-label">Cons</div><textarea class="r-cons" rows="2"></textarea></div>
      <div><div class="col-label">Source</div><input type="text" class="r-source" value="${esc(prefill.source || "")}"></div>
    `;
    researchRows.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", checkResearchGate));
    checkResearchGate();
  }

  function checkResearchGate() {
    const rows = Array.from(researchRows.querySelectorAll(".research-row"));
    let filled = 0;
    rows.forEach((row) => {
      const tool = row.querySelector(".r-tool").value.trim();
      if (tool.length > 0) filled++;
    });
    gatedSteps[6] = filled >= 2;
    updateGate();
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addResearchRow());
  addResearchRow({ tool: "" });
  addResearchRow({ tool: "" });
  addResearchRow({ tool: "" });

  // ---- Step 7: decision scenario ----
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

  // ---- Step 8: Client Research Brief ----
  const briefInputs = Array.from(document.querySelectorAll(".brief-input"));
  const exportPreview = document.getElementById("exportPreview");
  const briefLabels = { question: "Client question", criteria: "Criteria", findings: "Findings", caveats: "Important caveats", sources: "Sources" };

  function updateBriefExport() {
    let filled = 0;
    let html = "";
    briefInputs.forEach((input) => {
      const val = input.value.trim();
      if (val.length > 0) filled++;
      html += `<div style="margin-bottom:12px;"><strong>${briefLabels[input.dataset.key]}:</strong><br>${esc(val) || "<span class='small'>Not written yet.</span>"}</div>`;
    });
    exportPreview.innerHTML = html;
    gatedSteps[8] = filled >= 3;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  briefInputs.forEach((input) => input.addEventListener("input", updateBriefExport));
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  updateBriefExport();

  show(1);
})();
