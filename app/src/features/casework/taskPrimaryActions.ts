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
  | 'open_deadlines'
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
}

/**
 * Longer “what does this task mean?” copy for hover tooltips on the task title.
 * Prefer this over stuffing the Action-button hint.
 */
export function resolveTaskHelpTooltip(task: TaskLike): string | null {
  const title = String(task.title || '')
  if (!title.trim()) return null

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
    return 'Filing deadline calendared from the incident date, venue, and claim type. Review it on Deadlines and keep monitoring until the case is filed or closed.'
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
      kind: 'open_deadlines',
      label: 'Review',
      doneLabel: 'View',
      hint: 'Open Deadlines to review the statute of limitations / filing deadline',
      doneHint: 'Open Deadlines to review this deadline',
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
    /insurance|adjuster|coverage|carrier|claim\b|um\/uim|medpay|\bpip\b|policy|lien|subrogation/i.test(hay)
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
    /retainer|hipaa|authorization|letter of representation|\blor\b|welcome packet|e-?sign|signature/i.test(
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

  if (type === 'client' || /contact the client|client follow|verify client|scope of representation/i.test(hay)) {
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
      label: 'Open',
      doneLabel: 'View',
      hint: 'Open Signatures (HIPAA first) to send provider letters of representation',
      doneHint: 'Open Signatures for provider LOR / HIPAA',
    }
  }

  if (/^send letter of representation/i.test(title) || /send letter of representation \(lor\)/i.test(title)) {
    return {
      kind: 'send_lor',
      label: 'Send',
      doneLabel: 'View',
      hint: 'Open Signatures to send a Letter of Representation from firm templates',
      doneHint: 'Open Signatures to review LOR status',
    }
  }

  if (/send client welcome packet/i.test(title) || /welcome packet/i.test(title)) {
    return {
      kind: 'send_welcome',
      label: 'Send',
      doneLabel: 'View',
      hint: 'Open Signatures to send the onboarding / welcome packet',
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
    case 'send_lor':
    case 'open_signatures':
      return 'signatures'
    case 'send_hipaa':
    case 'send_lor_providers':
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
    case 'open_deadlines':
      return 'deadlines'
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
