/**
 * Primary CTA for attorney case tasks.
 * Specific Day-1 / collect handlers first, then keyword + taskType heuristics,
 * then a guaranteed Open fallback so every generated task has an Action button.
 */

export type TaskPrimaryActionKind =
  | 'run_conflict'
  | 'send_retainer'
  | 'check_retainer'
  | 'send_hipaa'
  | 'collect_police'
  | 'collect_medical_records'
  | 'collect_bills'
  | 'open_insurance'
  | 'send_lor'
  | 'send_lor_providers'
  | 'send_welcome'
  | 'open_overview'
  | 'open_client_info'
  | 'open_evidence'
  | 'open_medical'
  | 'open_liability'
  | 'open_damages'
  | 'open_demand'
  | 'open_negotiation'
  | 'open_settlement'
  | 'open_workflow'
  | 'open_signatures'
  | 'open_task_detail'

export type TaskPrimaryAction = {
  kind: TaskPrimaryActionKind
  /** Button label while the task is open. */
  label: string
  /** Button label when the task is already done (often View). */
  doneLabel?: string
  /** Tooltip / title attribute. */
  hint: string
  doneHint?: string
}

type TaskLike = {
  title?: string | null
  taskType?: string | null
  deadlineType?: string | null
  workflowPhase?: string | null
  workflowStage?: string | null
  notes?: string | null
}

/**
 * Longer “what does this task mean?” copy for hover tooltips on the task title.
 * Prefer this over stuffing the Action-button hint. Every titled task gets
 * copy: specific explanations first, then the task's own notes, then what the
 * section it belongs to is for.
 */
export function resolveTaskHelpTooltip(task: TaskLike): string | null {
  const title = String(task.title || '')
  if (!title.trim()) return null
  return (
    specificTaskHelp(task, title) ||
    notesHelp(task.notes) ||
    SECTION_HELP[resolveTaskPrimaryAction(task)?.kind ?? 'open_task_detail'] ||
    SECTION_HELP.open_task_detail ||
    null
  )
}

