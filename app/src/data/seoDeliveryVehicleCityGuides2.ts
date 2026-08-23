import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, delivery-vehicle crash practice area (batch 2):
 * location-specific guides for San Diego, San Jose, Fresno, and Long Beach,
 * extending the batch-1 hub (Los Angeles, Riverside, Oakland, Sacramento).
 *
 * Applied accurately (identical to batch 1):
 *  - Branded vans often run through a Delivery Service Partner/contractor;
 *    the employer can be liable via respondeat superior, and the brand via route
 *    control or negligent selection (fact-dependent).
 *  - Gig drivers are generally independent contractors under Prop 22, but the app
 *    carries period-based contingent commercial coverage while a delivery is active.
 *  - Personal-auto policies commonly exclude commercial use, creating a gap unlocked
 *    by proving the driver was logged in / on an active delivery.
 *  - App/dispatch logs, route/telematics data, and ownership records vanish fast;
 *    a box truck can fall under FMCSR; negligent hiring/entrustment can add a claim.
 *  - Pure comparative negligence; two-year deadline (CCP 335.1); six-month claim if
 *    a public entity is involved.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Which company is liable, which policy applies during an active delivery, and which deadline controls depend on facts a licensed California attorney should review promptly.'

const DSP =
  'A branded delivery van is often operated not by the brand directly but by a separate Delivery Service Partner or contractor. The driver\u2019s actual employer can be liable through respondeat superior, and the brand itself can face claims through its control of routes, timing, and quotas, or through negligent selection of the contractor \u2014 though whether the brand is on the hook turns on the facts. Untangling who employed the driver and who controlled the route is the first and most important step.'

const GIG =
  'Gig delivery drivers for food and grocery apps are generally classified as independent contractors under Proposition 22, which can limit the app company\u2019s vicarious liability. But the app typically carries contingent commercial coverage that applies while a delivery is active \u2014 often mirroring the period-based structure used for rideshare \u2014 and identifying whether the driver was mid-delivery, and which coverage was in force at that moment, is frequently decisive.'

const COVERAGE_GAP =
  'A driver using a personal car to deliver frequently creates a coverage gap: a personal auto policy commonly excludes commercial use, so the personal insurer may deny the claim, and the delivery company\u2019s coverage becomes the practical source of recovery. Establishing that the driver was working \u2014 logged in, on an active delivery \u2014 at the time of the crash is what unlocks that commercial coverage.'

const EVIDENCE =
  'Delivery cases turn on records that vanish fast: the app or dispatch logs showing the driver was on an active delivery, the route and timing data, the vehicle\u2019s ownership and the company behind it, and any telematics. A larger delivery box truck can also fall under Federal Motor Carrier Safety Regulations, and negligent hiring, entrustment, or supervision by the company can add a claim. Preserving these records early is critical.'

export const SD_DELIVERY_SLUG = '/san-diego-delivery-truck-accident'
export const SJ_DELIVERY_SLUG = '/san-jose-delivery-truck-accident'
export const FRESNO_DELIVERY_SLUG = '/fresno-delivery-truck-accident'
export const LB_DELIVERY_SLUG = '/long-beach-delivery-truck-accident'

