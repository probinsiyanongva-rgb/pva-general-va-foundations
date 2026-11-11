(function () {
  const LESSON_ID = 11;
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

  // ---- Step 4: classify AI draft sentences ----
  const CLASSES = [
    { value: "supported", label: "Supported" },
    { value: "needs_verification", label: "Needs verification" },
    { value: "unsupported", label: "Unsupported" },
  ];
  const aiSentences = [
    { text: "\"Thank you for reaching out about order #7788.\"", answer: "supported", reason: "Supported — matches exactly what the customer provided." },
    { text: "\"I can see your order was placed 14 days ago, which is past our standard 5-7 business day window.\"", answer: "needs_verification", reason: "Needs verification — this claims to have checked the actual order system. Confirm the real order date and status before sending." },
    { text: "\"The Home Security Starter Kit includes the outdoor camera as standard.\"", answer: "unsupported", reason: "Unsupported — nothing in the ticket or a cited policy says this. The AI invented a product detail; check the real product page or KB before answering." },
    { text: "\"I've issued a full refund of $249 to your original payment method.\"", answer: "unsupported", reason: "Unsupported — the customer never asked for a refund, and no refund was actually authorized or issued. This is a serious invented action." },
    { text: "\"I'll follow up with our fulfillment team about the delay and update you within 24 hours.\"", answer: "needs_verification", reason: "Needs verification — this is a promise. Only keep it in the response if you actually follow up as stated." },
  ];
  let aiChecked = 0;

  function initAiSentences() {
    const container = document.getElementById("aiSentences");
    aiSentences.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "ai-sentence";
      const options = CLASSES.map((c) => `<option value="${c.value}">${c.label}</option>`).join("");
      div.innerHTML = `
        <div class="msg">${item.text}</div>
        <select id="aiSelect${idx}"><option value="">Classify…</option>${options}</select>
        <button class="btn btn-ghost check-btn no-print" type="button" data-idx="${idx}">Check</button>
        <div class="item-feedback" id="aiFeedback${idx}"></div>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll(".check-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const select = document.getElementById("aiSelect" + idx);
        const feedback = document.getElementById("aiFeedback" + idx);
        if (!select.value) return;
        const item = aiSentences[idx];
        const correct = select.value === item.answer;
        feedback.textContent = (correct ? "✓ " : "✗ ") + item.reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.dataset.done) {
          btn.dataset.done = "1";
          aiChecked++;
          document.getElementById("aiScore").textContent = aiChecked + " of " + aiSentences.length + " checked.";
          if (aiChecked === aiSentences.length) { gatedSteps[4] = true; updateGate(); }
        }
      });
    });
  }
  initAiSentences();

  // ---- Step 5: privacy scenario ----
  (function wireScenario() {
    const container = document.getElementById("privacyOptions");
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

  // ---- Step 6: work sample ----
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
    gatedSteps[6] = filled >= 3;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ step: "Summarize", ai: "Summarize the fictional ticket thread", human: "Check summary against the original message" });
  addRow({ step: "Draft", ai: "Draft a response using policy", human: "Mark each sentence supported/needs verification/unsupported" });
  addRow({ step: "Classify", ai: "Suggest issue type and priority", human: "Confirm against actual case details" });
  addRow({ step: "Output", ai: "Final draft ready to review", human: "Rewrite using only verified information before sending" });

  show(1);
})();
