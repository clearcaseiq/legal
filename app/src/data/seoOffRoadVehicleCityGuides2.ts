import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, off-road / ATV / dirt-bike practice area (batch 2):
 * location-specific guides for Los Angeles, San Diego, Sacramento, and Imperial
 * County (Glamis / Imperial Sand Dunes), extending the batch-1 hub (Bakersfield,
 * San Bernardino, Riverside, Fresno).
 *
 * Applied accurately (identical framework to batch 1):
 *  - Product liability for defective ATVs/dirt bikes (rollover/stability defects).
 *  - Rental/tour-operator negligence (maintenance, instruction, unfit rider).
 *  - Primary assumption of risk limits inherent-risk claims but not conduct that
 *    increases risk, and never gross negligence (City of Santa Barbara).
 *  - Minors: a parent-signed waiver is generally unenforceable as to the child.
 *  - Perishable evidence; 2-year deadline (CCP 335.1), 6-month for public OHV parks.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a machine was defective, whether an operator was negligent, whether a waiver applies, and which deadline governs depend on facts a licensed California attorney should review promptly.'

const PRODUCT =
  'A defective off-road vehicle can support a strict product-liability claim against the manufacturer and the sellers in the chain of distribution. Rollover and stability defects, defective design, and manufacturing flaws are recurring issues in ATVs and dirt bikes, and this claim can stand independent of how the crash occurred.'

const OPERATOR =
  'Rental companies and guided-tour operators owe a duty of care. Negligent maintenance, inadequate instruction, providing an unsafe or ill-fitting machine, or renting to an unqualified rider \u2014 or to a minor \u2014 can create liability separate from any product defect. The rental agreement, maintenance logs, and instruction records are central.'

const ASSUMPTION_RISK =
  'California\u2019s primary-assumption-of-risk doctrine limits recovery for the inherent risks of a hazardous recreational activity like off-roading. It does not, however, excuse conduct that unreasonably increases the risk beyond what is inherent, and it does not cover gross negligence \u2014 a liability waiver cannot bar a gross-negligence claim (City of Santa Barbara v. Superior Court).'

const MINORS =
  'Minors receive heightened protection. A liability waiver a parent signs on a child\u2019s behalf is generally unenforceable as to the minor\u2019s own injury claim, so a signed rental or park waiver often does not end a child\u2019s case the way an operator may assume.'

const EVIDENCE =
  'Off-road evidence is perishable and should be preserved quickly: the vehicle itself for defect inspection, maintenance and rental records, photographs of the scene and trail conditions, and the condition of any helmet or safety gear. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1), but a claim against a public entity that operates an OHV park can require a six-month government claim (Government Code section 911.2).'

export const LA_OHV_SLUG = '/los-angeles-atv-off-road-accident-claim'
export const SD_OHV_SLUG = '/san-diego-atv-off-road-accident-claim'
export const SAC_OHV_SLUG = '/sacramento-atv-off-road-accident-claim'
export const IMPERIAL_OHV_SLUG = '/imperial-county-atv-off-road-accident-claim'