export const deliveryVehicleCityGuidePages2: LandingPage[] = [
  {
    slug: SD_DELIVERY_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Delivery Vehicle Crash Claims',
    title: 'San Diego Delivery Van & Truck Crash Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an Amazon-style van or a gig delivery driver in San Diego? Who is liable and which policy applies turns on who employed the driver and whether a delivery was active.',
    psychology: 'A delivery van or app driver hit me in San Diego and I do not know which company or insurer is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego delivery van accident lawyer',
      'amazon dsp van crash claim california',
      'doordash driver accident insurance california',
      'delivery driver personal insurance denied california',
      'gig delivery active delivery coverage california',
    ],
    signals: [
      'DSP / contractor vs. brand',
      'Prop 22 gig classification',
      'Period-based commercial coverage',
      'Personal-auto coverage gap',
      'App / dispatch logs perishable',
      'FMCSR for box trucks',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s sprawling suburbs and heavy e-commerce delivery volume put branded vans and gig drivers on residential streets all day, and after a crash the hard questions are who employed the driver and which policy was in force. ${DSP} ${GIG} ${COVERAGE_GAP} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the van was branded or a personal car',
        'The DSP or contractor operating the vehicle',
        'Whether a delivery was active at the time',
        'The app or dispatch logs and route data',
        'The vehicle\u2019s ownership and company behind it',
        'Whether a personal insurer denied the claim',
        'Whether a box truck falls under FMCSR',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles who employed the driver and who controlled the route, moves fast to preserve the app and dispatch logs proving an active delivery, and identifies which period-based commercial coverage applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A branded van hit me. Is the brand liable?',
        a: 'Sometimes. Branded vans are often run by a separate Delivery Service Partner whose respondeat superior liability is clearest, while the brand can face claims through route/quota control or negligent selection \u2014 but that turns on the facts.',
      },
      {
        q: 'A gig app driver hit me. Does the app cover it?',
        a: 'Gig drivers are generally independent contractors under Prop 22, but the app typically carries period-based contingent commercial coverage that applies while a delivery is active. Whether the driver was mid-delivery is often decisive.',
      },
      {
        q: 'The driver\u2019s personal insurer denied the claim. Now what?',
        a: 'That is common \u2014 personal auto policies commonly exclude commercial use. The delivery company\u2019s coverage becomes the practical source of recovery once you establish the driver was logged in and on an active delivery.',
      },
      {
        q: 'What evidence disappears fastest?',
        a: 'The app or dispatch logs showing an active delivery, the route and timing data, telematics, and the vehicle\u2019s ownership records. Preserving them early is critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the delivery records and identifies the responsible company so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_DELIVERY_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Delivery Vehicle Crash Claims',
    title: 'San Jose Delivery Van & Truck Crash Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an Amazon-style van or a gig delivery driver in San Jose? Who is liable and which policy applies turns on who employed the driver and whether a delivery was active.',
    psychology: 'A delivery van or app driver hit me in San Jose and I do not know which company or insurer is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose delivery van accident lawyer',
      'amazon dsp van crash claim california',
      'doordash driver accident insurance california',
      'delivery driver personal insurance denied california',
      'gig delivery active delivery coverage california',
    ],
    signals: [
      'DSP / contractor vs. brand',
      'Prop 22 gig classification',
      'Period-based commercial coverage',
      'Personal-auto coverage gap',
      'App / dispatch logs perishable',
      'FMCSR for box trucks',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s dense Silicon Valley neighborhoods generate constant same-day and grocery delivery traffic, and after a crash the hard questions are who employed the driver and which policy was in force. ${DSP} ${GIG} ${COVERAGE_GAP} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the van was branded or a personal car',
        'The DSP or contractor operating the vehicle',
        'Whether a delivery was active at the time',
        'The app or dispatch logs and route data',
        'The vehicle\u2019s ownership and company behind it',
        'Whether a personal insurer denied the claim',
        'Whether a box truck falls under FMCSR',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles who employed the driver and who controlled the route, moves fast to preserve the app and dispatch logs proving an active delivery, and identifies which period-based commercial coverage applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A branded van hit me. Is the brand liable?',
        a: 'Sometimes. Branded vans are often run by a separate Delivery Service Partner whose respondeat superior liability is clearest, while the brand can face claims through route/quota control or negligent selection \u2014 but that turns on the facts.',
      },
      {
        q: 'A gig app driver hit me. Does the app cover it?',
        a: 'Gig drivers are generally independent contractors under Prop 22, but the app typically carries period-based contingent commercial coverage that applies while a delivery is active.',
      },
      {
        q: 'The driver\u2019s personal insurer denied the claim. Now what?',
        a: 'That is common \u2014 personal auto policies commonly exclude commercial use. The delivery company\u2019s coverage becomes the practical source of recovery once you establish the driver was on an active delivery.',
      },
      {
        q: 'What evidence disappears fastest?',
        a: 'The app or dispatch logs showing an active delivery, the route and timing data, telematics, and the vehicle\u2019s ownership records. Preserving them early is critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the delivery records and identifies the responsible company so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_DELIVERY_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Delivery Vehicle Crash Claims',
    title: 'Fresno Delivery Van & Truck Crash Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an Amazon-style van or a gig delivery driver in Fresno? Who is liable and which policy applies turns on who employed the driver and whether a delivery was active.',
    psychology: 'A delivery van or app driver hit me in Fresno and I do not know which company or insurer is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno delivery van accident lawyer',
      'amazon dsp van crash claim california',
      'doordash driver accident insurance california',
      'delivery driver personal insurance denied california',
      'gig delivery active delivery coverage california',
    ],
    signals: [
      'DSP / contractor vs. brand',
      'Prop 22 gig classification',
      'Period-based commercial coverage',
      'Personal-auto coverage gap',
      'App / dispatch logs perishable',
      'FMCSR for box trucks',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s wide arterials and growing warehouse and fulfillment footprint keep branded vans and gig drivers on the road constantly, and after a crash the hard questions are who employed the driver and which policy was in force. ${DSP} ${GIG} ${COVERAGE_GAP} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the van was branded or a personal car',
        'The DSP or contractor operating the vehicle',
        'Whether a delivery was active at the time',
        'The app or dispatch logs and route data',
        'The vehicle\u2019s ownership and company behind it',
        'Whether a personal insurer denied the claim',
        'Whether a box truck falls under FMCSR',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles who employed the driver and who controlled the route, moves fast to preserve the app and dispatch logs proving an active delivery, and identifies which period-based commercial coverage applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A branded van hit me. Is the brand liable?',
        a: 'Sometimes. Branded vans are often run by a separate Delivery Service Partner whose respondeat superior liability is clearest, while the brand can face claims through route/quota control or negligent selection \u2014 but that turns on the facts.',
      },
      {
        q: 'A gig app driver hit me. Does the app cover it?',
        a: 'Gig drivers are generally independent contractors under Prop 22, but the app typically carries period-based contingent commercial coverage that applies while a delivery is active.',
      },
      {
        q: 'The driver\u2019s personal insurer denied the claim. Now what?',
        a: 'That is common \u2014 personal auto policies commonly exclude commercial use. The delivery company\u2019s coverage becomes the practical source of recovery once you establish the driver was on an active delivery.',
      },
      {
        q: 'What evidence disappears fastest?',
        a: 'The app or dispatch logs showing an active delivery, the route and timing data, telematics, and the vehicle\u2019s ownership records. Preserving them early is critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the delivery records and identifies the responsible company so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_DELIVERY_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Delivery Vehicle Crash Claims',
    title: 'Long Beach Delivery Van & Truck Crash Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an Amazon-style van, a port drayage truck, or a gig driver in Long Beach? Who is liable and which policy applies turns on who employed the driver and whether a delivery was active.',
    psychology: 'A delivery van or app driver hit me in Long Beach and I do not know which company or insurer is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach delivery van accident lawyer',
      'amazon dsp van crash claim california',
      'doordash driver accident insurance california',
      'delivery driver personal insurance denied california',
      'gig delivery active delivery coverage california',
    ],
    signals: [
      'DSP / contractor vs. brand',
      'Prop 22 gig classification',
      'Period-based commercial coverage',
      'Personal-auto coverage gap',
      'App / dispatch logs perishable',
      'FMCSR for box trucks',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s port-adjacent last-mile logistics and dense delivery routes fill the streets with branded vans, box trucks, and gig drivers, and after a crash the hard questions are who employed the driver and which policy was in force. ${DSP} ${GIG} ${COVERAGE_GAP} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the van was branded or a personal car',
        'The DSP or contractor operating the vehicle',
        'Whether a delivery was active at the time',
        'The app or dispatch logs and route data',
        'The vehicle\u2019s ownership and company behind it',
        'Whether a personal insurer denied the claim',
        'Whether a box truck falls under FMCSR',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles who employed the driver and who controlled the route, moves fast to preserve the app and dispatch logs proving an active delivery, and identifies which period-based commercial coverage applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A branded van hit me. Is the brand liable?',
        a: 'Sometimes. Branded vans are often run by a separate Delivery Service Partner whose respondeat superior liability is clearest, while the brand can face claims through route/quota control or negligent selection \u2014 but that turns on the facts.',
      },
      {
        q: 'A larger box truck hit me. Does anything else apply?',
        a: 'A larger delivery box truck can fall under Federal Motor Carrier Safety Regulations, and negligent hiring, entrustment, or supervision by the company can add a claim beyond the driver\u2019s negligence.',
      },
      {
        q: 'The driver\u2019s personal insurer denied the claim. Now what?',
        a: 'That is common \u2014 personal auto policies commonly exclude commercial use. The delivery company\u2019s coverage becomes the practical source of recovery once you establish the driver was on an active delivery.',
      },
      {
        q: 'What evidence disappears fastest?',
        a: 'The app or dispatch logs showing an active delivery, the route and timing data, telematics, and the vehicle\u2019s ownership records. Preserving them early is critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the delivery records and identifies the responsible company so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const deliveryVehicleCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SD_DELIVERY_SLUG]: {
    scenario: `A San Diego pedestrian was struck by a branded van run by a Delivery Service Partner. The DSP\u2019s respondeat superior liability was clear once the route and dispatch records identified the true employer. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the van, branding, and plates.'],
      ['First days', 'Identify the DSP and preserve dispatch logs.'],
      ['First weeks', 'Confirm which commercial policy applies.'],
      ['Longer term', 'Assess brand route-control and hiring claims.'],
    ],
    severityLadder: [
      ['Branded van', 'A DSP usually employs the driver.'],
      ['Employer', 'Respondeat superior applies.'],
      ['Brand', 'Route control or negligent selection.'],
      ['Coverage', 'Commercial policy responds.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Who employed the driver',
      'Whether the brand controlled the route',
      'Which commercial policy applies',
      'Whether dispatch logs were preserved',
      'Whether negligent hiring applies',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Employer', copy: 'The DSP is usually liable.' },
      { label: 'Brand', copy: 'Route control can reach it.' },
      { label: 'Coverage', copy: 'Commercial policy responds.' },
      { label: 'Evidence', copy: 'Dispatch logs are perishable.' },
    ],
    insuranceProblems: [
      'The true employer is never identified.',
      'The dispatch logs are lost.',
      'Only the driver\u2019s personal policy is pursued.',
      'The commercial coverage is never triggered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the van branded?' },
      { label: 'Step 2', question: 'Which company operated it?' },
      { label: 'Step 3', question: 'Was a delivery active?' },
      { label: 'Step 4', question: 'When did the crash happen?' },
    ],
  },
  [SJ_DELIVERY_SLUG]: {
    scenario: `A San Jose cyclist was hit by a gig grocery driver mid-delivery. The app\u2019s period-based commercial coverage applied because the delivery-active status was preserved from the app log. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app and whether a delivery was active.'],
      ['First days', 'Preserve the app log and delivery status.'],
      ['First weeks', 'Confirm which coverage period applied.'],
      ['Longer term', 'Assess the personal-policy gap.'],
    ],
    severityLadder: [
      ['Gig driver', 'Prop 22 limits vicarious liability.'],
      ['Active delivery', 'Contingent coverage applies.'],
      ['Coverage period', 'It sets the limits.'],
      ['Personal gap', 'Personal insurer may deny.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a delivery was active',
      'Which coverage period applied',
      'Whether the app log was preserved',
      'Whether the personal insurer denied',
      'Whether the app coverage responds',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Active delivery', copy: 'It unlocks the app coverage.' },
      { label: 'Coverage period', copy: 'It sets the limits.' },
      { label: 'Prop 22', copy: 'It limits vicarious liability.' },
      { label: 'Evidence', copy: 'The app log is perishable.' },
    ],
    insuranceProblems: [
      'The delivery-active status is never proven.',
      'The app log is not preserved.',
      'Only the personal policy is pursued.',
      'The coverage period is misidentified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which app was the driver using?' },
      { label: 'Step 2', question: 'Was a delivery active?' },
      { label: 'Step 3', question: 'Did the personal insurer deny?' },
      { label: 'Step 4', question: 'When did the crash happen?' },
    ],
  },
  [FRESNO_DELIVERY_SLUG]: {
    scenario: `A Fresno driver was hit by someone delivering in a personal car whose insurer denied the claim for commercial use. Proving the driver was logged in on an active delivery unlocked the app coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app and delivery status.'],
      ['First days', 'Preserve the app log; document the denial.'],
      ['First weeks', 'Trigger the delivery company\u2019s coverage.'],
      ['Longer term', 'Assess negligent-hiring claims if a DSP.'],
    ],
    severityLadder: [
      ['Personal car', 'Commercial-use exclusion applies.'],
      ['Denial', 'Personal insurer may refuse.'],
      ['Active delivery', 'Company coverage responds.'],
      ['Evidence', 'App logs prove the status.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the personal insurer denied',
      'Whether a delivery was active',
      'Whether the app log was preserved',
      'Which company coverage applies',
      'Whether a DSP was involved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Coverage gap', copy: 'Personal policies exclude commercial use.' },
      { label: 'Active delivery', copy: 'It unlocks company coverage.' },
      { label: 'Evidence', copy: 'The app log proves status.' },
      { label: 'DSP', copy: 'A contractor may also be liable.' },
    ],
    insuranceProblems: [
      'The claim ends when the personal insurer denies.',
      'The delivery-active status is never proven.',
      'The app log is not preserved.',
      'The company coverage is never triggered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver using a personal car?' },
      { label: 'Step 2', question: 'Did the personal insurer deny?' },
      { label: 'Step 3', question: 'Was a delivery active?' },
      { label: 'Step 4', question: 'Which app or company was it?' },
    ],
  },
  [LB_DELIVERY_SLUG]: {
    scenario: `A Long Beach motorist was struck by a delivery box truck near the port. The truck fell under Federal Motor Carrier Safety Regulations, and negligent hiring by the carrier added a claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the truck, DOT number, and company.'],
      ['First days', 'Preserve dispatch and telematics data.'],
      ['First weeks', 'Pull the carrier\u2019s FMCSR and hiring records.'],
      ['Longer term', 'Assess negligent hiring and entrustment.'],
    ],
    severityLadder: [
      ['Box truck', 'FMCSR can apply.'],
      ['Carrier', 'Respondeat superior applies.'],
      ['Hiring', 'Negligent hiring can add a claim.'],
      ['Coverage', 'Commercial policy responds.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether FMCSR applies',
      'Who the carrier is',
      'Whether telematics were preserved',
      'Whether negligent hiring applies',
      'Which commercial policy applies',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'FMCSR', copy: 'Federal rules can apply to box trucks.' },
      { label: 'Carrier', copy: 'The company is liable for its driver.' },
      { label: 'Hiring', copy: 'Negligent hiring can add a claim.' },
      { label: 'Evidence', copy: 'Telematics are perishable.' },
    ],
    insuranceProblems: [
      'The carrier behind the truck is never identified.',
      'The telematics data is overwritten.',
      'The FMCSR angle is never raised.',
      'Only the driver is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a box truck with a DOT number?' },
      { label: 'Step 2', question: 'Which carrier operated it?' },
      { label: 'Step 3', question: 'Was a delivery active?' },
      { label: 'Step 4', question: 'When did the crash happen?' },
    ],
  },
}
