// WP2: structure-check rules (shared/ga/validators.js).
// Each rule: empty fails, filler fails, copied examples fail, a genuine answer passes.
const test = require("node:test");
const assert = require("node:assert");
const V = require("../../shared/ga/validators.js");
const PVAGA = require("../../shared/ga/manifest.js");
const { COPY, ruleNames, statusLabel, helpers } = V.__meta;

const FILLER = "aaaa aaaa aaaa test test test test test xxxxx xxxx ????";
const ok = (name, ans) => V[name](ans);

test("every rule named in the manifest is registered, and no extra rules exist", () => {
  assert.deepStrictEqual([...ruleNames].sort(), [...PVAGA.ruleNames()].sort());
});

test("empty and missing answers fail every rule without throwing", () => {
  for (const n of ruleNames) {
    for (const a of [undefined, null, {}, "", 42, { rows: "x" }]) {
      const r = V[n](a);
      assert.strictEqual(r.ok, false, `${n} with ${JSON.stringify(a)}`);
      assert.ok(r.missing.length > 0);
    }
  }
});

test("filler is not counted as words", () => {
  assert.strictEqual(helpers.wordCount("aaaa bbbb cccc"), 0);
  assert.strictEqual(helpers.wordCount("test test test test test"), 1);
  assert.strictEqual(helpers.wordCount("I checked the invoice list against the tracker"), 7, "words of 2+ letters (spec)");
  assert.strictEqual(helpers.wordCount(FILLER), 1);
  // Review fix: numbers with repeated digits are real words, not filler.
  assert.strictEqual(helpers.wordCount("The fee is 1000 pesos for 2000 units"), 8);
});

test("labels never claim correctness for written work (clarification 3)", () => {
  const bad = /\b(correct|passed|approved|reviewed|accurate)\b/i;
  assert.strictEqual(COPY.complete, "Required parts complete");
  assert.ok(!bad.test(COPY.complete) && !bad.test(COPY.checklistHeading));
  assert.match(COPY.transparency, /Not checked/);
  assert.doesNotMatch(COPY.transparency, /checklist/i); // no lesson has a self-review checklist (WP3a review)
  for (const n of ruleNames) for (const c of V[n]({}).checks) assert.ok(!bad.test(c.label) || /not the suggested/i.test(c.label), `${n}: "${c.label}"`);
  assert.strictEqual(statusLabel({ ok: false, missing: ["A", "B"] }), "Missing: A; B");
});

