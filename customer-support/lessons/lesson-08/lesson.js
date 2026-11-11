(function () {
  const LESSON_ID = 8;
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

  // Step 4: angry-customer text entry
  const angryAnswer = document.getElementById("angryAnswer");
  angryAnswer.addEventListener("input", () => {
    gatedSteps[4] = angryAnswer.value.trim().length > 20;
    updateGate();
  });

  // Step 5: high-risk scenario
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

  // Step 6: De-escalation Response Pack
  const packInputs = Array.from(document.querySelectorAll(".pack-input"));
  const exportPreview = document.getElementById("exportPreview");
  const labels = { frustration: "Frustration", repeated: "Repeated-contact complaint", policy: "Policy disagreement" };

  function updateExport() {
    let filled = 0;
    let html = "";
    packInputs.forEach((input) => {
      const val = input.value.trim();
      if (val.length > 0) filled++;
      html += `<div style="margin-bottom:12px;"><strong>${labels[input.dataset.key]}:</strong><br>${esc(val) || "<span class='small'>Not written yet.</span>"}</div>`;
    });
    exportPreview.innerHTML = html;
    gatedSteps[6] = filled >= 2;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  packInputs.forEach((input) => input.addEventListener("input", updateExport));
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  updateExport();

  show(1);
})();
