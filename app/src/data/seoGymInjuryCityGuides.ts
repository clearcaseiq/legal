import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, gym / fitness-facility injury practice area: location-specific
 * guides for Los Angeles, San Diego, San Francisco, and San Jose.
 *
 * This is distinct from the trampoline-park / FEC hub (children and jump risks)
 * and from a plain slip-and-fall: it centers on the membership liability waiver
 * and its limits, defective or poorly maintained equipment, trainer and staff
 * negligence, and the medical-emergency (AED) duty owed by health studios.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: an enormous gym and studio market from big-box chains to
 *    boutique fitness.
 *  - San Diego: heavy year-round fitness culture, from beach gyms to CrossFit
 *    boxes.
 *  - San Francisco: dense boutique-studio scene with high-intensity classes.
 *  - San Jose: large corporate and tech-campus fitness facilities.
 *
 * Applied accurately:
 *  - A gym membership almost always includes a liability waiver. In California a
 *    waiver can bar an ordinary-negligence claim, but it cannot release a gym
 *    from gross negligence \u2014 an extreme departure from the ordinary standard of
 *    care (City of Santa Barbara v. Superior Court).
 *  - Defective or poorly maintained equipment can support a claim: a design or
 *    manufacturing defect against the maker under strict product liability, or
 *    premises negligence against the gym for failing to inspect and repair.
 *  - Primary assumption of risk covers the inherent risks of exercise, but it
 *    does not excuse conduct that unreasonably increases the risk beyond what is
 *    inherent \u2014 for example a trainer pushing a member past safe limits, improper
 *    spotting, or broken equipment left in service.
 *  - California requires health studios to have an automated external
 *    defibrillator (AED) and trained staff (Health and Safety Code section
 *    104113); a failure to have or use one during a cardiac emergency can be part
 *    of a claim.
 *  - The evidence is time-sensitive: the incident report, the equipment involved,
 *    surveillance video, the signed waiver, staff and witness statements, and
 *    medical records should be gathered quickly. A personal-injury deadline is
 *    generally two years (Code of Civil Procedure section 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a waiver applies, whether conduct was gross negligence, and which deadline governs depend on facts a licensed California attorney should review promptly.'

const WAIVER =
  'A gym membership almost always includes a liability waiver, and in California a waiver can bar an ordinary-negligence claim. It cannot, however, release a gym from gross negligence \u2014 an extreme departure from the ordinary standard of care (City of Santa Barbara v. Superior Court). So a signed waiver does not automatically end a case where the gym\u2019s conduct was egregious.'

const EQUIPMENT =
  'Defective or poorly maintained equipment can support a claim on two paths: a strict product-liability claim against the manufacturer for a design or manufacturing defect, and a premises-negligence claim against the gym for failing to inspect, maintain, or remove broken equipment. A waiver generally does not shield the equipment maker at all.'

const ASSUMPTION_RISK =
  'Primary assumption of risk covers the inherent risks of exercise, but it does not excuse conduct that unreasonably increases the risk beyond what is inherent. A trainer pushing a member well past safe limits, improper spotting, missing instruction, or a known-broken machine left in service can fall outside the protected inherent risks.'

const AED =
  'California requires health studios to acquire and maintain an automated external defibrillator (AED) and to have trained staff (Health and Safety Code section 104113). When a member suffers a cardiac emergency and the facility fails to have, maintain, or use an AED as required, that failure can be part of the claim.'

const EVIDENCE =
  'Gym-injury evidence is time-sensitive: the incident report, the specific equipment involved, surveillance video, the signed membership and waiver documents, staff and witness statements, and medical records should be gathered quickly before video is overwritten and equipment is repaired or replaced. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1).'

export const LA_GYM_SLUG = '/los-angeles-gym-injury-claim'
export const SD_GYM_SLUG = '/san-diego-gym-injury-claim'
export const SF_GYM_SLUG = '/san-francisco-gym-injury-claim'
export const SJ_GYM_SLUG = '/san-jose-gym-injury-claim'

export const gymInjuryCityGuidePages: LandingPage[] = [
  {
    slug: LA_GYM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Gym & Fitness Injury Claims',
    title: 'Los Angeles Gym & Fitness Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at an LA gym or studio? A membership waiver bars ordinary negligence \u2014 but not gross negligence, defective equipment, or trainer misconduct.',
    psychology: 'I was injured at my LA gym and they say the waiver I signed means I have no case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles gym injury lawyer',
      'gym waiver still sue california',
      'defective gym equipment injury california',
      'personal trainer negligence lawsuit california',
      'gym gross negligence california',
    ],
    signals: [
      'Waivers bar ordinary, not gross, negligence',
      'Defective / unmaintained equipment claims',
      'Trainer & staff negligence',
      'AED requirement for health studios',
      'Assumption-of-risk limits',
      'Preserve video and equipment fast',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s enormous market of big-box chains and boutique studios generates a steady stream of fitness injuries, and gyms routinely wave a signed waiver as if it ends every claim. ${WAIVER} ${EQUIPMENT} ${ASSUMPTION_RISK} ${AED} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'How the injury happened and what equipment was used',
        'Whether a trainer or staff member was involved',
        'The signed membership and waiver documents',
        'Any incident report the gym created',
        'Surveillance video of the incident',
        'Whether equipment was broken or unmaintained',
        'Whether an AED was available and used',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an LA member preserve the incident report, surveillance, and equipment, evaluate whether the conduct rises to gross negligence beyond the waiver, and identify an equipment maker where a defect is involved. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Do I really have no case?',
        a: 'Not necessarily. A California gym waiver can bar an ordinary-negligence claim, but it cannot release the gym from gross negligence \u2014 an extreme departure from the standard of care (City of Santa Barbara v. Superior Court). A defective-equipment claim against the maker is also separate.',
      },
      {
        q: 'A machine broke and injured me. Who is responsible?',
        a: 'Potentially both the manufacturer, under strict product liability for a defect, and the gym, for premises negligence in failing to inspect or remove broken equipment. A waiver generally does not shield the equipment maker.',
      },
      {
        q: 'My trainer pushed me until I got hurt. Is that covered by the waiver?',
        a: 'It may not be. Assumption of risk covers the inherent risks of exercise, but a trainer pushing a member past safe limits or spotting improperly can increase the risk beyond what is inherent, which can fall outside both the waiver and assumption of risk.',
      },
      {
        q: 'The gym had no working AED when I collapsed. Does that matter?',
        a: 'It can. California requires health studios to have and maintain an AED with trained staff (Health and Safety Code section 104113), and a failure during a cardiac emergency can be part of a claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the waiver, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_GYM_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Gym & Fitness Injury Claims',
    title: 'San Diego Gym & Fitness Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a San Diego gym, box, or beach fitness class? A waiver bars ordinary negligence \u2014 but not gross negligence, defective equipment, or trainer misconduct.',
    psychology: 'I got hurt in a CrossFit class in San Diego and the coach kept pushing me past my limit.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego gym injury lawyer',
      'crossfit injury lawsuit california',
      'gym waiver still sue california',
      'defective gym equipment injury california',
      'personal trainer negligence lawsuit california',
    ],
    signals: [
      'Waivers bar ordinary, not gross, negligence',
      'Defective / unmaintained equipment claims',
      'Trainer & staff negligence',
      'AED requirement for health studios',
      'Assumption-of-risk limits',
      'Preserve video and equipment fast',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s heavy year-round fitness culture \u2014 from beach gyms to high-intensity CrossFit boxes \u2014 puts many members into demanding coached workouts where a coach who ignores a member\u2019s limits can create liability. ${WAIVER} ${EQUIPMENT} ${ASSUMPTION_RISK} ${AED} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'How the injury happened and what movement or equipment',
        'Whether a coach or trainer directed the activity',
        'The signed membership and waiver documents',
        'Any incident report the facility created',
        'Surveillance video of the incident',
        'Whether the coaching ignored a stated limit',
        'Whether an AED was available and used',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Diego member document a coach who pushed past safe limits, preserve the incident report and video, and evaluate whether the conduct rises to gross negligence beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My coach pushed me until I was injured. Can I have a claim despite the waiver?',
        a: 'Possibly. A waiver bars ordinary negligence, but a coach who pushes a member past safe limits or ignores a stated restriction can increase the risk beyond the inherent risks of the class, and egregious conduct is not shielded as gross negligence.',
      },
      {
        q: 'What if the equipment failed?',
        a: 'A defect can support a strict product-liability claim against the maker, and poor maintenance can support premises negligence against the gym. A waiver generally does not protect the equipment manufacturer.',
      },
      {
        q: 'Does assumption of risk block my claim?',
        a: 'Not automatically. It covers the inherent risks of exercise, but not conduct that unreasonably increases the risk beyond what is inherent, such as improper coaching or broken equipment left in use.',
      },
      {
        q: 'What evidence should I preserve?',
        a: 'The incident report, surveillance video, the equipment involved, the waiver, coach and witness statements, and medical records \u2014 gathered quickly before video is overwritten.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the waiver, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_GYM_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Gym & Fitness Injury Claims',
    title: 'San Francisco Gym & Fitness Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a San Francisco boutique studio or gym? A waiver bars ordinary negligence \u2014 but not gross negligence, defective equipment, or instructor misconduct.',
    psychology: 'I was injured in a high-intensity SF studio class and I am not sure the waiver ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco gym injury lawyer',
      'boutique fitness class injury california',
      'gym waiver still sue california',
      'defective gym equipment injury california',
      'fitness instructor negligence lawsuit california',
    ],
    signals: [
      'Waivers bar ordinary, not gross, negligence',
      'Defective / unmaintained equipment claims',
      'Instructor & staff negligence',
      'AED requirement for health studios',
      'Assumption-of-risk limits',
      'Preserve video and equipment fast',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense boutique-studio scene runs on fast-paced, high-intensity classes where inadequate instruction, overcrowded floors, or a malfunctioning apparatus can turn a workout into a serious injury. ${WAIVER} ${EQUIPMENT} ${ASSUMPTION_RISK} ${AED} ${EVIDENCE} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'How the injury happened and what apparatus was used',
        'Whether an instructor directed the movement',
        'The signed membership and waiver documents',
        'Any incident report the studio created',
        'Surveillance video of the incident',
        'Whether the class was overcrowded or rushed',
        'Whether an AED was available and used',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Francisco member document inadequate instruction or a faulty apparatus, preserve the incident report and video, and evaluate whether the conduct rises to gross negligence beyond the waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The studio blames the waiver. Is that the end of my claim?',
        a: 'Not necessarily. A waiver bars ordinary negligence but cannot release gross negligence (City of Santa Barbara v. Superior Court), and a defective-apparatus claim against the maker is separate from any waiver.',
      },
      {
        q: 'The instructor gave almost no instruction before a hard move. Does that matter?',
        a: 'It can. Missing or inadequate instruction can increase the risk beyond the inherent risks of the class, which may fall outside both assumption of risk and the waiver depending on how egregious it was.',
      },
      {
        q: 'What if a machine or apparatus malfunctioned?',
        a: 'A defect can support a product-liability claim against the manufacturer, and poor maintenance can support premises negligence against the studio. The equipment maker is generally not protected by the waiver.',
      },
      {
        q: 'What evidence should I preserve?',
        a: 'The incident report, surveillance video, the apparatus involved, the waiver, instructor and witness statements, and medical records \u2014 gathered quickly before evidence is lost.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the waiver, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_GYM_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Gym & Fitness Injury Claims',
    title: 'San Jose Gym & Fitness Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a San Jose gym or corporate fitness center? A waiver bars ordinary negligence \u2014 but not gross negligence, defective equipment, or trainer misconduct.',
    psychology: 'I was hurt at a fitness center on a San Jose tech campus and do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose gym injury lawyer',
      'corporate fitness center injury california',
      'gym waiver still sue california',
      'defective gym equipment injury california',
      'personal trainer negligence lawsuit california',
    ],
    signals: [
      'Waivers bar ordinary, not gross, negligence',
      'Defective / unmaintained equipment claims',
      'Trainer & staff negligence',
      'AED requirement for health studios',
      'Assumption-of-risk limits',
      'Preserve video and equipment fast',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s large corporate and tech-campus fitness facilities can involve additional parties \u2014 the employer, a third-party management company, and the equipment maker \u2014 which affects who is responsible and which waiver, if any, actually applies. ${WAIVER} ${EQUIPMENT} ${ASSUMPTION_RISK} ${AED} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'How the injury happened and what equipment was used',
        'Who operates the facility \u2014 gym, employer, or vendor',
        'The signed membership or access waiver documents',
        'Any incident report that was created',
        'Surveillance video of the incident',
        'Whether equipment was broken or unmaintained',
        'Whether an AED was available and used',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Jose member identify who actually operates the facility, preserve the incident report and video, and evaluate whether the conduct rises to gross negligence beyond any waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The gym is run by a management company, not the chain. Who do I claim against?',
        a: 'Potentially the operator, a third-party management company, the property owner, or the equipment maker, depending on the facts. Identifying who actually ran and maintained the facility is an early, important step.',
      },
      {
        q: 'Does the waiver I signed end my claim?',
        a: 'Not necessarily. A waiver bars ordinary negligence but not gross negligence (City of Santa Barbara v. Superior Court), and a defective-equipment claim against the manufacturer is separate.',
      },
      {
        q: 'A machine was broken and injured me. What claims apply?',
        a: 'A strict product-liability claim against the maker for a defect, and a premises-negligence claim against whoever was responsible for inspecting and maintaining the equipment.',
      },
      {
        q: 'What if there was no working AED?',
        a: 'California requires health studios to have and maintain an AED with trained staff (Health and Safety Code section 104113), and a failure during a cardiac emergency can be part of a claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the operators, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const gymInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_GYM_SLUG]: {
    scenario: `An LA member was hurt when a cable machine\u2019s frayed cable snapped. The gym pointed to the waiver, but the known-broken equipment left in service supported gross negligence, and the cable maker faced a product claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; photograph the equipment.'],
      ['Preserve', 'Demand the incident report and video.'],
      ['Assess', 'Weigh gross negligence beyond the waiver.'],
      ['Longer term', 'Premises and product theories developed.'],
    ],
    severityLadder: [
      ['Waiver', 'It bars only ordinary negligence.'],
      ['Gross negligence', 'Egregious conduct is not released.'],
      ['Product', 'A defect claim runs against the maker.'],
      ['Evidence', 'The equipment and video prove it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Gym injuries can be severe.' },
      { label: 'Orthopedic care', copy: 'Strains, tears, and fractures are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the conduct was gross negligence',
      'Whether equipment was defective or unmaintained',
      'Whether the incident report and video survive',
      'Whether an AED duty was breached',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Broken equipment', copy: 'Left-in-service can be egregious.' },
      { label: 'Product path', copy: 'The maker is not shielded by the waiver.' },
      { label: 'Preserve fast', copy: 'Video is overwritten in days.' },
    ],
    insuranceProblems: [
      'The waiver is treated as a complete defense.',
      'The broken equipment is repaired before inspection.',
      'Surveillance video is overwritten.',
      'The equipment maker is never pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What equipment or activity caused the injury?' },
      { label: 'Step 2', question: 'Was the equipment broken or unmaintained?' },
      { label: 'Step 3', question: 'Did you sign a waiver?' },
      { label: 'Step 4', question: 'Is there an incident report or video?' },
    ],
  },
  [SD_GYM_SLUG]: {
    scenario: `A San Diego CrossFit member told the coach about a shoulder limit; the coach ordered heavier overhead reps anyway. Ignoring the stated restriction pushed the conduct beyond the inherent risks and past the waiver. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; note what the coach directed.'],
      ['Preserve', 'Demand the incident report and video.'],
      ['Assess', 'Weigh coaching conduct beyond the inherent risks.'],
      ['Longer term', 'Negligence beyond the waiver developed.'],
    ],
    severityLadder: [
      ['Waiver', 'It bars only ordinary negligence.'],
      ['Coaching', 'Ignoring limits increases risk.'],
      ['Beyond inherent', 'That conduct is not protected.'],
      ['Evidence', 'Video and witnesses prove it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Overload injuries can be severe.' },
      { label: 'Orthopedic care', copy: 'Tears and joint injuries are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the coach ignored a stated limit',
      'Whether the conduct exceeded inherent risks',
      'Whether the incident report and video survive',
      'Whether witnesses corroborate the coaching',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Stated limits matter', copy: 'Ignoring them increases risk.' },
      { label: 'Beyond inherent', copy: 'That conduct is not protected.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve fast', copy: 'Video is overwritten in days.' },
    ],
    insuranceProblems: [
      'The class is treated as inherently risky, full stop.',
      'The waiver is treated as a complete defense.',
      'Surveillance video is overwritten.',
      'Witness accounts are never gathered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What movement or drill caused the injury?' },
      { label: 'Step 2', question: 'Did you tell the coach about a limit?' },
      { label: 'Step 3', question: 'Did you sign a waiver?' },
      { label: 'Step 4', question: 'Are there witnesses or video?' },
    ],
  },
  [SF_GYM_SLUG]: {
    scenario: `A San Francisco studio ran an overcrowded class with almost no instruction on a new apparatus. A member fell; the thin instruction and crowding supported a claim beyond the inherent risks of the class. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; note the instruction given.'],
      ['Preserve', 'Demand the incident report and video.'],
      ['Assess', 'Weigh instruction and crowding beyond inherent risk.'],
      ['Longer term', 'Negligence beyond the waiver developed.'],
    ],
    severityLadder: [
      ['Waiver', 'It bars only ordinary negligence.'],
      ['Instruction', 'Too little can increase the risk.'],
      ['Crowding', 'It can create a hazard.'],
      ['Evidence', 'Video and witnesses prove it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Fall injuries can be severe.' },
      { label: 'Orthopedic care', copy: 'Fractures and sprains are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether instruction was inadequate',
      'Whether the class was unsafely crowded',
      'Whether an apparatus malfunctioned',
      'Whether the incident report and video survive',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Instruction matters', copy: 'Too little can exceed inherent risk.' },
      { label: 'Crowding counts', copy: 'It can be a created hazard.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve fast', copy: 'Video is overwritten in days.' },
    ],
    insuranceProblems: [
      'The waiver is treated as a complete defense.',
      'The class is called inherently risky, full stop.',
      'Surveillance video is overwritten.',
      'The apparatus is not preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What apparatus or movement was involved?' },
      { label: 'Step 2', question: 'What instruction were you given?' },
      { label: 'Step 3', question: 'Was the class overcrowded?' },
      { label: 'Step 4', question: 'Is there an incident report or video?' },
    ],
  },
  [SJ_GYM_SLUG]: {
    scenario: `A San Jose member was hurt at a tech-campus gym run by an outside vendor. Identifying the management company \u2014 not just the employer \u2014 and preserving the maintenance records opened the right claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report it; identify who runs the facility.'],
      ['Preserve', 'Demand the incident report and maintenance records.'],
      ['Assess', 'Map the operator, owner, and equipment maker.'],
      ['Longer term', 'Premises and product theories developed.'],
    ],
    severityLadder: [
      ['Operator', 'Who ran the facility matters.'],
      ['Waiver', 'It bars only ordinary negligence.'],
      ['Product', 'A defect claim runs against the maker.'],
      ['Evidence', 'Records and video prove it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Gym injuries can be severe.' },
      { label: 'Orthopedic care', copy: 'Strains, tears, and fractures are common.' },
      { label: 'Rehabilitation', copy: 'Recovery is documented over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Who operated and maintained the facility',
      'Whether equipment was defective or unmaintained',
      'Whether a waiver applies and to whom',
      'Whether the records and video survive',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Find the operator', copy: 'Vendor and owner may share fault.' },
      { label: 'Product path', copy: 'The maker is not shielded by a waiver.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Preserve fast', copy: 'Records and video can disappear.' },
    ],
    insuranceProblems: [
      'Only the employer is blamed, missing the vendor.',
      'The waiver is treated as a complete defense.',
      'Maintenance records are never requested.',
      'The equipment maker is never pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who operates the fitness facility?' },
      { label: 'Step 2', question: 'What equipment or activity caused the injury?' },
      { label: 'Step 3', question: 'Did you sign a waiver, and with whom?' },
      { label: 'Step 4', question: 'Is there an incident report or video?' },
    ],
  },
}