/* ---------------- genuine answers ---------------- */
const GOOD = {
  "l01-ws": { rows: [
    { area: "Communication", tasks: "Sorting incoming email and sending confirmations", skills: "Clarity, tone, prioritizing" },
    { area: "Scheduling", tasks: "Booking client calls across time zones", skills: "Attention to detail, planning" },
    { area: "Information", tasks: "Updating the contact spreadsheet every week", skills: "Accuracy, consistency, organization" },
  ] },
  "l02-clarify": { text: "Should I merge duplicate contacts or flag them for you? Which column order do you prefer? Where should I save the finished file and by what time tomorrow?" },
  "l02-ws": { rows: [{ request: "Organize contacts", outcome: "A clean contact list the team can filter", questions: "Merge or flag duplicates? Which format for phone numbers?", steps: "1. Copy the file 2. Standardize names 3. Flag duplicates 4. Check and report", deadline: "Tomorrow 10 AM", dod: "Every row standardized and duplicates flagged for review", priority: "High", dependsOn: "Client answer on duplicates" }] },
  "l03-john": { text: "Which John should I invite: John Reyes from accounting or John Lim from the supplier?" },
  "l03-ws": {
    clarify: "Thanks for the list of vendors. Before I start comparing them, could you tell me whether the budget limit is per month or per year so I compare the right figures?",
    progress: "Quick update on the onboarding checklist: I have drafted the first two sections and checked them against the HR policy. Next I will add the IT access steps and share the draft tomorrow.",
    completion: "The client list cleanup is finished. All 240 rows now use the same name and phone format, duplicates are flagged in column F, and the file is saved in the Reports folder as agreed.",
    delay: "I need to flag a delay on the supplier comparison. Two vendors have not replied with prices yet, so I expect to finish by Thursday 3 PM instead of Wednesday. I can send a partial version today if helpful.",
    error: "I noticed that yesterday's meeting invite went out with the wrong time zone, showing 2 PM Manila instead of 2 PM Sydney. I have already sent a corrected invite to all five attendees and confirmed with two of them. Three replies are still pending, so I recommend a short reminder tomorrow morning.",
  },
  "l04-ws": { rows: [
    { subject: "Meeting moved from 10 AM to 2 PM", category: "action", priority: "Medium", action: "Update calendar" },
    { subject: "Supplier invoice for March", category: "client_review", priority: "High", action: "Forward to client for approval" },
    { subject: "Newsletter from industry group", category: "reference", priority: "Low", action: "Save to reading folder" },
    { subject: "Waiting on contract from vendor", category: "waiting", priority: "Medium", action: "Track and follow up", followup: "Friday" },
  ] },
  "l05-schedule": { placements: { team: "10:00", vendor: "11:00", presentation: "15:00", buffer: "14:45", prospect: "13:30" }, cannotFit: "focus" },
  "l05-ws": { rows: [
    { event: "Team meeting", confirmed: "10:00 AM", tz: "Manila", notes: "", example: true },
    { event: "Supplier call", confirmed: "2:00 PM", tz: "Manila (UTC+8)", notes: "Prep notes 15 min before" },
    { event: "Dentist", confirmed: "9:00 AM", tz: "Manila", notes: "Travel buffer 30 min" },
    { event: "Board review", confirmed: "4:00 PM", tz: "Sydney", notes: "Send deck" },
    { event: "Weekly sync", confirmed: "11:00 AM", tz: "Manila", notes: "None" },
  ] },
  "l06-ws": { rows: [
    { folder: "01_Admin", purpose: "x", naming: "YYYY-MM-DD_Topic_v01", access: "Admin" },
    { folder: "04_Contracts", purpose: "Signed vendor contracts", naming: "YYYY_Vendor_Contract_v01", access: "Client only" },
    { folder: "05_Marketing", purpose: "Campaign assets and reports", naming: "YYYY-MM_Campaign_Asset", access: "Marketing team" },
  ], versionRule: "Drafts use v01, v02; the approved file is renamed with FINAL and the old drafts move to Archive" },
  "l07-ws": { rows: [
    { original: "maria cruz, 0917-123-4567, active", cleaned: "Maria Cruz, +63 917 123 4567, Active" },
    { original: "PEDRO SY, 0918 111 2222, ACTIVE", cleaned: "Pedro Sy, +63 918 111 2222, Active" },
    { original: "ana lim , 09193334444 , inactive", cleaned: "Ana Lim, +63 919 333 4444, Inactive" },
    { original: "Ben  Tan,0920-555-6666,active", cleaned: "Ben Tan, +63 920 555 6666, Active" },
    { original: "LIZA GO, +639217778888, Active", cleaned: "Liza Go, +63 921 777 8888, Active" },
  ], rules: "Title Case names\nPhones as +63 XXX XXX XXXX\nStatus is Active or Inactive", qaCheck: "Spot-checked ten rows against the original file and sorted by status" },
  "l08-compare": { rows: [
    { tool: "Trello", price: "$5 per user per month", source: "https://trello.com/pricing", checked: "2026-11-11" },
    { tool: "Asana", price: "Not published for Team tier", source: "Asana pricing page", checked: "Nov 11" },
    { tool: "ClickUp", price: "$7 per user", source: "https://clickup.com/pricing", checked: "11 Nov 2026" },
  ] },
  "l08-ws": { question: "Which project tool fits a five-person remote team under $10 per user?", criteria: "Price, task views, mobile app", findings: "Three tools fit the budget. Trello is simplest and cheapest but limited for reporting. ClickUp has the most features and good mobile apps, though setup takes longer. Asana sits between them on price and ease, with strong task views and integrations the team already uses.", caveats: "Prices were checked on Nov 11 and may change", sources: "trello.com/pricing\nclickup.com/pricing\nasana.com/pricing" },
  "l09-practice": { fields: { Purpose: "Follow up overdue invoices weekly", Trigger: "Every Friday at 4 PM", Inputs: "Invoice list and tracker", "Tools/access": "Accounting view access, Drive", Steps: "1. Pull list 2. Compare 3. Update tracker 4. Send reminders", Exceptions: "Disputed invoices are paused", Escalation: "Over 30 days goes to client", "Definition of done": "Tracker updated and reminders sent" } },
  "l09-ws": { fields: { Purpose: "Publish the weekly social media posts on schedule", Trigger: "Every Monday at 9 AM", Inputs: "Approved captions and images", "Tools/access": "Meta Business Suite editor access", Steps: "1. Open the content calendar\n2. Upload approved posts\n3. Schedule them\n4. Log links in the tracker", Exceptions: "Missing approval or broken image link", Escalation: "Any post without approval goes back to the client before scheduling", "Definition of done": "All approved posts are scheduled and logged in the tracker with links" } },
  "l10-ws": { rows: [
    { task: "Finish monthly report", owner: "You", priority: "High", status: "In progress", next: "Finalize numbers section" },
    { task: "Book venue for offsite", owner: "VA", priority: "Medium", status: "Not started", next: "Shortlist three venues", dependency: "Budget approval from client" },
    { task: "Renew software license", owner: "Client", priority: "High", status: "Waiting", next: "Send renewal quote to client", followup: "Thursday" },
    { task: "Update contact list", owner: "VA", priority: "Low", status: "Not started", next: "Merge new leads file" },
  ] },
  "l11-ws": { rows: [
    { step: "Input", ai: "Summarize a vendor email thread", human: "Compare the summary with every email in the thread" },
    { step: "Extract", ai: "List the deadlines mentioned", human: "Check each deadline date against the original emails" },
    { step: "Organize", ai: "Group tasks by owner", human: "Confirm owners with the client before sharing the list" },
    { step: "Output", ai: "Draft client update", human: "Review facts, tone, and authority before sending anything" },
  ], neverPaste: "Customer names, phone numbers, addresses or payment details" },
  "l12-ws": { items: [
    { answer: "yes" }, { answer: "yes" }, { answer: "no", note: "Turn on MFA for email this week" },
    { answer: "yes" }, { answer: "no", note: "Ask the client for the incident contact" }, { answer: "yes" },
  ] },
  "l13-ws": { checks: [
    { result: "fail", evidence: "The date March 32 does not exist" },
    { result: "fail", evidence: "Attachment mentioned but not actually attached" },
    { result: "fail", evidence: "Status values written three different ways" },
    { result: "fail", evidence: "Records deleted without the client's approval" },
    { result: "pass", evidence: "The summary is short and easy to follow" },
  ], issueReport: "I found that three records were deleted without approval and the date was invalid. I restored the records from the previous version and corrected the date. The status values still need one agreed format, and I recommend confirming it with the client." },
  "fp-t2": { placements: { walkthrough: { day: "Wed", start: "13:00" }, supplier: { day: "Tue", start: "14:00" }, checkin: { day: "Mon", start: "10:00" }, insurance: { day: "Fri", start: "14:00" } }, note: "The new walk-through time needs the customer's agreement and the owner's confirmation before I send invites." },
  "fp-t3": { records: V.__meta.FP_T3_RECORDS.map((r) => ({ id: r.id, ...r.clean, flag: r.flag, duplicateOf: r.duplicateOf || "", clarification: r.clarification || "" })),
    rules: "Title Case names, single spaces\nPhones as +63 9XX XXX XXXX\nDates as YYYY-MM-DD\nStatus as Active or Inactive" },
  "fp-t4": { rows: [
    { tool: "Jobber", price: "$39 per month", source: "https://getjobber.com/pricing", checked: "2026-11-11", pros: "Built for home services", cons: "Higher price than others" },
    { tool: "Housecall Pro", price: "Not published", source: "Housecall Pro sales page", checked: "Nov 11", pros: "Good scheduling and dispatch", cons: "Pricing needs a sales call" },
    { tool: "Google Calendar", price: "$7 per user", source: "https://workspace.google.com/pricing", checked: "11 Nov 2026", pros: "Team already knows it", cons: "No dispatch or invoicing" },
  ] },
  "fp-t5": { fields: { Purpose: "Make sure every new booking is scheduled and confirmed", Trigger: "A new customer books a job", Inputs: "Booking form details", "Tools/access": "Scheduling app and SMS tool", Steps: "1. Add job to schedule\n2. Assign technician\n3. Send confirmation text", Exceptions: "Same-day emergency jobs", Escalation: "Any job outside service area goes to the owner", "Definition of done": "Job scheduled, technician assigned and customer confirmation sent" } },
  "fp-t6": { rows: [
    { task: "Owner attends the start of the approved kitchen installation", example: true },
    { task: "Order replacement parts", owner: "VA", priority: "High", status: "Not started", next: "Get supplier quote", dependency: "Owner approves the budget" },
    { task: "Reschedule Thursday jobs", owner: "VA", priority: "High", status: "In progress", next: "Call customers" },
    { task: "Update price list", owner: "Owner", priority: "Low", status: "Waiting", next: "Send draft" },
  ], conflictNote: "The installation start and the insurance renewal both need the owner on Thursday 8-10 AM, so I asked the owner to decide which one moves." },
  "fp-t7": { used: "I used AI to extract action items from the subcontractor schedule email", verify: "I checked every name and date against the original email and confirmed no customer personal data was included", noConfidential: true },
  "fp-t8": { correct: true, explanation: "I would not share the login. I tell the owner right away, and the owner sets up the subcontractor's own account so the job can start after access is granted." },
  "fp-checklist": { checked: [true, true, true, true, true, true, true, true] },
};

