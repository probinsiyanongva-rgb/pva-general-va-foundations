/* ==========================================================================
   General Admin VA v2.0 — shared activity library (PVAGAActivities)
   --------------------------------------------------------------------------
   One implementation of every gated activity, used by all 13 lessons and the
   Final Project (spec T1). Requires, loaded before it:
     shared/pva-core/progress-core.js, shared/ga/manifest.js, shared/ga/validators.js

   Mastery rule (spec "Assessment model"): Continue unlocks only from a
   correct, current state. Wrong answers never unlock anything. Retries are
   always allowed. Model answers never unlock anything.

   Written work is checked for STRUCTURE only (clarification 3). Its labels say
   "Required parts complete" / "Missing: …", never "Correct".

   Accessibility: native buttons/inputs with real labels, keyboard operable
   sorting, a polite live region per activity, text markers (not colour only),
   focus moved to the step heading on step change.
   ========================================================================== */
(function (root) {
  "use strict";

  const GA = root.PVAGA;
  const V = root.PVAGAValidators;
  if (!GA || !V) throw new Error("PVAGAActivities needs manifest.js and validators.js loaded first");
  const COPY = V.__meta.COPY;

  /* ---------------- shared store ---------------- */
  let store = null;
  function getStore() {
    if (!store) store = GA.createProgress({ rules: V });
    return store;
  }

  /* ---------------- DOM helpers ---------------- */
  let uidCounter = 0;
  const uid = (p) => `${p}-${++uidCounter}`;
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of children.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  const mark = (ok) => h("span", { class: `ga-mark ${ok ? "ga-mark-ok" : "ga-mark-bad"}`, "aria-hidden": "true" }, ok ? "✓" : "✗");
  function liveRegion() { return h("div", { class: "ga-feedback", role: "status", "aria-live": "polite" }); }
  function say(region, ok, text) {
    region.className = `ga-feedback ${ok === true ? "is-ok" : ok === false ? "is-bad" : ""}`;
    region.replaceChildren();
    if (ok !== null) region.append(mark(ok), h("span", { class: "ga-visually-hidden" }, ok ? "Correct. " : "Not quite. "));
    region.append(document.createTextNode(text));
  }

  // Fisher–Yates (audit E-02). `random` is injectable for tests.
  function shuffle(list, random = Math.random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // flush() runs only when a call is still pending, so leaving a page never
  // re-saves an untouched form over a stored answer.
  function debounce(fn, ms) {
    let t = null;
    const d = (...args) => { clearTimeout(t); t = setTimeout(() => { t = null; fn(...args); }, ms); };
    d.flush = (...args) => { if (t !== null) { clearTimeout(t); t = null; fn(...args); } };
    return d;
  }
  const passed = (id) => getStore().requirementStatus(id).passed;

  /* ---------------- storage banner (M-03) ---------------- */
  function mountStorageBanner(target) {
    const host = target || document.querySelector("main") || document.body;
    getStore().on("storage-unavailable", () => {
      if (document.querySelector(".ga-storage-banner")) return;
      const banner = h("div", { class: "ga-storage-banner", role: "alert" },
        h("strong", {}, "Your progress is not being saved in this browser. "),
        "Site storage is blocked or full (this often happens in private windows and some in-app browsers). You can keep working on this page, but your answers and completion will be lost when you leave. Open the course in Chrome or Safari with site storage enabled.");
      host.prepend(banner);
    });
  }

  /* ---------------- skip link (m-03) ---------------- */
  function mountSkipLink(mainEl) {
    const main = mainEl || document.querySelector("main");
    if (!main || document.querySelector(".ga-skip")) return;
    if (!main.id) main.id = "main";
    document.body.prepend(h("a", { class: "ga-skip", href: `#${main.id}` }, "Skip to lesson content"));
  }

  /* ======================================================================
     Choice items (scenario, choice-set, fp-t8 option)
     ====================================================================== */
  // item: { prompt?, options:[{ id, text, correct, feedback }], hint? }
  function renderChoiceItem(container, item, { random, alreadyPassed, onResult }) {
    const optionsEl = h("div", { class: "ga-options", role: "group", "aria-label": item.prompt || "Choose an answer" });
    const region = liveRegion();
    const hintEl = h("p", { class: "ga-hint", hidden: true });
    const retryBtn = h("button", { type: "button", class: "btn btn-ghost", hidden: true }, "Try again");
    let wrongCount = 0;
    let done = false;

    function draw() {
      optionsEl.replaceChildren();
      for (const opt of shuffle(item.options, random)) {
        const btn = h("button", { type: "button", class: "ga-option", "data-option": opt.id }, opt.text);
        btn.addEventListener("click", () => choose(opt, btn));
        optionsEl.append(btn);
      }
    }
    function lock() { optionsEl.querySelectorAll("button").forEach((b) => { b.disabled = true; }); }
    function choose(opt, btn) {
      if (done) return;
      lock();
      if (opt.correct) {
        done = true;
        btn.classList.add("is-correct");
        btn.prepend(mark(true));
        say(region, true, opt.feedback || "That's the right call.");
        retryBtn.hidden = true;
        onResult(true, opt.id);
      } else {
        wrongCount++;
        btn.classList.add("is-wrong");
        btn.prepend(mark(false));
        say(region, false, (opt.feedback || "That's not the best option.") + " Try again.");
        if (wrongCount >= 2 && item.hint) { hintEl.textContent = "Hint: " + item.hint; hintEl.hidden = false; }
        retryBtn.hidden = false;
        onResult(false, opt.id);
      }
    }
    retryBtn.addEventListener("click", () => { retryBtn.hidden = true; region.className = "ga-feedback"; region.textContent = ""; draw(); optionsEl.querySelector("button").focus(); });

    if (item.prompt) container.append(h("p", { class: "ga-item-prompt" }, item.prompt));
    container.append(optionsEl, region, hintEl, h("div", { class: "ga-actions" }, retryBtn));

    if (alreadyPassed) {
      done = true;
      const right = item.options.find((o) => o.correct);
      for (const o of item.options) {
        const btn = h("button", { type: "button", class: `ga-option${o.correct ? " is-correct" : ""}`, disabled: true, "data-option": o.id }, o.text);
        if (o.correct) btn.prepend(mark(true));
        optionsEl.append(btn);
      }
      say(region, true, right.feedback || "Answered correctly earlier.");
    } else draw();
  }

  // Scenario with one item, or a set of items that pass together (L7 standardize, L12 situations).
  function ChoiceActivity({ container, requirementId, items, random }) {
    const s = getStore();
    const already = passed(requirementId);
    const results = items.map(() => already);
    items.forEach((item, i) => {
      const wrap = items.length > 1 ? h("div", { class: "ga-item" }) : container;
      if (wrap !== container) container.append(wrap);
      renderChoiceItem(wrap, item, {
        random,
        alreadyPassed: already,
        onResult(ok, optionId) {
          if (ok) results[i] = true;
          const all = results.every(Boolean);
          s.recordAttempt(requirementId, { passed: all, answer: all ? { items: results.length, last: optionId } : undefined });
        },
      });
    });
    return { isPassed: () => passed(requirementId) };
  }

  /* ======================================================================
     Sort activity — keyboard + touch + drag (C-03, M-15, m-08)
     ====================================================================== */
  // bins: [{ id, label }], items: [{ id, text, bin, feedback? }]
  function SortActivity({ container, requirementId, bins, items, random, instructions }) {
    const s = getStore();
    const already = passed(requirementId);
    const placement = {}; // itemId -> binId
    let selected = null;
    const region = liveRegion();
    const pool = h("div", { class: "ga-pool", role: "group", "aria-label": "Items to sort" });
    const board = h("div", { class: "ga-board", "data-cols": String(Math.min(bins.length, 3)) });
    const checkBtn = h("button", { type: "button", class: "btn btn-primary", disabled: true }, "Check my sorting");
    const chips = {};
    const binEls = {};

    function select(id) {
      selected = selected === id ? null : id;
      Object.entries(chips).forEach(([cid, el]) => el.setAttribute("aria-pressed", String(cid === selected)));
      Object.values(binEls).forEach((b) => { b.place.disabled = !selected; });
      if (selected) say(region, null, `Selected "${items.find((i) => i.id === selected).text}". Now choose a bin.`);
    }
    function placeInto(binId) {
      if (!selected) return;
      const id = selected;
      placement[id] = binId;
      const chip = chips[id];
      chip.classList.remove("is-correct", "is-wrong");
      chip.querySelectorAll(".ga-mark, .ga-visually-hidden").forEach((m) => m.remove());
      binEls[binId].items.append(chip);
      selected = null;
      Object.values(chips).forEach((el) => el.setAttribute("aria-pressed", "false"));
      Object.values(binEls).forEach((b) => { b.place.disabled = true; });
      checkBtn.disabled = Object.keys(placement).length !== items.length;
      say(region, null, `Placed in ${bins.find((b) => b.id === binId).label}. ${items.length - Object.keys(placement).length} left to place.`);
      chip.focus();
    }
    function check(restoring = false) {
      let right = 0;
      for (const it of items) {
        const chip = chips[it.id];
        chip.querySelectorAll(".ga-mark, .ga-visually-hidden").forEach((m) => m.remove());
        const ok = placement[it.id] === it.bin;
        if (ok) right++;
        chip.classList.toggle("is-correct", ok);
        chip.classList.toggle("is-wrong", !ok);
        chip.prepend(mark(ok), h("span", { class: "ga-visually-hidden" }, ok ? "Right bin: " : "Wrong bin: "));
      }
      const all = right === items.length;
      if (!restoring) s.recordAttempt(requirementId, { passed: all, answer: all ? { placement } : undefined });
      if (all) {
        say(region, true, `All ${items.length} items are in the right bin.`);
        Object.values(chips).forEach((c) => { c.disabled = true; });
        Object.values(binEls).forEach((b) => { b.place.disabled = true; });
        checkBtn.disabled = true;
      } else {
        say(region, false, `${right} of ${items.length} are in the right bin. Items marked ✗ are in the wrong bin — select one and move it, then check again.`);
      }
    }

    for (const it of shuffle(items, random)) {
      const chip = h("button", { type: "button", class: "ga-chip", "aria-pressed": "false", draggable: "true", "data-item": it.id }, it.text);
      chip.addEventListener("click", () => select(it.id));
      chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", it.id); selected = it.id; });
      chips[it.id] = chip;
      pool.append(chip);
    }
    for (const b of bins) {
      const titleId = uid("bin");
      const place = h("button", { type: "button", class: "btn btn-ghost ga-bin-place", disabled: true, "aria-describedby": titleId }, `Place selected item here`);
      const list = h("div", { class: "ga-bin-items" });
      const bin = h("section", { class: "ga-bin", "data-bin": b.id, "aria-labelledby": titleId },
        h("h4", { class: "ga-bin-title", id: titleId }, b.label), place, list);
      place.addEventListener("click", () => placeInto(b.id));
      bin.addEventListener("dragover", (e) => { e.preventDefault(); bin.classList.add("dragover"); });
      bin.addEventListener("dragleave", () => bin.classList.remove("dragover"));
      bin.addEventListener("drop", (e) => { e.preventDefault(); bin.classList.remove("dragover"); selected = e.dataTransfer.getData("text/plain") || selected; placeInto(b.id); });
      binEls[b.id] = { el: bin, place, items: list };
      board.append(bin);
    }
    checkBtn.addEventListener("click", () => check());

    container.append(
      h("p", { class: "small" }, instructions || "Select an item (click, tap, or Tab + Enter), then choose “Place selected item here” in a bin. You can move items until you check."),
      pool, board, h("div", { class: "ga-actions" }, checkBtn), region);

    if (already) {
      for (const it of items) { placement[it.id] = it.bin; selected = it.id; placeInto(it.bin); }
      check(true);
    }
    return { isPassed: () => passed(requirementId) };
  }

  /* ======================================================================
     Triage — one select per item (L4, L8 new 4, FP T1)
     ====================================================================== */
  // categories: [{ value, label }], items: [{ id, text, accept:[values], feedback }]
  function TriageActivity({ container, requirementId, categories, items, legend }) {
    const s = getStore();
    const already = passed(requirementId);
    const region = liveRegion();
    const selects = {};
    const lines = {};
    const list = h("div", {});
    for (const it of items) {
      const sid = uid("tri");
      const sel = h("select", { id: sid }, h("option", { value: "" }, "Choose a category…"), ...categories.map((c) => h("option", { value: c.value }, c.label)));
      const line = h("div", { class: "ga-result-line", "aria-live": "polite" });
      selects[it.id] = sel;
      lines[it.id] = line;
      list.append(h("div", { class: "ga-item" },
        h("div", { class: "ga-triage-row" }, h("label", { for: sid }, `“${it.text}”`), sel), line));
    }
    const checkBtn = h("button", { type: "button", class: "btn btn-primary" }, "Check all");
    const labelOf = (v) => (categories.find((c) => c.value === v) || {}).label || v;
    function check(restoring = false) {
      let right = 0, answered = 0;
      for (const it of items) {
        const v = selects[it.id].value;
        const line = lines[it.id];
        line.replaceChildren();
        if (!v) { line.append("Choose a category for this message."); continue; }
        answered++;
        const ok = it.accept.includes(v);
        if (ok) right++;
        const acceptedText = it.accept.map(labelOf).join(" or ");
        line.append(mark(ok), h("span", { class: "ga-visually-hidden" }, ok ? "Correct. " : "Not quite. "),
          ok ? (it.feedback || `${acceptedText}.`) : `Not ${labelOf(v)}. ${it.feedback || ""} Accepted: ${acceptedText}.`);
      }
      const all = right === items.length;
      if (!restoring) s.recordAttempt(requirementId, { passed: all, answer: all ? Object.fromEntries(items.map((i) => [i.id, selects[i.id].value])) : undefined });
      if (all) { say(region, true, `All ${items.length} categorised correctly.`); Object.values(selects).forEach((x) => { x.disabled = true; }); checkBtn.disabled = true; }
      else say(region, false, `${right} of ${items.length} correct${answered < items.length ? `, ${items.length - answered} not answered` : ""}. Change the ones marked ✗ and check again.`);
    }
    checkBtn.addEventListener("click", () => check());
    if (legend) container.append(legend instanceof Node ? legend : h("p", { class: "small" }, legend));
    container.append(list, h("div", { class: "ga-actions" }, checkBtn), region);
    if (already) { for (const it of items) selects[it.id].value = it.accept[0]; check(true); }
    return { isPassed: () => passed(requirementId) };
  }

  /* ======================================================================
     Identify — tick exactly the right set (L7 dupes, L9 gap, L11 verify, L12 new 8, L13 find)
     ====================================================================== */
  // options: [{ id, text, correct, note }]
  function IdentifyActivity({ container, requirementId, options, prompt, random, keepOrder }) {
    const s = getStore();
    const already = passed(requirementId);
    const region = liveRegion();
    const boxes = {};
    const notes = {};
    const group = h("fieldset", { class: "ga-identify" }, h("legend", { class: "ga-item-prompt" }, prompt || "Tick every item that applies."));
    for (const o of keepOrder ? options : shuffle(options, random)) {
      const id = uid("idf");
      const box = h("input", { type: "checkbox", id });
      const note = h("div", { class: "ga-result-line" });
      boxes[o.id] = box;
      notes[o.id] = note;
      group.append(h("div", { class: "ga-check" }, box, h("div", {}, h("label", { for: id }, o.text), note)));
    }
    const checkBtn = h("button", { type: "button", class: "btn btn-primary" }, "Check my answer");
    function check(restoring = false) {
      let missed = 0, extra = 0;
      for (const o of options) {
        const ticked = boxes[o.id].checked;
        const note = notes[o.id];
        note.replaceChildren();
        if (ticked === !!o.correct) continue;
        if (o.correct) missed++; else extra++;
        note.append(mark(false), h("span", { class: "ga-visually-hidden" }, "Not quite. "), o.note || (o.correct ? "This one should be ticked." : "This one should not be ticked."));
      }
      const all = missed === 0 && extra === 0;
      if (!restoring) s.recordAttempt(requirementId, { passed: all, answer: all ? options.filter((o) => o.correct).map((o) => o.id) : undefined });
      if (all) { say(region, true, "Exactly right."); Object.values(boxes).forEach((b) => { b.disabled = true; }); checkBtn.disabled = true; }
      else say(region, false, `Not yet: ${missed ? `${missed} missed` : ""}${missed && extra ? ", " : ""}${extra ? `${extra} ticked that shouldn't be` : ""}. Adjust and check again.`);
    }
    checkBtn.addEventListener("click", () => check());
    container.append(group, h("div", { class: "ga-actions" }, checkBtn), region);
    if (already) { for (const o of options) boxes[o.id].checked = !!o.correct; check(true); }
    return { isPassed: () => passed(requirementId) };
  }

  /* ======================================================================
     Written work: autosave, structure checklist, transparency note (C-02, M-10)
     ====================================================================== */
  // fields: [{ key, label, type:'text'|'textarea', rows?, hint? }]  — simple named fields
  // collect(): returns the answer object for the rule (use with RowTable for row data)
  // watch: extra elements whose edits count (e.g. a RowTable container elsewhere on the step)
  function WrittenWork({ container, requirementId, ruleName, fields = [], collect, extraEls = [], watch = [], revealButton, revealPanel }) {
    const s = getStore();
    const inputs = {};
    for (const f of fields) {
      const id = uid("fld");
      const input = f.type === "text"
        ? h("input", { type: "text", id })
        : h("textarea", { id, rows: f.rows || 3 });
      if (f.placeholder) input.placeholder = f.placeholder;
      input.value = s.getDraft(`${requirementId}:${f.key}`, "");
      inputs[f.key] = input;
      container.append(h("div", { class: "ga-field" }, h("label", { for: id }, f.label),
        f.hint ? h("div", { class: "hint small" }, f.hint) : null, input));
    }
    extraEls.forEach((e) => container.append(e));

    const list = h("ul", {});
    const status = h("p", { class: "ga-status", role: "status", "aria-live": "polite" });
    const box = h("section", { class: "ga-structure", "aria-label": COPY.checklistHeading },
      h("h3", {}, COPY.checklistHeading), list, status, h("p", { class: "ga-transparency" }, COPY.transparency));
    container.append(box);

    const answer = () => (collect ? collect(inputs) : Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value])));
    function render(res) {
      list.replaceChildren(...res.checks.map((c) => h("li", {}, h("span", { class: `ga-mark ${c.ok ? "ga-mark-ok" : ""}`, "aria-hidden": "true" }, c.ok ? "✓" : "○"),
        h("span", { class: "ga-visually-hidden" }, c.ok ? "Present: " : "Missing: "), c.label)));
      status.textContent = V.__meta.statusLabel(res);
      status.className = `ga-status ${res.ok ? "is-complete" : "is-missing"}`;
      if (revealButton) revealButton.disabled = !res.ok; // M-02: model only after a valid attempt
      if (!res.ok && revealPanel) revealPanel.hidden = true;
    }
    const save = () => {
      for (const [k, el] of Object.entries(inputs)) s.saveDraft(`${requirementId}:${k}`, el.value);
      const a = answer();
      s.recordAttempt(requirementId, { answer: a });
      render(V[ruleName](a));
    };
    const debounced = debounce(save, 500);
    for (const el of [container, ...watch]) {
      el.addEventListener("input", debounced);
      el.addEventListener("change", debounced);
    }
    window.addEventListener("pagehide", () => debounced.flush());
    // RowTable "+ Add" changes the answer without an input event
    for (const el of watch) el.addEventListener("click", (e) => { if (e.target.closest(".btn")) debounced(); });
    if (revealButton) {
      revealButton.disabled = true;
      revealButton.addEventListener("click", () => { if (revealPanel) revealPanel.hidden = !revealPanel.hidden; });
    }
    render(V[ruleName](answer()));
    return { inputs, refresh: save, isPassed: () => passed(requirementId) };
  }

  /* ---------------- row builder for table-like work samples ---------------- */
  // columns: [{ key, label, type:'text'|'textarea'|'select', options:[values] }]
  // examples: rows shown pre-filled and marked "Example"; the rules ignore them unchanged.
  function RowTable({ container, idPrefix, columns, examples = [], startRows = 1, addLabel = "+ Add another row", rowNoun = "Row" }) {
    const s = getStore();
    const wrap = h("div", { class: "ga-rows" });
    const rows = [];
    const saved = (() => { try { return JSON.parse(s.getDraft(`${idPrefix}:rows`, "null")); } catch (e) { return null; } })();

    function addRow(values = {}, isExample = false) {
      const n = rows.length + 1;
      const grid = h("div", { class: "ga-row-grid", style: `--ga-cols:${Math.min(columns.length, 4)}` });
      const els = {};
      for (const col of columns) {
        const id = uid("cell");
        let input;
        if (col.type === "select") input = h("select", { id }, h("option", { value: "" }, "Choose…"), ...col.options.map((o) => h("option", { value: o }, o)));
        else if (col.type === "textarea") input = h("textarea", { id, rows: 2 });
        else input = h("input", { type: "text", id });
        input.value = values[col.key] == null ? "" : String(values[col.key]); // set via DOM, never HTML (E-04)
        els[col.key] = input;
        grid.append(h("div", { class: "ga-field" }, h("label", { for: id }, col.label, h("span", { class: "ga-visually-hidden" }, ` — ${rowNoun.toLowerCase()} ${n}`)), input));
      }
      const row = h("div", { class: "ga-row", "data-example": isExample ? "true" : null },
        isExample ? h("div", { class: "ga-example-badge" }, "Example — doesn't count unless you change it") : null, grid);
      rows.push({ els, isExample });
      wrap.append(row);
      return row;
    }
    const persist = () => s.saveDraft(`${idPrefix}:rows`, JSON.stringify(getRows()));
    function getRows() {
      return rows.map(({ els, isExample }) => {
        const out = Object.fromEntries(Object.entries(els).map(([k, el]) => [k, el.value]));
        if (isExample) out.example = true;
        return out;
      });
    }
    if (saved && Array.isArray(saved) && saved.length) saved.forEach((r) => addRow(r, r.example === true));
    else {
      examples.forEach((r) => addRow(r, true));
      for (let i = 0; i < startRows; i++) addRow({});
    }
    const addBtn = h("button", { type: "button", class: "btn btn-ghost" }, addLabel);
    addBtn.addEventListener("click", () => { const r = addRow({}); persist(); r.querySelector("input, textarea, select").focus(); });
    wrap.addEventListener("input", persist);
    wrap.addEventListener("change", persist);
    container.append(wrap, h("div", { class: "ga-actions" }, addBtn));
    return { getRows, addRow };
  }

  /* ======================================================================
     Schedule activity (L5, FP T2) — structured placements + flags (T4)
     ====================================================================== */
  // items: [{ key, label }], times: ['9:00', ...], days?: ['Mon', ...], flags: [{ key, label }], noteLabel?
  function ScheduleActivity({ container, requirementId, ruleName, items, times, days, flags = [], noteLabel }) {
    const s = getStore();
    const draftKey = `${requirementId}:state`;
    let saved = {};
    try { saved = JSON.parse(s.getDraft(draftKey, "{}")) || {}; } catch (e) { saved = {}; }
    const sel = {};
    for (const it of items) {
      const tId = uid("time");
      const timeSel = h("select", { id: tId }, h("option", { value: "" }, "Start time…"), ...times.map((t) => h("option", { value: t }, t)));
      let daySel = null;
      const row = h("div", { class: "ga-schedule-row" }, h("label", { for: tId }, it.label));
      if (days) {
        const dId = uid("day");
        daySel = h("select", { id: dId, "aria-label": `${it.label} — day` }, h("option", { value: "" }, "Day…"), ...days.map((d) => h("option", { value: d }, d)));
        row.append(daySel);
      }
      row.append(timeSel);
      const p = (saved.placements || {})[it.key];
      if (days && p) { daySel.value = p.day || ""; timeSel.value = p.start || ""; } else if (!days && p) timeSel.value = p;
      sel[it.key] = { timeSel, daySel };
      container.append(row);
    }
    const flagEls = {};
    for (const f of flags) {
      const id = uid("flag");
      const box = h("input", { type: "checkbox", id });
      box.checked = !!(saved.flags || {})[f.key];
      flagEls[f.key] = box;
      container.append(h("div", { class: "ga-check" }, box, h("label", { for: id }, f.label)));
    }
    let note = null;
    if (noteLabel) {
      const id = uid("note");
      note = h("textarea", { id, rows: 3 });
      note.value = saved.note || "";
      container.append(h("div", { class: "ga-field" }, h("label", { for: id }, noteLabel), note));
    }
    const collect = () => {
      const placements = {};
      for (const it of items) {
        const { timeSel, daySel } = sel[it.key];
        placements[it.key] = days ? { day: daySel.value, start: timeSel.value } : timeSel.value;
      }
      const out = { placements, flags: Object.fromEntries(Object.entries(flagEls).map(([k, b]) => [k, b.checked])) };
      if (note) out.note = note.value;
      return out;
    };
    const list = h("ul", {});
    const status = h("p", { class: "ga-status", role: "status", "aria-live": "polite" });
    container.append(h("section", { class: "ga-structure", "aria-label": "Schedule check" }, h("h3", {}, "Schedule check"), list, status));
    function render(res) {
      list.replaceChildren(...res.checks.map((c) => h("li", {}, h("span", { class: `ga-mark ${c.ok ? "ga-mark-ok" : "ga-mark-bad"}`, "aria-hidden": "true" }, c.ok ? "✓" : "✗"),
        h("span", { class: "ga-visually-hidden" }, c.ok ? "Met: " : "Not met: "), c.label)));
      status.textContent = res.ok ? "All scheduling rules met." : `${res.missing.length} rule${res.missing.length > 1 ? "s" : ""} not met yet.`;
      status.className = `ga-status ${res.ok ? "is-complete" : "is-missing"}`;
    }
    const update = debounce(() => {
      const a = collect();
      s.saveDraft(draftKey, JSON.stringify(a));
      s.recordAttempt(requirementId, { answer: a });
      render(V[ruleName](a));
    }, 300);
    container.addEventListener("change", update);
    container.addEventListener("input", update);
    render(V[ruleName](collect()));
    return { collect, isPassed: () => passed(requirementId) };
  }

  /* ======================================================================
     Stepper — gates, focus, restore, completion (C-01, m-03, m-09, M-10)
     ====================================================================== */
  // gates: { [stepNumber]: requirementId | [requirementIds] }
  function Stepper({ lesson, gates = {}, root: rootEl = document, onComplete }) {
    const s = getStore();
    const panels = Array.from(rootEl.querySelectorAll(".step-panel"));
    const total = panels.length; // last panel is the completion screen
    const rail = rootEl.querySelector("#stepRail");
    const label = rootEl.querySelector("#stepLabel");
    const prev = rootEl.querySelector("#prevBtn");
    const next = rootEl.querySelector("#nextBtn");
    const nav = rootEl.querySelector("#stepNav");
    const stepKey = `l${String(lesson).padStart(2, "0")}:step`;
    if (label) { label.setAttribute("role", "status"); label.setAttribute("aria-live", "polite"); }
    let current = 1;

    const gateIds = (n) => [].concat(gates[n] || []);
    const gateOpen = (n) => gateIds(n).every((id) => passed(id));
    const firstLocked = () => { for (let n = 1; n < total; n++) if (!gateOpen(n)) return n; return total; };

    function updateNav() {
      if (current >= total) return;
      const open = gateOpen(current);
      next.disabled = !open;
      next.setAttribute("aria-describedby", open ? "" : `${stepKey}-locked`);
    }
    function show(n, { focus = true } = {}) {
      current = Math.max(1, Math.min(n, total));
      panels.forEach((p) => p.classList.toggle("active", Number(p.dataset.step) === current));
      if (rail) {
        rail.replaceChildren();
        for (let i = 1; i < total; i++) rail.append(h("div", { class: `seg${i < current ? " done" : i === current ? " active" : ""}` }));
      }
      s.saveDraft(stepKey, String(current));
      if (current >= total) {
        nav.style.display = "none";
        const r = s.markLessonComplete(lesson);
        label.textContent = r.ok ? (r.saved ? "Complete" : "Complete — not saved in this browser") : "Some activities still need to be completed";
        if (onComplete) onComplete(r);
      } else {
        nav.style.display = "flex";
        label.textContent = `Step ${current} of ${total - 1}`;
        prev.style.visibility = current === 1 ? "hidden" : "visible";
        next.textContent = current === total - 1 ? "Finish Lesson →" : "Continue →";
        updateNav();
      }
      const heading = panels.find((p) => Number(p.dataset.step) === current).querySelector("h2");
      if (heading && focus) { heading.setAttribute("tabindex", "-1"); heading.focus(); }
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0 });
    }
    prev.addEventListener("click", () => { if (current > 1) show(current - 1); });
    next.addEventListener("click", () => { if (current < total && gateOpen(current)) show(current + 1); });
    s.on("progress", updateNav);

    const lockedNote = h("p", { id: `${stepKey}-locked`, class: "ga-visually-hidden" }, "Continue unlocks when this step's activity is complete.");
    nav.append(lockedNote);

    // Banners: completed earlier (m-09) / completed in V1 (T2)
    const ev = s.evaluate();
    const info = ev.lessons.find((l) => l.n === lesson);
    const body = rootEl.querySelector(".step-card") || rootEl.querySelector("main");
    if (info && info.complete) body.prepend(h("div", { class: "ga-note-banner" }, "You completed this lesson. Your answers are saved below; you can review them or print your work sample."));
    else if (info && info.completedInV1Only) body.prepend(h("div", { class: "ga-note-banner" }, "You completed this lesson in an earlier version of the course. The checks have been updated — please work through them again to count this lesson toward your certificate."));

    // Restore the saved step, but never past the first incomplete activity (M-10).
    const savedStep = Number(s.getDraft(stepKey, "1")) || 1;
    show(Math.min(savedStep, firstLocked()), { focus: false });
    return { show, current: () => current, gateOpen };
  }

  /* ======================================================================
     Print sheet (M-14): print only the learner's work, with header and footer
     ====================================================================== */
  // sections: [{ heading, text }] or [{ heading, table: { columns:[labels], rows:[[cells]] } }]
  function printWorkSample({ title, subtitle, sections, learnerName }) {
    let sheet = document.querySelector(".print-sheet");
    if (!sheet) { sheet = h("div", { class: "print-sheet" }); document.body.append(sheet); }
    const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    sheet.replaceChildren(
      h("h1", {}, title),
      h("p", { class: "ps-meta" }, [subtitle, learnerName ? `Learner: ${learnerName}` : null, `Printed ${date}`].filter(Boolean).join(" · ")),
      ...sections.flatMap((sec) => {
        const out = [h("h2", {}, sec.heading)];
        if (sec.table) {
          out.push(h("table", {}, h("thead", {}, h("tr", {}, ...sec.table.columns.map((c) => h("th", {}, c)))),
            h("tbody", {}, ...sec.table.rows.map((r) => h("tr", {}, ...r.map((cell) => h("td", {}, cell == null || cell === "" ? "—" : String(cell))))))));
        } else out.push(h("p", { class: "ps-text" }, sec.text == null || sec.text === "" ? "—" : String(sec.text)));
        return out;
      }),
      h("p", { class: "ps-footer" }, "Training work sample — fictional client. Not paid client work. Probinsiyanong VA · General Administrative VA — Beginner Foundations. Written work is checked for required parts only; it is not individually reviewed."),
    );
    document.body.classList.add("ga-printing");
    const done = () => { document.body.classList.remove("ga-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
    return sheet;
  }

  /* ---------------- page bootstrap ---------------- */
  function initPage({ lesson } = {}) {
    document.body.classList.add("ga-v2");
    mountSkipLink();
    mountStorageBanner();
    return getStore();
  }

  root.PVAGAActivities = {
    version: "2.0.0-wp2",
    getStore,
    initPage,
    shuffle,
    ChoiceActivity,
    SortActivity,
    TriageActivity,
    IdentifyActivity,
    WrittenWork,
    RowTable,
    ScheduleActivity,
    Stepper,
    printWorkSample,
    _h: h,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
