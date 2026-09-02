import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, dangerous-roadway / government-liability practice area (batch 3):
 * location-specific guides for San Francisco, San Bernardino, Long Beach, and
 * Anaheim, extending the batch-1 (LA, Oakland, Sacramento, San Jose) and batch-2
 * (San Diego, Fresno, Riverside, Bakersfield) hub.
 *
 * A crash caused partly by the road itself \u2014 a dangerous design, a missing sign
 * or signal, an unrepaired defect, or obscured sightlines \u2014 can support a claim
 * against the public entity that owns and controls the road, but those claims run
 * on a much shorter clock and a specialised legal standard.
 *
 * Local context, genuine rather than interpolated:
 *  - San Francisco: steep hills, complex multi-modal intersections, and heavy
 *    transit/pedestrian mixing, where signal timing and sightlines recur.
 *  - San Bernardino: fast-growing inland arterials and freeway interchanges
 *    (I-15/I-215/I-10) where reconfigured or under-signed intersections recur.
 *  - Long Beach: dense port-adjacent truck routes and downtown grid intersections
 *    where signal and channelization design questions arise.
 *  - Anaheim: heavy tourist-corridor traffic around I-5 and event venues, where
 *    signage, merge design, and pedestrian crossings recur.
 *
 * Applied accurately (Government Code section 835 dangerous-condition liability;
 * six-month Government Claims Act deadline, Government Code 911.2; design immunity
 * under Government Code 830.6 and how a changed-conditions theory can overcome it;
 * concurrent private-driver fault; pure comparative negligence; two-year deadline
 * CCP 335.1 against private defendants; the need to preserve the roadway condition
 * before it is changed or repaired).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a dangerous-condition claim exists, whether design immunity applies, and which deadline controls depend on facts a licensed California attorney should review promptly.'

const DANGEROUS_CONDITION =
  'A public entity can be liable when a road it owns and controls was in a dangerous condition that caused the crash \u2014 a defective design, a missing or malfunctioning signal or sign, an unrepaired hazard, or obscured sightlines \u2014 and the entity knew or should have known about it in time to fix it (Government Code section 835). This is separate from, and can be in addition to, the fault of any driver.'

const SHORT_DEADLINE =
  'A claim against a city, county, or the state is governed by the Government Claims Act, which requires a formal written claim within six months of the crash (Government Code section 911.2) \u2014 far shorter than the two years that apply to a claim against a private driver. Missing that six-month window usually ends the claim against the public entity, so identifying a public road owner early is critical.'

const DESIGN_IMMUNITY =
  'Public entities often raise design immunity (Government Code section 830.6), arguing that a discretionary, approved design shields them. That defense is not absolute: where conditions have changed since approval \u2014 growth, new traffic patterns, or a documented history of similar crashes the entity ignored \u2014 a changed-conditions theory can overcome it. Establishing that history early is often what makes the claim viable.'

const CONCURRENT =
  'These crashes usually involve both a driver and the roadway, and the two can share responsibility. Pursuing the driver alone can leave much of the harm uncompensated when a road defect was a real cause, so identifying both the private and public defendants \u2014 on their different deadlines \u2014 matters. Preserving the physical condition of the road before it is changed or repaired is equally important.'

export const SF_ROAD_SLUG = '/san-francisco-dangerous-road-accident'
export const SB_ROAD_SLUG = '/san-bernardino-dangerous-road-accident'
export const LB_ROAD_SLUG = '/long-beach-dangerous-road-accident'
export const ANAHEIM_ROAD_SLUG = '/anaheim-dangerous-road-accident'

