# PVA Free Training

Free, self-paced VA training built for Probinsiyanong VA. Static site, no backend, no account
required, Netlify-ready. Currently holds two complete courses, each its own top-level folder:

- **General Admin VA — Beginner Foundations** (site root `/`), from
  `PVA_Free_Training_General_Admin_VA_Beginner_Foundations.docx`
- **Customer Support VA — Beginner Foundations** (`/customer-support/`), from
  `PVA_Free_Training_Customer_Support_VA_Beginner_Foundations.docx`

## Status: BOTH COURSES COMPLETE

Every lesson and Final Project in both courses is built, validated, and live-ready — 30
lesson/project pages plus two course hubs, zero dead links, zero syntax errors anywhere on
the site.

- `/` — the course hub: hero, full course map (all 13 lessons + Final Project as real clickable
  cards), a local progress summary, and a PVA Academy invite in the footer.
- `/lessons/lesson-01/` through `/lessons/lesson-13/` — each a self-contained, multi-step
  interactive lesson (concept teaching → scenario/practice → work sample → completion).
- `/final-project/` — the 8-task capstone: a simulated engagement with Northstar Home Services
  (a fictional five-person home-services business) covering Email, Calendar, Spreadsheet,
  Research, SOP, Task management, AI assistance, and Security, plus a final submission checklist.
- `/shared/` — the design system (`styles.css`), the local-progress API (`progress.js`), and the
  canonical lesson list every page reads from (`lessons-data.js`).

**Validation performed on the full site before this delivery:** every `.js` file syntax-checked,
every `index.html` tag-balance checked, every `getElementById` call cross-referenced against real
HTML ids, and every internal link on the site resolved against a real file — zero dead links,
zero syntax errors, zero ID mismatches across all 15 lesson/project pages plus the hub.

**Deploying:** same process you've used for every previous batch — push/upload this folder to
the same Netlify project. No new setup, no environment variables, no build step.

## Architecture

```
/
├── index.html                # course hub — course map, progress, PVA Academy invite
├── script.js                  # hub-only: renders lesson grid + progress from local storage
├── shared/
│   ├── styles.css              # design tokens + all shared component styles
│   ├── progress.js              # localStorage progress API (PVAFT.*)
│   └── lessons-data.js          # canonical 13-lesson list + Final Project entry
├── lessons/
│   ├── lesson-01/ … lesson-13/
│   │   ├── index.html          # lesson content + step markup
│   │   └── lesson.js            # this lesson's interactivity
│   └── ...
├── final-project/
│   ├── index.html              # 8-task capstone content + step markup
│   └── final-project.js         # capstone interactivity
├── 404.html
└── netlify.toml
```

**No build step.** Every page is plain HTML/CSS/JS — deploy the folder as-is to Netlify or any
static host.

### Design system

Signature motif: the site is styled like a well-run admin's filing system rather than a generic
dashboard — folder-tab navigation, a "Processed" stamp for completed lessons, index-card callouts
for key ideas. Palette: PVA's own Deep Forest Green (`#1F3D2F`) and Secondary Green (`#6E7F3F`),
plus a supporting kraft/manila tone and warm paper background — deliberately not the
cream-background/terracotta-accent look that's become an AI-generated-site default. Type:
Fraunces (display) + Work Sans (body) + IBM Plex Mono (labels, data).

### Why each lesson gets its own `lesson.js`

Lessons differ enough in their interactive elements (sorting activities, branching scenarios,
multi-field work samples) that a single generic "lesson engine" would either be too rigid or
turn into a second templating language. Each lesson's HTML + JS pair is self-contained and
readable on its own, at the cost of some repeated boilerplate (the stepper logic, the scenario
wiring). This matches the existing PVA Academy codebase's own choice to keep pages self-contained
rather than introduce a build/template system for a site with no build pipeline.

### Progress tracking

`shared/progress.js` exposes a small API on `window.PVAFT`:

