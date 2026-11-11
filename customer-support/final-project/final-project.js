(function () {
  const TOTAL_STEPS = 11; // 10 content steps + completion
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false };

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
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    stepNav.style.display = "flex";
    label.textContent = "Step " + step + " of " + (TOTAL_STEPS - 1);
    prevBtn.style.visibility = step === 1 ? "hidden" : "visible";
    nextBtn.textContent = step === TOTAL_STEPS - 1 ? "Finish Project →" : "Continue →";
    updateGate();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateGate() {
    if (gatedSteps.hasOwnProperty(current)) nextBtn.disabled = !gatedSteps[current];
    else nextBtn.disabled = false;
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  prevBtn.addEventListener("click", () => { if (current > 1) show(current - 1); });
  nextBtn.addEventListener("click", () => { if (current < TOTAL_STEPS) show(current + 1); });

  // =========================================================
  // TASK 1 — Triage (12 cases)
  // =========================================================
  const CATEGORIES = [
    { value: "wismo", label: "Where is my order?" },
    { value: "wrong_item", label: "Wrong item" },
    { value: "damaged", label: "Damaged item" },
    { value: "refund", label: "Refund" },
    { value: "cancellation", label: "Cancellation" },
    { value: "missing", label: "Delivered but missing" },
    { value: "account", label: "Account issue" },
    { value: "product", label: "Product question" },
    { value: "general", label: "General/Other" },
  ];
  const triageItems = [
    { msg: "Where's my order? It's been over a week.", accept: ["wismo"], reason: "Where is my order? — check status, carrier, tracking, promised date." },
    { msg: "I got someone else's package, not what I ordered.", accept: ["wrong_item"], reason: "Wrong item — check order contents and shipment record." },
    { msg: "The security camera came with a cracked lens.", accept: ["damaged"], reason: "Damaged item — check evidence, order date, replacement/refund options." },
    { msg: "I'd like a refund, the sensor doesn't work.", accept: ["refund"], reason: "Refund — check eligibility, payment status, refund authority." },
    { msg: "Please cancel my subscription, I signed up by mistake.", accept: ["cancellation"], reason: "Cancellation — check order/fulfillment status and cancellation policy." },
    { msg: "Tracking shows delivered, I never got it.", accept: ["missing"], reason: "Delivered but missing — check delivery evidence, address, carrier process." },
    { msg: "I can't log into my account, forgot my password.", accept: ["account"], reason: "Account issue — verify identity, guide through reset." },
    { msg: "Does the starter kit include installation service?", accept: ["product"], reason: "Product question — check the knowledge base/product page." },
    { msg: "This is my third email, nobody has responded!", accept: ["general"], reason: "General/Other — repeated-contact complaint; flag priority and consider escalation." },
    { msg: "Can I upgrade my plan mid-contract?", accept: ["product"], reason: "Product question — check plan/contract policy." },
    { msg: "My card was charged twice for the same order.", accept: ["refund"], reason: "Refund/billing issue — check payment records before acting." },
    { msg: "I want to change my shipping address before it ships.", accept: ["account"], reason: "Account issue — verify identity and check fulfillment stage before changing anything." },
  ];
  let triageChecked = 0;

  function initTriage() {
    const container = document.getElementById("triageItems");
    triageItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "triage-item";
      const options = CATEGORIES.map((c) => `<option value="${c.value}">${c.label}</option>`).join("");
      div.innerHTML = `
        <div class="msg">"${esc(item.msg)}"</div>
        <select id="triageSelect${idx}"><option value="">Choose a category…</option>${options}</select>
        <button class="btn btn-ghost check-btn no-print" type="button" data-idx="${idx}">Check</button>
        <div class="item-feedback" id="triageFeedback${idx}"></div>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll(".check-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const select = document.getElementById("triageSelect" + idx);
        const feedback = document.getElementById("triageFeedback" + idx);
        if (!select.value) return;
        const item = triageItems[idx];
        const correct = item.accept.includes(select.value);
        feedback.textContent = (correct ? "✓ " : "✗ ") + item.reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.dataset.done) {
          btn.dataset.done = "1";
          triageChecked++;
          document.getElementById("triageScore").textContent = triageChecked + " of " + triageItems.length + " checked.";
          if (triageChecked === triageItems.length) {
            gatedSteps[2] = true;
            window.PVACS.markFinalTaskComplete("task1_triage");
            updateGate();
          }
        }
      });
    });
  }
  initTriage();

  // =========================================================
  // TASK 2 — Investigate
  // =========================================================
  const factsAnswer = document.getElementById("factsAnswer");
  const assumeAnswer = document.getElementById("assumeAnswer");
  const nextAnswer = document.getElementById("nextAnswer");
  function checkTask2Gate() {
    gatedSteps[3] = factsAnswer.value.trim().length > 10 && assumeAnswer.value.trim().length > 10 && nextAnswer.value.trim().length > 10;
    if (gatedSteps[3]) window.PVACS.markFinalTaskComplete("task2_investigate");
    updateGate();
  }
  [factsAnswer, assumeAnswer, nextAnswer].forEach((el) => el.addEventListener("input", checkTask2Gate));

  // =========================================================
  // TASK 3 — Respond (6 messages)
  // =========================================================
  const packInputs = Array.from(document.querySelectorAll(".pack-input"));
  function checkTask3Gate() {
    const filled = packInputs.filter((i) => i.value.trim().length > 0).length;
    gatedSteps[4] = filled >= 4;
    if (gatedSteps[4]) window.PVACS.markFinalTaskComplete("task3_respond");
    updateGate();
  }
  packInputs.forEach((input) => input.addEventListener("input", checkTask3Gate));

  // =========================================================
  // TASK 4 — Escalate (3 rows)
  // =========================================================
  const escRows = document.getElementById("escRows");
  function addEscRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "esc-row";
    row.innerHTML = `
      <div><div class="col-label">Case</div><input type="text" class="esc-case" value="${esc(prefill.case || "")}"></div>
      <div><div class="col-label">Why it needs escalation</div><textarea class="esc-reason" rows="2">${esc(prefill.reason || "")}</textarea></div>
    `;
    escRows.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", checkTask4Gate));
    checkTask4Gate();
  }
  function checkTask4Gate() {
    const rows = Array.from(escRows.querySelectorAll(".esc-row"));
    let filled = 0;
    rows.forEach((row) => { if (row.querySelector(".esc-reason").value.trim().length > 5) filled++; });
    gatedSteps[5] = filled >= 2;
    if (gatedSteps[5]) window.PVACS.markFinalTaskComplete("task4_escalate");
    updateGate();
  }
  addEscRow({ case: "#9 — repeated unresolved contact" });
  addEscRow({ case: "#11 — double charge / billing dispute" });
  addEscRow({});

  // =========================================================
  // TASK 5 — Document (5 cases)
  // =========================================================
  const docRows = document.getElementById("docRows");
  function addDocRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "esc-row";
    row.innerHTML = `
      <div><div class="col-label">Case</div><input type="text" class="doc-case" value="${esc(prefill.case || "")}"></div>
      <div><div class="col-label">Facts, action, next step</div><textarea class="doc-notes" rows="2">${esc(prefill.notes || "")}</textarea></div>
    `;
    docRows.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", checkTask5Gate));
    checkTask5Gate();
  }
  function checkTask5Gate() {
    const rows = Array.from(docRows.querySelectorAll(".esc-row"));
    let filled = 0;
    rows.forEach((row) => { if (row.querySelector(".doc-notes").value.trim().length > 5) filled++; });
    gatedSteps[6] = filled >= 2;
    if (gatedSteps[6]) window.PVACS.markFinalTaskComplete("task5_document");
    updateGate();
  }
  document.getElementById("addDocRowBtn").addEventListener("click", () => addDocRow());
  addDocRow({ case: "#3 — cracked camera lens", notes: "Photo received; order shipped within window; policy permits replacement. Replacement requested, customer informed, warehouse confirmation pending." });
  addDocRow({});

  // =========================================================
  // TASK 6 — Metrics
  // =========================================================
  const metricsAnswer = document.getElementById("metricsAnswer");
  metricsAnswer.addEventListener("input", () => {
    gatedSteps[7] = metricsAnswer.value.trim().length > 20;
    if (gatedSteps[7]) window.PVACS.markFinalTaskComplete("task6_metrics");
    updateGate();
  });

  // =========================================================
  // TASK 7 — AI
  // =========================================================
  const aiUsed = document.getElementById("aiUsed");
  const aiVerify = document.getElementById("aiVerify");
  function checkTask7Gate() {
    gatedSteps[8] = aiUsed.value.trim().length > 5 && aiVerify.value.trim().length > 5;
    if (gatedSteps[8]) window.PVACS.markFinalTaskComplete("task7_ai");
    updateGate();
  }
  aiUsed.addEventListener("input", checkTask7Gate);
  aiVerify.addEventListener("input", checkTask7Gate);

  // =========================================================
  // TASK 8 — Security
  // =========================================================
  (function wireTask8Scenario() {
    const container = document.getElementById("task8Options");
    const feedback = document.getElementById("task8Feedback");
    const buttons = Array.from(container.querySelectorAll(".option-btn"));
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const correct = btn.dataset.correct === "true";
        buttons.forEach((b) => (b.disabled = true));
        btn.classList.add(correct ? "selected-correct" : "selected-incorrect");
        feedback.textContent = (correct ? "✓ " : "✗ ") + btn.dataset.feedback;
        feedback.className = "feedback-box show " + (correct ? "correct" : "incorrect");
        checkTask8Gate();
      });
    });
  })();
  const task8Explain = document.getElementById("task8Explain");
  task8Explain.addEventListener("input", checkTask8Gate);
  function checkTask8Gate() {
    const scenarioAnswered = document.querySelectorAll("#task8Options .option-btn:disabled").length > 0;
    gatedSteps[9] = scenarioAnswered && task8Explain.value.trim().length > 10;
    if (gatedSteps[9]) window.PVACS.markFinalTaskComplete("task8_security");
    updateGate();
  }

  // =========================================================
  // STEP 10 — Final submission checklist
  // =========================================================
  const FINAL_CHECKLIST_ITEMS = [
    "I investigated before promising.",
    "I followed policy and authority.",
    "My responses are clear and customer-specific.",
    "I documented facts and next steps.",
    "I escalated cases requiring a decision or presenting material risk.",
    "I protected customer information.",
    "I verified AI-assisted output.",
    "I quality-checked my work.",
  ];

  function initFinalChecklist() {
    const container = document.getElementById("finalChecklist");
    FINAL_CHECKLIST_ITEMS.forEach((item, idx) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" id="finalChk${idx}"> ${item}`;
      container.appendChild(label);
    });
    container.querySelectorAll("input").forEach((chk) => chk.addEventListener("change", checkFinalChecklistGate));
  }
  initFinalChecklist();

  function checkFinalChecklistGate() {
    const checked = document.querySelectorAll("#finalChecklist input:checked").length;
    gatedSteps[10] = checked >= 6;
    updateGate();
  }

  show(1);
})();
