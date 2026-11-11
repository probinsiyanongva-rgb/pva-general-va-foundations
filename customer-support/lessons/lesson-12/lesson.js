(function () {
  const LESSON_ID = 12;
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

  // ---- Step 4: three quick mini-scenarios ----
  const miniScenarios = [
    {
      msg: "A customer asks you to send their account details to a different email address than the one on file.",
      options: [
        { text: "Send it right away — they asked, so it must be them.", correct: false },
        { text: "Verify identity and authorization before sending anything to a different address.", correct: true },
        { text: "Send it, but only if they say please.", correct: false },
      ],
      reason: "Verify identity and authorization first — a request alone doesn't confirm who's actually asking.",
    },
    {
      msg: "You want to paste a ticket containing customer information into an AI tool to draft a reply faster.",
      options: [
        { text: "Paste it in — it saves time and the tool seems trustworthy.", correct: false },
        { text: "Check whether this is an approved AI workflow for customer data before pasting anything.", correct: true },
        { text: "Paste in just the customer's first name, that should be safe enough.", correct: false },
      ],
      reason: "Check whether the client has approved that AI workflow for customer data — don't assume it's fine because it's convenient.",
    },
    {
      msg: "You realize you sent a customer's personal information to the wrong recipient.",
      options: [
        { text: "Say nothing and hope it goes unnoticed.", correct: false },
        { text: "Report the incident promptly through the client's process — don't hide it.", correct: true },
        { text: "Wait to see if anyone notices before doing anything.", correct: false },
      ],
      reason: "Report the incident promptly; don't hide it. Delay only makes the situation harder to contain.",
    },
  ];
  let miniChecked = 0;

  function initMiniScenarios() {
    const container = document.getElementById("miniScenarios");
    miniScenarios.forEach((sc, idx) => {
      const div = document.createElement("div");
      div.className = "mini-scenario";
      const opts = sc.options.map((o, oi) => `<button class="opt-btn" data-idx="${idx}" data-oi="${oi}" data-correct="${o.correct}">${esc(o.text)}</button>`).join("");
      div.innerHTML = `<div class="msg">${esc(sc.msg)}</div><div class="opt-row">${opts}</div><div class="item-feedback" id="miniFeedback${idx}"></div>`;
      container.appendChild(div);
    });
    container.querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const correct = btn.dataset.correct === "true";
        const group = container.querySelectorAll(`.opt-btn[data-idx="${idx}"]`);
        group.forEach((b) => (b.disabled = true));
        btn.classList.add(correct ? "selected-correct" : "selected-incorrect");
        const feedback = document.getElementById("miniFeedback" + idx);
        feedback.textContent = (correct ? "✓ " : "✗ ") + miniScenarios[idx].reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.closest(".mini-scenario").dataset.done) {
          btn.closest(".mini-scenario").dataset.done = "1";
          miniChecked++;
          if (miniChecked === miniScenarios.length) { gatedSteps[4] = true; updateGate(); }
        }
      });
    });
  }
  initMiniScenarios();

  // ---- Step 5: partial-verification scenario ----
  (function wireScenario() {
    const container = document.getElementById("verifyOptions");
    const feedback = document.getElementById("verifyFeedback");
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

  // ---- Step 6: Security Checklist ----
  const CHECKLIST_ITEMS = [
    "MFA enabled where available",
    "Access is limited to what I need",
    "I use approved tools and storage for customer data",
    "I verify identity/authorization before sharing account details",
    "I know how to respond to a privacy/security incident",
    "I know what can and can't be pasted into AI tools",
  ];
  const answers = {};
  const exportPreview = document.getElementById("exportPreview");

  function initChecklist() {
    const container = document.getElementById("checklistRows");
    CHECKLIST_ITEMS.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "checklist-row";
      row.innerHTML = `
        <div class="item-label">${item}</div>
        <div class="yn-toggle">
          <button type="button" data-idx="${idx}" data-val="yes">Yes</button>
          <button type="button" data-idx="${idx}" data-val="no">No</button>
        </div>
        <div></div>
        <div><input type="text" class="f-note" data-idx="${idx}" placeholder="Notes"></div>
      `;
      container.appendChild(row);
    });
    container.querySelectorAll(".yn-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.idx;
        answers[idx] = btn.dataset.val;
        const group = container.querySelectorAll(`.yn-toggle button[data-idx="${idx}"]`);
        group.forEach((b) => b.classList.remove("active-yes", "active-no"));
        btn.classList.add(btn.dataset.val === "yes" ? "active-yes" : "active-no");
        updateChecklistExport();
      });
    });
    container.querySelectorAll(".f-note").forEach((input) => input.addEventListener("input", updateChecklistExport));
  }
  initChecklist();

  function updateChecklistExport() {
    const notes = document.querySelectorAll(".f-note");
    let html = '<table class="ref-table"><tr><th>Check</th><th>Yes/No</th><th>Notes</th></tr>';
    let answered = 0;
    CHECKLIST_ITEMS.forEach((item, idx) => {
      const val = answers[idx] ? answers[idx].toUpperCase() : "—";
      if (answers[idx]) answered++;
      const note = notes[idx] ? notes[idx].value.trim() : "";
      html += `<tr><td>${item}</td><td>${val}</td><td>${esc(note) || "—"}</td></tr>`;
    });
    html += "</table>";
    exportPreview.innerHTML = html;
    gatedSteps[6] = answered >= 4;
    updateGate();
  }
  updateChecklistExport();

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("printBtn").addEventListener("click", () => window.print());

  show(1);
})();