- `markLessonComplete(id)` / `isLessonComplete(id)` — the 13 numbered lessons
- `markFinalTaskComplete(taskId)` / `isFinalTaskComplete(taskId)` — the Final Project's 8 tasks,
  tracked separately and not counted in the homepage's "X of 13 lessons" bar (matching the
  curriculum's own treatment of the Final Project as a 14th, separate portfolio piece)
- `completedLessonCount(total)`
- `resetAll()`

Everything is stored under one `localStorage` key (`pva-gadmin-ft-progress`). No account, no
server call — progress lives only in the browser that earned it, and the hub page says so.

### The lesson pattern (Learn → Observe → Practice → Check → Apply)

Every lesson uses a linear step-panel flow, not a menu of quiz/reference/proof-builder cards:
intro + objectives → concept teaching (1–3 steps) → an interactive scenario or sorting activity
with reasoned feedback → a second practice step → the lesson's work sample (built inline, with a
save-reminder and print/PDF button) → a completion screen that marks progress and links onward.
Step count varies by lesson (7–9 total) because it follows what each lesson's actual content
needs, not a fixed template. Every "gated" step requires real interaction before **Continue**
unlocks — but nothing is timed or scored competitively, matching the brief's instruction to avoid
overengineered gamification.

### The Final Project

One step per task, each reusing the interaction pattern already established for that skill in its
matching lesson — dropdown-classify for email (Lesson 4's pattern, now 10 messages instead of 6),
text-entry + model reveal for calendar (Lesson 5), before/after rows for spreadsheet (Lesson 7),
a research table (Lesson 8), the 8-field SOP builder (Lesson 9), tracker rows (Lesson 10), a
lighter AI-verification write-up (Lesson 11), and a decision scenario (Lesson 12) — deliberately,
so the capstone feels like *applying* everything just practiced rather than a new format to learn.
Closes with the curriculum's own 8-item final submission checklist (self-check) before the
completion screen.

## Deploying to Netlify

1. Push this folder to a GitHub repo (or drag-and-drop the folder into Netlify's dashboard).
2. In Netlify: **Add new site → Import an existing project**, connect the repo.
3. Build command: *(none)* — leave blank.
4. Publish directory: `/` (the repo root).
5. Deploy. No environment variables, no functions, no backend needed.

Because every path is a real folder with its own `index.html` (`/lessons/lesson-01/`, not
`/lessons/lesson-01.html`), Netlify serves clean URLs with no redirect rules required.

## Adding a future free-training pathway (e.g. Customer Support, Social Media)

This repo currently holds one pathway. To add another without rebuilding anything:

1. Create a new top-level folder, e.g. `/customer-support/`, mirroring this structure — or, if it
   should live alongside this one under one umbrella hub, add a `/pathways/` landing page linking
   to both and demote this repo's `index.html` to a "General Admin VA" landing rather than the
   site root.
2. Reuse `shared/styles.css` as-is — the design tokens (forest/sage/kraft palette, folder-tab
   motif, stamp) aren't General-Admin-specific.
3. Give the new pathway's progress its own `localStorage` key inside `shared/progress.js` (e.g.
   namespace by pathway: `pva-ft-progress:customer-support`) rather than reusing
   `pva-gadmin-ft-progress`, so completing one pathway's lessons never marks the other's as done.
4. Write a new `shared/<pathway>-lessons-data.js` manifest, same shape as `lessons-data.js`, so
   its hub page can render its own course map the same way.

## Content integrity check (against the source DOCX)

- All 13 lessons + Final Project are built and confirmed against the curriculum extraction.
- Every framework the brief called out as needing to survive (Section 3) is present and taught
  where the curriculum places it: the 8-stage RECEIVE→CLOSE workflow (Lesson 2), the four-part
  client update (Lesson 3), the research workflow (Lesson 8), and the five-question QA check
  (Lesson 13) — plus the ones not explicitly named in that section but present throughout: the
  6 email triage categories (Lesson 4), the 8-element SOP structure (Lesson 9), and the
  urgent/important distinction (Lesson 10).
- Every lesson's full learning-objective list, work sample, and practice activity from the DOCX
  is represented — none were silently dropped or replaced with generic content.
- The Final Project's all 8 tasks and the 8-item final submission checklist match the curriculum
  exactly; the fictional client (Northstar Home Services) and scenario framing are as specified.
- Nothing in the curriculum was flagged as needing a content change during this build — where a
  detail wasn't fully specified (e.g. the exact time of Lesson 5's "2-hour focus block"), that
  ambiguity was kept and turned into the lesson's own "needs client confirmation" teaching point
  rather than invented away.

