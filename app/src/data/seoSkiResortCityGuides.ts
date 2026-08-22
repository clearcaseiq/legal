import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, ski / snowboard resort injury practice area: location-specific
 * guides for California\u2019s mountain-resort communities \u2014 South Lake Tahoe, Big
 * Bear Lake, Mammoth Lakes, and Truckee.
 *
 * This is distinct from a plain premises or recreation claim: it centers on
 * California\u2019s primary-assumption-of-risk doctrine for skiing and snowboarding,
 * the narrow ways a resort can still be liable, the heightened common-carrier
 * duty owed on chairlifts, and the limits of season-pass and lift-ticket
 * waivers.
 *
 * Local context, genuine rather than interpolated:
 *  - South Lake Tahoe: Heavenly and the surrounding Tahoe Basin resorts.
 *  - Big Bear Lake: Snow Summit and Bear Mountain, Southern California\u2019s closest
 *    ski areas.
 *  - Mammoth Lakes: Mammoth Mountain, a high-elevation Eastern Sierra resort.
 *  - Truckee: Palisades Tahoe and Northstar in the northern Sierra.
 *
 * Applied accurately:
 *  - Primary assumption of risk covers the inherent risks of skiing and
 *    snowboarding \u2014 changing snow, moguls, trees, and the ordinary dangers of the
 *    sport \u2014 so a resort is generally not liable for those inherent risks
 *    (reflected in California cases such as Connelly v. Mammoth Mountain).
 *  - A resort can still be liable when it unreasonably increases the risk beyond
 *    what is inherent: unmarked man-made hazards, negligently placed equipment or
 *    obstacles, a collision caused by resort operations, or negligently
 *    maintained rental equipment.
 *  - Chairlifts are common carriers that owe passengers the highest degree of
 *    care, and lift accidents are judged by that heightened standard; lifts are
 *    also regulated and permitted through the state tramway program.
 *  - A season pass or lift ticket almost always includes a liability waiver; in
 *    California a waiver can bar ordinary negligence but cannot release gross
 *    negligence (City of Santa Barbara v. Superior Court).
 *  - The evidence is time-sensitive: the resort incident and ski-patrol reports,
 *    the trail and any signage, the equipment involved, witness information, and
 *    photographs of the hazard and conditions should be gathered quickly before
 *    snow, grooming, and records change. A personal-injury deadline is generally
 *    two years (Code of Civil Procedure section 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a risk was inherent, whether a resort increased it, and which deadline applies depend on facts a licensed California attorney should review promptly.'

const INHERENT =
  'California\u2019s primary-assumption-of-risk doctrine covers the inherent risks of skiing and snowboarding \u2014 variable snow, moguls, trees, and the ordinary dangers of the sport \u2014 so a resort generally is not liable for an injury caused by those inherent risks alone (as reflected in California cases such as Connelly v. Mammoth Mountain). Understanding that line is the starting point of any resort claim.'

const BEYOND =
  'A resort can still be liable when it unreasonably increases the risk beyond what is inherent to the sport. Unmarked man-made hazards, negligently placed equipment, obstacles or snowmaking gear on a run, a collision caused by resort operations, and negligently maintained rental equipment can all fall outside the protected inherent risks.'

const LIFT =
  'Chairlifts are common carriers that owe passengers the highest degree of care, so a lift accident is judged by that heightened standard rather than ordinary assumption of risk. Ski lifts are also regulated and permitted through the state tramway program, and maintenance and inspection records are central to a lift claim.'

const WAIVER =
  'A season pass or lift ticket almost always includes a liability waiver. In California a waiver can bar an ordinary-negligence claim, but it cannot release a resort from gross negligence \u2014 an extreme departure from the standard of care (City of Santa Barbara v. Superior Court) \u2014 so a signed waiver does not automatically end an egregious case.'

const EVIDENCE =
  'Ski-injury evidence is time-sensitive: the resort incident and ski-patrol reports, the trail and any signage or markings, the equipment involved, witness information, and photographs of the hazard and snow conditions should be gathered quickly before snow, grooming, and records change. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1).'

export const TAHOE_SKI_SLUG = '/south-lake-tahoe-ski-injury-claim'
export const BIGBEAR_SKI_SLUG = '/big-bear-ski-injury-claim'
export const MAMMOTH_SKI_SLUG = '/mammoth-ski-injury-claim'
export const TRUCKEE_SKI_SLUG = '/truckee-ski-injury-claim'

export const skiResortCityGuidePages: LandingPage[] = [
  {
    slug: TAHOE_SKI_SLUG,
    category: 'Attorney Intent',
    cluster: 'South Lake Tahoe Ski & Snowboard Injury Claims',
    title: 'South Lake Tahoe Ski & Snowboard Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt skiing or snowboarding at South Lake Tahoe? Assumption of risk covers inherent dangers \u2014 but not resort negligence, lift accidents, or gross negligence.',
    psychology: 'I was hurt at a Tahoe resort and they say assumption of risk means I have no case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'south lake tahoe ski injury lawyer',
      'ski resort negligence lawsuit california',
      'chairlift accident claim california',
      'snowboard collision injury california',
      'ski waiver still sue california',
    ],
    signals: [
      'Assumption of risk covers inherent dangers',
      'Resort liable if it increases the risk',
      'Chairlifts owe common-carrier care',
      'Waivers do not bar gross negligence',
      'Preserve incident and patrol reports',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `South Lake Tahoe\u2019s Heavenly and the surrounding Tahoe Basin resorts draw huge crowds, and resorts routinely raise assumption of risk as if it bars every claim. ${INHERENT} ${BEYOND} ${LIFT} ${WAIVER} ${EVIDENCE} Civil cases are filed in El Dorado County Superior Court.`,
      whatToTrack: [
        'How the injury happened and on which run or lift',
        'Whether a man-made or unmarked hazard was involved',
        'The resort incident and ski-patrol reports',
        'Any signage, markings, or equipment on the run',
        'Whether a chairlift was involved',
        'Witnesses and any photos or video',
        'Whether rental equipment failed',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Tahoe skier separate an inherent-risk injury from resort negligence, preserve the incident and patrol reports, and evaluate whether the conduct rises to gross negligence beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The resort says assumption of risk ends my claim. Is that true?',
        a: 'Not always. Assumption of risk covers the inherent risks of skiing, but a resort can still be liable when it unreasonably increases the risk \u2014 an unmarked man-made hazard, equipment left on a run, or a collision caused by resort operations.',
      },
      {
        q: 'I was hurt on a chairlift. Is that different?',
        a: 'Yes. Chairlifts are common carriers that owe the highest degree of care, so a lift accident is judged by that heightened standard rather than ordinary assumption of risk, and the lift\u2019s maintenance records matter.',
      },
      {
        q: 'I signed a waiver on my pass. Does that block everything?',
        a: 'No. A waiver can bar ordinary negligence, but it cannot release gross negligence (City of Santa Barbara v. Superior Court), so egregious conduct can still support a claim.',
      },
      {
        q: 'What should I preserve?',
        a: 'The resort incident and ski-patrol reports, photos of the hazard and conditions, the run and any signage, witness information, and any failed rental equipment \u2014 before snow and records change.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the reports, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BIGBEAR_SKI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Big Bear Ski & Snowboard Injury Claims',
    title: 'Big Bear Ski & Snowboard Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at Snow Summit or Bear Mountain in Big Bear? Assumption of risk covers inherent dangers \u2014 but not resort negligence, lift accidents, or gross negligence.',
    psychology: 'I got hurt on a crowded run at Big Bear and think a resort obstacle was to blame.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'big bear ski injury lawyer',
      'snow summit accident claim california',
      'ski resort negligence lawsuit california',
      'chairlift accident claim california',
      'ski waiver still sue california',
    ],
    signals: [
      'Assumption of risk covers inherent dangers',
      'Resort liable if it increases the risk',
      'Chairlifts owe common-carrier care',
      'Waivers do not bar gross negligence',
      'Preserve incident and patrol reports',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Big Bear\u2019s Snow Summit and Bear Mountain are Southern California\u2019s closest ski areas, drawing large beginner crowds and heavy snowmaking \u2014 conditions where man-made obstacles and crowded, machine-made runs can increase the risk beyond the sport\u2019s inherent dangers. ${INHERENT} ${BEYOND} ${LIFT} ${WAIVER} ${EVIDENCE} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'How the injury happened and on which run or lift',
        'Whether snowmaking equipment or an obstacle was involved',
        'The resort incident and ski-patrol reports',
        'Any signage, markings, or padding on the run',
        'Whether a chairlift was involved',
        'Witnesses and any photos or video',
        'Whether rental equipment failed',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Big Bear skier document a man-made obstacle or snowmaking hazard, preserve the incident and patrol reports, and evaluate whether the conduct rises to gross negligence beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I hit snowmaking equipment on the run. Is the resort liable?',
        a: 'Possibly. Equipment or an obstacle negligently placed or left unpadded on a run can increase the risk beyond the inherent dangers of skiing, which can fall outside assumption of risk. The location and any padding or markings matter.',
      },
      {
        q: 'Does assumption of risk end my claim?',
        a: 'Not necessarily. It covers the inherent risks of the sport, but not conduct by the resort that unreasonably increases the risk, such as unmarked man-made hazards.',
      },
      {
        q: 'What about a chairlift injury?',
        a: 'Chairlifts are common carriers owing the highest degree of care, so a lift accident is judged by that heightened standard, and the lift\u2019s maintenance and inspection records are central.',
      },
      {
        q: 'Does my season-pass waiver block the claim?',
        a: 'A waiver can bar ordinary negligence but not gross negligence (City of Santa Barbara v. Superior Court), so egregious conduct can still support a claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the reports, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: MAMMOTH_SKI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Mammoth Ski & Snowboard Injury Claims',
    title: 'Mammoth Ski & Snowboard Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt skiing or snowboarding at Mammoth Mountain? Assumption of risk covers inherent dangers \u2014 but not resort negligence, lift accidents, or gross negligence.',
    psychology: 'I was seriously hurt at Mammoth and am not sure whether the resort can be held responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'mammoth ski injury lawyer',
      'mammoth mountain accident claim california',
      'ski resort negligence lawsuit california',
      'chairlift accident claim california',
      'ski waiver still sue california',
    ],
    signals: [
      'Assumption of risk covers inherent dangers',
      'Resort liable if it increases the risk',
      'Chairlifts owe common-carrier care',
      'Waivers do not bar gross negligence',
      'Preserve incident and patrol reports',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Mammoth Mountain is a high-elevation Eastern Sierra resort with long seasons and demanding terrain, and its own name appears in the California case law that defines the assumption-of-risk line for skiing. ${INHERENT} ${BEYOND} ${LIFT} ${WAIVER} ${EVIDENCE} Civil cases are filed in Mono County Superior Court.`,
      whatToTrack: [
        'How the injury happened and on which run or lift',
        'Whether a man-made or unmarked hazard was involved',
        'The resort incident and ski-patrol reports',
        'Any signage, markings, or equipment on the run',
        'Whether a chairlift or gondola was involved',
        'Witnesses and any photos or video',
        'Whether rental equipment failed',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Mammoth skier separate an inherent-risk injury from resort negligence, preserve the incident and patrol reports, and evaluate whether a lift claim or gross negligence applies beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Assumption of risk was litigated at Mammoth. Does that mean I cannot sue?',
        a: 'No. California case law confirms that assumption of risk covers the inherent risks of skiing, but it also recognizes that a resort can be liable when it unreasonably increases the risk beyond those inherent dangers.',
      },
      {
        q: 'What increases the risk beyond inherent?',
        a: 'Unmarked man-made hazards, equipment or obstacles left on a run, a collision caused by resort operations, or negligently maintained rental equipment can all fall outside assumption of risk.',
      },
      {
        q: 'I was hurt on a lift or gondola. Is that different?',
        a: 'Yes. Lifts and gondolas are common carriers owing the highest degree of care, so the accident is judged by that heightened standard, and the maintenance records are central.',
      },
      {
        q: 'Does my waiver block the claim?',
        a: 'A waiver can bar ordinary negligence but not gross negligence (City of Santa Barbara v. Superior Court), so egregious conduct can still support a claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the reports, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: TRUCKEE_SKI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Truckee Ski & Snowboard Injury Claims',
    title: 'Truckee & North Tahoe Ski Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at Palisades Tahoe or Northstar near Truckee? Assumption of risk covers inherent dangers \u2014 but not resort negligence, lift accidents, or gross negligence.',
    psychology: 'I was hurt at a resort near Truckee and want to know if the resort did something wrong.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'truckee ski injury lawyer',
      'palisades tahoe accident claim california',
      'northstar ski injury california',
      'chairlift accident claim california',
      'ski resort negligence lawsuit california',
    ],
    signals: [
      'Assumption of risk covers inherent dangers',
      'Resort liable if it increases the risk',
      'Chairlifts owe common-carrier care',
      'Waivers do not bar gross negligence',
      'Preserve incident and patrol reports',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Truckee\u2019s Palisades Tahoe and Northstar anchor the northern Sierra\u2019s big-mountain terrain, where high-speed runs, terrain parks, and heavy lift traffic create situations in which resort operations \u2014 not just the inherent sport \u2014 can cause injury. ${INHERENT} ${BEYOND} ${LIFT} ${WAIVER} ${EVIDENCE} Civil cases are filed in Nevada County or Placer County Superior Court depending on the resort.`,
      whatToTrack: [
        'How the injury happened and on which run or lift',
        'Whether a terrain-park feature or obstacle was involved',
        'The resort incident and ski-patrol reports',
        'Any signage, markings, or padding on the run',
        'Whether a chairlift was involved',
        'Witnesses and any photos or video',
        'Whether rental equipment failed',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Truckee-area skier document a terrain-park feature or resort-operations hazard, preserve the incident and patrol reports, and evaluate whether a lift claim or gross negligence applies beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a terrain-park feature. Can the resort be liable?',
        a: 'Possibly. A negligently designed, built, or maintained terrain-park feature can increase the risk beyond the inherent dangers of the sport, which can fall outside assumption of risk. The feature\u2019s condition and any signage matter.',
      },
      {
        q: 'Does assumption of risk end my claim?',
        a: 'Not necessarily. It covers the inherent risks of skiing and snowboarding, but not conduct by the resort that unreasonably increases the risk.',
      },
      {
        q: 'What about a chairlift injury?',
        a: 'Chairlifts are common carriers owing the highest degree of care, so a lift accident is judged by that heightened standard, and the lift\u2019s maintenance records are central.',
      },
      {
        q: 'Does my season pass waiver block the claim?',
        a: 'A waiver can bar ordinary negligence but not gross negligence (City of Santa Barbara v. Superior Court), so egregious conduct can still support a claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the reports, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const skiResortCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [TAHOE_SKI_SLUG]: {
    scenario: `A Tahoe skier struck an unmarked snowmaking hydrant on a groomed run. The missing markings pushed the injury beyond the inherent risks and past the pass waiver. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report to ski patrol; get the incident report.'],
      ['Preserve', 'Photograph the hazard and its markings.'],
      ['Assess', 'Separate inherent risk from resort negligence.'],
      ['Longer term', 'Increased-risk theory developed.'],
    ],
    severityLadder: [
      ['Inherent', 'The sport\u2019s dangers are assumed.'],
      ['Increased risk', 'Unmarked hazards are not.'],
      ['Lift standard', 'Chairlifts owe utmost care.'],
      ['Waiver limit', 'Gross negligence is not barred.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Ski injuries are often severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and tears are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the hazard was man-made and unmarked',
      'Whether the resort increased the risk',
      'Whether a lift standard applies',
      'Whether the incident report was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Markings matter', copy: 'Unmarked hazards support the claim.' },
      { label: 'Patrol reports', copy: 'They document the incident.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve fast', copy: 'Snow and grooming change.' },
    ],
    insuranceProblems: [
      'Assumption of risk is asserted for a man-made hazard.',
      'The incident and patrol reports are not obtained.',
      'The hazard is groomed over before it is documented.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did you strike or how did you fall?' },
      { label: 'Step 2', question: 'Was a man-made hazard marked?' },
      { label: 'Step 3', question: 'Did ski patrol make a report?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
  [BIGBEAR_SKI_SLUG]: {
    scenario: `A Big Bear beginner hit an unpadded snowmaking gun beside a crowded run. The lack of padding and markings supported a claim beyond the inherent risks. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report to ski patrol; get the incident report.'],
      ['Preserve', 'Photograph the equipment and any padding.'],
      ['Assess', 'Separate inherent risk from resort negligence.'],
      ['Longer term', 'Increased-risk theory developed.'],
    ],
    severityLadder: [
      ['Inherent', 'The sport\u2019s dangers are assumed.'],
      ['Increased risk', 'Unpadded equipment is not.'],
      ['Lift standard', 'Chairlifts owe utmost care.'],
      ['Waiver limit', 'Gross negligence is not barred.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Ski injuries are often severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and tears are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether equipment was unpadded or unmarked',
      'Whether the resort increased the risk',
      'Whether a lift standard applies',
      'Whether the incident report was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Padding matters', copy: 'Unpadded gear supports the claim.' },
      { label: 'Beginner runs', copy: 'Crowded slopes raise the stakes.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve fast', copy: 'Conditions change quickly.' },
    ],
    insuranceProblems: [
      'Assumption of risk is asserted for unpadded equipment.',
      'The incident and patrol reports are not obtained.',
      'The equipment is moved before it is documented.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did you strike on the run?' },
      { label: 'Step 2', question: 'Was the equipment padded or marked?' },
      { label: 'Step 3', question: 'Did ski patrol make a report?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
  [MAMMOTH_SKI_SLUG]: {
    scenario: `A Mammoth skier was hurt when a chairlift stopped abruptly and restarted without warning. Because lifts owe common-carrier care, the maintenance and operations records drove the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; get the lift incident report.'],
      ['Preserve', 'Demand the lift maintenance records.'],
      ['Assess', 'Apply the common-carrier standard.'],
      ['Longer term', 'Lift-operations theory developed.'],
    ],
    severityLadder: [
      ['Inherent', 'On-snow dangers are assumed.'],
      ['Lift standard', 'Chairlifts owe utmost care.'],
      ['Operations', 'Negligent lift operation is actionable.'],
      ['Waiver limit', 'Gross negligence is not barred.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Lift-fall injuries are severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and spinal injuries occur.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the lift was negligently operated',
      'Whether maintenance records show problems',
      'Whether the common-carrier standard applies',
      'Whether the incident report was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Higher standard', copy: 'Lifts owe utmost care.' },
      { label: 'Records are central', copy: 'Maintenance logs matter.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve fast', copy: 'Operations records can age.' },
    ],
    insuranceProblems: [
      'Ordinary assumption of risk is misapplied to a lift.',
      'The lift maintenance records are never obtained.',
      'The incident report is not preserved.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you on a lift or on snow?' },
      { label: 'Step 2', question: 'What did the lift do?' },
      { label: 'Step 3', question: 'Is there a lift incident report?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
  [TRUCKEE_SKI_SLUG]: {
    scenario: `A skier near Truckee was hurt on a poorly built terrain-park jump with no adequate warning. The feature\u2019s design and signage supported a claim beyond the inherent risks. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report to ski patrol; get the incident report.'],
      ['Preserve', 'Photograph the feature and any signage.'],
      ['Assess', 'Separate inherent risk from negligent design.'],
      ['Longer term', 'Increased-risk theory developed.'],
    ],
    severityLadder: [
      ['Inherent', 'The sport\u2019s dangers are assumed.'],
      ['Feature design', 'Negligent build is not inherent.'],
      ['Lift standard', 'Chairlifts owe utmost care.'],
      ['Waiver limit', 'Gross negligence is not barred.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Terrain-park injuries are severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and spinal injuries occur.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether a park feature was negligently built',
      'Whether adequate warning was given',
      'Whether the resort increased the risk',
      'Whether the incident report was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Feature design', copy: 'A bad build is not inherent.' },
      { label: 'Warnings matter', copy: 'Signage affects the analysis.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve fast', copy: 'Features are rebuilt or removed.' },
    ],
    insuranceProblems: [
      'Assumption of risk is asserted for a negligent feature.',
      'The feature is rebuilt before it is documented.',
      'The incident and patrol reports are not obtained.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What feature or run was involved?' },
      { label: 'Step 2', question: 'Was there adequate warning or signage?' },
      { label: 'Step 3', question: 'Did ski patrol make a report?' },
      { label: 'Step 4', question: 'What were the injuries and treatment?' },
    ],
  },
}
