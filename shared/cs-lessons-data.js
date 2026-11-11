/* PVA Free Training — Customer Support pathway lesson manifest.
   Same shape/purpose as shared/lessons-data.js (General Admin's manifest):
   used by the CS hub to render the course-map grid, and by each CS lesson
   page to build its Previous/Next links. `built: true` means the page
   actually exists and is safe to link to — flip only once deployed. */

const PVACS_LESSONS = [
  { id: 1,  title: "What Customer Support VAs Actually Do",       output: "Customer Support Role Map",       href: "/customer-support/lessons/lesson-01/", built: true },
  { id: 2,  title: "The Support Ticket Workflow",                  output: "Ticket Action Plan",               href: "/customer-support/lessons/lesson-02/", built: true },
  { id: 3,  title: "Customer Communication & Tone",                output: "Response Pack",                    href: "/customer-support/lessons/lesson-03/", built: true },
  { id: 4,  title: "Email & Chat Support",                         output: "Solved Ticket Set",                href: "/customer-support/lessons/lesson-04/", built: true },
  { id: 5,  title: "Knowledge Bases, SOPs & Policy",               output: "Knowledge-Base Exercise",          href: "/customer-support/lessons/lesson-05/", built: true },
  { id: 6,  title: "Investigation Before Response",                output: "Case Investigation Brief",         href: "/customer-support/lessons/lesson-06/", built: true },
  { id: 7,  title: "Orders, Returns, Refunds & E-commerce Support",output: "E-commerce Ticket Set",            href: "/customer-support/lessons/lesson-07/", built: true },
  { id: 8,  title: "Difficult Conversations, De-escalation & Escalation", output: "De-escalation Response Pack", href: "/customer-support/lessons/lesson-08/", built: true },
  { id: 9,  title: "Ticket Documentation & Support Operations",    output: "Ticket Notes + Tracker",           href: "/customer-support/lessons/lesson-09/", built: true },
  { id: 10, title: "Support Metrics & Quality",                    output: "Support Scorecard",                href: "/customer-support/lessons/lesson-10/", built: true },
  { id: 11, title: "AI-Assisted Customer Support",                 output: "AI-Assisted Workflow",             href: "/customer-support/lessons/lesson-11/", built: true },
  { id: 12, title: "Privacy, Security & Customer Data",            output: "Security Checklist",               href: "/customer-support/lessons/lesson-12/", built: true },
  { id: 13, title: "Quality Assurance & Continuous Improvement",   output: "QA Review",                        href: "/customer-support/lessons/lesson-13/", built: true },
];

const PVACS_FINAL = { title: "Your First Simulated Support Queue", href: "/customer-support/final-project/", built: true };
