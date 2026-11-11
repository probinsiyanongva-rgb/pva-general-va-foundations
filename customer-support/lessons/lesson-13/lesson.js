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

  // ---- Step 4: identify the error ----
  const ERROR_TYPES = [
    { value: "wrong_order", label: "Wrong customer/order number" },
    { value: "incorrect_policy", label: "Incorrect policy" },
    { value: "unsupported_promise", label: "Unsupported promise" },
    { value: "missing_next_step", label: "Missing next step" },
    { value: "jargon", label: "Unnecessary jargon" },
  ];
  const qaItems = [
    { text: "\"Hi, I've refunded order #4521 in full.\" (the actual case was about order #4522)", answer: "wrong_order", reason: "Wrong customer/order number — the response references an order that isn't this customer's." },
    { text: "\"Our policy allows free returns any time, no questions asked.\" (actual policy has a 30-day window)", answer: "incorrect_policy", reason: "Incorrect policy — states something more generous than what's actually approved." },
    { text: "\"I'll make sure this never happens again, and you'll get priority shipping forever.\"", answer: "unsupported_promise", reason: "Unsupported promise — nothing in policy or authority supports either commitment." },
    { text: "\"Your refund has been processed.\" (no amount, timeline, or confirmation given)", answer: "missing_next_step", reason: "Missing next step — the customer doesn't know what to expect or when." },
    { text: "\"Per aforementioned SLA parameters, your ticket has been actioned in accordance with standard remediation protocols.\"", answer: "jargon", reason: "Unnecessary jargon — this could be said in plain, clear language." },
  ];
  let qaChecked = 0;

  function initQa() {
    const container = document.getElementById("qaItems");
    qaItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "qa-item";
      const options = ERROR_TYPES.map((e) => `<option value="${e.value}">${e.label}</option>`).join("");
      div.innerHTML = `
        <div class="msg">${item.text}</div>
        <select id="qaSelect${idx}"><option value="">Choose the issue…</option>${options}</select>
        <button class="btn btn-ghost check-btn no-print" type="button" data-idx="${idx}">Check</button>
        <div class="item-feedback" id="qaFeedback${idx}"></div>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll(".check-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const select = document.getElementById("qaSelect" + idx);
        const feedback = document.getElementById("qaFeedback" + idx);
        if (!select.value) return;
        const item = qaItems[idx];
        const correct = select.value === item.answer;
        feedback.textContent = (correct ? "✓ " : "✗ ") + item.reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.dataset.done) {
          btn.dataset.done = "1";
          qaChecked++;
          document.getElementById("qaScore").textContent = qaChecked + " of " + qaItems.length + " checked.";
          if (qaChecked === qaItems.length) { gatedSteps[4] = true; updateGate(); }
        }
      });
    });
  }
  initQa();

  // ---- Step 5: systemic-issue scenario ----
  (function wireScenario() {
    const container = document.getElementById("systemicOptions");
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

  // ---- Step 6: QA Review work sample ----
  const rowsContainer = document.getElementById("reviewRows");
  const exportPreview = document.getElementById("exportPreview");
  const COLS = ["response", "issue", "risk", "rewrite", "action"];
  const COL_LABELS = ["Response", "Issue", "Risk", "Rewrite", "Escalate or document?"];

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "review-row";
    row.innerHTML = COLS.map((c, i) => `
      <div><div class="col-label">${COL_LABELS[i]}</div><textarea class="f-${c}" rows="2">${esc(prefill[c] || "")}</textarea></div>
    `).join("");
    rowsContainer.appendChild(row);
    row.querySelectorAll("textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".review-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr>' + COL_LABELS.map((l) => `<th>${l}</th>`).join("") + "</tr>";
    rows.forEach((row) => {
      const vals = COLS.map((c) => row.querySelector(".f-" + c).value.trim());
      if (vals.some((v) => v.length > 0)) filled++;
      html += "<tr>" + vals.map((v) => `<td>${esc(v) || "—"}</td>`).join("") + "</tr>";
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[6] = filled >= 1;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  addRow({ response: "\"Hi, I've refunded order #4521 in full.\"", issue: "Wrong order number", risk: "Wrong customer's order affected; real case unresolved", rewrite: "\"Hi, I've refunded order #4522 in full — you should see it within 5-7 business days.\"", action: "Document as an individual QA correction" });
  addRow({ response: "\"Our policy allows free returns any time, no questions asked.\"", issue: "Incorrect policy", risk: "Sets a false expectation; costs the business", rewrite: "\"Our policy allows free returns within 30 days of delivery for unused items.\"", action: "Escalate — check whether other agents are also stating this incorrectly" });

  show(1);
})();
