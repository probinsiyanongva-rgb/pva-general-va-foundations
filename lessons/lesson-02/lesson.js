(function () {
  const LESSON_ID = 2;
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

  // Step 6: clarification text-entry + model answer reveal
  const clarifyAnswer = document.getElementById("clarifyAnswer");
  clarifyAnswer.addEventListener("input", () => {
    gatedSteps[6] = clarifyAnswer.value.trim().length > 10;
    updateGate();
  });
  document.getElementById("clarifyRevealBtn").addEventListener("click", () => {
    document.getElementById("clarifyModel").classList.add("show");
    gatedSteps[6] = true;
    updateGate();
  });

  // Step 7: scenario
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

  // Step 8: work sample — Client Request → Action Plan
  const rowsContainer = document.getElementById("planRows");
  const exportPreview = document.getElementById("exportPreview");

  function addRow(prefill) {
    const row = document.createElement("div");
    row.className = "plan-row";
    row.innerHTML = `
      <div><div class="col-label">Request</div><textarea class="f-request" rows="2">${prefill && prefill.request ? prefill.request : ""}</textarea></div>
      <div><div class="col-label">Desired outcome</div><textarea class="f-outcome" rows="2"></textarea></div>
      <div><div class="col-label">Questions</div><textarea class="f-questions" rows="2"></textarea></div>
      <div><div class="col-label">Steps</div><textarea class="f-steps" rows="2"></textarea></div>
      <div><div class="col-label">Deadline</div><input type="text" class="f-deadline"></div>
      <div><div class="col-label">Definition of done</div><textarea class="f-dod" rows="2"></textarea></div>
    `;
    rowsContainer.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".plan-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Request</th><th>Outcome</th><th>Questions</th><th>Steps</th><th>Deadline</th><th>Def. of done</th></tr>';
    rows.forEach((row) => {
      const vals = {
        request: row.querySelector(".f-request").value.trim(),
        outcome: row.querySelector(".f-outcome").value.trim(),
        questions: row.querySelector(".f-questions").value.trim(),
        steps: row.querySelector(".f-steps").value.trim(),
        deadline: row.querySelector(".f-deadline").value.trim(),
        dod: row.querySelector(".f-dod").value.trim(),
      };
      if (Object.values(vals).some((v) => v.length > 0)) filled++;
      html += `<tr><td>${esc(vals.request) || "—"}</td><td>${esc(vals.outcome) || "—"}</td><td>${esc(vals.questions) || "—"}</td><td>${esc(vals.steps) || "—"}</td><td>${esc(vals.deadline) || "—"}</td><td>${esc(vals.dod) || "—"}</td></tr>`;
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[8] = filled >= 1 && rowsContainer.querySelectorAll(".plan-row").length > 0 && filled >= 1;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ request: "Organize the attached contacts spreadsheet and have it ready by tomorrow." });

  show(1);
})();
