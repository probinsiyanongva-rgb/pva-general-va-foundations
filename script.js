(function () {
  const grid = document.getElementById("lessonGrid");
  const total = PVAFT_LESSONS.length;

  function render() {
    grid.innerHTML = "";
    PVAFT_LESSONS.forEach((lesson) => {
      const done = window.PVAFT.isLessonComplete(lesson.id);

      if (!lesson.built) {
        const div = document.createElement("div");
        div.className = "folder-tab lesson-card lesson-card-soon";
        div.setAttribute("data-tab", "LESSON " + lesson.id);
        div.innerHTML = `
          <h3>${lesson.title}</h3>
          <div class="output"><strong>Output:</strong> ${lesson.output}</div>
          <div class="status-row">
            <span class="stamp pending">Coming soon</span>
          </div>
        `;
        grid.appendChild(div);
        return;
      }

      const a = document.createElement("a");
      a.href = lesson.href;
      a.className = "folder-tab lesson-card";
      a.setAttribute("data-tab", "LESSON " + lesson.id);
      a.innerHTML = `
        <h3>${lesson.title}</h3>
        <div class="output"><strong>Output:</strong> ${lesson.output}</div>
        <div class="status-row">
          <span class="stamp ${done ? "" : "pending"}">${done ? "✓ Processed" : "Not started"}</span>
        </div>
      `;
      grid.appendChild(a);
    });

    const completed = window.PVAFT.completedLessonCount(total);
    document.getElementById("progressCount").textContent = completed;

    const rail = document.getElementById("progressRail");
    rail.innerHTML = "";
    for (let i = 1; i <= total; i++) {
      const seg = document.createElement("div");
      seg.className = "seg" + (i <= completed ? " done" : "");
      rail.appendChild(seg);
    }
  }

  document.getElementById("resetProgressBtn").addEventListener("click", function () {
    if (confirm("Reset all lesson progress on this device? This can't be undone.")) {
      window.PVAFT.resetAll();
      render();
    }
  });

  render();
})();