for (const name of ruleNames) {
  test(`${name}: a genuine answer has all required parts`, () => {
    const r = ok(name, GOOD[name]);
    assert.deepStrictEqual(r.missing, [], `${name} missing: ${r.missing.join(" | ")}`);
    assert.strictEqual(r.ok, true);
  });
}

/* ---------------- specific negative cases ---------------- */
test("model answers and lesson examples are rejected", () => {
  const { l02Clarify, l03John } = { l02Clarify: "Which fields should be standardized, and is there an existing format? Should duplicates be removed or flagged? Is there a required folder and naming convention?", l03John: "I have two contacts listed as John. Could you confirm which one you'd like me to schedule with?" };
  assert.strictEqual(ok("l02-clarify", { text: l02Clarify }).ok, false);
  assert.strictEqual(ok("l03-john", { text: l03John }).ok, false);
  assert.strictEqual(ok("l03-john", { text: l03John.replace("Could", "Can") }).ok, false, "lightly edited model");
});

test("unchanged example rows never count (C-02)", () => {
  const onlyExamples = { rows: [
    { subject: "Meeting moved from 10 AM to 2 PM", category: "action", priority: "Medium", action: "Update the calendar now" },
    { subject: "Refund threat re: 1-star review", category: "client_review", priority: "High", action: "Flag to the client" },
  ] };
  assert.strictEqual(ok("l04-ws", onlyExamples).ok, false);
  const l10 = { rows: GOOD["l10-ws"].rows.slice(0, 1).concat([{ task: "Reply to vendor 'urgent' email", owner: "x", priority: "Low", status: "Not started", next: "Send brief acknowledgment" }]) };
  assert.strictEqual(ok("l10-ws", l10).ok, false);
});

