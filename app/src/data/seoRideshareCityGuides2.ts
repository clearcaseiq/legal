import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, rideshare practice area (batch 2): city-specific Uber/Lyft accident
 * guides for San Jose, Sacramento, Oakland, and Long Beach.
 *
 * These round out the rideshare geo hub (batch 1 covered Los Angeles, San
 * Francisco, San Diego, and Anaheim) with genuinely local context:
 *  - San Jose: Silicon Valley commuter and tech-campus rideshare volume, San
 *    Jose Mineta airport runs, the expansion of driverless robotaxis into the
 *    South Bay, and self-funded (ERISA) health plans that take a large lien.
 *  - Sacramento: airport (SMF) runs, downtown nightlife and event lets-out, and
 *    a large state-worker commuter base where transit gaps push riders to
 *    rideshare.
 *  - Oakland: Oakland airport (OAK) runs, East Bay nightlife, and driverless
 *    expansion across the region, plus dense freeway trips.
 *  - Long Beach: Long Beach airport (LGB) and nearby LAX runs, the port and
 *    downtown nightlife, and tourism around the Queen Mary, aquarium, and
 *    convention center.
 *
 * California rideshare law, applied accurately:
 *  - Coverage is period-based on the driver's app status. App off: personal
 *    auto only. App on, no ride accepted (Period 1): at least $50,000 / $100,000
 *    / $30,000 contingent liability. Ride accepted through drop-off (Periods
 *    2-3): a $1,000,000 third-party liability policy plus UM/UIM.
 *  - Proposition 22 classifies app-based drivers as independent contractors, so
 *    an injured driver generally cannot claim workers' compensation but the
 *    company must carry occupational-accident coverage for on-app injuries;
 *    passengers and third parties are unaffected.
 *  - Pure comparative negligence, and the Uber/Lyft trip record as the decisive
 *    proof of app status.
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

export const SJ_RIDESHARE_SLUG = '/san-jose-rideshare-accident'
export const SAC_RIDESHARE_SLUG = '/sacramento-rideshare-accident'
export const OAKLAND_RIDESHARE_SLUG = '/oakland-rideshare-accident'
export const LONGBEACH_RIDESHARE_SLUG = '/long-beach-rideshare-accident'