export const dangerousRoadwayCityGuidePages3: LandingPage[] = [
  {
    slug: SF_ROAD_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Dangerous Roadway Claims',
    title: 'San Francisco Dangerous Roadway & Government Liability Claims',
    eyebrow: 'California local injury guide',
    description:
      'Was a San Francisco crash caused partly by the road \u2014 bad signal timing, sightlines, or design? A claim against the city runs on a six-month deadline.',
    psychology: 'A San Francisco road defect helped cause my crash and I do not know how to hold the city responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco dangerous road accident lawyer',
      'sue city for road defect california',
      'government claim six month deadline california',
      'dangerous intersection lawsuit california',
      'caltrans road design claim california',
    ],
    signals: [
      'Dangerous-condition liability (835)',
      'Six-month government deadline',
      'Design immunity / changed conditions',
      'Signal timing & sightlines',
      'Concurrent driver fault',
      'Preserve the roadway condition',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s steep hills, complex multi-modal intersections, and heavy transit and pedestrian mixing mean signal timing and sightlines are recurring factors when a crash is caused partly by the road itself. ${DANGEROUS_CONDITION} ${SHORT_DEADLINE} ${DESIGN_IMMUNITY} ${CONCURRENT} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Which entity owns the road (city, county, Caltrans)',
        'The specific defect (signal, sign, design, sightline)',
        'The date of the crash (six-month clock)',
        'Any history of similar crashes at the location',
        'Photographs and measurements of the condition',
        'The at-fault driver and their insurance',
        'The police report and any diagrams',
        'The injuries and full treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies which public entity owns a San Francisco road, flags the six-month government-claim deadline, gathers the crash history that can overcome design immunity, and preserves the roadway condition before it is changed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How long do I have to claim against the city?',
        a: 'Usually six months from the crash. A claim against a city, county, or the state is governed by the Government Claims Act, which requires a formal written claim within six months \u2014 far shorter than the two years for a private driver. Missing that window usually ends the claim against the public entity.',
      },
      {
        q: 'The city says the road design was approved and it is immune. Is that the end?',
        a: 'Not necessarily. Design immunity is not absolute. Where conditions have changed since approval \u2014 growth, new traffic patterns, or a documented history of similar crashes the entity ignored \u2014 a changed-conditions theory can overcome it. Establishing that history early is often what makes the claim viable.',
      },
      {
        q: 'The other driver was also at fault. Can I still claim against the city?',
        a: 'Yes. These crashes usually involve both a driver and the roadway, and the two can share responsibility. Pursuing the driver alone can leave much of the harm uncompensated when a road defect was a real cause, so identifying both defendants on their different deadlines matters.',
      },
      {
        q: 'What should be preserved?',
        a: 'Photographs and measurements of the condition before it is changed or repaired, plus any record of prior similar crashes at the location. Physical conditions and signal timing can change quickly after an incident, so early preservation matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the ownership, deadline, and roadway evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_ROAD_SLUG,
    category: 'Cities',
    cluster: 'San Bernardino Dangerous Roadway Claims',
    title: 'San Bernardino Dangerous Roadway & Government Liability Claims',
    eyebrow: 'California local injury guide',
    description:
      'Was a San Bernardino crash caused partly by a reconfigured or under-signed intersection or interchange? A claim against the public road owner runs on a six-month deadline.',
    psychology: 'A San Bernardino road or interchange helped cause my crash and I do not know how to hold the entity responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino dangerous road accident lawyer',
      'sue city for road defect california',
      'government claim six month deadline california',
      'dangerous intersection lawsuit california',
      'freeway interchange design claim california',
    ],
    signals: [
      'Dangerous-condition liability (835)',
      'Six-month government deadline',
      'Reconfigured / under-signed intersections',
      'Design immunity / changed conditions',
      'Concurrent driver fault',
      'Preserve the roadway condition',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s fast-growing inland arterials and freeway interchanges \u2014 I-15, I-215, and I-10 \u2014 mean reconfigured or under-signed intersections recur, exactly the changed-conditions situations where a road can be a real cause of a crash. ${DANGEROUS_CONDITION} ${SHORT_DEADLINE} ${DESIGN_IMMUNITY} ${CONCURRENT} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'Which entity owns the road (city, county, Caltrans)',
        'Whether the intersection or interchange was recently reconfigured',
        'The specific defect (signal, sign, design, sightline)',
        'The date of the crash (six-month clock)',
        'Any history of similar crashes at the location',
        'Photographs and measurements of the condition',
        'The at-fault driver and their insurance',
        'The injuries and full treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies which public entity owns a San Bernardino road, flags the six-month government-claim deadline, documents recent reconfiguration and crash history to meet a changed-conditions theory, and preserves the condition before it changes. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The intersection was recently reconfigured. Does that help?',
        a: 'It can. Where conditions have changed since a design was approved \u2014 including a reconfiguration or new traffic patterns \u2014 a changed-conditions theory can overcome design immunity. Documenting the reconfiguration and any resulting crash history early is often what makes the claim viable.',
      },
      {
        q: 'How long do I have to claim against the public entity?',
        a: 'Usually six months from the crash under the Government Claims Act \u2014 far shorter than the two years for a private driver. Missing that window usually ends the claim against the public entity, so identifying a public road owner early is critical.',
      },
      {
        q: 'The other driver was also at fault. Can I still claim against the entity?',
        a: 'Yes. These crashes usually involve both a driver and the roadway, which can share responsibility. Pursuing the driver alone can leave much of the harm uncompensated when a road defect was a real cause, so identifying both defendants matters.',
      },
      {
        q: 'What should be preserved?',
        a: 'Photographs and measurements of the condition before it is changed or repaired, plus records of the reconfiguration and any prior similar crashes. Physical conditions change quickly after an incident, so early preservation matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the ownership, deadline, and roadway evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_ROAD_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Dangerous Roadway Claims',
    title: 'Long Beach Dangerous Roadway & Government Liability Claims',
    eyebrow: 'California local injury guide',
    description:
      'Was a Long Beach crash caused partly by the road \u2014 a port-truck route, signal, or intersection design? A claim against the public road owner runs on a six-month deadline.',
    psychology: 'A Long Beach road or intersection helped cause my crash and I do not know how to hold the entity responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach dangerous road accident lawyer',
      'sue city for road defect california',
      'government claim six month deadline california',
      'dangerous intersection lawsuit california',
      'truck route design claim california',
    ],
    signals: [
      'Dangerous-condition liability (835)',
      'Six-month government deadline',
      'Port-truck route / grid intersections',
      'Design immunity / changed conditions',
      'Concurrent driver fault',
      'Preserve the roadway condition',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s dense port-adjacent truck routes and downtown grid intersections raise recurring signal and channelization design questions when a crash is caused partly by the road itself. ${DANGEROUS_CONDITION} ${SHORT_DEADLINE} ${DESIGN_IMMUNITY} ${CONCURRENT} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Which entity owns the road (city, county, port, Caltrans)',
        'The specific defect (signal, channelization, sign, sightline)',
        'Whether it is a designated truck route',
        'The date of the crash (six-month clock)',
        'Any history of similar crashes at the location',
        'Photographs and measurements of the condition',
        'The at-fault driver and their insurance',
        'The injuries and full treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies which public entity owns a Long Beach road \u2014 including port and truck-route authorities \u2014 flags the six-month deadline, gathers crash history to meet a changed-conditions theory, and preserves the condition before it changes. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The crash was on a port-area truck route. Who owns the road?',
        a: 'It depends \u2014 it may be the city, the county, the port authority, or Caltrans, and more than one entity can be involved. Identifying the correct public owner early is essential, because the six-month government-claim deadline runs from the crash regardless.',
      },
      {
        q: 'How long do I have to claim against the public entity?',
        a: 'Usually six months from the crash under the Government Claims Act \u2014 far shorter than the two years for a private driver. Missing that window usually ends the claim against the public entity.',
      },
      {
        q: 'The city says the design was approved and it is immune. Is that the end?',
        a: 'Not necessarily. Design immunity is not absolute. Where conditions have changed since approval \u2014 new traffic patterns or a documented history of similar crashes the entity ignored \u2014 a changed-conditions theory can overcome it.',
      },
      {
        q: 'The other driver was also at fault. Can I still claim against the entity?',
        a: 'Yes. These crashes usually involve both a driver and the roadway, which can share responsibility. Identifying both the private and public defendants, on their different deadlines, matters so the harm is not left uncompensated.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the ownership, deadline, and roadway evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_ROAD_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Dangerous Roadway Claims',
    title: 'Anaheim Dangerous Roadway & Government Liability Claims',
    eyebrow: 'California local injury guide',
    description:
      'Was an Anaheim crash caused partly by the road \u2014 tourist-corridor signage, a merge, or a pedestrian crossing near I-5 or an event venue? A claim against the road owner runs on a six-month deadline.',
    psychology: 'An Anaheim road or crossing helped cause my crash and I do not know how to hold the entity responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim dangerous road accident lawyer',
      'sue city for road defect california',
      'government claim six month deadline california',
      'dangerous intersection lawsuit california',
      'pedestrian crossing defect claim california',
    ],
    signals: [
      'Dangerous-condition liability (835)',
      'Six-month government deadline',
      'Tourist-corridor signage & merges',
      'Pedestrian crossing design',
      'Design immunity / changed conditions',
      'Concurrent driver fault',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s heavy tourist-corridor traffic around I-5 and its event venues means signage, merge design, and pedestrian crossings recur as factors when a crash is caused partly by the road itself, often involving unfamiliar out-of-town drivers and large pedestrian volumes. ${DANGEROUS_CONDITION} ${SHORT_DEADLINE} ${DESIGN_IMMUNITY} ${CONCURRENT} Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Which entity owns the road (city, county, Caltrans)',
        'The specific defect (signage, merge, crossing, signal, sightline)',
        'Whether it involved a pedestrian crossing or event traffic',
        'The date of the crash (six-month clock)',
        'Any history of similar crashes at the location',
        'Photographs and measurements of the condition',
        'The at-fault driver and their insurance',
        'The injuries and full treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies which public entity owns an Anaheim road, flags the six-month government-claim deadline, gathers the signage and crash history that can overcome design immunity, and preserves the condition before it is changed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The crash involved a confusing merge or unclear signage near I-5. Is that a claim?',
        a: 'Possibly. A public entity can be liable when a road it controls was in a dangerous condition \u2014 including inadequate or confusing signage or a defective merge design \u2014 that caused the crash and that it knew or should have known about. Whether it rises to a dangerous condition is fact-specific.',
      },
      {
        q: 'How long do I have to claim against the public entity?',
        a: 'Usually six months from the crash under the Government Claims Act \u2014 far shorter than the two years for a private driver. Missing that window usually ends the claim against the public entity, so identifying a public road owner early is critical.',
      },
      {
        q: 'It was a pedestrian crossing near an event venue. Does that change anything?',
        a: 'The same dangerous-condition rules apply to a crossing \u2014 a poorly designed, poorly marked, or poorly signalled crossing can be a dangerous condition. Large event-driven pedestrian volumes can be part of a changed-conditions theory if the entity failed to respond to them.',
      },
      {
        q: 'The other driver was also at fault. Can I still claim against the entity?',
        a: 'Yes. These crashes usually involve both a driver and the roadway, which can share responsibility. Identifying both defendants, on their different deadlines, matters so the harm is not left uncompensated.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the ownership, deadline, and roadway evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const dangerousRoadwayCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [SF_ROAD_SLUG]: {
    scenario: `A San Francisco cyclist was hit at a hillside intersection where obstructed sightlines and mistimed signals had produced repeated near-misses. A six-month claim against the city, backed by that crash history, ran alongside the driver claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the road owner; photograph the condition.'],
      ['Six-month mark', 'Present the government claim.'],
      ['Assessment', 'Design immunity and crash history reviewed.'],
      ['Longer term', 'Both public and driver claims developed.'],
    ],
    severityLadder: [
      ['The defect', 'Signal timing or sightline.'],
      ['The owner', 'City, county, or Caltrans.'],
      ['The deadline', 'Six months against the entity.'],
      ['Immunity', 'Changed conditions can overcome it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether a dangerous condition caused the crash',
      'Whether the six-month claim was filed',
      'Whether crash history overcomes design immunity',
      'The share of driver versus roadway fault',
      'Whether the condition was preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'Six months against the entity.' },
      { label: 'History matters', copy: 'It can overcome immunity.' },
      { label: 'Two defendants', copy: 'Driver and roadway share fault.' },
      { label: 'Preserve it', copy: 'Photos before the road changes.' },
    ],
    insuranceProblems: [
      'The six-month government deadline is missed.',
      'Design immunity is never challenged.',
      'The roadway condition is repaired before documentation.',
      'Only the driver is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What road defect contributed?' },
      { label: 'Step 2', question: 'Which entity owns the road?' },
      { label: 'Step 3', question: 'When did the crash happen (six-month clock)?' },
      { label: 'Step 4', question: 'Is there a history of crashes there?' },
    ],
  },
  [SB_ROAD_SLUG]: {
    scenario: `A San Bernardino driver was hit at a recently reconfigured I-215 arterial intersection that lacked adequate signage. The reconfiguration and resulting crash history supported a changed-conditions theory against the entity. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the road owner; photograph the condition.'],
      ['Six-month mark', 'Present the government claim.'],
      ['Assessment', 'Reconfiguration and crash history reviewed.'],
      ['Longer term', 'Both public and driver claims developed.'],
    ],
    severityLadder: [
      ['The defect', 'Under-signed or reconfigured intersection.'],
      ['The owner', 'City, county, or Caltrans.'],
      ['The deadline', 'Six months against the entity.'],
      ['Immunity', 'Changed conditions can overcome it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether a dangerous condition caused the crash',
      'Whether the six-month claim was filed',
      'Whether reconfiguration supports changed conditions',
      'The share of driver versus roadway fault',
      'Whether the condition was preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'Six months against the entity.' },
      { label: 'Reconfiguration', copy: 'It supports changed conditions.' },
      { label: 'Two defendants', copy: 'Driver and roadway share fault.' },
      { label: 'Preserve it', copy: 'Photos before the road changes.' },
    ],
    insuranceProblems: [
      'The six-month government deadline is missed.',
      'The reconfiguration and crash history are never documented.',
      'The roadway condition is repaired before documentation.',
      'Only the driver is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the intersection recently reconfigured?' },
      { label: 'Step 2', question: 'Which entity owns the road?' },
      { label: 'Step 3', question: 'When did the crash happen (six-month clock)?' },
      { label: 'Step 4', question: 'Is there a history of crashes there?' },
    ],
  },
  [LB_ROAD_SLUG]: {
    scenario: `A Long Beach motorist was hit on a port-adjacent truck route where channelization funneled trucks and cars into conflict. Identifying the correct public owner and its crash history anchored the six-month claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the road owner; photograph the condition.'],
      ['Six-month mark', 'Present the government claim.'],
      ['Assessment', 'Channelization and crash history reviewed.'],
      ['Longer term', 'Both public and driver claims developed.'],
    ],
    severityLadder: [
      ['The defect', 'Channelization or signal design.'],
      ['The owner', 'City, county, port, or Caltrans.'],
      ['The deadline', 'Six months against the entity.'],
      ['Immunity', 'Changed conditions can overcome it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether a dangerous condition caused the crash',
      'Which public entity owns the truck route',
      'Whether the six-month claim was filed',
      'The share of driver versus roadway fault',
      'Whether the condition was preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Find the owner', copy: 'City, port, or Caltrans.' },
      { label: 'Deadline is short', copy: 'Six months against the entity.' },
      { label: 'Two defendants', copy: 'Driver and roadway share fault.' },
      { label: 'Preserve it', copy: 'Photos before the road changes.' },
    ],
    insuranceProblems: [
      'The correct public owner is never identified.',
      'The six-month government deadline is missed.',
      'The roadway condition is repaired before documentation.',
      'Only the driver is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a designated truck route?' },
      { label: 'Step 2', question: 'Which entity owns the road?' },
      { label: 'Step 3', question: 'When did the crash happen (six-month clock)?' },
      { label: 'Step 4', question: 'Is there a history of crashes there?' },
    ],
  },
  [ANAHEIM_ROAD_SLUG]: {
    scenario: `An Anaheim pedestrian was hit at a poorly marked crossing near an event venue during a surge in foot traffic. The crossing design and the entity\u2019s failure to respond to event volumes supported a dangerous-condition claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the road owner; photograph the crossing.'],
      ['Six-month mark', 'Present the government claim.'],
      ['Assessment', 'Crossing design and event history reviewed.'],
      ['Longer term', 'Both public and driver claims developed.'],
    ],
    severityLadder: [
      ['The defect', 'Crossing, signage, or merge design.'],
      ['The owner', 'City, county, or Caltrans.'],
      ['The deadline', 'Six months against the entity.'],
      ['Immunity', 'Changed conditions can overcome it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether a dangerous condition caused the crash',
      'Whether the six-month claim was filed',
      'Whether event volumes support changed conditions',
      'The share of driver versus roadway fault',
      'Whether the condition was preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Crossing design', copy: 'It can be a dangerous condition.' },
      { label: 'Deadline is short', copy: 'Six months against the entity.' },
      { label: 'Event volumes', copy: 'They can support changed conditions.' },
      { label: 'Preserve it', copy: 'Photos before the road changes.' },
    ],
    insuranceProblems: [
      'The six-month government deadline is missed.',
      'The crossing design is never analysed.',
      'The roadway condition is repaired before documentation.',
      'Only the driver is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What crossing, signage, or merge contributed?' },
      { label: 'Step 2', question: 'Which entity owns the road?' },
      { label: 'Step 3', question: 'When did the crash happen (six-month clock)?' },
      { label: 'Step 4', question: 'Was event traffic a factor?' },
    ],
  },
}
