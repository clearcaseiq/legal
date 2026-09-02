import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, delivery-vehicle and gig-delivery accident practice area:
 * location-specific guides for Los Angeles, Riverside (Inland Empire), Oakland,
 * and Sacramento.
 *
 * The explosion of last-mile delivery is a distinct practice area from big-rig
 * truck claims: the vehicles are vans, box trucks, and personal cars, and the
 * liability turns on delivery-company structures (Amazon's Delivery Service
 * Partner model, gig-app independent-contractor status under Proposition 22) and
 * the coverage gaps those structures create.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: the highest volume of last-mile delivery in the state, with
 *    dense residential routes and heavy gig food and grocery delivery.
 *  - Riverside and the Inland Empire: the warehouse and fulfillment hub of the
 *    West, where delivery vans and box trucks saturate residential streets.
 *  - Oakland: port-adjacent distribution and dense urban delivery routes.
 *  - Sacramento: a growing distribution corridor with heavy suburban delivery.
 *
 * Applied accurately:
 *  - A branded delivery van is often operated not by the brand directly but by a
 *    separate Delivery Service Partner or contractor; the driver's employer can be
 *    liable through respondeat superior, and the brand can face claims through its
 *    control of routes and quotas or negligent selection, though that turns on the
 *    facts.
 *  - Gig delivery drivers (food and grocery apps) are generally classified as
 *    independent contractors under Proposition 22, which can limit the app's
 *    vicarious liability, but the app typically carries contingent commercial
 *    coverage that applies while a delivery is active, and identifying that
 *    coverage is often decisive.
 *  - A personal vehicle used for delivery frequently creates a coverage gap,
 *    because a personal auto policy may exclude commercial use, making the
 *    delivery company's coverage the practical source of recovery.
 *  - Larger delivery box trucks can fall under Federal Motor Carrier Safety
 *    Regulations, and negligent hiring, entrustment, or supervision can add a
 *    claim.
 *  - Pure comparative negligence and the two-year deadline (Code of Civil
 *    Procedure section 335.1), with the six-month Government Claims Act deadline
 *    if a public entity is involved.
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

export const LA_DELIVERY_SLUG = '/los-angeles-delivery-truck-accident'
export const RIV_DELIVERY_SLUG = '/riverside-delivery-truck-accident'
export const OAK_DELIVERY_SLUG = '/oakland-delivery-truck-accident'
export const SAC_DELIVERY_SLUG = '/sacramento-delivery-truck-accident'

