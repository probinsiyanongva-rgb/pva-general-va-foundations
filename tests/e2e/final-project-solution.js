// A genuine learner's answers for every Final Project step (WP4). steps[n] solves gated step n.
const { expect } = require("@playwright/test");
const { helpers } = require("./lesson-solutions");
const { panel, fillRows } = helpers;

const TRIAGE = {
  "Kitchen faucet leak": "Action", "Monthly newsletter": "Reference", "Quote approved by customer": "Action",
  "Following up on a quote": "Waiting", "Insurance renewal invoice": "Client review", "Thank-you note": "Archive",
  "Subcontractor asking": "Action", "Customer disputing a charge": "Client review", "business permit renewal": "Action",
  "Spam-looking email": "Archive",
};
const SCHEDULE = [
  ["Customer walk-through (1 hour)", "Wed", "1:00 PM"],
  ["Supplier call (30 minutes)", "Tue", "2:00 PM"],
  ["Team check-in (30 minutes)", "Mon", "10:00 AM"],
  ["Insurance agent call (30 minutes)", "Fri", "2:00 PM"],
];
// Expected cleaned values per record (Task 3 answer key).
const T3 = {
  R1: { Name: "Juan Santos", Mobile: "+63 9XX XXX 0001", Status: "Active", Email: "(email missing)", "Date added": "2026-02-11", flag: "Missing email" },
  R2: { Name: "Maria Lopez", Mobile: "+63 9XX XXX 0002", Status: "Active", Email: "maria.lopez@example.com", "Date added": "2026-01-20", flag: "None" },
  R3: { Name: "Maria Lopez", Mobile: "+63 9XX XXX 0002", Status: "Active", Email: "maria.lopez@example.com", "Date added": "2026-01-20", flag: "Duplicate of…", dup: "Record R2" },
  R4: { Name: "Pedro Reyes", Mobile: "+63 9XX XXX 0004", Status: "Inactive", Email: "pedro.reyes@example.com", "Date added": "2025-12-02", flag: "None" },
  R5: { Name: "Ana Garcia", Mobile: "+63 9XX XXX 0005", Status: "Active", Email: "ana.garcia@example.com", "Date added": "03/04/26", flag: "Ambiguous date",
        clarification: "Please confirm the date added: 03/04/26 could mean 3 April 2026 or 4 March 2026." },
  R6: { Name: "Liza Tan", Mobile: "+63 9XX XXX 0006", Status: "Active", Email: "liza.tan@example.com", "Date added": "2026-02-28", flag: "None" },
  R7: { Name: "Ben Cruz", Mobile: "+63 9XX XXX 0007", Status: "Active", Email: "ben.cruz@example.com", "Date added": "2026-03-05", flag: "None" },
  R8: { Name: "Carlo Mendoza", Mobile: "+63 9XX XXX 0008", Status: "Inactive", Email: "carlo.m@example.com", "Date added": "2025-11-15", flag: "None" },
};
async function fillRecord(page, id, values) {
  const p = panel(page);
  for (const f of ["Name", "Mobile", "Status", "Email", "Date added"]) {
    if (values[f] !== undefined) await p.getByLabel(`${f} — record ${id}`, { exact: true }).fill(values[f]);
  }
  if (values.flag) await p.getByLabel(`Flag — record ${id}`, { exact: true }).selectOption({ label: values.flag });
  if (values.dup) await p.getByLabel(`Duplicate of — record ${id}`, { exact: true }).selectOption({ label: values.dup });
  if (values.clarification !== undefined) await p.getByLabel(`Clarification (optional — what needs confirming?) — record ${id}`, { exact: true }).fill(values.clarification);
}
const complete = async (page) => expect(panel(page).locator(".ga-structure .ga-status").first()).toHaveText(/Required parts complete|All scheduling rules met/);

