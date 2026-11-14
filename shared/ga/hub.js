/* ==========================================================================
   General Admin VA v2.0 — course hub (WP5)
   --------------------------------------------------------------------------
   Replaces the V1 hub script (/script.js, kept unchanged on disk) for the General
   Admin hub only. Reads the one v2 progress store; status is always live
   (isCertificateEligible / evaluate), never a stored completedAt (WP4 red-team F1).
   Requires: progress-core.js, manifest.js, validators.js, lessons-data.js (titles only).
   ========================================================================== */
(function () {
  "use strict";
  const GA = window.PVAGA;
  const store = GA.createProgress({ rules: window.PVAGAValidators });
  // Titles, outputs and hrefs from the V1 data file (read only). It declares a top-level const,
  // which is a global binding but not a window property.
  const LESSONS = typeof PVAFT_LESSONS !== "undefined" ? PVAFT_LESSONS : []; // eslint-disable-line no-undef

  const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v === true ? "" : String(v));
    for (const c of children.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  };

  // Storage banner (M-03)
  store.on("storage-unavailable", () => {
    if (document.querySelector(".ga-storage-banner")) return;
    const main = document.querySelector("main") || document.body;
    main.prepend(h("div", { class: "ga-storage-banner", role: "alert" },
      h("strong", {}, "Your progress is not being saved in this browser. "),
      "Site storage is blocked or full (this often happens in private windows and some in-app browsers). You can keep working, but your answers and completion will be lost when you leave. Open the course in Chrome or Safari with site storage enabled."));
  });

  function lessonStatus(l) {
    if (l.complete) return { text: "✓ Completed", cls: "" };
    if (l.completedInV1Only) return { text: "Completed in an earlier version — please redo the updated checks", cls: "pending ga-hub-v1" };
    if (l.passed > 0) return { text: `In progress · ${l.passed} of ${l.total} activities`, cls: "pending" };
    return { text: "Not started", cls: "pending" };
  }

  function render() {
    const eligible = store.isCertificateEligible(); // also records cert.completedAt the first time (clarification 2)
    const ev = store.evaluate();
    const grid = document.getElementById("lessonGrid");
    grid.replaceChildren();
    for (const lesson of LESSONS) {
      const info = ev.lessons.find((l) => l.n === lesson.id);
      const st = lessonStatus(info);
      grid.append(h("a", { href: lesson.href, class: "folder-tab lesson-card", "data-tab": `LESSON ${lesson.id}`, "data-lesson": lesson.id },
        h("h3", {}, lesson.title),
        h("div", { class: "output" }, h("strong", {}, "Output:"), ` ${lesson.output}`),
        h("div", { class: "status-row" }, h("span", { class: `stamp ${st.cls}` }, st.text))));
    }

    document.getElementById("progressCount").textContent = String(ev.completedLessons);
    const rail = document.getElementById("progressRail");
    rail.replaceChildren(...ev.lessons.map((l) => h("div", { class: `seg${l.complete ? " done" : ""}`, title: `Lesson ${l.n}${l.complete ? " — completed" : ""}` })));
    rail.setAttribute("role", "img");
    rail.setAttribute("aria-label", `Lessons completed: ${ev.lessons.filter((l) => l.complete).map((l) => l.n).join(", ") || "none"}`);

    // Final Project card status (live)
    const fp = ev.finalProject;
    const fpText = fp.complete ? "✓ Complete"
      : fp.firstCompletedAt ? "Needs attention — a task no longer meets its required parts"
      : fp.passed > 0 ? `In progress · ${fp.passed} of ${fp.total} tasks` : "Not started";
    const fpStamp = document.getElementById("finalStatus");
    fpStamp.textContent = fpText;
    fpStamp.className = `stamp ${fp.complete ? "" : "pending"}`;

    // Certificate card (live eligibility only)
    const done = ev.completedLessons + (fp.complete ? 1 : 0);
    const certStamp = document.getElementById("certStatus");
    certStamp.textContent = eligible ? "Ready" : `Locked — ${done} of 14 complete`;
    certStamp.className = `stamp ${eligible ? "" : "pending"}`;
    document.getElementById("certCard").setAttribute("data-state", eligible ? "ready" : "locked");
  }

  // Reset (m-02): says it resets everything, including the Final Project.
  document.getElementById("resetProgressBtn").addEventListener("click", () => {
    if (confirm("Reset all progress on this device? This clears every lesson, the Final Project and your certificate record, and it can't be undone. (Download a backup first from the Certificate page if you want to keep it.)")) {
      store.reset();
      render();
    }
  });
  render();
})();
