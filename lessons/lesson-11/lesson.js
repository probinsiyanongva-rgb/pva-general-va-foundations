(function () {
  const LESSON_ID = 11;
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

  // ---- Step 5: verify the AI's draft ----
  const aiDraftItems = [
    { text: "Draft a vendor update about the delayed shipment.", accurate: true },
    { text: "Remind Dana to call the accountant by Friday.", accurate: true },
    { text: "Schedule a call with the new supplier for tomorrow.", accurate: false, note: "The email said \"sometime next week,\" not tomorrow — the AI invented a specific time that wasn't in the original request." },
    { text: "Check whether invoice INV-2291 was already paid.", accurate: true },
    { text: "Follow up with the vendor about a refund.", accurate: false, note: "Not mentioned anywhere in the original email — this was invented by the AI entirely." },
  ];

  function initAiItems() {
    const container = document.getElementById("aiItems");
    aiDraftItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "ai-item";
      div.innerHTML = `<input type="checkbox" id="aiItem${idx}"><label for="aiItem${idx}">${item.text}</label>`;
      container.appendChild(div);
    });
  }
  initAiItems();

  document.getElementById("verifyCheckBtn").addEventListener("click", () => {
    const items = document.querySelectorAll(".ai-item");
    let allCorrect = true;
    items.forEach((div, idx) => {
      const checked = div.querySelector("input").checked;
      const shouldBeChecked = aiDraftItems[idx].accurate;
      if (checked === shouldBeChecked) {
        div.classList.add("correct-flag");
      } else {
        div.classList.add("incorrect-flag");
        allCorrect = false;
      }
      div.querySelector("input").disabled = true;
      if (!aiDraftItems[idx].accurate) {
        const note = document.createElement("div");
        note.className = "small";
        note.style.marginTop = "6px";
        note.textContent = "⚠ " + aiDraftItems[idx].note;
        div.appendChild(note);
      }
    });
    const feedback = document.getElementById("verifyFeedback");
    feedback.textContent = allCorrect
      ? "✓ Correct — items 1, 2, and 4 were accurate; items 3 and 5 needed correction before use."
      : "Review the highlighted items above: green means you called it right, red means it needs a second look.";
    feedback.className = "feedback-box show " + (allCorrect ? "correct" : "incorrect");
    gatedSteps[5] = true;
    updateGate();
  });

  // ---- Step 6: privacy scenario ----
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

  // ---- Step 7: work sample ----
  const rowsContainer = document.getElementById("workflowRows");
  const exportPreview = document.getElementById("exportPreview");

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "workflow-row";
    row.innerHTML = `
      <div><div class="col-label">Step</div><input type="text" class="f-step" value="${esc(prefill.step || "")}"></div>
      <div><div class="col-label">AI contribution</div><textarea class="f-ai" rows="2">${esc(prefill.ai || "")}</textarea></div>
      <div><div class="col-label">Human verification</div><textarea class="f-human" rows="2">${esc(prefill.human || "")}</textarea></div>
    `;
    rowsContainer.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".workflow-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Step</th><th>AI contribution</th><th>Human verification</th></tr>';
    rows.forEach((row) => {
      const step = row.querySelector(".f-step").value.trim();
      const ai = row.querySelector(".f-ai").value.trim();
      const human = row.querySelector(".f-human").value.trim();
      if (step || ai || human) filled++;
      html += `<tr><td>${esc(step) || "—"}</td><td>${esc(ai) || "—"}</td><td>${esc(human) || "—"}</td></tr>`;
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[7] = filled >= 3;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ step: "Input", ai: "Summarize the fictional email", human: "Check summary against the original" });
  addRow({ step: "Extract", ai: "Identify action items", human: "Confirm every action exists in the source" });
  addRow({ step: "Organize", ai: "Draft task list", human: "Check priority/deadlines" });
  addRow({ step: "Output", ai: "Draft client update", human: "Review facts, tone, and authority" });

  show(1);
})();
