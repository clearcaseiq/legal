export type AttorneyGuideSection = {
  heading: string
  body?: string
  steps?: string[]
  tips?: string[]
  appLink?: { label: string; to: string }
}

export type AttorneyGuide = {
  slug: string
  title: string
  summary: string
  readMinutes?: number
  sections: AttorneyGuideSection[]
  updated: string
}

const UPDATED = '2026-10-12'

export const attorneyGuides: AttorneyGuide[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    summary:
      'Create your attorney account, verify your bar license, add a payment method, set up your profile and bring your team into the Firm Dashboard.',
    readMinutes: 6,
    updated: UPDATED,
    sections: [
      {
        heading: 'Create your attorney account',
        body:
          'Registration is a short four-step form. Your answers are kept as you move between steps, so you can go back and change anything before you submit.',
        steps: [
          'Account: enter your first and last name, email, phone, password and firm name. You can also add your State Bar number and licensing state and click "Check with the State Bar" to preview the result.',
          'Practice & Service Area: choose the case types you want (the same incident types clients pick when they start a case), the states where you practice, and whether you want cases from the entire state or only selected counties.',
          'Capacity & Availability: tell us roughly how many new cases you can take each month.',
          'License Verification: optionally attach your bar card, a government ID or your firm website. You can finish without uploading anything and verify later.',
          'Submit, then confirm your email address from the message we send you.',
        ],
        tips: [
          'If your email already has an account, the form tells you on the first step and offers "Sign in instead" or a password reset.',
          'The bar check is optional at sign-up. If the name on the bar record does not match the name you entered, you can still register and our team will review it.',
          'Your phone number is used for text alerts about case offers and case activity. Reply STOP to any text to opt out.',
        ],
        appLink: { label: 'Attorney registration', to: '/attorney-register' },
      },
      {
        heading: 'Verify your bar license',
        body:
          'A verified license is what earns your verified badge. If you skipped verification during sign-up, open the license upload screen and pick one of two methods.',
        steps: [
          'State Bar Lookup: enter your license number and state, then click "Verify License". This automatically checks active California State Bar licenses.',
          'Manual Upload: upload a PDF or image of your license document and click "Upload License". Our team reviews manual uploads.',
        ],
        tips: [
          'If the State Bar cannot be reached at that moment, you can continue and try again later from your profile.',
        ],
        appLink: { label: 'Upload attorney license', to: '/attorney-license-upload' },
      },
      {
        heading: 'Add a payment method',
        body:
          'Before you reach the dashboard you are asked to save a card. You are not charged when you save it. A per-case routing fee is charged only when you accept a case, and a saved card is required to accept cases. Card details are stored by Stripe; ClearCaseIQ never sees your full card number.',
        appLink: { label: 'Add a payment method', to: '/attorney-onboarding/payment' },
      },
      {
        heading: 'Set up your profile',
        body:
          'Your profile controls what clients see and which cases are routed to you. It has four tabs.',
        steps: [
          'Profile: your name, contact details and the information shown to clients.',
          'Practice: the case types you handle and the states and counties you serve.',
          'Case Preferences: the kinds of cases you want to receive and how many.',
          'Performance: how your matched and accepted cases are doing over time.',
        ],
        tips: [
          'Keep Practice and Case Preferences current. Matching uses them, so an out-of-date service area means fewer or less relevant offers.',
        ],
        appLink: { label: 'Open your profile', to: '/attorney-profile?tab=practice' },
      },
      {
        heading: 'Set up your firm',
        body:
          'The Firm Dashboard is where a firm admin manages the firm as a whole. Its tabs are Overview, New Leads, Active Cases, Team & Roles, Firm Templates, Workflow and Time & Billing. Which tabs a person sees depends on their role and permissions; firm admins see everything.',
        appLink: { label: 'Open the Firm Dashboard', to: '/firm-dashboard' },
      },
      {
        heading: 'Invite your team',
        body:
          'Add attorneys and staff from the Team & Roles tab. Each new member gets an invitation email to set their password, and shows as "Pending" until they accept.',
        steps: [
          'Open Firm Dashboard → Team & Roles.',
          'Add the member with their name, email and firm role.',
          'Optionally adjust their permissions beyond what the role gives them.',
          'If they did not receive the email, click "Resend invite" next to their name. They can also use "Forgot password" on the sign-in page to set a password.',
        ],
        tips: [
          'Staff sign in at the staff login page and only see the screens their permissions allow.',
        ],
        appLink: { label: 'Open Team & Roles', to: '/firm-dashboard' },
      },
      {
        heading: 'Roles and permissions',
        body:
          'There are nine firm roles: Firm Admin, Attorney, Case Manager, Intake Specialist, Paralegal, Billing/Admin, Legal Assistant, Demand Writer and Medical Records. Each role comes with a default set of permissions, and you can grant or remove individual permissions for a member. The eight permissions are:',
        steps: [
          'Manage firm: add, edit and remove members and set their roles; configure routing and workflow; change the plan and seats; view firm performance, fees and spend.',
          'Billing & payments: invoices, payments and firm billing.',
          'View All Cases: see every case in the firm.',
          'Assign cases: assign or reassign cases to attorneys and staff.',
          'Work on active cases: day-to-day work on active cases, including tasks and the medical chronology.',
          'Review, accept & decline cases: open and review incoming cases and accept or decline them on behalf of the firm.',
          'Client communication: message clients, and book and manage their consultations on the attorneys\u2019 calendars.',
          'Documents, records & demands: upload and request documents, draft demand letters, and manage firm templates and send them for signature.',
        ],
        tips: [
          'The Team & Roles tab shows a role-by-permission matrix so you can see at a glance what each role can do.',
          'Firm admins always hold every permission.',
        ],
      },
    ],
  },
  {
    slug: 'receiving-cases',
    title: 'Receiving and accepting cases',
    summary:
      'Review new matches, understand the case scores and the response window, run the conflict check, and accept or decline with confidence.',
    readMinutes: 6,
    updated: UPDATED,
    sections: [
      {
        heading: 'Where new cases appear',
        body:
          'Cases routed to you appear under Lead Generation → New Matches. You are also notified in the app, by email and, if you gave us a mobile number, by text. Firm staff with the "Review, accept & decline cases" permission can work New Matches on the firm\u2019s behalf.',
        appLink: { label: 'Open New Matches', to: '/attorney-dashboard/leadgen/matches' },
      },
      {
        heading: 'The review screen',
        body:
          'Opening a match shows a review screen designed to be read in under a minute. It is a read-only snapshot: the full case file only opens after you accept. The review has Snapshot, Scene, Medical, Insurance and Evidence tabs.',
        steps: [
          'Read the incident summary: when, where and how it happened, plus the client\u2019s description.',
          'Check the key facts: Estimated Case Value, Case Strength (scored out of 100), treatment, insurance (with the policy limit when known) and how much evidence has been uploaded.',
          'Look at "Why This Case Matched Your Profile" to see which of your case types, jurisdictions and value preferences it fits.',
          'Review the risks the system flags, such as no police report yet, gaps in treatment or limited documentation.',
        ],
      },
      {
        heading: 'Understanding the scores',
        body:
          'The Viability Breakdown splits the case into three sub-scores, each from 0 to 100%. The estimated value range is shown with a confidence percentage when one is available.',
        steps: [
          'Liability: how clearly the other party is at fault, based on the reported fault, incident facts and supporting evidence such as police reports or witness statements.',
          'Causation: how strongly the incident, rather than a pre-existing condition, caused the injuries. Long gaps in treatment or prior conditions lower it.',
          'Damages: the severity and value of the harm, based on injury severity, documented medical bills and treatment intensity.',
        ],
        tips: [
          'If a sub-score has not been computed yet, the overall viability score is shown in its place rather than a misleading 0%.',
          'Scores are a starting point for your judgment, not a substitute for it.',
        ],
      },
      {
        heading: 'The response window',
        body:
          'Each offer has a response window. A live countdown sits next to the Accept Case button. When the window runs out, Accept and Decline are disabled and the match is released to another attorney. If another attorney accepts first, you will see that the case has been assigned and is no longer available.',
        tips: ['Turn on text alerts so you can respond to short windows while away from your desk.'],
      },
      {
        heading: 'The automatic conflict check',
        body:
          'When you open a match, a preliminary conflict check runs automatically against your caseload on the platform. If it flags a possible conflict, you see the risk level and the details, and you must tick the acknowledgement box before Accept Case becomes available.',
        tips: [
          'This is only a preliminary screen of your platform caseload. Always run your firm\u2019s full conflict check before engagement.',
        ],
      },
      {
        heading: 'Accepting a case',
        body:
          'Click Accept Case to take the case. Accepting charges the routing fee to the card on file, and the amount is shown on the review screen before you accept. All sales are final: once you accept and pay, the case cannot be withdrawn or refunded. After acceptance the case moves into Case Management, where you work it in the case workspace.',
        tips: [
          'A saved payment method is required to accept cases. Add one from the billing page if you see a payment error.',
        ],
        appLink: { label: 'Open account billing', to: '/attorney-billing' },
      },
      {
        heading: 'Declining a case',
        body:
          'Click Decline and pick the reason that fits best. Your reason helps improve future matching, so choose the most specific one.',
        steps: [
          'Case value too low: the likely recovery does not justify taking the case.',
          'Outside my practice area: you do not handle this type of case.',
          'Wrong jurisdiction: the case is in a state or county you do not serve.',
          'Liability unclear: fault is too uncertain on the current facts.',
          'Insufficient evidence: there is not enough documentation to evaluate it.',
          'Conflict of interest: you or your firm cannot take it.',
          'Too busy / capacity: you have no room for new cases right now.',
          'Other: write a brief reason in the box provided.',
        ],
        tips: [
          'If you keep declining for practice area or jurisdiction, update the Practice tab of your profile so those cases stop reaching you.',
        ],
        appLink: { label: 'Update your practice areas', to: '/attorney-profile?tab=practice' },
      },
      {
        heading: 'Responding from a text message',
        body:
          'Offer texts include a short /o/ link and a six-character code. The link opens that case in your dashboard; if you are not signed in on that phone, you sign in first and are then taken to the case. You can also reply ACCEPT or DECLINE followed by the code, exactly as shown in the text.',
      },
    ],
  },
  {
    slug: 'case-workspace',
    title: 'The case workspace',
    summary:
      'Find your way around an accepted case: the case header, the eight tabs and their subtabs, and what firm staff see when their role is view-only.',
    readMinutes: 5,
    updated: UPDATED,
    sections: [
      {
        heading: 'Opening a case',
        body:
          'Every accepted case lives in Case Management → Active Cases. Click a case to open its workspace. Each tab and subtab has its own web address, so you can bookmark a case\u2019s Insurance subtab or share a link to its Documents with a colleague.',
        appLink: { label: 'Open Active Cases', to: '/attorney-dashboard/cases/active' },
      },
      {
        heading: 'The case header',
        body:
          'The header stays at the top of every tab. It shows the case name, the Case ID, the case type and venue, and the current stage. Below that are four key figures: Case value (median), Policy limit, Demand and Days open, followed by the client\u2019s name and phone number.',
        tips: [
          'You can rename a case (for example, to a caption) from the header. The client\u2019s name stays visible next to the case type so you can still find them.',
          'Use "Message client" in the header to open a chat with the client without leaving the tab you are on.',
          'Click Edit next to the client\u2019s details to correct their name, email or phone.',
        ],
      },
      {
        heading: 'Overview and Tasks',
        steps: [
          'Overview → Summary: the AI case summary, valuation and readiness at a glance.',
          'Overview → Client info: the client\u2019s contact details and mailing address.',
          'Overview → Activity: a chronological record of everything on the matter.',
          'Tasks → Queue: the main work queue for the case, with recommended next steps, assignments and open items.',
          'Tasks → Workflow: your firm\u2019s standard pipeline for the case. Check off steps, assign owners and track progress stage by stage.',
        ],
      },
      {
        heading: 'AI, Documents and Medical',
        steps: [
          'AI → Ask Copilot: ask case-specific questions and get answers with citations, plus workup readiness for the matter.',
          'AI → Rose: Rose reviews the case, raises next tasks and shows the AI Case Coach feed.',
          'Documents: every file on the case, what the client still owes you, e-signatures, and your retainer and HIPAA templates.',
          'Medical: providers, the treatment chronology and cost benchmarks.',
        ],
      },
      {
        heading: 'Claim and Resolution',
        steps: [
          'Claim → Liability: fault theory, comparative negligence and liability evidence.',
          'Claim → Insurance: carriers, policy limits, adjusters and claims.',
          'Claim → Damages: itemized economic damages such as medical costs, wage loss and future costs.',
          'Resolution → Demand: the demand package, case value and policy limits.',
          'Resolution → Negotiation: demands, offers and settlement posture.',
          'Resolution → Settlement: the net-to-client waterfall of fees, case costs and lien reductions.',
        ],
      },
      {
        heading: 'Billing',
        steps: [
          'Billing → Time: log team hours on the case for profitability and fee petitions.',
          'Billing → Invoices: client invoices, payments received and recurring billing.',
          'Billing → Referrals: case sharing, referral fee splits and co-counsel arrangements. This subtab is shown to attorneys only.',
        ],
      },
      {
        heading: 'What firm staff see',
        body:
          'Staff open cases from the Firm Dashboard or Active Cases and see the same workspace, scoped to their firm role. When a role does not include the permission a tab needs, the tab still opens but shows a "View only" notice and every control is disabled.',
        steps: [
          'Client info, Liability, Insurance, Damages, Negotiation and Settlement need permission to edit case details.',
          'Demand needs permission to prepare demand letters.',
          'Invoices need billing permission.',
          'Tasks, Workflow, Medical and Documents check permissions control by control, so some actions may be available while others are not.',
        ],
        tips: [
          'If a team member needs to edit something they can only view, a firm admin can grant the missing permission on Firm Dashboard → Team & Roles.',
          '"Message client" only appears for staff who have the "Client communication" permission.',
        ],
        appLink: { label: 'Open the Firm Dashboard', to: '/firm-dashboard' },
      },
    ],
  },
  {
    slug: 'tasks-and-workflows',
    title: 'Tasks and workflows',
    summary:
      'Build your firm\u2019s case pipeline on the Workflow tab, apply it, and work the tasks it creates on each case and across your whole caseload.',
    readMinutes: 6,
    updated: UPDATED,
    sections: [
      {
        heading: 'How workflows are organized',
        body:
          'A workflow is your firm\u2019s standard pipeline for a practice area. It is made of ordered phases (for example Intake, Medical, Settlement, Litigation and Closing). Each phase holds one or more stages, and each stage holds a checklist of steps. Workflows are built on Firm Dashboard → Workflow by anyone with permission to manage the firm.',
        appLink: { label: 'Open the Firm Dashboard', to: '/firm-dashboard' },
      },
      {
        heading: 'Building a workflow',
        steps: [
          'Open Firm Dashboard → Workflow. You can start from the recommended default or create a new workflow.',
          'Give the workflow a name, choose its practice area and add a description.',
          'Add phases, then stages inside each phase. Use the up and down arrows to reorder them.',
          'Add steps to each stage and set each step\u2019s type, owner, due date offset and whether it is required.',
          'Save your changes.',
        ],
        tips: [
          'You can keep several named workflows. Workflows that are not active and not applied show as "Hidden".',
        ],
      },
      {
        heading: 'Step types and options',
        body:
          'Each step has a type: task, milestone, checkpoint, deadline, document, or AI milestone. AI milestones are read-only and are checked off by the system, not by your team. Every step can also carry:',
        steps: [
          'A suggested owner: a firm role or a specific team member, or leave it unassigned.',
          'A due offset: how many days after the workflow starts the step is due.',
          'A required flag, for steps that must always be done.',
          'A linked firm template, so the step points to the document your team should use.',
          'A condition, described below.',
        ],
      },
      {
        heading: 'Steps that only apply to some cases',
        body:
          'By default a step applies to every case ("Always"). You can add a condition so the step is only included when the case matches, for example only for a particular claim type (such as Auto / Vehicle or Dog Bite), only in a particular state, or only at a particular case status. Pick values from the dropdown rather than typing them, so they match what the system compares against.',
      },
      {
        heading: 'Applying a workflow',
        body:
          'Mark one workflow as your firm default by applying it. It then shows an "Applied" badge. Applying it to a specific case and tracking progress happens in the case workspace on Tasks → Workflow, where your team checks off steps, assigns owners and follows progress stage by stage.',
      },
      {
        heading: 'How tasks are created and grouped',
        body:
          'Workflow steps become tasks on the case\u2019s Tasks → Queue, so they can be assigned and tracked like any other work. To avoid dumping the whole pipeline on day one, only required steps and the steps in the earliest unfinished stage are turned into tasks; later stages appear as you progress. AI milestones never become tasks.',
        steps: [
          'Tasks are grouped by the workflow phase and stage they belong to.',
          'Tasks that did not come from a workflow step (such as checklist items, readiness items, client questions or statute-of-limitations reminders) are automatically filed into the matching phase and stage of the case\u2019s workflow, or into its current stage if there is no better match.',
          'Completing a task checks off its workflow step. If one step has several related tasks, the step is only completed when all of them are done.',
        ],
      },
      {
        heading: 'Working the task queue',
        body:
          'The queue shows counts for Open, Done, Overdue and Due within 7 days. You can add a task yourself, choosing its title, due date, priority, type, workflow section, assignee and notes.',
        steps: [
          'Assign a task to an attorney, a firm role, a specific team member, or to the client.',
          'Use Auto-generate to create tasks from the case\u2019s readiness blockers.',
          'To merge duplicates, tick two or more tasks with the checkboxes and choose Merge to combine them into a single task.',
        ],
        tips: [
          'Staff without permission to work on active cases can open and read tasks but cannot create, complete, edit, assign or comment on them.',
        ],
      },
      {
        heading: 'The cross-case Tasks hub',
        body:
          'Case Management → Tasks shows tasks across all your cases in one place, with a Deadlines tab for upcoming due dates. Use it to plan your week instead of opening each case.',
        appLink: { label: 'Open the Tasks hub', to: '/attorney-dashboard/cases/tasks' },
      },
    ],
  },
  {
    slug: 'client-communication',
    title: 'Client communication',
    summary:
      'Message clients in the app, by text or by email, keep up with the Messages hub, and request documents and follow up until they arrive.',
    readMinutes: 5,
    updated: UPDATED,
    sections: [
      {
        heading: 'Messaging a client from a case',
        body:
          'Click "Message client" in the case header to open the messenger beside the case. Every message, whichever channel you pick, is saved in the case thread, and in-app messages are also saved to the case activity timeline.',
        steps: [
          'Choose a channel: In-app, SMS or Email.',
          'Type your message, or open "Message templates" and pick one to replace the draft.',
          'Click Send Message. You can also Copy the text or Save Draft to finish later.',
        ],
        tips: [
          'If the attorney has a booking page set up, use "Share booking link" to let the client pick a consultation time.',
        ],
      },
      {
        heading: 'How each channel works',
        steps: [
          'In-app: the message appears in the client\u2019s portal and in the case thread.',
          'SMS: the message is texted to the client\u2019s mobile number and saved in the thread. You see a confirmation showing the number it went to.',
          'Email: the message is saved in the thread and the client is emailed to let them know a message is waiting.',
        ],
      },
      {
        heading: 'When a text cannot be delivered',
        body:
          'If a text cannot be sent, the message is still saved in the thread and you see a notice explaining that the text was not sent and why. Try Email instead, or, if the number on file is wrong, correct it using Edit in the case header.',
      },
      {
        heading: 'The Messages hub',
        body:
          'Case Management → Messages brings all your conversations into one place, with unread counts on each tab.',
        steps: [
          'Clients: client and adjuster threads across all your cases.',
          'Team: your firm\u2019s internal team chat.',
          'Mentions: places where a teammate has @mentioned you.',
        ],
        tips: [
          'Staff see the Clients tab only if their role includes "Client communication". Team and Mentions are shown to attorneys.',
        ],
        appLink: { label: 'Open Messages', to: '/attorney-dashboard/cases/messages' },
      },
      {
        heading: 'Requesting documents',
        body:
          'Ask the client for files from the case\u2019s Documents tab. The client gets one link with everything you asked for.',
        steps: [
          'Open the case, go to Documents and choose Request documents.',
          'Pick the items you need. Use "Other\u2026" to describe anything not on the list, such as a rideshare trip receipt.',
          'Choose Email or Text as the delivery method and send the packet.',
        ],
        tips: [
          'Items that are already part of an open request are greyed out. Send a reminder for them instead of requesting them twice.',
        ],
      },
      {
        heading: 'Tracking requests and nudging',
        body:
          'The Requests view on the Documents tab shows each requested item moving through Requested, Received and Reviewed. Items still with the client are listed under "Waiting on the client".',
        steps: [
          'For an item still at Requested, click Nudge and choose text or email to send a reminder. The row then shows when the client was last reminded.',
          'When files arrive, open them from the row and click "Mark reviewed" once you have checked them.',
        ],
      },
      {
        heading: 'Client notes on requests and evidence',
        body:
          'Clients can leave a note on any document you request and on every evidence category in their portal, for example to explain that they did not see a doctor or that a report is on its way. Notes on a request appear as a "Client note" under that item in Requests. Notes on evidence categories are collected in a "Client notes on evidence" card on the case\u2019s Documents tab, newest first.',
        tips: [
          'Read client notes before nudging. A note often explains why a document is missing, which saves an unnecessary reminder.',
        ],
      },
    ],
  },
  {
    slug: 'e-signatures-and-templates',
    title: 'E-signatures and firm templates',
    summary:
      'Build a library of firm documents, place signature fields on them, send them from a case for e-signature, and automate the retainer and welcome packet.',
    readMinutes: 6,
    updated: UPDATED,
    sections: [
      {
        heading: 'Before you start: connect an e-signature provider',
        body:
          'Sending documents for signature needs a connected e-signature provider. A firm admin can connect Dropbox Sign or Documenso under Firm Settings → Integrations. Until one is connected, the "Send for signature" buttons are disabled and explain why.',
        appLink: { label: 'Open Firm Settings', to: '/firm-settings' },
      },
      {
        heading: 'The Firm Templates library',
        body:
          'Firm Dashboard → Firm Templates holds your reusable documents: retainers, HIPAA authorizations, intake packages and more. Templates are grouped by category, and each one is labeled PDF, DOCX or Text only.',
        steps: [
          'Add recommended: add the recommended starter set.',
          'Import: upload PDF, Word, text or Markdown files, or drag and drop them onto the library.',
          'New template: create one from scratch, with a name, description, category, document type and body text or an attached file.',
        ],
        tips: [
          'Only PDFs or templates with body text can be sent for signature. A Word file needs to be re-uploaded as a PDF, or given body text, first.',
          'You need an accepted case before you can send a template to anyone.',
        ],
        appLink: { label: 'Open the Firm Dashboard', to: '/firm-dashboard' },
      },
      {
        heading: 'Placing signature fields',
        body:
          'Open the field editor on a PDF template to place fields exactly where they belong. There are five field types: Signature, Date signed, Initials, Text and Checkbox. Each field is assigned to either the Client or the Attorney.',
        steps: [
          'Pick a field type and choose who fills it in: Client or Attorney.',
          'Click on the page to place the field, then drag to move it or resize it.',
          'Repeat for every field, then save.',
        ],
        tips: [
          'Every template needs at least one client signature field.',
          'Retainers and fee agreements must also have an attorney signature field (California Business and Professions Code \u00a76147).',
          'Only retainers and fee agreements are countersigned. On any other document type, attorney fields must be reassigned to the client.',
          'Checkboxes are optional by default; the other field types are required.',
        ],
      },
      {
        heading: 'Sending from a case',
        body:
          'Most documents are sent from the case itself: open the case, go to Documents and choose the Signatures view. The "Signature documents" card shows what the client has signed, what is still out, and what has not been sent.',
        steps: [
          'Click a document chip (for example the retainer) to send it to the client. Chips marked "Required" still need to be sent.',
          'Use "Other document" to send your own PDF or a firm template, or "Police report authorization" when you need one.',
          'Use "Client packet" to send files to upload plus the retainer and HIPAA forms to sign, all in one link.',
          'Check the signer, preview the filled document and send.',
        ],
        tips: [
          'A sent document shows as "sent" and then "viewed" once the client opens it. If it was declined or has expired, the chip turns red and offers a resend.',
          'Click Refresh in "Waiting for the client to sign" to check the latest status with the signing provider.',
          'If the client signed on paper, use "Upload signed copy" to file it.',
        ],
      },
      {
        heading: 'Sending from the template library',
        body:
          'You can also send straight from Firm Templates: click "Send for signature" on a template, pick the client or case, check the filled preview, confirm the signer\u2019s name and email and the document title, choose the e-signature provider and send.',
      },
      {
        heading: 'Auto-send the retainer',
        body:
          'In Firm Settings → Intake automation, turn on "Auto-send retainer on acquire" to send the contingency-fee retainer for e-signature automatically after a case is purchased. It needs a connected e-signature provider and a client email. When it is off, attorneys get a "Send retainer to client" task instead.',
        tips: [
          'Set a default contingency fee in the same section. It is prefilled on retainers and can be changed per case before sending; if left blank, 33.33% is used.',
        ],
        appLink: { label: 'Open Firm Settings', to: '/firm-settings' },
      },
      {
        heading: 'The welcome packet',
        body:
          'Also in Firm Settings, the welcome packet is the set of documents sent to every new client for e-signature. Every new case gets a "Send client welcome packet" task listing them.',
        steps: [
          'Tick the documents to include: the built-in Retainer agreement, the built-in HIPAA authorization (which needs a HIPAA-capable signature tool) and any of your sendable firm templates.',
          'Upload a PDF directly with "Upload document"; it is added to the packet and to your templates.',
          'Turn on "Send the welcome packet when a case is purchased" to send it automatically. The client gets the signing link by email, text and on their dashboard.',
        ],
        tips: [
          'If the packet cannot be sent (no client email or no signature tool), the task stays open for your team to finish.',
          'If no documents are selected, no welcome packet task is created.',
        ],
      },
    ],
  },
  {
    slug: 'demand-negotiation-settlement',
    title: 'Demand, negotiation and settlement',
    summary:
      'Know when a case is demand-ready, draft and finalize the demand letter, log negotiations and get the client\u2019s decision, and model the settlement through to disbursement.',
    readMinutes: 6,
    updated: UPDATED,
    sections: [
      {
        heading: 'Demand readiness',
        body:
          'Open a case and go to Resolution → Demand. Until a letter exists, a banner tells you whether the case is demand-ready. If it is not, it shows the readiness percentage and lists the items still missing, so you can close them before sending. The Demand readiness meter breaks the score down by factor.',
        tips: [
          'Missing items that need something from the client can often be requested straight from this screen.',
          'Use Auto-generate on the Tasks tab to turn readiness blockers into tasks for your team.',
        ],
      },
      {
        heading: 'Valuation and the suggested opening demand',
        body:
          'The "Valuation & demand anchor" card shows medical specials, the median case value, a suggested opening demand and the policy limit. A ladder plots the low, median and high values against the policy limit and any demand already made.',
        steps: [
          'The suggested opening demand is anchored above the modeled value to leave room to negotiate: it takes the higher of the modeled high value and 1.4 times the median, then rounds it up to a clean figure.',
          'If the modeled value runs above the known policy limit, you see a warning to build the demand with a policy-limits strategy and document the excess exposure.',
        ],
        tips: ['The suggestion is a starting point. Adjust it to your judgment of the case and the carrier.'],
      },
      {
        heading: 'Drafting the demand letter',
        body:
          'The demand letter workspace sits on the same tab. Rose, the AI case manager, can draft a ClearCaseIQ Super Demand from the case record: a settlement package for the carrier, plus Demand Intelligence for you covering readiness, valuation, weaknesses, statement confidence and a quality check.',
        steps: [
          'Optionally tell Rose what to emphasize, then click "Draft Super Demand".',
          'Or import a letter you already wrote in Word or Google Docs (PDF, .docx, or paste the text). The original file is kept.',
          'Edit the text directly. The letter is plain text so it exports cleanly to Word.',
          'Save your changes.',
        ],
        tips: [
          'When a case becomes demand-ready, Rose may draft a letter automatically. It stays on hold until someone reads it and clicks "Approve Rose\u2019s draft".',
          'Staff whose role does not include demand letters see the workspace read-only.',
        ],
      },
      {
        heading: 'Finalizing and sending',
        body:
          'Each letter moves through Drafted, Approved (for Rose\u2019s drafts), the attorney approval gate (for Super Demands), Finalized and Sent.',
        steps: [
          'Sign every item in the attorney approval gate in the right-hand panel. Finalize unlocks once the gate is complete.',
          'Click Finalize to lock the letter.',
          'Use "Download Word" to get the .docx, send it to the carrier, then click "Mark as sent".',
        ],
        tips: ['All the case\u2019s demand letters are listed under "All demand letters" so you can find earlier versions.'],
      },
      {
        heading: 'Logging negotiations',
        body:
          'Resolution → Negotiation keeps the negotiation history for the case. Log every Offer, Counteroffer, Demand, Call or Note with its party, date, carrier, amount and terms, and attach proof such as the offer letter.',
        tips: ['The terms field is visible to the client, so write it in language they will understand.'],
      },
      {
        heading: 'Getting the client\u2019s decision',
        body:
          'Offers, counteroffers and demands can be sent to the client to accept or decline. Tick "Send to the client to accept or decline" when logging the entry, or click "Send to client" on an existing row.',
        steps: [
          'The row shows "Awaiting client" until the client answers.',
          'It then shows "Client accepted" or "Client declined" with the date, plus any note the client left.',
          'Use Resend to ask the client again.',
        ],
      },
      {
        heading: 'The settlement waterfall',
        body:
          'Resolution → Settlement models the money from gross recovery to the client\u2019s net: gross recovery, minus the attorney fee, minus case costs, minus medical liens (after any negotiated reductions), equals the client net.',
        steps: [
          'Enter the settlement inputs, including whether your fee is calculated on the gross recovery or net of case costs.',
          'Add case costs such as filing fees, expert fees, records retrieval, investigation, depositions and service of process.',
          'Add liens by lienholder type (for example medical provider, health insurer, Medicare, Medicaid, MedPay or ERISA plan), with the asserted amount, the negotiated amount and a status of Open, Negotiating, Reduced, Resolved or Waived.',
        ],
        tips: [
          'Read the warnings at the top. They flag problems such as a settlement that would leave the client with nothing after liens. The client net turns red if it is zero or less.',
        ],
      },
      {
        heading: 'Settlement statuses',
        body:
          'A settlement starts as Draft. Click "Finalize settlement" once the agreed amount is entered; it then shows "Finalized \u2014 funds pending". When the money has gone out, click "Mark disbursed" and it shows Disbursed with the date and who marked it. While finalized, you can Reopen it to make changes.',
      },
    ],
  },
  {
    slug: 'billing-time-invoices',
    title: 'Billing, time and invoices',
    summary:
      'Track time on each case, set firm billing rates and approve time, invoice clients and record payments, and manage your own ClearCaseIQ account billing.',
    readMinutes: 6,
    updated: UPDATED,
    sections: [
      {
        heading: 'Two kinds of billing',
        body:
          'There are two separate things called billing. Client billing is the time, invoices and payments for your cases, handled inside each case and on the Firm Dashboard. Account billing is what your firm pays ClearCaseIQ, such as routing fees and subscriptions, handled on the account billing page.',
      },
      {
        heading: 'Logging time on a case',
        body:
          'Open a case and go to Billing → Time. The tab shows logged hours, billable value and the number of entries, with a list of every entry below.',
        steps: [
          'To use the timer: choose an activity, add a description, tick or untick Billable, and click start. The timer keeps running if you reload the page. Stop it to log the time, or discard it.',
          'To log time by hand: enter the hours, activity, date and description, tick Billable if it applies, and save.',
          'Remove an entry from the list if it was logged by mistake.',
        ],
        tips: [
          'Firm admins can log time on a teammate\u2019s behalf.',
          'Time is useful even on contingency cases: it supports profitability tracking, fee petitions and lien or fee disputes.',
        ],
      },
      {
        heading: 'Firm billing rates',
        body:
          'On Firm Dashboard → Time & Billing, click Configure under "Billing rates" to set a default hourly rate for each firm role, plus optional overrides for individual people. Click "Save rates" when you are done.',
        tips: [
          'Rates are copied onto each time entry when it is logged, so changing a rate only affects new time, not entries already recorded.',
        ],
        appLink: { label: 'Open the Firm Dashboard', to: '/firm-dashboard' },
      },
      {
        heading: 'Reviewing and approving time',
        body:
          'The same tab shows firm-wide totals: Total hours, Billable hours, Billable value, Unbilled WIP and the number of entries Awaiting approval.',
        steps: [
          'Filter the list by status (Submitted, Approved, Rejected, Draft or Invoiced) and by person.',
          'Approve or reject each entry from its row.',
          'Click Export CSV to download the entries for payroll, accounting or a fee petition.',
        ],
      },
      {
        heading: 'Invoicing a client',
        body:
          'Open a case and go to Billing → Invoices. The Billing & Payments section lists the case\u2019s invoices and payments.',
        steps: [
          'Enter an invoice number, amount, status (Open, Paid or Overdue), due date and any notes, then click Add Invoice.',
          'Download any invoice as a PDF or a Word document.',
          'For unpaid invoices, use "Pay with Stripe" to collect payment by card.',
          'Record payments received another way (for example ACH or check) with the amount, method, date, reference and notes, then click Add Payment. Each payment has a downloadable receipt.',
        ],
      },
      {
        heading: 'Recurring invoices',
        body:
          'Under Recurring Invoices on the same tab, set up an invoice that repeats: enter the amount, the interval in days, the next run date and notes, then click Add Recurring Invoice. Each one shows how often it runs and when it runs next. Click "Run Due" to generate any recurring invoices that are due now.',
      },
      {
        heading: 'The Billing hub',
        body:
          'Case Management → Billing shows your fees collected year-to-date, totaled from client payments recorded on all your cases since January 1, with a "Fees by case" table. To raise invoices or record payments, open the case itself.',
        appLink: { label: 'Open the Billing hub', to: '/attorney-dashboard/cases/billing' },
      },
      {
        heading: 'Your ClearCaseIQ account billing',
        body:
          'The account billing page is where you manage what you pay ClearCaseIQ. All charges are processed by Stripe, and Stripe emails a receipt after each one.',
        steps: [
          'Payment Method: add or update the card used for routing fees, subscriptions and lead credits.',
          'Subscription: choose a plan that includes a number of accepted cases each month. Billing Status shows your current plan and how many included cases remain.',
          'Use "Manage Subscription & Cards" to change your plan or cards in Stripe.',
          'Fees & Payments lists everything you have paid: routing fees, subscriptions and lead credits.',
        ],
        tips: [
          'Accepting a case charges the routing fee shown on the case review screen, and all sales are final.',
          'With a card saved, future routing fees are charged to it automatically instead of asking you to check out each time.',
        ],
        appLink: { label: 'Open account billing', to: '/attorney-billing' },
      },
    ],
  },
  {
    slug: 'zoom-integration',
    title: 'Zoom video calls',
    summary:
      'Connect your Zoom account, start video calls and schedule Zoom consultations from a case, and disconnect or remove the Zoom app at any time.',
    readMinutes: 4,
    updated: '2026-10-21',
    sections: [
      {
        heading: 'What the Zoom integration does',
        body:
          'Connecting Zoom lets ClearCaseIQ create meetings on your own Zoom account. You can start an instant video call from a case or schedule a Zoom consultation, and the client gets the join link automatically. When a call ends, ClearCaseIQ adds a note to the case and drafts a time entry for you to review. Each attorney connects their own Zoom account; nothing is shared between attorneys.',
      },
      {
        heading: 'Connect your Zoom account',
        steps: [
          'Open Case Management \u2192 Calendar and choose the Booking link tab.',
          'Find the Zoom card and click Connect.',
          'Sign in to Zoom if asked, review the permissions and click Allow.',
          'You return to ClearCaseIQ and the Zoom card shows Connected with your Zoom email address.',
        ],
        tips: [
          'You can also connect from a case: if Zoom is not connected yet, clicking "Start video call" shows a "Connect Zoom" link.',
          'ClearCaseIQ asks Zoom only for what it needs: your basic profile, permission to create meetings, and the tokens used to start and join those meetings.',
        ],
        appLink: { label: 'Open Calendar settings', to: '/attorney-dashboard/cases/calendar?tab=booking' },
      },
      {
        heading: 'Start a video call from a case',
        steps: [
          'Open the case and click "Start video call" in the case header.',
          'A Zoom meeting is created on your account and opens in Zoom in a new tab, with you as the host.',
          'The client is sent the join link as a message on the case, an in-app notification and an email.',
        ],
        tips: [
          'If the client has no email on file, ClearCaseIQ tells you so. Click "Copy link" and send the link another way.',
          'If nothing opens, allow pop-ups for ClearCaseIQ in your browser and click the button again.',
        ],
      },
      {
        heading: 'Schedule a Zoom consultation',
        steps: [
          'Book a consultation from a case or from your calendar and choose "Video (Zoom)" as the meeting type.',
          'ClearCaseIQ creates the Zoom meeting when the consultation is booked and adds the link to the appointment.',
          'The client sees a "Join video call" button on their dashboard for the upcoming consultation.',
        ],
      },
      {
        heading: 'After the call',
        body:
          'When a meeting on a case ends, ClearCaseIQ adds an internal note to the case, such as "Video call with client (Zoom), 18 min", and creates a draft, billable time entry for the call length at your hourly rate. Review and confirm the draft under Time & Billing before it can go on an invoice.',
      },
      {
        heading: 'Disconnect Zoom in ClearCaseIQ',
        steps: [
          'Open Case Management \u2192 Calendar \u2192 Booking link.',
          'On the Zoom card, click Disconnect.',
        ],
        tips: [
          'Disconnecting revokes ClearCaseIQ\u2019s access at Zoom and deletes the Zoom tokens we stored for you.',
          'Meetings already created stay on your Zoom account, and past call notes and time entries stay on their cases. Click Connect any time to reconnect.',
        ],
        appLink: { label: 'Open Calendar settings', to: '/attorney-dashboard/cases/calendar?tab=booking' },
      },
      {
        heading: 'Remove the ClearCaseIQ app from Zoom',
        steps: [
          'Sign in at marketplace.zoom.us.',
          'Click Manage, then Added Apps.',
          'Find ClearCaseIQ and click Remove.',
        ],
        tips: [
          'When you remove the app, Zoom notifies ClearCaseIQ and we delete the Zoom tokens and account details stored for you.',
          'Starting a video call afterwards asks you to connect Zoom again.',
        ],
      },
      {
        heading: 'What ClearCaseIQ stores',
        body:
          'Your Zoom user ID, email address and display name; the access tokens that let us create meetings for you, encrypted at rest; and, for each meeting, its ID, join link, passcode, start and end times and duration. We do not store recordings, chat or anything said in the meeting. Questions: support@clearcaseiq.com.',
      },
    ],
  },
]

export function getAttorneyGuide(slug: string): AttorneyGuide | undefined {
  return attorneyGuides.find((guide) => guide.slug === slug)
}
