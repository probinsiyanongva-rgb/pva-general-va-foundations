(function () {
  const LESSON_ID = 7;
  const TOTAL_STEPS = 6; // 5 content steps + completion
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 3: false, 4: false, 5: false };

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

  // ---- Step 3: identify the case type ----
  const CASE_TYPES = [
    { value: "wismo", label: "Where is my order?" },
    { value: "wrong_item", label: "Wrong item" },
    { value: "damaged", label: "Damaged item" },
    { value: "refund", label: "Refund" },
    { value: "cancellation", label: "Cancellation" },
    { value: "missing", label: "Delivered but missing" },
  ];
  const caseTickets = [
    { msg: "Hi, where's my order? It's been a week.", answer: "wismo", reason: "Where is my order? — check order status, carrier, tracking, promised date." },
    { msg: "I ordered a blue sweater but got a red one.", answer: "wrong_item", reason: "Wrong item — check order contents, shipment record, return/replacement policy." },
    { msg: "The mug arrived cracked in three pieces.", answer: "damaged", reason: "Damaged item — check evidence, order date, policy, replacement/refund options." },
    { msg: "I'd like my money back for this — it doesn't work as described.", answer: "refund", reason: "Refund — check eligibility, payment status, refund authority." },
    { msg: "Can you cancel my order? I just placed it by mistake.", answer: "cancellation", reason: "Cancellation — check order status, fulfillment stage, cancellation policy." },
    { msg: "Tracking says delivered but there's nothing on my porch.", answer: "missing", reason: "Delivered but missing — check delivery evidence, address, carrier process, escalation policy." },
  ];
  let caseChecked = 0;

  function initCaseTypes() {
    const container = document.getElementById("caseItems");
    caseTickets.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "triage-item";
      const options = CASE_TYPES.map((c) => `<option value="${c.value}">${c.label}</option>`).join("");
      div.innerHTML = `
        <div class="msg">"${item.msg}"</div>
        <select id="caseSelect${idx}"><option value="">Choose a case type…</option>${options}</select>
        <button class="btn btn-ghost check-btn no-print" type="button" data-idx="${idx}">Check</button>
        <div class="item-feedback" id="caseFeedback${idx}"></div>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll(".check-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const select = document.getElementById("caseSelect" + idx);
        const feedback = document.getElementById("caseFeedback" + idx);
        if (!select.value) return;
        const item = caseTickets[idx];
        const correct = select.value === item.answer;
        feedback.textContent = (correct ? "✓ " : "✗ ") + item.reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.dataset.done) {
          btn.dataset.done = "1";
          caseChecked++;
          document.getElementById("caseScore").textContent = caseChecked + " of " + caseTickets.length + " checked.";
          if (caseChecked === caseTickets.length) { gatedSteps[3] = true; updateGate(); }
        }
      });
    });
  }
  initCaseTypes();

  // ---- Step 4: approval-required scenario ----
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
        gatedSteps[4] = true;
        updateGate();
      });
    });
  })();

  // ---- Step 5: E-commerce Ticket Set work sample ----
  const rowsContainer = document.getElementById("ecRows");
  const exportPreview = document.getElementById("exportPreview");
  const COLS = ["case", "goal", "facts", "policy", "action", "escalation"];
  const COL_LABELS = ["Case", "Customer goal", "Facts", "Policy", "Action/Response", "Escalation status"];

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "ec-row";
    row.innerHTML = COLS.map((c, i) => `
      <div><div class="col-label">${COL_LABELS[i]}</div><textarea class="f-${c}" rows="2">${esc(prefill[c] || "")}</textarea></div>
    `).join("");
    rowsContainer.appendChild(row);
    row.querySelectorAll("textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".ec-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr>' + COL_LABELS.map((l) => `<th>${l}</th>`).join("") + "</tr>";
    rows.forEach((row) => {
      const vals = COLS.map((c) => row.querySelector(".f-" + c).value.trim());
      if (vals.some((v) => v.length > 0)) filled++;
      html += "<tr>" + vals.map((v) => `<td>${esc(v) || "—"}</td>`).join("") + "</tr>";
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[5] = filled >= 3;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ case: "Where is my order?", goal: "Know when it will arrive", facts: "Order placed 7 days ago, tracking shows in transit", policy: "Standard shipping window is 5-7 business days", action: "Share latest tracking, offer to escalate if not moving", escalation: "Not yet — within normal window" });
  addRow({ case: "Wrong item", goal: "Get the correct item", facts: "Ordered blue sweater, received red", policy: "Wrong-item errors qualify for free replacement", action: "Apologize, arrange replacement, provide return label", escalation: "No" });

  show(1);
})();