test("Lesson 5: a learner's own row may use an example's event name; the unchanged example row never counts", () => {
  const own = (event) => ({ event, confirmed: "10:00 AM", tz: "Manila", notes: "Prep 10 min before" });
  const rows = [own("Team meeting"), own("Presentation"), own("Vendor call"), own("Prospect call")];
  assert.equal(V["l05-ws"]({ rows }).ok, true);
  const withExamples = [{ ...own("Team meeting"), example: true }, { ...own("Presentation"), example: true }, own("Vendor call"), own("Prospect call")];
  assert.equal(V["l05-ws"]({ rows: withExamples }).ok, false);
});

test("WP3b corrections: genuine dates, meaningful owners, whole-word keywords, every started plan row", () => {
  const H = V.__meta.helpers;
  // Date checked must be a real calendar date
  for (const d of ["2026-11-11", "11/11/2026", "11 Nov 2026", "Nov 11, 2026", "31 Dec 2026"]) assert.equal(H.hasDate(d), true, d);
  for (const d of ["today", "Friday", "99/99/9999", "32/13", "2026-02-30", "Nov 31", "soon"]) assert.equal(H.hasDate(d), false, d);
  const cmp = GOOD["l08-compare"].rows;
  assert.equal(V["l08-compare"]({ rows: cmp.map((r) => ({ ...r, checked: "today" })) }).ok, false);
  assert.equal(V["l08-compare"]({ rows: cmp.map((r) => ({ ...r, checked: "99/99/9999" })) }).ok, false);
  // Owner must be meaningful
  for (const o of ["xy", "tbd", "n/a", "test", "someone", "aaa", ""]) assert.equal(H.meaningfulOwner(o), false, o);
  for (const o of ["You", "me", "VA", "Bookkeeper", "Ana", "Mark R."]) assert.equal(H.meaningfulOwner(o), true, o);
  const l10 = GOOD["l10-ws"].rows;
  assert.equal(V["l10-ws"]({ rows: l10.map((r, i) => (i === 2 ? { ...r, owner: "xy" } : r)) }).ok, false);
  // Issue-report keywords match whole words only
  const pad = " alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu";
  const qa = (report) => V["l13-ws"]({ checks: Array(5).fill({ result: "pass", evidence: "checked every row against the source" }), issueReport: report + pad });
  assert.equal(qa("tissue candidate stillness").ok, false);
  assert.equal(qa("found fixed next").ok, true);
  // Lesson 2: every started plan row must be complete
  const row = GOOD["l02-ws"].rows[0];
  assert.equal(V["l02-ws"]({ rows: [row, { request: "Second request" }] }).ok, true, "an untouched extra request is not started");
  const half = V["l02-ws"]({ rows: [row, { request: "Second request", outcome: "half done plan for a second thing" }] });
  assert.equal(half.ok, false);
  assert.ok(half.missing.some((m) => /every request/.test(m)));
});

test("filler answers fail written rules", () => {
  assert.strictEqual(ok("l03-ws", { clarify: FILLER, progress: FILLER, completion: FILLER, delay: FILLER, error: FILLER }).ok, false);
  assert.strictEqual(ok("l08-ws", { question: FILLER, criteria: FILLER, findings: FILLER, caveats: FILLER, sources: FILLER }).ok, false);
});

