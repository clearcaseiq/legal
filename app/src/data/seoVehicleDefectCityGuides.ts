import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, defective-vehicle / crashworthiness (auto product-liability)
 * practice area: location-specific guides for Los Angeles, San Diego, San
 * Francisco, and Sacramento.
 *
 * A defective-vehicle claim is distinct from an ordinary car-accident claim: it
 * runs against the vehicle or component manufacturer on a strict product-
 * liability theory, and the crashworthiness (enhanced-injury) doctrine can make
 * a manufacturer liable for injuries a defect made worse even when someone else
 * caused the crash. The vehicle itself is the central evidence and must be
 * preserved.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: extremely high freeway-crash volume, where crashworthiness
 *    defects (airbags, seatbelts, roof crush) turn survivable crashes deadly.
 *  - San Diego: a large share of older and imported vehicles for which recall
 *    and defect history is central.
 *  - San Francisco: the Bay Area\u2019s concentration of advanced driver-assistance
 *    and automated-driving technology, where system defects are an emerging area.
 *  - Sacramento: highway rollovers across the region, where roof-crush and
 *    restraint defects are prominent.
 *
 * Applied accurately:
 *  - Strict product liability: the manufacturer or distributor of a defective
 *    vehicle or component can be liable for a design defect, a manufacturing
 *    defect, or a failure to warn, without proof of ordinary negligence.
 *  - Crashworthiness / enhanced-injury doctrine: a manufacturer can be liable
 *    for the portion of injuries a defect caused or worsened even if another
 *    party (or the injured person) caused the collision itself.
 *  - Common defects include airbag non-deployment or rupture, tire tread
 *    separation, seatbelt or latch failure, roof crush in a rollover, post-
 *    collision fuel-fed fires, and defects in advanced driver-assistance systems.
 *  - The vehicle is the key evidence and must be preserved \u2014 not repaired,
 *    salvaged, or released \u2014 along with the event data recorder, and the recall
 *    and technical-service-bulletin history obtained.
 *  - The deadline is generally two years (Code of Civil Procedure section 335.1);
 *    pure comparative negligence applies, but crashworthiness focuses on the
 *    enhanced injury rather than who caused the crash.
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

export const LA_VDEF_SLUG = '/los-angeles-defective-vehicle-claim'
export const SD_VDEF_SLUG = '/san-diego-defective-vehicle-claim'
export const SF_VDEF_SLUG = '/san-francisco-defective-vehicle-claim'
export const SAC_VDEF_SLUG = '/sacramento-defective-vehicle-claim'

