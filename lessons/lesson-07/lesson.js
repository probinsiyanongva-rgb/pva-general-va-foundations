(function () {
  const LESSON_ID = 7;
  const TOTAL_STEPS = 9;
  let current = 1;

  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const rail = document.getElementById("stepRail");
  const label = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepNav = document.getElementById("stepNav");

  const gatedSteps = { 5: false, 6: false, 7: false, 8: false };

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

  // ---- Step 5: pick the standardized version ----
  const stdItems = [
    { prompt: "Name field contains:", bad: "maria cruz / Maria Cruz / MARIA CRUZ", options: ["maria cruz", "Maria Cruz", "MARIA CRUZ"], correct: "Maria Cruz", reason: "One agreed capitalization convention (Title Case) — pick one and apply it everywhere." },
    { prompt: "Phone field contains:", bad: "0917-123-4567 / +639171234567", options: ["Whichever format is shorter to type", "The client's required format", "Mixed formats, since both are technically valid"], correct: "The client's required format", reason: "Standardization means matching what the client's system expects, not just picking one that looks tidy." },
    { prompt: "Date field contains:", bad: "01/02/26 / 2026-02-01", options: ["01/02/26, since it's shorter", "2026-02-01 (or another single agreed format), applied consistently", "Leave both — context makes it clear"], correct: "2026-02-01 (or another single agreed format), applied consistently", reason: "01/02/26 is genuinely ambiguous (Jan 2 or Feb 1?) — one unambiguous standard removes the guesswork." },
    { prompt: "Status field contains:", bad: "active / Active / ACTIVE", options: ["Whichever the majority of rows already use", "Active (or another single controlled value), applied everywhere", "Leave as-is — sorting still mostly works"], correct: "Active (or another single controlled value), applied everywhere", reason: "Controlled values matter for filtering and formulas — inconsistent casing can silently break both." },
  ];
  let stdChecked = 0;

  function initStd() {
    const container = document.getElementById("stdItems");
    stdItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "std-item";
      const opts = item.options.map((o) => `<button class="opt-btn" data-value="${esc(o)}" data-idx="${idx}">${esc(o)}</button>`).join("");
      div.innerHTML = `
        <div class="prompt"><strong>${item.prompt}</strong> <span class="bad">${item.bad}</span></div>
        <div class="opt-row">${opts}</div>
        <div class="item-feedback" id="stdFeedback${idx}"></div>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const item = stdItems[idx];
        const group = container.querySelectorAll(`.opt-btn[data-idx="${idx}"]`);
        const correct = btn.dataset.value === item.correct;
        group.forEach((b) => (b.disabled = true));
        btn.classList.add(correct ? "selected-correct" : "selected-incorrect");
        const feedback = document.getElementById("stdFeedback" + idx);
        feedback.textContent = (correct ? "✓ " : "✗ ") + item.reason;
        feedback.className = "item-feedback show " + (correct ? "correct" : "incorrect");
        if (!btn.closest(".std-item").dataset.done) {
          btn.closest(".std-item").dataset.done = "1";
          stdChecked++;
          document.getElementById("stdScore").textContent = stdChecked + " of " + stdItems.length + " checked.";
          if (stdChecked === stdItems.length) { gatedSteps[5] = true; updateGate(); }
        }
      });
    });
  }
  initStd();

  // ---- Step 6: spot the duplicates ----
  const records = [
    "1. Maria Cruz — 0917-123-4567 — Active",
    "2. MARIA CRUZ — +639171234567 — ACTIVE",
    "3. Juan Dela Cruz — 0918-222-3333 — Active",
    "4. Ana Reyes — 0919-444-5555 — Active",
    "5. juan dela cruz — 0918-222-3333 — active",
    "6. Ben Santos — 0920-666-7777 — Inactive",
    "7. Liza Cruz — 0921-888-9999 — Active",
    "8. Carlo Tan — 0922-000-1111 — Active",
  ];
  const correctDupIdx = [1, 4]; // 0-based: record 2 and record 5
  let flagged = new Set();

  function initDup() {
    const list = document.getElementById("dupList");
    records.forEach((r, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "record-chip";
      btn.textContent = r;
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        if (flagged.has(idx)) { flagged.delete(idx); btn.classList.remove("flagged"); }
        else { flagged.add(idx); btn.classList.add("flagged"); }
      });
      list.appendChild(btn);
    });
  }
  initDup();

  document.getElementById("dupCheckBtn").addEventListener("click", () => {
    const feedback = document.getElementById("dupFeedback");
    const correctSet = new Set(correctDupIdx);
    const isCorrect = flagged.size === correctSet.size && [...flagged].every((i) => correctSet.has(i));
    document.querySelectorAll(".record-chip").forEach((btn) => (btn.disabled = true));
    if (isCorrect) {
      feedback.textContent = "✓ Correct — records 2 and 5 are the duplicate (later) entries of records 1 and 3, just reformatted.";
      feedback.className = "feedback-box show correct";
    } else {
      feedback.textContent = "✗ Not quite. The duplicates are records 2 (same person as 1, reformatted) and 5 (same person as 3, reformatted). Everything else is a genuinely different contact.";
      feedback.className = "feedback-box show incorrect";
    }
    gatedSteps[6] = true;
    updateGate();
  });

  // ---- Step 7: decision scenario ----
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

  // ---- Step 8: work sample ----
  const rowsContainer = document.getElementById("cleanRows");
  const exportPreview = document.getElementById("exportPreview");
  const rulesUsed = document.getElementById("rulesUsed");

  function addRow(prefill) {
    prefill = prefill || {};
    const row = document.createElement("div");
    row.className = "clean-row";
    row.innerHTML = `
      <div><div class="col-label">Original</div><textarea class="f-original" rows="2">${esc(prefill.original || "")}</textarea></div>
      <div><div class="col-label">Cleaned</div><textarea class="f-cleaned" rows="2">${esc(prefill.cleaned || "")}</textarea></div>
    `;
    rowsContainer.appendChild(row);
    row.querySelectorAll("textarea").forEach((el) => el.addEventListener("input", updateExport));
    updateExport();
  }

  function updateExport() {
    const rows = Array.from(rowsContainer.querySelectorAll(".clean-row"));
    let filled = 0;
    let html = '<table class="ref-table"><tr><th>Original</th><th>Cleaned</th></tr>';
    rows.forEach((row) => {
      const orig = row.querySelector(".f-original").value.trim();
      const clean = row.querySelector(".f-cleaned").value.trim();
      if (orig || clean) filled++;
      html += `<tr><td>${esc(orig) || "—"}</td><td>${esc(clean) || "—"}</td></tr>`;
    });
    html += "</table>";
    const rules = rulesUsed.value.trim();
    html += `<p style="margin-top:10px;"><strong>Rules used:</strong> ${esc(rules) || "<span class='small'>Not written yet.</span>"}</p>`;
    exportPreview.innerHTML = html;
    gatedSteps[8] = filled >= 2 && rules.length > 5;
    updateGate();
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  rulesUsed.addEventListener("input", updateExport);

  addRow({ original: "maria cruz, 0917-123-4567, active", cleaned: "Maria Cruz, +63 917 123 4567, Active" });
  addRow({ original: "JUAN DELA CRUZ, 0918.222.3333, ACTIVE", cleaned: "Juan Dela Cruz, +63 918 222 3333, Active" });

  show(1);
})();
