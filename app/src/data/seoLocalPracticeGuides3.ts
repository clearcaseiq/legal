import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, batch three: pedestrian and bicycle guides for Fresno, Long Beach,
 * Bakersfield, and Anaheim.
 *
 * Each metro has a genuinely different local angle rather than an interpolated
 * one:
 *  - Fresno: consistently one of the most dangerous metros in the country for
 *    people on foot, with wide, fast arterials (Blackstone Avenue), Central
 *    Valley tule fog, an agricultural-truck economy, and a high rate of
 *    uninsured and underinsured drivers that makes the injured person's own
 *    UM/UIM coverage central.
 *  - Long Beach: the Port of Long Beach drives dense drayage-truck traffic, the
 *    Metro A Line light rail runs at street level through downtown, and the
 *    beach path and bike boulevards produce heavy cycling volume.
 *  - Bakersfield: an oil-and-agriculture economy puts heavy oilfield and ag
 *    trucks on Kern County roads, tule fog and Highway 99/58 produce pileups,
 *    per-capita pedestrian deaths are among the worst in the state, and the
 *    uninsured-driver rate is high.
 *  - Anaheim: the resort district (Disneyland, the stadium and arena) fills the
 *    streets with out-of-state tourists, rental cars, and rideshare, so
 *    unfamiliar and out-of-state drivers and their coverage are the recurring
 *    complication.
 *
 * California law woven through matches earlier batches: pedestrian right of way
 * and unmarked crosswalks (Veh. Code §§ 21950, 275); the 2023 Freedom to Walk
 * Act; cyclists' rights and duties (§ 21200), three-foot passing (§ 21760), and
 * the dooring prohibition (§ 22517); pure comparative negligence; the six-month
 * Government Claims Act deadline for public entities; and uninsured/
 * underinsured motorist coverage under Insurance Code § 11580.2.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a shortened public-entity deadline or specific coverage applies, and how comparative fault is assessed, depends on facts a licensed California attorney should review promptly.'

const CLAIMS_ACT =
  'Under the Government Claims Act a written claim must be presented to the public entity within six months of the collision, not the two years that applies to a private driver. The entity then has 45 days to respond; if it rejects the claim in writing you generally have six months from that notice to sue, and if it never answers, generally two years from the collision. Missing the six-month step usually bars the claim, though a late-claim application may be possible within a year.'

const UM_UIM =
  'When the at-fault driver has no insurance or too little, your own uninsured/underinsured motorist coverage steps in, and in areas with high uninsured-driver rates it is frequently the main source of recovery. UM/UIM is first-party coverage under Insurance Code section 11580.2, it has its own notice requirements and deadlines that differ from an ordinary claim, and underinsured coverage typically pays only the gap above the at-fault driver\u2019s limits, so identifying every applicable policy early matters.'

export const FRESNO_PEDESTRIAN_SLUG = '/fresno-pedestrian-accident'
export const LONGBEACH_PEDESTRIAN_SLUG = '/long-beach-pedestrian-accident'
export const BAKERSFIELD_PEDESTRIAN_SLUG = '/bakersfield-pedestrian-accident'
export const ANAHEIM_PEDESTRIAN_SLUG = '/anaheim-pedestrian-accident'
export const FRESNO_BICYCLE_SLUG = '/fresno-bicycle-accident'
export const LONGBEACH_BICYCLE_SLUG = '/long-beach-bicycle-accident'
export const BAKERSFIELD_BICYCLE_SLUG = '/bakersfield-bicycle-accident'
export const ANAHEIM_BICYCLE_SLUG = '/anaheim-bicycle-accident'

