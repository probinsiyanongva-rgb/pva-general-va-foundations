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

  // ---- Step 4: pick the factual rewrite ----
  const rewriteItems = [
    {
      prompt: "\"Customer is being difficult about the refund.\"",
      options: [
        { text: "Customer is being difficult about the refund.", correct: false },
        { text: "Customer requested a refund exception outside standard policy; declined per policy, escalation offered.", correct: true },
        { text: "Customer won't take no for an answer.", correct: false },
      ],
      reason: "The factual version states what was requested and what happened — no characterization of the customer's attitude.",
    },
    {
      prompt: "\"Customer is clearly lying about not receiving the package.\"",
      options: [
        { text: "Customer is clearly lying about not receiving the package.", correct: false },
        { text: "Tracking shows delivered; customer states package not received. Investigation ongoing.", correct: true },
        { text: "Customer is trying to scam a free replacement.", correct: false },
      ],
      reason: "This records exactly what the system shows and what the customer said, without concluding anything about their honesty.",
    },
    {
      prompt: "\"This customer is annoying — third time contacting about the same thing.\"",
      options: [
        { text: "This customer is annoying — third time contacting about the same thing.", correct: false },
        { text: "Customer contacted support three times regarding the same order.", correct: true },
        { text: "Customer needs to calm down.", correct: false },
      ],
      reason: "This is the exact example from this lesson's Learn step — a count of contacts, no judgment about the customer's tone.",
    },
  ];
  let rewriteChecked = 0;

  function initRewrite() {
    const container = document.getElementById("rewriteItems");
    rewriteItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "std-item";
      const opts = item.options.map((o, oi) => `<button class="opt-btn" data-idx="${idx}" data-oi="${oi}" data-correct="${o.correct}">${esc(o.text)}</button>`).join("");
      div.innerHTML = `<div class="prompt">${item.prompt}</div><div class="opt-row">${opts}</div><div class="item-feedback" id="rewriteFeedback${idx}"></div>`;
      container.appendChild(div);
    });
    container.querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const correct = btn.dataset.correct === "true";
        const group = container.querySelectorAll(`.opt-btn[data-idx="${idx}"]`);
        group.forEach((b) => (b.disabled = true));
        btn.classList.add(correct ? "selected-correct" : "selected-incorrect");
        const feedback = document.getElementById("rewriteFeedback" + idx);
        feedback.textContent = (correct ? "✓ " : "✗ ") + rewriteItems[idx].reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.closest(".std-item").dataset.done) {
          btn.closest(".std-item").dataset.done = "1";
          rewriteChecked++;
          document.getElementById("rewriteScore").textContent = rewriteChecked + " of " + rewriteItems.length + " checked.";
          if (rewriteChecked === rewriteItems.length) { gatedSteps[4] = true; updateGate(); }
        }
      });
    });
  }
  initRewrite();

  // ---- Step 5: customer-facing vs internal scenario ----
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

  // ---- Step 6: Ticket Notes + Tracker work sample ----
  const rowsContainer = document.getElementById("ticketRows");
  const exportPreview = document.getElementById("exportPreview");
  const COLS = ["issue", "investigation", "action", "update", "next", "followup"];
  const COL_LABELS = ["Issue", "Investigation", "Action", "Customer update", "Next step", "Follow-up"];

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "ticket-row";
    row.innerHTML = COLS.map((c, i) => `
      <div><div class="col-label">${COL_LABELS[i]}</div><textarea class="f-${c}" rows="2">${esc(prefill[c] || "")}</textarea></div>
    `).join("");
    rowsContainer.appendChild(row);
    row.querySelectorAll("textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".ticket-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr>' + COL_LABELS.map((l) => `<th>${l}</th>`).join("") + "</tr>";
    rows.forEach((row) => {
      const vals = COLS.map((c) => row.querySelector(".f-" + c).value.trim());
      if (vals.some((v) => v.length > 0)) filled++;
      html += "<tr>" + vals.map((v) => `<td>${esc(v) || "—"}</td>`).join("") + "</tr>";
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[6] = filled >= 2;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ issue: "Customer reports damaged item on order #1234", investigation: "Photo received; order shipped 04/10; policy permits replacement", action: "Replacement requested", update: "Customer informed of process", next: "Warehouse confirmation pending", followup: "Check status tomorrow" });

  show(1);
})();
