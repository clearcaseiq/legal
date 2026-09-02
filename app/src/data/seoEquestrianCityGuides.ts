import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, equestrian / horseback-riding injury practice area:
 * location-specific guides for Los Angeles, San Diego, Temecula, and Sacramento.
 *
 * This is distinct from the off-road-vehicle and general-recreation hubs: it
 * centers on primary assumption of risk for equine activities (California has no
 * blanket equine-immunity statute, so the common-law doctrine controls), the
 * narrow ways a stable or trail operator can still be liable, defective tack, and
 * the limits of waivers \u2014 including for minors.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: established equestrian communities such as Burbank, Griffith
 *    Park stables, and Hidden Hills.
 *  - San Diego: backcountry trail rides and the Del Mar / North County horse
 *    culture.
 *  - Temecula: wine-country guided trail rides for tourists.
 *  - Sacramento: rural and suburban stables and boarding facilities.
 *
 * Applied accurately:
 *  - Primary assumption of risk covers the inherent risks of horseback riding \u2014
 *    a horse\u2019s propensity to move suddenly, spook, or behave unpredictably \u2014 so an
 *    operator generally is not liable for an injury caused by those inherent
 *    risks alone. California has no blanket equine-immunity statute, so the
 *    common-law doctrine controls rather than a special statute.
 *  - A stable, riding school, or trail operator can still be liable when it
 *    unreasonably increases the risk: providing an unsuitable or known-dangerous
 *    horse, mismatching a horse to a rider\u2019s skill, supplying faulty tack,
 *    failing to give adequate instruction, or failing to warn of a specific known
 *    danger.
 *  - Defective tack \u2014 a saddle, stirrup, cinch, or girth that fails \u2014 can support
 *    a strict product-liability claim against the manufacturer, separate from the
 *    operator\u2019s conduct.
 *  - A liability waiver can bar an ordinary-negligence claim but cannot release
 *    gross negligence (City of Santa Barbara v. Superior Court), and a waiver a
 *    parent signs for a child is generally unenforceable as to the minor\u2019s own
 *    claim.
 *  - The evidence is time-sensitive: the horse\u2019s history and temperament records,
 *    the tack involved, the operator\u2019s records and any incident report, witness
 *    information, and how the rider was matched and instructed should be gathered
 *    quickly. A personal-injury deadline is generally two years (Code of Civil
 *    Procedure section 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a risk was inherent, whether an operator increased it, whether a waiver applies, and which deadline governs depend on facts a licensed California attorney should review promptly.'

const ASSUMPTION_RISK =
  'Primary assumption of risk covers the inherent risks of horseback riding \u2014 a horse\u2019s natural propensity to move suddenly, spook, or behave unpredictably \u2014 so a stable or operator generally is not liable for an injury caused by those inherent risks alone. California has no blanket equine-immunity statute, so the common-law doctrine, not a special statute, controls the analysis.'

const OPERATOR =
  'A stable, riding school, or trail operator can still be liable when it unreasonably increases the risk beyond what is inherent: providing an unsuitable or known-dangerous horse, mismatching a horse to a rider\u2019s skill or size, supplying faulty tack, giving inadequate instruction, or failing to warn of a specific known danger. That conduct falls outside the protected inherent risks.'

const TACK =
  'Defective tack can add a separate claim. A saddle, stirrup, cinch, or girth that fails and causes a fall can support a strict product-liability claim against the manufacturer and sellers, independent of the operator\u2019s conduct \u2014 which is why the tack involved should be preserved.'

const WAIVER =
  'Guided rides and riding lessons almost always include a liability waiver. In California a waiver can bar an ordinary-negligence claim, but it cannot release gross negligence (City of Santa Barbara v. Superior Court), and a waiver a parent signs on a child\u2019s behalf is generally unenforceable as to the minor\u2019s own injury claim.'

const EVIDENCE =
  'Equestrian evidence is time-sensitive: the horse\u2019s history and temperament records, the tack involved, the operator\u2019s records and any incident report, witness information, and how the rider was matched to the horse and instructed should be gathered quickly before records and memories fade. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1).'

export const LA_EQ_SLUG = '/los-angeles-horseback-riding-injury-claim'
export const SD_EQ_SLUG = '/san-diego-horseback-riding-injury-claim'
export const TEMECULA_EQ_SLUG = '/temecula-horseback-riding-injury-claim'
export const SAC_EQ_SLUG = '/sacramento-horseback-riding-injury-claim'

export const equestrianCityGuidePages: LandingPage[] = [
  {
    slug: LA_EQ_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Horseback Riding Injury Claims',
    title: 'Los Angeles Horseback Riding & Stable Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a fall from a horse at an LA stable? Assumption of risk covers inherent dangers \u2014 but not an unsuitable horse, faulty tack, or gross negligence.',
    psychology: 'I was thrown from a horse at an LA stable and they say I assumed the risk.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles horseback riding injury lawyer',
      'horse stable negligence lawsuit california',
      'thrown from rented horse claim california',
      'defective saddle injury california',
      'horse riding waiver still sue california',
    ],
    signals: [
      'Assumption of risk covers inherent dangers',
      'Operator liable if it increases the risk',
      'Defective tack product claims',
      'Waivers do not bar gross negligence',
      'Minors protected from waivers',
      'Preserve the horse history and tack',
    ],
    sections: {
      whyItMatters: `Los Angeles has established equestrian communities \u2014 Burbank, the Griffith Park stables, Hidden Hills \u2014 where lesson barns and rental strings put many novice riders on horses, and matching and tack decisions can increase the risk beyond the sport\u2019s inherent dangers. ${ASSUMPTION_RISK} ${OPERATOR} ${TACK} ${WAIVER} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'How the injury happened and what the horse did',
        'Whether the horse was suitable for your skill',
        'The horse\u2019s history and any known behavior',
        'The tack involved and whether anything failed',
        'What instruction and matching the operator provided',
        'Any incident report and witness information',
        'Whether the rider was a minor',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an LA rider separate an inherent-risk fall from operator negligence, preserve the horse\u2019s history and the tack, and evaluate whether the conduct rises to gross negligence beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The stable says I assumed the risk. Is that the end?',
        a: 'Not always. Assumption of risk covers the inherent risks of riding, but a stable can still be liable when it unreasonably increases the risk \u2014 an unsuitable or known-dangerous horse, a bad skill match, faulty tack, or inadequate instruction.',
      },
      {
        q: 'My saddle or stirrup failed. Is that different?',
        a: 'Yes. Defective tack can support a strict product-liability claim against the manufacturer, separate from the operator\u2019s conduct, so the tack should be preserved for inspection.',
      },
      {
        q: 'Does the waiver I signed block everything?',
        a: 'No. A waiver can bar ordinary negligence, but it cannot release gross negligence (City of Santa Barbara v. Superior Court), and a waiver a parent signs for a child is generally unenforceable as to the minor\u2019s own claim.',
      },
      {
        q: 'How do I show the horse was unsuitable?',
        a: 'Through the horse\u2019s history and temperament records, prior incidents, and how the operator matched and instructed you \u2014 which is why those records should be gathered quickly.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_EQ_SLUG,
    category: 'Cities',
    cluster: 'San Diego Horseback Riding Injury Claims',
    title: 'San Diego Horseback Riding & Trail Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a San Diego trail ride or at a stable? Assumption of risk covers inherent dangers \u2014 but not an unsuitable horse, faulty tack, or gross negligence.',
    psychology: 'I was hurt on a backcountry trail ride near San Diego when my horse bolted.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego horseback riding injury lawyer',
      'trail ride accident claim california',
      'horse stable negligence lawsuit california',
      'defective saddle injury california',
      'horse riding waiver still sue california',
    ],
    signals: [
      'Assumption of risk covers inherent dangers',
      'Operator liable if it increases the risk',
      'Defective tack product claims',
      'Waivers do not bar gross negligence',
      'Minors protected from waivers',
      'Preserve the horse history and tack',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s backcountry trail rides and North County horse culture put visitors on unfamiliar horses in demanding terrain, where an operator\u2019s choice of horse, route, and instruction can increase the risk beyond the sport\u2019s inherent dangers. ${ASSUMPTION_RISK} ${OPERATOR} ${TACK} ${WAIVER} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'How the injury happened and what the horse did',
        'Whether the horse and route suited your skill',
        'The horse\u2019s history and any known behavior',
        'The tack involved and whether anything failed',
        'What instruction and matching the operator provided',
        'Any incident report and witness information',
        'Whether the rider was a minor',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Diego rider document an unsuitable horse or route, preserve the horse\u2019s history and the tack, and evaluate whether the conduct rises to gross negligence beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My horse bolted on a trail ride. Can the operator be liable?',
        a: 'Possibly. If the operator provided a known-difficult horse, mismatched it to your skill, chose an unsafe route, or gave inadequate instruction, that can increase the risk beyond the inherent dangers and fall outside assumption of risk.',
      },
      {
        q: 'What if I am visiting from out of state?',
        a: 'A claim over an injury at a California trail operation is generally brought in California regardless of where you live, and the operator\u2019s duty applies the same way.',
      },
      {
        q: 'Does the waiver end my claim?',
        a: 'No. A waiver can bar ordinary negligence but not gross negligence (City of Santa Barbara v. Superior Court), and a parent\u2019s waiver is generally unenforceable as to a child\u2019s own claim.',
      },
      {
        q: 'What if the tack failed?',
        a: 'Defective tack can support a product-liability claim against the manufacturer, separate from the operator, so it should be preserved for inspection.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: TEMECULA_EQ_SLUG,
    category: 'Cities',
    cluster: 'Temecula Horseback Riding Injury Claims',
    title: 'Temecula Wine-Country Trail Ride Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Temecula wine-country trail ride? Assumption of risk covers inherent dangers \u2014 but not an unsuitable horse, faulty tack, or gross negligence.',
    psychology: 'I booked a Temecula trail ride as a tourist and was thrown from a horse I could not handle.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'temecula horseback riding injury lawyer',
      'wine country trail ride accident california',
      'tourist horse ride injury claim california',
      'horse stable negligence lawsuit california',
      'horse riding waiver still sue california',
    ],
    signals: [
      'Assumption of risk covers inherent dangers',
      'Operator liable if it increases the risk',
      'Defective tack product claims',
      'Waivers do not bar gross negligence',
      'Minors protected from waivers',
      'Preserve the horse history and tack',
    ],
    sections: {
      whyItMatters: `Temecula\u2019s wine country runs guided trail rides marketed to tourists with little or no riding experience, exactly the setting where putting an inexperienced rider on an unsuitable horse with minimal instruction can increase the risk beyond the sport\u2019s inherent dangers. ${ASSUMPTION_RISK} ${OPERATOR} ${TACK} ${WAIVER} ${EVIDENCE} Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'How the injury happened and what the horse did',
        'Whether you were an inexperienced rider',
        'What the operator asked about your experience',
        'The horse\u2019s history and any known behavior',
        'The tack involved and whether anything failed',
        'What instruction the operator provided',
        'Any incident report and witness information',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Temecula trail-ride guest show whether the operator assessed experience and matched the horse appropriately, preserve the horse\u2019s history and the tack, and evaluate gross negligence beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I had never really ridden before and was put on a hard horse. Is that a claim?',
        a: 'It can be. Failing to assess a rider\u2019s experience and matching an inexperienced tourist to an unsuitable horse with minimal instruction can increase the risk beyond the inherent dangers, which may fall outside assumption of risk.',
      },
      {
        q: 'The tour had me sign a waiver. Does that end it?',
        a: 'No. A waiver can bar ordinary negligence but not gross negligence (City of Santa Barbara v. Superior Court), and a parent\u2019s waiver is generally unenforceable as to a child\u2019s own claim.',
      },
      {
        q: 'What increases the risk beyond inherent?',
        a: 'An unsuitable or known-dangerous horse, a poor skill match, faulty tack, inadequate instruction, or failing to warn of a specific known danger.',
      },
      {
        q: 'What should I preserve?',
        a: 'The horse\u2019s history and temperament records, the tack, the operator\u2019s records and any incident report, and witness information \u2014 gathered quickly.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_EQ_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Horseback Riding Injury Claims',
    title: 'Sacramento Horseback Riding & Boarding Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Sacramento-area stable or lesson barn? Assumption of risk covers inherent dangers \u2014 but not an unsuitable horse, faulty tack, or gross negligence.',
    psychology: 'I was injured at a lesson barn near Sacramento and think the horse was known to be dangerous.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento horseback riding injury lawyer',
      'lesson barn negligence lawsuit california',
      'boarding stable injury claim california',
      'known dangerous horse injury california',
      'horse riding waiver still sue california',
    ],
    signals: [
      'Assumption of risk covers inherent dangers',
      'Operator liable if it increases the risk',
      'Defective tack product claims',
      'Waivers do not bar gross negligence',
      'Minors protected from waivers',
      'Preserve the horse history and tack',
    ],
    sections: {
      whyItMatters: `The Sacramento area\u2019s rural and suburban stables, lesson barns, and boarding facilities serve many regular riders and students, and a known-dangerous horse kept in a lesson string or a failure to warn can push an injury beyond the sport\u2019s inherent risks. ${ASSUMPTION_RISK} ${OPERATOR} ${TACK} ${WAIVER} ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'How the injury happened and what the horse did',
        'Whether the horse had a history of dangerous behavior',
        'Whether the operator warned of that history',
        'The tack involved and whether anything failed',
        'What instruction and matching the operator provided',
        'Any incident report and witness information',
        'Whether the rider was a minor student',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Sacramento-area rider establish a horse\u2019s known-dangerous history and any failure to warn, preserve the tack, and evaluate whether the conduct rises to gross negligence beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The horse had hurt people before. Does that matter?',
        a: 'Yes. Keeping a known-dangerous horse in a lesson or rental string, or failing to warn of that specific danger, can increase the risk beyond the inherent dangers of riding, which may fall outside assumption of risk.',
      },
      {
        q: 'My child was hurt in a lesson. Does the waiver stop that?',
        a: 'Generally not. A waiver a parent signs for a child is usually unenforceable as to the minor\u2019s own injury claim, and children receive heightened protection.',
      },
      {
        q: 'Does assumption of risk block my claim?',
        a: 'Not necessarily. It covers the inherent risks of riding, but not an operator\u2019s conduct that unreasonably increases the risk, such as a known-dangerous horse or faulty tack.',
      },
      {
        q: 'What should I preserve?',
        a: 'The horse\u2019s history and temperament records, the tack, the operator\u2019s records and any incident report, and witness information \u2014 gathered quickly.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const equestrianCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_EQ_SLUG]: {
    scenario: `An LA novice was put on a horse known to buck and given almost no instruction. The horse\u2019s history and the thin matching record pushed the fall beyond the inherent risks and past the waiver. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; note the horse and instruction.'],
      ['Preserve', 'Demand the horse history and incident report.'],
      ['Assess', 'Separate inherent risk from operator negligence.'],
      ['Longer term', 'Increased-risk theory developed.'],
    ],
    severityLadder: [
      ['Inherent', 'A horse\u2019s unpredictability is assumed.'],
      ['Unsuitable horse', 'A bad match is not inherent.'],
      ['Tack defect', 'A failed saddle adds a product claim.'],
      ['Waiver limit', 'Gross negligence is not barred.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Fall-from-horse injuries are severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and head injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the horse was unsuitable or known-dangerous',
      'Whether instruction and matching were adequate',
      'Whether tack failed',
      'Whether the horse history was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'History matters', copy: 'A known-bad horse supports the claim.' },
      { label: 'Matching counts', copy: 'Novices need suitable horses.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve the tack', copy: 'It can anchor a product claim.' },
    ],
    insuranceProblems: [
      'Assumption of risk is asserted for a known-bad horse.',
      'The horse history and records are never obtained.',
      'The tack is not preserved.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did the horse do?' },
      { label: 'Step 2', question: 'Were you matched and instructed properly?' },
      { label: 'Step 3', question: 'Did any tack fail?' },
      { label: 'Step 4', question: 'Did you sign a waiver, and who was riding?' },
    ],
  },
  [SD_EQ_SLUG]: {
    scenario: `A San Diego trail operator sent a first-time rider on a difficult horse down a steep backcountry route. The mismatch and route choice supported a claim beyond the inherent risks. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; note the horse and route.'],
      ['Preserve', 'Demand the horse history and incident report.'],
      ['Assess', 'Separate inherent risk from operator negligence.'],
      ['Longer term', 'Increased-risk theory developed.'],
    ],
    severityLadder: [
      ['Inherent', 'A horse\u2019s unpredictability is assumed.'],
      ['Route & match', 'Unsafe choices are not inherent.'],
      ['Tack defect', 'A failed saddle adds a product claim.'],
      ['Waiver limit', 'Gross negligence is not barred.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Fall-from-horse injuries are severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and head injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the horse and route suited the rider',
      'Whether instruction was adequate',
      'Whether tack failed',
      'Whether the horse history was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Route choice counts', copy: 'Unsafe routes increase risk.' },
      { label: 'Matching matters', copy: 'Novices need suitable horses.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve the tack', copy: 'It can anchor a product claim.' },
    ],
    insuranceProblems: [
      'Assumption of risk is asserted for a bad match.',
      'The horse history and records are never obtained.',
      'The tack is not preserved.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did the horse do, and where?' },
      { label: 'Step 2', question: 'Were the horse and route suitable?' },
      { label: 'Step 3', question: 'Did any tack fail?' },
      { label: 'Step 4', question: 'What instruction were you given?' },
    ],
  },
  [TEMECULA_EQ_SLUG]: {
    scenario: `A Temecula wine-country tour never asked about riding experience and put a beginner on a hot horse. The lack of any experience assessment supported a claim beyond the inherent risks. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; note what you were asked.'],
      ['Preserve', 'Demand the horse history and incident report.'],
      ['Assess', 'Separate inherent risk from operator negligence.'],
      ['Longer term', 'Increased-risk theory developed.'],
    ],
    severityLadder: [
      ['Inherent', 'A horse\u2019s unpredictability is assumed.'],
      ['No assessment', 'Ignoring experience increases risk.'],
      ['Tack defect', 'A failed saddle adds a product claim.'],
      ['Waiver limit', 'Gross negligence is not barred.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Fall-from-horse injuries are severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and head injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether experience was assessed at all',
      'Whether the horse suited a beginner',
      'Whether instruction was adequate',
      'Whether the horse history was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Assess experience', copy: 'Tours must gauge skill.' },
      { label: 'Beginner horses', copy: 'Novices need calm mounts.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve the tack', copy: 'It can anchor a product claim.' },
    ],
    insuranceProblems: [
      'The tour never assessed the rider\u2019s experience.',
      'The horse history and records are never obtained.',
      'The tack is not preserved.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the tour ask about your experience?' },
      { label: 'Step 2', question: 'Was the horse suitable for a beginner?' },
      { label: 'Step 3', question: 'What instruction were you given?' },
      { label: 'Step 4', question: 'Did you sign a waiver, and who was riding?' },
    ],
  },
  [SAC_EQ_SLUG]: {
    scenario: `A Sacramento-area lesson barn kept a horse known to bite and kick in its student string and never warned a new student. The documented history and failure to warn anchored the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; note any warning given.'],
      ['Preserve', 'Demand the horse history and incident report.'],
      ['Assess', 'Separate inherent risk from operator negligence.'],
      ['Longer term', 'Failure-to-warn theory developed.'],
    ],
    severityLadder: [
      ['Inherent', 'A horse\u2019s unpredictability is assumed.'],
      ['Known danger', 'A dangerous horse is not inherent.'],
      ['Failure to warn', 'It increases the risk.'],
      ['Waiver limit', 'Gross negligence is not barred.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Fall and bite injuries are severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and head injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the horse had a dangerous history',
      'Whether the operator warned of it',
      'Whether a minor student was involved',
      'Whether the horse history was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'History is key', copy: 'Prior incidents show danger.' },
      { label: 'Duty to warn', copy: 'Known dangers must be disclosed.' },
      { label: 'Minors protected', copy: 'A parent\u2019s waiver is limited.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
    ],
    insuranceProblems: [
      'The horse\u2019s prior incidents are never obtained.',
      'Assumption of risk is asserted for a known-bad horse.',
      'A minor\u2019s protected status is ignored.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the horse have a dangerous history?' },
      { label: 'Step 2', question: 'Were you warned of it?' },
      { label: 'Step 3', question: 'Was the rider a minor student?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
}
