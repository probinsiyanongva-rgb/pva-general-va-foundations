(function () {
  const LESSON_ID = 9;
  const TOTAL_STEPS = 7; // 6 content steps + completion
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 3: false, 4: false, 5: false, 6: false };

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

  // ---- Step 3: spot-the-gap checklist ----
  const ELEMENTS = ["Purpose", "Trigger", "Inputs", "Tools/access", "Steps", "Exceptions", "Escalation", "Definition of done"];
  const MISSING = new Set(["Inputs", "Tools/access", "Steps", "Exceptions", "Escalation", "Definition of done"]);

  function initGap() {
    const container = document.getElementById("gapChecklist");
    ELEMENTS.forEach((el, idx) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" value="${el}" id="gapChk${idx}"> ${el}`;
      container.appendChild(label);
    });
  }
  initGap();

  document.getElementById("gapCheckBtn").addEventListener("click", () => {
    const checked = new Set(Array.from(document.querySelectorAll("#gapChecklist input:checked")).map((c) => c.value));
    const correct = checked.size === MISSING.size && [...checked].every((v) => MISSING.has(v));
    const feedback = document.getElementById("gapFeedback");
    if (correct) {
      feedback.textContent = "✓ Exactly right — Purpose and Trigger are reasonably clear (why, and when), but Inputs, Tools/access, Steps, Exceptions, Escalation, and Definition of done are all left vague.";
      feedback.className = "feedback-box show correct";
    } else {
      feedback.textContent = "✗ Not quite. The instruction leaves Inputs, Tools/access, Steps, Exceptions, Escalation, and Definition of done vague — only Purpose and Trigger are reasonably clear (why the process exists, and when it starts).";
      feedback.className = "feedback-box show incorrect";
    }
    document.querySelectorAll("#gapChecklist input").forEach((c) => (c.disabled = true));
    gatedSteps[3] = true;
    updateGate();
  });

  // ---- Step 4: write-a-stronger-SOP practice ----
  const SOP_FIELDS = ["Purpose", "Trigger", "Inputs", "Tools/access", "Steps", "Exceptions", "Escalation", "Definition of done"];

  function buildSopFields(containerId, gateStep) {
    const container = document.getElementById(containerId);
    SOP_FIELDS.forEach((f) => {
      const div = document.createElement("div");
      div.className = "sop-field";
      div.innerHTML = `<label>${f}</label><textarea rows="2" data-field="${f}"></textarea>`;
      container.appendChild(div);
    });
    if (gateStep) {
      container.querySelectorAll("textarea").forEach((el) => el.addEventListener("input", () => checkSopGate(container, gateStep)));
    }
    return container;
  }

  function checkSopGate(container, gateStep) {
    const filled = Array.from(container.querySelectorAll("textarea")).filter((t) => t.value.trim().length > 0).length;
    gatedSteps[gateStep] = filled >= 4;
    updateGate();
  }

  buildSopFields("sopPracticeFields", 4);

  document.getElementById("sopRevealBtn").addEventListener("click", () => {
    document.getElementById("sopModel").classList.add("show");
    gatedSteps[4] = true;
    updateGate();
  });

  // ---- Step 5: exception scenario ----
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

  // ---- Step 6: work sample (final SOP) ----
  const finalContainer = buildSopFields("sopFinalFields", null);
  const exportPreview = document.getElementById("exportPreview");

  function updateFinalExport() {
    const fields = Array.from(finalContainer.querySelectorAll("textarea"));
    let filled = 0;
    let html = '<table class="ref-table">';
    fields.forEach((f) => {
      const val = f.value.trim();
      if (val.length > 0) filled++;
      html += `<tr><td><strong>${f.dataset.field}</strong></td><td>${esc(val) || "—"}</td></tr>`;
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[6] = filled >= 4;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  finalContainer.querySelectorAll("textarea").forEach((el) => el.addEventListener("input", updateFinalExport));
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  updateFinalExport();

  show(1);
})();
