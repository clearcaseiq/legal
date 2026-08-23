import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, bus and public-transit practice area (batch 3): city-specific
 * guides for Fresno, Riverside, San Bernardino, and Bakersfield, extending the
 * batch-1 hub (Los Angeles, San Francisco, San Diego, Sacramento) and batch-2
 * (San Jose, Oakland, Long Beach, Anaheim).
 *
 * The same two rules converge as in earlier batches:
 *  - The common-carrier heightened duty of "utmost care and diligence" (Civil
 *    Code section 2100) toward passengers.
 *  - The public-entity claim rules: a written claim within six months under the
 *    Government Claims Act (Gov. Code section 911.2), and vicarious liability for
 *    employees under Government Code section 815.2.
 *
 * Local context, genuine rather than interpolated:
 *  - Fresno: the FAX (Fresno Area Express) bus network, a city department on the
 *    six-month clock, serving a dense urban core and wide surrounding region.
 *  - Riverside: the RTA (Riverside Transit Agency) buses across a spread-out
 *    Inland Empire county, a public district, often with contracted operators.
 *  - San Bernardino: Omnitrans buses and the sbX bus rapid transit line, a public
 *    agency serving a large inland service area.
 *  - Bakersfield: GET (Golden Empire Transit) buses serving Kern County\u2019s urban
 *    core, a public district on the six-month claim track.
 *
 * Applied accurately:
 *  - A passenger benefits from the common-carrier heightened duty; a pedestrian,
 *    cyclist, or motorist hit by a transit vehicle brings an ordinary negligence
 *    claim, but still against a public entity on the six-month deadline.
 *  - Some routes are operated by contracted private companies, which changes who
 *    is sued and whether the six-month rule applies.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    where a private operator (not a public entity) is responsible.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a public entity or a private operator is responsible, whether the six-month claim deadline applies, and how the common-carrier duty and comparative fault are assessed depend on facts a licensed California attorney should review promptly.'

const COMMON_CARRIER =
  'Buses and light rail are common carriers, which under Civil Code section 2100 owe their passengers the \u201cutmost care and diligence\u201d \u2014 a duty higher than the ordinary reasonable-care standard. A passenger hurt by a sudden jerk, a hard stop, a fall on boarding, a door closing on them, or an operator\u2019s unsafe move benefits from that elevated standard, which makes many transit-passenger claims stronger than they first appear.'

const SIX_MONTH =
  'Most California transit is run by public agencies, so a claim against the agency must be presented in writing within six months under the Government Claims Act (Gov. Code section 911.2) \u2014 far shorter than the ordinary two years \u2014 and the agency is responsible for its employees\u2019 negligence under Government Code section 815.2. Missing that six-month deadline can end an otherwise strong claim, so acting quickly is essential.'

const WHO_HIT =
  'Who you are shapes the claim. A passenger benefits from the common-carrier heightened duty. A pedestrian, cyclist, or driver struck by a bus brings an ordinary negligence claim \u2014 but still against a public entity, so the same six-month deadline applies. In every case, identifying whether the operator is the public agency or a contracted private company determines who is sued and which deadline controls.'

export const FRESNO_TRANSIT_SLUG = '/fresno-fax-bus-accident'
export const RIV_TRANSIT_SLUG = '/riverside-rta-bus-accident'
export const SB_TRANSIT_SLUG = '/san-bernardino-omnitrans-accident'
export const BAKERSFIELD_TRANSIT_SLUG = '/bakersfield-get-bus-accident'

