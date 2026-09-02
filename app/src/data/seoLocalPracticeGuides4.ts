import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, batch four: pedestrian and bicycle guides for Riverside, Stockton,
 * Santa Ana, and Irvine.
 *
 * Each metro has a genuinely different local angle rather than an interpolated
 * one:
 *  - Riverside: the Inland Empire is the country's warehouse and logistics hub,
 *    so distribution trucks fill the surface arterials; the climate is extreme,
 *    the roads are wide and fast, the uninsured-driver rate is high, and UC
 *    Riverside adds a dense student pedestrian and cycling population.
 *  - Stockton: an inland deep-water port and agricultural hub that is also
 *    repeatedly ranked among the most dangerous cities in the country for people
 *    on foot, with high poverty, a high uninsured rate, and Central Valley tule
 *    fog.
 *  - Santa Ana: the Orange County seat and its densest city, with the worst
 *    pedestrian-injury record in the county, wide arterials, the OCTA transit
 *    hub, county government vehicles, and the new OC Streetcar bringing
 *    street-level rail and embedded track to the city.
 *  - Irvine: a master-planned city with one of California's most extensive
 *    off-street (Class I) bike-trail networks and UC Irvine's large domestic
 *    and international student population, yet with wide, high-speed arterials
 *    that still produce serious collisions.
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

const TRUCK =
  'A pedestrian or cyclist struck by a commercial truck faces a different claim from an ordinary car collision: there are often layers of coverage \u2014 the driver, the motor carrier, sometimes a broker or the trailer owner \u2014 and federal safety records such as driver logs and vehicle data exist but are kept only for limited periods, so preserving them quickly is essential.'

export const RIVERSIDE_PEDESTRIAN_SLUG = '/riverside-pedestrian-accident'
export const STOCKTON_PEDESTRIAN_SLUG = '/stockton-pedestrian-accident'
export const SANTAANA_PEDESTRIAN_SLUG = '/santa-ana-pedestrian-accident'
export const IRVINE_PEDESTRIAN_SLUG = '/irvine-pedestrian-accident'
export const RIVERSIDE_BICYCLE_SLUG = '/riverside-bicycle-accident'
export const STOCKTON_BICYCLE_SLUG = '/stockton-bicycle-accident'
export const SANTAANA_BICYCLE_SLUG = '/santa-ana-bicycle-accident'
export const IRVINE_BICYCLE_SLUG = '/irvine-bicycle-accident'

