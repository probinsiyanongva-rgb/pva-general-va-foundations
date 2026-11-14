/* ==========================================================================
   General Admin VA v2.0 — structure checks for written work (PVAGAValidators)
   --------------------------------------------------------------------------
   IMPORTANT — what these checks are, and are not:
   They check STRUCTURE ONLY: that required parts are present, long enough,
   not copied from the examples, not filler, and in the required form.
   They do NOT and cannot check whether the work is accurate, well written,
   good advice, or professionally sound. No person reviews this work.
   Labels shown to learners must say "Required parts complete" /
   "Missing: …" — never "Correct", "Passed", "Approved" or "Reviewed".

   Every rule is a pure function: rule(answer) -> { ok, checks[], missing[] }
     checks  — [{ label, ok }] for the live checklist under the fields
     missing — labels of the checks that failed
   The certificate page re-runs these on stored answers (spec: NT-02).
   ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PVAGAValidators = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COPY = {
    complete: "Required parts complete",
    missingPrefix: "Missing: ",
    checklistHeading: "Automatic structure check",
    transparency:
      "Checked automatically: required parts, length, structure. Not checked: whether your content is correct or well written — no one reviews this work.",
  };

  /* ---------------- text helpers ---------------- */
  const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const norm = (s) => str(s).toLowerCase().replace(/\s+/g, " ").trim();

  // Words of 2+ letters/digits. Tokens with a run of 3+ identical LETTERS
  // ("aaaa", "xxx") are treated as filler and not counted. Numbers such as
  // "2000" or "1000" are real content and are kept.
  // D5 (correction pass) — a heuristic, not a definition of a word: an ASCII-letter token of
  // 3+ letters with no vowel (a e i o u y) is treated as a keyboard mash ("qwer zxcv") and not
  // counted, unless it is a common abbreviation. Non-ASCII words, numbers and mixed tokens are kept.
  const NO_VOWEL_OK = new Set(("sop sops crm crms pdf pdfs url urls sms csv csvs html http https www ftp sftp ssl vpn dns cms lms sql xml svg png jpg txt rtf ppt pptx xls xlsx " +
    "ltd mrs mgr tbd qty pkg pst pdt cst cdt mst mdt gmt pht nyc bcc rsvp btw wfh ppc cpc cpm ctr dms pls thx nth std hrs mtg wk wks").split(" "));
  const isMash = (w) => /^[b-df-hj-np-tv-xz]{3,}$/.test(w) && !NO_VOWEL_OK.has(w);
  function wordsOf(text) {
    return (str(text).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [])
      .filter((w) => w.replace(/['’-]/g, "").length >= 2 && !/(\p{L})\1\1/u.test(w) && !isMash(w.replace(/['’-]/g, "")));
  }
  // Meaningful word count: if fewer than 60% of words are distinct, only the
  // distinct words count (so "test test test test" counts as 1).
  // WP4 red-team F3: distinctness is judged on word stems, so repeated variations
  // ("check checked checking checks") count once, like plain repetition.
  const stem = (w) => w.replace(/['’]s$/, "").replace(/(ing|ed|es|s)$/, "").slice(0, 6) || w;
  function wordCount(text) {
    const w = wordsOf(text);
    if (w.length === 0) return 0;
    const distinct = new Set(w.map(stem)).size;
    return distinct / w.length < 0.6 ? distinct : w.length;
  }
  const questionCount = (t) => (str(t).match(/\?/g) || []).length;

  const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";
  const DAYS = "mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday";
  const TIME_RE = new RegExp(`\\b(\\d{1,2}(:\\d{2})?\\s?(am|pm|a\\.m\\.|p\\.m\\.)|\\d{1,2}:\\d{2}|noon|midnight|eod|end of day)\\b`, "i");
  const DATE_RE = new RegExp(`(\\b\\d{4}-\\d{1,2}-\\d{1,2}\\b|\\b\\d{1,2}/\\d{1,2}(/\\d{2,4})?\\b|\\b(${MONTHS})\\.?\\s+\\d{1,2}\\b|\\b\\d{1,2}\\s+(${MONTHS})\\b)`, "i");
  const DAYWORD_RE = new RegExp(`\\b(today|tomorrow|tonight|this (morning|afternoon|week)|next week|${DAYS})\\b`, "i");
  const hasTime = (t) => TIME_RE.test(str(t));
  // D6: a time zone is a UTC/GMT offset, a zone abbreviation, or a real word of 3+ letters
  // (a city, a country, "client's local time"). Not "ok", "tbd" or "n/a".
  const TZ_ABBR = new Set("utc gmt pht phst pst pdt pt est edt et cst cdt ct mst mdt mt akst akdt hst aest aedt acst acdt awst nzst nzdt bst ist cet cest wet west eet eest jst kst sgt hkt msk".split(" "));
  const TZ_PLACEHOLDERS = new Set(["tbd", "tba", "none", "unknown", "test", "same", "time", "zone", "timezone", "okay", "yes"]);
  function hasTimeZone(t) {
    const raw = str(t).toLowerCase();
    if (/\b(utc|gmt)\s*([+\-−]\s*\d{1,2}(:?\d{2})?)?\b/.test(raw)) return true;
    const ws = raw.match(/\p{L}+/gu) || [];
    if (ws.some((w) => TZ_ABBR.has(w))) return true;
    return ws.some((w) => w.length >= 3 && !isMash(w) && /[aeiouy]|[^\x00-\x7f]/.test(w) && !TZ_PLACEHOLDERS.has(w));
  }
  const VERSION_WORD = /\b(v\d+|v#|vx|ver\d*|versions?|versioning|versioned|drafts?|final|finals|finalised|finalized|archives?|archived|archiving|approved|approval|revisions?|rev\d*)\b/i;
  const CHECK_VERB = /\b(compar(?:e|es|ed|ing)|check(?:s|ed|ing)?|double[- ]check(?:s|ed|ing)?|cross[- ]check(?:s|ed|ing)?|spot[- ]check(?:s|ed|ing)?|re-?check(?:s|ed|ing)?|verif(?:y|ies|ied|ying)|review(?:s|ed|ing)?|count(?:s|ed|ing)?|recount(?:s|ed|ing)?|match(?:es|ed|ing)?|confirm(?:s|ed|ing)?|inspect(?:s|ed|ing)?|audit(?:s|ed|ing)?|proofread(?:s|ing)?|test(?:s|ed|ing)?)\b/i;
  const DATA_KIND = /\b(names?|full names?|phones?|phone numbers?|mobile numbers?|contact (?:numbers?|details|info)|address(?:es)?|e-?mails?|e-?mail address(?:es)?|bank(?:ing)?|accounts?|account numbers?|cards?|credit cards?|card numbers?|passwords?|logins?|pins?|ids?|id numbers?|passports?|ssns?|tins?|health|medical|salar(?:y|ies)|payroll|pay|contracts?|customer|customers|client data|client details|client information|client files|personal|private|confidential|birthdays?|birth ?dates?|date of birth|financial|finances|invoices?|order numbers?)\b/i;
  // A genuine calendar date: 2026-11-11, 11/11/2026, 11/11, 11 Nov 2026, Nov 11, 2026.
  // Day and month must be real (no 32/13, no 31 Feb). Numeric d/m forms accept either order.
  const MONTH_NUM = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  const monthOf = (name) => MONTH_NUM[name.toLowerCase().slice(0, name.toLowerCase().startsWith("sept") ? 4 : 3)];
  const validDay = (d, m, y) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y || 2024, m, 0)).getUTCDate();
  function hasDate(t) {
    const text = str(t);
    let m;
    const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
    while ((m = iso.exec(text))) if (validDay(+m[3], +m[2], +m[1])) return true;
    const num = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
    while ((m = num.exec(text))) {
      const a = +m[1], b = +m[2], y = m[3] ? +m[3] : undefined;
      if (validDay(a, b, y) || validDay(b, a, y)) return true;
    }
    const dm = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS})\\b\\.?(?:,?\\s+(\\d{4}))?`, "gi");
    while ((m = dm.exec(text))) if (validDay(+m[1], monthOf(m[2]), m[3] ? +m[3] : undefined)) return true;
    const md = new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})\\b(?:,?\\s+(\\d{4}))?`, "gi");
    while ((m = md.exec(text))) if (validDay(+m[2], monthOf(m[1]), m[3] ? +m[3] : undefined)) return true;
    return false;
  }
  const hasWhen = (t) => hasTime(t) || hasDate(t) || DAYWORD_RE.test(str(t));
  // An owner names a real person or role: at least one word of 3+ letters with a vowel that is not a
  // placeholder, or the short forms "me", "VA". "xy", "tbd", "n/a", "test", "someone" do not count.
  const OWNER_PLACEHOLDERS = new Set(["tbd", "tba", "tbc", "test", "asd", "asdf", "qwe", "qwer", "qwerty", "abc", "xyz", "none", "nobody", "someone", "anyone", "owner", "name", "person", "unknown", "nil", "null", "na", "n/a"]);
  function meaningfulOwner(t) {
    const raw = str(t).trim().toLowerCase();
    if (!raw || OWNER_PLACEHOLDERS.has(raw)) return false;
    const words = raw.match(/[\p{L}]+/gu) || [];
    return words.some((w) => w === "me" || w === "va" || (w.length >= 3 && /[aeiou]/.test(w) && !OWNER_PLACEHOLDERS.has(w) && !/(\p{L})\1\1/u.test(w)));
  }
  const hasURL = (t) => /https?:\/\/[^\s.]+\.[^\s]+/i.test(str(t));

  // Steps: numbered markers ("1." "2)") or separate lines with 2+ words.
  function stepCount(text) {
    const t = str(text);
    const numbered = (t.match(/(^|\s|\n)\d{1,2}[.)]\s*\S/g) || []).length;
    const lines = t.split(/\n|;/).filter((l) => wordCount(l) >= 2).length;
    return Math.max(numbered, lines);
  }
  // Items in a list written on lines or separated by commas.
  const listItems = (t) => str(t).split(/\n|,|;/).filter((x) => wordCount(x) >= 1).length;

  // Near copy: ≥80% of the learner's words appear in the example, and they
  // share ≥80% of the example's words. Catches pasted or lightly edited models.
  function nearCopy(text, model) {
    const a = new Set(wordsOf(text));
    const b = new Set(wordsOf(model));
    if (a.size === 0 || b.size === 0) return false;
    let shared = 0;
    a.forEach((w) => { if (b.has(w)) shared++; });
    return shared / a.size >= 0.8 && shared / b.size >= 0.8;
  }
  const notCopyOfAny = (text, models) => !models.some((m) => nearCopy(text, m) || norm(text) === norm(m));

  /* ---------------- result builder ---------------- */
  function result(checks) {
    const missing = checks.filter((c) => !c.ok).map((c) => c.label);
    return { ok: missing.length === 0, checks, missing };
  }
  const c = (label, ok) => ({ label, ok: !!ok });
  const rowsOf = (a) => (a && Array.isArray(a.rows) ? a.rows : []);
  const obj = (a) => (a && typeof a === "object" ? a : {});

  /* ---------------- examples and models (from the lesson pages) ---------------- */
  // Example rows that start prefilled. Unchanged, they never count (audit C-02).
  const EXAMPLES = {
    l04: ["meeting moved from 10 am to 2 pm", "refund threat re: 1-star review"],
    l05: ["team meeting", "presentation"],
    l06: ["01_admin", "02_reports", "03_archive"],
    l07: ["maria cruz, 0917-123-4567, active", "juan dela cruz, 0918.222.3333, active"],
    l10: ["reply to vendor 'urgent' email", "finish monthly report"],
    l11: ["summarize the fictional email", "identify action items", "draft task list", "draft client update"],
  };
  const MODELS = {
    l02Clarify:
      "Which fields should be standardized, and is there an existing format? Should duplicates be removed or flagged? Is there a required folder and naming convention?",
    l03John: "I have two contacts listed as John. Could you confirm which one you'd like me to schedule with?",
    l03Examples: [
      "I understand that you'd like the spreadsheet cleaned and standardized. For duplicate records, would you prefer that I remove them or flag them for your review?",
      "Hi Mark, quick update on the vendor research. I reviewed eight options and narrowed them to three that meet the budget requirement. I'm comparing contract terms now and will add the final comparison to the tracker this afternoon.",
      "Hi Anna, I wanted to flag a potential delay with the contact cleanup. There are significantly more duplicate records than expected, so I may need until 3 PM tomorrow rather than the original noon target. I can prioritize the urgent records first if you'd like.",
      "I noticed that I uploaded the previous version of the report. I've replaced it with the corrected version and checked the file. No client-facing information was sent from the incorrect version.",
    ],
    l09Purpose: "Ensure overdue invoices are identified and followed up on time each week.",
  };
  const isExampleRow = (key, firstField) => EXAMPLES[key].includes(norm(firstField));

  const SOP_FIELDS = ["Purpose", "Trigger", "Inputs", "Tools/access", "Steps", "Exceptions", "Escalation", "Definition of done"];
  const CATEGORIES = ["reply", "client_review", "action", "waiting", "reference", "archive"];
  const PRIORITIES = ["high", "medium", "low"];
  const STATUSES = ["not started", "in progress", "waiting", "done", "blocked"];

  /* ---------------- schedule data (structured activities, spec T4) ---------------- */
  const toMin = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(str(hhmm));
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  const overlaps = (a, b) => a.start < b.end && b.start < a.end;

  const L05 = {
    day: { start: toMin("9:00"), end: toMin("17:00") },
    lunch: { start: toMin("12:00"), end: toMin("13:00") },
    items: {
      team: { label: "Team meeting", duration: 60, mustStart: "10:00" },
      vendor: { label: "Vendor call", duration: 60, mustStart: "11:00" },
      presentation: { label: "Client presentation", duration: 60, mustStart: "15:00" },
      buffer: { label: "15-minute buffer", duration: 15 },
      prospect: { label: "Prospect call (30 min)", duration: 30 },
    },
  };
  const FP_T2 = {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    hours: { start: toMin("8:00"), end: toMin("17:00") },
    items: {
      walkthrough: { label: "Customer walk-through (1 hour)", duration: 60 },
      supplier: { label: "Supplier call (30 minutes)", duration: 30 },
      checkin: { label: "Team check-in (30 minutes)", duration: 30 },
      insurance: { label: "Insurance agent call (30 minutes)", duration: 30 },
    },
  };

  /* ---------------- Final Project Task 3 dataset (WP4, approved 14 Nov 2026) ----------------
     Fictional placeholder numbers (09XX…), each source record in a different layout. `clean` is
     the model answer (shown only after the task passes); the rule never compares word for word. */
  const FP_T3_FIELDS = ["name", "mobile", "status", "email", "date"];
  const FP_T3_RECORDS = [
    { id: "R1", original: { name: "juan santos", mobile: "09XX.XXX.0001", status: "active", email: "(no email)", date: "2026-02-11" },
      clean: { name: "Juan Santos", mobile: "+63 9XX XXX 0001", status: "Active", email: "(email missing)", date: "2026-02-11" }, flag: "missing-email",
      why: "No email on file: flag it so someone can ask the customer for one. Don't invent an address." },
    { id: "R2", original: { name: "MARIA LOPEZ", mobile: "09XX-XXX-0002", status: "ACTIVE", email: "maria.lopez@example.com", date: "2026-01-20" },
      clean: { name: "Maria Lopez", mobile: "+63 9XX XXX 0002", status: "Active", email: "maria.lopez@example.com", date: "2026-01-20" }, flag: "none",
      why: "The original record of the Maria Lopez pair (flagging R2 against R3 instead is also accepted)." },
    { id: "R3", original: { name: "Maria  Lopez", mobile: "+63 9XX XXX 0002", status: "Active", email: "maria.lopez@example.com", date: "20 Jan 2026" },
      clean: { name: "Maria Lopez", mobile: "+63 9XX XXX 0002", status: "Active", email: "maria.lopez@example.com", date: "2026-01-20" }, flag: "duplicate", duplicateOf: "R2",
      why: "Same person, number and email as R2, written differently. Flag it and keep both records; the client decides what to merge." },
    { id: "R4", original: { name: "pedro reyes", mobile: "09XX XXX 0004", status: "inactive", email: "pedro.reyes@example.com", date: "2025-12-02" },
      clean: { name: "Pedro Reyes", mobile: "+63 9XX XXX 0004", status: "Inactive", email: "pedro.reyes@example.com", date: "2025-12-02" }, flag: "none", why: "Formatting only." },
    { id: "R5", original: { name: "Ana Garcia", mobile: "09XXXXX0005", status: "Active", email: "ana.garcia@example.com", date: "03/04/26" },
      clean: { name: "Ana Garcia", mobile: "+63 9XX XXX 0005", status: "Active", email: "ana.garcia@example.com", date: "03/04/26" }, flag: "ambiguous-date",
      clarification: "Please confirm the date added: 03/04/26 could mean 3 April 2026 or 4 March 2026.",
      why: "03/04/26 can be read two ways. Keep it as it is and ask, rather than guessing." },
    { id: "R6", original: { name: "LIZA TAN", mobile: "09XX-XXX-0006", status: "active", email: "liza.tan@example.com", date: "2026-02-28" },
      clean: { name: "Liza Tan", mobile: "+63 9XX XXX 0006", status: "Active", email: "liza.tan@example.com", date: "2026-02-28" }, flag: "none", why: "Formatting only." },
    { id: "R7", original: { name: "ben cruz", mobile: "+639XXXXX0007", status: "ACTIVE", email: "ben.cruz@example.com", date: "2026-03-05" },
      clean: { name: "Ben Cruz", mobile: "+63 9XX XXX 0007", status: "Active", email: "ben.cruz@example.com", date: "2026-03-05" }, flag: "none", why: "Formatting only." },
    { id: "R8", original: { name: "Carlo  Mendoza", mobile: "09XX XXX 0008", status: "Inactive", email: "carlo.m@example.com", date: "2025-11-15" },
      clean: { name: "Carlo Mendoza", mobile: "+63 9XX XXX 0008", status: "Inactive", email: "carlo.m@example.com", date: "2025-11-15" }, flag: "none", why: "Formatting only (the double space in the name)." },
  ];
  const FP_T3_EXAMPLES = [
    { id: "E1", original: { name: "Rosa Diaz", mobile: "09XX-XXX-0091", status: "active", email: "rosa.diaz@example.com", date: "2026-01-05" },
      clean: { name: "Rosa Diaz", mobile: "+63 9XX XXX 0091", status: "Active", email: "rosa.diaz@example.com", date: "2026-01-05" }, flag: "none" },
    { id: "E2", original: { name: "ROSA DIAZ", mobile: "09XXXXX0091", status: "ACTIVE", email: "rosa.diaz@example.com", date: "5 Jan 2026" },
      clean: { name: "Rosa Diaz", mobile: "+63 9XX XXX 0091", status: "Active", email: "rosa.diaz@example.com", date: "2026-01-05" }, flag: "duplicate", duplicateOf: "E1" },
  ];
  // Task 3 field helpers
  const t3Name = (v, orig) => {
    const t = str(v);
    return t === t.trim().replace(/\s+/g, " ") && t.length > 0 && norm(t) === norm(orig) && t.split(" ").every((w) => /^\p{Lu}[\p{Ll}'’-]*$/u.test(w));
  };
  const phoneKey = (v) => {
    let k = str(v).toUpperCase().replace(/[^0-9X+]/g, "");
    if (k.startsWith("+63")) k = k.slice(3); else if (k.startsWith("63") && k.length === 12) k = k.slice(2); else if (k.startsWith("0")) k = k.slice(1);
    return k;
  };
  const phoneLayout = (v) => str(v).trim().replace(/[0-9Xx]/g, "#");
  const statusStyle = (v) => { const t = str(v).trim(); return /^[A-Z][a-z]+$/.test(t) ? "T" : t === t.toUpperCase() ? "U" : t === t.toLowerCase() ? "L" : "X"; };
  // A cleaned date in an unambiguous format: ISO, "20 Jan 2026" / "20 January 2026", "Jan 20, 2026" / "January 20, 2026".
  function parseCleanDate(v) {
    const t = str(v).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (m) return validDay(+m[3], +m[2], +m[1]) ? { y: +m[1], m: +m[2], d: +m[3], fmt: "iso" } : null;
    m = new RegExp(`^(\\d{1,2}) (${MONTHS})\\.? (\\d{4})$`, "i").exec(t);
    if (m) return validDay(+m[1], monthOf(m[2]), +m[3]) ? { y: +m[3], m: monthOf(m[2]), d: +m[1], fmt: "dmy-" + (m[2].length > 3 ? "full" : "abbr") } : null;
    m = new RegExp(`^(${MONTHS})\\.? (\\d{1,2}), (\\d{4})$`, "i").exec(t);
    if (m) return validDay(+m[2], monthOf(m[1]), +m[3]) ? { y: +m[3], m: monthOf(m[1]), d: +m[2], fmt: "mdy-" + (m[1].length > 3 ? "full" : "abbr") } : null;
    return null;
  }
  const sameDay = (a, b) => a && b && a.y === b.y && a.m === b.m && a.d === b.d;
  const REQUEST_WORD = /\b(confirm(?:s|ed|ing)?|check(?:s|ed|ing)?|verif(?:y|ies|ied|ying)|ask(?:s|ed|ing)?|clarif(?:y|ies|ied|ying))\b/i;
  const READ_3_APRIL = /\b(3(?:rd)?\s+(?:of\s+)?april|april\s+3(?:rd)?)\b|\b2026-04-03\b/i;
  const READ_4_MARCH = /\b(4(?:th)?\s+(?:of\s+)?march|march\s+4(?:th)?)\b|\b2026-03-04\b/i;
  const t3Clarification = (v) => wordCount(v) >= 6 && REQUEST_WORD.test(str(v)) && READ_3_APRIL.test(str(v)) && READ_4_MARCH.test(str(v));

  /* ---------------- Final Project Task 8 options (feedback is also the copy check) ---------------- */
  const FP_T8 = {
    options: [
      { id: "s1", correct: false,
        text: "Share the owner's login this one time so the job can start, then ask the owner to change the password.",
        feedback: "Sharing the owner's own login, even \"just once,\" defeats the point of individual access and is exactly the convenience-over-security tradeoff this course warns against." },
      { id: "s2", correct: true,
        text: "Explain that credentials can't be shared, and set up (or ask the owner to set up) the subcontractor's own access instead.",
        feedback: "Correct. If the software supports separate logins or delegated access, set that up (or flag it to the owner to set up) rather than sharing credentials — even under time pressure." },
      { id: "s3", correct: false,
        text: "Leave the text unanswered until you've had time to think it through and check with someone.",
        feedback: "Ignoring a time-sensitive request doesn't protect anything — it just leaves the subcontractor stuck and the owner unaware there's an access gap to fix." },
    ],
  };

  /* ======================================================================
     Rules
     ====================================================================== */
  const rules = {
    /* ---- Lesson 1: General Admin Task Map ---- */
    "l01-ws"(a) {
      const rows = rowsOf(a).filter((r) => str(r.area).trim() && (str(r.tasks).trim() || str(r.skills).trim()));
      const full = rows.filter((r) => wordCount(r.tasks) >= 4 && wordCount(r.skills) >= 3);
      const keys = full.map((r) => norm(r.area) + "|" + norm(r.tasks));
      return result([
        c("At least 3 areas with tasks (4+ words) and skills (3+ words)", full.length >= 3),
        c("No two rows are the same", new Set(keys).size === keys.length),
      ]);
    },

    /* ---- Lesson 2 ---- */
    "l02-clarify"(a) {
      const t = obj(a).text;
      return result([
        c("At least 3 questions (3 question marks)", questionCount(t) >= 3),
        c("At least 15 words", wordCount(t) >= 15),
        c("Written in your own words, not the suggested answer", notCopyOfAny(t, [MODELS.l02Clarify])),
      ]);
    },
    "l02-ws"(a) {
      // A row counts as started once anything beyond the request is filled in (the first request
      // is prefilled). Every started row must be complete, so extra rows are never silently ignored.
      const PLAN = ["outcome", "questions", "steps", "deadline", "dod", "priority", "dependsOn"];
      const started = rowsOf(a).filter((r) => PLAN.some((k) => str(r[k]).trim()));
      const rows = started.length ? started : [{}];
      const all = (fn) => rows.every(fn);
      const label = (txt) => (rows.length > 1 ? `${txt} — every request` : txt);
      return result([
        c(label("Desired outcome (5+ words)"), all((r) => wordCount(r.outcome) >= 5)),
        c(label("Questions include at least 2 question marks"), all((r) => questionCount(r.questions) >= 2)),
        c(label("At least 3 steps"), all((r) => stepCount(r.steps) >= 3)),
        c(label("Deadline names a day, date or time"), all((r) => hasWhen(r.deadline))),
        c(label("Definition of done (6+ words)"), all((r) => wordCount(r.dod) >= 6)),
        c(label("Priority chosen"), all((r) => PRIORITIES.includes(norm(r.priority)))),
        c(label("Depends on: filled in (write \"none\" if nothing)"), all((r) => wordCount(r.dependsOn) >= 1 || norm(r.dependsOn) === "none")),
      ]);
    },

    /* ---- Lesson 3 ---- */
    "l03-john"(a) {
      const t = obj(a).text;
      return result([
        c("Asks a question (has a question mark)", questionCount(t) >= 1),
        c("At least 8 words", wordCount(t) >= 8),
        c("Written in your own words, not the suggested answer", notCopyOfAny(t, [MODELS.l03John])),
      ]);
    },
    "l03-ws"(a) {
      const m = obj(a);
      const keys = ["clarify", "progress", "completion", "delay", "error"];
      const names = { clarify: "Clarification request", progress: "Progress update", completion: "Completion update", delay: "Delay notice", error: "Error report" };
      const checks = keys.map((k) => c(`${names[k]}: 20+ words`, wordCount(m[k]) >= 20));
      checks.push(c("Clarification request asks a question", questionCount(m.clarify) >= 1));
      checks.push(c("Delay notice gives a day, date or time", hasWhen(m.delay)));
      checks.push(c("Error report: 30+ words", wordCount(m.error) >= 30));
      checks.push(c("None of the messages copies the lesson's examples", keys.every((k) => notCopyOfAny(m[k], MODELS.l03Examples))));
      return result(checks);
    },

    /* ---- Lesson 4: Inbox Triage Sheet ---- */
    "l04-ws"(a) {
      const rows = rowsOf(a).filter((r) => !isExampleRow("l04", r.subject) && str(r.subject).trim());
      const valid = rows.filter((r) => CATEGORIES.includes(r.category) && PRIORITIES.includes(norm(r.priority)) && wordCount(r.action) >= 3);
      const waitingOk = rows.filter((r) => r.category === "waiting").every((r) => hasWhen(r.followup));
      return result([
        c("At least 3 messages of your own (besides the 2 examples)", rows.length >= 3),
        c("Each has a category, a priority and an action (3+ words)", rows.length >= 3 && valid.length === rows.length),
        c("At least one message marked Client review", rows.some((r) => r.category === "client_review")),
        c("Every Waiting message has a follow-up date", waitingOk),
      ]);
    },

    /* ---- Lesson 5 ---- */
    "l05-schedule"(a) {
      const p = obj(obj(a).placements);
      const slot = (k) => {
        const s = toMin(p[k]);
        return Number.isNaN(s) ? null : { start: s, end: s + L05.items[k].duration, key: k };
      };
      const placed = Object.keys(L05.items).map(slot);
      const all = placed.every(Boolean);
      const within = all && placed.every((s) => s.start >= L05.day.start && s.end <= L05.day.end);
      const asRequested = all && ["team", "vendor", "presentation"].every((k) => p[k] === L05.items[k].mustStart);
      const buf = slot("buffer");
      const pres = slot("presentation");
      const bufferOk = !!(buf && pres && buf.end === pres.start);
      const pr = slot("prospect");
      const prospectOk = !!(pr && pr.start >= toMin("13:00") && pr.end <= L05.day.end);
      let noOverlap = all;
      if (all) for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) if (overlaps(placed[i], placed[j])) noOverlap = false;
      const lunchFree = all && placed.every((s) => !overlaps(s, L05.lunch));
      return result([
        c("Every item has a start time", all),
        c("Everything fits inside working hours (9 AM–5 PM)", within),
        c("Team meeting, vendor call and presentation kept at their requested times", asRequested),
        c("15-minute buffer placed directly before the presentation", bufferOk),
        c("Prospect call placed in the afternoon", prospectOk),
        c("No two items overlap", noOverlap),
        c("Lunch (12–1 PM) kept free", lunchFree),
        // Correction pass (decision 3): answered by the "which request can't fit?" question; the label names no answer.
        c("Identified the request that can't fit", obj(a).cannotFit === "focus"),
      ]);
    },
    "l05-ws"(a) {
      // Exclude the two example rows only while unchanged. A learner's own row may use the
      // same event name (the lesson asks them to log the practice requests).
      const rows = rowsOf(a).filter((r) => str(r.event).trim() && !(r.example === true && isExampleRow("l05", r.event)));
      const valid = rows.filter((r) => hasTime(r.confirmed) && hasTimeZone(r.tz));
      return result([
        c("At least 4 events of your own", rows.length >= 4),
        c("Each has a confirmed time and a time zone", rows.length >= 4 && valid.length === rows.length),
        c("At least one buffer or prep time noted", rows.some((r) => /buffer|prep|travel|break/i.test(str(r.notes)))),
      ]);
    },

    /* ---- Lesson 6 ---- */
    "l06-ws"(a) {
      const rows = rowsOf(a).filter((r) => str(r.folder).trim() && !isExampleRow("l06", r.folder));
      // D1: whole tokens only, so "address" no longer counts as "dd".
      const tokenOk = (n) => (str(n).toLowerCase().match(/[a-z0-9]+/g) || []).some((t) =>
        /^(y{2,4}|m{2,3}|d{2}|yyyymmdd|yyyymm|ddmmyyyy|mmddyyyy|yymmdd|date[sd]?|version|ver|rev|v|vx|vn+|v\d+|ver\d+|rev\d+|r\d{2})$/.test(t) ||
        /^(19|20)\d{2}(\d{2}){0,2}$/.test(t) || /^\d{2}(\d{2})?(19|20)\d{2}$/.test(t) || /[a-z]v\d+$/.test(t));
      return result([
        c("At least 2 folders of your own (besides the 3 starters)", rows.length >= 2),
        c("Each naming convention includes a date or version part", rows.length >= 2 && rows.every((r) => tokenOk(r.naming))),
        c("Each folder says who needs access", rows.length >= 2 && rows.every((r) => wordCount(r.access) >= 1)),
        // D2: the rule must actually talk about versions.
        c("Version rule written (8+ words, naming how versions are marked, e.g. v01, draft, final, archive)", wordCount(obj(a).versionRule) >= 8 && VERSION_WORD.test(str(obj(a).versionRule))),
      ]);
    },

    /* ---- Lesson 7 ---- */
    "l07-ws"(a) {
      const rows = rowsOf(a).filter((r) => str(r.original).trim() && !isExampleRow("l07", r.original));
      const changed = rows.filter((r) => wordCount(r.cleaned) >= 1 && norm(r.cleaned) !== norm(r.original));
      return result([
        c("At least 4 records of your own, each with a cleaned version that differs from the original", changed.length >= 4),
        c("At least 3 cleaning rules listed", listItems(obj(a).rules) >= 3),
        // D3: the description must say how the work was checked.
        c("Quality check described (8+ words, saying how you checked, e.g. compared, counted, verified)", wordCount(obj(a).qaCheck) >= 8 && CHECK_VERB.test(str(obj(a).qaCheck))),
      ]);
    },

    /* ---- Lesson 8 ---- */
    "l08-compare"(a) {
      const rows = rowsOf(a).filter((r) => str(r.tool).trim());
      const priceOk = (p) => /\d/.test(str(p)) || /not published|contact sales|on request/i.test(str(p));
      const sourceOk = (s) => hasURL(s) || wordCount(s) >= 2;
      return result([
        c("3 tools listed", rows.length >= 3),
        c("Each has a price, or says \"not published\"", rows.length >= 3 && rows.every((r) => priceOk(r.price))),
        c("Each has a source (link or publisher name)", rows.length >= 3 && rows.every((r) => sourceOk(r.source))),
        c("Each has the date you checked it (a calendar date, e.g. 11 Nov 2026)", rows.length >= 3 && rows.every((r) => hasDate(r.checked))),
      ]);
    },
    "l08-ws"(a) {
      const m = obj(a);
      return result([
        c("Client question written as a question", wordCount(m.question) >= 5 && questionCount(m.question) >= 1),
        c("At least 3 criteria", listItems(m.criteria) >= 3),
        c("Findings (40+ words)", wordCount(m.findings) >= 40),
        c("Caveats (8+ words)", wordCount(m.caveats) >= 8),
        c("At least 2 sources", listItems(m.sources) >= 2),
      ]);
    },

    /* ---- Lesson 9 ---- */
    "l09-practice"(a) {
      const f = obj(obj(a).fields);
      return result([
        c("All 8 SOP parts filled (3+ words each)", SOP_FIELDS.every((k) => wordCount(f[k]) >= 3)),
        c("Steps: at least 3", stepCount(f.Steps) >= 3),
      ]);
    },
    "l09-ws"(a) {
      const f = obj(obj(a).fields);
      return result([
        c("All 8 SOP parts filled", SOP_FIELDS.every((k) => wordCount(f[k]) >= 2)),
        c("Steps: at least 3", stepCount(f.Steps) >= 3),
        c("Trigger (4+ words)", wordCount(f.Trigger) >= 4),
        c("Escalation (6+ words)", wordCount(f.Escalation) >= 6),
        c("Definition of done (6+ words)", wordCount(f["Definition of done"]) >= 6),
        c("A different task from the invoice example", notCopyOfAny(f.Purpose, [MODELS.l09Purpose])),
      ]);
    },

    /* ---- Lesson 10: Task Tracker ---- */
    "l10-ws"(a) {
      const rows = rowsOf(a).filter((r) => str(r.task).trim() && !isExampleRow("l10", r.task));
      const valid = rows.filter((r) => meaningfulOwner(r.owner) && PRIORITIES.includes(norm(r.priority)) && STATUSES.includes(norm(r.status)) && wordCount(r.next) >= 3);
      return result([
        c("At least 3 tasks of your own (besides the 2 examples)", rows.length >= 3),
        c("Each has an owner, priority, status and next action (3+ words)", rows.length >= 3 && valid.length === rows.length),
        c("At least one dependency noted", rows.some((r) => wordCount(r.dependency) >= 2)),
        c("At least one follow-up date", rows.some((r) => hasWhen(r.followup))),
      ]);
    },

    /* ---- Lesson 11 ---- */
    "l11-ws"(a) {
      const rows = rowsOf(a);
      const changed = rows.filter((r) => str(r.step).trim() && !isExampleRow("l11", r.ai) && wordCount(r.ai) >= 2);
      return result([
        c("4 workflow rows", rows.filter((r) => str(r.step).trim()).length >= 4),
        c("At least 3 rows changed from the examples", changed.length >= 3),
        c("Each human-verification step has 6+ words", rows.length >= 4 && rows.every((r) => wordCount(r.human) >= 6)),
        // D4: must name at least one kind of data.
        c("\"Never paste into AI\" filled in (6+ words, naming at least one kind of data)", wordCount(obj(a).neverPaste) >= 6 && DATA_KIND.test(str(obj(a).neverPaste))),
      ]);
    },

    /* ---- Lesson 12 ---- */
    "l12-ws"(a) {
      const items = Array.isArray(obj(a).items) ? a.items : [];
      return result([
        c("All 6 items answered Yes or No", items.length === 6 && items.every((i) => i && (i.answer === "yes" || i.answer === "no"))),
        c("Every \"No\" has an action note (5+ words)", items.filter((i) => i && i.answer === "no").every((i) => wordCount(i.note) >= 5)),
      ]);
    },

    /* ---- Lesson 13 ---- */
    "l13-ws"(a) {
      const checks = Array.isArray(obj(a).checks) ? a.checks : [];
      const report = obj(a).issueReport;
      return result([
        c("All 5 checks marked Pass or Fail", checks.length === 5 && checks.every((x) => x && (x.result === "pass" || x.result === "fail"))),
        c("Each check has evidence (6+ words)", checks.length === 5 && checks.every((x) => x && wordCount(x.evidence) >= 6)),
        c("Issue report (25+ words)", wordCount(report) >= 25),
        c("Issue report covers what happened, the action taken and what remains",
          /\b(happen(?:s|ed|ing)?|found|notic(?:e|ed|ing)|issues?)\b/i.test(str(report)) &&
          /\b(did|fix(?:ed|ing)?|correct(?:ed|ing)?|actions?|chang(?:e|ed|ing)|flag(?:ged|ging)?)\b/i.test(str(report)) &&
          /\b(remains?|remaining|next|still|pending|recommend(?:s|ed|ing)?)\b/i.test(str(report))),
      ]);
    },

    /* ---- Final Project ---- */
    "fp-t2"(a) {
      const p = obj(obj(a).placements);
      const slot = (k) => {
        const v = obj(p[k]);
        const s = toMin(v.start);
        if (!FP_T2.days.includes(v.day) || Number.isNaN(s)) return null;
        return { key: k, day: v.day, start: s, end: s + FP_T2.items[k].duration };
      };
      const placed = Object.keys(FP_T2.items).map(slot);
      const all = placed.every(Boolean);
      const within = all && placed.every((s) => s.start >= FP_T2.hours.start && s.end <= FP_T2.hours.end);
      let noOverlap = all;
      if (all) for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
        if (placed[i].day === placed[j].day && overlaps(placed[i], placed[j])) noOverlap = false;
      }
      const w = slot("walkthrough");
      const notWedMorning = !!(w && !(w.day === "Wed" && w.start < toMin("12:00")));
      const buffer = !!(w && w.start - 30 >= FP_T2.hours.start && all &&
        placed.filter((s) => s.key !== "walkthrough" && s.day === w.day).every((s) => !overlaps(s, { start: w.start - 30, end: w.start })));
      const s = slot("supplier");
      const ins = slot("insurance");
      return result([
        c("All four items scheduled (day and time)", all),
        c("Everything within 8 AM–5 PM", within),
        c("No two items overlap", noOverlap),
        c("Walk-through not on a Wednesday morning", notWedMorning),
        c("30 minutes kept free before the walk-through", buffer),
        c("Supplier call at 2:00 PM Northstar time (3 PM UTC+9)", !!(s && s.start === toMin("14:00"))),
        c("Insurance call on Friday afternoon", !!(ins && ins.day === "Fri" && ins.start >= toMin("12:00"))),
        c("Note on what needs confirmation (10+ words)", wordCount(obj(a).note) >= 10),
      ]);
    },
    "fp-t3"(a) {
      // Field-level checks on the resulting values (WP4, approved 14 Nov 2026). Labels name the kind
      // of problem, never a record. Every record must end in a correct state.
      const recs = Array.isArray(obj(a).records) ? a.records : [];
      const byId = Object.fromEntries(recs.filter((r) => r && typeof r === "object" && r.id).map((r) => [r.id, r]));
      const present = FP_T3_RECORDS.every((o) => byId[o.id]);
      const val = (id, f) => str((byId[id] || {})[f]);
      const each = (fn) => present && FP_T3_RECORDS.every((o) => fn(o, byId[o.id]));
      const flagOf = (id) => { const f = str((byId[id] || {}).flag).trim(); return f === "" ? "none" : f; };
      const namesOk = each((o, r) => t3Name(r.name, o.original.name));
      const phonesOk = each((o, r) => phoneKey(r.mobile) === phoneKey(o.original.mobile)) && new Set(FP_T3_RECORDS.map((o) => phoneLayout(val(o.id, "mobile")))).size === 1;
      const statusOk = each((o, r) => norm(r.status) === norm(o.original.status) && /^(active|inactive)$/.test(norm(r.status))) &&
        new Set(FP_T3_RECORDS.map((o) => statusStyle(val(o.id, "status")))).size === 1 && statusStyle(val("R1", "status")) !== "X";
      const emailOk = each((o, r) => (/@/.test(o.original.email) ? norm(r.email) === norm(o.original.email) && str(r.email).trim() !== "" : !/@/.test(str(r.email))));
      const readable = FP_T3_RECORDS.filter((o) => o.flag !== "ambiguous-date");
      const parsed = readable.map((o) => parseCleanDate(val(o.id, "date")));
      const datesOk = present && parsed.every(Boolean) && new Set(parsed.map((p) => p.fmt)).size === 1 &&
        readable.every((o, i) => sameDay(parsed[i], parseCleanDate(o.original.date) || parseCleanDate(o.clean.date)));
      const ambiguousOk = present && val("R5", "date").trim() === "03/04/26" && t3Clarification(val("R5", "clarification"));
      const flaggedOk = present && flagOf("R1") === "missing-email" && flagOf("R5") === "ambiguous-date";
      const dupR3 = flagOf("R3") === "duplicate" && str(byId.R3 && byId.R3.duplicateOf) === "R2";
      const dupR2 = flagOf("R2") === "duplicate" && str(byId.R2 && byId.R2.duplicateOf) === "R3";
      const duplicateOk = present && (dupR3 !== dupR2) && (dupR3 ? flagOf("R2") === "none" : flagOf("R3") === "none") &&
        FP_T3_FIELDS.every((f) => val("R2", f).trim() && val("R3", f).trim());
      const othersOk = present && ["R4", "R6", "R7", "R8"].every((id) => flagOf(id) === "none");
      return result([
        c("Names: extra spaces removed, every name in Title Case", namesOk),
        c("Mobile numbers: the same number, in one consistent format", phonesOk),
        c("Status: written the same way on every record", statusOk),
        c("Emails kept exactly as they were; none invented", emailOk),
        c("Dates: one unambiguous format, the same date as the original", datesOk),
        c("A date that can't be read safely is kept and marked for confirmation", ambiguousOk),
        c("Missing information and unreadable dates are flagged", flaggedOk),
        c("The duplicate: exactly one record flagged, both kept", duplicateOk),
        c("No other record is flagged", othersOk),
        c("At least 3 cleaning rules listed", listItems(obj(a).rules) >= 3),
      ]);
    },
    "fp-t4"(a) {
      const rows = rowsOf(a).filter((r) => str(r.tool).trim());
      const base = rules["l08-compare"]({ rows }).checks;
      base.push(c("Each tool has pros and cons (3+ words each)", rows.length >= 3 && rows.every((r) => wordCount(r.pros) >= 3 && wordCount(r.cons) >= 3)));
      return result(base);
    },
    "fp-t5"(a) {
      const f = obj(obj(a).fields);
      return result([
        c("All 8 SOP parts filled", SOP_FIELDS.every((k) => wordCount(f[k]) >= 2)),
        c("Steps: at least 3", stepCount(f.Steps) >= 3),
        c("Trigger names the booking event", /\b(book(?:s|ed|ing|ings)?|schedul(?:e|es|ed|ing)|new customers?|jobs?)\b/i.test(str(f.Trigger)) && wordCount(f.Trigger) >= 3),
        c("Escalation (6+ words)", wordCount(f.Escalation) >= 6),
        c("Definition of done (6+ words)", wordCount(f["Definition of done"]) >= 6),
      ]);
    },
    "fp-t6"(a) {
      const rows = rowsOf(a).filter((r) => str(r.task).trim() && r.example !== true);
      // In the Final Project the business owner is a real assignee, so "Owner" counts here.
      const fpOwner = (t) => meaningfulOwner(t) || /^\s*(the\s+)?(business\s+)?owner\s*$/i.test(str(t));
      const valid = rows.filter((r) => fpOwner(r.owner) && PRIORITIES.includes(norm(r.priority)) && STATUSES.includes(norm(r.status)) && wordCount(r.next) >= 2);
      // Q4: the note must identify the real conflict (installation vs insurance renewal) and ask the owner to decide.
      const note = str(obj(a).conflictNote);
      const namesBoth = /\binstall(?:ation|ations|ing|ed|s)?\b/i.test(note) && /\b(insurance|renewal)\b/i.test(note);
      const asksOwner = /\bowner(?:'s|’s)?\b/i.test(note) && /\b(ask(?:s|ed|ing)?|confirm(?:s|ed|ing)?|decid(?:e|es|ed|ing)|decision|choos(?:e|es|ing)|chose|prioriti[sz](?:e|es|ed|ing)|check(?:s|ed|ing)? with)\b/i.test(note);
      return result([
        c("At least 3 tasks of your own (besides the examples)", rows.length >= 3),
        c("Each has an owner (a name or role), priority, status and next action", rows.length >= 3 && valid.length === rows.length),
        c("At least one dependency noted", rows.some((r) => wordCount(r.dependency) >= 2)),
        c("The conflict is explained (10+ words) and names both competing tasks", wordCount(note) >= 10 && namesBoth),
        c("The note asks the owner to decide", asksOwner),
      ]);
    },
    "fp-t7"(a) {
      const m = obj(a);
      return result([
        c("What you used AI for (10+ words)", wordCount(m.used) >= 10),
        c("How you verified it (15+ words)", wordCount(m.verify) >= 15),
        c("Verification names at least one check (names, dates, facts, or confidential data)", /\b(names?|dates?|facts?|numbers?|confidential|personal|sources?|original)\b/i.test(str(m.verify))),
        c("Confirmed that no confidential data was pasted into AI", m.noConfidential === true),
      ]);
    },
    "fp-t8"(a) {
      const m = obj(a);
      return result([
        c("Safer response chosen", m.correct === true),
        c("Explanation (20+ words)", wordCount(m.explanation) >= 20),
        c("Explanation names who is told and what happens next", /\b(owner(?:'s|’s|s)?|client(?:'s|’s|s)?|manager(?:'s|’s|s)?)\b/i.test(str(m.explanation)) && /\b(next|then|set(?:s|ting)? up|access|accounts?|until|after|afterwards)\b/i.test(str(m.explanation))),
        c("Written in your own words, not copied from the feedback", notCopyOfAny(str(m.explanation), FP_T8.options.map((o) => o.feedback))),
      ]);
    },
    "fp-checklist"(a) {
      const items = Array.isArray(obj(a).checked) ? a.checked : [];
      return result([c("All 8 statements confirmed", items.length === 8 && items.every((x) => x === true))]);
    },
  };

  const ruleNames = Object.keys(rules);
  // Label for a written-work status line. Never "Correct" (spec clarification 3).
  const statusLabel = (res) => (res.ok ? COPY.complete : COPY.missingPrefix + res.missing.join("; "));

  return {
    ...rules,
    __meta: { COPY, ruleNames, statusLabel, L05, FP_T2, FP_T3_RECORDS, FP_T3_EXAMPLES, FP_T3_FIELDS, FP_T8, helpers: { wordCount, wordsOf, stepCount, nearCopy, hasTime, hasDate, hasWhen, hasURL, questionCount, listItems, meaningfulOwner, hasTimeZone, parseCleanDate, phoneKey, t3Clarification, isMash, VERSION_WORD, CHECK_VERB, DATA_KIND } },
  };
});