test("Lesson 5 schedule: missing can't-fit answer, overlap, lunch and wrong buffer are each detected (NT-05)", () => {
  const base = GOOD["l05-schedule"];
  const miss = (ans) => ok("l05-schedule", ans).missing;
  assert.ok(miss({ ...base, cannotFit: "" }).includes("Identified the request that can't fit"));
  assert.ok(miss({ ...base, cannotFit: "prospect" }).includes("Identified the request that can't fit"));
  // The retired checkbox no longer counts.
  assert.ok(miss({ placements: base.placements, flags: { focusCannotFit: true } }).includes("Identified the request that can't fit"));
  assert.ok(miss({ ...base, placements: { ...base.placements, prospect: "15:00" } }).some((m) => /overlap/.test(m)));
  assert.ok(miss({ ...base, placements: { ...base.placements, prospect: "12:00" } }).some((m) => /afternoon|Lunch/.test(m)));
  assert.ok(miss({ ...base, placements: { ...base.placements, buffer: "14:00" } }).some((m) => /buffer/.test(m)));
  assert.ok(miss({ ...base, placements: { ...base.placements, team: "9:00" } }).some((m) => /requested times/.test(m)));
});

test("Final Project Task 2: each rule violation is detected (NT-05)", () => {
  const base = GOOD["fp-t2"];
  const miss = (patch) => ok("fp-t2", { ...base, placements: { ...base.placements, ...patch } }).missing;
  assert.ok(miss({ walkthrough: { day: "Wed", start: "09:00" } }).some((m) => /Wednesday/.test(m)));
  assert.ok(miss({ supplier: { day: "Tue", start: "15:00" } }).some((m) => /Supplier/.test(m)));
  assert.ok(miss({ insurance: { day: "Thu", start: "14:00" } }).some((m) => /Insurance/.test(m)));
  assert.ok(miss({ checkin: { day: "Wed", start: "12:30" } }).some((m) => /30 minutes/.test(m)));
  assert.ok(miss({ checkin: { day: "Wed", start: "13:15" } }).some((m) => /overlap/.test(m)));
  assert.ok(miss({ insurance: { day: "Fri", start: "16:45" } }).some((m) => /8 AM–5 PM/.test(m)));
});

