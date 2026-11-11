(function () {
  const LESSON_ID = 6;
  const TOTAL_STEPS = 7; // 6 content steps + completion
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 4: false, 5: false, 6: false };

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
      window.PVACS.markLessonComplete(LESSON_ID);
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

  // ---- Step 4: fact vs assumption sort ----
  const sortItems = [
    { text: "Tracking shows delivered at 2:14 PM", answer: "fact" },
    { text: "The customer must not have checked their porch", answer: "assumption" },
    { text: "The account shows 2 prior contacts about this order", answer: "fact" },
    { text: "The customer is probably lying about not receiving it", answer: "assumption" },
    { text: "Refund policy allows 30 days from delivery", answer: "fact" },
    { text: "This customer just wants free stuff", answer: "assumption" },
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
      chip.dataset.id = "fachip-" + idx;
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

    [document.getElementById("binFact"), document.getElementById("binAssumption")].forEach((bin) => {
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

  // ---- Step 5: conflicting-info scenario ----
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
        gatedSteps[5] = true;
        updateGate();
      });
    });
  })();

  // ---- Step 6: Case Investigation Brief work sample ----
  const fields = ["briefFacts", "briefUnknowns", "briefPolicy", "briefAction", "briefEscalation"];
  const fieldLabels = { briefFacts: "Facts", briefUnknowns: "Unknowns", briefPolicy: "Applicable policy", briefAction: "Recommended action", briefEscalation: "Escalation need" };
  const exportPreview = document.getElementById("exportPreview");

  function updateExport() {
    let filled = 0;
    let html = "";
    fields.forEach((id) => {
      const val = document.getElementById(id).value.trim();
      if (val.length > 0) filled++;
      html += `<div style="margin-bottom:12px;"><strong>${fieldLabels[id]}:</strong><br>${esc(val) || "<span class='small'>Not written yet.</span>"}</div>`;
    });
    exportPreview.innerHTML = html;
    gatedSteps[6] = filled >= 3;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  fields.forEach((id) => document.getElementById(id).addEventListener("input", updateExport));
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  updateExport();

  show(1);
})();
