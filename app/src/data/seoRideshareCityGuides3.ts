import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, rideshare practice area (batch 3): city-specific Uber/Lyft accident
 * guides for Fresno, Riverside, San Bernardino, and Bakersfield, extending the
 * batch-1 hub (LA, SF, San Diego, Anaheim) and batch-2 (San Jose, Sacramento,
 * Oakland, Long Beach) into the Central Valley and Inland Empire.
 *
 * The unifying local angle for these metros is that they have among the highest
 * uninsured-motorist rates in California, which makes the uninsured/underinsured
 * motorist (UM/UIM) coverage that rides with the rideshare policies unusually
 * important, together with long high-speed freeway and rural trips.
 *
 * Genuinely local context rather than interpolated copy:
 *  - Fresno: a Central Valley hub with high uninsured rates and long freeway/rural
 *    trips on Highway 99 and the 41.
 *  - Riverside: an Inland Empire commuter city where long freeway trips (91/60/215)
 *    and high uninsured rates meet heavy rideshare demand around UCR.
 *  - San Bernardino: an Inland Empire city with high uninsured rates, arena and
 *    event demand, and long freeway trips through the Cajon corridor.
 *  - Bakersfield: a Kern County hub with among the highest uninsured rates in the
 *    state, oilfield and agricultural traffic, and long rural trips.
 *
 * California rideshare law, applied accurately (identical to batch 1):
 *  - Coverage is period-based on the driver\u2019s app status: app off (personal
 *    auto only); app on, no ride accepted (contingent $50k/$100k/$30k); ride
 *    accepted through drop-off ($1,000,000 liability plus UM/UIM).
 *  - Proposition 22 classifies app-based drivers as independent contractors, so an
 *    injured rideshare driver generally cannot claim workers\u2019 compensation, but
 *    Prop 22 requires occupational-accident coverage for on-app injuries.
 *  - Pure comparative negligence, and the trip record from Uber or Lyft as the
 *    decisive proof of app status.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Which coverage period applies, how Proposition 22 affects a driver\u2019s own remedies, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const PERIODS =
  'Rideshare insurance in California works in periods tied to the driver\u2019s app status. With the app off, only the driver\u2019s personal auto policy applies. With the app on but no ride yet accepted, California law requires the company to provide contingent liability coverage of at least $50,000 per person, $100,000 per accident, and $30,000 for property damage. From the moment a ride is accepted through the end of the trip, a $1,000,000 third-party liability policy applies, along with uninsured/underinsured motorist coverage. Which layer responds turns entirely on the app status at the instant of the collision, so preserving the trip record from Uber or Lyft is essential.'

const PROP22 =
  'Under Proposition 22, app-based drivers are independent contractors, so an injured rideshare driver generally cannot claim workers\u2019 compensation; instead Prop 22 requires the company to carry occupational-accident coverage for injuries suffered while on the app. Passengers, other drivers, and pedestrians are not affected by this and look to the period-based liability policies.'

const WHO =
  'Who you are shapes the claim. A passenger is almost never at fault and can look to the $1,000,000 policy while a ride is underway. Another driver, a pedestrian, or a cyclist hit by a rideshare vehicle looks to whichever period-based layer matches the driver\u2019s app status. And a rideshare driver hurt on the job faces the Prop 22 occupational-accident question rather than workers\u2019 compensation.'

const UNINSURED =
  'The Central Valley and Inland Empire have among the highest uninsured-motorist rates in California, so when a rideshare vehicle is hit by an at-fault driver who has no insurance or too little, the uninsured/underinsured motorist coverage that rides with the $1,000,000 rideshare policy during an accepted trip is often the difference between a real recovery and none. Confirming the app status is what unlocks that UM/UIM layer.'

export const FRESNO_RIDESHARE_SLUG = '/fresno-rideshare-accident'
export const RIVERSIDE_RIDESHARE_SLUG = '/riverside-rideshare-accident'
export const SANBERNARDINO_RIDESHARE_SLUG = '/san-bernardino-rideshare-accident'
export const BAKERSFIELD_RIDESHARE_SLUG = '/bakersfield-rideshare-accident'

