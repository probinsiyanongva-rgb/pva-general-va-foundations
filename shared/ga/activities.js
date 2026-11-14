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

  /* ---------------- Quick re-check (correction pass, decision 5) ----------------
     A single-choice item answered wrongly on its step is queued. Before the lesson
     is marked complete, each queued item must be answered correctly once more,
     with new option order and no feedback, hints or explanations. State is a draft
     (persists with progress, export and restore); the completion guard in
     manifest.js refuses markLessonComplete while the queue is not empty.
     The re-check never records requirement attempts and never completes anything. */
  let currentLesson = null;
  const recheckDefs = new Map(); // itemKey -> { item, context: [Node] }
  const nowISO = () => new Date().toISOString();
  function readRecheck() { return GA.recheck.read(currentLesson, (id, fb) => getStore().getDraft(id, fb)); }
  function writeRecheck(state) { return getStore().saveDraft(GA.recheck.draftId(currentLesson), JSON.stringify(state)); }
  function noteWrong(key) {
    if (!currentLesson || !key) return;
    const st = readRecheck();
    const it = st.items[key] || (st.items[key] = { original: { wrong: 0, firstWrongAt: null }, recheck: { attempts: 0, wrong: 0, passedAt: null } });
    if (it.recheck.passedAt) return;
    it.original.wrong += 1;
    if (!it.original.firstWrongAt) it.original.firstWrongAt = nowISO();
    if (!st.queue.includes(key)) st.queue.push(key);
    writeRecheck(st);
  }
  // Context for the re-check: the step's title and the scenario/rules text that
  // came before the activity. Never model answers, hidden panels or form controls.
  function captureContext(container) {
    const panel = container.closest(".step-panel");
    if (!panel) return [];
    const out = [];
    const title = panel.querySelector("h2");
    if (title) out.push(h("h4", { class: "ga-recheck-title" }, title.textContent));
    for (const el of panel.children) {
      if (el === container || el.contains(container)) break;
      if (el.matches(".step-tag, h2, .model-answer, .reveal-btn, .ga-reveal-note, .ga-recheck-skip, [hidden], .no-print") ||
          el.querySelector("input, select, textarea, button")) continue;
      const c = el.cloneNode(true);
      [c, ...c.querySelectorAll("[id]")].forEach((n) => n.removeAttribute("id"));
      out.push(c);
    }
    return out;
  }
  function registerRecheck(key, item, container) {
    if (!recheckDefs.has(key)) recheckDefs.set(key, { item, context: captureContext(container) });
  }

  // Hint shown after the second failed check (spec: new checks). Never reveals the answer.
  function hintBox(hint) {
    const el = h("p", { class: "ga-hint", hidden: true });
    let fails = 0;
    return {
      el,
      fail() { fails++; if (hint && fails >= 2) { el.textContent = "Hint: " + hint; el.hidden = false; } },
      pass() { el.hidden = true; },
    };
  }

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
  function renderChoiceItem(container, item, { random, alreadyPassed, onResult, recheckKey }) {
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
        noteWrong(recheckKey);
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
      const recheckKey = `${requirementId}#${i}`;
      registerRecheck(recheckKey, item, container);
      renderChoiceItem(wrap, item, {
        random,
        recheckKey,
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
  function SortActivity({ container, requirementId, bins, items, random, instructions, hint }) {
    const s = getStore();
    const already = passed(requirementId);
    const hints = hintBox(hint);
    const notesEl = h("ul", { class: "ga-sort-notes", hidden: true });
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
    // Progressive disclosure (correction pass, decision 5): 1st failed check = count only;
    // from the 2nd, ✗ on wrong items without naming the right bin (3+ bins only — with two
    // bins a ✗ is the answer); explanations only once everything is right.
    let fails = 0;
    function check(restoring = false) {
      const right = items.filter((it) => placement[it.id] === it.bin).length;
      const all = right === items.length;
      if (!all && !restoring) fails++;
      const showMarks = all || (bins.length >= 3 && fails >= 2);
      for (const it of items) {
        const chip = chips[it.id];
        chip.querySelectorAll(".ga-mark, .ga-visually-hidden").forEach((m) => m.remove());
        const ok = placement[it.id] === it.bin;
        chip.classList.toggle("is-correct", showMarks && ok);
        chip.classList.toggle("is-wrong", showMarks && !ok);
        if (showMarks) chip.prepend(mark(ok), h("span", { class: "ga-visually-hidden" }, ok ? "Right bin: " : "Wrong bin: "));
      }
      if (!restoring) s.recordAttempt(requirementId, { passed: all, answer: all ? { placement } : undefined });
      const explain = all ? items.filter((it) => it.feedback) : [];
      notesEl.replaceChildren(...explain.map((it) => h("li", {}, h("strong", {}, `“${it.text}”`), ` — ${it.feedback}`)));
      notesEl.hidden = explain.length === 0;
      if (!restoring) { if (all) hints.pass(); else hints.fail(); }
      if (all) {
        say(region, true, `All ${items.length} items are in the right bin.`);
        Object.values(chips).forEach((c) => { c.disabled = true; });
        Object.values(binEls).forEach((b) => { b.place.disabled = true; });
        checkBtn.disabled = true;
      } else {
        say(region, false, showMarks
          ? `${right} of ${items.length} are in the right bin. Items marked ✗ are in the wrong bin — select one and move it, then check again.`
          : `${right} of ${items.length} are in the right bin. Move items you're unsure about, then check again.`);
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
      pool, board, h("div", { class: "ga-actions" }, checkBtn), region, notesEl, hints.el);

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
  function TriageActivity({ container, requirementId, categories, items, legend, hint }) {
    const s = getStore();
    const already = passed(requirementId);
    const hints = hintBox(hint);
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
    // Progressive disclosure (decision 5): 1st failed check = count only; from the 2nd,
    // ✗ on wrong items (3+ categories only), never the accepted category; feedback once all are right.
    let fails = 0;
    function check(restoring = false) {
      const answered = items.filter((it) => selects[it.id].value).length;
      const right = items.filter((it) => it.accept.includes(selects[it.id].value)).length;
      const all = right === items.length;
      if (!all && !restoring) fails++;
      const showMarks = !all && categories.length >= 3 && fails >= 2;
      for (const it of items) {
        const v = selects[it.id].value;
        const line = lines[it.id];
        line.replaceChildren();
        if (!v) { line.append("Choose a category for this message."); continue; }
        const ok = it.accept.includes(v);
        if (all) line.append(mark(true), h("span", { class: "ga-visually-hidden" }, "Correct. "), it.feedback || `${it.accept.map(labelOf).join(" or ")}.`);
        else if (showMarks) line.append(mark(ok), h("span", { class: "ga-visually-hidden" }, ok ? "Correct. " : "Not quite. "), ok ? "Right category." : `Not ${labelOf(v)}.`);
      }
      if (!restoring) s.recordAttempt(requirementId, { passed: all, answer: all ? Object.fromEntries(items.map((i) => [i.id, selects[i.id].value])) : undefined });
      if (!restoring) { if (all) hints.pass(); else hints.fail(); }
      if (all) { say(region, true, `All ${items.length} categorised correctly.`); Object.values(selects).forEach((x) => { x.disabled = true; }); checkBtn.disabled = true; }
      else say(region, false, `${right} of ${items.length} correct${answered < items.length ? `, ${items.length - answered} not answered` : ""}. ${showMarks ? "Change the ones marked ✗ and check again." : "Change any you're unsure about and check again."}`);
    }
    checkBtn.addEventListener("click", () => check());
    if (legend) container.append(legend instanceof Node ? legend : h("p", { class: "small" }, legend));
    container.append(list, h("div", { class: "ga-actions" }, checkBtn), region, hints.el);
    if (already) { for (const it of items) selects[it.id].value = it.accept[0]; check(true); }
    return { isPassed: () => passed(requirementId) };
  }

  /* ======================================================================
     Identify — tick exactly the right set (L7 dupes, L9 gap, L11 verify, L12 new 8, L13 find)
     ====================================================================== */
  // options: [{ id, text, correct: true | false | "either", note }]
  //   "either" — ticked or not, both are accepted (U-01); its note explains why.
  // explainAll — kept for existing callers; since the correction pass every option's note shows once the answer is right.
  function IdentifyActivity({ container, requirementId, options, prompt, random, keepOrder, hint, explainAll = false, successText }) {
    const s = getStore();
    const already = passed(requirementId);
    const hints = hintBox(hint);
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
    // Progressive disclosure (decision 5): a tick is a yes/no choice, so any per-item mark
    // gives the answer away. Failed checks show counts only; every note appears once right.
    function check(restoring = false) {
      let missed = 0, extra = 0;
      for (const o of options) {
        const ok = o.correct === "either" || boxes[o.id].checked === !!o.correct;
        if (!ok) { if (o.correct) missed++; else extra++; }
      }
      const all = missed === 0 && extra === 0;
      for (const o of options) {
        const note = notes[o.id];
        note.replaceChildren();
        if (all && o.note) note.append(mark(true), h("span", { class: "ga-visually-hidden" }, "Accepted. "), o.note);
      }
      if (!restoring) s.recordAttempt(requirementId, { passed: all, answer: all ? options.filter((o) => boxes[o.id].checked).map((o) => o.id) : undefined });
      if (!restoring) { if (all) hints.pass(); else hints.fail(); }
      if (all) { say(region, true, successText || "Exactly right."); Object.values(boxes).forEach((b) => { b.disabled = true; }); checkBtn.disabled = true; }
      else say(region, false, `Not yet: ${missed ? `${missed} missed` : ""}${missed && extra ? ", " : ""}${extra ? `${extra} ticked that shouldn't be` : ""}. Adjust and check again.`);
    }
    checkBtn.addEventListener("click", () => check());
    container.append(group, h("div", { class: "ga-actions" }, checkBtn), region, hints.el);
    if (already) { for (const o of options) boxes[o.id].checked = o.correct === true; check(true); }
    return { isPassed: () => passed(requirementId) };
  }

  /* ======================================================================
     Written work: autosave, structure checklist, transparency note (C-02, M-10)
     ====================================================================== */
  // fields: [{ key, label, type:'text'|'textarea', rows?, hint? }]  — simple named fields
  // collect(): returns the answer object for the rule (use with RowTable for row data)
  // watch: extra elements whose edits count (e.g. a RowTable container elsewhere on the step)
  // reviewNote: optional instruction shown under the transparency note (what to review before saving)
  function WrittenWork({ container, requirementId, ruleName, fields = [], collect, extraEls = [], watch = [], revealButton, revealPanel, reviewNote }) {
    const s = getStore();
    const inputs = {};
    // Draft ids must be lowercase [a-z0-9:_-]; answer keys keep the rule's own names ("versionRule", "Tools/access").
    const draftId = (key) => `${requirementId}:${String(key).toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`;
    for (const f of fields) {
      const id = uid("fld");
      if (f.type === "checkbox") {
        // Unchecked by default; restored as ticked only if the learner ticked it (WP4 Q6).
        const box = h("input", { type: "checkbox", id });
        box.checked = s.getDraft(draftId(f.key), "") === "true";
        inputs[f.key] = box;
        container.append(h("div", { class: "ga-check" }, box, h("label", { for: id }, f.label)));
        continue;
      }
      const input = f.type === "text"
        ? h("input", { type: "text", id })
        : h("textarea", { id, rows: f.rows || 3 });
      if (f.placeholder) input.placeholder = f.placeholder;
      input.value = s.getDraft(draftId(f.key), "");
      inputs[f.key] = input;
      container.append(h("div", { class: "ga-field" }, h("label", { for: id }, f.label),
        f.hint ? h("div", { class: "hint small" }, f.hint) : null, input));
    }
    extraEls.forEach((e) => container.append(e));

    const list = h("ul", {});
    const status = h("p", { class: "ga-status", role: "status", "aria-live": "polite" });
    const box = h("section", { class: "ga-structure", "aria-label": COPY.checklistHeading },
      h("h3", {}, COPY.checklistHeading), list, status, h("p", { class: "ga-transparency" }, COPY.transparency),
      reviewNote ? h("p", { class: "ga-review-note" }, reviewNote) : null);
    container.append(box);

    const valueOf = (el) => (el.type === "checkbox" ? el.checked : el.value);
    const answer = () => (collect ? collect(inputs) : Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, valueOf(el)])));
    function render(res) {
      list.replaceChildren(...res.checks.map((c) => h("li", {}, h("span", { class: `ga-mark ${c.ok ? "ga-mark-ok" : ""}`, "aria-hidden": "true" }, c.ok ? "✓" : "○"),
        h("span", { class: "ga-visually-hidden" }, c.ok ? "Present: " : "Missing: "), c.label)));
      status.textContent = V.__meta.statusLabel(res);
      status.className = `ga-status ${res.ok ? "is-complete" : "is-missing"}`;
      if (revealButton) revealButton.disabled = !res.ok; // M-02: model only after a valid attempt
      if (revealNote) revealNote.hidden = res.ok;
      if (!res.ok && revealPanel) revealPanel.hidden = true;
    }
    const save = () => {
      for (const [k, el] of Object.entries(inputs)) s.saveDraft(draftId(k), el.type === "checkbox" ? (el.checked ? "true" : "") : el.value);
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
    let revealNote = null;
    if (revealButton) {
      revealButton.disabled = true;
      revealNote = h("p", { class: "small ga-reveal-note", id: uid("reveal") }, "Available once the required parts above are complete.");
      revealButton.after(revealNote);
      revealButton.setAttribute("aria-describedby", revealNote.id);
      revealButton.addEventListener("click", () => { if (revealPanel) revealPanel.hidden = !revealPanel.hidden; });
    }
    render(V[ruleName](answer()));
    return { inputs, refresh: save, isPassed: () => passed(requirementId) };
  }

  /* ---------------- row builder for table-like work samples ---------------- */
  // columns: [{ key, label, type:'text'|'textarea'|'select', options:[values | {value,label}], placeholder? }]
  // examples: rows shown pre-filled and marked "Example"; the rules ignore them unchanged.
  // allowAdd: false for a fixed number of rows (e.g. a four-step workflow)
  // starters: rows pre-filled as a starting point (e.g. an area name) that the learner completes;
  //           they are NOT examples and count once the learner fills the rest.
  function RowTable({ container, idPrefix, columns, examples = [], starters = [], startRows = 1, addLabel = "+ Add another row", rowNoun = "Row", allowAdd = true }) {
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
        // select options: "Label" (value = label) or { value, label } when the rule needs a code
        if (col.type === "select") input = h("select", { id }, h("option", { value: "" }, "Choose…"),
          ...col.options.map((o) => (typeof o === "object" ? h("option", { value: o.value }, o.label) : h("option", { value: o }, o))));
        else if (col.type === "textarea") input = h("textarea", { id, rows: 2 });
        else input = h("input", { type: "text", id });
        input.value = values[col.key] == null ? "" : String(values[col.key]); // set via DOM, never HTML (E-04)
        if (col.placeholder) input.placeholder = col.placeholder;
        els[col.key] = input;
        grid.append(h("div", { class: "ga-field" }, h("label", { for: id }, col.label, h("span", { class: "ga-visually-hidden" }, ` — ${rowNoun.toLowerCase()} ${n}`)), input));
      }
      const row = h("div", { class: "ga-row", "data-example": isExample ? "true" : null },
        isExample ? h("div", { class: "ga-example-badge" }, "Example from the lesson — doesn't count toward the check") : null, grid);
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
      starters.forEach((r) => addRow(r, false));
      for (let i = 0; i < startRows; i++) addRow({});
    }
    const addBtn = h("button", { type: "button", class: "btn btn-ghost" }, addLabel);
    addBtn.addEventListener("click", () => { const r = addRow({}); persist(); r.querySelector("input, textarea, select").focus(); });
    wrap.addEventListener("input", persist);
    wrap.addEventListener("change", persist);
    container.append(wrap, allowAdd ? h("div", { class: "ga-actions" }, addBtn) : null);
    return { getRows, addRow };
  }

  /* ======================================================================
     Schedule activity (L5, FP T2) — structured placements + flags (T4)
     ====================================================================== */
  // items: [{ key, label }], times: ['9:00', ...], days?: ['Mon', ...], flags: [{ key, label }], noteLabel?, formatTime?(t) -> option text
  // question?: { key, item } — a single-choice item (options carry `value`); the correct option's
  //   value is stored in the answer under `key` (L5 "which request can't fit"). It joins the re-check.
  function ScheduleActivity({ container, requirementId, ruleName, items, times, days, flags = [], noteLabel, formatTime = (t) => t, question }) {
    const s = getStore();
    const draftKey = `${requirementId}:state`;
    let saved = {};
    try { saved = JSON.parse(s.getDraft(draftKey, "{}")) || {}; } catch (e) { saved = {}; }
    const sel = {};
    for (const it of items) {
      const tId = uid("time");
      const timeSel = h("select", { id: tId }, h("option", { value: "" }, "Start time…"), ...times.map((t) => h("option", { value: t }, formatTime(t))));
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
    let qValue = question && typeof saved[question.key] === "string" ? saved[question.key] : "";
    let update = null;
    if (question) {
      const qWrap = h("div", { class: "ga-item ga-schedule-question" });
      container.append(qWrap);
      const right = question.item.options.find((o) => o.correct);
      const recheckKey = `${requirementId}#${question.key.toLowerCase()}`;
      registerRecheck(recheckKey, question.item, qWrap);
      renderChoiceItem(qWrap, question.item, {
        recheckKey,
        alreadyPassed: qValue !== "" && qValue === right.value,
        onResult(ok) { if (ok) { qValue = right.value; if (update) { update(); update.flush(); } } },
      });
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
      if (question) out[question.key] = qValue;
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
    update = debounce(() => {
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

  /* ---------------- checklist rows: one radio choice + a note per item (L12, L13) ---------------- */
  // items: [label], choices: [{ value, label }]. Drafts persist per row; collect() -> [{ answer, note }]
  function ChoiceRows({ container, idPrefix, items, choices, noteLabel = "Note", notePlaceholder = "" }) {
    const s = getStore();
    const rows = items.map((item, i) => {
      const name = `${idPrefix}-${i}`;
      const radios = choices.map((c) => {
        const id = `${name}-${c.value}`;
        const input = h("input", { type: "radio", name, id, value: c.value });
        input.checked = s.getDraft(`${idPrefix}:answer-${i}`, "") === c.value;
        return { input, el: h("span", { class: "ga-radio" }, input, h("label", { for: id }, c.label)) };
      });
      const noteId = `${name}-note`;
      const note = h("input", { type: "text", id: noteId, placeholder: notePlaceholder });
      note.value = s.getDraft(`${idPrefix}:note-${i}`, "");
      container.append(h("fieldset", { class: "ga-row ga-yn" },
        h("legend", { class: "ga-item-prompt" }, item),
        h("div", { class: "ga-yn-choices" }, ...radios.map((r) => r.el)),
        h("div", { class: "ga-field" }, h("label", { for: noteId }, noteLabel, h("span", { class: "ga-visually-hidden" }, ` — ${item}`)), note)));
      return { radios, note };
    });
    const answerOf = (r) => (r.radios.find((x) => x.input.checked) || { input: { value: "" } }).input.value;
    const collect = () => rows.map((r) => ({ answer: answerOf(r), note: r.note.value }));
    const persist = () => rows.forEach((r, i) => { s.saveDraft(`${idPrefix}:answer-${i}`, answerOf(r)); s.saveDraft(`${idPrefix}:note-${i}`, r.note.value); });
    container.addEventListener("change", persist);
    container.addEventListener("input", persist);
    return { collect, labelOf: (v) => (choices.find((c) => c.value === v) || {}).label || "" };
  }

  /* ======================================================================
     Work-sample preview (approved in the Lesson 1 pilot): desktop table;
     at <= 600px (v2.css) one stacked card per row with its own labels.
     Built with textContent only. columns: [{ key, label }]
     ====================================================================== */
  function renderPreview(container, { columns, rows, label = "Preview" }) {
    const val = (text) => (text != null && String(text).trim() ? String(text) : "—");
    const desktop = h("table", { class: "ref-table ga-preview-table" },
      h("tr", {}, ...columns.map((c) => h("th", {}, c.label))),
      ...rows.map((r) => h("tr", {}, ...columns.map((c) => h("td", {}, val(r[c.key]))))));
    const mobile = h("ol", { class: "ga-preview-cards", "aria-label": label },
      ...rows.map((r) => h("li", { class: "ga-preview-card" },
        h("dl", {}, ...columns.map((c) => h("div", { class: "ga-preview-field" }, h("dt", {}, c.label), h("dd", {}, val(r[c.key]))))))));
    container.replaceChildren(desktop, mobile);
  }
  // Keeps a preview in sync with the inputs inside the given elements.
  function livePreview(container, { columns, getRows, label, watch = [] }) {
    const draw = () => renderPreview(container, { columns, rows: getRows(), label });
    for (const el of watch) {
      el.addEventListener("input", draw);
      el.addEventListener("change", draw);
      el.addEventListener("click", (e) => { if (e.target.closest(".btn")) setTimeout(draw, 0); });
    }
    draw();
    return { refresh: draw };
  }

  /* ======================================================================
     Stepper — gates, focus, restore, completion (C-01, m-03, m-09, M-10)
     ====================================================================== */
  // gates: { [stepNumber]: requirementId | [requirementIds] }
  // finalProject: true — Final Project mode (WP4 Q15): step saved under "fp:step", Finish calls
  // markFinalProjectComplete(), no re-check, and the completion step is only restored when the
  // project is currently complete (a fixed project needs Finish pressed again, decision R2).
  function Stepper({ lesson, gates = {}, root: rootEl = document, onComplete, finalProject = false }) {
    const s = getStore();
    const panels = Array.from(rootEl.querySelectorAll(".step-panel"));
    const total = panels.length; // last panel is the completion screen
    const rail = rootEl.querySelector("#stepRail");
    const label = rootEl.querySelector("#stepLabel");
    const prev = rootEl.querySelector("#prevBtn");
    const next = rootEl.querySelector("#nextBtn");
    const nav = rootEl.querySelector("#stepNav");
    const stepKey = finalProject ? "fp:step" : `l${String(lesson).padStart(2, "0")}:step`;
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
      if (current >= total && finalProject) {
        nav.style.display = "none";
        const already = s.evaluate().finalProject.complete;
        const r = already ? { ok: true, saved: s.isPersistent() } : s.markFinalProjectComplete();
        label.textContent = r.ok ? (r.saved ? "Complete" : "Complete — not saved in this browser") : "Some tasks still need to be completed";
        if (onComplete) onComplete(r);
      } else if (current >= total) {
        nav.style.display = "none";
        const finish = () => {
          const r = s.markLessonComplete(lesson);
          label.textContent = r.ok ? (r.saved ? "Complete" : "Complete — not saved in this browser") : "Some activities still need to be completed";
          if (onComplete) onComplete(r);
        };
        const done = s.evaluate().lessons.find((l) => l.n === lesson);
        if (done && done.complete) finish();
        else runRecheck(panels.find((p) => Number(p.dataset.step) === current), label, finish);
      } else {
        nav.style.display = "flex";
        label.textContent = `Step ${current} of ${total - 1}`;
        prev.style.visibility = current === 1 ? "hidden" : "visible";
        next.textContent = current === total - 1 ? (finalProject ? "Finish Project →" : "Finish Lesson →") : "Continue →";
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
    const body = rootEl.querySelector(".step-card") || rootEl.querySelector("main");
    if (finalProject) {
      if (ev.finalProject.complete) body.prepend(h("div", { class: "ga-note-banner" }, "You completed the Final Project. Your answers are saved below, and your report is on the last step."));
      else if (ev.finalProject.firstCompletedAt) body.prepend(h("div", { class: "ga-note-banner ga-note-banner-warn" }, "You finished this project before, but at least one task no longer meets its required parts, so the project is not currently complete. Fix the task marked below, then press Finish Project again."));
    } else {
      const info = ev.lessons.find((l) => l.n === lesson);
      if (info && info.complete) body.prepend(h("div", { class: "ga-note-banner" }, "You completed this lesson. Your answers are saved below; you can review them or print your work sample."));
      else if (info && info.completedInV1Only) body.prepend(h("div", { class: "ga-note-banner" }, "You completed this lesson in an earlier version of the course. The checks have been updated — please work through them again to count this lesson toward your certificate."));
    }

    // Restore the saved step, but never past the first incomplete activity (M-10).
    const savedStep = Number(s.getDraft(stepKey, "1")) || 1;
    const cap = finalProject && !ev.finalProject.complete ? total - 1 : total;
    show(Math.min(savedStep, firstLocked(), cap), { focus: false });
    return { show, current: () => current, gateOpen };
  }

  /* ======================================================================
     Record cleaning (Final Project Task 3, WP4) — read-only original + editable group
     ====================================================================== */
  // records: [{ id, original:{name,mobile,status,email,date} }], examples: [{ id, original, clean, flag, duplicateOf }]
  // getRecords() -> [{ id, name, mobile, status, email, date, clarification, flag, duplicateOf }]
  const T3_COLS = [["name", "Name"], ["mobile", "Mobile"], ["status", "Status"], ["email", "Email"], ["date", "Date added"]];
  const T3_FLAGS = [["none", "None"], ["duplicate", "Duplicate of…"], ["missing-email", "Missing email"], ["ambiguous-date", "Ambiguous date"]];
  function CleanRecords({ container, idPrefix, records, examples = [] }) {
    const s = getStore();
    let saved = null;
    try { saved = JSON.parse(s.getDraft(`${idPrefix}:records`, "null")); } catch (e) { saved = null; }
    const savedById = Object.fromEntries((Array.isArray(saved) ? saved : []).filter((r) => r && r.id).map((r) => [r.id, r]));
    const originalPanel = (rec, oid) => h("div", { class: "ga-record-original", id: oid },
      h("p", { class: "ga-record-original-title" }, "Original record (read-only)"),
      h("dl", {}, ...T3_COLS.map(([k, l]) => h("div", {}, h("dt", {}, l), h("dd", { class: "ga-record-value" }, rec.original[k])))));
    for (const ex of examples) {
      container.append(h("section", { class: "ga-record ga-record-example", "aria-label": `Example ${ex.id}` },
        h("div", { class: "ga-example-badge" }, "Example — doesn't count"),
        h("h4", { class: "ga-record-title" }, `Example ${ex.id}`),
        originalPanel(ex, uid("orig")),
        h("div", { class: "ga-record-example-clean" }, h("p", { class: "ga-record-original-title" }, "Cleaned version"),
          h("dl", {}, ...T3_COLS.map(([k, l]) => h("div", {}, h("dt", {}, l), h("dd", {}, ex.clean[k]))),
            h("div", {}, h("dt", {}, "Flag"), h("dd", {}, ex.flag === "duplicate" ? `Duplicate of ${ex.duplicateOf} (keep both)` : "None"))))));
    }
    const rows = records.map((rec) => {
      const sv = savedById[rec.id] || {};
      const oid = uid("orig");
      const hid = uid("rec");
      const els = {};
      const grid = h("div", { class: "ga-record-grid" });
      for (const [k, l] of T3_COLS) {
        const id = uid("t3");
        const input = h("input", { type: "text", id });
        input.value = sv[k] != null ? String(sv[k]) : rec.original[k]; // prefilled with the original (approved)
        els[k] = input;
        grid.append(h("div", { class: "ga-field" }, h("label", { for: id }, l, h("span", { class: "ga-visually-hidden" }, ` — record ${rec.id}`)), input));
      }
      const cid = uid("t3");
      els.clarification = h("textarea", { id: cid, rows: 2 });
      els.clarification.value = sv.clarification || "";
      const fid = uid("t3");
      els.flag = h("select", { id: fid }, ...T3_FLAGS.map(([v, l]) => h("option", { value: v }, l)));
      els.flag.value = sv.flag || "none";
      const did = uid("t3");
      els.duplicateOf = h("select", { id: did }, h("option", { value: "" }, "Choose the record…"),
        ...records.filter((o) => o.id !== rec.id).map((o) => h("option", { value: o.id }, `Record ${o.id}`)));
      els.duplicateOf.value = sv.duplicateOf || "";
      const dupWrap = h("div", { class: "ga-field" }, h("label", { for: did }, "Duplicate of", h("span", { class: "ga-visually-hidden" }, ` — record ${rec.id}`)), els.duplicateOf);
      const syncDup = () => { dupWrap.hidden = els.flag.value !== "duplicate"; };
      els.flag.addEventListener("change", syncDup);
      syncDup();
      const edit = h("fieldset", { class: "ga-record-edit", "aria-describedby": oid },
        h("legend", {}, "Your cleaned version", h("span", { class: "ga-visually-hidden" }, ` of record ${rec.id}`)),
        grid,
        h("div", { class: "ga-record-flags" },
          h("div", { class: "ga-field" }, h("label", { for: fid }, "Flag", h("span", { class: "ga-visually-hidden" }, ` — record ${rec.id}`)), els.flag),
          dupWrap),
        h("div", { class: "ga-field" }, h("label", { for: cid }, "Clarification (optional — what needs confirming?)", h("span", { class: "ga-visually-hidden" }, ` — record ${rec.id}`)), els.clarification));
      container.append(h("section", { class: "ga-record", "aria-labelledby": hid }, h("h4", { class: "ga-record-title", id: hid }, `Record ${rec.id}`), originalPanel(rec, oid), edit));
      return { id: rec.id, els };
    });
    const getRecords = () => rows.map(({ id, els }) => {
      const out = { id };
      for (const [k] of T3_COLS) out[k] = els[k].value;
      out.clarification = els.clarification.value;
      out.flag = els.flag.value;
      out.duplicateOf = els.flag.value === "duplicate" ? els.duplicateOf.value : "";
      return out;
    });
    const persist = () => s.saveDraft(`${idPrefix}:records`, JSON.stringify(getRecords()));
    container.addEventListener("input", persist);
    container.addEventListener("change", persist);
    return { getRecords };
  }

  /* ======================================================================
     Portfolio report (Final Project, C-04): self-contained .html download
     ====================================================================== */
  const escHTML = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const REPORT_FOOTER = "Training work sample — fictional client. Not paid client work. Probinsiyanong VA · General Administrative VA — Beginner Foundations. Written work is checked for required parts only; it is not individually reviewed.";
  // Same sections as printWorkSample. No scripts, no external requests; every learner value is escaped.
  function reportHTML({ title, subtitle, sections, learnerName, date = new Date() }) {
    const when = date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    const cell = (v) => (v == null || v === "" ? "—" : escHTML(v));
    const body = sections.map((sec) => `<h2>${escHTML(sec.heading)}</h2>` + (sec.table
      ? `<table><thead><tr>${sec.table.columns.map((c) => `<th>${escHTML(c)}</th>`).join("")}</tr></thead><tbody>${sec.table.rows.map((r) => `<tr>${r.map((v) => `<td>${cell(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      : `<p class="text">${cell(sec.text)}</p>`)).join("\n");
    const meta = [subtitle, learnerName ? `Learner: ${learnerName}` : null, `Report date ${when}`].filter(Boolean).map(escHTML).join(" · ");
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHTML(title)}</title>
<style>
body{font-family:Georgia,"Times New Roman",serif;color:#1f2a24;max-width:860px;margin:32px auto;padding:0 20px;line-height:1.5}
h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1.15rem;margin:26px 0 8px;border-bottom:1px solid #c9cfc3;padding-bottom:4px}
.meta{color:#4a554e;margin:0 0 18px}.text{white-space:pre-wrap;margin:0}
table{border-collapse:collapse;width:100%;font-size:.92rem}th,td{border:1px solid #c9cfc3;padding:6px 8px;text-align:left;vertical-align:top;white-space:pre-wrap}
th{background:#f1f3ee}.footer{margin-top:30px;font-size:.85rem;color:#4a554e;border-top:1px solid #c9cfc3;padding-top:10px}
@media print{body{margin:0}}
</style></head>
<body>
<h1>${escHTML(title)}</h1>
<p class="meta">${meta}</p>
${body}
<p class="footer">${escHTML(REPORT_FOOTER)}</p>
</body></html>
`;
  }
  function downloadReport(opts, filename) {
    const blob = new Blob([reportHTML(opts)], { type: "text/html" });
    const a = h("a", { href: URL.createObjectURL(blob), download: filename });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    return blob;
  }

  /* ======================================================================
     Quick re-check runner (decision 5) — on the completion step, before completion
     ====================================================================== */
  function runRecheck(panel, label, finish) {
    const completion = panel.querySelector(".completion-panel") || panel.firstElementChild;
    panel.querySelectorAll(".ga-recheck").forEach((e) => e.remove());
    // Items whose definition no longer exists in the lesson cannot be asked; they are retired.
    const st0 = readRecheck();
    const missing = st0.queue.filter((k) => !recheckDefs.has(k));
    if (missing.length) {
      missing.forEach((k) => { st0.items[k].recheck.passedAt = nowISO(); st0.items[k].retired = true; });
      st0.queue = st0.queue.filter((k) => recheckDefs.has(k));
      writeRecheck(st0);
    }
    if (!readRecheck().queue.length) { if (completion) completion.hidden = false; finish(); return; }

    if (completion) completion.hidden = true;
    label.textContent = "Quick re-check";
    const headingId = uid("recheck");
    const heading = h("h2", { tabindex: "-1", id: headingId }, "Quick re-check");
    const intro = h("p", {}, "You found the right answer to these after a first try. Answer them once more — the options are in a new order. The lesson is complete when all are right.");
    const left = h("p", { class: "ga-recheck-left small" });
    const body = h("div", { class: "ga-recheck-item" });
    const status = h("p", { class: "ga-recheck-status", role: "status", "aria-live": "polite" });
    const box = h("section", { class: "ga-recheck", "aria-labelledby": headingId }, heading, intro, left, body, status);
    panel.prepend(box);

    function ask(first) {
      const st = readRecheck();
      if (!st.queue.length) {
        box.replaceChildren(h("h2", { tabindex: "-1" }, "Re-check complete"), h("p", {}, "All answered correctly."));
        if (completion) completion.hidden = false;
        finish();
        return;
      }
      const key = st.queue[0];
      const { item, context } = recheckDefs.get(key);
      left.textContent = `${st.queue.length} question${st.queue.length > 1 ? "s" : ""} left`;
      const qTitle = h("h3", { class: "ga-recheck-q", tabindex: "-1" }, `Question: ${(context[0] && context[0].textContent) || "Re-check"}`);
      const options = h("div", { class: "ga-options", role: "group", "aria-label": item.prompt || "Choose an answer" });
      for (const opt of shuffle(item.options)) {
        options.append(h("button", { type: "button", class: "ga-option", "data-option": opt.id, onclick: () => answer(key, opt) }, opt.text));
      }
      body.replaceChildren(qTitle, ...context.slice(1).map((n) => n.cloneNode(true)),
        item.prompt ? h("p", { class: "ga-item-prompt" }, item.prompt) : null, options);
      if (!first) qTitle.focus(); else heading.focus();
    }
    function answer(key, opt) {
      body.querySelectorAll("button").forEach((b) => { b.disabled = true; });
      const st = readRecheck();
      const it = st.items[key];
      it.recheck.attempts += 1;
      if (opt.correct) {
        it.recheck.passedAt = nowISO();
        st.queue = st.queue.filter((k) => k !== key);
        status.textContent = "Answer recorded.";
      } else {
        it.recheck.wrong += 1;
        st.queue = st.queue.filter((k) => k !== key).concat(key);
        status.textContent = "Not yet — this question will come back after the others.";
      }
      writeRecheck(st);
      ask(false);
    }
    ask(true);
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
    if (Number.isInteger(lesson)) currentLesson = lesson;
    document.body.classList.add("ga-v2");
    mountSkipLink();
    mountStorageBanner();
    return getStore();
  }

  root.PVAGAActivities = {
    version: "2.0.0-wp4",
    getStore,
    initPage,
    shuffle,
    ChoiceActivity,
    // A single-choice item without a requirement of its own (Final Project Task 8).
    ChoiceItem: (container, item, opts) => renderChoiceItem(container, item, opts),
    CleanRecords,
    reportHTML,
    downloadReport,
    SortActivity,
    TriageActivity,
    IdentifyActivity,
    WrittenWork,
    RowTable,
    ChoiceRows,
    ScheduleActivity,
    Stepper,
    printWorkSample,
    renderPreview,
    livePreview,
    _h: h,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
