// Genuine-learner answers for Lessons 2–13 (used by lessons-v2.spec.js and the screenshot runs).
// Each lesson: steps[stepNumber] = async (page) => { ...solve that gated step... }
const { expect } = require("@playwright/test");

const panel = (page) => page.locator(".step-panel.active");

async function choose(page, ...correct) {
  for (const re of correct) await panel(page).getByRole("button", { name: re }).click();
}
async function sort(page, map) {
  const p = panel(page);
  for (const [item, bin] of Object.entries(map)) {
    await p.locator(".ga-chip", { hasText: item }).first().click();
    await p.locator(".ga-bin", { has: page.locator("h4", { hasText: bin }) }).locator(".ga-bin-place").click();
  }
  await p.getByRole("button", { name: "Check my sorting" }).click();
}
async function triage(page, map) {
  const p = panel(page);
  for (const [item, value] of Object.entries(map)) {
    await p.locator(".ga-item", { hasText: item }).locator("select").selectOption({ label: value });
  }
  await p.getByRole("button", { name: "Check all" }).click();
}
async function identify(page, ticks, scope) {
  const p = scope ? panel(page).locator(scope) : panel(page);
  for (const t of ticks) await p.locator(".ga-check", { hasText: t }).locator("input[type=checkbox]").check();
  await p.getByRole("button", { name: /^Check my answer/ }).click();
}
async function fill(page, label, value, scope) {
  const p = scope ? panel(page).locator(scope) : panel(page);
  await p.getByLabel(label, { exact: false }).first().fill(value);
}
// rows: [{ "Column label": value }] — fills RowTable rows (adding rows as needed), skipping example rows.
async function fillRows(page, rows, { addLabel, scope } = {}) {
  const p = scope ? panel(page).locator(scope) : panel(page);
  const real = p.locator('.ga-row:not([data-example="true"])');
  for (let i = 0; i < rows.length; i++) {
    if (i >= (await real.count())) await p.getByRole("button", { name: addLabel || /^\+ Add/ }).click();
    const row = real.nth(i);
    for (const [col, value] of Object.entries(rows[i])) {
      const field = row.locator(".ga-field", { has: page.locator("label", { hasText: col }) }).first();
      const sel = field.locator("select");
      if (await sel.count()) await sel.selectOption({ label: value });
      else await field.locator("input, textarea").fill(value);
    }
  }
}
async function complete(page) {
  await expect(panel(page).locator(".ga-structure .ga-status").first()).toHaveText(/Required parts complete|All scheduling rules met/);
}

