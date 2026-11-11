/* PVA Free Training — local progress tracking
   No accounts, no backend. Progress lives in this browser only, via
   localStorage. If the learner clears site data or switches devices,
   progress resets — the hub page says so plainly. */

(function (global) {
  const KEY = "pva-gadmin-ft-progress";

  function readAll() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { lessons: {}, finalProject: {} };
    } catch (e) {
      return { lessons: {}, finalProject: {} };
    }
  }

  function writeAll(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* storage unavailable (private mode, quota) — fail silently,
         the page still works, it just won't remember next time */
    }
  }

  function markLessonComplete(lessonId) {
    const data = readAll();
    data.lessons[lessonId] = { complete: true, at: new Date().toISOString() };
    writeAll(data);
  }

  function isLessonComplete(lessonId) {
    const data = readAll();
    return !!(data.lessons[lessonId] && data.lessons[lessonId].complete);
  }

  function markFinalTaskComplete(taskId) {
    const data = readAll();
    data.finalProject[taskId] = { complete: true, at: new Date().toISOString() };
    writeAll(data);
  }

  function isFinalTaskComplete(taskId) {
    const data = readAll();
    return !!(data.finalProject[taskId] && data.finalProject[taskId].complete);
  }

  function completedLessonCount(totalLessons) {
    const data = readAll();
    let n = 0;
    for (let i = 1; i <= totalLessons; i++) {
      if (data.lessons[i] && data.lessons[i].complete) n++;
    }
    return n;
  }

  function resetAll() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  global.PVAFT = {
    markLessonComplete,
    isLessonComplete,
    markFinalTaskComplete,
    isFinalTaskComplete,
    completedLessonCount,
    resetAll,
  };
})(window);
