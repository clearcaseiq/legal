import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, defective-vehicle / crashworthiness practice area (batch 2):
 * location-specific guides for San Jose, Fresno, Long Beach, and Oakland,
 * extending the batch-1 hub (Los Angeles, San Diego, San Francisco, Sacramento).
 *
 * Applied accurately (identical to batch 1):
 *  - Strict product liability against the vehicle/component maker (design,
 *    manufacturing, failure-to-warn) without proof of ordinary negligence.
 *  - Crashworthiness (enhanced-injury) doctrine: the maker can be liable for
 *    injuries a defect caused or worsened even if someone else caused the crash.
 *  - Common defects: airbags, tires, seatbelts, roof crush, fuel-fed fires, ADAS.
 *  - The vehicle and its event data recorder are the evidence and must be preserved;
 *    recall / TSB history obtained early.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a vehicle or component was defective, and how the crashworthiness doctrine applies, depend on facts and expert analysis a licensed California attorney should arrange promptly.'

const PRODUCT =
  'A defective-vehicle claim runs on strict product liability: the manufacturer or distributor of a defective vehicle or component can be liable for a design defect, a manufacturing defect, or a failure to warn, without proof of ordinary negligence. That is a different and often stronger path than an ordinary negligence claim against another driver.'

const CRASHWORTHINESS =
  'Under the crashworthiness (enhanced-injury) doctrine, a vehicle manufacturer can be liable for the injuries a defect caused or made worse even if someone else \u2014 or the injured person \u2014 caused the collision itself. The question is not only who caused the crash but whether the vehicle failed to protect its occupants as it reasonably should have.'

const DEFECTS =
  'Common vehicle defects include airbags that fail to deploy or that rupture, tire tread separation, seatbelt or latch failure, roof crush in a rollover, post-collision fuel-fed fires, and defects in advanced driver-assistance systems. A serious injury that seems out of proportion to a moderate crash is often a sign that a defect made the injuries worse.'

const PRESERVE =
  'The vehicle is the single most important piece of evidence and must be preserved \u2014 not repaired, salvaged, sold, or released to an insurer \u2014 because a defect claim cannot be proven without it. The event data recorder should be preserved and downloaded, and the recall and technical-service-bulletin history for the make and model obtained early.'

export const SJ_VDEF_SLUG = '/san-jose-defective-vehicle-claim'
export const FRESNO_VDEF_SLUG = '/fresno-defective-vehicle-claim'
export const LB_VDEF_SLUG = '/long-beach-defective-vehicle-claim'
export const OAK_VDEF_SLUG = '/oakland-defective-vehicle-claim'