export const vehicleDefectCityGuidePages: LandingPage[] = [
  {
    slug: LA_VDEF_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Defective Vehicle & Crashworthiness Claims',
    title: 'Los Angeles Defective Vehicle & Crashworthiness Claims',
    eyebrow: 'California local injury guide',
    description:
      'Were your injuries in an LA crash made worse by a failed airbag, seatbelt, or roof? A manufacturer can be liable \u2014 but the vehicle must be preserved.',
    psychology: 'My injuries in an LA crash seem worse than they should be and I wonder if something in the car failed.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles defective vehicle lawyer',
      'airbag failure injury claim california',
      'seatbelt failure lawsuit california',
      'crashworthiness roof crush california',
      'car defect injury attorney california',
    ],
    signals: [
      'Strict product liability',
      'Crashworthiness / enhanced injury',
      'Airbag, seatbelt, roof, tire defects',
      'Preserve the vehicle & EDR',
      'Recall & TSB history',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s extremely high freeway-crash volume means that when a defect turns a survivable crash into a catastrophic one \u2014 an airbag that fails, a seatbelt that unlatches, a roof that crushes \u2014 the manufacturer, not just another driver, can be responsible. ${PRODUCT} ${CRASHWORTHINESS} ${DEFECTS} ${PRESERVE} The deadline is generally two years, and pure comparative negligence applies. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The vehicle make, model, year, and VIN',
        'Which component appears to have failed',
        'Whether injuries seem out of proportion to the crash',
        'Immediate preservation of the vehicle \u2014 do not let it be salvaged',
        'The event data recorder (EDR) data',
        'Recall and technical-service-bulletin history',
        'The other-driver claim, which can proceed alongside',
        'Medical treatment documenting the enhanced injuries',
      ],
      howClearCaseHelps: `ClearCaseIQ moves immediately to preserve an LA crash vehicle and its EDR, pulls the recall and technical-service-bulletin history, and frames both the ordinary crash claim and the crashworthiness claim against the manufacturer. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The crash was not the car maker\u2019s fault. Can I still have a defect claim?',
        a: 'Yes, potentially. Under the crashworthiness (enhanced-injury) doctrine, a manufacturer can be liable for injuries a defect caused or made worse even if someone else caused the collision. The question is whether the vehicle failed to protect its occupants as it reasonably should have.',
      },
      {
        q: 'How do I know a defect made my injuries worse?',
        a: 'A serious injury that seems out of proportion to a moderate crash is often a sign \u2014 for example, severe injuries despite a low-speed impact, an airbag that did not deploy, or a roof that collapsed. Expert analysis of the preserved vehicle is what confirms it.',
      },
      {
        q: 'What must I do right away?',
        a: 'Preserve the vehicle. It is the single most important piece of evidence and must not be repaired, salvaged, sold, or released to an insurer, because a defect claim cannot be proven without it. The event data recorder should be preserved and downloaded as well.',
      },
      {
        q: 'How long do I have?',
        a: 'The deadline is generally two years from the injury (Code of Civil Procedure section 335.1), but preserving the vehicle is far more urgent \u2014 insurers often move to total and salvage it within weeks, which can end a defect claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the vehicle preservation, the recall history, and the records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_VDEF_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Defective Vehicle & Crashworthiness Claims',
    title: 'San Diego Defective Vehicle & Crashworthiness Claims',
    eyebrow: 'California local injury guide',
    description:
      'Were your San Diego crash injuries worsened by a vehicle defect? Recall history and the preserved vehicle are central to a manufacturer claim.',
    psychology: 'My injuries in a San Diego crash seem worse than expected and I wonder if a recalled part failed.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego defective vehicle lawyer',
      'airbag failure injury claim california',
      'tire tread separation lawsuit california',
      'vehicle recall injury attorney california',
      'crashworthiness claim california',
    ],
    signals: [
      'Strict product liability',
      'Crashworthiness / enhanced injury',
      'Recall & defect history',
      'Airbag, tire, seatbelt defects',
      'Preserve the vehicle & EDR',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s roads carry a large share of older and imported vehicles, for which recall and defect history is often central \u2014 a component under an open recall that failed in a crash can point straight to a manufacturer claim. ${PRODUCT} ${CRASHWORTHINESS} ${DEFECTS} ${PRESERVE} The deadline is generally two years, and pure comparative negligence applies. Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The vehicle make, model, year, and VIN',
        'Any open or prior recall for the failed component',
        'Which component appears to have failed',
        'Whether injuries seem out of proportion to the crash',
        'Immediate preservation of the vehicle',
        'The event data recorder (EDR) data',
        'Technical-service-bulletin history',
        'Medical treatment documenting the enhanced injuries',
      ],
      howClearCaseHelps: `ClearCaseIQ pulls the recall and technical-service-bulletin history for a San Diego crash vehicle, moves to preserve the vehicle and its EDR, and frames the crashworthiness claim against the manufacturer alongside any other-driver claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The failed part was under a recall. Does that help my claim?',
        a: 'It can be significant. An open or prior recall for the component that failed is powerful evidence that the manufacturer knew of the defect. Combined with the preserved vehicle and expert analysis, it can support a strict product-liability claim.',
      },
      {
        q: 'The crash was another driver\u2019s fault. Can I still sue the manufacturer?',
        a: 'Yes, potentially. Under the crashworthiness doctrine, a manufacturer can be liable for injuries a defect caused or worsened even if another driver caused the collision. Both claims can proceed together.',
      },
      {
        q: 'What must I do right away?',
        a: 'Preserve the vehicle \u2014 do not let it be repaired, salvaged, sold, or released, because a defect claim cannot be proven without it. Preserve and download the event data recorder as well.',
      },
      {
        q: 'How long do I have?',
        a: 'Generally two years from the injury (Code of Civil Procedure section 335.1), but preserving the vehicle is far more urgent, because insurers often salvage it within weeks.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the vehicle preservation, the recall history, and the records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_VDEF_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Defective Vehicle & ADAS Claims',
    title: 'San Francisco Defective Vehicle & ADAS Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured in a Bay Area crash involving a driver-assistance or automated-driving system \u2014 or a vehicle defect? A manufacturer may be liable, and the data must be preserved.',
    psychology: 'My San Francisco crash may have involved a driver-assist system or a car defect and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco defective vehicle lawyer',
      'driver assistance crash claim california',
      'automated driving accident lawsuit california',
      'airbag failure injury california',
      'crashworthiness claim california',
    ],
    signals: [
      'Strict product liability',
      'Crashworthiness / enhanced injury',
      'ADAS / automated-driving defects',
      'Preserve the vehicle & system data',
      'Recall & software history',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `The Bay Area\u2019s concentration of advanced driver-assistance and automated-driving technology makes system defects an emerging area here \u2014 where a driver-assist or automated system fails, the vehicle or software maker may be responsible alongside any human driver. ${PRODUCT} ${CRASHWORTHINESS} ${DEFECTS} For an automated-system crash, the vehicle\u2019s system logs and software version are critical evidence in addition to the physical vehicle. ${PRESERVE} The deadline is generally two years. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The vehicle make, model, year, and VIN',
        'Whether a driver-assist or automated system was engaged',
        'The system logs, software version, and any updates',
        'Which component or system appears to have failed',
        'Immediate preservation of the vehicle and its data',
        'The event data recorder (EDR) data',
        'Recall, software-update, and technical-bulletin history',
        'Medical treatment documenting the injuries',
      ],
      howClearCaseHelps: `ClearCaseIQ moves quickly to preserve a Bay Area crash vehicle and its system and software data, pulls the recall and update history, and frames a claim against the vehicle or software maker alongside any driver claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A driver-assist or automated system was engaged when I crashed. Who is liable?',
        a: 'It depends on the facts, but the vehicle or software manufacturer may be liable if the system was defective, alongside any human driver. The system logs and software version are critical evidence and must be preserved quickly.',
      },
      {
        q: 'The crash was not the car maker\u2019s fault. Can I still have a defect claim?',
        a: 'Yes, potentially. Under the crashworthiness doctrine, a manufacturer can be liable for injuries a defect caused or worsened even if another party caused the collision. The vehicle\u2019s protective and safety systems are the focus.',
      },
      {
        q: 'What must I do right away?',
        a: 'Preserve the vehicle and its data. For an automated-system crash, the system logs and software version can be overwritten or updated, so preserving them \u2014 along with the physical vehicle and the event data recorder \u2014 is urgent.',
      },
      {
        q: 'How long do I have?',
        a: 'Generally two years from the injury (Code of Civil Procedure section 335.1), but preserving the vehicle and its data is far more urgent because that evidence can disappear within weeks.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the vehicle and data preservation and the records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_VDEF_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Defective Vehicle & Rollover Claims',
    title: 'Sacramento Defective Vehicle & Rollover Claims',
    eyebrow: 'California local injury guide',
    description:
      'Were your injuries in a Sacramento-area rollover or crash worsened by a roof crush, restraint, or tire defect? A manufacturer can be liable \u2014 preserve the vehicle.',
    psychology: 'My injuries in a Sacramento-area rollover seem severe and I wonder if the roof or restraints failed.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento defective vehicle lawyer',
      'rollover roof crush claim california',
      'tire tread separation lawsuit california',
      'seatbelt failure injury california',
      'crashworthiness claim california',
    ],
    signals: [
      'Strict product liability',
      'Crashworthiness / enhanced injury',
      'Rollover roof crush & restraints',
      'Tire & seatbelt defects',
      'Preserve the vehicle & EDR',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Highway rollovers across the Sacramento region make roof-crush and restraint defects prominent \u2014 in a rollover, whether the roof held and the restraints worked often determines the severity of the injuries, which is the heart of a crashworthiness claim. ${PRODUCT} ${CRASHWORTHINESS} ${DEFECTS} ${PRESERVE} The deadline is generally two years, and pure comparative negligence applies. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'The vehicle make, model, year, and VIN',
        'Whether the roof crushed or restraints failed in a rollover',
        'Whether a tire tread separation triggered the rollover',
        'Whether injuries seem out of proportion to the event',
        'Immediate preservation of the vehicle',
        'The event data recorder (EDR) data',
        'Recall and technical-service-bulletin history',
        'Medical treatment documenting the enhanced injuries',
      ],
      howClearCaseHelps: `ClearCaseIQ moves to preserve a Sacramento-area rollover vehicle and its EDR, pulls the recall and technical-service-bulletin history, and frames the roof-crush, restraint, or tire crashworthiness claim against the manufacturer. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My car rolled over and the roof crushed. Is that a defect claim?',
        a: 'It can be. In a rollover, whether the roof held and the restraints worked often determines the injuries, and a roof that crushes or a restraint that fails can support a crashworthiness claim against the manufacturer \u2014 even where something else triggered the rollover.',
      },
      {
        q: 'A tire came apart before the rollover. Who is responsible?',
        a: 'Potentially the tire manufacturer. Tire tread separation is a recognised defect that can trigger a rollover, and it can support a strict product-liability claim. Preserving the tire and the vehicle is essential.',
      },
      {
        q: 'What must I do right away?',
        a: 'Preserve the vehicle \u2014 and the tires \u2014 because they are the key evidence and must not be repaired, salvaged, sold, or released. Preserve and download the event data recorder as well.',
      },
      {
        q: 'How long do I have?',
        a: 'Generally two years from the injury (Code of Civil Procedure section 335.1), but preserving the vehicle is far more urgent because insurers often salvage it within weeks.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the vehicle preservation, the recall history, and the records so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const vehicleDefectCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_VDEF_SLUG]: {
    scenario: `An LA driver in a moderate freeway crash suffered severe injuries when the airbag did not deploy. Preserving the vehicle and downloading the EDR supported a crashworthiness claim against the manufacturer. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the vehicle details; photograph the damage.'],
      ['First days', 'Preserve the vehicle; do not let it be salvaged.'],
      ['First weeks', 'Download the EDR; pull recall and bulletin history.'],
      ['Longer term', 'Expert analysis and the crashworthiness claim developed.'],
    ],
    severityLadder: [
      ['Product defect', 'A component failed to perform.'],
      ['Enhanced injury', 'The defect made injuries worse.'],
      ['Preserve', 'The vehicle must be kept.'],
      ['Deadline', 'Two years, but preserve now.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'The enhanced injury is documented.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a component was defective',
      'Whether the defect enhanced the injuries',
      'Whether the vehicle and EDR were preserved',
      'Whether a recall or bulletin shows knowledge',
      'The strength of the expert analysis',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Enhanced injury', copy: 'Crashworthiness targets the added harm.' },
      { label: 'Preserve the vehicle', copy: 'No vehicle, no defect claim.' },
      { label: 'Recall helps', copy: 'It can show the maker knew.' },
      { label: 'Two claims', copy: 'The driver claim can proceed too.' },
    ],
    insuranceProblems: [
      'The vehicle is salvaged before it is preserved.',
      'The EDR is never downloaded.',
      'The recall and bulletin history is ignored.',
      'The enhanced injury is not documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the vehicle make, model, and year?' },
      { label: 'Step 2', question: 'Which component appears to have failed?' },
      { label: 'Step 3', question: 'Where is the vehicle now?' },
      { label: 'Step 4', question: 'Do the injuries seem worse than the crash?' },
    ],
  },
  [SD_VDEF_SLUG]: {
    scenario: `A San Diego crash involved a component under an open recall that failed. The recall history and the preserved vehicle established the manufacturer\u2019s knowledge and the defect. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the vehicle details; photograph the damage.'],
      ['First days', 'Check for open recalls; preserve the vehicle.'],
      ['First weeks', 'Download the EDR; gather the defect history.'],
      ['Longer term', 'Expert analysis and the product claim developed.'],
    ],
    severityLadder: [
      ['Recall', 'An open recall shows knowledge.'],
      ['Product defect', 'A component failed to perform.'],
      ['Enhanced injury', 'The defect made injuries worse.'],
      ['Preserve', 'The vehicle must be kept.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'The enhanced injury is documented.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the component was under recall',
      'Whether the component was defective',
      'Whether the defect enhanced the injuries',
      'Whether the vehicle and EDR were preserved',
      'The strength of the expert analysis',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Recall is strong', copy: 'It can show the maker knew.' },
      { label: 'Enhanced injury', copy: 'Crashworthiness targets the added harm.' },
      { label: 'Preserve the vehicle', copy: 'No vehicle, no defect claim.' },
      { label: 'Two claims', copy: 'The driver claim can proceed too.' },
    ],
    insuranceProblems: [
      'The vehicle is salvaged before it is preserved.',
      'The recall history is never checked.',
      'The EDR is never downloaded.',
      'The enhanced injury is not documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the vehicle make, model, and year?' },
      { label: 'Step 2', question: 'Is there an open recall for the failed part?' },
      { label: 'Step 3', question: 'Where is the vehicle now?' },
      { label: 'Step 4', question: 'Do the injuries seem worse than the crash?' },
    ],
  },
  [SF_VDEF_SLUG]: {
    scenario: `A Bay Area crash occurred with a driver-assistance system engaged. Preserving the vehicle\u2019s system logs and software version, before an update overwrote them, was central to the claim against the maker. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether a driver-assist system was engaged.'],
      ['First days', 'Preserve the vehicle and its system/software data.'],
      ['First weeks', 'Download logs and the EDR; pull update history.'],
      ['Longer term', 'Expert analysis and the system-defect claim developed.'],
    ],
    severityLadder: [
      ['System engaged', 'The role of the automated system is examined.'],
      ['Defect', 'The system or vehicle failed to perform.'],
      ['Data', 'Logs and software version are preserved.'],
      ['Deadline', 'Two years, but preserve data now.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether an automated system was engaged',
      'Whether the system or vehicle was defective',
      'Whether the logs and software version were preserved',
      'Whether the defect caused or enhanced the injuries',
      'The strength of the expert analysis',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Preserve the data', copy: 'Logs can be overwritten by updates.' },
      { label: 'Emerging area', copy: 'System-defect law is developing.' },
      { label: 'Multiple defendants', copy: 'Maker and driver may both answer.' },
      { label: 'Expert-driven', copy: 'System analysis is central.' },
    ],
    insuranceProblems: [
      'A software update overwrites the system logs.',
      'The vehicle is salvaged before it is preserved.',
      'The EDR and logs are never downloaded.',
      'The role of the automated system is never analysed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a driver-assist or automated system engaged?' },
      { label: 'Step 2', question: 'What is the vehicle make, model, and year?' },
      { label: 'Step 3', question: 'Where is the vehicle now?' },
      { label: 'Step 4', question: 'Have the system logs been preserved?' },
    ],
  },
  [SAC_VDEF_SLUG]: {
    scenario: `A Sacramento-area SUV rolled after a tire tread separation, and the roof crushed. Preserving the vehicle and the tire supported claims against both the tire and vehicle manufacturers. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the rollover; photograph the roof and tires.'],
      ['First days', 'Preserve the vehicle and the tires.'],
      ['First weeks', 'Download the EDR; pull recall and bulletin history.'],
      ['Longer term', 'Expert analysis and the crashworthiness claim developed.'],
    ],
    severityLadder: [
      ['Trigger', 'A tire failure can start a rollover.'],
      ['Roof crush', 'A crushed roof enhances injuries.'],
      ['Restraints', 'Failed restraints add harm.'],
      ['Preserve', 'The vehicle and tires must be kept.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the rollover.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'The enhanced injury is documented.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a tire defect triggered the rollover',
      'Whether the roof crush or restraints enhanced injuries',
      'Whether the vehicle and tires were preserved',
      'Whether a recall or bulletin shows knowledge',
      'The strength of the expert analysis',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Two manufacturers', copy: 'Tire and vehicle makers may answer.' },
      { label: 'Enhanced injury', copy: 'Roof and restraints are the focus.' },
      { label: 'Preserve everything', copy: 'The vehicle and tires are key.' },
      { label: 'Recall helps', copy: 'It can show a maker knew.' },
    ],
    insuranceProblems: [
      'The vehicle or tires are salvaged before preservation.',
      'The EDR is never downloaded.',
      'The recall and bulletin history is ignored.',
      'The enhanced injury is not documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a tire fail, and did the roof crush?' },
      { label: 'Step 2', question: 'What is the vehicle make, model, and year?' },
      { label: 'Step 3', question: 'Where are the vehicle and tires now?' },
      { label: 'Step 4', question: 'Do the injuries seem worse than the event?' },
    ],
  },
}