/** First sentence or two of the task's notes, when they read as an explanation. */
function notesHelp(notes: string | null | undefined): string | null {
  const text = String(notes || '').replace(/\s+/g, ' ').trim()
  if (text.length < 20 || /^[[{]/.test(text)) return null
  if (text.length <= 280) return text
  const cut = text.slice(0, 280)
  const lastStop = cut.lastIndexOf('. ')
  return lastStop > 80 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`
}

const SECTION_HELP: Partial<Record<TaskPrimaryActionKind, string>> = {
  open_client_info: 'Keep the client’s contact and personal details accurate — everything sent to the client and carriers uses them.',
  open_overview: 'Review the client and case at a glance and follow up with the client where needed.',
  open_evidence: 'Collect or review a document the case needs. Upload it under Evidence, or use Request from client to ask for it.',
  open_medical: 'Keep the treatment picture current — providers, visits, treatment status, MMI, and future care all feed the demand and case value.',
  open_liability: 'Build the proof of fault — fault theory, police report, witnesses, photos, and video — on the Liability tab.',
  open_damages: 'Keep the damages ledger itemized — medical bills, wage loss, and out-of-pocket costs drive the demand amount.',
  open_insurance: 'Work the insurance side of the case — carriers, claim numbers, adjusters, coverage limits, and liens.',
  open_demand: 'Move the demand package forward — draft, review, and send the demand letter to the carrier.',
  open_negotiation: 'Track carrier offers against the case value and plan the next counter.',
  open_settlement: 'Finish the settlement — release, liens, disbursement, and the client closing statement.',
  open_signatures: 'Send or check documents that need the client’s signature (retainer, HIPAA, releases).',
  open_workflow: 'A step in this case’s pipeline. Complete it to move the case to the next stage.',
  open_task_detail: 'A task on this case. Open it to see the details, add notes or subtasks, and mark it done when finished.',
}

function specificTaskHelp(task: TaskLike, title: string): string | null {
  if (/\bdec(larations?)? page\b/i.test(title)) {
    return 'The declarations page shows the policy’s coverage limits — the ceiling on what the carrier can pay. Request it from the adjuster (or from the client for their own policy) on the Insurance tab.'
  }

  if (/confirm defendant insurance carrier|defendant.*claim number/i.test(title)) {
    return 'Identify the at-fault party’s insurer and record the claim number on the Insurance tab. The letter of representation and the demand both go to this carrier.'
  }

  if (/^collect\s+/i.test(title) && !/collect medical|collect police|collect bills/i.test(title)) {
    return `The case is missing ${title.replace(/^collect\s+/i, '').trim()}. Upload it under Evidence or request it from the client — it counts toward demand readiness.`
  }

  if (/treatment (continuity )?gap/i.test(title)) {
    return 'There is a long break between treatment visits. Adjusters argue a gap means the injury resolved — find out why it happened and document the reason.'
  }

  if (/confirm (current )?treatment status|finished treating|treatment is complete|discharge \/ mmi|mmi reached|treatment complete/i.test(title)) {
    return 'Find out whether the client is still treating or has reached MMI / been discharged. The demand should wait until treatment is complete so every bill is included.'
  }

  if (/monitor ongoing treatment/i.test(title)) {
    return 'Check in on the client’s treatment regularly and log new visits and providers on the Medical tab.'
  }

  if (/future treatment|life-care/i.test(title)) {
    return 'Record recommended future treatment and its estimated cost so future damages are included in the demand.'
  }

  if (/lien|subrogation/i.test(title)) {
    return 'Identify health-insurer, Medicare/Medicaid, and provider liens. They are paid from the settlement, so they must be known and negotiated before disbursement.'
  }

  if (/gather photos|witness statements|scene evidence/i.test(title)) {
    return 'Collect scene and damage photos, witness statements, and any video. These prove fault and are referenced in the demand’s liability section.'
  }

  if (/all medical records & bills received|highest-impact missing documents/i.test(title)) {
    return 'The demand needs complete medical records and itemized bills from every provider. Check Evidence for anything still missing and request it.'
  }

  if (/special damages summary|compile.*damages/i.test(title)) {
    return 'Total every economic loss — medical bills, wage loss, out-of-pocket costs — on the Damages ledger. These figures become the specials in the demand.'
  }

  if (/draft demand letter|move (the )?file (into|toward) demand|move toward the demand package/i.test(title)) {
    return 'Prepare the demand letter from the case record — liability, treatment, bills, and damages — on the Demand tab.'
  }

  if (/approve demand/i.test(title)) {
    return 'Attorney review of the drafted demand before it goes to the carrier. Check the figures, exhibits, and demand amount.'
  }

  if (/demand sent to carrier/i.test(title)) {
    return 'Marks the demand as sent. The carrier’s response window starts from this date.'
  }

  if (/adjuster offer received/i.test(title)) {
    return 'Record the carrier’s offer on the Negotiation tab so it can be compared with the case value.'
  }

  if (/evaluate offer|negotiation posture|counter & negotiate|negotiation strategy/i.test(title)) {
    return 'Compare the latest offer with the case value and decide on the next counter-offer.'
  }

  if (/client approval of settlement/i.test(title)) {
    return 'Get the client’s approval of the settlement amount and terms before accepting.'
  }

  if (/settlement reached/i.test(title)) {
    return 'Marks the case as settled. Next come the release, lien resolution, and disbursement.'
  }

  if (/execute release/i.test(title)) {
    return 'Have the client sign the release and settlement documents and return them to the carrier.'
  }

  if (/disburse|closing statement/i.test(title)) {
    return 'Pay out the settlement — fees, costs, liens, and the client’s share — and send the client a closing statement.'
  }

  if (/^close matter$/i.test(title)) {
    return 'Close the file once all funds are disbursed and nothing remains open.'
  }

  if (/filing deadline has passed/i.test(title)) {
    return 'The calendared filing deadline appears to have passed. Confirm right away whether suit was filed or an exception applies.'
  }

  if (/consult/i.test(title)) {
    return 'Schedule or prepare for the consultation with the client.'
  }

  if (/plaintiff update|client about/i.test(title)) {
    return 'Send the client a short update about where the case stands and anything you need from them.'
  }

  if (task.taskType === 'question' || /questions? for the (plaintiff|client)/i.test(title)) {
    return 'Questions for the client. Open the task to send them and review the client’s answers.'
  }

  if (/confirm scope of representation/i.test(title)) {
    return (
      'Confirm what the firm is (and isn’t) handling for this client — claim type, parties, and fee terms. ' +
      'This is often discussed on the first consult; after retain, check it against the signed engagement and mark done.'
    )
  }

  if (/verify client contact/i.test(title)) {
    return 'Confirm the client’s name, phone, email, and mailing address on file are current and correct.'
  }

  if (/obtain signed hipaa/i.test(title) || /signed hipaa authorization/i.test(title)) {
    return 'Get a signed HIPAA authorization so the firm can request medical records. Auto-completes when platform HIPAA or a signed firm HIPAA envelope is already on file.'
  }

  if (/confirm signed (retainer|representation)/i.test(title)) {
    return 'Confirm the client has signed the retainer / representation agreement. Use Check to look for a signed e-sign envelope.'
  }

  if (/^send retainer to client$/i.test(title) || /send retainer for signature/i.test(title)) {
    return 'Send the engagement / retainer agreement for the client’s signature.'
  }

  if (/complete conflict check/i.test(title) || /open matter.*conflict check/i.test(title)) {
    return 'Run a conflict screen against your firm’s caseload before work proceeds on this matter.'
  }

  if (/^statute of limitations/i.test(title) || task.taskType === 'statute' || task.deadlineType === 'sol') {
    return 'Filing deadline calendared from the incident date, venue, and claim type. Review it on the case Overview and keep monitoring until the case is filed or closed.'
  }

  if (/send letter of representation \(lor\)/i.test(title) || /^send letter of representation/i.test(title)) {
    return 'Notify the insurance carrier that your firm represents the client (Letter of Representation).'
  }

  if (/letter[s]? of representation.*provider/i.test(title) || /lor.*provider/i.test(title)) {
    return 'Send letters of representation to medical providers. Client needs a signed HIPAA first (Signatures → HIPAA).'
  }

  if (/open insurance claim/i.test(title)) {
    return 'Open liability and first-party (UM/UIM) claims with the carriers and record claim numbers.'
  }

  if (/identify and log claims adjuster/i.test(title) || /log claims adjuster/i.test(title)) {
    return 'Identify the assigned adjuster and log their name and contact details on the Insurance tab.'
  }

  if (/applicable coverage/i.test(title) || /um\/uim/i.test(title)) {
    return 'Confirm the client’s own UM/UIM, MedPay, and PIP coverage and note applicable limits.'
  }

  if (/request police|collect police|secure police/i.test(title)) {
    return 'Obtain the police or incident report for the crash and file it under Evidence.'
  }

  if (/welcome packet/i.test(title)) {
    return 'Send the firm’s client welcome / onboarding packet (often retainer + HIPAA and intake instructions).'
  }

  return null
}

function openSection(
  kind: TaskPrimaryActionKind,
  label: string,
  hint: string,
  doneHint?: string,
): TaskPrimaryAction {
  return {
    kind,
    label,
    doneLabel: 'View',
    hint,
    doneHint: doneHint || hint,
  }
}

/** Map title / type / workflow context to a workspace section action. */
function heuristicSectionAction(task: TaskLike): TaskPrimaryAction | null {
  const title = String(task.title || '')
  const type = String(task.taskType || '').toLowerCase()
  const phase = `${task.workflowPhase || ''} ${task.workflowStage || ''}`.toLowerCase()
  const hay = `${title} ${type} ${phase}`

  if (/verify client/i.test(title)) {
    return openSection('open_client_info', 'Open', 'Open Client Info to confirm and correct the client’s details')
  }

  if (type === 'question' || /questions? for the (plaintiff|client)/i.test(title)) {
    return {
      kind: 'open_task_detail',
      label: 'Open',
      doneLabel: 'View',
      hint: 'Open this task to review and answer plaintiff questions',
      doneHint: 'Open this task to review answers',
    }
  }

  if (
    type === 'statute' ||
    task.deadlineType === 'sol' ||
    type === 'deadline' ||
    type === 'filing' ||
    /statute of limitations|filing deadline|protect the filing|calendar and monitor the filing|deadline has passed/i.test(
      title,
    )
  ) {
    return {
      kind: 'open_overview',
      label: 'Review',
      doneLabel: 'View',
      hint: 'Open Overview to review the statute of limitations / filing deadline',
      doneHint: 'Open Overview to review this deadline',
    }
  }

  if (
    type === 'medical' ||
    /treatment|mmi|discharge|provider|medical timeline|treatment gap|treatment status|treatment continuity|life-care|future treatment/i.test(
      hay,
    )
  ) {
    return openSection('open_medical', 'Open', 'Open Medical to update treatment and providers')
  }

  if (
    /insurance|adjuster|coverage|carrier|claim\b|um\/uim|medpay|\bpip\b|policy|\bliens?\b|subrogation|letter of representation|\blor\b/i.test(hay)
  ) {
    return openSection('open_insurance', 'Open', 'Open Insurance to update claims, coverage, or liens')
  }

  if (/liability|fault|comparative|witness|scene evidence|accident reconstruction/i.test(hay)) {
    return openSection('open_liability', 'Open', 'Open Liability to update fault theory and evidence')
  }

  if (
    type === 'demand' ||
    /demand letter|draft demand|demand package|demand drafting|approve demand|demand sent/i.test(hay)
  ) {
    return openSection('open_demand', 'Open', 'Open Demand to work the demand package')
  }

  if (type === 'negotiation' || /negotiat|offer vs|counter &|settlement posture/i.test(hay)) {
    return openSection('open_negotiation', 'Open', 'Open Negotiation to review offers and posture')
  }

  if (/settlement|release|disburse|closing statement|close matter/i.test(hay)) {
    return openSection('open_settlement', 'Open', 'Open Settlement for release, liens, and disbursement')
  }

  if (
    /special damages|damages summary|wage loss|itemized damages|damages ledger|compile.*damages/i.test(hay)
  ) {
    return openSection('open_damages', 'Open', 'Open Damages to update the damages ledger')
  }

  if (
    /retainer|hipaa|authorization|welcome packet|e-?sign|signature/i.test(
      hay,
    )
  ) {
    return openSection('open_signatures', 'Open', 'Open Signatures to send or review documents')
  }

  if (
    type === 'evidence' ||
    /police|incident report|medical records?|medical bills?|photos?|evidence|document|upload|collect |request |secure |gather /i.test(
      hay,
    )
  ) {
    return openSection('open_evidence', 'Open', 'Open Evidence to collect or review case documents')
  }

  if (type === 'client' || /contact the client|client follow|scope of representation/i.test(hay)) {
    return openSection('open_overview', 'Open', 'Open Overview to review client and case details')
  }

  if (/workflow|monitor ongoing/i.test(hay) || Boolean(task.workflowPhase)) {
    return openSection('open_workflow', 'Open', 'Open Workflow to update this pipeline step')
  }

  return null
}

export function resolveTaskPrimaryAction(task: TaskLike): TaskPrimaryAction | null {
  const title = String(task.title || '')
  if (!title.trim()) return null

  if (/\bdec(larations?)? page\b/i.test(title)) {
    return openSection(
      'open_insurance',
      'Open',
      'Open Insurance and use "Request declarations page" on this policy — it goes to the adjuster, or to your client for their own policy',
    )
  }

  if (
    /complete conflict check/i.test(title) ||
    /open matter.*conflict check/i.test(title) ||
    /^run conflict check$/i.test(title)
  ) {
    return {
      kind: 'run_conflict',
      label: 'Run',
      doneLabel: 'Done',
      hint: 'Run the preliminary conflict screen against your platform caseload',
      doneHint: 'Conflict check already completed',
    }
  }

  if (/^send retainer to client$/i.test(title) || /send retainer for signature/i.test(title)) {
    return {
      kind: 'send_retainer',
      label: 'Send',
      doneLabel: 'View',
      hint: 'Open Signatures with Retainer ready to send',
      doneHint: 'Open Signatures to review retainer status',
    }
  }

  if (/confirm signed (retainer|representation)/i.test(title)) {
    return {
      kind: 'check_retainer',
      label: 'Check',
      doneLabel: 'View',
      hint: 'Check for a signed retainer and complete this task if signed',
      doneHint: 'Open Signatures to view the signed retainer',
    }
  }

  if (/obtain signed hipaa/i.test(title) || /signed hipaa authorization/i.test(title)) {
    return {
      kind: 'send_hipaa',
      label: 'Check',
      doneLabel: 'View',
      hint: 'Check for HIPAA on file (platform consent or signed envelope) and open Signatures',
      doneHint: 'Open Signatures to view the HIPAA authorization',
    }
  }

  if (
    /collect police\/?incident report/i.test(title) ||
    /collect police.?incident report/i.test(title) ||
    /request police\s*\/\s*incident report/i.test(title) ||
    /secure police\s*\/\s*incident report/i.test(title) ||
    /obtain the police report/i.test(title)
  ) {
    return {
      kind: 'collect_police',
      label: 'Collect',
      doneLabel: 'View',
      hint: 'Open Evidence to upload or request the police/incident report',
      doneHint: 'Open Evidence to view the report',
    }
  }

  if (
    /collect medical records?/i.test(title) ||
    /request medical records?/i.test(title) ||
    /secure medical records?/i.test(title) ||
    /obtain medical records?/i.test(title) ||
    (/obtain medic/i.test(title) && !/bills/i.test(title))
  ) {
    return {
      kind: 'collect_medical_records',
      label: 'Collect',
      doneLabel: 'View',
      hint: 'If records are already on file, marks this done; otherwise opens Evidence',
      doneHint: 'Open Evidence to view medical records',
    }
  }

  if (
    /collect medical bills?/i.test(title) ||
    /request medical bills?/i.test(title) ||
    /secure medical bills?/i.test(title) ||
    /obtain medical bills?/i.test(title) ||
    /collect (medical )?bills\b/i.test(title) ||
    /itemized damages/i.test(title) ||
    /damages ledger/i.test(title)
  ) {
    return {
      kind: 'collect_bills',
      label: 'Collect',
      doneLabel: 'View',
      hint: 'If bills are already on file, marks this done; otherwise opens Evidence',
      doneHint: 'Open Evidence to view bills',
    }
  }

  if (
    /letter[s]? of representation.*provider/i.test(title) ||
    /lor.*provider/i.test(title) ||
    /representation to providers?/i.test(title)
  ) {
    return {
      kind: 'send_lor_providers',
      label: 'Send',
      doneLabel: 'View',
      hint: 'Open Medical to send each provider a letter of representation and records request',
      doneHint: 'Open Medical to review provider letters and records',
    }
  }

  if (/^send letter of representation/i.test(title) || /send letter of representation \(lor\)/i.test(title)) {
    return {
      kind: 'send_lor',
      label: 'Send',
      doneLabel: 'View',
      hint: 'Open Insurance to preview and send the letter of representation to the carrier',
      doneHint: 'Open Insurance to review letters sent',
    }
  }

  if (/send client welcome packet/i.test(title) || /welcome packet/i.test(title)) {
    return {
      kind: 'send_welcome',
      label: 'Send',
      doneLabel: 'View',
      hint: 'Email the client the retainer agreement and HIPAA authorization to sign',
      doneHint: 'Open Signatures to review packet status',
    }
  }

  // Readiness automation titles like "Collect {label}"
  if (/^collect\s+/i.test(title) && !/collect medical|collect police|collect bills/i.test(title)) {
    return {
      kind: 'open_evidence',
      label: 'Collect',
      doneLabel: 'View',
      hint: 'Open Evidence to collect the requested item',
      doneHint: 'Open Evidence to review collected items',
    }
  }

  const heuristic = heuristicSectionAction(task)
  if (heuristic) return heuristic

  // Guaranteed Action for any other generated / custom task.
  return {
    kind: 'open_task_detail',
    label: 'Open',
    doneLabel: 'View',
    hint: 'Open this task to review details and mark progress',
    doneHint: 'Open this task to review details',
  }
}

/** Case-workspace section path for navigate-only actions. */
export function sectionForTaskAction(kind: TaskPrimaryActionKind): string | null {
  switch (kind) {
    case 'send_retainer':
      return 'documents'
    case 'check_retainer':
    case 'send_welcome':
    case 'open_signatures':
      return 'signatures'
    case 'send_lor':
      return 'insurance?letter=1'
    case 'send_lor_providers':
      return 'medical?letter=1'
    case 'send_hipaa':
      return 'signatures?doc=hipaa_authorization'
    case 'collect_police':
    case 'open_evidence':
      return 'evidence'
    case 'collect_medical_records':
      return 'evidence?uploadCategory=medical_records'
    case 'collect_bills':
      return 'evidence?uploadCategory=bills'
    case 'open_insurance':
      return 'insurance'
    case 'open_overview':
      return 'overview'
    case 'open_client_info':
      return 'client-info'
    case 'open_medical':
      return 'medical'
    case 'open_liability':
      return 'liability'
    case 'open_damages':
      return 'damages'
    case 'open_demand':
      return 'demand'
    case 'open_negotiation':
      return 'negotiation'
    case 'open_settlement':
      return 'settlement'
    case 'open_workflow':
      return 'workflow'
    default:
      return null
  }
}
