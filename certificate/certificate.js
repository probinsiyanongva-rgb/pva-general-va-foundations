/* ==========================================================================
   General Admin VA v2.0 — Certificate page (WP5)
   --------------------------------------------------------------------------
   Eligibility is live: isCertificateEligible() on the stored answers under the current
   rules. cert.completedAt and issuedAt are history and never unlock anything (WP4 F1).
   One wording object (D1, approved 14 Nov 2026, unchanged) feeds the on-screen
   certificate, the print/PDF page and the SVG. Names are inserted as text (HTML) and
   escaped (SVG). Uses the existing progress engine for name lock, issue, code, backup.
   ========================================================================== */
(function () {
  "use strict";
  const GA = window.PVAGA;
  const store = GA.createProgress({ rules: window.PVAGAValidators });
  const LESSONS = typeof PVAFT_LESSONS !== "undefined" ? PVAFT_LESSONS : []; // V1 data file (read only): a global const, not a window property
  const $ = (id) => document.getElementById(id);
  const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v === true ? "" : String(v));
    for (const c of children.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  };

  /* ---- D1 wording: the only source for screen, print/PDF and SVG ---- */
  const WORDING = {
    title: "Certificate of Completion",
    lead: "This certifies that",
    body: "has completed the self-paced online course General Administrative VA — Beginner Foundations, including its required learning activities, interactive scenario assessments, practice activities, and an eight-task simulated client project.",
    meta: (date, code) => `Completed ${date} · Probinsiyanong VA · Reference ${code}`,
    scope: "Scope: This course is self-paced. Assessments are unproctored and completed in the learner's own browser. The learner's identity was not independently verified, and written work was not individually reviewed. This certificate is not a professional license, government qualification or accreditation, and it does not guarantee employment.",
  };
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fmtDate = (iso) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

  // Storage banner (M-03)
  store.on("storage-unavailable", () => {
    if (document.querySelector(".ga-storage-banner")) return;
    $("main").prepend(h("div", { class: "ga-storage-banner", role: "alert" },
      h("strong", {}, "Your progress is not being saved in this browser. "),
      "Site storage is blocked or full, so a certificate can't be generated here. Open the course in Chrome or Safari with site storage enabled."));
  });

  $("scopeText").textContent = WORDING.scope;

  /* ---- progress and what remains ---- */
  function remaining(ev) {
    const out = [];
    for (const l of ev.lessons) {
      if (l.complete) continue;
      const t = (LESSONS.find((x) => x.id === l.n) || {}).title || "";
      const href = `/lessons/lesson-${String(l.n).padStart(2, "0")}/`;
      const what = l.completedInV1Only ? "completed in an earlier version — redo the updated checks"
        : l.passed === l.total ? "all activities done — open the lesson and reach its last step to finish it"
        : `${l.passed} of ${l.total} activities done`;
      out.push(h("li", {}, h("a", { href }, `Lesson ${l.n} — ${t}`), `: ${what}`));
    }
    const fp = ev.finalProject;
    if (!fp.complete) {
      const what = fp.passed === fp.total ? "all tasks meet their required parts — press Finish Project on its last step"
        : fp.firstCompletedAt ? `finished before, but a task no longer meets its required parts (${fp.passed} of ${fp.total} tasks pass) — fix it and press Finish Project again`
        : `${fp.passed} of ${fp.total} tasks done`;
      out.push(h("li", {}, h("a", { href: "/final-project/" }, "Final Project"), `: ${what}`));
    }
    return out;
  }

  /* ---- certificate rendering ---- */
  function sheet(cert) {
    return [
      h("div", { class: "ga-cert-inner" },
        h("p", { class: "ga-cert-title" }, WORDING.title),
        h("p", { class: "ga-cert-lead" }, WORDING.lead),
        h("p", { class: "ga-cert-name" }, cert.name),
        h("p", { class: "ga-cert-body" }, WORDING.body),
        h("p", { class: "ga-cert-meta" }, WORDING.meta(fmtDate(cert.completedAt), cert.code)),
        h("p", { class: "ga-cert-scopeline" }, WORDING.scope)),
    ];
  }
  const xml = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch]));
  function wrap(text, max) {
    const lines = [];
    let line = "";
    for (const w of String(text).split(/\s+/)) {
      if ((line + " " + w).trim().length > max && line) { lines.push(line); line = w; } else line = (line + " " + w).trim();
    }
    if (line) lines.push(line);
    return lines;
  }
  function certSVG(cert) {
    const W = 1100, H = 850;
    const t = (y, size, text, extra = "") => `<text x="${W / 2}" y="${y}" font-size="${size}" text-anchor="middle"${extra}>${xml(text)}</text>`;
    const block = (y, size, lines, gap) => lines.map((l, i) => t(y + i * gap, size, l)).join("\n");
    const nameLines = wrap(cert.name, 44);
    const nameSize = nameLines.length > 1 ? 34 : 44;
    let y = 150;
    const parts = [t(y, 46, WORDING.title, ' font-weight="700"')];
    y += 70; parts.push(t(y, 22, WORDING.lead));
    y += 64; parts.push(block(y, nameSize, nameLines, nameSize + 8)); y += (nameLines.length - 1) * (nameSize + 8);
    y += 58; const body = wrap(WORDING.body, 88); parts.push(block(y, 20, body, 30)); y += (body.length - 1) * 30;
    y += 58; parts.push(t(y, 18, WORDING.meta(fmtDate(cert.completedAt), cert.code)));
    const scope = wrap(WORDING.scope, 120); parts.push(block(H - 130, 13, scope, 19));
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Georgia, 'Times New Roman', serif" fill="#1f2a24">
<title>${xml(WORDING.title)} — ${xml(cert.name)}</title>
<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#2f4a3a" stroke-width="4"/>
<rect x="44" y="44" width="${W - 88}" height="${H - 88}" fill="none" stroke="#b08a4a" stroke-width="1.5"/>
${parts.join("\n")}
</svg>
`;
  }

  /* ---- page state ---- */
  let editingName = false;
  function render() {
    const eligible = store.isCertificateEligible(); // writes cert.completedAt the first time (clarification 2)
    const ev = store.evaluate();
    const cert = store.getCert();
    const done = ev.completedLessons + (ev.finalProject.complete ? 1 : 0);
    $("certStatusLine").textContent = eligible ? "Ready — all 13 lessons and the Final Project are complete." : `Locked — ${done} of 14 complete.`;
    $("certStatusLine").className = `ga-cert-status ${eligible ? "is-ready" : "is-locked"}`;
    const rem = remaining(ev);
    $("remainingList").replaceChildren(...rem);
    $("remainingList").hidden = rem.length === 0;

    const issued = !!cert.issuedAt;
    const nameEl = $("certName");
    if (document.activeElement !== nameEl && !editingName) nameEl.value = cert.name;
    nameEl.readOnly = issued && !editingName;
    $("certAck").checked = cert.ack;
    $("certAck").disabled = issued;
    $("correctNameBtn").hidden = !issued || editingName;
    $("saveNameBtn").hidden = !editingName;
    const persistent = store.isPersistent();
    const ready = eligible && cert.name.trim() !== "" && cert.ack && persistent;
    $("generateBtn").hidden = issued;
    $("generateBtn").disabled = !ready;
    $("generateNote").textContent = issued ? "Your certificate has been generated. The name is locked; use “Correct my name” only to fix a mistake."
      : !eligible ? "Generate unlocks when every item above is complete."
      : !persistent ? "Site storage isn't working in this browser, so the certificate can't be recorded."
      : !cert.name.trim() ? "Add your name to continue."
      : !cert.ack ? "Tick the scope acknowledgement to continue." : "";

    const show = issued && eligible;
    $("certificate").hidden = !show;
    if (show) $("certSheet").replaceChildren(...sheet(cert));
    $("certLocked").hidden = !(issued && !eligible);
    $("certLocked").textContent = issued && !eligible
      ? `Your certificate is locked because something above is no longer complete. Fix it and the certificate comes back with its original completion date (${fmtDate(cert.completedAt)}).` : "";
  }

  $("certName").addEventListener("input", () => { if (!store.getCert().issuedAt) { store.setCertName($("certName").value); render(); } });
  $("certAck").addEventListener("change", () => { store.setCertAck($("certAck").checked); render(); });
  $("generateBtn").addEventListener("click", () => {
    const r = store.issueCertificate();
    if (!r.ok) $("generateNote").textContent = "The certificate couldn't be generated: " + r.reason.replace(/-/g, " ") + ".";
    else { render(); $("certHeading").setAttribute("tabindex", "-1"); $("certHeading").focus(); }
  });
  $("correctNameBtn").addEventListener("click", () => { editingName = true; render(); $("certName").focus(); });
  $("saveNameBtn").addEventListener("click", () => {
    const v = $("certName").value.trim();
    if (!v) { $("generateNote").textContent = "The name can't be empty."; return; }
    store.setCertName(v, { correction: true });
    store.issueCertificate(); // keeps issuedAt and completedAt; updates the reference code
    editingName = false;
    render();
  });
  $("printCertBtn").addEventListener("click", () => {
    document.body.classList.add("ga-cert-printing");
    const done = () => { document.body.classList.remove("ga-cert-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  });
  $("svgCertBtn").addEventListener("click", () => {
    const cert = store.getCert();
    const blob = new Blob([certSVG(cert)], { type: "image/svg+xml" });
    const a = h("a", { href: URL.createObjectURL(blob), download: "General-Admin-VA-Certificate-of-Completion.svg" });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });

  /* ---- backup and restore (RE-07): restore always asks first ---- */
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  $("backupBtn").addEventListener("click", () => {
    const blob = new Blob([store.exportBackup()], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `general-admin-va-progress-backup-${stamp()}.json` });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    $("restoreNote").textContent = "Backup downloaded.";
  });
  const ERRORS = {
    empty: "That file is empty.", "too-large": "That file is too large to be a progress backup.", "not-json": "That file isn't a progress backup.",
    "not-a-backup": "That file isn't a progress backup.", "different-course": "That backup is for a different course.",
    "unsupported-version": "That backup was made by a version of the course this page can't read.",
  };
  const describe = (s) => `${s.lessonsComplete} of 13 lessons complete, Final Project ${s.finalProjectComplete ? "complete" : "not complete"}`;
  let pending = null;
  $("restoreFile").addEventListener("change", async () => {
    const f = $("restoreFile").files[0];
    if (!f) return;
    const text = await f.text();
    const r = store.restoreBackup(text); // without confirmation this only inspects
    if (!r.needsConfirmation) { pending = null; $("restorePanel").hidden = true; $("restoreNote").textContent = ERRORS[r.error] || "That backup can't be restored."; return; }
    pending = text;
    $("restoreSummary").textContent = `This backup${r.exportedAt ? ` from ${fmtDate(r.exportedAt)}` : ""} has ${describe(r.backup)}. Restoring replaces your current progress in this browser (${describe(r.current)}).`;
    $("restorePanel").hidden = false;
    $("restoreNote").textContent = "";
    $("restoreConfirmBtn").focus();
  });
  $("restoreCancelBtn").addEventListener("click", () => { pending = null; $("restorePanel").hidden = true; $("restoreFile").value = ""; $("restoreNote").textContent = "Restore cancelled. Nothing was changed."; });
  $("restoreConfirmBtn").addEventListener("click", () => {
    if (!pending) return;
    const r = store.restoreBackup(pending, { confirmed: true });
    pending = null;
    $("restorePanel").hidden = true;
    $("restoreFile").value = "";
    $("restoreNote").textContent = r.ok ? (r.saved ? "Progress restored." : "Progress restored for this visit only — site storage isn't working in this browser.") : "That backup can't be restored.";
    render();
  });

  render();
})();