export const rideshareCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_RIDESHARE_SLUG,
    category: 'Cities',
    cluster: 'San Jose Rideshare Accident Claims',
    title: 'San Jose Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Jose\u2019s tech-campus commutes, airport runs, and expanding driverless robotaxis shape its Uber and Lyft claims. Which coverage responds turns on the driver\u2019s app status \u2014 and a Silicon Valley health plan may take a large lien.',
    psychology: 'I was hurt in an Uber or Lyft in San Jose and do not know whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose rideshare accident claim',
      'injured as an uber passenger san jose',
      'uber lyft insurance coverage periods california',
      'driverless robotaxi accident who is liable',
      'hit by a lyft driver san jose',
    ],
    signals: [
      'Period-based coverage',
      '$1M during a trip',
      'Driverless robotaxi liability',
      'Self-funded (ERISA) health lien',
      'Prop 22 driver coverage',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Jose rideshare claims come out of Silicon Valley\u2019s commuting patterns: heavy tech-campus and downtown trips, steady San Jose Mineta airport runs, and long freeway rides on the 101, 280 and 880. As everywhere in California, the coverage question is period-based. ${PERIODS} ${WHO} The South Bay adds two local wrinkles. The first is the arrival of driverless robotaxis, which are expanding into the region and raise a liability question with no human driver \u2014 pointing responsibility toward the operating company and the vehicle\u2019s technology rather than a person, and making the vehicle\u2019s data and the company\u2019s policies central. The second is health coverage: many Silicon Valley workers are covered by large employers\u2019 self-funded (ERISA) health plans, which often assert a substantial reimbursement lien against any recovery, so accounting for that lien early is important to what an injured person actually keeps. ${PROP22} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs. Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'The Uber or Lyft trip record confirming the period',
        'Whether the vehicle was a driverless robotaxi',
        'Whether you were a passenger, another driver, or a pedestrian',
        'Whether your health plan is a self-funded (ERISA) plan',
        'Whether you are the rideshare driver (Prop 22 coverage)',
        'The other driver\u2019s insurance and any UM/UIM coverage',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ pins down the app status and preserves the trip record that decides which San Jose rideshare policy responds, flags a driverless-robotaxi collision as a distinct liability question, and surfaces a self-funded ERISA lien early so it does not surprise the injured person at the end. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was a passenger in an Uber in San Jose. Whose insurance covers me?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy generally applies, along with uninsured/underinsured motorist coverage, and as a passenger you are almost never at fault. Confirming the app status through the trip record locks in that the trip-period coverage applies.',
      },
      {
        q: 'I was hit by a driverless robotaxi. Who is responsible?',
        a: 'A collision with a driverless vehicle points responsibility toward the operating company and the vehicle\u2019s technology rather than a human driver, which makes the vehicle\u2019s data and the company\u2019s policies central. These claims are newer and more complex, so preserving the vehicle and event data early is especially important.',
      },
      {
        q: 'Why does my health insurance matter to my recovery?',
        a: 'Many Silicon Valley workers have large employer self-funded (ERISA) health plans, which often assert a substantial reimbursement lien against any recovery. Accounting for that lien early affects what you actually keep, so it should be identified and addressed as part of the claim rather than at the end.',
      },
      {
        q: 'I drive for Uber and was hurt on the job. Can I get workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22, app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply. Instead Prop 22 requires the company to carry occupational-accident coverage for injuries suffered while on the app, which is a different benefit with its own terms.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage and lien questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_RIDESHARE_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Rideshare Accident Claims',
    title: 'Sacramento Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sacramento\u2019s airport runs, downtown nightlife, and state-worker commutes drive its Uber and Lyft claims. Which coverage responds depends entirely on the driver\u2019s app status at the moment of the crash.',
    psychology: 'I was hurt in an Uber or Lyft in Sacramento and do not know whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento rideshare accident claim',
      'injured as an uber passenger sacramento',
      'uber lyft insurance coverage periods california',
      'hit by a lyft driver sacramento',
      'rideshare accident airport pickup claim',
    ],
    signals: [
      'Period-based coverage',
      '$1M during a trip',
      'Airport / nightlife trips',
      'Prop 22 driver coverage',
      'UM/UIM coverage',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Sacramento rideshare claims cluster around three local patterns: airport runs to and from Sacramento International (SMF), downtown nightlife and event lets-out where people deliberately take a ride instead of driving after drinking, and the commutes of a large state-worker population served by patchy late-night transit. In all of them the coverage analysis is the same period-based framework. ${PERIODS} ${WHO} The nightlife pattern matters because a rider who did the responsible thing \u2014 taking an Uber home rather than driving \u2014 and is then hurt in a crash is squarely a passenger looking to the trip-period $1,000,000 policy, and should never be made to feel the incident was their fault. Airport pickups add a wrinkle around the exact moment of app status during staging and dispatch, which the trip record resolves. ${PROP22} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'The Uber or Lyft trip record confirming the period',
        'Whether you were a passenger, another driver, or a pedestrian',
        'Whether the trip was an airport pickup or nightlife ride',
        'The other driver\u2019s insurance and any UM/UIM coverage',
        'Whether you are the rideshare driver (Prop 22 coverage)',
        'Any witnesses to the collision',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ locks down the app status and trip record that decide which Sacramento rideshare policy responds, treats a nightlife passenger as the almost-never-at-fault claimant they are, and resolves the airport-staging app-status question. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I took an Uber home from downtown to avoid driving and got hurt in a crash. Whose insurance covers me?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy generally applies, along with uninsured/underinsured motorist coverage, and as a passenger you are almost never at fault. Doing the responsible thing and taking a ride does not reduce your claim \u2014 confirming the app status through the trip record locks in the trip-period coverage.',
      },
      {
        q: 'The crash happened during an airport pickup. Does that affect coverage?',
        a: 'It can, because coverage depends on the exact app status \u2014 waiting, matched, or on the trip \u2014 and airport staging and dispatch can blur the moment. The Uber or Lyft trip record resolves which period applied at the instant of the collision, which is why preserving it is essential.',
      },
      {
        q: 'A rideshare driver hit me while I was driving. Which policy applies?',
        a: 'Whichever period matches the driver\u2019s app status at impact: personal auto if the app was off, the contingent $50,000/$100,000/$30,000 layer if the app was on with no ride accepted, and the $1,000,000 policy if a ride was accepted or underway. The trip record establishes which.',
      },
      {
        q: 'I drive for Lyft and was hurt on the job. Can I get workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22, app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply. Prop 22 instead requires the company to carry occupational-accident coverage for injuries suffered while on the app.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAKLAND_RIDESHARE_SLUG,
    category: 'Cities',
    cluster: 'Oakland Rideshare Accident Claims',
    title: 'Oakland Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Oakland\u2019s airport runs, East Bay nightlife, and expanding driverless robotaxis shape its Uber and Lyft claims. Which coverage responds turns on the driver\u2019s app status at the moment of the crash.',
    psychology: 'I was hurt in an Uber or Lyft in Oakland and do not know whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland rideshare accident claim',
      'injured as an uber passenger oakland',
      'uber lyft insurance coverage periods california',
      'driverless robotaxi accident who is liable',
      'hit by a lyft driver oakland',
    ],
    signals: [
      'Period-based coverage',
      '$1M during a trip',
      'Airport / nightlife trips',
      'Driverless robotaxi liability',
      'Prop 22 driver coverage',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Oakland rideshare claims are driven by East Bay travel: Oakland International (OAK) airport runs, downtown and Jack London nightlife, and dense freeway trips across the 880, 580 and 980. The coverage analysis is the same period-based framework used statewide. ${PERIODS} ${WHO} Two local factors stand out. The first is the spread of driverless robotaxis across the region, which raises a liability question with no human driver and points responsibility toward the operating company and the vehicle\u2019s technology, making the vehicle\u2019s data and the company\u2019s policies central. The second is the nightlife pattern \u2014 riders who take a ride specifically to avoid driving after drinking and are then hurt are passengers looking to the trip-period $1,000,000 policy, and should not be made to feel the crash was their fault. Airport pickups again raise an app-status timing question the trip record resolves. ${PROP22} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'The Uber or Lyft trip record confirming the period',
        'Whether the vehicle was a driverless robotaxi',
        'Whether you were a passenger, another driver, or a pedestrian',
        'Whether the trip was an airport pickup or nightlife ride',
        'The other driver\u2019s insurance and any UM/UIM coverage',
        'Whether you are the rideshare driver (Prop 22 coverage)',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ establishes the app status and preserves the trip record that decide which Oakland rideshare policy responds, flags a driverless-robotaxi collision as a distinct liability question, and treats a nightlife passenger as the almost-never-at-fault claimant they are. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was a passenger in a Lyft in Oakland. Whose insurance covers me?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy generally applies, along with uninsured/underinsured motorist coverage, and as a passenger you are almost never at fault. Confirming the app status through the trip record locks in that the trip-period coverage applies.',
      },
      {
        q: 'I was hit by a driverless robotaxi. Who is responsible?',
        a: 'A collision with a driverless vehicle points responsibility toward the operating company and the vehicle\u2019s technology rather than a human driver, making the vehicle\u2019s data and the company\u2019s policies central. These claims are newer and more complex, so preserving the vehicle and event data early is especially important.',
      },
      {
        q: 'I took a ride to avoid driving after drinking and got hurt. Does that hurt my claim?',
        a: 'No. As a passenger you are almost never at fault, and doing the responsible thing by taking a ride does not reduce your claim. While the ride was underway, the trip-period $1,000,000 policy generally applies.',
      },
      {
        q: 'I drive for Uber and was hurt on the job. Can I get workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22, app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply. Prop 22 instead requires the company to carry occupational-accident coverage for injuries suffered while on the app.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LONGBEACH_RIDESHARE_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Rideshare Accident Claims',
    title: 'Long Beach Rideshare Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Long Beach rideshare trips run to Long Beach and nearby LAX airports, the port, and downtown nightlife and tourism. Which coverage responds turns on the driver\u2019s app status at the moment of the crash.',
    psychology: 'I was hurt in an Uber or Lyft in Long Beach and do not know whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach rideshare accident claim',
      'injured as an uber passenger long beach',
      'uber lyft insurance coverage periods california',
      'hit by a lyft driver long beach',
      'rideshare accident airport pickup claim',
    ],
    signals: [
      'Period-based coverage',
      '$1M during a trip',
      'Airport (LGB / LAX) trips',
      'Nightlife / tourism rides',
      'Prop 22 driver coverage',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Long Beach rideshare claims come from a distinctive travel mix: runs to Long Beach Airport (LGB) and to nearby LAX, port and downtown business trips, and heavy nightlife and tourism around the Queen Mary, the aquarium, the convention center, and the waterfront. The coverage question follows the statewide period-based framework. ${PERIODS} ${WHO} The tourism pattern means many injured passengers are visitors who take a ride specifically to get around without a car, and a fall or crash in California is governed by California law regardless of where the passenger lives, so an out-of-area visitor can still pursue the claim \u2014 though gathering the trip record and evidence before leaving helps. The airport pattern, with LAX pickups often routed and staged, again raises an app-status timing question the trip record resolves. ${PROP22} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s app status at the moment of impact',
        'The Uber or Lyft trip record confirming the period',
        'Whether you were a passenger, another driver, or a pedestrian',
        'Whether the trip was an LGB or LAX airport run',
        'Whether you are an out-of-area visitor',
        'The other driver\u2019s insurance and any UM/UIM coverage',
        'Whether you are the rideshare driver (Prop 22 coverage)',
        'Medical treatment from first response onward, before leaving town',
      ],
      howClearCaseHelps: `ClearCaseIQ nails down the app status and preserves the trip record that decide which Long Beach rideshare policy responds, resolves the airport-staging timing question, and handles the out-of-area visitor problem by prompting to gather the trip record and evidence before departure. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was a passenger in an Uber in Long Beach. Whose insurance covers me?',
        a: 'While a ride is underway, a $1,000,000 third-party liability policy generally applies, along with uninsured/underinsured motorist coverage, and as a passenger you are almost never at fault. Confirming the app status through the trip record locks in that the trip-period coverage applies.',
      },
      {
        q: 'I was visiting and have gone home. Can I still make a claim?',
        a: 'Yes. A crash in California is governed by California law regardless of where you live, and you can pursue the claim from out of state. Because evidence is harder to gather after you leave, it helps to obtain the trip record and any incident details before departure.',
      },
      {
        q: 'The crash happened during an LAX pickup. Does that affect coverage?',
        a: 'It can, because coverage depends on the exact app status \u2014 waiting, matched, or on the trip \u2014 and airport staging and routing can blur the moment. The Uber or Lyft trip record resolves which period applied at the instant of the collision, so preserving it is essential.',
      },
      {
        q: 'I drive for Lyft and was hurt on the job. Can I get workers\u2019 comp?',
        a: 'Generally no. Under Proposition 22, app-based drivers are independent contractors, so workers\u2019 compensation usually does not apply. Prop 22 instead requires the company to carry occupational-accident coverage for injuries suffered while on the app.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const rideshareCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_RIDESHARE_SLUG]: {
    scenario: `A tech worker riding home from a campus in an Uber was hurt when the driver was rear-ended, and a self-funded health plan asserted a large lien. The trip record confirmed the $1M trip-period coverage, and the ERISA lien was addressed early so the recovery held its value. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Screenshot the active trip; get the driver and other-driver insurance.'],
      ['First days', 'Trip record preserved; the coverage period confirmed.'],
      ['First weeks', 'Any self-funded ERISA lien identified and addressed.'],
      ['Longer term', 'Treatment documented and the claim positioned.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; looks to the $1M trip policy.'],
      ['Third party', 'Coverage matches the driver\u2019s app status.'],
      ['Robotaxi', 'A no-human-driver liability question.'],
      ['Driver', 'Prop 22 occupational-accident coverage, not comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The driver\u2019s app status and the trip record',
      'Whether a driverless robotaxi was involved',
      'Whether a self-funded ERISA lien applies',
      'Who you were \u2014 passenger, third party, or driver',
      'Injury severity and treatment continuity',
      'Any UM/UIM coverage in play',
    ],
    settlementValueDetails: [
      { label: 'App status decides', copy: 'The trip record fixes which policy responds.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
      { label: 'Liens reduce net', copy: 'An ERISA lien must be addressed early.' },
      { label: 'Robotaxi is different', copy: 'Liability shifts to the operator and its tech.' },
    ],
    insuranceProblems: [
      'The trip record is never preserved and the period is disputed.',
      'A self-funded ERISA lien eats an unplanned share of recovery.',
      'A robotaxi claim is treated like an ordinary driver case.',
      'A passenger is wrongly assigned some fault.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Was the vehicle a driverless robotaxi?' },
      { label: 'Step 3', question: 'Is your health plan self-funded (ERISA)?' },
      { label: 'Step 4', question: 'Were you a passenger, third party, or the driver?' },
    ],
  },
  [SAC_RIDESHARE_SLUG]: {
    scenario: `A rider who took a Lyft home from downtown to avoid driving after drinks was hurt when another car ran a light. As a passenger she was not at fault, and the trip record confirmed the $1M trip-period coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Screenshot the active trip; get the driver and other-driver insurance.'],
      ['First days', 'Trip record preserved; the coverage period confirmed.'],
      ['First weeks', 'Liability and any UM/UIM coverage developed.'],
      ['Longer term', 'Treatment documented and the claim positioned.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; looks to the $1M trip policy.'],
      ['Third party', 'Coverage matches the driver\u2019s app status.'],
      ['Airport staging', 'App-status timing the trip record resolves.'],
      ['Driver', 'Prop 22 occupational-accident coverage, not comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The driver\u2019s app status and the trip record',
      'Who you were \u2014 passenger, third party, or driver',
      'Whether the trip was an airport or nightlife ride',
      'The at-fault driver\u2019s limits and any UM/UIM coverage',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'App status decides', copy: 'The trip record fixes which policy responds.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
      { label: 'Responsible choice', copy: 'Taking a ride does not reduce a claim.' },
      { label: 'UM/UIM backs it', copy: 'It responds when the at-fault driver is under-insured.' },
    ],
    insuranceProblems: [
      'The trip record is never preserved and the period is disputed.',
      'A nightlife passenger is wrongly blamed.',
      'Airport-staging app status is left ambiguous.',
      'No UM/UIM claim is opened after an under-insured hit.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Were you a passenger, third party, or the driver?' },
      { label: 'Step 3', question: 'Was it an airport or nightlife trip?' },
      { label: 'Step 4', question: 'What are the at-fault driver\u2019s limits and any UM/UIM?' },
    ],
  },
  [OAKLAND_RIDESHARE_SLUG]: {
    scenario: `A passenger in an Oakland Uber was injured when a driverless robotaxi failed to yield. Recognising the no-human-driver liability question, the vehicle\u2019s event data was preserved and the claim was aimed at the operating company. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Screenshot the trip; note the robotaxi operator and any markings.'],
      ['First days', 'Trip record and any robotaxi data preservation demanded.'],
      ['First weeks', 'The responsible policies \u2014 rideshare and/or operator \u2014 identified.'],
      ['Longer term', 'Treatment documented and the claim positioned.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; looks to the $1M trip policy.'],
      ['Third party', 'Coverage matches the driver\u2019s app status.'],
      ['Robotaxi', 'A no-human-driver liability question.'],
      ['Driver', 'Prop 22 occupational-accident coverage, not comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The driver\u2019s app status and the trip record',
      'Whether a driverless robotaxi was involved',
      'Who you were \u2014 passenger, third party, or driver',
      'Whether the vehicle and event data were preserved',
      'Injury severity and treatment continuity',
      'Any UM/UIM coverage in play',
    ],
    settlementValueDetails: [
      { label: 'App status decides', copy: 'The trip record fixes which policy responds.' },
      { label: 'Robotaxi is different', copy: 'Liability shifts to the operator and its tech.' },
      { label: 'Preserve the data', copy: 'Vehicle event data is central and time-sensitive.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
    ],
    insuranceProblems: [
      'A robotaxi claim is treated like an ordinary driver case.',
      'The vehicle event data is lost before it is demanded.',
      'The trip record is never preserved and the period is disputed.',
      'A passenger is wrongly assigned some fault.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a driverless robotaxi involved?' },
      { label: 'Step 2', question: 'What was the rideshare driver\u2019s app status?' },
      { label: 'Step 3', question: 'Has the vehicle and trip data been preserved?' },
      { label: 'Step 4', question: 'Were you a passenger, third party, or the driver?' },
    ],
  },
  [LONGBEACH_RIDESHARE_SLUG]: {
    scenario: `A visiting conference-goer was hurt as a passenger in a Long Beach Uber during an LAX run and flew home two days later. Because the trip record and details were gathered before departure, the $1M trip-period claim held together from out of state. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Screenshot the active trip; get the driver and other-driver insurance.'],
      ['Before leaving', 'Trip record and details gathered while still in town.'],
      ['First days', 'The coverage period confirmed from the trip record.'],
      ['Longer term', 'Treatment documented and the claim positioned.'],
    ],
    severityLadder: [
      ['Passenger', 'Almost never at fault; looks to the $1M trip policy.'],
      ['Third party', 'Coverage matches the driver\u2019s app status.'],
      ['Out-of-area', 'The visitor leaves before evidence is gathered.'],
      ['Driver', 'Prop 22 occupational-accident coverage, not comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The driver\u2019s app status and the trip record',
      'Whether evidence was gathered before the visitor left',
      'Who you were \u2014 passenger, third party, or driver',
      'Whether the trip was an LGB or LAX airport run',
      'Injury severity and treatment continuity',
      'Any UM/UIM coverage in play',
    ],
    settlementValueDetails: [
      { label: 'App status decides', copy: 'The trip record fixes which policy responds.' },
      { label: 'Passengers are protected', copy: 'The $1M policy applies during a ride.' },
      { label: 'Visitors can still claim', copy: 'California law governs regardless of home state.' },
      { label: 'Gather before leaving', copy: 'Evidence is far harder to collect after departure.' },
    ],
    insuranceProblems: [
      'The visitor leaves before securing the trip record.',
      'Airport-staging app status is left ambiguous.',
      'The trip record is never preserved and the period is disputed.',
      'A passenger is wrongly assigned some fault.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver\u2019s app status at impact?' },
      { label: 'Step 2', question: 'Did you get the trip record before leaving town?' },
      { label: 'Step 3', question: 'Was it an LGB or LAX airport run?' },
      { label: 'Step 4', question: 'Were you a passenger, third party, or the driver?' },
    ],
  },
}
