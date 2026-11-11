(function () {
  const LESSON_ID = 3;
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
    if (gatedSteps.hasOwnProperty(current)) {
      nextBtn.disabled = !gatedSteps[current];
    } else {
      nextBtn.disabled = false;
    }
  }

  prevBtn.addEventListener("click", () => { if (current > 1) show(current - 1); });
  nextBtn.addEventListener("click", () => { if (current < TOTAL_STEPS) show(current + 1); });

  // Step 6: two-John text entry + model answer
  const johnAnswer = document.getElementById("johnAnswer");
  johnAnswer.addEventListener("input", () => {
    gatedSteps[6] = johnAnswer.value.trim().length > 5;
    updateGate();
  });
  document.getElementById("johnRevealBtn").addEventListener("click", () => {
    document.getElementById("johnModel").classList.add("show");
    gatedSteps[6] = true;
    updateGate();
  });

  // Step 7: escalate-or-not scenario
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

  // Step 8: Client Communication Pack (5 messages)
  const packInputs = Array.from(document.querySelectorAll(".pack-input"));
  const exportPreview = document.getElementById("exportPreview");
  const labels = { clarify: "Clarification request", progress: "Progress update", completion: "Completion update", delay: "Delay notice", error: "Error report" };

  function updateExport() {
    let filled = 0;
    let html = "";
    packInputs.forEach((input) => {
      const val = input.value.trim();
      if (val.length > 0) filled++;
      html += `<div style="margin-bottom:12px;"><strong>${labels[input.dataset.key]}:</strong><br>${esc(val) || "<span class='small'>Not written yet.</span>"}</div>`;
    });
    exportPreview.innerHTML = html;
    gatedSteps[8] = filled >= 3; // at least 3 of 5 messages drafted
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
