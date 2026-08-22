import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, rideshare practice area: city-specific Uber/Lyft accident guides
 * for Los Angeles, San Francisco, San Diego, and Anaheim.
 *
 * These complement the statewide rideshare hub (value, SOL, hiring) with
 * genuinely local context rather than interpolated copy:
 *  - Los Angeles: the country's largest rideshare market, the centralised
 *    LAX-it pickup operation, and huge nightlife and event volume across a
 *    sprawling city that produces long, high-speed trips.
 *  - San Francisco: the origin city of Uber and Lyft, dense downtown and SFO
 *    traffic, and driverless robotaxis now carrying paying passengers on city
 *    streets, which raises a liability question with no human driver.
 *  - San Diego: heavy tourism and Gaslamp nightlife (rides taken specifically
 *    to avoid driving after drinking), an airport minutes from downtown, and
 *    cross-border trips to and from the San Ysidro port of entry.
 *  - Anaheim: the resort district (Disneyland, the convention center, the
 *    stadium and arena), where surge pickups, out-of-state tourist passengers,
 *    and event lets-out concentrate rideshare collisions.
 *
 * California rideshare law, applied accurately:
 *  - Coverage is period-based on the driver's app status. App off: personal
 *    auto only. App on, no ride accepted (Period 1): the company must provide
 *    contingent liability of at least $50,000 per person / $100,000 per
 *    accident / $30,000 property damage. Ride accepted through drop-off
 *    (Periods 2-3): a $1,000,000 third-party liability policy plus UM/UIM.
 *  - Proposition 22 classifies app-based drivers as independent contractors, so
 *    an injured rideshare driver generally cannot claim workers' compensation
 *    but Prop 22 requires the company to carry occupational-accident coverage
 *    for on-app injuries. Passengers and third parties are unaffected by this
 *    and look to the period-based policies above.
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

export const LA_RIDESHARE_SLUG = '/los-angeles-rideshare-accident'
export const SF_RIDESHARE_SLUG = '/san-francisco-rideshare-accident'
export const SD_RIDESHARE_SLUG = '/san-diego-rideshare-accident'
export const ANAHEIM_RIDESHARE_SLUG = '/anaheim-rideshare-accident'