export const transitCityGuidePages3: LandingPage[] = [
  {
    slug: FRESNO_TRANSIT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno FAX and Transit Accident Claims',
    title: 'Fresno FAX Bus & Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by a Fresno FAX bus? Passengers get the common-carrier heightened duty, but a claim against the city runs on a six-month deadline.',
    psychology: 'I was hurt on or by a Fresno bus and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno bus accident lawyer',
      'fax bus injury claim california',
      'hit by city bus claim california',
      'government claim six month deadline california',
      'common carrier duty bus passenger california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Six-month government deadline',
      'Passenger vs. pedestrian/cyclist',
      'FAX is a city department',
      'Contracted-operator question',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s FAX (Fresno Area Express) bus network is a city department serving a dense urban core and a wide surrounding region, so a claim against it runs on the short public-entity clock. ${COMMON_CARRIER} ${SIX_MONTH} ${WHO_HIT} Civil cases involving a private operator are filed in Fresno County Superior Court within the ordinary two years.`,
      whatToTrack: [
        'Whether you were a passenger, pedestrian, cyclist, or driver',
        'Whether the operator was FAX or a contracted company',
        'The date of the incident (six-month clock)',
        'The bus route, number, and any onboard camera footage',
        'The operator\u2019s conduct (jerk, hard stop, door, unsafe move)',
        'The police or incident report',
        'Witness contacts',
        'The injuries and full treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Fresno bus was run by FAX or a contractor, applies the common-carrier duty for passengers, and flags the six-month government-claim deadline before it passes. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How long do I have to bring a claim against FAX?',
        a: 'Usually six months from the incident. FAX is a city department, so a claim against it is governed by the Government Claims Act, which requires a written claim within six months \u2014 far shorter than the ordinary two years. Missing that window can end an otherwise strong claim.',
      },
      {
        q: 'I was a passenger who fell during a hard stop. Does that help my claim?',
        a: 'Yes. Buses are common carriers that owe passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100 \u2014 a higher duty than ordinary reasonable care. A fall from a sudden jerk, a hard stop, or an unsafe move benefits from that elevated standard.',
      },
      {
        q: 'I was a pedestrian hit by a bus, not a passenger. Is my claim different?',
        a: 'Somewhat. A pedestrian, cyclist, or driver struck by a bus brings an ordinary negligence claim rather than a common-carrier claim, but it is still against a public entity, so the same six-month deadline applies.',
      },
      {
        q: 'What if a private company operated the route?',
        a: 'Some routes are run by contracted private companies, which changes who is sued and can change the deadline to the ordinary two years. Identifying the true operator early is essential.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the operator, deadline, and evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_TRANSIT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside RTA and Transit Accident Claims',
    title: 'Riverside RTA Bus & Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by a Riverside RTA bus? Passengers get the common-carrier heightened duty, but a claim against the transit agency runs on a six-month deadline.',
    psychology: 'I was hurt on or by a Riverside bus and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside bus accident lawyer',
      'rta bus injury claim california',
      'hit by transit bus claim california',
      'government claim six month deadline california',
      'common carrier duty bus passenger california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Six-month government deadline',
      'Passenger vs. pedestrian/cyclist',
      'RTA is a public district',
      'Contracted-operator question',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s RTA (Riverside Transit Agency) buses run across a spread-out Inland Empire county, and the agency frequently uses contracted operators \u2014 so identifying who ran the bus is often the first step. ${COMMON_CARRIER} ${SIX_MONTH} ${WHO_HIT} Civil cases involving a private operator are filed in Riverside County Superior Court within the ordinary two years.`,
      whatToTrack: [
        'Whether you were a passenger, pedestrian, cyclist, or driver',
        'Whether the operator was RTA or a contracted company',
        'The date of the incident (six-month clock)',
        'The bus route, number, and any onboard camera footage',
        'The operator\u2019s conduct (jerk, hard stop, door, unsafe move)',
        'The police or incident report',
        'Witness contacts',
        'The injuries and full treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Riverside bus was run by RTA or a contractor, applies the common-carrier duty for passengers, and flags the six-month government-claim deadline before it passes. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The bus may have been run by a contractor, not RTA. Why does that matter?',
        a: 'RTA frequently uses contracted operators. If a private company ran the bus, that changes who is sued and can change the deadline from six months to the ordinary two years. Identifying the true operator early is essential so the right claim is filed on the right clock.',
      },
      {
        q: 'How long do I have to bring a claim against RTA?',
        a: 'Usually six months from the incident. RTA is a public district, so a claim against it is governed by the Government Claims Act, which requires a written claim within six months \u2014 far shorter than the ordinary two years.',
      },
      {
        q: 'I was a passenger who was hurt when the bus jerked. Does that help?',
        a: 'Yes. Buses are common carriers that owe passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100 \u2014 a higher duty than ordinary reasonable care \u2014 which makes many transit-passenger claims stronger than they first appear.',
      },
      {
        q: 'I was a driver hit by a bus, not a passenger. Is my claim different?',
        a: 'Somewhat. A driver, pedestrian, or cyclist struck by a bus brings an ordinary negligence claim rather than a common-carrier claim, but it is still against a public entity, so the same six-month deadline applies.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the operator, deadline, and evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_TRANSIT_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Omnitrans and Transit Accident Claims',
    title: 'San Bernardino Omnitrans & Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by an Omnitrans bus or the sbX rapid transit line? Passengers get the common-carrier heightened duty, but a claim against the agency runs on a six-month deadline.',
    psychology: 'I was hurt on or by a San Bernardino bus and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino bus accident lawyer',
      'omnitrans injury claim california',
      'sbx bus rapid transit accident california',
      'government claim six month deadline california',
      'common carrier duty bus passenger california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Six-month government deadline',
      'Passenger vs. pedestrian/cyclist',
      'Omnitrans / sbX public agency',
      'Contracted-operator question',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s Omnitrans buses and the sbX bus rapid transit line are run by a public agency serving a large inland service area, so a claim against it runs on the short public-entity clock. ${COMMON_CARRIER} ${SIX_MONTH} ${WHO_HIT} Civil cases involving a private operator are filed in San Bernardino County Superior Court within the ordinary two years.`,
      whatToTrack: [
        'Whether you were a passenger, pedestrian, cyclist, or driver',
        'Whether the operator was Omnitrans or a contracted company',
        'The date of the incident (six-month clock)',
        'The bus or sbX route, number, and any onboard camera footage',
        'The operator\u2019s conduct (jerk, hard stop, door, unsafe move)',
        'The police or incident report',
        'Witness contacts',
        'The injuries and full treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a San Bernardino bus was run by Omnitrans or a contractor, applies the common-carrier duty for passengers, and flags the six-month government-claim deadline before it passes. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How long do I have to bring a claim against Omnitrans?',
        a: 'Usually six months from the incident. Omnitrans is a public agency, so a claim against it is governed by the Government Claims Act, which requires a written claim within six months \u2014 far shorter than the ordinary two years. Missing that window can end an otherwise strong claim.',
      },
      {
        q: 'I was a passenger hurt on the sbX. Does the common-carrier duty apply?',
        a: 'Yes. The sbX and Omnitrans buses are common carriers that owe passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100 \u2014 a higher duty than ordinary reasonable care \u2014 so a passenger hurt by a hard stop, a door, or an unsafe move benefits from that elevated standard.',
      },
      {
        q: 'I was a pedestrian hit by a bus, not a passenger. Is my claim different?',
        a: 'Somewhat. A pedestrian, cyclist, or driver struck by a bus brings an ordinary negligence claim rather than a common-carrier claim, but it is still against a public entity, so the same six-month deadline applies.',
      },
      {
        q: 'What if a private company operated the route?',
        a: 'Some routes are run by contracted private companies, which changes who is sued and can change the deadline to the ordinary two years. Identifying the true operator early is essential.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the operator, deadline, and evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_TRANSIT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield GET and Transit Accident Claims',
    title: 'Bakersfield GET Bus & Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by a Bakersfield GET bus? Passengers get the common-carrier heightened duty, but a claim against the transit district runs on a six-month deadline.',
    psychology: 'I was hurt on or by a Bakersfield bus and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield bus accident lawyer',
      'golden empire transit injury claim california',
      'hit by city bus claim california',
      'government claim six month deadline california',
      'common carrier duty bus passenger california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Six-month government deadline',
      'Passenger vs. pedestrian/cyclist',
      'GET is a public district',
      'Contracted-operator question',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s GET (Golden Empire Transit) buses serve Kern County\u2019s urban core, and as a public district a claim against it runs on the short six-month clock. ${COMMON_CARRIER} ${SIX_MONTH} ${WHO_HIT} Civil cases involving a private operator are filed in Kern County Superior Court within the ordinary two years.`,
      whatToTrack: [
        'Whether you were a passenger, pedestrian, cyclist, or driver',
        'Whether the operator was GET or a contracted company',
        'The date of the incident (six-month clock)',
        'The bus route, number, and any onboard camera footage',
        'The operator\u2019s conduct (jerk, hard stop, door, unsafe move)',
        'The police or incident report',
        'Witness contacts',
        'The injuries and full treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Bakersfield bus was run by GET or a contractor, applies the common-carrier duty for passengers, and flags the six-month government-claim deadline before it passes. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How long do I have to bring a claim against GET?',
        a: 'Usually six months from the incident. GET is a public district, so a claim against it is governed by the Government Claims Act, which requires a written claim within six months \u2014 far shorter than the ordinary two years. Missing that window can end an otherwise strong claim.',
      },
      {
        q: 'I was a passenger who fell boarding the bus. Does that help my claim?',
        a: 'Yes. Buses are common carriers that owe passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100 \u2014 a higher duty than ordinary reasonable care \u2014 so a fall on boarding or from an unsafe move benefits from that elevated standard.',
      },
      {
        q: 'I was a cyclist hit by a bus, not a passenger. Is my claim different?',
        a: 'Somewhat. A cyclist, pedestrian, or driver struck by a bus brings an ordinary negligence claim rather than a common-carrier claim, but it is still against a public entity, so the same six-month deadline applies.',
      },
      {
        q: 'What if a private company operated the route?',
        a: 'Some routes are run by contracted private companies, which changes who is sued and can change the deadline to the ordinary two years. Identifying the true operator early is essential.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the operator, deadline, and evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const transitCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [FRESNO_TRANSIT_SLUG]: {
    scenario: `A Fresno FAX passenger fell when the bus braked hard. The common-carrier duty strengthened the claim, and a six-month government claim against the city was filed before the deadline. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Confirm the operator; note the route and date.'],
      ['Six-month mark', 'File the government claim.'],
      ['Assessment', 'Common-carrier duty and footage reviewed.'],
      ['Longer term', 'Liability and damages developed.'],
    ],
    severityLadder: [
      ['Who you are', 'Passenger, pedestrian, cyclist, or driver.'],
      ['The operator', 'FAX or a contractor.'],
      ['The deadline', 'Six months against the city.'],
      ['The duty', 'Utmost care for passengers.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the passenger benefits from the common-carrier duty',
      'Whether the six-month claim was filed',
      'Whether the operator was public or private',
      'Whether onboard footage was preserved',
      'Comparative-fault exposure',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Higher duty', copy: 'Passengers get utmost care.' },
      { label: 'Deadline is short', copy: 'Six months against the city.' },
      { label: 'Find the operator', copy: 'FAX or a contractor.' },
      { label: 'Preserve footage', copy: 'Onboard video is decisive.' },
    ],
    insuranceProblems: [
      'The six-month government deadline is missed.',
      'The true operator is never identified.',
      'Onboard footage is overwritten before it is requested.',
      'A passenger claim is undervalued as ordinary negligence.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger or hit by the bus?' },
      { label: 'Step 2', question: 'Was it FAX or a contractor?' },
      { label: 'Step 3', question: 'When did it happen (six-month clock)?' },
      { label: 'Step 4', question: 'Is there onboard footage to preserve?' },
    ],
  },
  [RIV_TRANSIT_SLUG]: {
    scenario: `A Riverside bus was run by a contractor for RTA, which changed both the defendant and the deadline. Identifying the true operator early kept the claim on the correct clock. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Confirm whether RTA or a contractor ran the bus.'],
      ['First weeks', 'File the correct claim on the correct clock.'],
      ['Assessment', 'Common-carrier duty and footage reviewed.'],
      ['Longer term', 'Liability and damages developed.'],
    ],
    severityLadder: [
      ['The operator', 'RTA or a contractor.'],
      ['Who you are', 'Passenger, pedestrian, cyclist, or driver.'],
      ['The deadline', 'Six months or two years.'],
      ['The duty', 'Utmost care for passengers.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the operator was public or private',
      'Which deadline controls',
      'Whether the passenger benefits from the common-carrier duty',
      'Whether onboard footage was preserved',
      'Comparative-fault exposure',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Find the operator', copy: 'RTA or a contractor.' },
      { label: 'Right deadline', copy: 'Six months or two years.' },
      { label: 'Higher duty', copy: 'Passengers get utmost care.' },
      { label: 'Preserve footage', copy: 'Onboard video is decisive.' },
    ],
    insuranceProblems: [
      'The true operator is never identified.',
      'The wrong deadline is assumed.',
      'Onboard footage is overwritten before it is requested.',
      'A passenger claim is undervalued as ordinary negligence.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it RTA or a contracted operator?' },
      { label: 'Step 2', question: 'Were you a passenger or hit by the bus?' },
      { label: 'Step 3', question: 'When did it happen (which clock)?' },
      { label: 'Step 4', question: 'Is there onboard footage to preserve?' },
    ],
  },
  [SB_TRANSIT_SLUG]: {
    scenario: `A San Bernardino sbX passenger was thrown when the vehicle stopped abruptly. The common-carrier duty applied, and a six-month government claim against Omnitrans was filed in time. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Confirm the operator; note the route and date.'],
      ['Six-month mark', 'File the government claim.'],
      ['Assessment', 'Common-carrier duty and footage reviewed.'],
      ['Longer term', 'Liability and damages developed.'],
    ],
    severityLadder: [
      ['Who you are', 'Passenger, pedestrian, cyclist, or driver.'],
      ['The operator', 'Omnitrans or a contractor.'],
      ['The deadline', 'Six months against the agency.'],
      ['The duty', 'Utmost care for passengers.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the passenger benefits from the common-carrier duty',
      'Whether the six-month claim was filed',
      'Whether the operator was public or private',
      'Whether onboard footage was preserved',
      'Comparative-fault exposure',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Higher duty', copy: 'Passengers get utmost care.' },
      { label: 'Deadline is short', copy: 'Six months against the agency.' },
      { label: 'Find the operator', copy: 'Omnitrans or a contractor.' },
      { label: 'Preserve footage', copy: 'Onboard video is decisive.' },
    ],
    insuranceProblems: [
      'The six-month government deadline is missed.',
      'The true operator is never identified.',
      'Onboard footage is overwritten before it is requested.',
      'A passenger claim is undervalued as ordinary negligence.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger or hit by the bus?' },
      { label: 'Step 2', question: 'Was it Omnitrans/sbX or a contractor?' },
      { label: 'Step 3', question: 'When did it happen (six-month clock)?' },
      { label: 'Step 4', question: 'Is there onboard footage to preserve?' },
    ],
  },
  [BAKERSFIELD_TRANSIT_SLUG]: {
    scenario: `A Bakersfield GET passenger fell while boarding when the bus pulled away early. The common-carrier duty strengthened the claim, and the six-month government claim was filed before the deadline. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Confirm the operator; note the route and date.'],
      ['Six-month mark', 'File the government claim.'],
      ['Assessment', 'Common-carrier duty and footage reviewed.'],
      ['Longer term', 'Liability and damages developed.'],
    ],
    severityLadder: [
      ['Who you are', 'Passenger, pedestrian, cyclist, or driver.'],
      ['The operator', 'GET or a contractor.'],
      ['The deadline', 'Six months against the district.'],
      ['The duty', 'Utmost care for passengers.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the passenger benefits from the common-carrier duty',
      'Whether the six-month claim was filed',
      'Whether the operator was public or private',
      'Whether onboard footage was preserved',
      'Comparative-fault exposure',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Higher duty', copy: 'Passengers get utmost care.' },
      { label: 'Deadline is short', copy: 'Six months against the district.' },
      { label: 'Find the operator', copy: 'GET or a contractor.' },
      { label: 'Preserve footage', copy: 'Onboard video is decisive.' },
    ],
    insuranceProblems: [
      'The six-month government deadline is missed.',
      'The true operator is never identified.',
      'Onboard footage is overwritten before it is requested.',
      'A passenger claim is undervalued as ordinary negligence.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger or hit by the bus?' },
      { label: 'Step 2', question: 'Was it GET or a contractor?' },
      { label: 'Step 3', question: 'When did it happen (six-month clock)?' },
      { label: 'Step 4', question: 'Is there onboard footage to preserve?' },
    ],
  },
}