export const localPracticeGuidePages4: LandingPage[] = [
  {
    slug: RIVERSIDE_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'Riverside Pedestrian Accident Claims',
    title: 'Riverside Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'The Inland Empire is the country\u2019s logistics hub, so Riverside\u2019s wide, fast arterials carry heavy distribution-truck traffic \u2014 and a high uninsured-driver rate often makes your own coverage the real source of recovery.',
    psychology: 'I was hit while walking in Riverside, maybe by a delivery or warehouse truck, and worry about insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside pedestrian accident claim',
      'hit by a delivery or warehouse truck riverside',
      'hit by an uninsured driver while walking riverside',
      'uninsured motorist coverage pedestrian california',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'Logistics / delivery truck',
      'Commercial carrier coverage',
      'Wide high-speed arterial',
      'Uninsured or underinsured driver',
      'UM/UIM first-party claim',
      'RTA bus (public entity)',
    ],
    sections: {
      whyItMatters: `Riverside pedestrian claims are shaped by what the Inland Empire has become: the warehouse and distribution capital of the western United States. That economy puts an enormous number of commercial trucks \u2014 delivery vans, box trucks and tractor-trailers serving the region\u2019s fulfillment centres \u2014 onto surface arterials like Magnolia and University Avenues, not just the freeways, so a pedestrian struck by a commercial vehicle is a common local scenario. ${TRUCK} The roads themselves add risk: Riverside\u2019s wide, high-speed arterials are built for vehicle throughput with long distances between safe crossings, so injuries tend to be serious and liability turns on crossing distance, signal phase and lighting. The second reality is thin insurance: the Inland Empire has a high rate of uninsured and underinsured drivers, so when the at-fault driver has no or minimal coverage the injured person\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. ${UM_UIM} UC Riverside adds a dense student pedestrian population around campus, where distracted-driver and crosswalk collisions cluster. Public transit is bus-based \u2014 the Riverside Transit Agency (RTA) \u2014 a public entity, so a collision involving an RTA bus runs on the Government Claims Act\u2019s six-month deadline. ${CLAIMS_ACT} California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing, so the fault an insurer assigns is often overstated, and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Whether a delivery, warehouse, or other commercial truck was involved, and the company',
        'For a truck, prompt preservation of driver logs and vehicle data',
        'Whether the driver was insured, and the policy limits if any',
        'Your own auto policy and its UM/UIM coverage, even as a pedestrian',
        'The arterial and exact location, with crossing distance and lighting',
        'Whether the collision was near UC Riverside',
        'Whether an RTA bus or other public vehicle was involved, and the date',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the two Riverside forks that most change a pedestrian claim: a commercial logistics truck, which brings layered coverage and short-retention records to preserve fast, and an uninsured or underinsured at-fault driver, which turns attention to your own UM/UIM coverage. It documents the wide-arterial crossing conditions and catches RTA involvement and its six-month clock. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A delivery or warehouse truck hit me. Is that different from a car claim?',
        a: 'Usually yes. A commercial truck often carries layered coverage \u2014 the driver, the motor carrier, sometimes a broker or trailer owner \u2014 and where federal rules apply there are safety records, such as driver logs and vehicle data, kept only for limited periods. Preserving those records quickly and identifying every responsible party is what makes these claims different, and the Inland Empire\u2019s logistics economy makes them common.',
      },
      {
        q: 'The driver who hit me had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured motorist coverage, which as a pedestrian you can generally use if you have auto insurance, and sometimes through a household member\u2019s policy. The Inland Empire has a high uninsured rate, so UM coverage is frequently the main source of recovery, and it has its own notice rules and deadlines worth identifying early.',
      },
      {
        q: 'I was hit on a wide arterial like Magnolia. Why does that matter?',
        a: 'Riverside\u2019s wide, fast arterials produce serious pedestrian injuries and long, exposed crossings, and liability there turns on physical facts \u2014 crossing distance, signal phase, lighting and the driver\u2019s sight lines \u2014 rather than on either account. Documenting those conditions early is usually what establishes fault.',
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
    slug: STOCKTON_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'Stockton Pedestrian Accident Claims',
    title: 'Stockton Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Stockton is repeatedly ranked among the most dangerous cities in the country for people on foot, with an inland deep-water port, Central Valley fog, and a high uninsured-driver rate that often makes your own coverage decisive.',
    psychology: 'I was hit while walking in Stockton and worry the driver had no insurance or it was a port or ag truck.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'stockton pedestrian accident claim',
      'hit by an uninsured driver while walking stockton',
      'hit by a port or ag truck stockton',
      'uninsured motorist coverage pedestrian california',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'High pedestrian-injury city',
      'Port or agricultural truck',
      'Uninsured or underinsured driver',
      'UM/UIM first-party claim',
      'Tule fog low visibility',
      'SJRTD bus (public entity)',
    ],
    sections: {
      whyItMatters: `Stockton pedestrian claims begin from a hard fact: the city repeatedly ranks among the most dangerous in the country for people on foot, a product of wide, fast arterials, corridors like Wilson Way and Miner Avenue with sparse safe crossings, and heavy through-traffic. Injuries here tend to be severe, and liability turns on documentable physical facts \u2014 crossing distance, signal phase and lighting \u2014 rather than either account. Two economic realities compound it. The first is thin insurance: Stockton has high poverty and a high rate of uninsured and underinsured drivers, so a serious injury caused by a driver with no or minimal coverage is common, and the injured person\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. ${UM_UIM} The second is the freight economy: the Port of Stockton is a major inland deep-water port and the surrounding region is an agricultural hub, so port drayage and agricultural trucks move through the city, and a pedestrian struck by one faces a commercial claim. ${TRUCK} Central Valley tule fog along Highway 99 and Interstate 5 adds low-visibility collisions, where the basic speed law still requires driving safely for the conditions. Public transit is bus-based \u2014 the San Joaquin Regional Transit District (SJRTD) \u2014 a public entity, so a collision involving an SJRTD bus runs on the Government Claims Act\u2019s six-month deadline. ${CLAIMS_ACT} California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing. Pure comparative negligence reduces rather than bars recovery. Civil cases are filed in San Joaquin County Superior Court.`,
      whatToTrack: [
        'Whether the driver was insured, and the policy limits if any',
        'Your own auto policy and its UM/UIM coverage, even as a pedestrian',
        'Whether a port, agricultural, or other commercial truck was involved, and the company',
        'For a truck, prompt preservation of driver logs and vehicle data',
        'The arterial and exact location, with crossing distance and lighting',
        'The visibility and whether tule fog was present',
        'Whether an SJRTD bus or other public vehicle was involved, and the date',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ treats the uninsured-driver problem as a first-order question in Stockton, prompting for your own UM/UIM coverage rather than assuming the at-fault driver will pay, and flags a port or ag truck for layered coverage and short-retention records. It documents the severe-arterial crossing conditions and catches SJRTD involvement and its six-month clock. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured motorist coverage, which as a pedestrian you can generally use if you have auto insurance, and sometimes through a household member\u2019s policy. Stockton has a high uninsured rate, so UM coverage is frequently the main source of recovery, and it has its own notice rules and deadlines worth identifying early.',
      },
      {
        q: 'Why are Stockton pedestrian injuries so often serious?',
        a: 'The city repeatedly ranks among the most dangerous in the country for people on foot, largely because of wide, fast arterials with few safe crossings on corridors like Wilson Way and Miner Avenue. Injuries are correspondingly severe, and liability turns on crossing distance, lighting and signal phase \u2014 documentable physical facts rather than either account.',
      },
      {
        q: 'A port or ag truck hit me. Does that change my claim?',
        a: 'It can. A commercial truck often carries layered coverage \u2014 the driver, the company, sometimes a broker \u2014 and where federal rules apply there are safety records kept only for limited periods. Preserving those records quickly and identifying every responsible party is what makes a truck collision different from an ordinary car claim.',
      },
      {
        q: 'I crossed where there was no painted crosswalk. Am I at fault?',
        a: 'Not necessarily. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction under the Freedom to Walk Act. Insurers still argue pedestrian fault, but under pure comparative negligence any genuine share only reduces recovery rather than barring it.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions \u2014 including your own UM/UIM \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANTAANA_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'Santa Ana Pedestrian Accident Claims',
    title: 'Santa Ana Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Santa Ana has the worst pedestrian-injury record in Orange County, with wide arterials, the OCTA transit hub, county government vehicles, and the new OC Streetcar bringing street-level rail to the city.',
    psychology: 'I was hit while walking in Santa Ana, maybe on a wide boulevard, near the transit hub, or by the streetcar.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'santa ana pedestrian accident claim',
      'pedestrian hit on bristol or first street santa ana',
      'oc streetcar pedestrian accident claim',
      'hit by an octa bus claim',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'Wide high-speed arterial',
      'OC Streetcar (street-level rail)',
      'OCTA bus (public entity)',
      'County government vehicle',
      'Six-month agency deadline',
      'Unmarked crosswalk at an intersection',
    ],
    sections: {
      whyItMatters: `Santa Ana pedestrian claims come from the densest city in Orange County and the one with the county\u2019s worst pedestrian-injury record. Wide, fast arterials \u2014 Bristol Street, First Street, McFadden and Harbor \u2014 carry heavy traffic through dense, walkable neighbourhoods, a combination that produces frequent and serious pedestrian collisions where liability turns on crossing distance, signal phase and lighting. Several features here point toward a public entity, which shortens the deadline. Santa Ana is the Orange County seat, so county government vehicles are common on its streets; it is the region\u2019s transit hub, with OCTA buses converging on the Santa Ana Regional Transportation Center; and the new OC Streetcar has brought street-level rail and embedded track to the city, so pedestrian collisions with the streetcar or at its crossings are a new local pattern. OCTA and the County are public entities, so a collision involving one of their vehicles \u2014 or a dangerous roadway condition \u2014 is governed by the Government Claims Act and its six-month deadline. ${CLAIMS_ACT} Where the at-fault party is a private driver, the ordinary two-year deadline applies, and in a working-class city with a meaningful uninsured-driver rate the injured person\u2019s own uninsured/underinsured motorist coverage may matter. California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing, so the fault an insurer assigns is often overstated. Pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Orange County Superior Court at the Central Justice Center in Santa Ana.`,
      whatToTrack: [
        'Whether an OCTA bus, OC Streetcar, or county vehicle was involved, and the date',
        'The exact intersection or crossing, and whether it was marked',
        'For a streetcar collision, the crossing, signals, and track location',
        'The arterial and crossing distance, signal phase, and lighting',
        'Whether the at-fault party was a private driver, and their insurance',
        'Your own auto policy and its UM/UIM coverage, if the driver was uninsured',
        'Whether the location is a known high-injury corridor',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ checks first for a public entity \u2014 an OCTA bus, the OC Streetcar, or a county vehicle \u2014 because each cuts the deadline to six months, and it documents the wide-arterial crossing conditions that decide fault on Santa Ana\u2019s high-injury corridors. Where a private driver is uninsured, it turns to your own UM/UIM. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An OCTA bus or the OC Streetcar was involved. What is the deadline?',
        a: 'Six months to present a written claim, because OCTA is a public entity under the Government Claims Act, and the OC Streetcar runs at street level so pedestrian and crossing collisions with it are handled on the shortened government timeline. The agency then has 45 days to respond. This is far shorter than the two years that applies to a private driver.',
      },
      {
        q: 'A county government vehicle hit me. Does that shorten my deadline?',
        a: 'Yes. Santa Ana is the Orange County seat, so county vehicles are common, and a collision involving one is governed by the Government Claims Act\u2019s six-month presentation deadline rather than the ordinary two years. Identifying that a public entity is involved early is essential to preserving the claim.',
      },
      {
        q: 'I was hit on a wide boulevard like Bristol or First. What decides fault?',
        a: 'Physical facts \u2014 signal phase, lighting, crossing distance and the driver\u2019s sight lines \u2014 rather than competing accounts. Santa Ana has the worst pedestrian record in Orange County largely because of these wide, fast arterials, and documenting the specific crossing conditions early is usually what establishes fault.',
      },
      {
        q: 'I crossed where there was no marked crosswalk. Am I barred?',
        a: 'No. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction. Insurers still argue pedestrian fault, but pure comparative negligence reduces recovery by your share rather than ending it.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, coverage questions, and deadlines \u2014 particularly whether a shortened government deadline applies \u2014 so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: IRVINE_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'Irvine Pedestrian Accident Claims',
    title: 'Irvine Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Irvine is master-planned and reputedly safe, but its wide, high-speed arterials still cause serious pedestrian collisions \u2014 and UC Irvine\u2019s large domestic and international student population adds its own patterns.',
    psychology: 'I was hit while walking in Irvine, maybe near UC Irvine or on a wide arterial, and do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'irvine pedestrian accident claim',
      'pedestrian hit near uc irvine',
      'hit by a car on a wide arterial irvine',
      'international student hit by a car california claim',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'Wide high-speed arterial',
      'UC Irvine student area',
      'International or out-of-area driver',
      'Master-planned crossing design',
      'iShuttle / OCTA bus (public entity)',
      'Unmarked crosswalk at an intersection',
    ],
    sections: {
      whyItMatters: `Irvine pedestrian claims carry a paradox: the city is master-planned and consistently rated among the safest of its size, yet its road design still produces serious pedestrian collisions. The reason is that Irvine\u2019s arterials \u2014 Culver Drive, Jamboree Road, Alton Parkway, Barranca Parkway \u2014 are wide and engineered for high speed even in a carefully planned city, so when a collision does happen the impact tends to be severe and liability turns on crossing distance, signal phase and lighting rather than on either account. The dominant local factor is UC Irvine, whose large student population \u2014 including a substantial number of international students \u2014 walks and crosses heavily around campus and the surrounding neighbourhoods. That matters in two ways: student pedestrian and crosswalk collisions cluster near campus, and an injured international student, or a collision caused by an out-of-area or international driver, can add an insurance dimension, though a collision in Irvine is governed by California law regardless of anyone\u2019s residency. Irvine\u2019s affluence often means the at-fault driver carries higher policy limits than in many cities, which can matter to a serious claim, but it does not change the analysis. Public transit is bus-based \u2014 the iShuttle and OCTA \u2014 both public entities, so a collision involving one runs on the Government Claims Act\u2019s six-month deadline; a dangerous condition of a public roadway points the same way. ${CLAIMS_ACT} California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing. Pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'The arterial and exact location, with crossing distance and lighting',
        'Whether the collision was near UC Irvine',
        'Whether the injured person or driver was an international or out-of-area visitor',
        'The at-fault driver\u2019s insurance and policy limits',
        'Whether an iShuttle or OCTA bus was involved, and the date',
        'Whether a dangerous roadway condition contributed',
        'Signal phase and whether the crosswalk was marked',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ looks past Irvine\u2019s safe reputation to the wide-arterial conditions that make its collisions severe, documents the campus-area crossing facts that decide fault, and handles the international-student and out-of-area insurance wrinkle. It catches iShuttle or OCTA involvement and its six-month clock. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Irvine is supposed to be safe. Why was my collision so serious?',
        a: 'Because Irvine\u2019s arterials are wide and engineered for high speed even in a master-planned city, so when a pedestrian is struck the impact tends to be severe. The city\u2019s overall safety rating does not change the physics of a specific crossing, and liability turns on the crossing distance, signal phase and lighting at that location.',
      },
      {
        q: 'I am an international student and was hit near UC Irvine. Does California law apply?',
        a: 'Yes. A collision that happens in Irvine is governed by California law, including its pedestrian protections and comparative-fault rules, regardless of your residency or visa status. Your own or a driver\u2019s out-of-area coverage may add complexity, but it does not remove your rights under California law.',
      },
      {
        q: 'The driver seemed to have good insurance. Does that help my claim?',
        a: 'It can. Irvine\u2019s affluence means at-fault drivers more often carry higher policy limits, which can matter to a serious claim because there is more coverage available. It does not change how fault is determined, which still rests on the physical facts of the crossing.',
      },
      {
        q: 'I crossed where there was no painted crosswalk. Am I at fault?',
        a: 'Not necessarily. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction under the Freedom to Walk Act. Insurers still argue pedestrian fault, but under pure comparative negligence any genuine share only reduces recovery rather than barring it.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, coverage questions, and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIVERSIDE_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'Riverside Bicycle Accident Claims',
    title: 'Riverside Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Riverside cyclists share wide arterials with heavy Inland Empire logistics-truck traffic, ride the Santa Ana River Trail, and often confront a high uninsured-driver rate that makes your own coverage decisive.',
    psychology: 'I was hit on my bike in Riverside by a delivery truck or a driver with no insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside bicycle accident claim',
      'cyclist hit by a delivery or warehouse truck riverside',
      'cyclist hit by an uninsured driver riverside',
      'three foot passing law california bike',
      'santa ana river trail bike accident',
    ],
    signals: [
      'Logistics / delivery truck',
      'Commercial carrier coverage',
      'Uninsured or underinsured driver',
      'UM/UIM first-party claim',
      'Three-foot passing violation',
      'Santa Ana River Trail crossing',
    ],
    sections: {
      whyItMatters: `Riverside bicycle claims combine the Inland Empire\u2019s logistics economy with thin insurance and hostile roads. The logistics economy means an unusual density of commercial trucks \u2014 delivery vans, box trucks and tractor-trailers serving the region\u2019s warehouses \u2014 on the same wide arterials cyclists must use, and a rider struck by a commercial truck faces a different claim from an ordinary car collision. ${TRUCK} Ordinary car-versus-bike collisions are governed by the three-foot passing law (Vehicle Code section 21760), the dooring prohibition (Vehicle Code section 22517), and the rule giving cyclists the rights and duties of drivers (section 21200). The insurance reality matters as much: the Inland Empire has a high rate of uninsured and underinsured drivers, so when the at-fault driver has no or minimal coverage the cyclist\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. ${UM_UIM} Riverside also has genuine cycling infrastructure \u2014 the Santa Ana River Trail runs through the region \u2014 and collisions where the trail meets a street turn on right of way and signage at the crossing. UC Riverside adds a student cycling population around campus. Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Whether a delivery, warehouse, or other commercial truck was involved, and the company',
        'For a truck, prompt preservation of driver logs and vehicle data',
        'Whether the driver was insured, and the policy limits if any',
        'Your own auto policy and its UM/UIM coverage, which can apply while cycling',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether it happened at a Santa Ana River Trail crossing',
        'Whether a car door was opened into your path, and by whom',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the two Riverside forks that most change a bike claim: a commercial logistics truck, which brings layered coverage and short-retention records, and an uninsured or underinsured driver, which turns attention to your own UM/UIM. It applies the three-foot passing and dooring rules and treats a river-trail crossing as its own fault question. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A delivery or warehouse truck hit me while cycling. Is that different?',
        a: 'Usually yes. A commercial truck often carries layered coverage \u2014 the driver, the motor carrier, sometimes a broker \u2014 and where federal rules apply there are safety records kept only for limited periods. Preserving those records quickly and identifying every responsible party is what makes these claims different, and the Inland Empire\u2019s logistics economy makes them common.',
      },
      {
        q: 'The driver had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured motorist coverage, which can apply while you are cycling if you have auto insurance, and sometimes through a household member\u2019s policy. The Inland Empire has a high uninsured rate, so UM coverage is frequently the main source of recovery, and it has its own notice rules and deadlines worth identifying early.',
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
    slug: STOCKTON_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'Stockton Bicycle Accident Claims',
    title: 'Stockton Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Stockton cyclists face wide, dangerous arterials, port and agricultural truck traffic, Central Valley fog, and a high uninsured-driver rate that often makes your own coverage the real source of recovery.',
    psychology: 'I was hit on my bike in Stockton by a truck or a driver with no insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'stockton bicycle accident claim',
      'cyclist hit by a port or ag truck stockton',
      'cyclist hit by an uninsured driver stockton',
      'three foot passing law california bicycle',
      'uninsured motorist coverage cyclist california',
    ],
    signals: [
      'Port or agricultural truck',
      'Commercial carrier coverage',
      'Uninsured or underinsured driver',
      'UM/UIM first-party claim',
      'Three-foot passing violation',
      'Tule fog low visibility',
    ],
    sections: {
      whyItMatters: `Stockton bicycle claims are dominated by dangerous roads, freight traffic and thin insurance. The city repeatedly ranks among the most dangerous in the country for vulnerable road users, with wide, fast arterials and sparse protected infrastructure, so cycling injuries tend to be severe and liability turns on the driver\u2019s passing distance and the cyclist\u2019s lane position under the three-foot passing law (Vehicle Code section 21760) and the rule giving cyclists the rights and duties of drivers (section 21200). The freight economy is a distinctive hazard: the Port of Stockton is a major inland deep-water port and the region is an agricultural hub, so port drayage and farm trucks move on the roads a cyclist must share, and a rider struck by a commercial truck faces layered coverage and short-retention records. ${TRUCK} The insurance reality is the second dominant factor: Stockton has high poverty and a high rate of uninsured and underinsured drivers, so when the at-fault driver has no or minimal coverage the cyclist\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. ${UM_UIM} Central Valley tule fog along Highway 99 and Interstate 5 adds low-visibility collisions, where the basic speed law still requires driving safely for the conditions, and the dooring prohibition (Vehicle Code section 22517) governs door-zone collisions. Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in San Joaquin County Superior Court.`,
      whatToTrack: [
        'Whether a port, agricultural, or other commercial truck was involved, and the company',
        'For a truck, prompt preservation of driver logs and vehicle data',
        'Whether the driver was insured, and the policy limits if any',
        'Your own auto policy and its UM/UIM coverage, which can apply while cycling',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether a car door was opened into your path, and by whom',
        'The visibility and whether tule fog was present',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the two Stockton forks that most change a bike claim: a port or ag truck, which brings layered coverage and short-retention records to preserve fast, and an uninsured or underinsured driver, which turns attention to your own UM/UIM. It applies the three-foot passing and dooring rules and documents fog conditions where the driver\u2019s speed is central. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A port or ag truck hit me while cycling. Is that different?',
        a: 'Usually yes. A commercial truck often carries layered coverage \u2014 the driver, the company, sometimes a broker \u2014 and where federal rules apply there are safety records kept only for limited periods. Preserving those records quickly and identifying every responsible party is what makes these claims different from an ordinary car collision.',
      },
      {
        q: 'The driver had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured motorist coverage, which can apply while you are cycling if you have auto insurance, and sometimes through a household member\u2019s policy. Stockton has a high uninsured rate, so UM coverage is frequently the main source of recovery, and it has its own notice rules and deadlines worth identifying early.',
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
    slug: SANTAANA_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'Santa Ana Bicycle Accident Claims',
    title: 'Santa Ana Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Santa Ana cyclists contend with the county\u2019s most dangerous arterials, the new OC Streetcar\u2019s embedded tracks, and a dense OCTA transit network \u2014 several very different sources of a bike claim.',
    psychology: 'I crashed my bike in Santa Ana, maybe in the streetcar tracks or on a wide boulevard.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'santa ana bicycle accident claim',
      'bike tire stuck in oc streetcar tracks',
      'cyclist hit on bristol or first street santa ana',
      'three foot passing law california bicycle',
      'doored while cycling santa ana',
    ],
    signals: [
      'OC Streetcar track wheel-trap fall',
      'Dangerous condition / OCTA',
      'Wide high-speed arterial',
      'Three-foot passing violation',
      'Six-month agency deadline',
      'Dooring',
    ],
    sections: {
      whyItMatters: `Santa Ana bicycle claims come from several very different sources in Orange County\u2019s densest and most pedestrian- and cyclist-dangerous city. The first is the road network: wide, fast arterials such as Bristol Street and First Street carry heavy traffic, and most car-versus-bike collisions there are governed by the three-foot passing law (Vehicle Code section 21760), the dooring prohibition (Vehicle Code section 22517), and the rule giving cyclists the rights and duties of drivers (section 21200). The second, and distinctive, source is the OC Streetcar, which has brought street-level rail and embedded track to the city. Where light rail track is embedded in the roadway, a bike tire dropping into the flangeway at the wrong angle can throw a rider with no other vehicle involved, and where the design or maintenance of that public track is at issue the claim is a dangerous-condition claim against the transit agency. Because OCTA operates the streetcar and is a public entity, that claim \u2014 and any collision involving an OCTA bus \u2014 runs on the Government Claims Act\u2019s six-month deadline and needs prompt photographs of the track, location and angle before the evidence changes. ${CLAIMS_ACT} Santa Ana is also the OCTA transit hub, so bus involvement is common. Where the at-fault party is a private driver, the ordinary rules and two-year deadline apply, and a working-class city\u2019s uninsured-driver rate can make the cyclist\u2019s own UM/UIM coverage relevant. Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Orange County Superior Court at the Central Justice Center.`,
      whatToTrack: [
        'Whether the fall involved OC Streetcar tracks, and exactly where',
        'Photographs of the track, flangeway, and your line of travel, taken promptly',
        'Whether an OCTA bus or other public vehicle was involved, and the date',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether a car door was opened into your path, and by whom',
        'The arterial and exact location',
        'Whether the at-fault driver was insured, and your own UM/UIM',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ recognises a Santa Ana streetcar-track fall as a dangerous-condition claim against OCTA on a six-month clock, needing photographs that vanish fast, and applies the three-foot passing and dooring rules to street collisions on the county\u2019s most dangerous arterials. Where a private driver is uninsured, it turns to your own UM/UIM. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My bike tire caught in the OC Streetcar tracks and I fell. Do I have a claim?',
        a: 'Possibly, as a dangerous-condition claim against the transit agency where the design or maintenance of the embedded track is at issue. Because OCTA is a public entity, it runs on the six-month Government Claims Act deadline and needs prompt photographs of the track, location and angle, which is evidence that disappears quickly.',
      },
      {
        q: 'An OCTA bus was involved. How long do I have?',
        a: 'Six months from the collision to present a written claim, because OCTA is a public entity under the Government Claims Act, rather than the two years that applies to a private driver. Santa Ana is the OCTA hub, so bus involvement is common, and the agency then has 45 days to respond.',
      },
      {
        q: 'A car passed too close on a wide boulevard. What does the law require?',
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
    slug: IRVINE_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'Irvine Bicycle Accident Claims',
    title: 'Irvine Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Irvine has one of California\u2019s most extensive off-street bike-trail networks and a huge UC Irvine cycling population, but its wide, fast arterials and trail-street crossings still produce serious collisions.',
    psychology: 'I crashed my bike in Irvine, maybe at a trail crossing or on a wide arterial near UC Irvine.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'irvine bicycle accident claim',
      'bike trail crossing accident irvine',
      'cyclist hit near uc irvine',
      'three foot passing law california bicycle',
      'doored while cycling irvine',
    ],
    signals: [
      'Class I trail-street crossing',
      'UC Irvine cyclist population',
      'Wide high-speed arterial',
      'Three-foot passing violation',
      'International or out-of-area driver',
      'Dooring',
    ],
    sections: {
      whyItMatters: `Irvine bicycle claims reflect a city built for cycling that still has dangerous points of contact with cars. Irvine has one of the most extensive off-street (Class I) bike-trail networks in California and a very large cycling population, anchored by UC Irvine and its many domestic and international students, so cycling volume is high. The paradox is the same as for pedestrians: the city\u2019s arterials \u2014 Culver Drive, Jamboree Road, Alton and Barranca Parkways \u2014 are wide and engineered for speed, so the collisions that do happen tend to be severe. Two collision environments dominate. The first is the trail-street crossing: Irvine\u2019s off-street trails are safe until they meet a roadway, and collisions where a trail crosses a street turn on right of way, signage and sight lines at the crossing. The second is the on-street collision governed by the three-foot passing law (Vehicle Code section 21760), the dooring prohibition (Vehicle Code section 22517), and the rule giving cyclists the rights and duties of drivers (section 21200). The UC Irvine population adds an insurance wrinkle: an injured international student, or a collision caused by an out-of-area or international driver, can complicate coverage, though a collision in Irvine is governed by California law regardless of residency, and the city\u2019s affluence often means higher at-fault policy limits. A dangerous condition of a public trail or roadway can implicate a public entity on the six-month Government Claims Act deadline. ${CLAIMS_ACT} Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether it happened at a Class I trail-street crossing, and where',
        'Right of way, signage, and sight lines at the crossing',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether a car door was opened into your path, and by whom',
        'Whether you or the driver was an international or out-of-area visitor',
        'The at-fault driver\u2019s insurance and policy limits',
        'Whether a dangerous trail or roadway condition contributed',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ treats an Irvine trail-street crossing collision as its own fault question, applies the three-foot passing and dooring rules to on-street collisions on the city\u2019s deceptively fast arterials, and handles the international-student and out-of-area insurance wrinkle. It flags a public trail or roadway condition that could implicate a public entity. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hit where an Irvine bike trail crosses a street. Who is at fault?',
        a: 'It depends on the right of way, signage and sight lines at that crossing, which are documentable facts rather than matters of recollection. Irvine\u2019s off-street trails are safe until they meet a roadway, and trail-street crossing collisions are a common local pattern, so capturing the crossing conditions early is usually what establishes fault.',
      },
      {
        q: 'I am an international student and was hit near UC Irvine. Does California law apply?',
        a: 'Yes. A collision in Irvine is governed by California law, including the three-foot passing law and comparative-fault rules, regardless of your residency or visa status. Your own or a driver\u2019s out-of-area coverage may add complexity, but it does not remove your rights under California law.',
      },
      {
        q: 'A car passed too close on a wide Irvine arterial. What does the law require?',
        a: 'At least three feet of clearance when passing a cyclist (Vehicle Code section 21760). Cyclists have the rights and duties of drivers (section 21200), so liability turns on the passing distance, lane position and right of way rather than on any assumption a cyclist should not have been in the lane.',
      },
      {
        q: 'I was not wearing a helmet. Does that end my claim?',
        a: 'No. Adults are not required to wear a bike helmet in California, so its absence is not fault. An insurer may argue it affected head-injury severity, but that is a bounded argument about specific injuries, not a bar to the claim, and pure comparative negligence would only reduce recovery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the roadway and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const localPracticeGuideTopicContentBySlug4: Record<string, TopicContent> = {
  [RIVERSIDE_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was struck on a wide Riverside arterial by a delivery truck serving a nearby warehouse. Identifying the motor carrier behind the driver and preserving the truck records \u2014 then turning to her own UIM when the coverage fell short \u2014 made the claim whole. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify the truck and company; note the arterial and lighting.'],
      ['First week', 'Report obtained; preservation letters sent; UM/UIM identified.'],
      ['Six months', 'Deadline to present a written claim if an RTA bus was involved.'],
      ['Longer term', 'Coverage layers and treatment documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Commercial', 'A logistics or delivery truck with layered coverage.'],
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
      'Whether a commercial truck and its carrier were identified',
      'Whether truck records were preserved in time',
      'Whether the driver was insured, and your own UM/UIM',
      'The arterial crossing conditions and lighting',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Logistics trucks bring layers', copy: 'Driver, carrier, and broker may all be covered.' },
      { label: 'UM is often the case', copy: 'A high uninsured rate makes your own coverage central.' },
      { label: 'Records vanish', copy: 'Federal logs are kept only for limited periods.' },
      { label: 'Severe by design', copy: 'Wide, fast arterials produce serious injuries.' },
    ],
    insuranceProblems: [
      'Only the driver is pursued while the carrier stays hidden.',
      'Truck records are overwritten before they are demanded.',
      'The recovery is treated as impossible because the driver was uninsured.',
      'The pedestrian is blamed for a lawful crossing.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a delivery or commercial truck involved, and which carrier?' },
      { label: 'Step 2', question: 'Did the at-fault driver have insurance?' },
      { label: 'Step 3', question: 'Do you or a household member have UM/UIM coverage?' },
      { label: 'Step 4', question: 'Where did it happen, and what were the crossing conditions?' },
    ],
  },
  [STOCKTON_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was hit on a notorious Stockton corridor by an uninsured driver. The claim survived because she had her own UM coverage, identified early, and because the severe-arterial crossing conditions were documented before anything changed. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the arterial, crossing distance, lighting, and the driver\u2019s insurance.'],
      ['First week', 'Report obtained; your own UM/UIM coverage identified.'],
      ['First month', 'UM notice requirements observed; conditions documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Uninsured', 'No coverage on the other side; UM claim becomes central.'],
      ['Commercial', 'A port or ag truck with layered coverage.'],
      ['Severe arterial', 'A wide, fast road with catastrophic injury.'],
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
      'The arterial crossing conditions and lighting',
      'Whether a port or ag truck was involved',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'UM is often the case', copy: 'A high uninsured rate makes your own coverage central.' },
      { label: 'Among the most dangerous', copy: 'Wide, fast arterials produce serious injuries.' },
      { label: 'Trucks bring layers', copy: 'Port and ag trucks carry multiple policies.' },
      { label: 'Pedestrian protections', copy: 'Unmarked crosswalks and Freedom to Walk limit fault.' },
    ],
    insuranceProblems: [
      'The recovery is treated as impossible because the driver was uninsured.',
      'A UM claim misses its own notice deadline.',
      'The pedestrian is blamed for a lawful crossing.',
      'A truck\u2019s carrier is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the at-fault driver have insurance?' },
      { label: 'Step 2', question: 'Do you or a household member have auto UM/UIM coverage?' },
      { label: 'Step 3', question: 'Was a port or agricultural truck involved?' },
      { label: 'Step 4', question: 'Where did it happen, and what were the crossing conditions?' },
    ],
  },
  [SANTAANA_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was hit by an OCTA bus on a wide Santa Ana boulevard, and the family nearly filed on the two-year assumption. Recognising the six-month government deadline, the written claim reached OCTA in time. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether a bus, streetcar, or county vehicle was involved.'],
      ['First week', 'Report obtained; public-entity involvement assessed.'],
      ['Six months', 'Deadline to present a written claim to any public entity.'],
      ['Longer term', 'Crossing conditions and treatment documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Agency', 'An OCTA bus, streetcar, or county vehicle, six-month clock.'],
      ['Streetcar', 'A street-level rail collision or crossing.'],
      ['Severe arterial', 'A wide, fast boulevard with catastrophic injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public entity triggers the six-month clock',
      'The crossing conditions, signal phase, and lighting',
      'For a streetcar collision, the crossing and track location',
      'Whether a private driver was uninsured, and your own UM/UIM',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Public entities are common', copy: 'Transit hub and county seat shorten the deadline.' },
      { label: 'Streetcar is new', copy: 'Street-level rail adds a fresh local hazard.' },
      { label: 'Worst in the county', copy: 'Wide arterials produce serious injuries.' },
      { label: 'Pedestrian protections', copy: 'Unmarked crosswalks and Freedom to Walk limit fault.' },
    ],
    insuranceProblems: [
      'A government claim is rejected as untimely at six months.',
      'The pedestrian is blamed without the crossing examined.',
      'Responsibility is disputed among city, county, and OCTA.',
      'A private driver turns out to be uninsured.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an OCTA bus, the OC Streetcar, or a county vehicle involved?' },
      { label: 'Step 2', question: 'Where exactly did it happen?' },
      { label: 'Step 3', question: 'What were the signal and lighting conditions?' },
      { label: 'Step 4', question: 'If a private driver, did they have insurance?' },
    ],
  },
  [IRVINE_PEDESTRIAN_SLUG]: {
    scenario: `An international UC Irvine student was struck on a wide arterial by a turning driver who assumed a "safe" city meant slow streets. The severe impact showed otherwise, and the crossing conditions established the driver\u2019s failure to yield. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the arterial, crossing distance, lighting, and any campus proximity.'],
      ['First week', 'Report obtained; the driver\u2019s insurance and limits identified.'],
      ['First month', 'Any out-of-area coverage wrinkle resolved; conditions documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A local, insured driver who clearly failed to yield.'],
      ['Severe arterial', 'A wide, fast road with catastrophic injury.'],
      ['Out-of-area', 'An international or out-of-area party complicating coverage.'],
      ['Agency', 'An iShuttle or OCTA vehicle, six-month clock.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The arterial crossing conditions and lighting',
      'The at-fault driver\u2019s insurance and policy limits',
      'Whether an international or out-of-area party complicates coverage',
      'Whether a public entity triggers the six-month clock',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Safe reputation misleads', copy: 'Wide, fast arterials still produce serious injuries.' },
      { label: 'Higher limits help', copy: 'Affluent drivers more often carry ample coverage.' },
      { label: 'Residency is irrelevant', copy: 'California law governs regardless of visa status.' },
      { label: 'Pedestrian protections', copy: 'Unmarked crosswalks and Freedom to Walk limit fault.' },
    ],
    insuranceProblems: [
      'The city\u2019s safe reputation is used to minimise a serious injury.',
      'An international student is wrongly told they lack rights.',
      'Out-of-area coverage is used to stall the claim.',
      'The pedestrian is blamed for a lawful crossing.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where did it happen, and what were the crossing conditions?' },
      { label: 'Step 2', question: 'Was it near UC Irvine?' },
      { label: 'Step 3', question: 'Was anyone an international or out-of-area visitor?' },
      { label: 'Step 4', question: 'What insurance did the at-fault driver carry?' },
    ],
  },
  [RIVERSIDE_BICYCLE_SLUG]: {
    scenario: `A cyclist was struck on a wide Riverside arterial by a box truck serving a fulfillment centre. Identifying the carrier and preserving the truck records \u2014 then using her own UIM when limits fell short \u2014 was what made the claim whole. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify the truck and carrier; note the passing distance.'],
      ['First week', 'Report obtained; preservation letters sent; UM/UIM identified.'],
      ['First month', 'Coverage layers and fault documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to pass safely.'],
      ['Commercial', 'A logistics or delivery truck with layered coverage.'],
      ['Uninsured', 'No or minimal coverage; UM/UIM becomes central.'],
      ['Trail crossing', 'A Santa Ana River Trail crossing collision.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a commercial truck and its carrier were identified',
      'Whether truck records were preserved in time',
      'Whether the driver was insured, and your own UM/UIM',
      'The passing distance and your lane position',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Logistics trucks bring layers', copy: 'Driver, carrier, and broker may all be covered.' },
      { label: 'UM is often the case', copy: 'A high uninsured rate makes your own coverage central.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance.' },
      { label: 'Records vanish', copy: 'Federal logs are kept only for limited periods.' },
    ],
    insuranceProblems: [
      'Only the driver is pursued while the carrier stays hidden.',
      'The recovery is treated as impossible because the driver was uninsured.',
      'Truck records are overwritten before they are demanded.',
      'The cyclist is blamed for lane position despite the passing rule.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a delivery or commercial truck involved, and which carrier?' },
      { label: 'Step 2', question: 'Did the at-fault driver have insurance?' },
      { label: 'Step 3', question: 'Do you or a household member have UM/UIM coverage?' },
      { label: 'Step 4', question: 'How much room did the driver leave when passing?' },
    ],
  },
  [STOCKTON_BICYCLE_SLUG]: {
    scenario: `A cyclist was hit by an ag hauler on a dangerous Stockton corridor, and when the driver\u2019s coverage proved thin, her own UIM filled the gap. Identifying the company behind the truck and preserving its records made the difference. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify the truck and company; note the passing distance.'],
      ['First week', 'Report obtained; preservation letters sent; UM/UIM identified.'],
      ['First month', 'Coverage layers and fault documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to pass safely.'],
      ['Commercial', 'A port or ag truck with layered coverage.'],
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
      { label: 'Trucks bring layers', copy: 'Port and ag trucks carry multiple policies.' },
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
      { label: 'Step 1', question: 'Was a port, ag, or commercial truck involved, and which company?' },
      { label: 'Step 2', question: 'Did the at-fault driver have insurance?' },
      { label: 'Step 3', question: 'Do you or a household member have UM/UIM coverage?' },
      { label: 'Step 4', question: 'How much room did the driver leave when passing?' },
    ],
  },
  [SANTAANA_BICYCLE_SLUG]: {
    scenario: `A cyclist\u2019s wheel dropped into an OC Streetcar flangeway and threw him, with no car involved. Photographed that day, the track angle supported a dangerous-condition claim against OCTA on a six-month clock. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the track or the passing position before anything changes.'],
      ['First week', 'Report obtained; public-entity involvement assessed.'],
      ['Six months', 'Deadline to present a written claim if OCTA was involved.'],
      ['Longer term', 'Coverage and roadway conditions documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A car-versus-bike collision with clear driver fault.'],
      ['Track fall', 'A single-vehicle fall implicating OC Streetcar track.'],
      ['Agency', 'An OCTA bus involved, six-month clock running.'],
      ['Severe arterial', 'A wide, fast boulevard with catastrophic injury.'],
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
      'Whether an OCTA bus was involved',
      'The passing distance in a car collision',
      'Whether the six-month claim was presented in time',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Track falls are claims', copy: 'A dangerous-condition claim against OCTA, not a solo accident.' },
      { label: 'Repairs destroy proof', copy: 'Photograph the track angle immediately.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance.' },
      { label: 'Six-month clock', copy: 'OCTA involvement shortens the deadline.' },
    ],
    insuranceProblems: [
      'A track fall is treated as a no-fault solo accident.',
      'The photographs that prove the track condition are never taken.',
      'A government claim is rejected as untimely at six months.',
      'The cyclist is blamed for lane position despite the passing rule.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did your wheel catch in OC Streetcar tracks, and where?' },
      { label: 'Step 2', question: 'Do you have photographs of the track and your line of travel?' },
      { label: 'Step 3', question: 'Was an OCTA bus involved?' },
      { label: 'Step 4', question: 'For a car collision, how much room did the driver leave?' },
    ],
  },
  [IRVINE_BICYCLE_SLUG]: {
    scenario: `A UC Irvine cyclist was struck where an off-street trail crossed a wide arterial, and the driver claimed the rider "appeared from nowhere." The crossing signage and sight lines, documented early, established the right of way. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the crossing, signage, sight lines, or the passing position.'],
      ['First week', 'Report obtained; the driver\u2019s insurance and any out-of-area wrinkle assessed.'],
      ['First month', 'Coverage and crossing conditions documented.'],
      ['Longer term', 'Treatment and comparative-fault position assembled.'],
    ],
    severityLadder: [
      ['Straightforward', 'A car-versus-bike collision with clear driver fault.'],
      ['Trail crossing', 'A collision where a Class I trail meets a street.'],
      ['Severe arterial', 'A wide, fast road with catastrophic injury.'],
      ['Out-of-area', 'An international or out-of-area party complicating coverage.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The right of way and signage at a trail crossing',
      'The passing distance in an on-street collision',
      'The at-fault driver\u2019s insurance and policy limits',
      'Whether an international or out-of-area party complicates coverage',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Crossings decide fault', copy: 'Right of way and signage over either account.' },
      { label: 'Safe reputation misleads', copy: 'Wide, fast arterials still produce serious injuries.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance.' },
      { label: 'Residency is irrelevant', copy: 'California law governs regardless of visa status.' },
    ],
    insuranceProblems: [
      'The cyclist is blamed at a trail crossing without the signage examined.',
      'The city\u2019s safe reputation is used to minimise a serious injury.',
      'An international student is wrongly told they lack rights.',
      'The cyclist is blamed for lane position despite the passing rule.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did it happen where a trail crosses a street, and where?' },
      { label: 'Step 2', question: 'For an on-street collision, how much room did the driver leave?' },
      { label: 'Step 3', question: 'Was anyone an international or out-of-area visitor?' },
      { label: 'Step 4', question: 'What insurance did the at-fault driver carry?' },
    ],
  },
}
