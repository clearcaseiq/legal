import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, off-road / ATV / dirt-bike injury practice area: location-specific
 * guides for the Central Valley and Inland Empire regions that border
 * California\u2019s major off-highway-vehicle (OHV) recreation areas \u2014 Bakersfield,
 * San Bernardino, Riverside, and Fresno.
 *
 * This is distinct from an on-road motor-vehicle claim: it centers on product
 * defects in the vehicle itself, the negligence of rental and guided-tour
 * operators, the limits of the primary-assumption-of-risk defense, and the
 * special rules that protect minors from liability waivers.
 *
 * Local context, genuine rather than interpolated:
 *  - Bakersfield: Kern County riders use nearby OHV areas such as Dove Springs
 *    and Jawbone Canyon.
 *  - San Bernardino: the high desert hosts Johnson Valley (home of King of the
 *    Hammers) and Stoddard Valley.
 *  - Riverside: riders reach desert OHV areas and private tracks across the
 *    Inland Empire.
 *  - Fresno: Sierra foothills and valley trails draw ATV and dirt-bike riders.
 *
 * Applied accurately:
 *  - A defective all-terrain vehicle or dirt bike \u2014 a rollover or stability
 *    defect, a design or manufacturing flaw \u2014 can support a strict product-
 *    liability claim against the manufacturer and sellers, independent of how the
 *    accident happened.
 *  - Rental companies and guided-tour operators owe a duty of care: negligent
 *    maintenance, inadequate instruction, providing an unsafe machine, or
 *    renting to an unqualified rider or a minor can create liability.
 *  - Primary assumption of risk limits recovery for the inherent risks of a
 *    hazardous recreational activity, but it does not excuse conduct that
 *    increases the risk beyond what is inherent, and it does not cover gross
 *    negligence; a liability waiver cannot bar a gross-negligence claim (City of
 *    Santa Barbara v. Superior Court).
 *  - A waiver signed by a parent on a child\u2019s behalf is generally unenforceable
 *    as to the minor\u2019s own claim, and children receive heightened protection.
 *  - The evidence is perishable: the vehicle should be preserved, along with
 *    maintenance and rental records, the scene, and any safety-gear condition. A
 *    personal-injury deadline is generally two years (Code of Civil Procedure
 *    section 335.1); claims against a public entity that operates an OHV park can
 *    require a six-month government claim (Government Code section 911.2).
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

export const BAKERSFIELD_OHV_SLUG = '/bakersfield-atv-off-road-accident-claim'
export const SAN_BERNARDINO_OHV_SLUG = '/san-bernardino-atv-off-road-accident-claim'
export const RIVERSIDE_OHV_SLUG = '/riverside-atv-off-road-accident-claim'
export const FRESNO_OHV_SLUG = '/fresno-atv-off-road-accident-claim'

