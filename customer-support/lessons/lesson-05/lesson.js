(function () {
  const LESSON_ID = 5;
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

  // ---- Step 4: match tickets to KB articles ----
  const ARTICLES = [
    { value: "shipping_delay", label: "Shipping Delay" },
    { value: "damaged_item", label: "Damaged Item" },
    { value: "refund_eligibility", label: "Refund Eligibility" },
    { value: "password_reset", label: "Password Reset" },
    { value: "escalation_rules", label: "Escalation Rules" },
  ];
  const kbTickets = [
    { msg: "My order was supposed to arrive Monday, it's Thursday and tracking hasn't updated in 3 days.", answer: "shipping_delay", reason: "Shipping Delay — past the promised date, share the latest tracking update." },
    { msg: "The vase arrived broken. I have photos — it was delivered 5 days ago.", answer: "damaged_item", reason: "Damaged Item — within 14 days, with photo evidence." },
    { msg: "I want to return this shirt. Still has tags, bought 3 weeks ago.", answer: "refund_eligibility", reason: "Refund Eligibility — within 30 days, unused, original packaging." },
    { msg: "I never got the password reset email. I've tried twice.", answer: "password_reset", reason: "Password Reset — verify the email on file and manually trigger a reset." },
    { msg: "This is my fourth email about this and nobody has fixed it. I'm contacting my lawyer.", answer: "escalation_rules", reason: "Escalation Rules — repeated unresolved contacts plus a legal threat." },
  ];
  let kbChecked = 0;

  function initKb() {
    const container = document.getElementById("kbItems");
    kbTickets.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "triage-item";
      const options = ARTICLES.map((a) => `<option value="${a.value}">${a.label}</option>`).join("");
      div.innerHTML = `
        <div class="msg">"${item.msg}"</div>
        <select id="kbSelect${idx}"><option value="">Choose an article…</option>${options}</select>
        <button class="btn btn-ghost check-btn no-print" type="button" data-idx="${idx}">Check</button>
        <div class="item-feedback" id="kbFeedback${idx}"></div>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll(".check-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const select = document.getElementById("kbSelect" + idx);
        const feedback = document.getElementById("kbFeedback" + idx);
        if (!select.value) return;
        const item = kbTickets[idx];
        const correct = select.value === item.answer;
        feedback.textContent = (correct ? "✓ " : "✗ ") + item.reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.dataset.done) {
          btn.dataset.done = "1";
          kbChecked++;
          document.getElementById("kbScore").textContent = kbChecked + " of " + kbTickets.length + " checked.";
          if (kbChecked === kbTickets.length) { gatedSteps[4] = true; updateGate(); }
        }
      });
    });
  }
  initKb();

  // ---- Step 5: policy-gap scenario ----
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

  // ---- Step 6: work sample ----
  const rowsContainer = document.getElementById("kbRows");
  const exportPreview = document.getElementById("exportPreview");

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "kb-row";
    row.innerHTML = `
      <div><div class="col-label">Article used</div><input type="text" class="f-article" value="${esc(prefill.article || "")}"></div>
      <div><div class="col-label">Relevant rule</div><textarea class="f-rule" rows="2">${esc(prefill.rule || "")}</textarea></div>
      <div><div class="col-label">Customer-facing answer</div><textarea class="f-answer" rows="2">${esc(prefill.answer || "")}</textarea></div>
    `;
    rowsContainer.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".kb-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Article used</th><th>Relevant rule</th><th>Customer-facing answer</th></tr>';
    rows.forEach((row) => {
      const article = row.querySelector(".f-article").value.trim();
      const rule = row.querySelector(".f-rule").value.trim();
      const answer = row.querySelector(".f-answer").value.trim();
      if (article || rule || answer) filled++;
      html += `<tr><td>${esc(article) || "—"}</td><td>${esc(rule) || "—"}</td><td>${esc(answer) || "—"}</td></tr>`;
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

  addRow({ article: "Shipping Delay", rule: "Escalate to carrier if delayed more than 5 business days", answer: "I'm sorry for the delay — I've checked the latest tracking and it hasn't updated in 3 days, so I'm escalating this to the carrier now." });
  addRow({ article: "Damaged Item", rule: "Replacement or refund within 14 days, with photo evidence", answer: "Thanks for the photos — since this was delivered 5 days ago, you're eligible for a replacement or a refund. Which would you prefer?" });

  show(1);
})();