const FP_STEPS = {
  2: async (page) => {
    const p = panel(page);
    for (const [msg, cat] of Object.entries(TRIAGE)) await p.locator(".ga-item", { hasText: msg }).locator("select").selectOption({ label: cat });
    await p.getByRole("button", { name: "Check all" }).click();
  },
  3: async (page) => {
    const p = panel(page);
    for (const [item, day, time] of SCHEDULE) {
      await p.getByLabel(`${item} — day`, { exact: true }).selectOption(day);
      await p.getByLabel(item, { exact: true }).selectOption({ label: time });
    }
    await p.getByLabel("What needs the owner's or customer's confirmation?").fill("The customer must agree to the new walk-through time, and the owner should confirm the supplier's time zone before invites go out.");
    await complete(page);
  },
  4: async (page) => {
    for (const [id, v] of Object.entries(T3)) await fillRecord(page, id, v);
    await panel(page).getByLabel("Cleaning rules you used (one per line)").fill("Names in Title Case with single spaces\nMobiles as +63 9XX XXX XXXX\nDates as YYYY-MM-DD\nStatus as Active or Inactive");
    await complete(page);
  },
  5: async (page) => {
    await fillRows(page, [
      { Tool: "Jobber", Price: "$39 per month", "Key features": "Scheduling, dispatch and invoicing", Pros: "Built for home services teams", Cons: "Costs more than simpler tools", Source: "https://getjobber.com/pricing", "Date checked": "14 Nov 2026" },
      { Tool: "Housecall Pro", Price: "Not published", "Key features": "Dispatch, reminders and payments", Pros: "Strong scheduling and dispatch", Cons: "Pricing needs a sales call", Source: "Housecall Pro sales page", "Date checked": "14 Nov 2026" },
      { Tool: "Google Calendar", Price: "$7 per user per month", "Key features": "Shared calendars and reminders", Pros: "The team already knows it", Cons: "No dispatch or invoicing at all", Source: "https://workspace.google.com/pricing", "Date checked": "14 Nov 2026" },
    ], { addLabel: "+ Add another tool" });
    await complete(page);
  },
  6: async (page) => {
    const p = panel(page);
    const f = {
      Purpose: "Make sure every new booking is scheduled and the customer is confirmed",
      Trigger: "A new customer books a job",
      Inputs: "Booking form details and the customer's phone number",
      "Tools/access": "Scheduling app and the SMS tool",
      Steps: "1. Add the job to the schedule\n2. Assign a technician\n3. Send the confirmation text",
      Exceptions: "Same-day emergency jobs go straight to the owner",
      Escalation: "Any job outside the service area goes to the owner first",
      "Definition of done": "Job scheduled, technician assigned and customer confirmation sent",
    };
    for (const [k, v] of Object.entries(f)) await p.getByLabel(k, { exact: true }).fill(v);
    await complete(page);
  },
  7: async (page) => {
    await fillRows(page, [
      { Task: "Order replacement parts", Owner: "VA", Priority: "High", Due: "Wednesday", "Depends on": "Owner approves the budget", Status: "Not started", "Next action": "Get a supplier quote" },
      { Task: "Reschedule Friday jobs", Owner: "VA", Priority: "Medium", Due: "Thursday", "Depends on": "None", Status: "In progress", "Next action": "Call the customers" },
      { Task: "Update the price list", Owner: "Owner", Priority: "Low", Due: "Next week", "Depends on": "None", Status: "Waiting", "Next action": "Send the draft for review" },
    ], { addLabel: "+ Add another task" });
    await panel(page).getByLabel("Which tasks compete, and how would you resolve it with the owner?").fill("The kitchen installation start and the insurance renewal both need the owner on Thursday 8–10 AM, so I would ask the owner to decide which one moves.");
    await complete(page);
  },
  8: async (page) => {
    const p = panel(page);
    await p.getByLabel("What did you use AI for?").fill("I used AI to pull the action items out of the subcontractor's schedule email.");
    await p.getByLabel("What did you check to verify the output before using it?").fill("I checked every name, date and job number in the list against the original email before adding it to the tracker.");
    await p.getByLabel("I did not paste any confidential or personal data into the AI tool.").check();
    await complete(page);
  },
  9: async (page) => {
    const p = panel(page);
    await p.getByRole("button", { name: /^Explain that credentials can't be shared/ }).click();
    await p.getByLabel(/^Briefly explain the safer action/).fill("I won't share the owner's login. I tell the owner straight away and ask them to set up the subcontractor's own account, then confirm with the subcontractor once access works.");
    await complete(page);
  },
  10: async (page) => {
    for (const cb of await panel(page).locator(".ga-check input[type=checkbox]").all()) await cb.check();
    await complete(page);
  },
};

module.exports = { FP_STEPS, T3, fillRecord, TRIAGE, SCHEDULE };