export const offRoadVehicleCityGuidePages: LandingPage[] = [
  {
    slug: BAKERSFIELD_OHV_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield ATV & Off-Road Accident Claims',
    title: 'Bakersfield ATV & Off-Road Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an ATV or dirt bike near Bakersfield? A product defect, a negligent rental operator, or the limits of a waiver can drive the claim.',
    psychology: 'I was badly hurt riding an ATV near Bakersfield and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield atv accident lawyer',
      'dirt bike injury claim california',
      'off road vehicle rollover lawsuit california',
      'atv rental company negligence california',
      'off road waiver enforceable california',
    ],
    signals: [
      'Product defect / rollover claim',
      'Rental & tour operator duty',
      'Assumption-of-risk limits',
      'Waivers do not bar gross negligence',
      'Minors protected from waivers',
      'Preserve the vehicle and records',
    ],
    sections: {
      whyItMatters: `Kern County riders regularly use nearby OHV areas such as Dove Springs and Jawbone Canyon, and a serious off-road crash near Bakersfield often has more than one cause. ${PRODUCT} ${OPERATOR} ${ASSUMPTION_RISK} ${MINORS} ${EVIDENCE} Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'The make, model, and condition of the vehicle',
        'Whether it was rented, guided, or privately owned',
        'Any rental agreement, waiver, or maintenance record',
        'How the crash happened and the trail conditions',
        'Whether a rollover or mechanical failure occurred',
        'The rider\u2019s age and any safety gear worn',
        'Whether a public entity operates the OHV area',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Bakersfield rider preserve the vehicle for a defect inspection, gather the rental and maintenance records, and evaluate whether a waiver or assumption-of-risk defense actually applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver at the rental place. Is my case over?',
        a: 'Not necessarily. A liability waiver cannot bar a gross-negligence claim (City of Santa Barbara v. Superior Court), and a waiver a parent signs for a child is generally unenforceable as to the minor\u2019s own claim. A product-defect claim against the manufacturer is also separate from any waiver.',
      },
      {
        q: 'What if the ATV rolled over on flat ground?',
        a: 'A rollover or stability problem can point to a design or manufacturing defect. A defective off-road vehicle can support a strict product-liability claim against the manufacturer and sellers, independent of how the crash happened, so the vehicle should be preserved for inspection.',
      },
      {
        q: 'Can I sue the rental company?',
        a: 'Possibly. Rental and tour operators owe a duty of care, and negligent maintenance, inadequate instruction, an unsafe machine, or renting to an unqualified or underage rider can create liability. The rental agreement and maintenance logs matter.',
      },
      {
        q: 'Does assumption of risk end my claim?',
        a: 'Not automatically. It limits recovery for the inherent risks of off-roading, but it does not excuse conduct that increases the risk beyond what is inherent, and it does not cover gross negligence.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the vehicle, records, and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAN_BERNARDINO_OHV_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino ATV & Off-Road Accident Claims',
    title: 'San Bernardino ATV & Off-Road Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt off-roading in the San Bernardino high desert? A product defect, a negligent operator, or the limits of a waiver can drive the claim.',
    psychology: 'I crashed my dirt bike in the high desert near San Bernardino and my injuries are serious.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino atv accident lawyer',
      'dirt bike injury claim california',
      'johnson valley off road accident california',
      'atv rental company negligence california',
      'off road waiver enforceable california',
    ],
    signals: [
      'Product defect / rollover claim',
      'Rental & tour operator duty',
      'Assumption-of-risk limits',
      'Waivers do not bar gross negligence',
      'Minors protected from waivers',
      'Preserve the vehicle and records',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s high desert hosts major OHV destinations \u2014 Johnson Valley, home of King of the Hammers, and Stoddard Valley \u2014 that draw heavy weekend traffic and serious crashes. ${PRODUCT} ${OPERATOR} ${ASSUMPTION_RISK} ${MINORS} ${EVIDENCE} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'The make, model, and condition of the vehicle',
        'Whether it was rented, guided, or privately owned',
        'Any rental agreement, waiver, or maintenance record',
        'How the crash happened and the terrain involved',
        'Whether a rollover or mechanical failure occurred',
        'The rider\u2019s age and any safety gear worn',
        'Whether a public entity manages the OHV land',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Bernardino rider preserve the vehicle for a defect inspection, gather the operator and maintenance records, and evaluate whether a waiver or assumption-of-risk defense actually applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was on a guided tour when I got hurt. Can I have a claim?',
        a: 'Possibly. Guided-tour operators owe a duty of care, and inadequate instruction, an unsafe machine, negligent route choices, or poor maintenance can create liability. A signed waiver does not bar a gross-negligence claim.',
      },
      {
        q: 'What if the machine failed mechanically?',
        a: 'A mechanical failure or rollover can point to a product defect or negligent maintenance. A defective off-road vehicle can support a strict product-liability claim against the manufacturer and sellers, so the vehicle should be preserved for inspection.',
      },
      {
        q: 'Does off-roading being risky end my claim?',
        a: 'No. Primary assumption of risk limits recovery for the inherent risks of the activity, but it does not excuse conduct that increases the risk beyond what is inherent, and it does not cover gross negligence.',
      },
      {
        q: 'My teenager was hurt on a rented ATV. Does the waiver stop that claim?',
        a: 'Generally not. A waiver a parent signs on a child\u2019s behalf is usually unenforceable as to the minor\u2019s own injury claim, and children receive heightened protection.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the vehicle, records, and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIVERSIDE_OHV_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside ATV & Off-Road Accident Claims',
    title: 'Riverside ATV & Off-Road Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an ATV or dirt bike in the Riverside area? A product defect, a negligent rental operator, or the limits of a waiver can drive the claim.',
    psychology: 'I was hurt riding off-road in the Inland Empire and the rental company is blaming me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside atv accident lawyer',
      'dirt bike injury claim california',
      'off road vehicle rollover lawsuit california',
      'inland empire atv rental negligence california',
      'off road waiver enforceable california',
    ],
    signals: [
      'Product defect / rollover claim',
      'Rental & tour operator duty',
      'Assumption-of-risk limits',
      'Waivers do not bar gross negligence',
      'Minors protected from waivers',
      'Preserve the vehicle and records',
    ],
    sections: {
      whyItMatters: `Riverside-area riders reach desert OHV areas and private tracks across the Inland Empire, and when a rental company blames the rider, the maintenance and instruction records often tell a different story. ${PRODUCT} ${OPERATOR} ${ASSUMPTION_RISK} ${MINORS} ${EVIDENCE} Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'The make, model, and condition of the vehicle',
        'Whether it was rented, guided, or privately owned',
        'Any rental agreement, waiver, or maintenance record',
        'What instruction, if any, the operator provided',
        'Whether a rollover or mechanical failure occurred',
        'The rider\u2019s age and any safety gear worn',
        'The location and any track or landowner involved',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Riverside rider counter a blame-the-rider narrative by preserving the vehicle, gathering the maintenance and instruction records, and evaluating whether a waiver or assumption-of-risk defense actually applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The rental company says the crash was my fault. Is that the end?',
        a: 'Not necessarily. The maintenance and instruction records often reveal negligent upkeep or inadequate training, and a product defect claim against the manufacturer is separate. A waiver cannot bar a gross-negligence claim.',
      },
      {
        q: 'What if the ATV rolled over?',
        a: 'A rollover can point to a design or stability defect. A defective off-road vehicle can support a strict product-liability claim against the manufacturer and sellers, independent of how the crash happened, so preserve the vehicle for inspection.',
      },
      {
        q: 'Does assumption of risk bar my claim?',
        a: 'Not automatically. It limits recovery for the inherent risks of off-roading, but it does not excuse conduct that increases the risk beyond what is inherent, and it does not cover gross negligence.',
      },
      {
        q: 'Are minors treated differently?',
        a: 'Yes. A waiver a parent signs on a child\u2019s behalf is generally unenforceable as to the minor\u2019s own injury claim, and children receive heightened protection.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the vehicle, records, and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_OHV_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno ATV & Off-Road Accident Claims',
    title: 'Fresno ATV & Off-Road Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an ATV or dirt bike near Fresno? A product defect, a negligent operator, or the limits of a waiver can drive the claim.',
    psychology: 'I was injured on a trail near Fresno and I am not sure whether I can bring a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno atv accident lawyer',
      'dirt bike injury claim california',
      'off road vehicle rollover lawsuit california',
      'atv rental company negligence california',
      'off road waiver enforceable california',
    ],
    signals: [
      'Product defect / rollover claim',
      'Rental & tour operator duty',
      'Assumption-of-risk limits',
      'Waivers do not bar gross negligence',
      'Minors protected from waivers',
      'Preserve the vehicle and records',
    ],
    sections: {
      whyItMatters: `Fresno riders reach Sierra foothills and valley trails for ATV and dirt-bike recreation, and a serious crash there can involve a defective machine, a negligent operator, or a hazardous condition that goes beyond the inherent risks of the sport. ${PRODUCT} ${OPERATOR} ${ASSUMPTION_RISK} ${MINORS} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The make, model, and condition of the vehicle',
        'Whether it was rented, guided, or privately owned',
        'Any rental agreement, waiver, or maintenance record',
        'How the crash happened and the trail conditions',
        'Whether a rollover or mechanical failure occurred',
        'The rider\u2019s age and any safety gear worn',
        'Whether a public entity manages the trail',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Fresno rider preserve the vehicle for a defect inspection, gather the rental and maintenance records, and evaluate whether a waiver or assumption-of-risk defense actually applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I bring a claim if off-roading is inherently risky?',
        a: 'Possibly. Primary assumption of risk limits recovery for the inherent risks, but it does not excuse conduct that increases the risk beyond what is inherent, and it does not cover gross negligence. A product-defect or operator-negligence claim can proceed.',
      },
      {
        q: 'What if the machine had a mechanical problem?',
        a: 'A mechanical failure or rollover can point to a product defect or negligent maintenance. A defective off-road vehicle can support a strict product-liability claim against the manufacturer and sellers, so the vehicle should be preserved for inspection.',
      },
      {
        q: 'Can I sue a rental or tour operator?',
        a: 'Possibly. Operators owe a duty of care, and negligent maintenance, inadequate instruction, an unsafe machine, or renting to an unqualified or underage rider can create liability. The rental and maintenance records matter.',
      },
      {
        q: 'My child was hurt on a rented ATV. Does the waiver stop that?',
        a: 'Generally not. A waiver a parent signs on a child\u2019s behalf is usually unenforceable as to the minor\u2019s own injury claim, and children receive heightened protection.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the vehicle, records, and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const offRoadVehicleCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [BAKERSFIELD_OHV_SLUG]: {
    scenario: `A Bakersfield rider\u2019s rented ATV rolled at Dove Springs. Preserving the machine revealed a stability issue, and the maintenance log showed skipped service \u2014 opening both a product and an operator claim despite a signed waiver. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the vehicle; photograph the scene.'],
      ['Records', 'Gather the rental agreement and maintenance log.'],
      ['Inspection', 'Have the machine examined for defects.'],
      ['Longer term', 'Product and operator theories developed.'],
    ],
    severityLadder: [
      ['Product', 'A defect claim runs against the maker.'],
      ['Operator', 'Rental negligence is separate.'],
      ['Waiver', 'It cannot bar gross negligence.'],
      ['Minors', 'A child\u2019s claim survives a parent\u2019s waiver.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Off-road injuries are often severe.' },
      { label: 'Orthopedic / trauma', copy: 'Fractures and head injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether a product defect is shown',
      'Whether the operator was negligent',
      'Whether a waiver or assumption of risk applies',
      'Whether the rider is a minor',
      'Whether the vehicle was preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Preserve the machine', copy: 'It anchors a defect claim.' },
      { label: 'Records matter', copy: 'Maintenance gaps show negligence.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Multiple defendants', copy: 'Maker and operator may share fault.' },
    ],
    insuranceProblems: [
      'The vehicle is returned before it can be inspected.',
      'A signed waiver is treated as a complete defense.',
      'Assumption of risk is asserted for non-inherent conduct.',
      'A minor\u2019s protected status is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the vehicle rented, guided, or owned?' },
      { label: 'Step 2', question: 'Do you still have access to the machine?' },
      { label: 'Step 3', question: 'Did you sign a waiver, and who was riding?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
  [SAN_BERNARDINO_OHV_SLUG]: {
    scenario: `A rider on a guided Johnson Valley tour was hurt after the operator sent the group down an unsuitable line. The instruction and route records supported an operator-negligence claim beyond the inherent risks. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the vehicle; photograph the terrain.'],
      ['Records', 'Gather the tour agreement and instruction records.'],
      ['Inspection', 'Have the machine examined for defects.'],
      ['Longer term', 'Operator and product theories developed.'],
    ],
    severityLadder: [
      ['Product', 'A defect claim runs against the maker.'],
      ['Operator', 'Tour negligence is separate.'],
      ['Waiver', 'It cannot bar gross negligence.'],
      ['Risk', 'Non-inherent conduct is not excused.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'High-desert crashes are often severe.' },
      { label: 'Orthopedic / trauma', copy: 'Fractures and head injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the operator increased the risk',
      'Whether a product defect is shown',
      'Whether a waiver or assumption of risk applies',
      'Whether the rider is a minor',
      'Whether the vehicle was preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Route choices count', copy: 'Sending riders into danger is negligence.' },
      { label: 'Preserve the machine', copy: 'It anchors a defect claim.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Multiple defendants', copy: 'Maker and operator may share fault.' },
    ],
    insuranceProblems: [
      'The tour operator hides behind a signed waiver.',
      'Assumption of risk is asserted for non-inherent conduct.',
      'The vehicle is returned before it can be inspected.',
      'A minor\u2019s protected status is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you on a guided tour or rental?' },
      { label: 'Step 2', question: 'What instruction or route were you given?' },
      { label: 'Step 3', question: 'Did you sign a waiver, and who was riding?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
  [RIVERSIDE_OHV_SLUG]: {
    scenario: `A Riverside rider was blamed by the rental company until the maintenance log showed a worn part the operator never replaced. That record shifted the case from rider fault to operator negligence. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the vehicle; photograph the scene.'],
      ['Records', 'Demand the maintenance and instruction records.'],
      ['Inspection', 'Have the machine examined for defects.'],
      ['Longer term', 'Operator and product theories developed.'],
    ],
    severityLadder: [
      ['Product', 'A defect claim runs against the maker.'],
      ['Operator', 'Maintenance negligence is separate.'],
      ['Waiver', 'It cannot bar gross negligence.'],
      ['Minors', 'A child\u2019s claim survives a parent\u2019s waiver.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Off-road injuries are often severe.' },
      { label: 'Orthopedic / trauma', copy: 'Fractures and head injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether maintenance was negligent',
      'Whether a product defect is shown',
      'Whether a waiver or assumption of risk applies',
      'Whether the rider is a minor',
      'Whether the vehicle was preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Records rebut blame', copy: 'Maintenance gaps show negligence.' },
      { label: 'Preserve the machine', copy: 'It anchors a defect claim.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Multiple defendants', copy: 'Maker and operator may share fault.' },
    ],
    insuranceProblems: [
      'The rental company blames the rider without records.',
      'The vehicle is returned before it can be inspected.',
      'A signed waiver is treated as a complete defense.',
      'A minor\u2019s protected status is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the vehicle rented, guided, or owned?' },
      { label: 'Step 2', question: 'Can you obtain the maintenance records?' },
      { label: 'Step 3', question: 'Did you sign a waiver, and who was riding?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
  [FRESNO_OHV_SLUG]: {
    scenario: `A Fresno rider hit an unmarked hazard on a foothill trail managed by a public agency. Preserving the vehicle and meeting the six-month government-claim deadline kept the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the vehicle; photograph the hazard.'],
      ['Deadline', 'Check for a six-month public-entity claim.'],
      ['Inspection', 'Have the machine examined for defects.'],
      ['Longer term', 'Product, operator, and public theories developed.'],
    ],
    severityLadder: [
      ['Product', 'A defect claim runs against the maker.'],
      ['Operator', 'Rental negligence is separate.'],
      ['Public', 'A six-month claim may apply to agency land.'],
      ['Risk', 'Non-inherent conduct is not excused.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Off-road injuries are often severe.' },
      { label: 'Orthopedic / trauma', copy: 'Fractures and head injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether a product defect is shown',
      'Whether the operator was negligent',
      'Whether a public entity manages the land',
      'Whether a waiver or assumption of risk applies',
      'Whether the vehicle was preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Deadlines differ', copy: 'Public land can require a six-month claim.' },
      { label: 'Preserve the machine', copy: 'It anchors a defect claim.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Multiple defendants', copy: 'Maker, operator, and agency may share fault.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The vehicle is returned before it can be inspected.',
      'Assumption of risk is asserted for non-inherent conduct.',
      'A minor\u2019s protected status is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where did the crash happen, and who manages it?' },
      { label: 'Step 2', question: 'Was the vehicle rented, guided, or owned?' },
      { label: 'Step 3', question: 'Did you sign a waiver, and who was riding?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
}
