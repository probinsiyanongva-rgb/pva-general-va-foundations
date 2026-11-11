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
  // TASK 1 — Email triage (10 messages)
  // =========================================================
  const CATEGORIES = [
    { value: "reply", label: "Reply" },
    { value: "client_review", label: "Client review" },
    { value: "action", label: "Action" },
    { value: "waiting", label: "Waiting" },
    { value: "reference", label: "Reference" },
    { value: "archive", label: "Archive" },
  ];
  const emailItems = [
    { msg: "Kitchen faucet leak — customer wants a same-day visit", accept: ["action"], reason: "Action — needs scheduling right away." },
    { msg: "Monthly newsletter from a home-services supplier", accept: ["reference", "archive"], reason: "Reference or Archive — no action needed." },
    { msg: "Quote approved by customer, please schedule installation", accept: ["action"], reason: "Action — move straight to scheduling." },
    { msg: "Following up on a quote sent last week — no response yet", accept: ["waiting", "action"], reason: "Waiting — track it and follow up if it stays quiet." },
    { msg: "Insurance renewal invoice, $1,200, due in 10 days", accept: ["client_review"], reason: "Client review — a payment of this size needs the owner's approval." },
    { msg: "Thank-you note from a happy customer", accept: ["archive"], reason: "Archive — nice to keep, no action needed." },
    { msg: "Subcontractor asking about next week's schedule", accept: ["action"], reason: "Action — needs a scheduling reply." },
    { msg: "Customer disputing a charge on their invoice", accept: ["client_review"], reason: "Client review — a billing dispute isn't yours to resolve alone." },
    { msg: "Reminder: annual business permit renewal due next month", accept: ["action"], reason: "Action — needs to go on the task tracker." },
    { msg: "Spam-looking email about 'exclusive contractor leads'", accept: ["archive"], reason: "Archive — not a real business inquiry." },
  ];
  let emailChecked = 0;

  function initEmailTask() {
    const container = document.getElementById("emailItems");
    emailItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "triage-item";
      const options = CATEGORIES.map((c) => `<option value="${c.value}">${c.label}</option>`).join("");
      div.innerHTML = `
        <div class="msg">"${esc(item.msg)}"</div>
        <select id="emailSelect${idx}"><option value="">Choose a category…</option>${options}</select>
        <button class="btn btn-ghost check-btn no-print" type="button" data-idx="${idx}">Check</button>
        <div class="item-feedback" id="emailFeedback${idx}"></div>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll(".check-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const select = document.getElementById("emailSelect" + idx);
        const feedback = document.getElementById("emailFeedback" + idx);
        if (!select.value) return;
        const item = emailItems[idx];
        const correct = item.accept.includes(select.value);
        feedback.textContent = (correct ? "✓ " : "✗ ") + item.reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.dataset.done) {
          btn.dataset.done = "1";
          emailChecked++;
          document.getElementById("emailScore").textContent = emailChecked + " of " + emailItems.length + " checked.";
          if (emailChecked === emailItems.length) {
            gatedSteps[2] = true;
            window.PVAFT.markFinalTaskComplete("task1_email");
            updateGate();
          }
        }
      });
    });
  }
  initEmailTask();

  // =========================================================
  // TASK 2 — Calendar
  // =========================================================
  const calAnswer = document.getElementById("calAnswer");
  calAnswer.addEventListener("input", () => {
    gatedSteps[3] = calAnswer.value.trim().length > 20;
    if (gatedSteps[3]) window.PVAFT.markFinalTaskComplete("task2_calendar");
    updateGate();
  });
  document.getElementById("calRevealBtn").addEventListener("click", () => {
    document.getElementById("calModel").classList.add("show");
    gatedSteps[3] = true;
    window.PVAFT.markFinalTaskComplete("task2_calendar");
    updateGate();
  });

  // =========================================================
  // TASK 3 — Spreadsheet cleanup
  // =========================================================
  const task3Rows = document.getElementById("task3Rows");
  const task3Rules = document.getElementById("task3Rules");

  function addTask3Row(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "clean-row";
    row.innerHTML = `
      <div><div class="col-label">Original</div><textarea class="t3-original" rows="2">${esc(prefill.original || "")}</textarea></div>
      <div><div class="col-label">Cleaned</div><textarea class="t3-cleaned" rows="2">${esc(prefill.cleaned || "")}</textarea></div>
    `;
    task3Rows.appendChild(row);
    row.querySelectorAll("textarea").forEach((el) => el.addEventListener("input", checkTask3Gate));
    checkTask3Gate();
  }

  function checkTask3Gate() {
    const rows = Array.from(task3Rows.querySelectorAll(".clean-row"));
    let filled = 0;
    rows.forEach((row) => {
      const c = row.querySelector(".t3-cleaned").value.trim();
      if (c.length > 0) filled++;
    });
    const rulesOk = task3Rules.value.trim().length > 5;
    gatedSteps[4] = filled >= 2 && rulesOk;
    if (gatedSteps[4]) window.PVAFT.markFinalTaskComplete("task3_spreadsheet");
    updateGate();
  }
  task3Rules.addEventListener("input", checkTask3Gate);

  addTask3Row({ original: "juan santos, 0917.222.4444, active, no email on file", cleaned: "Juan Santos, +63 917 222 4444, Active, email missing — flag for follow-up" });
  addTask3Row({ original: "MARIA LOPEZ / Maria  Lopez (duplicate entry), 0918-555-1212, ACTIVE", cleaned: "Maria Lopez, +63 918 555 1212, Active — duplicate entry merged" });
  addTask3Row({});

  // =========================================================
  // TASK 4 — Research
  // =========================================================
  const task4Rows = document.getElementById("task4Rows");

  function addTask4Row() {
    const row = document.createElement("div");
    row.className = "research-row";
    row.innerHTML = `
      <div><div class="col-label">Tool</div><input type="text" class="t4-tool"></div>
      <div><div class="col-label">Price checked</div><input type="text" class="t4-price"></div>
      <div><div class="col-label">Key features</div><textarea class="t4-features" rows="2"></textarea></div>
      <div><div class="col-label">Pros</div><textarea class="t4-pros" rows="2"></textarea></div>
      <div><div class="col-label">Cons</div><textarea class="t4-cons" rows="2"></textarea></div>
      <div><div class="col-label">Source</div><input type="text" class="t4-source"></div>
    `;
    task4Rows.appendChild(row);
    row.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", checkTask4Gate));
    checkTask4Gate();
  }

  function checkTask4Gate() {
    const rows = Array.from(task4Rows.querySelectorAll(".research-row"));
    let filled = 0;
    rows.forEach((row) => { if (row.querySelector(".t4-tool").value.trim().length > 0) filled++; });
    gatedSteps[5] = filled >= 2;
    if (gatedSteps[5]) window.PVAFT.markFinalTaskComplete("task4_research");
    updateGate();
  }

  addTask4Row(); addTask4Row(); addTask4Row();

  // =========================================================
  // TASK 5 — SOP
  // =========================================================
  const SOP_FIELDS = ["Purpose", "Trigger", "Inputs", "Tools/access", "Steps", "Exceptions", "Escalation", "Definition of done"];
  const task5Container = document.getElementById("task5Fields");

  SOP_FIELDS.forEach((f) => {
    const div = document.createElement("div");
    div.className = "sop-field";
    div.innerHTML = `<label>${f}</label><textarea rows="2" class="t5-field" data-field="${f}"></textarea>`;
    task5Container.appendChild(div);
  });
  task5Container.querySelectorAll(".t5-field").forEach((el) => el.addEventListener("input", checkTask5Gate));

  function checkTask5Gate() {
    const filled = Array.from(task5Container.querySelectorAll(".t5-field")).filter((t) => t.value.trim().length > 0).length;
    gatedSteps[6] = filled >= 4;
    if (gatedSteps[6]) window.PVAFT.markFinalTaskComplete("task5_sop");
    updateGate();
  }

  // =========================================================
  // TASK 6 — Task management
  // =========================================================
  const task6Rows = document.getElementById("task6Rows");
  const T6_COLS = ["task", "priority", "due", "dependency", "status", "next", "followup"];
  const T6_LABELS = ["Task", "Priority", "Due", "Dependency", "Status", "Next action", "Follow-up"];

  function addTask6Row(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "tracker-row";
    row.innerHTML = T6_COLS.map((c, i) => `
      <div><div class="col-label">${T6_LABELS[i]}</div><input type="text" class="t6-${c}" value="${esc(prefill[c] || "")}"></div>
    `).join("");
    task6Rows.appendChild(row);
    row.querySelectorAll("input").forEach((el) => el.addEventListener("input", checkTask6Gate));
    checkTask6Gate();
  }

  function checkTask6Gate() {
    const rows = Array.from(task6Rows.querySelectorAll(".tracker-row"));
    let filled = 0;
    rows.forEach((row) => { if (row.querySelector(".t6-task").value.trim().length > 0) filled++; });
    gatedSteps[7] = filled >= 3;
    if (gatedSteps[7]) window.PVAFT.markFinalTaskComplete("task6_tracker");
    updateGate();
  }

  document.getElementById("addTask6RowBtn").addEventListener("click", () => addTask6Row());
  addTask6Row({ task: "Schedule approved installation", priority: "High", due: "This week", dependency: "Customer confirms preferred day", status: "Waiting", next: "Follow up with customer", followup: "Tomorrow" });
  addTask6Row({ task: "Renew annual business permit", priority: "Medium", due: "Next month", dependency: "—", status: "Not started", next: "Check renewal requirements", followup: "In 2 weeks" });

  // =========================================================
  // TASK 7 — AI assistance
  // =========================================================
  const task7Used = document.getElementById("task7Used");
  const task7Verify = document.getElementById("task7Verify");
  function checkTask7Gate() {
    gatedSteps[8] = task7Used.value.trim().length > 5 && task7Verify.value.trim().length > 5;
    if (gatedSteps[8]) window.PVAFT.markFinalTaskComplete("task7_ai");
    updateGate();
  }
  task7Used.addEventListener("input", checkTask7Gate);
  task7Verify.addEventListener("input", checkTask7Gate);

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
    if (gatedSteps[9]) window.PVAFT.markFinalTaskComplete("task8_security");
    updateGate();
  }

  // =========================================================
  // STEP 10 — Final submission checklist
  // =========================================================
  const FINAL_CHECKLIST_ITEMS = [
    "I understood each request before acting.",
    "I documented important assumptions and clarification questions.",
    "I prioritized work rather than simply processing it in arrival order.",
    "I checked my work before delivery.",
    "I stayed within the client's authority.",
    "I handled information responsibly.",
    "I communicated status and exceptions clearly.",
    "My files are organized and easy to understand.",
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