export const rideshareCityGuidePages: LandingPage[] = [
  {
    slug: LA_RIDESHARE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Rideshare Accident Claims',
    title: 'Los Angeles Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Los Angeles is the country\u2019s largest rideshare market \u2014 LAX-it pickups, nightlife surges, and long freeway trips. An LA Uber or Lyft claim turns on the driver\u2019s app status at impact and which coverage period responds.',
    psychology: 'I was hurt in an Uber or Lyft in LA \u2014 as a passenger, another driver, or a pedestrian \u2014 and do not know whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles rideshare accident claim',
      'injured as an uber passenger los angeles',
      'hit by a lyft driver la whose insurance',
      'uber accident lax pickup claim',
      'rideshare 1 million dollar policy california',
    ],
    signals: [
      'App status at impact',
      'Passenger vs third party',
      'Period 1 vs $1M policy',
      'LAX-it pickup zone',
      'Trip record preservation',
      'Prop 22 (driver claimant)',
    ],
    sections: {
      whyItMatters: `Los Angeles is the largest rideshare market in the country, and its geography makes claims here both common and high-stakes. The centralised LAX-it pickup operation funnels enormous volumes of Uber and Lyft traffic into a single congested zone, nightlife and event demand across Hollywood, downtown and the Westside produces surges of trips at the highest-risk hours, and the city\u2019s sprawl means many rides are long freeway trips at speed. In every one of those situations, the claim turns on the same pivot: the driver\u2019s app status at the instant of the collision. ${PERIODS} ${WHO} The practical problem in LA is proof and volume. With so many vehicles operating, insurers routinely dispute which period applied \u2014 was the driver merely logged on, or had a ride been accepted? \u2014 and the answer lives in the trip record held by Uber or Lyft, which is why requesting and preserving it early is decisive. For a rideshare driver hurt on the job, the analysis is different again: ${PROP22} Pure comparative negligence means any genuine fault reduces rather than bars recovery, and a passenger is almost never assigned fault. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'Whether you were a passenger, another driver, a pedestrian, or the rideshare driver',
        'The Uber or Lyft trip record, requested and preserved early',
        'Whether the pickup was at LAX-it or another airport zone',
        'The names of both the rideshare and any other driver, and their insurers',
        'Whether a ride had been accepted, triggering the $1M policy',
        'For a driver claimant, the Prop 22 occupational-accident coverage',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ organises an LA rideshare claim around the one fact that controls it \u2014 the app status at impact \u2014 and prompts to preserve the Uber or Lyft trip record before it is disputed. It identifies whether you were a passenger or third party, points to the right coverage period, and flags the separate Prop 22 path for an injured driver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt as a passenger in an Uber in LA. Whose insurance pays?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy applies, along with uninsured/underinsured motorist coverage, and as a passenger you are almost never assigned fault. Whether the rideshare driver or another driver caused the crash, that coverage is generally available, and the trip record confirms the ride was in progress.',
      },
      {
        q: 'A Lyft driver hit me while I was walking or driving. What coverage applies?',
        a: 'It depends on the driver\u2019s app status at impact: personal insurance if the app was off, the state-mandated contingent coverage ($50k/$100k/$30k) if the app was on but no ride accepted, and the $1,000,000 policy once a ride was accepted or a passenger was aboard. Preserving the Uber or Lyft trip record is what establishes which layer responds.',
      },
      {
        q: 'The accident happened during an LAX pickup. Does that change anything?',
        a: 'The location does not change the coverage analysis \u2014 app status still controls \u2014 but LAX-it\u2019s dense, high-volume pickup operation produces frequent low-speed and merging collisions and makes identifying the correct driver, vehicle and trip record more important, since several rideshare vehicles are often involved in the same area.',
      },
      {
        q: 'I drive for Uber and was hurt on the job. Can I claim workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22 app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply; instead Prop 22 requires the company to carry occupational-accident coverage for on-app injuries. If another driver caused the crash, you may also have a claim against that driver.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage-period questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_RIDESHARE_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Rideshare Accident Claims',
    title: 'San Francisco Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Francisco is where Uber and Lyft began \u2014 and where driverless robotaxis now carry paying passengers. A San Francisco rideshare claim can turn on app-status coverage or, with no human driver, on the company and the vehicle maker.',
    psychology: 'I was hurt in a rideshare in San Francisco, maybe in a driverless car, and do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco rideshare accident claim',
      'injured in a waymo or driverless car san francisco',
      'hit by an uber driver sf whose insurance',
      'autonomous vehicle accident who is liable california',
      'rideshare 1 million dollar policy california',
    ],
    signals: [
      'App status at impact',
      'Autonomous robotaxi (no driver)',
      'Company / manufacturer liability',
      'Passenger vs third party',
      'Trip / vehicle data preservation',
      'Period 1 vs $1M policy',
    ],
    sections: {
      whyItMatters: `San Francisco is both the origin of the modern rideshare industry and the place where its next form is already on the streets, and a claim here can fall into either world. In the conventional world, an Uber or Lyft collision is governed by the same period-based coverage as anywhere in California, and San Francisco\u2019s dense downtown, steep and congested streets, and heavy SFO airport traffic make these collisions common. ${PERIODS} ${WHO} The distinctive San Francisco feature is the driverless robotaxi. Autonomous vehicles now carry paying passengers on city streets, and when one is involved in a collision there is no human driver to look to \u2014 responsibility shifts toward the company operating the fleet and, potentially, the manufacturer of the vehicle or its self-driving system, under ordinary negligence and product-liability principles. Those claims turn on data the vehicle itself records, which the operator controls, so preserving it through a prompt, formal demand is even more important than in a conventional case. Whether the injured person is a passenger inside the robotaxi, another driver, or a pedestrian, the vehicle\u2019s sensor and event data is often the clearest account of what happened. For a conventional rideshare driver hurt on the job: ${PROP22} Pure comparative negligence applies throughout, and a passenger is almost never assigned fault. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether the vehicle was a conventional rideshare or a driverless robotaxi',
        'For a robotaxi, the operating company and the vehicle or system maker',
        'For a robotaxi, prompt preservation of the vehicle\u2019s sensor and event data',
        'For a conventional rideshare, the driver\u2019s app status at impact',
        'The Uber or Lyft trip record, requested and preserved early',
        'Whether you were a passenger, another driver, or a pedestrian',
        'For a driver claimant, the Prop 22 occupational-accident coverage',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ first asks whether the vehicle was a conventional rideshare or a driverless robotaxi, because the answer changes who is responsible and what evidence matters. For a robotaxi it points toward the operator and manufacturer and the vehicle\u2019s recorded data; for a conventional trip it fixes the app status and preserves the trip record. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt in a driverless robotaxi in San Francisco. Who is responsible?',
        a: 'With no human driver, responsibility shifts toward the company operating the fleet and, potentially, the maker of the vehicle or its self-driving system, under negligence and product-liability principles. These claims turn heavily on the vehicle\u2019s own sensor and event data, which the operator controls, so a prompt, formal demand to preserve that data is critical.',
      },
      {
        q: 'A self-driving car hit me while I was walking. Is that different from a normal car claim?',
        a: 'Yes. Because there is no driver whose conduct and insurance you can point to, the claim looks to the operating company and possibly the manufacturer, and the best evidence is the data the vehicle recorded rather than a driver\u2019s account. Identifying the operator and preserving that data early is the key first step.',
      },
      {
        q: 'I was a passenger in a regular Uber in SF. Whose insurance applies?',
        a: 'While your ride was underway, a $1,000,000 third-party liability policy applies, along with uninsured/underinsured motorist coverage, and as a passenger you are almost never assigned fault. The trip record confirms the ride was in progress, which is why preserving it early matters.',
      },
      {
        q: 'A Lyft driver hit me. How is coverage decided?',
        a: 'By the driver\u2019s app status at impact: personal insurance if the app was off, the contingent coverage ($50k/$100k/$30k) if the app was on with no ride accepted, and the $1,000,000 policy once a ride was accepted or a passenger aboard. The Uber or Lyft trip record establishes which layer responds.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and liability questions \u2014 including for driverless vehicles \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_RIDESHARE_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Rideshare Accident Claims',
    title: 'San Diego Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego\u2019s tourism, Gaslamp nightlife, downtown airport, and cross-border trips make rideshare heavy here. A San Diego Uber or Lyft claim still turns on the driver\u2019s app status and which coverage period responds.',
    psychology: 'I was hurt in a rideshare in San Diego \u2014 after a night out, from the airport, or near the border \u2014 and do not know whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego rideshare accident claim',
      'injured as an uber passenger san diego',
      'hit by a lyft driver san diego whose insurance',
      'rideshare accident gaslamp or airport san diego',
      'rideshare 1 million dollar policy california',
    ],
    signals: [
      'App status at impact',
      'Nightlife / airport / border trip',
      'Passenger vs third party',
      'Period 1 vs $1M policy',
      'Trip record preservation',
      'Out-of-state tourist passenger',
    ],
    sections: {
      whyItMatters: `San Diego generates heavy rideshare volume for reasons rooted in how people move through the city. The Gaslamp Quarter and the wider nightlife economy produce a steady stream of trips taken specifically to avoid driving after drinking, concentrated at late hours when roads are most dangerous; San Diego International Airport sits minutes from downtown, funneling constant airport trips through congested surface streets; and the region\u2019s position on the border adds cross-border trips to and from the San Ysidro port of entry. Tourists make up a large share of passengers, which matters if a claim involves an out-of-state injured person, though a San Diego collision is governed by California law regardless. Across all of these, the coverage analysis is the same. ${PERIODS} ${WHO} Because so many San Diego rides happen at night and involve visitors unfamiliar with the area, disputes about what happened are common, and the objective anchor is the trip record held by Uber or Lyft, which fixes the app status and confirms whether a ride was underway. Preserving it early is the single most useful step. For a rideshare driver hurt on the job: ${PROP22} Pure comparative negligence applies, and a passenger is almost never assigned fault. Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'Whether you were a passenger, another driver, a pedestrian, or the rideshare driver',
        'The Uber or Lyft trip record, requested and preserved early',
        'Whether the trip was nightlife-related, an airport run, or cross-border',
        'The names of both the rideshare and any other driver, and their insurers',
        'Whether a ride had been accepted, triggering the $1M policy',
        'For an out-of-state passenger, their own insurer details',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ anchors a San Diego rideshare claim to the app status at impact and prompts to preserve the Uber or Lyft trip record early \u2014 especially valuable for the late-night and airport trips where accounts conflict. It identifies whether you were a passenger or third party and points to the right coverage period. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt in an Uber after a night out in the Gaslamp. Whose insurance pays?',
        a: 'While your ride was underway, a $1,000,000 third-party liability policy applies, along with uninsured/underinsured motorist coverage, and as a passenger you are almost never assigned fault. That coverage generally applies whether the rideshare driver or another driver caused the crash, and the trip record confirms the ride was in progress.',
      },
      {
        q: 'A Lyft driver hit me near the airport. What coverage applies?',
        a: 'It depends on the driver\u2019s app status at impact: personal insurance if the app was off, the contingent coverage ($50k/$100k/$30k) if the app was on with no ride accepted, and the $1,000,000 policy once a ride was accepted or a passenger aboard. The Uber or Lyft trip record establishes which layer responds.',
      },
      {
        q: 'I am from out of state and was hurt in a San Diego rideshare. Does California law apply?',
        a: 'Yes. A collision that happens in California is governed by California law, including the rideshare coverage periods and comparative-fault rules, even if you and your own insurer are from another state. Your out-of-state coverage may matter for medical payments, but the California rideshare policies drive the liability claim.',
      },
      {
        q: 'I drive for a rideshare and was hurt on the job. Can I claim workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22, app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply; instead Prop 22 requires the company to carry occupational-accident coverage for on-app injuries, and you may also have a claim against an at-fault driver.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage-period questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_RIDESHARE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Rideshare Accident Claims',
    title: 'Anaheim Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Anaheim\u2019s resort district fills with rideshare around Disneyland, the convention center, and the stadium and arena. An Anaheim Uber or Lyft claim turns on the driver\u2019s app status \u2014 and often on an out-of-state tourist passenger.',
    psychology: 'I was hurt in a rideshare near the Anaheim resort district and do not know whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim rideshare accident claim',
      'injured as an uber passenger anaheim disneyland',
      'hit by a lyft driver anaheim whose insurance',
      'rideshare accident near the convention center',
      'rideshare 1 million dollar policy california',
    ],
    signals: [
      'App status at impact',
      'Resort-district surge pickup',
      'Out-of-state tourist passenger',
      'Event lets-out traffic',
      'Passenger vs third party',
      'Period 1 vs $1M policy',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s rideshare volume is driven almost entirely by the resort district. Disneyland and the convention center draw millions of visitors, Angel Stadium and the Honda Center empty tens of thousands of people onto the surrounding boulevards at once, and the result is intense surge pickup activity along Harbor, Katella and Ball, often at night and often involving out-of-state passengers unfamiliar with the area. That concentration produces a distinctive mix of low-speed pickup and drop-off collisions in crowded loading zones and higher-speed collisions as vehicles move through event traffic. Across all of it, the coverage question is the same. ${PERIODS} ${WHO} The tourist factor adds one wrinkle: an out-of-state injured passenger is still protected by California law for a collision that happens here, though their own insurer may come into play for medical payments. Because resort-area pickups are chaotic and drivers are frequently circling or queuing, whether a ride had actually been accepted at the moment of a collision is often genuinely disputed, and the trip record held by Uber or Lyft is what resolves it \u2014 so preserving it early is essential. For a rideshare driver hurt on the job: ${PROP22} Pure comparative negligence applies, and a passenger is almost never assigned fault. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'Whether you were a passenger, another driver, a pedestrian, or the rideshare driver',
        'The Uber or Lyft trip record, requested and preserved early',
        'Whether the pickup was in a resort-district loading zone',
        'Whether an event was letting out at the time',
        'For an out-of-state passenger, their own insurer details',
        'Whether a ride had been accepted, triggering the $1M policy',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ fixes an Anaheim rideshare claim to the app status at impact and prompts to preserve the trip record early \u2014 crucial in chaotic resort-district pickups where whether a ride had been accepted is often disputed. It identifies whether you were a passenger or third party, handles the out-of-state passenger wrinkle, and points to the right coverage period. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt as an Uber passenger near Disneyland. Whose insurance pays?',
        a: 'While your ride was underway, a $1,000,000 third-party liability policy applies, along with uninsured/underinsured motorist coverage, and as a passenger you are almost never assigned fault. That coverage generally applies whether the rideshare driver or another driver caused the crash, and the trip record confirms the ride was in progress.',
      },
      {
        q: 'The pickup was chaotic and I am not sure the ride had started. Does that matter?',
        a: 'It matters a great deal, because coverage depends on the app status at impact: the contingent coverage ($50k/$100k/$30k) applies if the app was on with no ride accepted, and the $1,000,000 policy applies once a ride was accepted or a passenger aboard. In busy resort pickups this is often disputed, and the Uber or Lyft trip record is what resolves it.',
      },
      {
        q: 'I am visiting from out of state and was hurt in an Anaheim rideshare. Does California law apply?',
        a: 'Yes. A collision in California is governed by California law, including the rideshare coverage periods and comparative-fault rules, even if you and your insurer are from another state. Your own coverage may matter for medical payments, but the California rideshare policies drive the liability claim.',
      },
      {
        q: 'I drive for a rideshare and was hurt working the resort district. Can I claim workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22, app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply; instead Prop 22 requires the company to carry occupational-accident coverage for on-app injuries, and you may also have a claim against an at-fault driver.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage-period questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const rideshareCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_RIDESHARE_SLUG]: {
    scenario: `A passenger was hurt when her Uber was rear-ended on the 10, and the other driver was underinsured. Because the ride was underway, the rideshare $1,000,000 policy and its UM/UIM applied, and the trip record proved the ride was in progress. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app status, the drivers, and whether a ride was underway.'],
      ['First week', 'Report obtained; the Uber or Lyft trip record requested and preserved.'],
      ['First month', 'The correct coverage period and every insurer identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; the $1M policy applies during a ride.'],
      ['Third party', 'Coverage depends on the driver\u2019s app status.'],
      ['Period 1', 'App on, no ride accepted; only contingent coverage applies.'],
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
      'Whether the trip record was preserved',
      'Whether you were a passenger or a third party',
      'Which coverage period and policy respond',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'App status controls', copy: 'The period at impact decides which policy pays.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
      { label: 'Records settle disputes', copy: 'The trip record fixes the app status.' },
      { label: 'Drivers differ', copy: 'Prop 22 replaces workers\u2019 comp with occupational coverage.' },
    ],
    insuranceProblems: [
      'The insurer disputes which period applied.',
      'The trip record is not preserved before it is needed.',
      'A passenger is wrongly told no coverage applies.',
      'A driver is pushed toward the wrong benefit system.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Were you a passenger, third party, or the rideshare driver?' },
      { label: 'Step 3', question: 'Has the Uber or Lyft trip record been preserved?' },
      { label: 'Step 4', question: 'Which drivers and insurers were involved?' },
    ],
  },
  [SF_RIDESHARE_SLUG]: {
    scenario: `A pedestrian was struck by a driverless robotaxi downtown, and there was no driver to claim against. The claim looked to the operating company and the vehicle maker, and a prompt demand preserved the sensor data that showed what happened. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the vehicle was driverless; identify the operator.'],
      ['First week', 'Report obtained; a demand sent to preserve vehicle or trip data.'],
      ['First month', 'The responsible parties \u2014 operator, maker, or driver \u2014 identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; the $1M policy applies in a conventional ride.'],
      ['Third party', 'Coverage depends on the conventional driver\u2019s app status.'],
      ['Robotaxi', 'No driver; operator and manufacturer come into focus.'],
      ['Driver claimant', 'Prop 22 occupational-accident coverage, not workers\u2019 comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the vehicle was driverless or conventional',
      'For a robotaxi, preservation of the vehicle\u2019s data',
      'For a robotaxi, the operator and manufacturer identified',
      'For a conventional ride, the app status at impact',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'No driver changes it', copy: 'Robotaxi claims look to the operator and maker.' },
      { label: 'Data is the account', copy: 'Sensor and event data replace a driver\u2019s story.' },
      { label: 'App status controls', copy: 'Conventional rides turn on the coverage period.' },
      { label: 'Preserve early', copy: 'The operator controls the data; demand it promptly.' },
    ],
    insuranceProblems: [
      'A robotaxi claim is treated as an ordinary car claim and stalls.',
      'The vehicle\u2019s data is lost before it is demanded.',
      'The operator and manufacturer are never both identified.',
      'A passenger is wrongly told no coverage applies.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the vehicle driverless or a conventional rideshare?' },
      { label: 'Step 2', question: 'If driverless, which company operated it?' },
      { label: 'Step 3', question: 'Has a demand been made to preserve the vehicle data?' },
      { label: 'Step 4', question: 'For a conventional ride, what was the app status at impact?' },
    ],
  },
  [SD_RIDESHARE_SLUG]: {
    scenario: `A passenger heading home from the Gaslamp late at night was hurt when the Uber was hit at an intersection. The late-hour accounts conflicted, but the trip record fixed the app status and the $1,000,000 policy applied. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app status, the drivers, and whether a ride was underway.'],
      ['First week', 'Report obtained; the Uber or Lyft trip record requested and preserved.'],
      ['First month', 'The correct coverage period and every insurer identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; the $1M policy applies during a ride.'],
      ['Third party', 'Coverage depends on the driver\u2019s app status.'],
      ['Period 1', 'App on, no ride accepted; only contingent coverage applies.'],
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
      'Whether the trip record was preserved',
      'Whether you were a passenger or a third party',
      'Which coverage period and policy respond',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'App status controls', copy: 'The period at impact decides which policy pays.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
      { label: 'Records settle disputes', copy: 'The trip record fixes the app status at night.' },
      { label: 'Visitors are covered', copy: 'California law governs regardless of home state.' },
    ],
    insuranceProblems: [
      'Conflicting late-night accounts are used to dispute the period.',
      'The trip record is not preserved before it is needed.',
      'An out-of-state passenger is wrongly told to use only home coverage.',
      'A driver is pushed toward the wrong benefit system.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Were you a passenger, third party, or the rideshare driver?' },
      { label: 'Step 3', question: 'Has the Uber or Lyft trip record been preserved?' },
      { label: 'Step 4', question: 'Was the trip nightlife, airport, or cross-border related?' },
    ],
  },
  [ANAHEIM_RIDESHARE_SLUG]: {
    scenario: `An out-of-state visitor was hurt in a resort-district pickup when the ride was rear-ended in a crowded loading zone. The insurer argued the ride had not started, but the trip record showed it had, triggering the $1,000,000 policy. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the app status, the loading zone, and whether a ride was underway.'],
      ['First week', 'Report obtained; the Uber or Lyft trip record requested and preserved.'],
      ['First month', 'The correct coverage period and every insurer identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; the $1M policy applies during a ride.'],
      ['Third party', 'Coverage depends on the driver\u2019s app status.'],
      ['Disputed pickup', 'Whether a ride had been accepted is contested.'],
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
      'Whether the trip record was preserved',
      'Whether you were a passenger or a third party',
      'Which coverage period and policy respond',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'App status controls', copy: 'The period at impact decides which policy pays.' },
      { label: 'Pickups are disputed', copy: 'The trip record resolves whether a ride had started.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
      { label: 'Visitors are covered', copy: 'California law governs regardless of home state.' },
    ],
    insuranceProblems: [
      'The insurer claims the ride had not yet started.',
      'The trip record is not preserved before it is needed.',
      'An out-of-state passenger is wrongly told to use only home coverage.',
      'A driver is pushed toward the wrong benefit system.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Were you a passenger, third party, or the rideshare driver?' },
      { label: 'Step 3', question: 'Has the Uber or Lyft trip record been preserved?' },
      { label: 'Step 4', question: 'Was the pickup in a resort-district loading zone?' },
    ],
  },
}