export const vehicleDefectCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_VDEF_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Defective Vehicle Claims',
    title: 'San Jose Defective Vehicle & Crashworthiness Claims',
    eyebrow: 'California local injury guide',
    description:
      'Badly hurt in a San Jose crash that seems worse than it should have been? A vehicle maker can be liable for a defect even when another driver caused the collision.',
    psychology: 'My injuries in a San Jose crash were far worse than the impact and I wonder whether the vehicle failed me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose defective vehicle lawyer',
      'airbag failed to deploy claim california',
      'crashworthiness enhanced injury california',
      'tire tread separation rollover lawsuit california',
      'seatbelt failure injury claim california',
    ],
    signals: [
      'Strict product liability',
      'Crashworthiness / enhanced injury',
      'Airbag, tire, seatbelt, roof defects',
      'ADAS / driver-assist defects',
      'Preserve the vehicle & EDR',
      'Recall / TSB history',
    ],
    sections: {
      whyItMatters: `San Jose and Silicon Valley have an unusually high share of ADAS-equipped and electric vehicles, where driver-assistance and battery-fire defects add to the classic airbag, tire, and seatbelt failures. ${PRODUCT} ${CRASHWORTHINESS} ${DEFECTS} ${PRESERVE} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether injuries seem out of proportion to the crash',
        'The specific component that failed (airbag, tire, belt, roof)',
        'Whether the vehicle has been preserved, not repaired or sold',
        'The event data recorder and its download',
        'The make, model, and recall / TSB history',
        'Whether an ADAS or driver-assist system was engaged',
        'Photographs of the vehicle and scene',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags when injuries are out of proportion to a crash, moves to preserve the vehicle and download the EDR before it is repaired or sold, and pulls the recall and technical-service-bulletin history for the make and model. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Another driver caused the crash. Can I still sue the vehicle maker?',
        a: 'Possibly. Under the crashworthiness doctrine, a manufacturer can be liable for injuries a defect caused or worsened even if someone else caused the collision. The question is whether the vehicle failed to protect its occupants as it reasonably should have.',
      },
      {
        q: 'Do I have to prove the maker was negligent?',
        a: 'No. A defective-vehicle claim runs on strict product liability \u2014 a design, manufacturing, or failure-to-warn defect can create liability without proof of ordinary negligence.',
      },
      {
        q: 'My car was totaled. Should I let the insurer take it?',
        a: 'No \u2014 not before it is examined. The vehicle is the single most important piece of evidence and must be preserved, not repaired, salvaged, sold, or released. A defect claim cannot be proven without it.',
      },
      {
        q: 'What are common vehicle defects?',
        a: 'Airbags that fail to deploy or rupture, tire tread separation, seatbelt or latch failure, roof crush in a rollover, post-collision fuel-fed fires, and defects in advanced driver-assistance systems.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the vehicle evidence and recall history so a licensed California attorney can arrange expert analysis.',
      },
    ],
  },
  {
    slug: FRESNO_VDEF_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Defective Vehicle Claims',
    title: 'Fresno Defective Vehicle & Crashworthiness Claims',
    eyebrow: 'California local injury guide',
    description:
      'Badly hurt in a Fresno crash that seems worse than it should have been? A vehicle maker can be liable for a defect even when another driver caused the collision.',
    psychology: 'My injuries in a Fresno crash were far worse than the impact and I wonder whether the vehicle failed me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno defective vehicle lawyer',
      'airbag failed to deploy claim california',
      'crashworthiness enhanced injury california',
      'tire tread separation rollover lawsuit california',
      'seatbelt failure injury claim california',
    ],
    signals: [
      'Strict product liability',
      'Crashworthiness / enhanced injury',
      'Airbag, tire, seatbelt, roof defects',
      'Rollover roof crush',
      'Preserve the vehicle & EDR',
      'Recall / TSB history',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s Highway 99 and rural high-speed corridors produce rollover and high-energy crashes where tire tread separation and roof crush are recurring crashworthiness issues. ${PRODUCT} ${CRASHWORTHINESS} ${DEFECTS} ${PRESERVE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether injuries seem out of proportion to the crash',
        'The specific component that failed (airbag, tire, belt, roof)',
        'Whether the vehicle has been preserved, not repaired or sold',
        'The event data recorder and its download',
        'The make, model, and recall / TSB history',
        'Whether a rollover occurred',
        'Photographs of the vehicle and scene',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags when injuries are out of proportion to a crash, moves to preserve the vehicle and download the EDR before it is repaired or sold, and pulls the recall and technical-service-bulletin history for the make and model. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Another driver caused the crash. Can I still sue the vehicle maker?',
        a: 'Possibly. Under the crashworthiness doctrine, a manufacturer can be liable for injuries a defect caused or worsened even if someone else caused the collision.',
      },
      {
        q: 'Do I have to prove the maker was negligent?',
        a: 'No. A defective-vehicle claim runs on strict product liability \u2014 a design, manufacturing, or failure-to-warn defect can create liability without proof of ordinary negligence.',
      },
      {
        q: 'My car rolled over. What defect matters there?',
        a: 'Roof crush and seatbelt or latch failure are common rollover crashworthiness issues, along with tire tread separation that can trigger a rollover. The vehicle must be preserved to prove any of them.',
      },
      {
        q: 'Should I let the insurer take the totaled car?',
        a: 'No \u2014 not before it is examined. The vehicle is the single most important piece of evidence and must be preserved, not repaired, salvaged, sold, or released.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the vehicle evidence and recall history so a licensed California attorney can arrange expert analysis.',
      },
    ],
  },
  {
    slug: LB_VDEF_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Defective Vehicle Claims',
    title: 'Long Beach Defective Vehicle & Crashworthiness Claims',
    eyebrow: 'California local injury guide',
    description:
      'Badly hurt in a Long Beach crash that seems worse than it should have been? A vehicle maker can be liable for a defect even when another driver caused the collision.',
    psychology: 'My injuries in a Long Beach crash were far worse than the impact and I wonder whether the vehicle failed me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach defective vehicle lawyer',
      'airbag failed to deploy claim california',
      'crashworthiness enhanced injury california',
      'tire tread separation rollover lawsuit california',
      'post collision fuel fire injury california',
    ],
    signals: [
      'Strict product liability',
      'Crashworthiness / enhanced injury',
      'Airbag, tire, seatbelt, roof defects',
      'Post-collision fuel fires',
      'Preserve the vehicle & EDR',
      'Recall / TSB history',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s dense freeway network and port-area truck traffic produce high-energy crashes where airbag, seatbelt, and post-collision fuel-fed fire defects can turn a survivable crash into a catastrophic one. ${PRODUCT} ${CRASHWORTHINESS} ${DEFECTS} ${PRESERVE} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether injuries seem out of proportion to the crash',
        'The specific component that failed (airbag, tire, belt, roof)',
        'Whether a post-collision fire occurred',
        'Whether the vehicle has been preserved, not repaired or sold',
        'The event data recorder and its download',
        'The make, model, and recall / TSB history',
        'Photographs of the vehicle and scene',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags when injuries are out of proportion to a crash, moves to preserve the vehicle and download the EDR before it is repaired or sold, and pulls the recall and technical-service-bulletin history for the make and model. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Another driver caused the crash. Can I still sue the vehicle maker?',
        a: 'Possibly. Under the crashworthiness doctrine, a manufacturer can be liable for injuries a defect caused or worsened even if someone else caused the collision.',
      },
      {
        q: 'Do I have to prove the maker was negligent?',
        a: 'No. A defective-vehicle claim runs on strict product liability \u2014 a design, manufacturing, or failure-to-warn defect can create liability without proof of ordinary negligence.',
      },
      {
        q: 'The car caught fire after the crash. Is that a defect?',
        a: 'It can be. Post-collision fuel-fed fires are a recognised crashworthiness defect where a fuel system failed to contain fuel in a survivable crash. The vehicle must be preserved to prove it.',
      },
      {
        q: 'Should I let the insurer take the totaled car?',
        a: 'No \u2014 not before it is examined. The vehicle is the single most important piece of evidence and must be preserved, not repaired, salvaged, sold, or released.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the vehicle evidence and recall history so a licensed California attorney can arrange expert analysis.',
      },
    ],
  },
  {
    slug: OAK_VDEF_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Defective Vehicle Claims',
    title: 'Oakland Defective Vehicle & Crashworthiness Claims',
    eyebrow: 'California local injury guide',
    description:
      'Badly hurt in an Oakland crash that seems worse than it should have been? A vehicle maker can be liable for a defect even when another driver caused the collision.',
    psychology: 'My injuries in an Oakland crash were far worse than the impact and I wonder whether the vehicle failed me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland defective vehicle lawyer',
      'airbag failed to deploy claim california',
      'crashworthiness enhanced injury california',
      'tire tread separation rollover lawsuit california',
      'seatbelt failure injury claim california',
    ],
    signals: [
      'Strict product liability',
      'Crashworthiness / enhanced injury',
      'Airbag, tire, seatbelt, roof defects',
      'ADAS / EV battery defects',
      'Preserve the vehicle & EDR',
      'Recall / TSB history',
    ],
    sections: {
      whyItMatters: `Oakland and the East Bay\u2019s heavy freeway traffic and growing electric-vehicle share bring both classic airbag and seatbelt failures and newer ADAS and EV battery-fire defects into play. ${PRODUCT} ${CRASHWORTHINESS} ${DEFECTS} ${PRESERVE} Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether injuries seem out of proportion to the crash',
        'The specific component that failed (airbag, tire, belt, roof)',
        'Whether the vehicle has been preserved, not repaired or sold',
        'The event data recorder and its download',
        'The make, model, and recall / TSB history',
        'Whether an ADAS or EV battery system was involved',
        'Photographs of the vehicle and scene',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags when injuries are out of proportion to a crash, moves to preserve the vehicle and download the EDR before it is repaired or sold, and pulls the recall and technical-service-bulletin history for the make and model. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Another driver caused the crash. Can I still sue the vehicle maker?',
        a: 'Possibly. Under the crashworthiness doctrine, a manufacturer can be liable for injuries a defect caused or worsened even if someone else caused the collision.',
      },
      {
        q: 'Do I have to prove the maker was negligent?',
        a: 'No. A defective-vehicle claim runs on strict product liability \u2014 a design, manufacturing, or failure-to-warn defect can create liability without proof of ordinary negligence.',
      },
      {
        q: 'A driver-assist system was on when it crashed. Does that matter?',
        a: 'It can. Defects in advanced driver-assistance systems are an emerging product-liability issue. Preserving the vehicle and downloading the event data recorder is essential to analyse what the system did.',
      },
      {
        q: 'Should I let the insurer take the totaled car?',
        a: 'No \u2014 not before it is examined. The vehicle is the single most important piece of evidence and must be preserved, not repaired, salvaged, sold, or released.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the vehicle evidence and recall history so a licensed California attorney can arrange expert analysis.',
      },
    ],
  },
]

