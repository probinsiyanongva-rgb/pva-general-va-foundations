/* PVA Free Training — canonical lesson manifest.
   Used by index.html to render the course-map grid, and by each lesson
   page to build its Previous/Next footer links. Keep hrefs in sync with
   the real lessons/lesson-NN/ folders.

   `built: true` means the page actually exists and is safe to link to.
   Flip a lesson to true only once its folder is really deployed —
   the homepage grid reads this to decide between a clickable card and
   a disabled "Coming soon" one, so this list can always be ahead of
   what's actually built without creating a dead link anywhere. */

const PVAFT_LESSONS = [
  { id: 1,  title: "What Does a General Admin VA Actually Do?",     output: "General Admin Task Map",              href: "/lessons/lesson-01/", built: true },
  { id: 2,  title: "The Administrative Workflow: Request to Done",  output: "Client Request → Action Plan",        href: "/lessons/lesson-02/", built: true },
  { id: 3,  title: "Professional Communication & Client Updates",   output: "Client Communication Pack",           href: "/lessons/lesson-03/", built: true },
  { id: 4,  title: "Email Management & Inbox Triage",                output: "Inbox Triage Sheet",                  href: "/lessons/lesson-04/", built: true },
  { id: 5,  title: "Calendar & Appointment Management",              output: "Client Calendar Plan",                href: "/lessons/lesson-05/", built: true },
  { id: 6,  title: "Digital Organization: Files & Documents",        output: "Folder Structure + Naming Convention",href: "/lessons/lesson-06/", built: true },
  { id: 7,  title: "Spreadsheets, Data Cleanup & Accuracy",          output: "Cleaned Client Spreadsheet",          href: "/lessons/lesson-07/", built: true },
  { id: 8,  title: "Internet Research & Information Management",     output: "Client Research Brief",               href: "/lessons/lesson-08/", built: true },
  { id: 9,  title: "SOPs, Checklists & Definition of Done",          output: "Administrative SOP",                  href: "/lessons/lesson-09/", built: true },
  { id: 10, title: "Task Management, Priorities & Deadlines",        output: "Administrative Task Tracker",         href: "/lessons/lesson-10/", built: true },
  { id: 11, title: "AI-Assisted Administrative Work",                output: "AI-Assisted Administrative Workflow", href: "/lessons/lesson-11/", built: true },
  { id: 12, title: "Privacy, Security & Client Access",              output: "VA Security Checklist",               href: "/lessons/lesson-12/", built: true },
  { id: 13, title: "Quality Assurance & Escalation",                 output: "QA Checklist",                        href: "/lessons/lesson-13/", built: true },
];

const PVAFT_FINAL = { title: "Your First Simulated Client", href: "/final-project/", built: true };