export const rideshareCityGuidePages3: LandingPage[] = [
  {
    slug: FRESNO_RIDESHARE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Rideshare Accident Claims',
    title: 'Fresno Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'A Fresno Uber or Lyft claim turns on the driver\u2019s app status at impact \u2014 and with Central Valley uninsured rates high, the UM/UIM coverage that rides with the $1M rideshare policy often matters most.',
    psychology: 'I was hurt in an Uber or Lyft in Fresno and do not know whose insurance applies, especially if the other driver had none.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno rideshare accident claim',
      'injured as an uber passenger fresno',
      'hit by an uninsured driver in a lyft california',
      'rideshare 1 million dollar policy california',
      'uber accident whose insurance fresno',
    ],
    signals: [
      'App status at impact',
      'Passenger vs third party',
      'Period 1 vs $1M policy',
      'High uninsured rate / UM-UIM',
      'Trip record preservation',
      'Prop 22 (driver claimant)',
    ],
    sections: {
      whyItMatters: `Fresno rideshare claims turn on the same pivot as anywhere in California \u2014 the driver\u2019s app status at the instant of the collision \u2014 but the Central Valley adds a decisive local factor. ${PERIODS} ${WHO} ${UNINSURED} Fresno\u2019s long trips on Highway 99 and the 41, and its downtown nightlife demand, mean rideshare vehicles are often on high-speed roads where a collision with an uninsured driver is both more likely and more serious. The practical problem is proof: insurers dispute which period applied, and the answer lives in the Uber or Lyft trip record, so requesting and preserving it early is decisive. For a rideshare driver hurt on the job, the analysis is different: ${PROP22} Pure comparative negligence applies, and a passenger is almost never assigned fault. Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'Whether you were a passenger, another driver, a pedestrian, or the rideshare driver',
        'The Uber or Lyft trip record, requested and preserved early',
        'Whether the at-fault driver was uninsured or underinsured',
        'Whether a ride had been accepted, triggering the $1M policy and its UM/UIM',
        'The names of both the rideshare and any other driver, and their insurers',
        'For a driver claimant, the Prop 22 occupational-accident coverage',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ organises a Fresno rideshare claim around the app status at impact, prompts to preserve the trip record, and \u2014 given the Valley\u2019s high uninsured rate \u2014 focuses on unlocking the UM/UIM coverage that rides with the $1M policy when the at-fault driver has none. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My Uber was hit by a driver with no insurance. Am I covered?',
        a: 'Often yes, if a ride was underway. The $1,000,000 rideshare policy includes uninsured/underinsured motorist coverage during an accepted trip, which is exactly the layer that responds when an at-fault driver has no insurance or too little \u2014 a common situation in the Central Valley. The trip record confirms the ride was in progress.',
      },
      {
        q: 'I was hurt as a passenger in an Uber in Fresno. Whose insurance pays?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy applies, along with UM/UIM coverage, and as a passenger you are almost never assigned fault. The trip record confirms the ride was in progress.',
      },
      {
        q: 'A Lyft driver hit me while I was walking or driving. What coverage applies?',
        a: 'It depends on the driver\u2019s app status at impact: personal insurance if the app was off, the contingent coverage ($50k/$100k/$30k) if the app was on but no ride accepted, and the $1,000,000 policy once a ride was accepted. Preserving the trip record establishes which layer responds.',
      },
      {
        q: 'I drive for Uber and was hurt on the job. Can I claim workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22 app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply; instead Prop 22 requires the company to carry occupational-accident coverage for on-app injuries.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage-period questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIVERSIDE_RIDESHARE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Rideshare Accident Claims',
    title: 'Riverside Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'A Riverside Uber or Lyft claim turns on the driver\u2019s app status at impact \u2014 and with Inland Empire uninsured rates high and long freeway trips common, the UM/UIM coverage that rides with the $1M policy often matters most.',
    psychology: 'I was hurt in an Uber or Lyft in the Inland Empire and do not know whose insurance applies, especially if the other driver had none.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside rideshare accident claim',
      'injured as an uber passenger riverside',
      'hit by an uninsured driver in a lyft california',
      'rideshare 1 million dollar policy california',
      'uber accident whose insurance inland empire',
    ],
    signals: [
      'App status at impact',
      'Passenger vs third party',
      'Period 1 vs $1M policy',
      'High uninsured rate / UM-UIM',
      'Long freeway trips (91/60/215)',
      'Prop 22 (driver claimant)',
    ],
    sections: {
      whyItMatters: `Riverside rideshare claims turn on the driver\u2019s app status at the instant of the collision, but the Inland Empire adds a decisive local factor. ${PERIODS} ${WHO} ${UNINSURED} Riverside\u2019s long commuter freeway trips on the 91, 60, and 215, together with heavy rideshare demand around UC Riverside, put rideshare vehicles on high-speed roads where a collision with an uninsured driver is both more likely and more serious. The practical problem is proof: insurers dispute which period applied, and the answer lives in the Uber or Lyft trip record, so requesting and preserving it early is decisive. For a rideshare driver hurt on the job, the analysis is different: ${PROP22} Pure comparative negligence applies, and a passenger is almost never assigned fault. Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'Whether you were a passenger, another driver, a pedestrian, or the rideshare driver',
        'The Uber or Lyft trip record, requested and preserved early',
        'Whether the at-fault driver was uninsured or underinsured',
        'Whether a ride had been accepted, triggering the $1M policy and its UM/UIM',
        'The names of both the rideshare and any other driver, and their insurers',
        'For a driver claimant, the Prop 22 occupational-accident coverage',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ organises a Riverside rideshare claim around the app status at impact, prompts to preserve the trip record, and \u2014 given the Inland Empire\u2019s high uninsured rate \u2014 focuses on unlocking the UM/UIM coverage that rides with the $1M policy when the at-fault driver has none. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My Uber was hit by an uninsured driver on the 91. Am I covered?',
        a: 'Often yes, if a ride was underway. The $1,000,000 rideshare policy includes uninsured/underinsured motorist coverage during an accepted trip, which is the layer that responds when an at-fault driver has no insurance or too little \u2014 a common situation in the Inland Empire. The trip record confirms the ride was in progress.',
      },
      {
        q: 'I was hurt as a passenger in an Uber in Riverside. Whose insurance pays?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy applies, along with UM/UIM coverage, and as a passenger you are almost never assigned fault. The trip record confirms the ride was in progress.',
      },
      {
        q: 'A Lyft driver hit me while I was walking or driving. What coverage applies?',
        a: 'It depends on the driver\u2019s app status at impact: personal insurance if the app was off, the contingent coverage ($50k/$100k/$30k) if the app was on but no ride accepted, and the $1,000,000 policy once a ride was accepted. Preserving the trip record establishes which layer responds.',
      },
      {
        q: 'I drive for Uber and was hurt on the job. Can I claim workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22 app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply; instead Prop 22 requires the company to carry occupational-accident coverage for on-app injuries.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage-period questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANBERNARDINO_RIDESHARE_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Rideshare Accident Claims',
    title: 'San Bernardino Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'A San Bernardino Uber or Lyft claim turns on the driver\u2019s app status at impact \u2014 and with Inland Empire uninsured rates high and long freeway and event trips common, the UM/UIM coverage that rides with the $1M policy often matters most.',
    psychology: 'I was hurt in an Uber or Lyft in San Bernardino and do not know whose insurance applies, especially if the other driver had none.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino rideshare accident claim',
      'injured as an uber passenger san bernardino',
      'hit by an uninsured driver in a lyft california',
      'rideshare 1 million dollar policy california',
      'uber accident whose insurance inland empire',
    ],
    signals: [
      'App status at impact',
      'Passenger vs third party',
      'Period 1 vs $1M policy',
      'High uninsured rate / UM-UIM',
      'Arena / event surge trips',
      'Prop 22 (driver claimant)',
    ],
    sections: {
      whyItMatters: `San Bernardino rideshare claims turn on the driver\u2019s app status at the instant of the collision, with the Inland Empire\u2019s decisive local factor. ${PERIODS} ${WHO} ${UNINSURED} San Bernardino\u2019s arena and event demand produces surges of trips at high-risk hours, and long freeway trips through the region and the Cajon corridor put rideshare vehicles on high-speed roads where an uninsured-driver collision is both more likely and more serious. The practical problem is proof: insurers dispute which period applied, and the answer lives in the Uber or Lyft trip record, so requesting and preserving it early is decisive. For a rideshare driver hurt on the job, the analysis is different: ${PROP22} Pure comparative negligence applies, and a passenger is almost never assigned fault. Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'Whether you were a passenger, another driver, a pedestrian, or the rideshare driver',
        'The Uber or Lyft trip record, requested and preserved early',
        'Whether the at-fault driver was uninsured or underinsured',
        'Whether a ride had been accepted, triggering the $1M policy and its UM/UIM',
        'Whether the trip was an event or arena surge pickup',
        'For a driver claimant, the Prop 22 occupational-accident coverage',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ organises a San Bernardino rideshare claim around the app status at impact, prompts to preserve the trip record, and \u2014 given the Inland Empire\u2019s high uninsured rate \u2014 focuses on unlocking the UM/UIM coverage that rides with the $1M policy when the at-fault driver has none. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My Uber was hit by an uninsured driver. Am I covered?',
        a: 'Often yes, if a ride was underway. The $1,000,000 rideshare policy includes uninsured/underinsured motorist coverage during an accepted trip, which is the layer that responds when an at-fault driver has no insurance or too little \u2014 a common situation in the Inland Empire. The trip record confirms the ride was in progress.',
      },
      {
        q: 'I was hurt as a passenger in an Uber in San Bernardino. Whose insurance pays?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy applies, along with UM/UIM coverage, and as a passenger you are almost never assigned fault. The trip record confirms the ride was in progress.',
      },
      {
        q: 'A Lyft driver hit me while I was walking or driving. What coverage applies?',
        a: 'It depends on the driver\u2019s app status at impact: personal insurance if the app was off, the contingent coverage ($50k/$100k/$30k) if the app was on but no ride accepted, and the $1,000,000 policy once a ride was accepted. Preserving the trip record establishes which layer responds.',
      },
      {
        q: 'I drive for Uber and was hurt on the job. Can I claim workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22 app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply; instead Prop 22 requires the company to carry occupational-accident coverage for on-app injuries.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage-period questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_RIDESHARE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Rideshare Accident Claims',
    title: 'Bakersfield Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'A Bakersfield Uber or Lyft claim turns on the driver\u2019s app status at impact \u2014 and with among the highest uninsured rates in the state, the UM/UIM coverage that rides with the $1M rideshare policy often matters most.',
    psychology: 'I was hurt in an Uber or Lyft in Bakersfield and do not know whose insurance applies, especially if the other driver had none.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield rideshare accident claim',
      'injured as an uber passenger bakersfield',
      'hit by an uninsured driver in a lyft california',
      'rideshare 1 million dollar policy california',
      'uber accident whose insurance bakersfield',
    ],
    signals: [
      'App status at impact',
      'Passenger vs third party',
      'Period 1 vs $1M policy',
      'Highest uninsured rates / UM-UIM',
      'Long rural / highway trips',
      'Prop 22 (driver claimant)',
    ],
    sections: {
      whyItMatters: `Bakersfield rideshare claims turn on the driver\u2019s app status at the instant of the collision, and Kern County sharpens the local factor more than almost anywhere. ${PERIODS} ${WHO} ${UNINSURED} Bakersfield has among the highest uninsured-motorist rates in California, and its long rural and highway trips, oilfield and agricultural traffic, and downtown nightlife demand put rideshare vehicles on high-speed roads where an uninsured-driver collision is both especially likely and especially serious. The practical problem is proof: insurers dispute which period applied, and the answer lives in the Uber or Lyft trip record, so requesting and preserving it early is decisive. For a rideshare driver hurt on the job, the analysis is different: ${PROP22} Pure comparative negligence applies, and a passenger is almost never assigned fault. Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'Whether you were a passenger, another driver, a pedestrian, or the rideshare driver',
        'The Uber or Lyft trip record, requested and preserved early',
        'Whether the at-fault driver was uninsured or underinsured',
        'Whether a ride had been accepted, triggering the $1M policy and its UM/UIM',
        'The names of both the rideshare and any other driver, and their insurers',
        'For a driver claimant, the Prop 22 occupational-accident coverage',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ organises a Bakersfield rideshare claim around the app status at impact, prompts to preserve the trip record, and \u2014 given Kern County\u2019s very high uninsured rate \u2014 focuses on unlocking the UM/UIM coverage that rides with the $1M policy when the at-fault driver has none. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My Uber was hit by an uninsured driver in Bakersfield. Am I covered?',
        a: 'Often yes, if a ride was underway. The $1,000,000 rideshare policy includes uninsured/underinsured motorist coverage during an accepted trip, which is the layer that responds when an at-fault driver has no insurance or too little \u2014 an especially common situation in Kern County. The trip record confirms the ride was in progress.',
      },
      {
        q: 'I was hurt as a passenger in an Uber in Bakersfield. Whose insurance pays?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy applies, along with UM/UIM coverage, and as a passenger you are almost never assigned fault. The trip record confirms the ride was in progress.',
      },
      {
        q: 'A Lyft driver hit me while I was walking or driving. What coverage applies?',
        a: 'It depends on the driver\u2019s app status at impact: personal insurance if the app was off, the contingent coverage ($50k/$100k/$30k) if the app was on but no ride accepted, and the $1,000,000 policy once a ride was accepted. Preserving the trip record establishes which layer responds.',
      },
      {
        q: 'I drive for Uber and was hurt on the job. Can I claim workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22 app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply; instead Prop 22 requires the company to carry occupational-accident coverage for on-app injuries.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage-period questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const rideshareCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [FRESNO_RIDESHARE_SLUG]: {
    scenario: `A passenger\u2019s Uber was hit on Highway 99 by a driver with no insurance. Because the ride was underway, the rideshare $1,000,000 policy\u2019s UM/UIM coverage applied, and the trip record proved the ride was in progress. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app status, the drivers, and whether the other driver was insured.'],
      ['First week', 'Report obtained; the Uber or Lyft trip record requested and preserved.'],
      ['First month', 'The correct coverage period and UM/UIM layer identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; the $1M policy applies during a ride.'],
      ['Third party', 'Coverage depends on the driver\u2019s app status.'],
      ['Uninsured hit', 'The $1M policy\u2019s UM/UIM responds during a ride.'],
      ['Driver claimant', 'Prop 22 occupational-accident coverage, not workers\u2019 comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The driver\u2019s app status at impact',
      'Whether the at-fault driver was uninsured or underinsured',
      'Whether the trip record was preserved',
      'Which coverage period and policy respond',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'App status controls', copy: 'The period at impact decides which policy pays.' },
      { label: 'UM/UIM is the key', copy: 'It responds when the at-fault driver has none.' },
      { label: 'Records settle disputes', copy: 'The trip record fixes the app status.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
    ],
    insuranceProblems: [
      'The insurer disputes which period applied.',
      'The UM/UIM layer is never invoked against an uninsured driver.',
      'The trip record is not preserved before it is needed.',
      'A passenger is wrongly told no coverage applies.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Was the at-fault driver insured?' },
      { label: 'Step 3', question: 'Has the Uber or Lyft trip record been preserved?' },
      { label: 'Step 4', question: 'Were you a passenger, third party, or the rideshare driver?' },
    ],
  },
  [RIVERSIDE_RIDESHARE_SLUG]: {
    scenario: `A passenger\u2019s Lyft was rear-ended on the 91 by an underinsured driver. Because the ride was underway, the rideshare $1,000,000 policy\u2019s UM/UIM coverage filled the gap, and the trip record proved the ride was in progress. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app status, the drivers, and whether the other driver was insured.'],
      ['First week', 'Report obtained; the Uber or Lyft trip record requested and preserved.'],
      ['First month', 'The correct coverage period and UM/UIM layer identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; the $1M policy applies during a ride.'],
      ['Third party', 'Coverage depends on the driver\u2019s app status.'],
      ['Underinsured hit', 'The $1M policy\u2019s UM/UIM fills the gap during a ride.'],
      ['Driver claimant', 'Prop 22 occupational-accident coverage, not workers\u2019 comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The driver\u2019s app status at impact',
      'Whether the at-fault driver was uninsured or underinsured',
      'Whether the trip record was preserved',
      'Which coverage period and policy respond',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'App status controls', copy: 'The period at impact decides which policy pays.' },
      { label: 'UM/UIM is the key', copy: 'It fills the gap when the at-fault driver has too little.' },
      { label: 'Records settle disputes', copy: 'The trip record fixes the app status.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
    ],
    insuranceProblems: [
      'The insurer disputes which period applied.',
      'The UM/UIM layer is never invoked against an underinsured driver.',
      'The trip record is not preserved before it is needed.',
      'A passenger is wrongly told no coverage applies.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Was the at-fault driver insured or underinsured?' },
      { label: 'Step 3', question: 'Has the Uber or Lyft trip record been preserved?' },
      { label: 'Step 4', question: 'Were you a passenger, third party, or the rideshare driver?' },
    ],
  },
  [SANBERNARDINO_RIDESHARE_SLUG]: {
    scenario: `A passenger left an arena event by Uber and was hit by an uninsured driver. Because the ride was underway, the rideshare $1,000,000 policy\u2019s UM/UIM coverage applied, and the trip record proved the ride was in progress. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app status, the drivers, and whether the other driver was insured.'],
      ['First week', 'Report obtained; the Uber or Lyft trip record requested and preserved.'],
      ['First month', 'The correct coverage period and UM/UIM layer identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; the $1M policy applies during a ride.'],
      ['Third party', 'Coverage depends on the driver\u2019s app status.'],
      ['Uninsured hit', 'The $1M policy\u2019s UM/UIM responds during a ride.'],
      ['Driver claimant', 'Prop 22 occupational-accident coverage, not workers\u2019 comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The driver\u2019s app status at impact',
      'Whether the at-fault driver was uninsured or underinsured',
      'Whether the trip record was preserved',
      'Which coverage period and policy respond',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'App status controls', copy: 'The period at impact decides which policy pays.' },
      { label: 'UM/UIM is the key', copy: 'It responds when the at-fault driver has none.' },
      { label: 'Records settle disputes', copy: 'The trip record fixes the app status.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
    ],
    insuranceProblems: [
      'The insurer disputes which period applied.',
      'The UM/UIM layer is never invoked against an uninsured driver.',
      'The trip record is not preserved before it is needed.',
      'A passenger is wrongly told no coverage applies.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Was the at-fault driver insured?' },
      { label: 'Step 3', question: 'Has the Uber or Lyft trip record been preserved?' },
      { label: 'Step 4', question: 'Were you a passenger, third party, or the rideshare driver?' },
    ],
  },
  [BAKERSFIELD_RIDESHARE_SLUG]: {
    scenario: `A passenger\u2019s Uber was struck on a rural highway by an uninsured driver. Because the ride was underway, the rideshare $1,000,000 policy\u2019s UM/UIM coverage applied \u2014 critical in a county with among the highest uninsured rates \u2014 and the trip record proved the ride was in progress. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app status, the drivers, and whether the other driver was insured.'],
      ['First week', 'Report obtained; the Uber or Lyft trip record requested and preserved.'],
      ['First month', 'The correct coverage period and UM/UIM layer identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; the $1M policy applies during a ride.'],
      ['Third party', 'Coverage depends on the driver\u2019s app status.'],
      ['Uninsured hit', 'The $1M policy\u2019s UM/UIM responds during a ride.'],
      ['Driver claimant', 'Prop 22 occupational-accident coverage, not workers\u2019 comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The driver\u2019s app status at impact',
      'Whether the at-fault driver was uninsured or underinsured',
      'Whether the trip record was preserved',
      'Which coverage period and policy respond',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'App status controls', copy: 'The period at impact decides which policy pays.' },
      { label: 'UM/UIM is the key', copy: 'Vital in a very high uninsured-rate county.' },
      { label: 'Records settle disputes', copy: 'The trip record fixes the app status.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
    ],
    insuranceProblems: [
      'The insurer disputes which period applied.',
      'The UM/UIM layer is never invoked against an uninsured driver.',
      'The trip record is not preserved before it is needed.',
      'A passenger is wrongly told no coverage applies.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Was the at-fault driver insured?' },
      { label: 'Step 3', question: 'Has the Uber or Lyft trip record been preserved?' },
      { label: 'Step 4', question: 'Were you a passenger, third party, or the rideshare driver?' },
    ],
  },
}
