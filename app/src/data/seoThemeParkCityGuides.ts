import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, theme-park and amusement-ride injury practice area:
 * location-specific guides for Anaheim, Los Angeles / Valencia, San Diego, and
 * Santa Clara.
 *
 * California is the theme-park capital of the country, which makes this a
 * genuinely geography-driven practice area: the major parks cluster in a handful
 * of metros, and the applicable law is distinctive.
 *
 * Local context, genuine rather than interpolated:
 *  - Anaheim: home to the Disneyland Resort, the state's largest theme-park
 *    destination, drawing enormous crowds year-round.
 *  - Los Angeles / Valencia: Universal Studios Hollywood and Six Flags Magic
 *    Mountain, a dense cluster of high-thrill rides in the LA area.
 *  - San Diego: SeaWorld and, nearby in Carlsbad, Legoland California, mixing
 *    rides with animal attractions and water features.
 *  - Santa Clara: California's Great America in the heart of Silicon Valley.
 *
 * Applied accurately:
 *  - California treats roller coasters and similar amusement rides as common
 *    carriers, which means the operator owes the heightened duty of utmost care
 *    (Civil Code section 2100), as established by the California Supreme Court in
 *    Gomez v. Superior Court (2005). That is a substantially higher standard than
 *    ordinary negligence.
 *  - Slip, trip, and fall or other injuries elsewhere in the park fall under
 *    ordinary premises-liability rules, requiring the park to keep the premises
 *    reasonably safe.
 *  - A defective ride, restraint, or component can carry strict product liability
 *    against the manufacturer, distributor, and seller.
 *  - Permanent amusement rides in California are inspected under state oversight
 *    (the Division of Occupational Safety and Health), and the required ride and
 *    maintenance records are important evidence.
 *  - A season-pass or ticket waiver may limit ordinary-negligence claims, but it
 *    generally cannot waive gross negligence, and the common-carrier duty for
 *    rides constrains what a park can disclaim.
 *  - Pure comparative negligence and the two-year deadline (Code of Civil
 *    Procedure section 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether the common-carrier duty, a premises claim, a product claim, or a waiver applies depends on facts a licensed California attorney should review promptly.'

const COMMON_CARRIER =
  'California treats roller coasters and similar amusement rides as common carriers, which means the operator owes the heightened duty of utmost care under Civil Code section 2100 \u2014 a standard set by the California Supreme Court in Gomez v. Superior Court and substantially higher than ordinary negligence. On a ride, the park must use the highest care consistent with the ride\u2019s operation, which is often the decisive legal point in a ride-injury claim.'

const PREMISES =
  'Not every park injury happens on a ride. Slip, trip, and fall injuries on walkways, in queues, in restaurants, and in restrooms fall under ordinary premises-liability rules, which require the park to keep its premises reasonably safe and to warn of or fix hazards it knew or should have known about. The location of the injury \u2014 on a ride versus elsewhere \u2014 can change the legal standard that applies.'

const PRODUCT =
  'Where a ride, a restraint, a harness, or a component was defective, a strict product-liability claim can lie against the manufacturer, distributor, and seller, in addition to any claim against the park \u2014 without proof of negligence. Preserving the ride records and, where possible, the component itself is important, because the defect is the evidence.'

const RECORDS =
  'Permanent amusement rides in California are inspected under state oversight, and the park\u2019s ride-operation, inspection, and maintenance records \u2014 along with incident reports and any prior complaints about the same ride \u2014 are central evidence. A ticket or season-pass waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty constrains what a park can disclaim, so a waiver is rarely the end of the inquiry.'

export const ANAHEIM_PARK_SLUG = '/anaheim-theme-park-injury'
export const LA_PARK_SLUG = '/los-angeles-theme-park-injury'
export const SD_PARK_SLUG = '/san-diego-theme-park-injury'
export const SANTACLARA_PARK_SLUG = '/santa-clara-theme-park-injury'

export const themeParkCityGuidePages: LandingPage[] = [
  {
    slug: ANAHEIM_PARK_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Theme Park Injury Claims',
    title: 'Anaheim Theme Park Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a ride or in the park at an Anaheim theme-park resort? On a ride, the operator owes the heightened duty of a common carrier \u2014 a higher standard than ordinary negligence.',
    psychology: 'I was hurt at an Anaheim theme park and do not know if the park is responsible or whether my ticket waiver stops me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim theme park injury lawyer',
      'roller coaster injury common carrier california',
      'hurt on a ride who is liable california',
      'theme park waiver injury claim california',
      'disneyland ride injury claim',
    ],
    signals: [
      'Common carrier duty (2100)',
      'Premises liability off-ride',
      'Defective ride / restraint (product)',
      'Ride & maintenance records',
      'Waiver limits (gross negligence)',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Anaheim is the state\u2019s largest theme-park destination, drawing enormous year-round crowds, which makes both ride and non-ride injuries a recurring reality. ${COMMON_CARRIER} ${PREMISES} ${PRODUCT} ${RECORDS} Pure comparative negligence applies, and the deadline is generally two years (Code of Civil Procedure section 335.1). Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether the injury happened on a ride or elsewhere in the park',
        'The specific ride or attraction and its operator',
        'Any restraint, harness, or component that failed',
        'The park\u2019s incident report and the report number',
        'Any ticket or season-pass waiver you agreed to',
        'Photographs of the ride, the scene, and the injuries',
        'Witnesses, including others in your party and nearby guests',
        'Medical treatment from the park\u2019s first aid onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether the heightened common-carrier duty or ordinary premises rules apply to an Anaheim park injury, pursues a defective-ride product claim where one fits, secures the ride and maintenance records, and assesses whether a waiver actually limits the claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a roller coaster. What standard applies to the park?',
        a: 'California treats roller coasters and similar rides as common carriers, so the operator owes the heightened duty of utmost care under Civil Code section 2100 \u2014 a standard set by the California Supreme Court in Gomez v. Superior Court and much higher than ordinary negligence. On a ride, the park must use the highest care consistent with the ride\u2019s operation.',
      },
      {
        q: 'I signed a ticket or season-pass waiver. Does that end my claim?',
        a: 'Not necessarily. A waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty for rides constrains what a park can disclaim. A waiver is rarely the end of the inquiry, so it is worth having the facts reviewed.',
      },
      {
        q: 'The injury happened walking through the park, not on a ride. Does that matter?',
        a: 'Yes. Injuries off a ride \u2014 on walkways, in queues, in restaurants, or in restrooms \u2014 fall under ordinary premises-liability rules, which require the park to keep the premises reasonably safe. The location changes the legal standard that applies, so it is important to pin down where and how you were hurt.',
      },
      {
        q: 'What evidence matters most in a theme-park injury?',
        a: 'The park\u2019s ride-operation, inspection, and maintenance records, its incident report, and any prior complaints about the same ride are central, along with photographs and witnesses. Permanent rides are inspected under state oversight, so those records matter and should be preserved early.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the applicable duty, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LA_PARK_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Theme Park Injury Claims',
    title: 'Los Angeles Theme Park Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a high-thrill ride at a Los Angeles-area park such as Universal Studios or Six Flags Magic Mountain? On a ride, the operator owes the heightened duty of a common carrier.',
    psychology: 'I was hurt at an LA-area theme park and do not know if the park is responsible or whether my waiver stops me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles theme park injury lawyer',
      'six flags magic mountain ride injury claim',
      'roller coaster injury common carrier california',
      'universal studios injury claim california',
      'theme park waiver injury claim california',
    ],
    signals: [
      'Common carrier duty (2100)',
      'High-thrill ride cluster',
      'Defective ride / restraint (product)',
      'Premises liability off-ride',
      'Ride & maintenance records',
      'Waiver limits (gross negligence)',
    ],
    sections: {
      whyItMatters: `The Los Angeles area holds a dense cluster of high-thrill parks \u2014 Universal Studios Hollywood and Six Flags Magic Mountain in Valencia among them \u2014 whose intense roller coasters and rides make the common-carrier standard especially significant. ${COMMON_CARRIER} On the highest-thrill coasters, the utmost-care standard and a ride\u2019s maintenance history are frequently the core of a claim. ${PRODUCT} ${PREMISES} ${RECORDS} Pure comparative negligence applies, and the deadline is generally two years (Code of Civil Procedure section 335.1). Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The specific ride or coaster and its operator',
        'Any restraint, harness, or component that failed',
        'Whether the injury happened on a ride or elsewhere in the park',
        'The park\u2019s incident report and the report number',
        'Any ticket or season-pass waiver you agreed to',
        'Photographs of the ride, the scene, and the injuries',
        'Witnesses, including others in your party and nearby guests',
        'Medical treatment from the park\u2019s first aid onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds an LA-area park claim around the heightened common-carrier duty that governs its high-thrill rides, pursues a defective-ride product claim where one fits, secures the ride and maintenance records, and assesses whether a waiver actually limits the claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a big coaster at Magic Mountain or Universal. What standard applies?',
        a: 'California treats roller coasters and similar rides as common carriers, so the operator owes the heightened duty of utmost care under Civil Code section 2100 \u2014 much higher than ordinary negligence. On the highest-thrill coasters, that standard and the ride\u2019s maintenance history are often the core of the claim.',
      },
      {
        q: 'A restraint or harness failed. Can I claim against the ride maker?',
        a: 'Possibly. Where a ride, restraint, harness, or component was defective, a strict product-liability claim can lie against the manufacturer, distributor, and seller, in addition to a claim against the park \u2014 without proof of negligence. Preserving the records and, where possible, the component is important.',
      },
      {
        q: 'I signed a season-pass waiver. Does that end my claim?',
        a: 'Not necessarily. A waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty for rides constrains what a park can disclaim. A waiver is rarely the end of the inquiry.',
      },
      {
        q: 'What evidence matters most in a theme-park injury?',
        a: 'The park\u2019s ride-operation, inspection, and maintenance records, its incident report, and any prior complaints about the same ride, along with photographs and witnesses. Permanent rides are inspected under state oversight, so those records matter and should be preserved early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the applicable duty, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_PARK_SLUG,
    category: 'Cities',
    cluster: 'San Diego Theme Park Injury Claims',
    title: 'San Diego Theme Park Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a ride, at an animal attraction, or on a water feature at a San Diego-area park such as SeaWorld or Legoland? The standard depends on where and how you were hurt.',
    psychology: 'I was hurt at a San Diego-area theme park and do not know if the park is responsible or whether my waiver stops me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego theme park injury lawyer',
      'seaworld injury claim california',
      'legoland ride injury claim california',
      'roller coaster injury common carrier california',
      'water park injury claim california',
    ],
    signals: [
      'Common carrier duty (2100)',
      'Animal-attraction & water features',
      'Premises liability off-ride',
      'Defective ride / restraint (product)',
      'Ride & maintenance records',
      'Waiver limits (gross negligence)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s parks \u2014 SeaWorld and, in nearby Carlsbad, Legoland California \u2014 mix traditional rides with animal attractions and water features, which broadens the range of injuries and the standards that apply. ${COMMON_CARRIER} ${PREMISES} Water rides and wet walkways add slip-and-fall exposure, and animal attractions raise their own safety questions. ${PRODUCT} ${RECORDS} Pure comparative negligence applies, and the deadline is generally two years (Code of Civil Procedure section 335.1). Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether the injury happened on a ride, a water feature, or elsewhere',
        'The specific attraction and its operator',
        'For a water feature, the condition of walkways and surfaces',
        'Any restraint, harness, or component that failed',
        'The park\u2019s incident report and the report number',
        'Any ticket or season-pass waiver you agreed to',
        'Photographs of the attraction, the scene, and the injuries',
        'Medical treatment from the park\u2019s first aid onward',
      ],
      howClearCaseHelps: `ClearCaseIQ sorts which standard applies to a San Diego-area park injury \u2014 the heightened common-carrier duty on rides, ordinary premises rules on wet walkways and elsewhere \u2014 pursues a product claim where a ride or component failed, and secures the park\u2019s records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I slipped on a wet walkway near a water ride. What standard applies?',
        a: 'That is likely an ordinary premises-liability claim: the park must keep its walkways and surfaces reasonably safe and address hazards it knew or should have known about. That standard differs from the heightened common-carrier duty that applies on a ride itself, so where you were hurt matters.',
      },
      {
        q: 'I was hurt on a ride. What standard applies to the park?',
        a: 'California treats roller coasters and similar rides as common carriers, so the operator owes the heightened duty of utmost care under Civil Code section 2100 \u2014 much higher than ordinary negligence. On a ride, the park must use the highest care consistent with the ride\u2019s operation.',
      },
      {
        q: 'I signed a ticket or membership waiver. Does that end my claim?',
        a: 'Not necessarily. A waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty for rides constrains what a park can disclaim. A waiver is rarely the end of the inquiry.',
      },
      {
        q: 'What evidence matters most in a theme-park injury?',
        a: 'The park\u2019s ride-operation, inspection, and maintenance records, its incident report, and any prior complaints, along with photographs and witnesses. Permanent rides are inspected under state oversight, so those records matter and should be preserved early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the applicable duty, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANTACLARA_PARK_SLUG,
    category: 'Cities',
    cluster: 'Santa Clara Theme Park Injury Claims',
    title: 'Santa Clara Theme Park Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a ride or in the park at California\u2019s Great America in Santa Clara? On a ride, the operator owes the heightened duty of a common carrier \u2014 a higher standard than ordinary negligence.',
    psychology: 'I was hurt at a Santa Clara theme park and do not know if the park is responsible or whether my waiver stops me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'santa clara theme park injury lawyer',
      'great america ride injury claim california',
      'roller coaster injury common carrier california',
      'theme park waiver injury claim california',
      'hurt on a ride who is liable california',
    ],
    signals: [
      'Common carrier duty (2100)',
      'Premises liability off-ride',
      'Defective ride / restraint (product)',
      'Ride & maintenance records',
      'Waiver limits (gross negligence)',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `California\u2019s Great America sits in the heart of Silicon Valley in Santa Clara, drawing large regional crowds to its rides and coasters, which makes both ride and non-ride injuries a recurring reality. ${COMMON_CARRIER} ${PREMISES} ${PRODUCT} ${RECORDS} Pure comparative negligence applies, and the deadline is generally two years (Code of Civil Procedure section 335.1). Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Whether the injury happened on a ride or elsewhere in the park',
        'The specific ride or attraction and its operator',
        'Any restraint, harness, or component that failed',
        'The park\u2019s incident report and the report number',
        'Any ticket or season-pass waiver you agreed to',
        'Photographs of the ride, the scene, and the injuries',
        'Witnesses, including others in your party and nearby guests',
        'Medical treatment from the park\u2019s first aid onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether the heightened common-carrier duty or ordinary premises rules apply to a Santa Clara park injury, pursues a defective-ride product claim where one fits, secures the ride and maintenance records, and assesses whether a waiver actually limits the claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a ride at Great America. What standard applies to the park?',
        a: 'California treats roller coasters and similar rides as common carriers, so the operator owes the heightened duty of utmost care under Civil Code section 2100 \u2014 a standard set by the California Supreme Court in Gomez v. Superior Court and much higher than ordinary negligence. On a ride, the park must use the highest care consistent with the ride\u2019s operation.',
      },
      {
        q: 'I signed a season-pass waiver. Does that end my claim?',
        a: 'Not necessarily. A waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty for rides constrains what a park can disclaim. A waiver is rarely the end of the inquiry.',
      },
      {
        q: 'The injury happened walking through the park, not on a ride. Does that matter?',
        a: 'Yes. Injuries off a ride fall under ordinary premises-liability rules, which require the park to keep the premises reasonably safe. The location changes the legal standard that applies, so it is important to pin down where and how you were hurt.',
      },
      {
        q: 'What evidence matters most in a theme-park injury?',
        a: 'The park\u2019s ride-operation, inspection, and maintenance records, its incident report, and any prior complaints about the same ride, along with photographs and witnesses. Permanent rides are inspected under state oversight, so those records matter and should be preserved early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the applicable duty, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const themeParkCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [ANAHEIM_PARK_SLUG]: {
    scenario: `A guest was injured when a ride restraint released early at an Anaheim park. The common-carrier duty set a high standard for the operator, the ride\u2019s maintenance records were secured, and a product claim against the restraint maker was preserved. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Report the injury; get the incident report number and witnesses.'],
      ['First days', 'The ride, operator, and any waiver identified.'],
      ['First weeks', 'Ride and maintenance records requested and preserved.'],
      ['Longer term', 'Treatment documented; the duty and product paths developed.'],
    ],
    severityLadder: [
      ['Common carrier', 'On a ride, utmost care applies.'],
      ['Product path', 'A defective restraint or component adds a defendant.'],
      ['Premises path', 'Off-ride injuries use ordinary negligence.'],
      ['Records decide', 'Maintenance and inspection history is key.'],
    ],
    treatmentProgression: [
      { label: 'First aid', copy: 'The park\u2019s first-aid record ties the injury to the ride.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the common-carrier duty applies (on a ride)',
      'Whether a defective ride or component adds a product claim',
      'The ride\u2019s maintenance and inspection history',
      'Whether a waiver actually limits the claim',
      'Injury severity and treatment continuity',
      'The strength of the incident report and witnesses',
    ],
    settlementValueDetails: [
      { label: 'Duty is heightened', copy: 'Rides are common carriers owing utmost care.' },
      { label: 'Products add coverage', copy: 'A defective restraint opens strict liability.' },
      { label: 'Records are decisive', copy: 'Maintenance history proves the case.' },
      { label: 'Waivers have limits', copy: 'Gross negligence cannot be waived.' },
    ],
    insuranceProblems: [
      'The park points to a waiver to deny the claim entirely.',
      'The ride and maintenance records are never requested.',
      'A product claim against the ride maker is overlooked.',
      'The wrong (ordinary-negligence) standard is applied to a ride.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the injury happen on a ride or elsewhere?' },
      { label: 'Step 2', question: 'Did a restraint or component fail?' },
      { label: 'Step 3', question: 'Do you have the incident report number?' },
      { label: 'Step 4', question: 'What waiver, if any, did you agree to?' },
    ],
  },
  [LA_PARK_SLUG]: {
    scenario: `A rider was hurt on a high-thrill coaster in the LA area, and the park pointed to a season-pass waiver. The common-carrier duty and the coaster\u2019s maintenance history overrode the waiver argument for the serious conduct at issue. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Report the injury; get the incident report number and witnesses.'],
      ['First days', 'The coaster, operator, and the waiver identified.'],
      ['First weeks', 'Ride and maintenance records requested and preserved.'],
      ['Longer term', 'Treatment documented; the duty and product paths developed.'],
    ],
    severityLadder: [
      ['Common carrier', 'On a coaster, utmost care applies.'],
      ['Product path', 'A defective restraint or component adds a defendant.'],
      ['Waiver test', 'Gross negligence cannot be waived.'],
      ['Records decide', 'Maintenance and inspection history is key.'],
    ],
    treatmentProgression: [
      { label: 'First aid', copy: 'The park\u2019s first-aid record ties the injury to the ride.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the common-carrier duty applies',
      'Whether a waiver actually limits the claim',
      'Whether a defective ride or component adds a product claim',
      'The coaster\u2019s maintenance and inspection history',
      'Injury severity and treatment continuity',
      'The strength of the incident report and witnesses',
    ],
    settlementValueDetails: [
      { label: 'Duty is heightened', copy: 'Coasters are common carriers owing utmost care.' },
      { label: 'Waivers have limits', copy: 'Gross negligence cannot be waived.' },
      { label: 'Products add coverage', copy: 'A defective restraint opens strict liability.' },
      { label: 'Records are decisive', copy: 'Maintenance history proves the case.' },
    ],
    insuranceProblems: [
      'The park treats the waiver as a complete defense.',
      'The ride and maintenance records are never requested.',
      'A product claim against the ride maker is overlooked.',
      'The wrong standard is applied to a ride.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which ride or coaster, and did a component fail?' },
      { label: 'Step 2', question: 'What season-pass or ticket waiver did you agree to?' },
      { label: 'Step 3', question: 'Do you have the incident report number?' },
      { label: 'Step 4', question: 'Were there witnesses to the ride and injury?' },
    ],
  },
  [SD_PARK_SLUG]: {
    scenario: `A visitor slipped on a wet walkway beside a San Diego-area water ride, then a companion was hurt on a coaster the same day. The two injuries needed different standards \u2014 premises for the slip, common carrier for the ride. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Report each injury; get incident report numbers and witnesses.'],
      ['First days', 'Each attraction and its operator identified.'],
      ['First weeks', 'Walkway condition and ride records preserved.'],
      ['Longer term', 'Treatment documented; the correct standard applied to each.'],
    ],
    severityLadder: [
      ['Premises path', 'Wet walkways use ordinary negligence.'],
      ['Common carrier', 'On a ride, utmost care applies.'],
      ['Product path', 'A defective ride or component adds a defendant.'],
      ['Records decide', 'Maintenance and surface-condition evidence is key.'],
    ],
    treatmentProgression: [
      { label: 'First aid', copy: 'The park\u2019s first-aid record ties the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the injury was on a ride or elsewhere (the standard)',
      'The condition of walkways and surfaces near water',
      'Whether a defective ride or component adds a product claim',
      'The park\u2019s records and any prior complaints',
      'Injury severity and treatment continuity',
      'Whether a waiver actually limits the claim',
    ],
    settlementValueDetails: [
      { label: 'Location sets the standard', copy: 'Ride vs. walkway changes the duty.' },
      { label: 'Duty is heightened on rides', copy: 'Common carriers owe utmost care.' },
      { label: 'Surfaces matter', copy: 'Wet-walkway condition anchors a premises claim.' },
      { label: 'Records are decisive', copy: 'Maintenance and complaints prove the case.' },
    ],
    insuranceProblems: [
      'The same standard is wrongly applied to different injuries.',
      'The wet-walkway condition is not documented.',
      'The ride and maintenance records are never requested.',
      'A waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the injury on a ride, a water feature, or a walkway?' },
      { label: 'Step 2', question: 'What was the condition of the surface or ride?' },
      { label: 'Step 3', question: 'Do you have the incident report number?' },
      { label: 'Step 4', question: 'What waiver, if any, did you agree to?' },
    ],
  },
  [SANTACLARA_PARK_SLUG]: {
    scenario: `A guest was injured on a coaster at a Santa Clara park, and the operator relied on a season-pass waiver. Securing the ride\u2019s maintenance history and applying the common-carrier duty kept the claim alive despite the waiver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Report the injury; get the incident report number and witnesses.'],
      ['First days', 'The ride, operator, and any waiver identified.'],
      ['First weeks', 'Ride and maintenance records requested and preserved.'],
      ['Longer term', 'Treatment documented; the duty and product paths developed.'],
    ],
    severityLadder: [
      ['Common carrier', 'On a ride, utmost care applies.'],
      ['Waiver test', 'Gross negligence cannot be waived.'],
      ['Product path', 'A defective restraint or component adds a defendant.'],
      ['Records decide', 'Maintenance and inspection history is key.'],
    ],
    treatmentProgression: [
      { label: 'First aid', copy: 'The park\u2019s first-aid record ties the injury to the ride.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the common-carrier duty applies (on a ride)',
      'Whether a waiver actually limits the claim',
      'Whether a defective ride or component adds a product claim',
      'The ride\u2019s maintenance and inspection history',
      'Injury severity and treatment continuity',
      'The strength of the incident report and witnesses',
    ],
    settlementValueDetails: [
      { label: 'Duty is heightened', copy: 'Rides are common carriers owing utmost care.' },
      { label: 'Waivers have limits', copy: 'Gross negligence cannot be waived.' },
      { label: 'Products add coverage', copy: 'A defective restraint opens strict liability.' },
      { label: 'Records are decisive', copy: 'Maintenance history proves the case.' },
    ],
    insuranceProblems: [
      'The park treats the waiver as a complete defense.',
      'The ride and maintenance records are never requested.',
      'A product claim against the ride maker is overlooked.',
      'The wrong (ordinary-negligence) standard is applied to a ride.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the injury happen on a ride or elsewhere?' },
      { label: 'Step 2', question: 'Did a restraint or component fail?' },
      { label: 'Step 3', question: 'What season-pass or ticket waiver did you agree to?' },
      { label: 'Step 4', question: 'Do you have the incident report number and witnesses?' },
    ],
  },
}
