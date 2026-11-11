(function () {
  const LESSON_ID = 4;
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

  // ---- Step 6: classify-the-inbox interactive ----
  const CATEGORIES = [
    { value: "reply", label: "Reply" },
    { value: "client_review", label: "Client review" },
    { value: "action", label: "Action" },
    { value: "waiting", label: "Waiting" },
    { value: "reference", label: "Reference" },
    { value: "archive", label: "Archive" },
  ];
  const triageItems = [
    { msg: "Meeting moved from 10 AM to 2 PM", accept: ["action"], reason: "Action — update/confirm the calendar." },
    { msg: "Industry newsletter", accept: ["reference", "archive"], reason: "Reference or Archive — no immediate action needed." },
    { msg: "Proposal needs client approval", accept: ["client_review"], reason: "Client review — send or flag for approval." },
    { msg: "Checking in on information requested last week", accept: ["action", "waiting"], reason: "Action — check the previous request, and log it as a follow-up." },
    { msg: "Software renews tomorrow for $499", accept: ["client_review", "action"], reason: "Client review — confirm the client's instruction before it renews." },
    { msg: "Thank you; issue resolved", accept: ["archive"], reason: "Archive — the conversation is complete." },
  ];
  let triageChecked = 0;

  function initTriage() {
    const container = document.getElementById("triageItems");
    triageItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "triage-item";
      const options = CATEGORIES.map((c) => `<option value="${c.value}">${c.label}</option>`).join("");
      div.innerHTML = `
        <div class="msg">"${item.msg}"</div>
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
          if (triageChecked === triageItems.length) { gatedSteps[6] = true; updateGate(); }
        }
      });
    });
  }
  initTriage();

  // ---- Step 7: authority scenario ----
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

  // ---- Step 8: Inbox Triage Sheet work sample ----
  const rowsContainer = document.getElementById("triageRows");
  const exportPreview = document.getElementById("exportPreview");
  const COLS = ["email", "sender", "subject", "category", "priority", "action", "owner", "followup", "status"];
  const COL_LABELS = ["Email #", "Sender", "Subject", "Category", "Priority", "Action", "Owner", "Follow-up", "Status"];

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "triage-row";
    row.innerHTML = COLS.map((c, i) => `
      <div>
        <div class="col-label">${COL_LABELS[i]}</div>
        <input type="text" class="f-${c}" value="${prefill[c] ? esc(prefill[c]) : ""}">
      </div>
    `).join("");
    rowsContainer.appendChild(row);
    row.querySelectorAll("input").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".triage-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr>' + COL_LABELS.map((l) => `<th>${l}</th>`).join("") + "</tr>";
    rows.forEach((row) => {
      const vals = COLS.map((c) => row.querySelector(".f-" + c).value.trim());
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

  addRow({ email: "1", sender: "ops@vendor.com", subject: "Meeting moved from 10 AM to 2 PM", category: "Action", priority: "Medium", action: "Update calendar", owner: "You", followup: "—", status: "Open" });
  addRow({ email: "2", sender: "customer@example.com", subject: "Refund threat re: 1-star review", category: "Client review", priority: "High", action: "Flag to client", owner: "Client", followup: "Today", status: "Open" });

  show(1);
})();
