(function () {
  const LESSON_ID = 13;
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

  // ---- Step 4: find the mistakes ----
  const ISSUE_TYPES = [
    { key: "date", label: "Wrong date", note: "\"March 32, 2026\" isn't a real date." },
    { key: "attachment", label: "Missing attachment", note: "The email says a file is attached, but none is." },
    { key: "status", label: "Inconsistent status", note: "\"Overdue\", \"overdue\", and \"OVERDUE - FOLLOW UP\" are three different values for the same status." },
    { key: "formula", label: "Incorrect formula", note: "=SUM(B2:B10)*2 doubles the total for no stated reason." },
    { key: "version", label: "Wrong file version", note: "The filename doesn't reliably say which version is current." },
    { key: "link", label: "Broken link", note: "The dashboard link returns a 404." },
    { key: "duplicate", label: "Duplicate record", note: "\"Ana Reyes\" and \"Ana R.\" are the same person, left unresolved." },
    { key: "filename", label: "Unclear filename", note: "\"Invoice_Tracker_v2_final_reallyfinal.xlsx\" is exactly the pattern this course warned against." },
    { key: "assumption", label: "Unsupported assumption", note: "Records were deleted based on an assumption, without confirming first." },
    { key: "exception", label: "Unreported exception", note: "INV-2291 was handled differently and only mentioned after the fact." },
  ];

  function initFind() {
    const container = document.getElementById("findChecklist");
    ISSUE_TYPES.forEach((issue) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" value="${issue.key}"> ${issue.label}`;
      container.appendChild(label);
    });
  }
  initFind();

  document.getElementById("findCheckBtn").addEventListener("click", () => {
    const checked = new Set(Array.from(document.querySelectorAll("#findChecklist input:checked")).map((c) => c.value));
    document.querySelectorAll("#findChecklist input").forEach((c) => (c.disabled = true));
    const foundCount = checked.size;
    const feedback = document.getElementById("findFeedback");
    let html = `<strong>All ten issues are actually present in the report:</strong><ul style="margin:8px 0 0;padding-left:1.2em;">`;
    ISSUE_TYPES.forEach((issue) => {
      const gotIt = checked.has(issue.key);
      html += `<li>${gotIt ? "✓" : "○"} <strong>${issue.label}:</strong> ${issue.note}</li>`;
    });
    html += "</ul>";
    feedback.innerHTML = html;
    feedback.className = "feedback-box show " + (foundCount >= 7 ? "correct" : "incorrect");
    gatedSteps[4] = true;
    updateGate();
  });

  // ---- Step 5: fix-it-yourself vs escalate ----
  (function wireScenario() {
    const container = document.getElementById("fixOptions");
    const feedback = document.getElementById("fixFeedback");
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

  // ---- Step 6: QA Checklist work sample ----
  const QA_ITEMS = ["Correct", "Complete", "Consistent", "Compliant", "Clear"];
  const qaAnswers = {};
  const exportPreview = document.getElementById("exportPreview");

  function initQa() {
    const container = document.getElementById("qaRows");
    QA_ITEMS.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "checklist-row";
      row.innerHTML = `
        <div class="item-label">${item}</div>
        <div class="yn-toggle">
          <button type="button" data-idx="${idx}" data-val="pass">Pass</button>
          <button type="button" data-idx="${idx}" data-val="fail">Fail</button>
        </div>
        <div></div>
        <div><input type="text" class="f-note" data-idx="${idx}" placeholder="Evidence or note"></div>
      `;
      container.appendChild(row);
    });
    container.querySelectorAll(".yn-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.idx;
        qaAnswers[idx] = btn.dataset.val;
        const group = container.querySelectorAll(`.yn-toggle button[data-idx="${idx}"]`);
        group.forEach((b) => b.classList.remove("active-pass", "active-fail"));
        btn.classList.add(btn.dataset.val === "pass" ? "active-pass" : "active-fail");
        updateQaExport();
      });
    });
    container.querySelectorAll(".f-note").forEach((input) => input.addEventListener("input", updateQaExport));
  }
  initQa();

  function updateQaExport() {
    const notes = document.querySelectorAll(".f-note");
    let html = '<table class="ref-table"><tr><th>Check</th><th>Pass/Fail</th><th>Evidence or note</th></tr>';
    let answered = 0;
    QA_ITEMS.forEach((item, idx) => {
      const val = qaAnswers[idx] ? qaAnswers[idx].toUpperCase() : "—";
      if (qaAnswers[idx]) answered++;
      const note = notes[idx] ? notes[idx].value.trim() : "";
      html += `<tr><td>${item}</td><td>${val}</td><td>${esc(note) || "—"}</td></tr>`;
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[6] = answered >= 3;
    updateGate();
  }
  updateQaExport();

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("printBtn").addEventListener("click", () => window.print());

  show(1);
})();
