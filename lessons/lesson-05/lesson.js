(function () {
  const LESSON_ID = 5;
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

  // Step 6: build-the-day text entry + model reveal
  const dayAnswer = document.getElementById("dayAnswer");
  dayAnswer.addEventListener("input", () => {
    gatedSteps[6] = dayAnswer.value.trim().length > 15;
    updateGate();
  });
  document.getElementById("dayRevealBtn").addEventListener("click", () => {
    document.getElementById("dayModel").classList.add("show");
    gatedSteps[6] = true;
    updateGate();
  });

  // Step 7: time-zone scenario
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

  // Step 8: Client Calendar Plan work sample
  const rowsContainer = document.getElementById("calRows");
  const exportPreview = document.getElementById("exportPreview");

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "cal-row";
    row.innerHTML = `
      <div><div class="col-label">Event</div><input type="text" class="f-event" value="${esc(prefill.event || "")}"></div>
      <div><div class="col-label">Requested time</div><input type="text" class="f-requested" value="${esc(prefill.requested || "")}"></div>
      <div><div class="col-label">Confirmed time</div><input type="text" class="f-confirmed" value="${esc(prefill.confirmed || "")}"></div>
      <div><div class="col-label">Time zone</div><input type="text" class="f-tz" value="${esc(prefill.tz || "")}"></div>
      <div><div class="col-label">Prep/buffer &amp; status</div><input type="text" class="f-notes" value="${esc(prefill.notes || "")}"></div>
    `;
    rowsContainer.appendChild(row);
    row.querySelectorAll("input").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".cal-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Event</th><th>Requested</th><th>Confirmed</th><th>Time zone</th><th>Prep/buffer &amp; status</th></tr>';
    rows.forEach((row) => {
      const vals = [
        row.querySelector(".f-event").value.trim(),
        row.querySelector(".f-requested").value.trim(),
        row.querySelector(".f-confirmed").value.trim(),
        row.querySelector(".f-tz").value.trim(),
        row.querySelector(".f-notes").value.trim(),
      ];
      if (vals.some((v) => v.length > 0)) filled++;
      html += "<tr>" + vals.map((v) => `<td>${esc(v) || "—"}</td>`).join("") + "</tr>";
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[8] = filled >= 2;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ event: "Team meeting", requested: "10–11 AM", confirmed: "10–11 AM", tz: "Client's local time", notes: "No conflict" });
  addRow({ event: "Presentation", requested: "3–4 PM", confirmed: "3–4 PM", tz: "Client's local time", notes: "15-min buffer added before" });

  show(1);
})();