export const offRoadVehicleCityGuidePages2: LandingPage[] = [
  {
    slug: LA_OHV_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles ATV & Off-Road Accident Claims',
    title: 'Los Angeles ATV & Off-Road Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in an ATV, UTV, or dirt-bike crash near Los Angeles? A defective machine, a rental or tour operator, or another rider may be responsible \u2014 and a signed waiver rarely ends a child\u2019s case.',
    psychology: 'I was hurt off-roading near LA and the rental company says I signed a waiver.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles atv accident lawyer',
      'dirt bike crash injury claim california',
      'atv rollover defect lawsuit california',
      'off road rental waiver enforceable california',
      'child atv injury waiver california',
    ],
    signals: [
      'Product-liability path',
      'Rental / tour-operator duty',
      'Assumption of risk limits',
      'Gross negligence not waivable',
      'Minor\u2019s waiver unenforceable',
      'Perishable machine evidence',
    ],
    sections: {
      whyItMatters: `Riders from Los Angeles use nearby OHV areas such as Hungry Valley and the high-desert trails, and crashes involving rollovers, rented machines, and defective vehicles are common. ${PRODUCT} ${OPERATOR} ${ASSUMPTION_RISK} ${MINORS} ${EVIDENCE} ${NOT_ADVICE}`,
      whatToTrack: [
        'The vehicle itself (preserve for defect inspection)',
        'Whether a rollover or stability defect is suspected',
        'Any rental or tour operator and its records',
        'The maintenance logs and instruction given',
        'Whether a minor was injured',
        'Whether a public OHV park is involved (six-month claim)',
        'Photographs of the scene and safety gear',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the machine for defect inspection, pursues a rental or tour operator for negligent maintenance or instruction, and evaluates whether a waiver actually holds \u2014 especially for a minor or a gross-negligence claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Is my claim over?',
        a: 'Not necessarily. A waiver cannot bar a gross-negligence claim (City of Santa Barbara), and a parent-signed waiver is generally unenforceable as to a minor\u2019s own injury claim.',
      },
      {
        q: 'The ATV rolled over. Can that be a defect?',
        a: 'Yes. Rollover and stability defects are recurring issues in ATVs and dirt bikes and can support a strict product-liability claim against the manufacturer and sellers, independent of how the crash occurred.',
      },
      {
        q: 'Can I sue the rental or tour company?',
        a: 'Often yes. Negligent maintenance, inadequate instruction, an unsafe or ill-fitting machine, or renting to an unqualified rider can create liability separate from any defect.',
      },
      {
        q: 'How long do I have?',
        a: 'Generally two years (Code of Civil Procedure 335.1), but a claim against a public entity that operates an OHV park can require a six-month government claim (Government Code 911.2).',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the machine and rental evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_OHV_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego ATV & Off-Road Accident Claims',
    title: 'San Diego ATV & Off-Road Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in an ATV, UTV, or dirt-bike crash near San Diego? A defective machine, a rental or tour operator, or another rider may be responsible \u2014 and a signed waiver rarely ends a child\u2019s case.',
    psychology: 'I was hurt off-roading near San Diego and the rental company says I signed a waiver.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego atv accident lawyer',
      'dirt bike crash injury claim california',
      'atv rollover defect lawsuit california',
      'off road rental waiver enforceable california',
      'child atv injury waiver california',
    ],
    signals: [
      'Product-liability path',
      'Rental / tour-operator duty',
      'Assumption of risk limits',
      'Gross negligence not waivable',
      'Minor\u2019s waiver unenforceable',
      'Perishable machine evidence',
    ],
    sections: {
      whyItMatters: `San Diego riders use Ocotillo Wells SVRA and East County desert trails, where rollovers, rented-machine crashes, and defective vehicles produce serious injuries. ${PRODUCT} ${OPERATOR} ${ASSUMPTION_RISK} ${MINORS} ${EVIDENCE} ${NOT_ADVICE}`,
      whatToTrack: [
        'The vehicle itself (preserve for defect inspection)',
        'Whether a rollover or stability defect is suspected',
        'Any rental or tour operator and its records',
        'The maintenance logs and instruction given',
        'Whether a minor was injured',
        'Whether a public OHV park is involved (six-month claim)',
        'Photographs of the scene and safety gear',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the machine for defect inspection, pursues a rental or tour operator for negligent maintenance or instruction, and evaluates whether a waiver actually holds \u2014 especially for a minor or a gross-negligence claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Is my claim over?',
        a: 'Not necessarily. A waiver cannot bar a gross-negligence claim (City of Santa Barbara), and a parent-signed waiver is generally unenforceable as to a minor\u2019s own injury claim.',
      },
      {
        q: 'The ATV rolled over. Can that be a defect?',
        a: 'Yes. Rollover and stability defects can support a strict product-liability claim against the manufacturer and sellers, independent of how the crash occurred.',
      },
      {
        q: 'Can I sue the rental or tour company?',
        a: 'Often yes. Negligent maintenance, inadequate instruction, an unsafe or ill-fitting machine, or renting to an unqualified rider can create liability separate from any defect.',
      },
      {
        q: 'A public OHV park is involved. Does that change the deadline?',
        a: 'Yes. A claim against a public entity that operates an OHV park can require a six-month government claim (Government Code 911.2) rather than the ordinary two years.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the machine and rental evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_OHV_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento ATV & Off-Road Accident Claims',
    title: 'Sacramento ATV & Off-Road Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in an ATV, UTV, or dirt-bike crash near Sacramento? A defective machine, a rental or tour operator, or another rider may be responsible \u2014 and a signed waiver rarely ends a child\u2019s case.',
    psychology: 'I was hurt off-roading near Sacramento and the rental company says I signed a waiver.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento atv accident lawyer',
      'dirt bike crash injury claim california',
      'atv rollover defect lawsuit california',
      'off road rental waiver enforceable california',
      'child atv injury waiver california',
    ],
    signals: [
      'Product-liability path',
      'Rental / tour-operator duty',
      'Assumption of risk limits',
      'Gross negligence not waivable',
      'Minor\u2019s waiver unenforceable',
      'Perishable machine evidence',
    ],
    sections: {
      whyItMatters: `Sacramento-area riders use Prairie City SVRA and Sierra-foothill trails, where rollovers, rented-machine crashes, and defective vehicles cause serious injuries. ${PRODUCT} ${OPERATOR} ${ASSUMPTION_RISK} ${MINORS} ${EVIDENCE} ${NOT_ADVICE}`,
      whatToTrack: [
        'The vehicle itself (preserve for defect inspection)',
        'Whether a rollover or stability defect is suspected',
        'Any rental or tour operator and its records',
        'The maintenance logs and instruction given',
        'Whether a minor was injured',
        'Whether a public OHV park is involved (six-month claim)',
        'Photographs of the scene and safety gear',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the machine for defect inspection, pursues a rental or tour operator for negligent maintenance or instruction, and evaluates whether a waiver actually holds \u2014 especially for a minor or a gross-negligence claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Is my claim over?',
        a: 'Not necessarily. A waiver cannot bar a gross-negligence claim (City of Santa Barbara), and a parent-signed waiver is generally unenforceable as to a minor\u2019s own injury claim.',
      },
      {
        q: 'The ATV rolled over. Can that be a defect?',
        a: 'Yes. Rollover and stability defects can support a strict product-liability claim against the manufacturer and sellers, independent of how the crash occurred.',
      },
      {
        q: 'Can I sue the rental or tour company?',
        a: 'Often yes. Negligent maintenance, inadequate instruction, an unsafe or ill-fitting machine, or renting to an unqualified rider can create liability separate from any defect.',
      },
      {
        q: 'A public OHV park is involved. Does that change the deadline?',
        a: 'Yes. A claim against a public entity that operates an OHV park can require a six-month government claim (Government Code 911.2) rather than the ordinary two years.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the machine and rental evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: IMPERIAL_OHV_SLUG,
    category: 'Attorney Intent',
    cluster: 'Imperial Sand Dunes (Glamis) ATV & Off-Road Accident Claims',
    title: 'Imperial Sand Dunes (Glamis) ATV & Off-Road Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a dune-buggy, UTV, or ATV crash at the Imperial Sand Dunes (Glamis)? A defective machine, a rental or tour operator, or another rider may be responsible \u2014 and a signed waiver rarely ends a child\u2019s case.',
    psychology: 'I was hurt riding the dunes at Glamis and do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'glamis dune accident lawyer',
      'imperial sand dunes utv crash claim california',
      'dune buggy rollover defect lawsuit california',
      'off road rental waiver enforceable california',
      'child atv injury waiver california',
    ],
    signals: [
      'Product-liability path',
      'Rental / tour-operator duty',
      'Assumption of risk limits',
      'Gross negligence not waivable',
      'Minor\u2019s waiver unenforceable',
      'Perishable machine evidence',
    ],
    sections: {
      whyItMatters: `The Imperial Sand Dunes Recreation Area (Glamis) is one of the most popular off-road destinations in the country, drawing huge holiday crowds of dune buggies, sand rails, and UTVs \u2014 and producing rollover crashes, rider-versus-rider collisions, and rented-machine failures. ${PRODUCT} ${OPERATOR} ${ASSUMPTION_RISK} ${MINORS} ${EVIDENCE} Civil cases are typically filed in Imperial County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The vehicle itself (preserve for defect inspection)',
        'Whether a rollover or stability defect is suspected',
        'Any rental or tour operator and its records',
        'The maintenance logs and instruction given',
        'Whether another rider caused the collision',
        'Whether a minor was injured',
        'Photographs of the scene and safety gear',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the machine for defect inspection, pursues a rental or tour operator for negligent maintenance or instruction, identifies an at-fault rider, and evaluates whether a waiver actually holds \u2014 especially for a minor or a gross-negligence claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver at the dunes. Is my claim over?',
        a: 'Not necessarily. A waiver cannot bar a gross-negligence claim (City of Santa Barbara), and a parent-signed waiver is generally unenforceable as to a minor\u2019s own injury claim.',
      },
      {
        q: 'A dune buggy rolled over. Can that be a defect?',
        a: 'Yes. Rollover and stability defects are recurring in off-road vehicles and can support a strict product-liability claim against the manufacturer and sellers.',
      },
      {
        q: 'Another rider hit me. Can I claim against them?',
        a: 'Yes. Another rider who caused the collision can be liable for ordinary negligence, separate from any product defect or operator claim.',
      },
      {
        q: 'Can I sue the rental or tour company?',
        a: 'Often yes. Negligent maintenance, inadequate instruction, an unsafe or ill-fitting machine, or renting to an unqualified rider can create liability separate from any defect.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the machine and rental evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const offRoadVehicleCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [LA_OHV_SLUG]: {
    scenario: `A rented ATV rolled over on a high-desert trail used by Los Angeles riders. The preserved machine showed a stability defect, and the rental company\u2019s thin maintenance records supported a second claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the machine and scene.'],
      ['First days', 'Preserve the vehicle; request rental records.'],
      ['First weeks', 'Assess any waiver and defect theory.'],
      ['Longer term', 'Develop product and operator claims.'],
    ],
    severityLadder: [
      ['Product', 'A rollover defect is a product claim.'],
      ['Operator', 'Maintenance and instruction matter.'],
      ['Waiver', 'It can\u2019t bar gross negligence.'],
      ['Minor', 'A parent\u2019s waiver is unenforceable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a defect is shown',
      'Whether the operator was negligent',
      'Whether a waiver holds',
      'Whether a minor was injured',
      'Whether the machine was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Operator', copy: 'A rental company adds coverage.' },
      { label: 'Waiver', copy: 'Gross negligence is never waivable.' },
      { label: 'Minor', copy: 'A child\u2019s claim survives a waiver.' },
    ],
    insuranceProblems: [
      'The machine is returned and the defect is lost.',
      'The claim is dropped over a waiver.',
      'The rental records are never requested.',
      'A public-park deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What machine were you on?' },
      { label: 'Step 2', question: 'Was it rented?' },
      { label: 'Step 3', question: 'Did it roll or malfunction?' },
      { label: 'Step 4', question: 'Was a minor injured?' },
    ],
  },
  [SD_OHV_SLUG]: {
    scenario: `A dirt bike failed at Ocotillo Wells and threw a San Diego rider. The preserved machine and the rental company\u2019s maintenance gaps supported product and operator claims a waiver could not fully bar. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the machine and scene.'],
      ['First days', 'Preserve the vehicle; request rental records.'],
      ['First weeks', 'Assess any waiver and defect theory.'],
      ['Longer term', 'Develop product and operator claims.'],
    ],
    severityLadder: [
      ['Product', 'A failure can be a product claim.'],
      ['Operator', 'Maintenance and instruction matter.'],
      ['Waiver', 'It can\u2019t bar gross negligence.'],
      ['Public park', 'Six-month claim may apply.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a defect or maintenance failure is shown',
      'Whether the operator was negligent',
      'Whether a waiver holds',
      'Whether a public-park deadline applies',
      'Whether the machine was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Operator', copy: 'A rental company adds coverage.' },
      { label: 'Waiver', copy: 'Gross negligence is never waivable.' },
      { label: 'Deadline', copy: 'A public park may shorten it.' },
    ],
    insuranceProblems: [
      'The machine is returned and the defect is lost.',
      'The claim is dropped over a waiver.',
      'The rental records are never requested.',
      'A public-park deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What machine were you on?' },
      { label: 'Step 2', question: 'Was it rented?' },
      { label: 'Step 3', question: 'Did it fail or malfunction?' },
      { label: 'Step 4', question: 'Was a public OHV park involved?' },
    ],
  },
  [SAC_OHV_SLUG]: {
    scenario: `A UTV rolled at Prairie City SVRA, injuring a Sacramento rider. The preserved machine showed a stability defect, and a public-park question set the deadline. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the machine and scene.'],
      ['First days', 'Preserve the vehicle; note the park operator.'],
      ['First weeks', 'Assess any six-month park deadline and defect.'],
      ['Longer term', 'Develop product and operator claims.'],
    ],
    severityLadder: [
      ['Product', 'A rollover defect is a product claim.'],
      ['Operator', 'Maintenance and instruction matter.'],
      ['Public park', 'Six-month claim may apply.'],
      ['Waiver', 'It can\u2019t bar gross negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a defect is shown',
      'Whether the operator was negligent',
      'Whether a public-park deadline applies',
      'Whether a waiver holds',
      'Whether the machine was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Operator', copy: 'A rental company adds coverage.' },
      { label: 'Deadline', copy: 'A public park may shorten it.' },
      { label: 'Waiver', copy: 'Gross negligence is never waivable.' },
    ],
    insuranceProblems: [
      'The machine is returned and the defect is lost.',
      'A public-park deadline is missed.',
      'The rental records are never requested.',
      'The claim is dropped over a waiver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What machine were you on?' },
      { label: 'Step 2', question: 'Was a public OHV park involved?' },
      { label: 'Step 3', question: 'Did it roll or malfunction?' },
      { label: 'Step 4', question: 'When did it happen?' },
    ],
  },
  [IMPERIAL_OHV_SLUG]: {
    scenario: `A sand rail collided with another rider at Glamis over a holiday weekend. Claims ran against the at-fault rider, with a rental-company and defect theory assessed for the preserved machine. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify the other rider and witnesses.'],
      ['First days', 'Preserve the vehicle; request rental records.'],
      ['First weeks', 'Assess rider fault, defect, and any waiver.'],
      ['Longer term', 'Develop rider, product, and operator claims.'],
    ],
    severityLadder: [
      ['Rider', 'Another rider can be negligent.'],
      ['Product', 'A rollover defect is a product claim.'],
      ['Operator', 'Maintenance and instruction matter.'],
      ['Waiver', 'It can\u2019t bar gross negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether another rider was at fault',
      'Whether a defect is shown',
      'Whether the operator was negligent',
      'Whether a waiver holds',
      'Whether the machine was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Rider', copy: 'An at-fault rider adds a defendant.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Operator', copy: 'A rental company adds coverage.' },
      { label: 'Waiver', copy: 'Gross negligence is never waivable.' },
    ],
    insuranceProblems: [
      'The other rider is never identified.',
      'The machine is returned and the defect is lost.',
      'The claim is dropped over a waiver.',
      'Witnesses scatter after the weekend.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did another rider cause it?' },
      { label: 'Step 2', question: 'What machine were you on?' },
      { label: 'Step 3', question: 'Was it rented?' },
      { label: 'Step 4', question: 'Was a minor injured?' },
    ],
  },
}