export const localPracticeGuidePages3: LandingPage[] = [
  {
    slug: FRESNO_PEDESTRIAN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Pedestrian Accident Claims',
    title: 'Fresno Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Fresno is repeatedly one of the most dangerous places in the country to walk: wide, fast arterials, Central Valley fog, and a high rate of uninsured drivers that often makes your own coverage the real source of recovery.',
    psychology: 'I was hit while walking in Fresno and I am worried the driver had no insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno pedestrian accident claim',
      'hit by an uninsured driver while walking fresno',
      'pedestrian hit on blackstone avenue fresno',
      'uninsured motorist coverage pedestrian california',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'Wide high-speed arterial',
      'Uninsured or underinsured driver',
      'UM/UIM first-party claim',
      'Tule fog low visibility',
      'FAX bus (public entity)',
      'Unmarked crosswalk at an intersection',
    ],
    sections: {
      whyItMatters: `Fresno pedestrian claims are shaped by three hard local realities. The first is the road environment: Fresno has consistently ranked among the most dangerous metros in the United States for people on foot, and its wide, high-speed arterials — Blackstone Avenue is the notorious example — are engineered for vehicle throughput, with long distances between safe crossings and heavy traffic moving fast. A pedestrian struck on one of these tends to be seriously hurt, and liability turns on physical facts: crossing distance, signal phase, lighting and the driver\u2019s sight lines. The second reality is money on the other side. The Central Valley has a high rate of uninsured and underinsured drivers, so a serious injury caused by a driver with no coverage or a minimal policy is common, and in that situation the injured person\u2019s own uninsured/underinsured motorist coverage is frequently the main or only source of recovery. ${UM_UIM} The third reality is the weather: Central Valley tule fog in the cooler months can cut visibility to almost nothing along Highway 99 and the surrounding streets, contributing to low-visibility pedestrian strikes; fog does not excuse a driver, because the basic speed law requires driving at a speed safe for the conditions, but it makes the driver\u2019s speed and the lighting central. Public transit here is bus-based — Fresno Area Express (FAX) — a public entity, so a collision involving a FAX bus is governed by the Government Claims Act and its six-month deadline. ${CLAIMS_ACT} California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing, so the fault an insurer assigns is often overstated, and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Fresno County Superior Court at the B.F. Sisk Courthouse.`,
      whatToTrack: [
        'Whether the driver was insured, and the policy limits if any',
        'Your own auto policy and its UM/UIM coverage, even as a pedestrian',
        'The arterial and exact location, with crossing distance and lighting',
        'Signal phase at the crossing and whether it was marked',
        'The visibility and whether tule fog was present',
        'Whether a FAX bus or other public vehicle was involved, and the date',
        'The driver\u2019s apparent speed relative to conditions',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ treats the uninsured-driver problem as a first-order question in Fresno, prompting for your own UM/UIM coverage — which as a pedestrian you can still use — rather than assuming the at-fault driver will pay. It documents the wide-arterial crossing conditions that decide fault and catches FAX involvement and its six-month clock. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had no insurance. Can I still recover anything?',
        a: 'Often yes, through your own uninsured motorist coverage, which as a pedestrian you can generally use if you have auto insurance, and sometimes through a household member\u2019s policy. In the Central Valley, where the uninsured rate is high, UM coverage is frequently the main source of recovery. It has its own notice rules and deadlines, so identifying every policy early matters.',
      },
      {
        q: 'I was hit on Blackstone Avenue. Why does that matter?',
        a: 'Fresno\u2019s wide, fast arterials produce serious pedestrian injuries and long, exposed crossings, and liability there turns on physical facts — crossing distance, signal phase, lighting and the driver\u2019s sight lines — rather than on either account. Documenting those conditions early is usually what establishes fault.',
      },
      {
        q: 'It was foggy when I was hit. Does that excuse the driver?',
        a: 'No. Tule fog reduces visibility, but California\u2019s basic speed law requires driving at a speed safe for the conditions, so a driver going too fast for the fog is negligent regardless. Fog makes the driver\u2019s speed and the lighting central, which is why noting the conditions matters.',
      },
      {
        q: 'I crossed where there was no painted crosswalk. Am I at fault?',
        a: 'Not necessarily. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction under the Freedom to Walk Act. Insurers still argue pedestrian fault, but under pure comparative negligence any genuine share only reduces recovery rather than barring it.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions — including your own UM/UIM — and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LONGBEACH_PEDESTRIAN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Pedestrian Accident Claims',
    title: 'Long Beach Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Long Beach mixes port-drayage truck traffic, the Metro A Line light rail running at street level downtown, and Long Beach Transit buses \u2014 so a pedestrian claim here often involves a commercial carrier or a public entity on a six-month clock.',
    psychology: 'I was hit while walking in Long Beach, maybe near the port, the light rail, or a bus.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach pedestrian accident claim',
      'pedestrian hit by a port truck long beach',
      'metro a line light rail pedestrian accident',
      'hit by a long beach transit bus claim',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'Port-drayage truck',
      'Metro A Line light rail crossing',
      'Long Beach Transit (public entity)',
      'Six-month agency deadline',
      'Commercial carrier coverage',
      'Unmarked crosswalk at an intersection',
    ],
    sections: {
      whyItMatters: `Long Beach pedestrian claims are shaped by the port, the light rail, and the transit system. The Port of Long Beach is one of the busiest container ports in the country, and it feeds a constant stream of drayage trucks through the city\u2019s streets and along the freeway approaches. A pedestrian struck by a commercial truck faces a different claim from an ordinary car collision: there are often layers of coverage — the driver, the motor carrier, sometimes a broker or the trailer owner — and federal safety records such as driver logs and vehicle data exist but are kept only for limited periods, so preserving them quickly is essential. The second feature is the Metro A Line (the former Blue Line), which runs at street level through downtown Long Beach, so pedestrian collisions with trains and at crossings are a recurring pattern; because Metro is a public entity, those claims run on the Government Claims Act\u2019s six-month deadline. Long Beach Transit buses add the ordinary public-entity collision on the same clock, and Long Beach is a Vision Zero city that has documented where its most dangerous crossings are. ${CLAIMS_ACT} On the streets themselves, California\u2019s pedestrian protections apply: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing, so the fault an insurer assigns is often overstated. Pure comparative negligence reduces rather than bars recovery. Jurisdiction decides who wrote the report: the California Highway Patrol on the freeway approaches, Long Beach Police on city streets, and Metro\u2019s policing on rail property. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether a commercial or port-drayage truck was involved, and the carrier',
        'For a truck, prompt preservation of driver logs and vehicle data',
        'Whether a Metro A Line vehicle or Long Beach Transit bus was involved, and the date',
        'The exact intersection or crossing, and whether it was marked',
        'Signal phase, lighting, and crossing distance',
        'Whether the location is on a known high-injury corridor',
        'Which agency responded: CHP, Long Beach Police, or Metro',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the three Long Beach patterns that change a pedestrian claim: a commercial or port truck, which brings layered coverage and short-retention federal records that must be preserved fast; a Metro A Line or Long Beach Transit vehicle, which triggers the six-month government clock; and the ordinary street collision, where crossing conditions decide fault. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A port truck hit me. How is that different from a car claim?',
        a: 'Commercial truck claims usually involve multiple layers of coverage \u2014 the driver, the motor carrier, sometimes a broker or trailer owner \u2014 and federal safety records such as driver logs and vehicle data that are kept only for limited periods. Preserving those records quickly, before they are overwritten, is often decisive, which is why a truck collision should be treated differently from the start.',
      },
      {
        q: 'The Metro A Line or a Long Beach Transit bus was involved. What is the deadline?',
        a: 'Six months to present a written claim, because both Metro and Long Beach Transit are public entities under the Government Claims Act. The A Line runs at street level through downtown, so pedestrian and crossing collisions with it are handled on the shortened government timeline, and the agency then has 45 days to respond.',
      },
      {
        q: 'I was hit at a downtown crossing. What decides fault?',
        a: 'Physical facts \u2014 signal phase, lighting, crossing distance and the driver\u2019s sight lines \u2014 rather than competing accounts. Long Beach has mapped its most dangerous corridors as a Vision Zero city, and documenting the specific crossing conditions early is usually what establishes fault.',
      },
      {
        q: 'I crossed away from a marked crosswalk. Am I barred?',
        a: 'No. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction. Insurers still argue pedestrian fault, but pure comparative negligence reduces recovery by your share rather than ending it.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the carrier and coverage questions, and the deadlines \u2014 including the six-month government clock \u2014 so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_PEDESTRIAN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Pedestrian Accident Claims',
    title: 'Bakersfield Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bakersfield\u2019s oil-and-agriculture economy fills Kern County roads with heavy commercial trucks, per-capita pedestrian deaths are among the worst in the state, and a high uninsured-driver rate often makes your own coverage the real source of recovery.',
    psychology: 'I was hit while walking in Bakersfield and worry the driver had no insurance or it was a work truck.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield pedestrian accident claim',
      'hit by an oilfield or ag truck bakersfield',
      'hit by an uninsured driver while walking bakersfield',
      'uninsured motorist coverage pedestrian california',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'Oilfield or agricultural truck',
      'Commercial carrier coverage',
      'Uninsured or underinsured driver',
      'UM/UIM first-party claim',
      'Tule fog low visibility',
      'GET bus (public entity)',
    ],
    sections: {
      whyItMatters: `Bakersfield pedestrian claims sit at the intersection of an industrial economy, dangerous roads, and thin insurance. Kern County\u2019s economy is built on oil and agriculture, and both put heavy commercial trucks on the roads \u2014 oilfield service trucks, tankers and agricultural haulers \u2014 so a pedestrian struck by a work truck is a common local scenario. Those claims differ from ordinary car collisions: there are often layers of coverage behind a commercial vehicle \u2014 the driver, the company, sometimes a contractor \u2014 and where federal motor-carrier rules apply, safety records such as driver logs and vehicle data exist but are kept only for limited periods, so preserving them quickly matters. The second reality is that Bakersfield and Kern County repeatedly report some of the worst per-capita pedestrian death rates in California, a product of wide, fast arterials with sparse crossings, so injuries here tend to be severe and liability turns on crossing distance, lighting and signal phase. The third is thin insurance: the region has a high rate of uninsured and underinsured drivers, so a serious injury caused by a driver with no or minimal coverage is common, and the injured person\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. ${UM_UIM} Central Valley tule fog along Highway 99 and Highway 58 adds low-visibility collisions, where the basic speed law still requires driving safely for the conditions. Public transit is bus-based \u2014 Golden Empire Transit (GET) \u2014 a public entity, so a collision involving a GET bus runs on the Government Claims Act\u2019s six-month deadline. ${CLAIMS_ACT} California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing. Pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'Whether a commercial, oilfield, or agricultural truck was involved, and the company',
        'For a work truck, prompt preservation of any driver logs and vehicle data',
        'Whether the driver was insured, and the policy limits if any',
        'Your own auto policy and its UM/UIM coverage, even as a pedestrian',
        'The arterial and exact location, with crossing distance and lighting',
        'The visibility and whether tule fog was present',
        'Whether a GET bus or other public vehicle was involved, and the date',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the two Bakersfield forks that most change a pedestrian claim: a commercial work truck, which brings layered coverage and short-retention records to preserve fast, and an uninsured or underinsured at-fault driver, which turns attention to your own UM/UIM coverage. It documents the severe-arterial crossing conditions and catches GET involvement and its six-month clock. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An oilfield or ag truck hit me. Is that different from a car claim?',
        a: 'Usually yes. A commercial work truck often carries layered coverage \u2014 the driver, the company, sometimes a contractor \u2014 and where federal motor-carrier rules apply there are safety records, such as driver logs and vehicle data, kept only for limited periods. Preserving those records quickly, and identifying every responsible party, is what makes these claims different from an ordinary car collision.',
      },
      {
        q: 'The driver had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured motorist coverage, which as a pedestrian you can generally use if you have auto insurance, and sometimes through a household member\u2019s policy. Kern County has a high uninsured rate, so UM coverage is frequently the main source of recovery, and it has its own notice rules and deadlines worth identifying early.',
      },
      {
        q: 'Why do Bakersfield pedestrian injuries tend to be so serious?',
        a: 'The area repeatedly reports some of the worst per-capita pedestrian death rates in California, largely because of wide, fast arterials with few safe crossings. Injuries are correspondingly severe, and liability turns on crossing distance, lighting and signal phase \u2014 documentable physical facts rather than either account.',
      },
      {
        q: 'I crossed where there was no painted crosswalk. Am I at fault?',
        a: 'Not necessarily. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction under the Freedom to Walk Act. Insurers still argue pedestrian fault, but under pure comparative negligence any genuine share only reduces recovery rather than barring it.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the carrier and coverage questions \u2014 including your own UM/UIM \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_PEDESTRIAN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Pedestrian Accident Claims',
    title: 'Anaheim Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Anaheim\u2019s resort district fills the streets with out-of-state tourists, rental cars, and rideshare, so an Anaheim pedestrian claim often turns on an unfamiliar or out-of-state driver and which policy actually covers it.',
    psychology: 'I was hit while walking near the Anaheim resort district and the driver may have been a tourist or rideshare.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim pedestrian accident claim',
      'hit by a tourist or rental car anaheim',
      'hit by a rideshare driver while walking anaheim',
      'out of state driver hit me california claim',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'Out-of-state or tourist driver',
      'Rental car coverage',
      'Rideshare (period-based coverage)',
      'Resort-district event traffic',
      'OCTA or ART bus (public entity)',
      'Unmarked crosswalk at an intersection',
    ],
    sections: {
      whyItMatters: `Anaheim pedestrian claims carry a complication most cities do not: the driver is often not local. The resort district \u2014 Disneyland, the convention center, Angel Stadium and the Honda Center \u2014 draws enormous foot traffic and fills the surrounding boulevards (Harbor, Katella, Ball) with out-of-state tourists, rental cars, and rideshare vehicles, especially around event start and end times. That changes the claim in specific ways. An out-of-state driver means an out-of-state insurance policy, which can complicate where and how the claim proceeds even though a California collision is governed by California law. A rental car adds the rental company\u2019s coverage, the driver\u2019s own policy, and sometimes a credit-card or travel policy layered on top, so identifying which one responds takes work. A rideshare vehicle brings coverage that depends on what the driver was doing at the moment of the collision: personal coverage when the app is off, a contingent policy when the app is on but no ride is accepted, and a larger commercial policy once a ride is accepted or a passenger is aboard \u2014 so the app status at impact drives which policy pays. Anaheim\u2019s public transit is bus-based \u2014 OCTA and Anaheim Resort Transportation (ART) \u2014 both public entities, so a collision involving one runs on the Government Claims Act\u2019s six-month deadline. ${CLAIMS_ACT} The tourist volume also produces predictable surges of distracted, unfamiliar drivers around events, where liability still turns on the usual physical facts. California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing. Pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether the driver was from out of state, and their insurer',
        'Whether the vehicle was a rental, and which company',
        'Whether it was a rideshare, and the app status at impact',
        'Every potentially applicable policy: driver, rental, credit-card, rideshare',
        'The boulevard and exact location, with crossing distance and lighting',
        'Whether an event was letting out at the time',
        'Whether an OCTA or ART bus was involved, and the date',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ is built for the Anaheim coverage puzzle: it captures whether the driver was out-of-state, in a rental, or on a rideshare app, and records the app status and every layered policy so the one that actually responds is identified early rather than after months of finger-pointing. It also catches OCTA or ART involvement and its six-month clock. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An out-of-state tourist hit me. Does California law still apply?',
        a: 'Yes. A collision that happens in California is governed by California law, including its pedestrian protections and comparative-fault rules, even if the driver and their insurer are from another state. The out-of-state policy can complicate the process, which is why identifying the insurer and its limits early is important.',
      },
      {
        q: 'The driver was in a rental car. Whose insurance pays?',
        a: 'Possibly several: the driver\u2019s own auto policy, the rental company\u2019s coverage, and sometimes a credit-card or travel policy on top. Sorting out which one responds \u2014 and in what order \u2014 takes documentation, so capturing the rental company and the driver\u2019s details at the scene helps avoid months of finger-pointing later.',
      },
      {
        q: 'A rideshare driver hit me while I was walking. What coverage applies?',
        a: 'It depends on the app status at the moment of impact: personal coverage when the app was off, a contingent policy when the app was on but no ride accepted, and a larger commercial policy once a ride was accepted or a passenger was aboard. Establishing what the driver was doing at impact is what determines which policy pays.',
      },
      {
        q: 'I crossed where there was no marked crosswalk near the resort. Am I at fault?',
        a: 'Not necessarily. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction. Insurers still argue pedestrian fault, but pure comparative negligence reduces recovery by your share rather than barring it.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the layered coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_BICYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Bicycle Accident Claims',
    title: 'Fresno Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Fresno cyclists contend with wide, fast arterials, agricultural-truck traffic, Central Valley fog, and a high uninsured-driver rate that often makes your own coverage the real source of recovery.',
    psychology: 'I was hit on my bike in Fresno and worry the driver had no insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno bicycle accident claim',
      'cyclist hit by an uninsured driver fresno',
      'cyclist hit by an ag truck fresno',
      'three foot passing law california bike',
      'doored while cycling fresno',
    ],
    signals: [
      'Wide high-speed arterial',
      'Agricultural truck',
      'Uninsured or underinsured driver',
      'UM/UIM first-party claim',
      'Three-foot passing violation',
      'Tule fog low visibility',
    ],
    sections: {
      whyItMatters: `Fresno bicycle claims combine a hostile road network with thin insurance and Valley weather. The road network is the same wide, high-speed arterial grid that makes Fresno so dangerous for pedestrians; cyclists share those roads with fast traffic and limited protected infrastructure, so a collision tends to be severe and liability turns on the driver\u2019s passing distance and the cyclist\u2019s lane position, governed by California\u2019s three-foot passing law (Vehicle Code section 21760) and the rule giving cyclists the rights and duties of drivers (section 21200). Agricultural trucks are a distinctive local hazard: haulers and equipment move on and across roads throughout the region, and a cyclist struck by a commercial or farm truck faces layered coverage and, where federal rules apply, short-retention safety records worth preserving quickly. The insurance reality matters as much as the crash: the Central Valley has a high rate of uninsured and underinsured drivers, so when the at-fault driver has no or minimal coverage, the cyclist\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. ${UM_UIM} Tule fog along Highway 99 and the surrounding roads adds low-visibility collisions, where the basic speed law still requires driving safely for the conditions. Dooring is the familiar urban pattern on streets with parallel parking, and Vehicle Code section 22517 prohibits opening a car door into traffic when unsafe, so fault generally rests with the person who opened it. Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it as to head injuries; and pure comparative negligence means any genuine share reduces rather than bars recovery. Civil cases are filed in Fresno County Superior Court at the B.F. Sisk Courthouse.`,
      whatToTrack: [
        'Whether the driver was insured, and the policy limits if any',
        'Your own auto policy and its UM/UIM coverage, which can apply while cycling',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether an agricultural or commercial truck was involved, and the company',
        'Whether a car door was opened into your path, and by whom',
        'The visibility and whether tule fog was present',
        'The arterial and exact location',
        'Every provider and the running cost of care',
      ],
      howClearCaseHelps: `ClearCaseIQ treats the uninsured-driver problem as central to a Fresno bike claim, prompting for your own UM/UIM coverage, and applies the three-foot passing and dooring rules to establish fault. It flags a commercial or ag truck for layered coverage and short-retention records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured motorist coverage, which can apply while you are cycling if you have auto insurance, and sometimes through a household member\u2019s policy. In the Central Valley, where the uninsured rate is high, UM coverage is frequently the main source of recovery, and it has its own notice rules and deadlines to identify early.',
      },
      {
        q: 'A car passed too close and hit me. What does California require?',
        a: 'At least three feet of clearance when passing a cyclist (Vehicle Code section 21760). Cyclists also have the rights and duties of drivers (section 21200), so liability turns on the passing distance, lane position and right of way rather than on any assumption a cyclist should not have been in the lane.',
      },
      {
        q: 'An ag truck was involved. Does that change things?',
        a: 'It can. A commercial or agricultural truck often carries layered coverage, and where federal motor-carrier rules apply there are safety records kept only for limited periods. Preserving those records quickly and identifying every responsible party is what makes a truck collision different from an ordinary car claim.',
      },
      {
        q: 'I was not wearing a helmet. Does that end my claim?',
        a: 'No. Adults are not required to wear a bike helmet in California, so its absence is not fault. An insurer may argue it affected head-injury severity, but that is a bounded argument about specific injuries, not a bar to the claim, and pure comparative negligence would only reduce recovery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions \u2014 including your own UM/UIM \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LONGBEACH_BICYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Bicycle Accident Claims',
    title: 'Long Beach Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Long Beach\u2019s beach path and bike boulevards carry heavy cycling volume alongside the Metro A Line light rail\u2019s embedded tracks and dense port-drayage truck traffic \u2014 three very different sources of a bike claim.',
    psychology: 'I crashed my bike in Long Beach, maybe in the light rail tracks, near the port, or on the beach path.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach bicycle accident claim',
      'bike tire stuck in metro a line tracks',
      'cyclist hit by a port truck long beach',
      'three foot passing law california bicycle',
      'doored while cycling long beach',
    ],
    signals: [
      'Metro A Line track wheel-trap fall',
      'Port-drayage truck',
      'Dangerous condition / Metro',
      'Beach path / bike boulevard',
      'Three-foot passing violation',
      'Six-month agency deadline',
    ],
    sections: {
      whyItMatters: `Long Beach bicycle claims come from three very different sources. The first is the Metro A Line light rail, which runs at street level through downtown; where light rail track is embedded in the roadway, a bike tire dropping into the flangeway at the wrong angle can throw a rider with no other vehicle involved, and where the design or maintenance of that public track is at issue the claim is a dangerous-condition claim against the transit agency. Because Metro is a public entity, that claim runs on the Government Claims Act\u2019s six-month deadline and needs prompt photographs of the track, location and angle before the evidence changes. ${CLAIMS_ACT} The second source is the port. Dense drayage-truck traffic moves through the city, and a cyclist struck by a commercial truck faces layered coverage \u2014 the driver, the motor carrier, sometimes a broker or trailer owner \u2014 and short-retention federal safety records worth preserving quickly. The third is Long Beach\u2019s strong cycling culture: the beach path and the city\u2019s bike boulevards carry heavy volume, and most collisions there are the familiar car-versus-bike patterns governed by the three-foot passing law (Vehicle Code section 21760), the dooring prohibition (Vehicle Code section 22517), and the rule giving cyclists the rights and duties of drivers (section 21200). Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Jurisdiction decides who wrote the report: CHP on the freeway approaches, Long Beach Police on city streets, Metro\u2019s policing on rail property. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether the fall involved Metro A Line tracks, and exactly where',
        'Photographs of the track, flangeway, and your line of travel, taken promptly',
        'Whether a commercial or port-drayage truck was involved, and the carrier',
        'For a truck, prompt preservation of driver logs and vehicle data',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether a car door was opened into your path, and by whom',
        'Whether the collision was on the beach path or a bike boulevard',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ recognises the Long Beach track-fall as a dangerous-condition claim against Metro on a six-month clock, needing photographs that vanish fast; flags a port or commercial truck for layered coverage and short-retention records; and applies the three-foot passing and dooring rules to street and beach-path collisions. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My bike tire caught in the Metro A Line tracks and I fell. Do I have a claim?',
        a: 'Possibly, as a dangerous-condition claim against the transit agency where the design or maintenance of the embedded track is at issue. Because Metro is a public entity, it runs on the six-month Government Claims Act deadline and needs prompt photographs of the track, location and angle, which is evidence that disappears quickly.',
      },
      {
        q: 'A port truck hit me while I was cycling. Is that different?',
        a: 'Yes. Commercial truck claims usually involve layered coverage \u2014 the driver, the motor carrier, sometimes a broker or trailer owner \u2014 and federal safety records kept only for limited periods. Preserving driver logs and vehicle data quickly, and identifying every responsible party, is what makes these claims different from an ordinary car collision.',
      },
      {
        q: 'A car passed too close on a bike boulevard. What does the law require?',
        a: 'At least three feet of clearance when passing (Vehicle Code section 21760). Cyclists have the rights and duties of drivers (section 21200), so liability turns on the passing distance, lane position and right of way rather than on any assumption a cyclist should not have been there.',
      },
      {
        q: 'I was doored on a street with parked cars. Whose fault is that?',
        a: 'Generally the person who opened the door. Vehicle Code section 22517 prohibits opening a car door into traffic when it is unsafe, so fault in a door-zone collision usually rests with the occupant rather than the cyclist. The position of the door and your line of travel establish it.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the roadway and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_BICYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Bicycle Accident Claims',
    title: 'Bakersfield Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bakersfield cyclists share Kern County roads with heavy oilfield and agricultural trucks, face Central Valley fog, and often confront a high uninsured-driver rate that makes your own coverage the real source of recovery.',
    psychology: 'I was hit on my bike in Bakersfield by a work truck or a driver with no insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield bicycle accident claim',
      'cyclist hit by an oilfield or ag truck bakersfield',
      'cyclist hit by an uninsured driver bakersfield',
      'three foot passing law california bicycle',
      'uninsured motorist coverage cyclist california',
    ],
    signals: [
      'Oilfield or agricultural truck',
      'Commercial carrier coverage',
      'Uninsured or underinsured driver',
      'UM/UIM first-party claim',
      'Three-foot passing violation',
      'Tule fog low visibility',
    ],
    sections: {
      whyItMatters: `Bakersfield bicycle claims are dominated by two local realities: heavy commercial trucks and thin insurance. Kern County\u2019s oil-and-agriculture economy puts oilfield service trucks, tankers and farm haulers on the roads a cyclist must share, and a rider struck by a commercial work truck faces a different claim from an ordinary car collision \u2014 layers of coverage behind the vehicle (the driver, the company, sometimes a contractor) and, where federal motor-carrier rules apply, safety records such as driver logs and vehicle data kept only for limited periods, so preserving them quickly matters. Ordinary car-versus-bike collisions are governed by the three-foot passing law (Vehicle Code section 21760), the dooring prohibition (Vehicle Code section 22517), and the rule giving cyclists the rights and duties of drivers (section 21200). The insurance reality is the second dominant factor: Kern County has a high rate of uninsured and underinsured drivers, so when the at-fault driver has no or minimal coverage \u2014 which is common \u2014 the cyclist\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. ${UM_UIM} Tule fog along Highway 99 and Highway 58 adds low-visibility collisions, where the basic speed law still requires driving safely for the conditions, and the region\u2019s wide, fast arterials mean cycling injuries tend to be severe. Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'Whether an oilfield, agricultural, or other commercial truck was involved, and the company',
        'For a work truck, prompt preservation of any driver logs and vehicle data',
        'Whether the driver was insured, and the policy limits if any',
        'Your own auto policy and its UM/UIM coverage, which can apply while cycling',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether a car door was opened into your path, and by whom',
        'The visibility and whether tule fog was present',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the two Bakersfield forks that most change a bike claim: a commercial work truck, which brings layered coverage and short-retention records to preserve fast, and an uninsured or underinsured at-fault driver, which turns attention to your own UM/UIM coverage. It applies the three-foot passing and dooring rules to establish fault. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An oilfield or ag truck hit me while cycling. Is that different?',
        a: 'Usually yes. A commercial work truck often carries layered coverage \u2014 the driver, the company, sometimes a contractor \u2014 and where federal motor-carrier rules apply there are safety records, such as driver logs and vehicle data, kept only for limited periods. Preserving those records quickly and identifying every responsible party is what makes these claims different from an ordinary car collision.',
      },
      {
        q: 'The driver had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured motorist coverage, which can apply while you are cycling if you have auto insurance, and sometimes through a household member\u2019s policy. Kern County has a high uninsured rate, so UM coverage is frequently the main source of recovery, and it has its own notice rules and deadlines worth identifying early.',
      },
      {
        q: 'A car passed too close and hit me. What does California require?',
        a: 'At least three feet of clearance when passing a cyclist (Vehicle Code section 21760). Cyclists also have the rights and duties of drivers (section 21200), so liability turns on the passing distance, lane position and right of way rather than on any assumption a cyclist should not have been in the lane.',
      },
      {
        q: 'I was not wearing a helmet. Does that end my claim?',
        a: 'No. Adults are not required to wear a bike helmet in California, so its absence is not fault. An insurer may argue it affected head-injury severity, but that is a bounded argument about specific injuries, not a bar to the claim, and pure comparative negligence would only reduce recovery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the carrier and coverage questions \u2014 including your own UM/UIM \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_BICYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Bicycle Accident Claims',
    title: 'Anaheim Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Anaheim cyclists share resort-district boulevards with out-of-state tourists, rental cars, and rideshare drivers unfamiliar with the roads \u2014 so an Anaheim bike claim often turns on which out-of-state or app-based policy responds.',
    psychology: 'I was hit on my bike near the Anaheim resort district by a tourist, rental, or rideshare driver.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim bicycle accident claim',
      'cyclist hit by a tourist or rental car anaheim',
      'cyclist hit by a rideshare driver anaheim',
      'three foot passing law california bicycle',
      'santa ana river trail bike accident',
    ],
    signals: [
      'Out-of-state or tourist driver',
      'Rental car coverage',
      'Rideshare (period-based coverage)',
      'Three-foot passing violation',
      'Santa Ana River Trail crossing',
      'OCTA (public entity)',
    ],
    sections: {
      whyItMatters: `Anaheim bicycle claims share the resort district\u2019s defining complication: the driver is frequently not local. The boulevards around Disneyland, the convention center, Angel Stadium and the Honda Center \u2014 Harbor, Katella, Ball \u2014 fill with out-of-state tourists, rental cars, and rideshare vehicles, and drivers unfamiliar with the roads are more likely to misjudge a cyclist\u2019s position or turn across a bike lane. Each of those categories changes the coverage question. An out-of-state driver brings an out-of-state policy, which can complicate the process even though a California collision is governed by California law, including the three-foot passing law (Vehicle Code section 21760) and the rule giving cyclists the rights and duties of drivers (section 21200). A rental car layers the rental company\u2019s coverage, the driver\u2019s own policy, and sometimes a credit-card or travel policy, so identifying which responds takes work. A rideshare vehicle brings coverage that depends on the app status at the moment of impact: personal when the app is off, a contingent policy when the app is on but no ride accepted, and a larger commercial policy once a ride is accepted or a passenger is aboard. Away from the resort, the Santa Ana River Trail is a major regional cycling corridor whose street crossings produce their own collisions, where right of way and signage decide fault. Anaheim\u2019s public transit is bus-based \u2014 OCTA and Anaheim Resort Transportation (ART), both public entities \u2014 so a collision involving one runs on the Government Claims Act\u2019s six-month deadline. ${CLAIMS_ACT} Dooring on parking-lined streets is governed by Vehicle Code section 22517. Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether the driver was from out of state, and their insurer',
        'Whether the vehicle was a rental, and which company',
        'Whether it was a rideshare, and the app status at impact',
        'Every potentially applicable policy: driver, rental, credit-card, rideshare',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether it happened at a Santa Ana River Trail crossing',
        'Whether an OCTA or ART bus was involved, and the date',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ is built for the Anaheim coverage puzzle on two wheels: it records whether the driver was out-of-state, in a rental, or on a rideshare app, and captures the app status and every layered policy so the responding one is found early. It applies the three-foot passing and dooring rules and treats a river-trail crossing as its own fault question. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An out-of-state tourist hit me while I was cycling. Does California law apply?',
        a: 'Yes. A collision in California is governed by California law, including the three-foot passing law and comparative-fault rules, even if the driver and insurer are from another state. The out-of-state policy can complicate the process, so identifying the insurer and its limits early is important.',
      },
      {
        q: 'A rideshare driver hit me. What coverage applies?',
        a: 'It depends on the app status at the moment of impact: personal coverage when the app was off, a contingent policy when the app was on but no ride accepted, and a larger commercial policy once a ride was accepted or a passenger was aboard. Establishing what the driver was doing at impact determines which policy pays.',
      },
      {
        q: 'The driver was in a rental car. Whose insurance pays?',
        a: 'Possibly several: the driver\u2019s own auto policy, the rental company\u2019s coverage, and sometimes a credit-card or travel policy. Sorting out which responds, and in what order, takes documentation, so capturing the rental company and the driver\u2019s details at the scene helps avoid months of finger-pointing.',
      },
      {
        q: 'I was hit where the Santa Ana River Trail crosses a street. Who is at fault?',
        a: 'It depends on the right of way and signage at that crossing, which are documentable facts rather than matters of recollection. Trail-crossing collisions are a recurring pattern, and capturing the crossing conditions early is usually what establishes fault.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the layered coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const localPracticeGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [FRESNO_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was hit crossing a wide Fresno arterial by a driver who turned out to be uninsured. The claim survived because she had her own UM coverage \u2014 identified early \u2014 and because the crossing conditions were documented before the intersection changed. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the arterial, crossing distance, lighting, and the driver\u2019s insurance.'],
      ['First week', 'Report obtained; your own UM/UIM coverage identified.'],
      ['First month', 'UM notice requirements observed; conditions documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Uninsured', 'No coverage on the other side; UM claim becomes central.'],
      ['Severe arterial', 'A wide, fast road with catastrophic injury.'],
      ['Low visibility', 'A tule-fog strike where the driver\u2019s speed is central.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the at-fault driver was insured',
      'Whether your own UM/UIM coverage was identified and preserved',
      'The arterial crossing conditions and signal phase',
      'The visibility and the driver\u2019s speed for the conditions',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'UM is often the case', copy: 'A high uninsured rate makes your own coverage central.' },
      { label: 'Severe by design', copy: 'Wide, fast arterials produce serious injuries.' },
      { label: 'Fog is no excuse', copy: 'The basic speed law governs speed in poor visibility.' },
      { label: 'Pedestrian protections', copy: 'Unmarked crosswalks and Freedom to Walk limit fault.' },
    ],
    insuranceProblems: [
      'The recovery is treated as impossible because the driver was uninsured.',
      'A UM claim misses its own notice deadline.',
      'The pedestrian is blamed for a lawful crossing.',
      'Fog is treated as excusing the driver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the at-fault driver have insurance?' },
      { label: 'Step 2', question: 'Do you or a household member have auto UM/UIM coverage?' },
      { label: 'Step 3', question: 'Where did it happen, and what were the crossing conditions?' },
      { label: 'Step 4', question: 'Was tule fog or poor visibility a factor?' },
    ],
  },
  [LONGBEACH_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was struck near the port by a drayage truck. Because driver logs and vehicle data are kept only briefly, preserving them at once, and identifying the motor carrier behind the driver, turned a single-defendant claim into a properly covered one. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify the truck, carrier, or transit vehicle; note the crossing.'],
      ['First week', 'Report obtained; preservation letters sent for truck records.'],
      ['Six months', 'Deadline to present a written claim if a public entity was involved.'],
      ['Longer term', 'Layered coverage and crossing conditions documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Agency', 'A Metro A Line or Long Beach Transit vehicle, six-month clock.'],
      ['Commercial', 'A port or drayage truck with layered coverage.'],
      ['Serious', 'A high-injury-corridor impact with catastrophic injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a commercial truck and its carrier were identified',
      'Whether driver logs and vehicle data were preserved in time',
      'Whether a public entity triggers the six-month clock',
      'Signal phase, lighting, and crossing distance',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Trucks bring layers', copy: 'Driver, carrier, and others may all be covered.' },
      { label: 'Records vanish', copy: 'Federal logs are kept only for limited periods.' },
      { label: 'Six-month clock', copy: 'Metro or Long Beach Transit shortens the deadline.' },
      { label: 'Corridors are mapped', copy: 'Vision Zero data locates the dangerous crossings.' },
    ],
    insuranceProblems: [
      'Only the driver is pursued while the carrier stays hidden.',
      'Truck records are overwritten before they are demanded.',
      'A government claim is rejected as untimely at six months.',
      'The pedestrian is blamed without the crossing examined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a commercial or port truck involved, and which carrier?' },
      { label: 'Step 2', question: 'Was a Metro A Line or Long Beach Transit vehicle involved?' },
      { label: 'Step 3', question: 'Where exactly did it happen?' },
      { label: 'Step 4', question: 'What were the signal and lighting conditions?' },
    ],
  },
  [BAKERSFIELD_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was hit by an oilfield service truck on a wide Bakersfield arterial. Identifying the company behind the driver, preserving the truck records, and \u2014 when the driver\u2019s coverage fell short \u2014 turning to her own UIM was what made the claim whole. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify the truck and company; note the arterial and lighting.'],
      ['First week', 'Report obtained; preservation letters sent; UM/UIM identified.'],
      ['Six months', 'Deadline to present a written claim if a GET bus was involved.'],
      ['Longer term', 'Coverage layers and treatment documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Commercial', 'An oilfield or ag truck with layered coverage.'],
      ['Uninsured', 'No or minimal coverage; UM/UIM becomes central.'],
      ['Severe arterial', 'A wide, fast road with catastrophic injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a commercial truck and its company were identified',
      'Whether truck records were preserved in time',
      'Whether the driver was insured, and your own UM/UIM',
      'The arterial crossing conditions and lighting',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Work trucks bring layers', copy: 'Driver, company, and contractors may all be covered.' },
      { label: 'UM is often the case', copy: 'A high uninsured rate makes your own coverage central.' },
      { label: 'Severe by design', copy: 'Wide, fast arterials produce serious injuries.' },
      { label: 'Records vanish', copy: 'Federal logs are kept only for limited periods.' },
    ],
    insuranceProblems: [
      'Only the driver is pursued while the company stays hidden.',
      'The recovery is treated as impossible because the driver was uninsured.',
      'Truck records are overwritten before they are demanded.',
      'The pedestrian is blamed for a lawful crossing.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an oilfield, ag, or commercial truck involved, and which company?' },
      { label: 'Step 2', question: 'Did the at-fault driver have insurance?' },
      { label: 'Step 3', question: 'Do you or a household member have UM/UIM coverage?' },
      { label: 'Step 4', question: 'Where did it happen, and what were the crossing conditions?' },
    ],
  },
  [ANAHEIM_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was hit near the resort district by a rideshare driver, and the coverage fight was really about the app status at impact. Establishing that a ride had been accepted moved the claim onto the larger commercial policy. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the driver was out-of-state, a rental, or rideshare.'],
      ['First week', 'Report obtained; every potentially applicable policy identified.'],
      ['First month', 'App status and coverage layers established.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A local, insured driver who clearly failed to yield.'],
      ['Out-of-state', 'An out-of-state policy complicating the process.'],
      ['Rental', 'Layered rental, personal, and card coverage to sort out.'],
      ['Rideshare', 'Coverage depends on the app status at impact.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver was out-of-state, in a rental, or on a rideshare app',
      'The app status at the moment of impact',
      'Which of the layered policies actually responds',
      'The boulevard crossing conditions and lighting',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'The driver is often a visitor', copy: 'Out-of-state policies complicate the process.' },
      { label: 'Rentals stack coverage', copy: 'Rental, personal, and card policies may all apply.' },
      { label: 'App status decides it', copy: 'Rideshare coverage turns on what the driver was doing.' },
      { label: 'Pedestrian protections', copy: 'Unmarked crosswalks and Freedom to Walk limit fault.' },
    ],
    insuranceProblems: [
      'The responding policy is disputed for months among insurers.',
      'A rideshare insurer denies based on a contested app status.',
      'An out-of-state insurer stalls a California claim.',
      'The pedestrian is blamed for a lawful crossing.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver from out of state?' },
      { label: 'Step 2', question: 'Was the vehicle a rental, and which company?' },
      { label: 'Step 3', question: 'Was it a rideshare, and what was the app status at impact?' },
      { label: 'Step 4', question: 'Where did it happen, and what were the crossing conditions?' },
    ],
  },
  [FRESNO_BICYCLE_SLUG]: {
    scenario: `A cyclist was struck on a wide Fresno arterial by an uninsured driver who passed too close. The three-foot violation established fault, and her own UM coverage \u2014 identified early \u2014 was what actually paid. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the passing distance, the arterial, and the driver\u2019s insurance.'],
      ['First week', 'Report obtained; your own UM/UIM coverage identified.'],
      ['First month', 'UM notice requirements observed; fault documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to pass safely.'],
      ['Uninsured', 'No coverage on the other side; UM claim becomes central.'],
      ['Commercial', 'An ag or commercial truck with layered coverage.'],
      ['Severe arterial', 'A wide, fast road with catastrophic injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the at-fault driver was insured',
      'Whether your own UM/UIM coverage was identified and preserved',
      'The passing distance and your lane position',
      'Whether a commercial or ag truck was involved',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'UM is often the case', copy: 'A high uninsured rate makes your own coverage central.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance.' },
      { label: 'Trucks bring layers', copy: 'Ag and commercial trucks carry multiple policies.' },
      { label: 'Helmet is bounded', copy: 'Not required for adults; relevant only to head injuries.' },
    ],
    insuranceProblems: [
      'The recovery is treated as impossible because the driver was uninsured.',
      'A UM claim misses its own notice deadline.',
      'The cyclist is blamed for lane position despite the passing rule.',
      'A truck\u2019s carrier is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the at-fault driver have insurance?' },
      { label: 'Step 2', question: 'Do you or a household member have auto UM/UIM coverage?' },
      { label: 'Step 3', question: 'How much room did the driver leave when passing?' },
      { label: 'Step 4', question: 'Was a commercial or agricultural truck involved?' },
    ],
  },
  [LONGBEACH_BICYCLE_SLUG]: {
    scenario: `A cyclist\u2019s wheel dropped into a Metro A Line flangeway downtown and threw him, with no car involved. Photographed that day, the track angle supported a dangerous-condition claim against Metro on a six-month clock. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the track or the passing position before anything changes.'],
      ['First week', 'Report obtained; public-entity or carrier involvement assessed.'],
      ['Six months', 'Deadline to present a written claim if Metro or transit was involved.'],
      ['Longer term', 'Coverage and roadway conditions documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A car-versus-bike collision with clear driver fault.'],
      ['Track fall', 'A single-vehicle fall implicating Metro track infrastructure.'],
      ['Commercial', 'A port or drayage truck with layered coverage.'],
      ['Serious', 'A high-speed impact with catastrophic injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the fall or collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the fall involved public track infrastructure',
      'Whether the track was photographed promptly',
      'Whether a commercial truck and its carrier were identified',
      'The passing distance in a car collision',
      'Whether the six-month claim was presented in time',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Track falls are claims', copy: 'A dangerous-condition claim against Metro, not a solo accident.' },
      { label: 'Trucks bring layers', copy: 'Port drayage carries driver and carrier coverage.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance.' },
      { label: 'Records vanish', copy: 'Federal truck logs are kept only for limited periods.' },
    ],
    insuranceProblems: [
      'A track fall is treated as a no-fault solo accident.',
      'The photographs that prove the track condition are never taken.',
      'Only the truck driver is pursued while the carrier stays hidden.',
      'A government claim is rejected as untimely at six months.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did your wheel catch in Metro A Line tracks, and where?' },
      { label: 'Step 2', question: 'Do you have photographs of the track and your line of travel?' },
      { label: 'Step 3', question: 'Was a commercial or port truck involved, and which carrier?' },
      { label: 'Step 4', question: 'For a car collision, how much room did the driver leave?' },
    ],
  },
  [BAKERSFIELD_BICYCLE_SLUG]: {
    scenario: `A cyclist was hit by an ag hauler on a Kern County road, and when the driver\u2019s coverage proved thin, her own UIM filled the gap. Identifying the company behind the truck and preserving its records made the difference. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify the truck and company; note the passing distance.'],
      ['First week', 'Report obtained; preservation letters sent; UM/UIM identified.'],
      ['First month', 'Coverage layers and fault documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to pass safely.'],
      ['Commercial', 'An oilfield or ag truck with layered coverage.'],
      ['Uninsured', 'No or minimal coverage; UM/UIM becomes central.'],
      ['Severe arterial', 'A wide, fast road with catastrophic injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a commercial truck and its company were identified',
      'Whether truck records were preserved in time',
      'Whether the driver was insured, and your own UM/UIM',
      'The passing distance and your lane position',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Work trucks bring layers', copy: 'Driver, company, and contractors may all be covered.' },
      { label: 'UM is often the case', copy: 'A high uninsured rate makes your own coverage central.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance.' },
      { label: 'Records vanish', copy: 'Federal logs are kept only for limited periods.' },
    ],
    insuranceProblems: [
      'Only the driver is pursued while the company stays hidden.',
      'The recovery is treated as impossible because the driver was uninsured.',
      'Truck records are overwritten before they are demanded.',
      'The cyclist is blamed for lane position despite the passing rule.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an oilfield, ag, or commercial truck involved, and which company?' },
      { label: 'Step 2', question: 'Did the at-fault driver have insurance?' },
      { label: 'Step 3', question: 'Do you or a household member have UM/UIM coverage?' },
      { label: 'Step 4', question: 'How much room did the driver leave when passing?' },
    ],
  },
  [ANAHEIM_BICYCLE_SLUG]: {
    scenario: `A cyclist was cut off near the resort district by a rental-car driver from out of state. Sorting the rental company\u2019s coverage from the driver\u2019s own policy \u2014 and applying the three-foot rule \u2014 got the claim onto the right insurer. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the driver was out-of-state, a rental, or rideshare.'],
      ['First week', 'Report obtained; every potentially applicable policy identified.'],
      ['First month', 'App status and coverage layers established; fault documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A local, insured driver who clearly failed to pass safely.'],
      ['Out-of-state', 'An out-of-state policy complicating the process.'],
      ['Rental', 'Layered rental, personal, and card coverage to sort out.'],
      ['Rideshare', 'Coverage depends on the app status at impact.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver was out-of-state, in a rental, or on a rideshare app',
      'The app status at the moment of impact',
      'Which of the layered policies actually responds',
      'The passing distance and your lane position',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'The driver is often a visitor', copy: 'Out-of-state policies complicate the process.' },
      { label: 'Rentals stack coverage', copy: 'Rental, personal, and card policies may all apply.' },
      { label: 'App status decides it', copy: 'Rideshare coverage turns on what the driver was doing.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance.' },
    ],
    insuranceProblems: [
      'The responding policy is disputed for months among insurers.',
      'A rideshare insurer denies based on a contested app status.',
      'An out-of-state insurer stalls a California claim.',
      'The cyclist is blamed for lane position despite the passing rule.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver from out of state?' },
      { label: 'Step 2', question: 'Was the vehicle a rental, and which company?' },
      { label: 'Step 3', question: 'Was it a rideshare, and what was the app status at impact?' },
      { label: 'Step 4', question: 'How much room did the driver leave when passing?' },
    ],
  },
}