## Second pathway added: Customer Support VA

`/customer-support/` is a second, independent free-training pathway added to this same repo,
following the multi-pathway pattern this README already documented before it was needed:

- `/customer-support/index.html` — its own hub (course map, progress, a cross-link back to the
  General Admin training instead of a PVA Academy invite, since this is a sibling pathway on the
  same free-training site).
- `/customer-support/lessons/lesson-01/` — built as the template, same as how General Admin
  started; Lessons 2–13 and the Final Project are not yet built.
- `/shared/progress-cs.js` — a separate progress module (`window.PVACS`, localStorage key
  `pva-cs-ft-progress`) rather than reusing `progress.js`. The README's original plan for adding
  a pathway suggested namespacing inside the *same* `progress.js` module; a dedicated file was
  used instead to avoid touching the already-tested, live General Admin progress code at all —
  zero risk to the pathway that's already deployed and in front of students. Same API shape
  (`markLessonComplete`, `isLessonComplete`, `markFinalTaskComplete`, `isFinalTaskComplete`,
  `completedLessonCount`, `resetAll`), so anything already understood about General Admin's
  progress tracking carries over directly.
- `/shared/cs-lessons-data.js` — the Customer Support course's own 13-lesson manifest, same shape
  as `lessons-data.js`, with the same `built: true/false` "Coming soon" pattern already proven
  out on the General Admin course.
- `shared/styles.css` reused as-is — no new design tokens, no visual fork. Same folder-tab/stamp
  motif, same palette.

Validated the same way as every General Admin delivery: JS syntax-checked, HTML tag-balance
checked, `getElementById` calls cross-referenced, and a full-site dead-link sweep across both
pathways together (17 unique internal links, zero dead).

## Customer Support pathway progress: Lessons 1–4 built

`/customer-support/lessons/lesson-01/` through `lesson-04/` are live (built: true in
`shared/cs-lessons-data.js`); Lessons 5–13 and the Final Project remain "Coming soon," same
pattern as General Admin's build.

**Batch additions worth noting:**
- Lesson 2 mirrors General Admin Lesson 2's workflow-chain teaching pattern, now for the
  7-stage RECEIVE→FOLLOW UP/CLOSE ticket lifecycle, plus a "is this case actually closed?"
  scenario testing the documentation requirement.
- Lesson 3 reuses General Admin Lesson 3's 5-message Response/Communication Pack pattern almost
  exactly — same shape, new content (Clarification/Resolution/Delay/Escalation/Follow-up).
- Lesson 4 introduces a new multi-ticket work-sample shape (`.ticket-field`) — one block per
  fictional ticket with Response/Next action/Status sub-fields, rather than a table-row builder.
  Used because this lesson's 5 tickets are each substantial enough to want their own visual
  block instead of being squeezed into table cells.
- All four validated the same way as every batch: JS syntax, HTML tag-balance, ID
  cross-references, and a full-site dead-link sweep across both pathways together (20 unique
  links, zero dead).

## Customer Support pathway progress: Lessons 1–7 built

Lessons 5–7 added in this batch (built: true in `shared/cs-lessons-data.js`); Lessons 8–13 and
the Final Project remain "Coming soon."

