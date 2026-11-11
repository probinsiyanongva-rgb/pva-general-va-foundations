/* PVA Free Training — Customer Support pathway progress tracking.
   Same API shape as /shared/progress.js (the General Admin pathway's
   tracker), but under its own localStorage key and global name so
   completing one pathway never marks the other's lessons as done.
   No accounts, no backend — progress lives in this browser only. */

(function (global) {
  const KEY = "pva-cs-ft-progress";

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
      /* storage unavailable — fail silently, page still works */
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

  global.PVACS = {
    markLessonComplete,
    isLessonComplete,
    markFinalTaskComplete,
    isFinalTaskComplete,
    completedLessonCount,
    resetAll,
  };
})(window);