export const deliveryVehicleCityGuidePages: LandingPage[] = [
  {
    slug: LA_DELIVERY_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Delivery Vehicle Accident Claims',
    title: 'Los Angeles Delivery Vehicle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a delivery van or a food or grocery delivery driver in Los Angeles? A claim can reach the driver\u2019s employer, the delivery company, or an app\u2019s commercial coverage \u2014 not just the driver.',
    psychology: 'A delivery van or app driver hit me in LA and I do not know which company is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles delivery van accident lawyer',
      'hit by amazon delivery van who is liable california',
      'doordash driver accident claim california',
      'delivery driver personal car insurance gap california',
      'gig delivery accident coverage california',
    ],
    signals: [
      'Delivery Service Partner liability',
      'Gig coverage (Prop 22)',
      'Personal-auto coverage gap',
      'Route/quota & negligent selection',
      'App / dispatch logs',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles has the highest volume of last-mile delivery in the state, from branded vans on dense residential routes to gig food and grocery drivers, which makes these crashes common and the liability picture more complex than an ordinary car accident. ${DSP} ${GIG} ${COVERAGE_GAP} ${EVIDENCE} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The brand on the van and the actual company operating it',
        'Whether the driver was an employee, a contractor, or a gig driver',
        'For a gig driver, whether a delivery was active at the time',
        'Whether a personal vehicle was being used for delivery',
        'The app or dispatch logs and route/timing data',
        'The driver\u2019s and any company\u2019s insurance',
        'Photographs of the vehicles, branding, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles who employed the LA delivery driver and who controlled the route, establishes whether a gig driver was on an active delivery so the app\u2019s commercial coverage applies, and preserves the app and dispatch logs before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hit by a branded delivery van. Can I claim against the brand?',
        a: 'Possibly, but the van is often operated by a separate Delivery Service Partner or contractor, not the brand directly. The driver\u2019s actual employer can be liable through respondeat superior, and the brand can face claims through its control of routes and quotas or negligent selection. Untangling who employed the driver and controlled the route is the first step.',
      },
      {
        q: 'A DoorDash or Uber Eats driver hit me. Who covers the claim?',
        a: 'Gig delivery drivers are generally independent contractors under Proposition 22, which can limit the app\u2019s vicarious liability, but the app typically carries contingent commercial coverage that applies while a delivery is active. Establishing that the driver was mid-delivery, and which coverage was in force, is frequently decisive.',
      },
      {
        q: 'The driver was using a personal car for delivery. Does that matter?',
        a: 'Yes. A personal auto policy commonly excludes commercial use, so the personal insurer may deny the claim, and the delivery company\u2019s coverage becomes the practical source of recovery. Proving the driver was logged in and on an active delivery is what unlocks that commercial coverage.',
      },
      {
        q: 'What evidence matters most in a delivery-vehicle crash?',
        a: 'The app or dispatch logs showing an active delivery, the route and timing data, the vehicle\u2019s ownership and the company behind it, and any telematics. These records vanish quickly, so preserving them early is critical, and a larger delivery box truck can also fall under federal trucking regulations.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the company and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_DELIVERY_SLUG,
    category: 'Cities',
    cluster: 'Riverside Delivery Vehicle Accident Claims',
    title: 'Riverside Delivery Vehicle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a delivery van or box truck in Riverside or the Inland Empire? As the warehouse hub of the West, its streets are saturated with delivery vehicles \u2014 and a claim can reach the company behind the van.',
    psychology: 'A delivery van hit me in the Inland Empire and I do not know which company is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside delivery van accident lawyer',
      'inland empire delivery truck accident claim',
      'hit by amazon delivery van who is liable california',
      'delivery box truck accident california',
      'warehouse delivery vehicle accident california',
    ],
    signals: [
      'Delivery Service Partner liability',
      'Warehouse/fulfillment saturation',
      'Delivery box trucks (FMCSA)',
      'Personal-auto coverage gap',
      'Negligent hiring / entrustment',
      'App / dispatch logs',
    ],
    sections: {
      whyItMatters: `Riverside and the Inland Empire are the warehouse and fulfillment hub of the West, and their residential streets are saturated with delivery vans and box trucks \u2014 which makes delivery-vehicle crashes a defining local injury pattern. ${DSP} The region\u2019s concentration of Delivery Service Partners and the pressure of tight delivery quotas make the route-and-quota control and negligent-selection questions especially live. ${EVIDENCE} ${COVERAGE_GAP} ${GIG} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'The brand on the van and the actual company operating it',
        'Whether a delivery box truck (federal regulations) was involved',
        'Whether the driver was an employee, contractor, or gig driver',
        'The route, quota, and timing data',
        'Whether a personal vehicle was being used for delivery',
        'The driver\u2019s and any company\u2019s insurance',
        'Photographs of the vehicles, branding, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds an Inland Empire delivery claim around the Delivery Service Partner structure and the route-quota pressure that drives crashes, pursues negligent hiring and entrustment where the facts fit, and preserves the dispatch and telematics records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The Inland Empire is full of delivery vans. Who is responsible when one hits me?',
        a: 'The van is often operated by a separate Delivery Service Partner or contractor, not the brand directly. The driver\u2019s employer can be liable through respondeat superior, and the brand can face claims through its control of routes and quotas or negligent selection. Given the region\u2019s quota pressure, those control questions are especially live.',
      },
      {
        q: 'A large delivery box truck was involved. Does that change things?',
        a: 'It can. A larger delivery box truck can fall under Federal Motor Carrier Safety Regulations, which impose duties on the carrier and generate records \u2014 hours, maintenance, and driver qualification \u2014 that can be central evidence. Negligent hiring, entrustment, or supervision by the company can add a claim.',
      },
      {
        q: 'The driver used a personal car for delivery. Does that matter?',
        a: 'Yes. A personal auto policy commonly excludes commercial use, so the personal insurer may deny the claim, and the delivery company\u2019s coverage becomes the practical source of recovery. Proving the driver was on an active delivery unlocks that commercial coverage.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The route, quota, and timing data, the app or dispatch logs, the vehicle\u2019s ownership and the company behind it, and any telematics. These records vanish quickly, so preserving them early is critical.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the company and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_DELIVERY_SLUG,
    category: 'Cities',
    cluster: 'Oakland Delivery Vehicle Accident Claims',
    title: 'Oakland Delivery Vehicle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a delivery van or gig delivery driver in Oakland? A claim can reach the driver\u2019s employer, the delivery company, or an app\u2019s commercial coverage \u2014 not just the driver.',
    psychology: 'A delivery van or app driver hit me in Oakland and I do not know which company is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland delivery van accident lawyer',
      'hit by amazon delivery van who is liable california',
      'gig delivery accident coverage california',
      'delivery driver personal car insurance gap california',
      'port area delivery truck accident california',
    ],
    signals: [
      'Delivery Service Partner liability',
      'Port-adjacent distribution',
      'Gig coverage (Prop 22)',
      'Personal-auto coverage gap',
      'App / dispatch logs',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s port-adjacent distribution and dense urban routes put a heavy mix of delivery vans, box trucks, and gig drivers on its streets, which makes these crashes common and the liability picture layered. ${DSP} ${GIG} ${COVERAGE_GAP} ${EVIDENCE} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'The brand on the van and the actual company operating it',
        'Whether the driver was an employee, contractor, or gig driver',
        'For a gig driver, whether a delivery was active at the time',
        'Whether a personal vehicle was being used for delivery',
        'The app or dispatch logs and route/timing data',
        'The driver\u2019s and any company\u2019s insurance',
        'Photographs of the vehicles, branding, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles who employed the Oakland delivery driver and who controlled the route, establishes whether a gig driver was on an active delivery so the app\u2019s commercial coverage applies, and preserves the app and dispatch logs before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hit by a branded delivery van in Oakland. Can I claim against the brand?',
        a: 'Possibly, but the van is often operated by a separate Delivery Service Partner or contractor. The driver\u2019s employer can be liable through respondeat superior, and the brand can face claims through its control of routes and quotas or negligent selection. Untangling who employed the driver is the first step.',
      },
      {
        q: 'A gig delivery driver hit me. Who covers the claim?',
        a: 'Gig delivery drivers are generally independent contractors under Proposition 22, which can limit the app\u2019s vicarious liability, but the app typically carries contingent commercial coverage that applies while a delivery is active. Establishing that the driver was mid-delivery is frequently decisive.',
      },
      {
        q: 'The driver used a personal car for delivery. Does that matter?',
        a: 'Yes. A personal auto policy commonly excludes commercial use, so the personal insurer may deny the claim, and the delivery company\u2019s coverage becomes the practical source of recovery. Proving the driver was on an active delivery unlocks that coverage.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The app or dispatch logs showing an active delivery, the route and timing data, the vehicle\u2019s ownership and the company behind it, and any telematics. These records vanish quickly, so preserving them early is critical.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the company and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_DELIVERY_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Delivery Vehicle Accident Claims',
    title: 'Sacramento Delivery Vehicle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a delivery van or gig delivery driver in Sacramento? A claim can reach the driver\u2019s employer, the delivery company, or an app\u2019s commercial coverage \u2014 and a public vehicle brings a shorter deadline.',
    psychology: 'A delivery van or app driver hit me in Sacramento and I do not know which company is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento delivery van accident lawyer',
      'hit by amazon delivery van who is liable california',
      'gig delivery accident coverage california',
      'delivery driver personal car insurance gap california',
      'suburban delivery truck accident california',
    ],
    signals: [
      'Delivery Service Partner liability',
      'Growing distribution corridor',
      'Gig coverage (Prop 22)',
      'Personal-auto coverage gap',
      'Public-entity six-month deadline',
      'App / dispatch logs',
    ],
    sections: {
      whyItMatters: `Sacramento is a fast-growing distribution corridor with heavy suburban delivery, putting more branded vans, box trucks, and gig drivers on its roads each year. ${DSP} ${GIG} ${COVERAGE_GAP} ${EVIDENCE} Because Sacramento also sees more public and government vehicles, a crash involving a public entity can bring the six-month Government Claims Act deadline into play, far shorter than the usual two years. Pure comparative negligence applies. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'The brand on the van and the actual company operating it',
        'Whether the driver was an employee, contractor, or gig driver',
        'For a gig driver, whether a delivery was active at the time',
        'Whether a public entity or government vehicle was involved (six-month rule)',
        'Whether a personal vehicle was being used for delivery',
        'The app or dispatch logs and route/timing data',
        'The driver\u2019s and any company\u2019s insurance',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles who employed the Sacramento delivery driver and who controlled the route, establishes whether a gig driver was on an active delivery so the app\u2019s commercial coverage applies, and flags immediately when a public entity triggers the six-month deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hit by a branded delivery van. Can I claim against the brand?',
        a: 'Possibly, but the van is often operated by a separate Delivery Service Partner or contractor. The driver\u2019s employer can be liable through respondeat superior, and the brand can face claims through its control of routes and quotas or negligent selection. Untangling who employed the driver is the first step.',
      },
      {
        q: 'A gig delivery driver hit me. Who covers the claim?',
        a: 'Gig delivery drivers are generally independent contractors under Proposition 22, which can limit the app\u2019s vicarious liability, but the app typically carries contingent commercial coverage that applies while a delivery is active. Establishing that the driver was mid-delivery is frequently decisive.',
      },
      {
        q: 'A government or public vehicle was involved. Is the deadline different?',
        a: 'Yes. Where a public entity is involved, a six-month Government Claims Act deadline can apply \u2014 far shorter than the usual two years \u2014 so the claim must be assessed and filed quickly. This is a distinctive Sacramento issue.',
      },
      {
        q: 'The driver used a personal car for delivery. Does that matter?',
        a: 'Yes. A personal auto policy commonly excludes commercial use, so the personal insurer may deny the claim, and the delivery company\u2019s coverage becomes the practical source of recovery. Proving the driver was on an active delivery unlocks that coverage.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the company and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const deliveryVehicleCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_DELIVERY_SLUG]: {
    scenario: `An LA cyclist was struck by a branded delivery van that turned out to be operated by a separate Delivery Service Partner under tight quotas. Establishing the employer and the brand\u2019s route control opened the coverage the driver alone could not. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the branding; get the van\u2019s plate and driver details.'],
      ['First days', 'The operating company behind the brand identified.'],
      ['First weeks', 'Employment, route, and quota control developed.'],
      ['Longer term', 'Treatment documented; every layer of coverage pursued.'],
    ],
    severityLadder: [
      ['Driver liability', 'The driver is responsible for the crash.'],
      ['Employer path', 'The Delivery Service Partner is liable via respondeat superior.'],
      ['Brand path', 'Route/quota control or negligent selection can reach the brand.'],
      ['Coverage', 'Company coverage exceeds the driver\u2019s alone.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Who employed the driver and who controlled the route',
      'Whether the brand can be reached through control or selection',
      'Which company coverage applies',
      'Whether the dispatch and telematics records were preserved',
      'Injury severity and treatment continuity',
      'Whether a personal-auto coverage gap exists',
    ],
    settlementValueDetails: [
      { label: 'Structure is decisive', copy: 'The operating company, not just the brand, matters.' },
      { label: 'Control reaches the brand', copy: 'Route and quota control can add a defendant.' },
      { label: 'Company coverage', copy: 'It exceeds the driver\u2019s personal policy.' },
      { label: 'Records vanish fast', copy: 'Dispatch and telematics must be preserved.' },
    ],
    insuranceProblems: [
      'The claim is limited to the individual driver.',
      'The operating company behind the brand is never identified.',
      'The dispatch and route records are lost.',
      'A personal-auto exclusion leaves the claim unpaid.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What brand was on the van, and who operated it?' },
      { label: 'Step 2', question: 'Was the driver an employee, contractor, or gig driver?' },
      { label: 'Step 3', question: 'Was a personal vehicle being used for delivery?' },
      { label: 'Step 4', question: 'Do you have the plate, branding photos, and driver details?' },
    ],
  },
  [RIV_DELIVERY_SLUG]: {
    scenario: `An Inland Empire driver was hit by a delivery van racing to meet a quota. The route and quota data, the Delivery Service Partner\u2019s role, and a negligent-hiring claim built the case beyond the driver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the branding; get the van\u2019s plate and driver details.'],
      ['First days', 'The operating company and any box-truck carrier identified.'],
      ['First weeks', 'Route/quota data and hiring records developed.'],
      ['Longer term', 'Treatment documented; every layer of coverage pursued.'],
    ],
    severityLadder: [
      ['Driver liability', 'The driver is responsible for the crash.'],
      ['Employer path', 'The Delivery Service Partner is liable via respondeat superior.'],
      ['Negligent hiring', 'Poor selection or supervision adds a claim.'],
      ['FMCSA path', 'A box truck brings federal duties and records.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Who employed the driver and who controlled the route and quota',
      'Whether negligent hiring or entrustment applies',
      'Whether a box truck brings federal duties',
      'Which company coverage applies',
      'Whether the route and telematics records were preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Quota pressure drives fault', copy: 'Route and timing data show it.' },
      { label: 'Hiring adds a claim', copy: 'Negligent selection can reach the company.' },
      { label: 'Box trucks add duties', copy: 'Federal regulations generate records.' },
      { label: 'Company coverage', copy: 'It exceeds the driver\u2019s personal policy.' },
    ],
    insuranceProblems: [
      'The route and quota data are never obtained.',
      'The claim is limited to the individual driver.',
      'A box truck\u2019s federal records go unexamined.',
      'A personal-auto exclusion leaves the claim unpaid.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What brand was on the van, and who operated it?' },
      { label: 'Step 2', question: 'Was it a van or a larger box truck?' },
      { label: 'Step 3', question: 'Was the driver rushing to meet a quota?' },
      { label: 'Step 4', question: 'Do you have the plate, branding photos, and details?' },
    ],
  },
  [OAK_DELIVERY_SLUG]: {
    scenario: `An Oakland pedestrian was struck by a gig grocery driver mid-delivery in a personal car. The personal insurer denied the claim, but the app\u2019s contingent commercial coverage applied once the active delivery was proven. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the driver\u2019s details and which app they were delivering for.'],
      ['First days', 'The app\u2019s coverage and the active-delivery status identified.'],
      ['First weeks', 'App logs obtained to prove the delivery was active.'],
      ['Longer term', 'Treatment documented; the applicable coverage pursued.'],
    ],
    severityLadder: [
      ['Driver liability', 'The driver is responsible for the crash.'],
      ['Coverage gap', 'A personal policy may exclude commercial use.'],
      ['App coverage', 'Contingent coverage applies during an active delivery.'],
      ['Proof', 'The app logs establish the active-delivery status.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver was on an active delivery',
      'Which app coverage was in force at that moment',
      'Whether a personal-auto coverage gap exists',
      'Whether the app logs were preserved',
      'Injury severity and treatment continuity',
      'Which company, if any, employed the driver',
    ],
    settlementValueDetails: [
      { label: 'Active delivery is key', copy: 'It unlocks the app\u2019s commercial coverage.' },
      { label: 'Coverage gap is real', copy: 'Personal policies exclude commercial use.' },
      { label: 'Logs are the proof', copy: 'App data establishes the delivery status.' },
      { label: 'Move fast', copy: 'App records must be preserved early.' },
    ],
    insuranceProblems: [
      'The personal insurer denies the claim for commercial use.',
      'The active-delivery status is never proven.',
      'The app logs are lost before they are requested.',
      'The victim assumes only the driver can be reached.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which app was the driver delivering for?' },
      { label: 'Step 2', question: 'Was a delivery active at the time of the crash?' },
      { label: 'Step 3', question: 'Was the driver using a personal car?' },
      { label: 'Step 4', question: 'Do you have the driver\u2019s and app details?' },
    ],
  },
  [SAC_DELIVERY_SLUG]: {
    scenario: `A Sacramento driver was hit by a delivery van, and a government vehicle was also involved in the chain-reaction crash. The six-month public-entity deadline had to be met while the delivery company\u2019s coverage was pursued. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the branding; note any government vehicle.'],
      ['First days', 'The operating company and public-entity status identified.'],
      ['Six-month mark', 'A government claim filed if a public entity is involved.'],
      ['Longer term', 'Treatment documented; every layer of coverage pursued.'],
    ],
    severityLadder: [
      ['Driver liability', 'The driver is responsible for the crash.'],
      ['Employer path', 'The Delivery Service Partner is liable via respondeat superior.'],
      ['Public-entity path', 'A government vehicle triggers the six-month rule.'],
      ['Coverage', 'Company coverage exceeds the driver\u2019s alone.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Who employed the driver and who controlled the route',
      'Whether a public entity and its six-month deadline are in play',
      'Which company coverage applies',
      'Whether the dispatch and telematics records were preserved',
      'Injury severity and treatment continuity',
      'Whether a personal-auto coverage gap exists',
    ],
    settlementValueDetails: [
      { label: 'Structure is decisive', copy: 'The operating company, not just the brand, matters.' },
      { label: 'Deadline can be short', copy: 'A public entity means six months.' },
      { label: 'Company coverage', copy: 'It exceeds the driver\u2019s personal policy.' },
      { label: 'Records vanish fast', copy: 'Dispatch and telematics must be preserved.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The operating company behind the brand is never identified.',
      'The dispatch and route records are lost.',
      'A personal-auto exclusion leaves the claim unpaid.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What brand was on the van, and who operated it?' },
      { label: 'Step 2', question: 'Was a public entity or government vehicle involved?' },
      { label: 'Step 3', question: 'Was the driver an employee, contractor, or gig driver?' },
      { label: 'Step 4', question: 'Do you have the plate, branding photos, and details?' },
    ],
  },
}