export const vehicleDefectCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_VDEF_SLUG]: {
    scenario: `A San Jose driver suffered severe injuries in a moderate crash after the airbag failed to deploy. The preserved vehicle and EDR download proved the defect, independent of who caused the collision. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the vehicle; note the failed component.'],
      ['First days', 'Preserve the vehicle; do not release it to the insurer.'],
      ['First weeks', 'Download the EDR; pull recall and TSB history.'],
      ['Longer term', 'Arrange expert crashworthiness analysis.'],
    ],
    severityLadder: [
      ['Strict liability', 'No negligence needed.'],
      ['Crashworthiness', 'Enhanced injury is the theory.'],
      ['Component', 'Airbag or belt failure.'],
      ['Evidence', 'The vehicle must be preserved.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries out of proportion are noted.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the vehicle was preserved',
      'Whether the EDR was downloaded',
      'Whether a component defect is shown',
      'Whether injuries are out of proportion',
      'The recall and TSB history',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Defect, not negligence, controls.' },
      { label: 'Crashworthiness', copy: 'Fault for the crash does not bar it.' },
      { label: 'Evidence', copy: 'The vehicle is the case.' },
      { label: 'History', copy: 'Recalls and TSBs support it.' },
    ],
    insuranceProblems: [
      'The vehicle is released and repaired or scrapped.',
      'The EDR is never downloaded.',
      'The claim is treated only as a two-driver crash.',
      'The recall history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were your injuries worse than the crash?' },
      { label: 'Step 2', question: 'Do you still have the vehicle?' },
      { label: 'Step 3', question: 'Which component failed?' },
      { label: 'Step 4', question: 'What make and model is it?' },
    ],
  },
  [FRESNO_VDEF_SLUG]: {
    scenario: `A Fresno family\u2019s SUV rolled after a tire tread separated on Highway 99, and the roof crushed. The preserved vehicle established both the tire and roof-crush crashworthiness defects. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the vehicle and the tire.'],
      ['First days', 'Preserve the vehicle; keep the failed tire.'],
      ['First weeks', 'Download the EDR; pull recall and TSB history.'],
      ['Longer term', 'Arrange expert rollover analysis.'],
    ],
    severityLadder: [
      ['Strict liability', 'No negligence needed.'],
      ['Rollover', 'Roof crush is a crashworthiness defect.'],
      ['Tire', 'Tread separation is a common defect.'],
      ['Evidence', 'The vehicle and tire must be preserved.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries out of proportion are noted.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the vehicle and tire were preserved',
      'Whether a tire or roof defect is shown',
      'Whether the EDR was downloaded',
      'Whether injuries are out of proportion',
      'The recall and TSB history',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Defect, not negligence, controls.' },
      { label: 'Rollover', copy: 'Roof crush is a recognised defect.' },
      { label: 'Tire', copy: 'Tread separation is preservable proof.' },
      { label: 'Evidence', copy: 'The vehicle and tire are the case.' },
    ],
    insuranceProblems: [
      'The vehicle or tire is released and lost.',
      'The EDR is never downloaded.',
      'The claim is treated as driver error only.',
      'The recall history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the vehicle roll over?' },
      { label: 'Step 2', question: 'Do you still have the vehicle and tire?' },
      { label: 'Step 3', question: 'Were injuries worse than expected?' },
      { label: 'Step 4', question: 'What make and model is it?' },
    ],
  },
  [LB_VDEF_SLUG]: {
    scenario: `A Long Beach driver survived a freeway crash but was badly burned when the fuel system ignited. The preserved vehicle showed a post-collision fuel-fed fire defect. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Document the fire and the vehicle.'],
      ['First days', 'Preserve the vehicle; get any fire report.'],
      ['First weeks', 'Download the EDR; pull recall and TSB history.'],
      ['Longer term', 'Arrange expert fuel-system analysis.'],
    ],
    severityLadder: [
      ['Strict liability', 'No negligence needed.'],
      ['Fuel fire', 'Post-collision fire is a defect.'],
      ['Crashworthiness', 'A survivable crash turned catastrophic.'],
      ['Evidence', 'The vehicle must be preserved.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Burn care is documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Grafts and scarring are tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the vehicle was preserved',
      'Whether a fuel-system defect is shown',
      'Whether the crash was otherwise survivable',
      'Whether the EDR was downloaded',
      'The recall and TSB history',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Defect, not negligence, controls.' },
      { label: 'Fuel fire', copy: 'A survivable crash should not burn.' },
      { label: 'Crashworthiness', copy: 'Fault for the crash does not bar it.' },
      { label: 'Evidence', copy: 'The vehicle is the case.' },
    ],
    insuranceProblems: [
      'The burned vehicle is scrapped before inspection.',
      'The EDR is never downloaded.',
      'The fire is blamed on the crash alone.',
      'The recall history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the vehicle catch fire after the crash?' },
      { label: 'Step 2', question: 'Do you still have the vehicle?' },
      { label: 'Step 3', question: 'Was the crash otherwise survivable?' },
      { label: 'Step 4', question: 'What make and model is it?' },
    ],
  },
  [OAK_VDEF_SLUG]: {
    scenario: `An Oakland driver was injured when a driver-assist system failed to brake. The preserved vehicle and EDR data showed the ADAS behaviour, supporting a product claim against the maker. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether driver-assist was engaged.'],
      ['First days', 'Preserve the vehicle; do not release it.'],
      ['First weeks', 'Download the EDR; pull recall and TSB history.'],
      ['Longer term', 'Arrange expert ADAS analysis.'],
    ],
    severityLadder: [
      ['Strict liability', 'No negligence needed.'],
      ['ADAS', 'Driver-assist defects are emerging.'],
      ['Crashworthiness', 'Enhanced injury can also apply.'],
      ['Evidence', 'The vehicle and EDR must be preserved.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries out of proportion are noted.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the vehicle and EDR were preserved',
      'Whether a driver-assist defect is shown',
      'Whether injuries are out of proportion',
      'The recall and TSB history',
      'Whether a component also failed',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Defect, not negligence, controls.' },
      { label: 'ADAS', copy: 'Driver-assist defects are litigable.' },
      { label: 'Evidence', copy: 'The EDR captures the behaviour.' },
      { label: 'History', copy: 'Recalls and TSBs support it.' },
    ],
    insuranceProblems: [
      'The vehicle is released before the EDR is read.',
      'The ADAS behaviour is never analysed.',
      'The claim is treated as driver error only.',
      'The recall history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a driver-assist system engaged?' },
      { label: 'Step 2', question: 'Do you still have the vehicle?' },
      { label: 'Step 3', question: 'Were injuries worse than expected?' },
      { label: 'Step 4', question: 'What make and model is it?' },
    ],
  },
}
