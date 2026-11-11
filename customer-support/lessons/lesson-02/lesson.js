(function () {
  const LESSON_ID = 2;
  const TOTAL_STEPS = 8; // 7 content steps + completion
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 5: false, 6: false, 7: false };

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

  // Step 5: investigate text entry + reveal
  const investigateAnswer = document.getElementById("investigateAnswer");
  investigateAnswer.addEventListener("input", () => {
    gatedSteps[5] = investigateAnswer.value.trim().length > 10;
    updateGate();
  });
  document.getElementById("investigateRevealBtn").addEventListener("click", () => {
    document.getElementById("investigateModel").classList.add("show");
    gatedSteps[5] = true;
    updateGate();
  });

  // Step 6: scenario
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
        gatedSteps[6] = true;
        updateGate();
      });
    });
  })();

  // Step 7: work sample — Ticket Action Plan
  const rowsContainer = document.getElementById("planRows");
  const exportPreview = document.getElementById("exportPreview");

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "plan-row";
    row.innerHTML = `
      <div><div class="col-label">Case</div><textarea class="f-case" rows="2">${esc(prefill.case || "")}</textarea></div>
      <div><div class="col-label">Customer goal</div><textarea class="f-goal" rows="2">${esc(prefill.goal || "")}</textarea></div>
      <div><div class="col-label">Information needed</div><textarea class="f-info" rows="2">${esc(prefill.info || "")}</textarea></div>
      <div><div class="col-label">Policy/check</div><textarea class="f-policy" rows="2">${esc(prefill.policy || "")}</textarea></div>
      <div><div class="col-label">Next action</div><textarea class="f-next" rows="2">${esc(prefill.next || "")}</textarea></div>
      <div><div class="col-label">Status</div><input type="text" class="f-status" value="${esc(prefill.status || "")}"></div>
    `;
    rowsContainer.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".plan-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Case</th><th>Customer goal</th><th>Info needed</th><th>Policy/check</th><th>Next action</th><th>Status</th></tr>';
    rows.forEach((row) => {
      const vals = [
        row.querySelector(".f-case").value.trim(),
        row.querySelector(".f-goal").value.trim(),
        row.querySelector(".f-info").value.trim(),
        row.querySelector(".f-policy").value.trim(),
        row.querySelector(".f-next").value.trim(),
        row.querySelector(".f-status").value.trim(),
      ];
      if (vals.some((v) => v.length > 0)) filled++;
      html += "<tr>" + vals.map((v) => `<td>${esc(v) || "—"}</td>`).join("") + "</tr>";
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[7] = filled >= 1;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ case: "Package shows delivered but customer didn't receive it", goal: "Get the item or a resolution", info: "Order #, delivery date/time, address, carrier tracking, prior contacts", policy: "Delivered-but-not-received policy", next: "Check carrier tracking details and delivery confirmation", status: "Investigating" });

  show(1);
})();