**Batch additions worth noting:**
- Lesson 5 includes a real 5-article fictional knowledge base as reference content, then a
  select-and-check matching exercise (reused pattern from General Admin Lesson 4/7 and CS
  Lesson 1's sort) pairing 5 tickets to the right article — plus a policy-gap scenario for when
  nothing in the KB actually fits.
  Lesson 6 reuses the Task-vs-Skill drag-sort mechanic for a new distinction (Fact vs.
  Assumption), plus a full fictional case (order/tracking/policy) as the basis for its Case
  Investigation Brief work sample.
- Lesson 7 is intentionally shorter (5 content steps) — case-type recognition across all 6
  e-commerce case types, one approval-boundary scenario, then straight to the work sample, since
  the deeper investigation skill was already built in Lesson 6.
- All three validated the same way as every batch: JS syntax, HTML tag-balance, ID
  cross-references, and a full-site dead-link sweep across both pathways together (23 unique
  links, zero dead).

## Customer Support pathway: COMPLETE

All 13 lessons and the Final Project (Northstar Home Services simulated support queue) are
built. Both free-training pathways on this site are now finished:

- **General Admin VA** — 13 lessons + Final Project (Northstar Home Services simulated client)
- **Customer Support VA** — 13 lessons + Final Project (Northstar Home Services simulated
  support queue) — same fictional company, reused deliberately per the curriculum's own framing,
  now viewed from a support angle instead of an admin angle

**Final batch additions (Lessons 11–13 + Final Project):**
- Lesson 11's practice step follows the same "verify the AI's work" pattern as General Admin's
  AI lesson, but goes further — instead of a binary accurate/inaccurate check, the learner
  classifies each of 5 AI-drafted sentences as Supported / Needs verification / Unsupported,
  matching this curriculum's own three-way verification framing (11.3).
- Lesson 12 reuses General Admin Lesson 12's three-mini-scenario + Yes/No toggle checklist
  pattern almost exactly, with the three practice scenarios taken directly from this
  curriculum's own numbered practice items (9–11 in its source numbering).
- Lesson 13 reuses General Admin Lesson 13's "find the mistakes" pattern, adapted from one long
  flawed document to five short flawed responses (matching this curriculum's own practice
  format) — each mapped to one of the 10 listed QA error types.
- The **Final Project** mirrors General Admin's Final Project architecture (one step per task,
  reusing each task's home-lesson interaction pattern) across this course's 8 different tasks:
  a 12-case triage (9 categories, broader than any single lesson's category set, since a real
  queue mixes issue types), an investigation brief, a 6-case response pack, a 3-case escalation
  list, 5-case documentation, a metrics review, a lighter AI write-up, and a security scenario —
  closing with the curriculum's own 8-item final submission checklist.

**Full-site validation performed on this final delivery:** every `.js` file syntax-checked,
every `index.html` tag-balance checked, every `getElementById` call cross-referenced, and every
internal link across *both* pathways resolved against a real file — 30 unique links, zero dead,
zero syntax errors, zero ID mismatches, across all 30 lesson/project pages plus both hubs.

**Deploying:** same process as every previous batch — push/upload this folder to the same
Netlify project.

- **Per-lesson `lesson.js` files** rather than one shared lesson engine — the brief's Section 16
  folder structure didn't call for this, but with 13 lessons each needing distinct interactivity,
  a shared monolithic script would have become unreadable. This was flagged before Lessons 2–13
  were batch-built and not revised, so it's now the settled pattern across the whole site.
- **Step count varies by lesson** (7–9 steps) rather than being fixed — content-driven, not
  arbitrary; Lesson 9 and Lesson 12, for instance, naturally needed fewer steps than Lesson 1.
- **The Final Project's AI-assistance task (Task 7)** is a lighter write-up exercise rather than
  Lesson 11's full "spot the AI's errors" exercise — the capstone applies the skill rather than
  re-teaching it, since Lesson 11 already built the verification habit in depth.