const SOLUTIONS = {
  2: {
    steps: {
      6: async (page) => {
        await fill(page, "Write three clarification questions", "Which columns need to be standardised, and is there a format you already use? Should I delete duplicate contacts or flag them for you? What time tomorrow do you need it, and where should I save it?");
        await complete(page);
      },
      7: (page) => choose(page, /^Check — /),
      8: async (page) => {
        await fillRows(page, [{
          "Desired outcome": "A clean contact list with consistent names and no duplicates",
          Questions: "Should duplicates be removed or flagged? Which date format do you prefer?",
          Steps: "1. Copy the original sheet\n2. Standardise names and phone numbers\n3. Flag duplicates\n4. Check ten rows against the original",
          Deadline: "Tomorrow, 10 AM",
          "Definition of done": "File saved in the shared folder with every row checked and duplicates flagged",
          Priority: "High",
          "Depends on": "Client confirms the duplicate rule",
        }]);
        await complete(page);
      },
    },
  },
  3: {
    steps: {
      6: async (page) => {
        await fill(page, "Write the message you'd send", "Hi Carla, there are two Johns in your contacts, John Reyes from Apex and John Tan from the bank. Which one should I invite?");
        await complete(page);
      },
      7: (page) => choose(page, /^Escalate to the client/),
      8: async (page) => {
        await fill(page, "1. Clarification request", "Hi Carla, I understand you want the supplier list updated before Friday. Should I include suppliers we stopped using last year, or only the active ones?");
        await fill(page, "2. Progress update", "Hi Carla, quick update on the supplier list. I have checked thirty of the fifty entries and corrected six phone numbers so far, and I will finish the rest this afternoon.");
        await fill(page, "3. Completion update", "Hi Carla, the supplier list is finished and saved in the Operations folder. Every entry now has a contact name and phone number, and two suppliers still need a new email address.");
        await fill(page, "4. Delay notice", "Hi Carla, the bank statements arrived later than expected, so the expense summary will be ready by Thursday at 3 PM instead of Wednesday. I can send the first half today if that helps.");
        await fill(page, "5. Error report", "Hi Carla, I noticed that the invoice I sent to Apex this morning showed last month's total. I sent them the corrected invoice an hour ago and apologised for the mix-up. Nothing else went out with the wrong amount, and I recommend we add a second check before invoices are sent.");
        await complete(page);
      },
    },
  },
  4: {
    steps: {
      6: (page) => triage(page, {
        "Meeting moved": "Action", "Industry newsletter": "Reference", "Proposal needs client approval": "Client review",
        "Checking in on information": "Waiting", "Software renews tomorrow": "Client review", "Thank you; issue resolved": "Archive",
      }),
      7: (page) => choose(page, /^Flag it to the client as Client review/),
      8: async (page) => {
        await fillRows(page, [
          { "Email #": "3", Sender: "anna@supplier.ph", Subject: "Invoice for March deliveries", Category: "Client review", Priority: "High", Action: "Forward to client for payment approval" },
          { "Email #": "4", Sender: "hr@coworking.ph", Subject: "Desk booking confirmation", Category: "Reference", Priority: "Low", Action: "File in the bookings folder" },
          { "Email #": "5", Sender: "mark@printer.ph", Subject: "Waiting on artwork files", Category: "Waiting", Priority: "Medium", Action: "Ask designer for final files", "Follow-up": "Friday 10 AM" },
        ], { addLabel: "+ Add another message" });
        await complete(page);
      },
    },
  },
  5: {
    steps: {
      6: async (page) => {
        const p = panel(page);
        for (const [item, time] of [["Team meeting", "10:00 AM"], ["Vendor call", "11:00 AM"], ["Client presentation", "3:00 PM"], ["15-minute buffer", "2:45 PM"], ["Prospect call", "1:00 PM"]]) {
          await p.getByLabel(item).selectOption({ label: time });
        }
        await p.getByLabel(/2-hour focus block cannot fit/).check();
        await complete(page);
        await expect(p.locator("#dayRevealBtn")).toBeEnabled();
      },
      7: (page) => choose(page, /^Confirm with the client which time zone/),
      8: (page) => choose(page, /^Check the client's calendar for free times/),
      9: async (page) => {
        const ev = (Event, conf, tz, notes) => ({ Event, "Confirmed time": conf, "Time zone": tz, "Prep/buffer": notes });
        await fillRows(page, [
          ev("Team meeting", "10:00 AM", "Manila (UTC+8)", "Agenda sent the day before"),
          ev("Vendor call", "11:00 AM", "Manila (UTC+8)", "Confirmed by email"),
          ev("Prospect call", "1:00 PM", "Manila (UTC+8)", "Prep notes ready"),
          ev("Client presentation", "3:00 PM", "Manila (UTC+8)", "15-min buffer before"),
        ], { addLabel: "+ Add another event" });
        await complete(page);
      },
    },
  },
  6: {
    steps: {
      6: (page) => sort(page, {
        "Signed vendor contract": "01_Admin", "Chat screenshot showing": "Flag", "Monthly sales report": "02_Reports",
        "Final signed proposal": "01_Admin", "Last year's completed": "03_Archive", "Duplicate invoice": "Flag",
        "Random personal download": "Flag", "Outdated price list": "03_Archive",
      }),
      7: (page) => choose(page, /^Confirm with the client or teammate/),
      8: (page) => choose(page, /^Share only the 02_Reports folder/),
      9: async (page) => {
        await fillRows(page, [
          { Folder: "04_Contracts", Purpose: "Signed supplier and client contracts", "Naming convention": "YYYY-MM-DD_Party_Contract_v01", "Who needs access?": "Client and office manager" },
          { Folder: "05_Invoices", Purpose: "Invoices sent and received", "Naming convention": "YYYY-MM_InvoiceNo_Client", "Who needs access?": "Client and bookkeeper" },
        ], { addLabel: "+ Add another folder" });
        await fill(page, "Version rule", "Drafts are saved as v01 and v02; the approved file is renamed with FINAL and older drafts move to 03_Archive.");
        await complete(page);
      },
    },
  },
  7: {
    steps: {
      5: (page) => choose(page, /^Maria Cruz$/, /^The client's required format/, /^2026-02-01 \(or another/, /^Active \(or another single/),
      6: (page) => identify(page, ["2. MARIA CRUZ", "5. juan dela cruz"]),
      7: (page) => choose(page, /^Flag the record for the client's review/),
      8: (page) => choose(page, /^=COUNTIF\(D2:D101,"Active"\)$/, /^Turn on a filter for the City column/),
      9: async (page) => {
        await fillRows(page, [
          { Original: "ana reyes, 0919 444 5555, ACTIVE", Cleaned: "Ana Reyes, +63 919 444 5555, Active" },
          { Original: "BEN SANTOS, 09206667777, inactive", Cleaned: "Ben Santos, +63 920 666 7777, Inactive" },
          { Original: "liza cruz, 0921.888.9999, Active", Cleaned: "Liza Cruz, +63 921 888 9999, Active" },
          { Original: "Carlo tan, 0922-000-1111, active", Cleaned: "Carlo Tan, +63 922 000 1111, Active" },
        ], { addLabel: "+ Add another record" });
        await fill(page, "Rules you used", "Names in Title Case\nPhone numbers as +63 with spaces\nStatus as Active or Inactive");
        await fill(page, "Quality check performed", "I compared every cleaned row with its original and confirmed that no contact or digit was lost.");
        await complete(page);
      },
    },
  },
  8: {
    steps: {
      5: (page) => sort(page, {
        "own official pricing page": "Primary source", "official product documentation": "Primary source",
        "tech review site's comparison": "Reputable secondary", "industry publication's roundup": "Reputable secondary",
        "anonymous forum comment": "Treat with caution", "5-year-old blog post": "Treat with caution",
      }),
      6: async (page) => {
        const t = (Tool, price, source) => ({ Tool, "Price checked": price, "Key features": "Task boards and due dates", Pros: "Simple", Cons: "Few reports", Source: source, "Date checked": "11 Nov 2026" });
        await fillRows(page, [
          t("Asana", "$10.99 per user per month", "Asana pricing page"),
          t("Trello", "$5 per user per month", "Trello pricing page"),
          t("ClickUp", "not published for teams", "ClickUp sales page"),
        ]);
        await complete(page);
      },
      7: (page) => choose(page, /^Check the vendor's own pricing page/),
      8: (page) => triage(page, {
        "lists the Team plan": "Fact (sourced)", "help center says the free plan": "Fact (sourced)",
        "probably be easy": "Assumption", "save the team about 5 hours": "Assumption",
        "2023 forum post": "Needs verification", "review site says it connects": "Needs verification",
      }),
      9: async (page) => {
        await fill(page, "Client question", "Which project tool should our five-person remote team use next year?");
        await fill(page, "Criteria", "Price per user\nTask boards\nMobile app");
        await fill(page, "Findings", "Asana and Trello both publish prices on their own pages, checked on 11 November. Trello is the cheapest option at five dollars per user, while Asana adds timelines and reporting that the team asked for. ClickUp does not publish team pricing, so I have asked their sales team for a quote before we compare it fairly.");
        await fill(page, "Important caveats", "Prices were checked on 11 November and may change after that date.");
        await fill(page, "Sources", "Asana pricing page, checked 11 Nov 2026\nTrello pricing page, checked 11 Nov 2026");
        await complete(page);
      },
    },
  },
  9: {
    steps: {
      3: (page) => identify(page, ["Inputs", "Tools/access", "Exceptions", "Escalation", "Definition of done"]),
      4: async (page) => {
        const sop = {
          Purpose: "Follow up overdue invoices every week",
          Trigger: "Every Friday at 4 PM",
          Inputs: "Invoice list and last week's tracker",
          "Tools/access": "Accounting system view access, tracker, Drive folder",
          Steps: "1. Pull the invoice list\n2. Compare it with the tracker\n3. Send the approved reminders",
          Exceptions: "Disputed invoices or payment plans get flagged",
          Escalation: "Anything over 30 days goes to the client",
          "Definition of done": "Tracker updated and saved with today's date",
        };
        for (const [k, v] of Object.entries(sop)) await fill(page, k, v);
        await complete(page);
        await expect(panel(page).locator("#sopRevealBtn")).toBeEnabled();
      },
      5: (page) => choose(page, /^Pause, flag this specific case/),
      6: (page) => choose(page, /^Update the tracker status for each of the three/),
      7: async (page) => {
        const sop = {
          Purpose: "Publish the client's weekly social media posts on time and on brand",
          Trigger: "Every Monday at 9 AM Manila time",
          Inputs: "Approved captions and images from the content folder",
          "Tools/access": "Scheduling tool login and shared content folder",
          Steps: "1. Open the approved content folder\n2. Check each caption against the brand guide\n3. Schedule posts for Tuesday to Friday\n4. Record the schedule in the tracker",
          Exceptions: "Posts missing approval or images are held back",
          Escalation: "Any unapproved post or negative comment goes to the client the same day",
          "Definition of done": "Four posts scheduled, tracker updated and the client notified by message",
        };
        for (const [k, v] of Object.entries(sop)) await fill(page, k, v);
        await complete(page);
      },
    },
  },
  10: {
    steps: {
      4: (page) => sort(page, {
        "website is down": "Do first", "renews tomorrow": "Do first", "monthly report due in three weeks": "Schedule (important",
        "9 AM handoff": "Schedule (important", "routine email 'ASAP'": "Quick or flag", "newsletter comment": "Batch for later",
      }),
      5: (page) => choose(page, /^Explain that Task B depends on final copy/),
      6: (page) => choose(page, /^The report due at noon/),
      7: (page) => choose(page, /^Reply now: the three requests total about 9 hours/),
      8: async (page) => {
        const t = (Task, Owner, Priority, Status, next, extra = {}) => ({ Task, Owner, Priority, Due: "Friday", Status, "Next action": next, ...extra });
        await fillRows(page, [
          t("Book venue for team offsite", "You", "High", "In progress", "Call two venues for quotes", { Dependency: "Client confirms the budget" }),
          t("Update supplier contact list", "You", "Medium", "Not started", "Export the current list first", { "Follow-up": "Thursday 2 PM" }),
          t("Send March invoices", "Bookkeeper", "High", "Waiting", "Check totals before sending"),
        ], { addLabel: "+ Add another task" });
        await complete(page);
      },
    },
  },
  11: {
    steps: {
      5: (page) => identify(page, ["Draft a vendor update", "Remind Dana to call", "Check whether invoice INV-2291"]),
      6: (page) => choose(page, /^Remove or replace identifying details/),
      7: (page) => sort(page, {
        "rough meeting notes": "AI draft", "we received your request": "AI draft", "public industry article": "AI draft",
        "refund outside policy": "Human decision", "vendor contract": "Human decision",
        "home addresses": "Don't put into AI", "bank statement": "Don't put into AI",
      }),
      8: async (page) => {
        await fillRows(page, [
          { Step: "Input", "AI contribution": "Summarise the supplier's long email thread", "Human verification": "Compare the summary with every email in the thread" },
          { Step: "Extract", "AI contribution": "List the dates and amounts mentioned", "Human verification": "Check each date and amount against the original emails" },
          { Step: "Organize", "AI contribution": "Group the actions by owner", "Human verification": "Confirm each owner with the client before sharing it" },
          { Step: "Output", "AI contribution": "Draft the weekly update to the client", "Human verification": "Read the draft for tone, facts and anything outside my authority" },
        ]);
        await fill(page, "Never paste into AI", "Customer names, phone numbers, bank details and signed contracts.");
        await complete(page);
      },
    },
  },
  12: {
    steps: {
      4: (page) => choose(page, /^Use delegated access/, /^Confirm the business need/, /^Report the incident promptly/),
      5: (page) => choose(page, /^Wait until you're on a secured connection/),
      6: (page) => identify(page, ["Customer name", "Mobile number", "Home address", "Payment card", "Technician note"]),
      7: async (page) => {
        const p = panel(page);
        const sets = p.locator("fieldset.ga-yn");
        for (let i = 0; i < 6; i++) {
          const no = i === 5;
          await sets.nth(i).getByLabel(no ? "No" : "Yes", { exact: true }).check();
          await sets.nth(i).locator("input[type=text]").fill(no ? "Ask the client for their offboarding steps this week" : "Checked");
        }
        await complete(page);
      },
    },
  },
  13: {
    steps: {
      4: (page) => identify(page, ["Wrong date", "Missing attachment", "Inconsistent status", "Incorrect formula", "Wrong file version",
        "Broken link", "Duplicate record", "Unclear filename", "Unsupported assumption", "Unreported exception"]),
      5: (page) => choose(page, /^Fix the typo yourself/),
      6: async (page) => {
        const sets = panel(page).locator("fieldset.ga-yn");
        const ev = [
          ["Pass", "Every total matches the source sheet I checked"],
          ["Fail", "Two contacts are missing their email address still"],
          ["Pass", "All dates use the same YYYY-MM-DD format now"],
          ["Pass", "No customer data was shared outside the folder"],
          ["Pass", "The summary answers the client's question in one line"],
        ];
        for (let i = 0; i < 5; i++) {
          await sets.nth(i).getByLabel(ev[i][0], { exact: true }).check();
          await sets.nth(i).locator("input[type=text]").fill(ev[i][1]);
        }
        await fill(page, "Issue report", "I found that two contacts in the cleaned list had no email address. I flagged both rows and asked the client for the missing details. The two emails still remain pending, and I recommend a reminder on Monday.");
        await complete(page);
      },
    },
  },
};

module.exports = { SOLUTIONS, helpers: { panel, choose, sort, triage, identify, fill, fillRows, complete } };
