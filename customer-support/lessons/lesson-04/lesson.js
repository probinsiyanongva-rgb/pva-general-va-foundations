(function () {
  const LESSON_ID = 4;
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

  // Step 3 & 4: scenarios
  function wireScenario(containerId, feedbackId, gateStep) {
    const container = document.getElementById(containerId);
    const feedback = document.getElementById(feedbackId);
    const buttons = Array.from(container.querySelectorAll(".option-btn"));
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const correct = btn.dataset.correct === "true";
        buttons.forEach((b) => (b.disabled = true));
        btn.classList.add(correct ? "selected-correct" : "selected-incorrect");
        feedback.textContent = (correct ? "✓ " : "✗ ") + btn.dataset.feedback;
        feedback.className = "feedback-box show " + (correct ? "correct" : "incorrect");
        gatedSteps[gateStep] = true;
        updateGate();
      });
    });
  }
  wireScenario("channelOptions", "channelFeedback", 3);
  wireScenario("templateOptions", "templateFeedback", 4);

  // Step 5: Solved Ticket Set work sample
  const TICKETS = [
    { key: "wrong_item", title: "Wrong item received" },
    { key: "account_access", title: "Account access issue" },
    { key: "order_delayed", title: "Order delayed" },
    { key: "product_question", title: "Product question" },
    { key: "refund_request", title: "Refund request" },
  ];
  const exportPreview = document.getElementById("exportPreview");

  function initTickets() {
    const container = document.getElementById("ticketFields");
    TICKETS.forEach((t) => {
      const div = document.createElement("div");
      div.className = "ticket-field";
      div.innerHTML = `
        <div class="ticket-title">${t.title}</div>
        <div class="subfield"><div class="col-label">Response</div><textarea class="t-response" data-key="${t.key}" rows="2"></textarea></div>
        <div class="subfield"><div class="col-label">Next action</div><input type="text" class="t-next" data-key="${t.key}"></div>
        <div class="subfield" style="margin-bottom:0;"><div class="col-label">Status</div><input type="text" class="t-status" data-key="${t.key}"></div>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll("textarea, input").forEach((el) => el.addEventListener("input", updateExport));
  }
  initTickets();

  function updateExport() {
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Ticket</th><th>Response</th><th>Next action</th><th>Status</th></tr>';
    TICKETS.forEach((t) => {
      const response = document.querySelector(`.t-response[data-key="${t.key}"]`).value.trim();
      const next = document.querySelector(`.t-next[data-key="${t.key}"]`).value.trim();
      const status = document.querySelector(`.t-status[data-key="${t.key}"]`).value.trim();
      if (response || next || status) filled++;
      html += `<tr><td>${t.title}</td><td>${esc(response) || "—"}</td><td>${esc(next) || "—"}</td><td>${esc(status) || "—"}</td></tr>`;
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

  document.getElementById("printBtn").addEventListener("click", () => window.print());
  updateExport();

  show(1);
})();