/* ---------- Final Project Task 3 (WP4, field-level checks) ---------- */
const T3 = () => JSON.parse(JSON.stringify(GOOD["fp-t3"]));
const t3With = (id, patch, base = T3()) => ({ ...base, records: base.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
const t3Miss = (a) => ok("fp-t3", a).missing;

test("Final Project Task 3: the answer key and other consistent formats pass", () => {
  assert.deepStrictEqual(t3Miss(T3()), []);
  // all numbers kept in the 09XX-XXX-000N layout
  const dash = T3(); dash.records.forEach((r) => { r.mobile = "09XX-XXX-" + r.mobile.slice(-4); });
  assert.deepStrictEqual(t3Miss(dash), []);
  // all readable dates written as "20 Jan 2026"
  const words = T3(); const M = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  words.records.forEach((r) => { if (r.id !== "R5") { const [y, m, d] = r.date.split("-"); r.date = `${+d} ${M[+m]} ${y}`; } });
  assert.deepStrictEqual(t3Miss(words), []);
  // reverse duplicate, and lower-case statuses used consistently
  assert.deepStrictEqual(t3Miss(t3With("R2", { flag: "duplicate", duplicateOf: "R3" }, t3With("R3", { flag: "none", duplicateOf: "" }))), []);
  const lower = T3(); lower.records.forEach((r) => { r.status = r.status.toLowerCase(); });
  assert.deepStrictEqual(t3Miss(lower), []);
  // R5 clarification in other natural wordings
  for (const c of ["Can you check with the customer whether 03/04/26 is 3 April or 4 March 2026?",
                   "Please confirm the date: it could be April 3 or March 4, 2026, depending on the format used.",
                   "Need to verify this date with Ana, because it might mean 3rd April or 4th March."]) {
    assert.deepStrictEqual(t3Miss(t3With("R5", { clarification: c })), [], c);
  }
});

test("Final Project Task 3: each wrong value or flag fails its check (field-level, never word-for-word)", () => {
  const has = (a, re) => t3Miss(a).some((m) => re.test(m));
  assert.ok(has(t3With("R1", { name: "juan santos" }), /^Names/), "lower-case name");
  assert.ok(has(t3With("R8", { name: "Carlo  Mendoza" }), /^Names/), "double space kept");
  assert.ok(has(t3With("R4", { mobile: "+63 9XX XXX 0009" }), /^Mobile/), "changed digit");
  assert.ok(has(t3With("R4", { mobile: "09XX XXX 0004" }), /^Mobile/), "mixed layouts");
  assert.ok(has(t3With("R6", { status: "active" }), /^Status/), "mixed capitalisation");
  assert.ok(has(t3With("R7", { email: "ben.cruz@example.org" }), /^Emails/), "edited email");
  assert.ok(has(t3With("R1", { email: "juan.santos@example.com" }), /^Emails/), "invented email");
  assert.ok(has(t3With("R2", { date: "2026-01-21" }), /^Dates/), "wrong date");
  assert.ok(has(t3With("R3", { date: "20 Jan 2026" }), /^Dates/), "mixed date formats");
  const numeric = T3(); numeric.records.forEach((r) => { if (r.id !== "R5") { const [y, m, d] = r.date.split("-"); r.date = `${d}/${m}/${y}`; } });
  assert.ok(has(numeric, /^Dates/), "numeric day/month target format");
  for (const d of ["2026-04-03", "2026-03-04", "3 April 2026", "", "03/04/26 (confirm)"]) assert.ok(has(t3With("R5", { date: d }), /can't be read safely/), `R5 date ${d}`);
  for (const c of ["", "please confirm", "Please confirm this date with the customer soon.", "Could be 3 April or 4 March 2026 depending on format.",
                   "confirm confirm confirm April March 3 4", "Please confirm whether the date is 3 April 2026."]) {
    assert.ok(has(t3With("R5", { clarification: c }), /can't be read safely/), `R5 clarification "${c}"`);
  }
  assert.ok(has(t3With("R1", { flag: "none" }), /^Missing information/), "R1 unflagged");
  assert.ok(has(t3With("R5", { flag: "none" }), /^Missing information/), "R5 unflagged");
  assert.ok(has(t3With("R2", { flag: "duplicate", duplicateOf: "R3" }), /^The duplicate/), "both flagged");
  assert.ok(has(t3With("R3", { flag: "none", duplicateOf: "" }), /^The duplicate/), "neither flagged");
  assert.ok(has(t3With("R3", { duplicateOf: "R4" }), /^The duplicate/), "wrong pair");
  const merged = T3(); merged.records = merged.records.filter((r) => r.id !== "R3");
  assert.strictEqual(ok("fp-t3", merged).ok, false, "deleted duplicate");
  for (const id of ["R4", "R6", "R7", "R8"]) assert.ok(has(t3With(id, { flag: "missing-email" }), /^No other record/), `extra flag on ${id}`);
  assert.ok(has({ ...T3(), rules: "Title Case" }, /cleaning rules/));
});

test("Final Project Task 3: every untouched record fails at least one check under any accepted format", () => {
  // Dataset invariant (R8 decision): a correct final state always means at least one correction per record.
  const variants = [T3()];
  const dash = T3(); dash.records.forEach((r) => { r.mobile = r.mobile.replace("+63 ", "0").replace(/ /g, "-").replace(/^0/, "0"); }); variants.push(dash);
  for (const o of V.__meta.FP_T3_RECORDS) {
    for (const base of variants) {
      const untouched = t3With(o.id, { ...o.original, clarification: "", flag: o.flag, duplicateOf: o.duplicateOf || "" }, base);
      assert.strictEqual(ok("fp-t3", untouched).ok, false, `${o.id} untouched must fail`);
    }
  }
});

test("Final Project Task 6: the conflict note names both tasks and asks the owner; Owner is a valid assignee", () => {
  const base = GOOD["fp-t6"];
  const note = (conflictNote) => ok("fp-t6", { ...base, conflictNote }).missing;
  assert.deepStrictEqual(note("Both the installation start and the insurance renewal need the owner on Thursday morning; please choose which one should move."), []);
  assert.ok(note("Two tasks compete for Thursday morning so something has to move to another day.").some((m) => /names both/.test(m)));
  assert.ok(note("The installation and the insurance renewal clash on Thursday morning, I will move the renewal.").some((m) => /asks the owner/.test(m)));
  const rows = (owner) => ok("fp-t6", { ...base, rows: base.rows.map((r, i) => (i === 3 ? { ...r, owner } : r)) }).missing;
  for (const o of ["Owner", "the owner", "VA", "Dan (owner)"]) assert.deepStrictEqual(rows(o), [], o);
  for (const o of ["xy", "tbd", "n/a", ""]) assert.ok(rows(o).some((m) => /owner \(a name or role\)/.test(m)), o);
});

test("Final Project keyword checks: whole words only; stuffing and filler fail; natural answers pass (red-team F3)", () => {
  const t5 = (Trigger) => ok("fp-t5", { fields: { ...GOOD["fp-t5"].fields, Trigger } }).missing.some((m) => /Trigger/.test(m));
  assert.strictEqual(t5("A customer books a repair job online"), false);
  assert.strictEqual(t5("Whenever a new customer is scheduled"), false);
  for (const t of ["A Facebook message arrives", "Someone updates the notebook", "The owner sends a message"]) assert.strictEqual(t5(t), true, t);
  const t7 = (verify) => ok("fp-t7", { ...GOOD["fp-t7"], verify }).missing;
  assert.deepStrictEqual(t7("I compared every name and amount in the draft against the original email before sending it"), []);
  assert.ok(t7("I made an update to the manufacturer section and it all looked fine to me afterwards").some((m) => /names at least one check/.test(m)));
  const t8 = (explanation) => ok("fp-t8", { ...GOOD["fp-t8"], explanation }).missing;
  assert.deepStrictEqual(t8(GOOD["fp-t8"].explanation), []);
  assert.deepStrictEqual(t8("I'd say no to sharing the password, message the owner straight away, and ask them to create a separate account for the subcontractor so the job can go ahead after that."), []);
  assert.ok(t8("Two-factor authentication matters and passwords must stay private, so I would refuse politely and wait for things to settle down by themselves.").some((m) => /who is told/.test(m)), "authentication is not 'then'");
  assert.ok(t8("owner owner owner owner next next next next access access access owner owner next next access access owner next access").some((m) => /20\+ words/.test(m)), "keyword stuffing");
  assert.ok(t8("owner owners owner's next nexts access accessed accessing accesses then thens account accounts until after owner next access account then until").some((m) => /20\+ words/.test(m)), "repeated variations");
  assert.ok(t8("blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah owner next").some((m) => /20\+ words/.test(m)), "filler with keywords");
});

test("Final Project Task 8: copied feedback fails; an original answer sharing common words passes (Q10)", () => {
  const fb = V.__meta.FP_T8.options.find((o) => o.correct).feedback;
  const t8 = (explanation) => ok("fp-t8", { correct: true, explanation }).missing;
  assert.ok(t8(fb).some((m) => /own words/.test(m)), "pasted feedback");
  assert.ok(t8(fb.replace("Correct. ", "").replace("even under time pressure", "even when time is short")).some((m) => /own words/.test(m)), "lightly edited feedback");
  assert.deepStrictEqual(t8("I won't share the owner's login. I'll tell the owner what happened and ask them to set up separate access for the subcontractor, then confirm with the subcontractor once it works."), []);
});

test("research rules require price-or-not-published, source and date (M-07)", () => {
  const rows = GOOD["l08-compare"].rows;
  assert.strictEqual(ok("l08-compare", { rows: rows.map((r) => ({ ...r, source: "" })) }).ok, false);
  assert.strictEqual(ok("l08-compare", { rows: rows.map((r) => ({ ...r, checked: "" })) }).ok, false);
  assert.strictEqual(ok("l08-compare", { rows: rows.map((r) => ({ ...r, price: "cheap" })) }).ok, false);
});

test("fp-checklist needs all 8, fp-t8 needs the safer option", () => {
  assert.strictEqual(ok("fp-checklist", { checked: [true, true, true, true, true, true, false, true] }).ok, false);
  assert.strictEqual(ok("fp-t8", { ...GOOD["fp-t8"], correct: false }).ok, false);
});

test("wired into the progress core: a stored genuine answer passes, an edit to filler fails", () => {
  const store = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = String(v); } };
  const p = PVAGA.createProgress({ storage: store, rules: V });
  assert.strictEqual(p.recordAttempt("l03-ws", { answer: GOOD["l03-ws"] }).passed, true);
  assert.strictEqual(p.recordAttempt("l03-ws", { answer: { ...GOOD["l03-ws"], error: FILLER } }).passed, false);
});

/* ---------- Correction pass D1–D6: positive and negative fixtures ---------- */
test("D1 naming convention: whole date/version tokens only", () => {
  const rule = (naming) => V["l06-ws"]({ ...GOOD["l06-ws"], rows: GOOD["l06-ws"].rows.map((r, i) => (i === 1 ? { ...r, naming } : r)) });
  for (const n of ["YYYY-MM-DD_Topic", "Report_v01", "Proposal v2", "ProposalV2", "2026-11_Report", "Report_20261114", "14112026_Report",
                   "ClientName_Report_[date]", "Topic - version 3", "Invoice_REV02", "yyyymmdd_invoice", "Notes_MMM_YY", "Report_vX"]) assert.equal(rule(n).ok, true, n);
  for (const n of ["Client address list", "Odd addenda", "Hidden summary", "Commander notes", "Report_final", "Vendor contract", "Addendum"]) assert.equal(rule(n).ok, false, n);
});

test("D2 version rule must name how versions are marked", () => {
  const rule = (versionRule) => V["l06-ws"]({ ...GOOD["l06-ws"], versionRule }).ok;
  for (const t of ["Drafts use v01, v02; the approved file is renamed FINAL and moved",
                   "Every time I edit a file I save a new version with the next number",
                   "Older revisions go into the 03_Archive folder at the end of each week",
                   "Keep one working draft and mark the signed copy as final in its name",
                   "We never overwrite; each change gets V2, V3 and so on in the file name"]) assert.equal(rule(t), true, t);
  for (const t of ["Files are named nicely and kept somewhere safe always",
                   "I will keep everything organised in the right folders for the client",
                   "Make sure names are consistent and easy to understand for everyone"]) assert.equal(rule(t), false, t);
});

test("D3 quality check must say how the work was checked", () => {
  const rule = (qaCheck) => V["l07-ws"]({ ...GOOD["l07-ws"], qaCheck }).ok;
  for (const t of ["I compared every cleaned row with the original export before saving",
                   "Counted the rows before and after cleaning to make sure none were lost",
                   "Spot-checked ten random records against the source sheet for typos",
                   "Double checked that each phone number now uses the same +63 format",
                   "I'll verify the totals match the original file and review blank cells",
                   "Cross-checked the emails with the CRM export and confirmed no duplicates"]) assert.equal(rule(t), true, t);
  for (const t of ["I looked at the sheet and it seemed fine to me",
                   "Everything looks good and clean now and ready to send over",
                   "The data is tidy and I am happy with how it turned out", "I used a checklist and it all looks fine now honestly"]) assert.equal(rule(t), false, t);
});

test("D4 never-paste list must name a kind of data", () => {
  const rule = (neverPaste) => V["l11-ws"]({ ...GOOD["l11-ws"], neverPaste }).ok;
  for (const t of ["Customer names, phone numbers and home addresses",
                   "Never paste passwords, bank details or card numbers into any AI tool",
                   "Anything personal or confidential from the client's files",
                   "Salary figures, contracts and medical information about staff",
                   "No order numbers or e-mail addresses from the support inbox",
                   "Client data of any kind, including IDs and dates of birth"]) assert.equal(rule(t), true, t);
  for (const t of ["I will be careful with everything I paste",
                   "Only paste what is really needed for the job and nothing more",
                   "Think twice before using these tools for any of the work"]) assert.equal(rule(t), false, t);
});

test("D5 keyboard mashes are not words (heuristic); abbreviations and real words still count", () => {
  const H = V.__meta.helpers;
  assert.equal(H.wordCount("asdf qwer zxcv hjkl"), 2, "asdf and qwer have a vowel and still count (heuristic)");
  assert.equal(H.wordCount("qwrt zxcv hjkl bnmp"), 0);
  // Common abbreviations and vowel-less English words that use y still count
  assert.equal(H.wordCount("Update the SOP and the CRM, export a PDF and CSV"), 10);
  assert.equal(H.wordCount("Send the URL by SMS before the mtg, RSVP by 3 PM PST"), 12);
  assert.equal(H.wordCount("Why my gym rhythm try"), 5);
  // Numbers, mixed tokens and non-ASCII words are untouched
  assert.equal(H.wordCount("Call 0917 at 2pm about Q3 kpis"), 7);
  assert.equal(H.wordCount("Nag-follow up na ako sa kliyente, salamat"), 7);
  assert.equal(H.isMash("ltd"), false);
  assert.equal(H.isMash("xkcd"), true, "a heuristic: some real tokens are treated as mashes");
  // Effect on a written rule
  assert.equal(V["l03-ws"]({ ...GOOD["l03-ws"], clarify: "asdf qwer zxcv hjkl bnmv tyui" }).ok, false);
});

test("D6 Calendar Plan time zone must look like a time zone", () => {
  const H = V.__meta.helpers;
  for (const t of ["Manila (UTC+8)", "UTC+8", "GMT -5", "PHT", "pst", "EST/EDT", "Berlin", "Client's local time", "Asia/Manila", "Philippine time", "UTC"]) assert.equal(H.hasTimeZone(t), true, t);
  for (const t of ["ok", "x", "tbd", "n/a", "?", "123", "same", "qwrt", ""]) assert.equal(H.hasTimeZone(t), false, t);
  const rows = GOOD["l05-ws"].rows;
  assert.equal(V["l05-ws"]({ rows: rows.map((r, i) => (i === 1 ? { ...r, tz: "ok" } : r)) }).ok, false);
  assert.equal(V["l05-ws"]({ rows }).ok, true);
});
