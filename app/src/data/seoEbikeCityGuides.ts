import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Missing-vertical hub: e-bike (electric bicycle) collision practice area.
 * Distinct from the non-motorized bicycle hub and the standing e-scooter hub,
 * because e-bikes have their own classification and rules under California law.
 * Batch 1 metros: Los Angeles, San Diego, San Francisco, San Jose.
 *
 * Applied accurately:
 *  - E-bikes are classified as Class 1, 2, or 3 (Vehicle Code section 312.5); they
 *    are treated as bicycles, not motor vehicles, so a driver license and license
 *    plate are generally not required \u2014 which matters for what insurance applies.
 *  - Class 3 e-bikes carry extra rules: a rider must be 16 or older and wear a
 *    helmet (Vehicle Code section 21213), and Class 3 use is restricted on some paths.
 *  - A rider has the same rights and duties as a driver (Vehicle Code section 21200),
 *    including the three-foot passing law (Vehicle Code section 21760) that protects them.
 *  - A defective battery, motor, or brake can add a strict product-liability claim,
 *    separate from a negligent driver; a dangerous roadway can implicate a public
 *    entity under the six-month Government Claims Act (Government Code section 911.2).
 *  - Pure comparative negligence applies; a personal-injury deadline is generally two
 *    years (Code of Civil Procedure section 335.1). No page states an average payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. How an e-bike is classified, whose insurance applies, whether a product or public-entity claim exists, and which deadline governs depend on facts a licensed California attorney should review promptly.'

const CLASSIFICATION =
  'California classifies electric bicycles as Class 1, 2, or 3 (Vehicle Code section 312.5) and treats them as bicycles, not motor vehicles \u2014 so a driver license and license plate are generally not required. That classification matters because it shapes which insurance and rules apply: a rider hurt by a car usually looks to the driver\u2019s auto policy and to the rider\u2019s own uninsured/underinsured coverage, not to a motorcycle or moped framework.'

const CLASS3 =
  'A Class 3 e-bike (assisted up to 28 mph) carries extra rules: the rider must be at least 16 and must wear a helmet (Vehicle Code section 21213), and Class 3 riding is restricted on some bike paths and trails. Whether the rider followed these rules can affect a comparative-fault argument, but breaking one does not automatically bar a claim.'

const RIGHTS =
  'An e-bike rider has the same rights and duties on the road as the driver of a vehicle (Vehicle Code section 21200). That includes the protection of the three-foot passing law (Vehicle Code section 21760) and the rules against dooring and unsafe turns \u2014 so a driver who turns across a rider, passes too closely, or opens a door into the bike lane can be at fault just as with a traditional bicycle.'

const PRODUCT =
  'E-bikes add a product dimension a regular bicycle rarely has. A defective lithium-ion battery, motor, throttle, or brake \u2014 a fire, a sudden loss of power, or brakes that fail \u2014 can support a strict product-liability claim against the manufacturer, distributor, or seller, independent of any driver\u2019s negligence. The bike and its battery should be preserved.'

const ROADWAY =
  'Where a pothole, an abrupt pavement edge, a defective bike lane, or a poorly designed intersection contributes to a crash, a public entity can be liable for a dangerous condition of public property \u2014 but that path carries a short six-month Government Claims Act deadline (Government Code section 911.2), so it must be identified early.'

const DEADLINE =
  'Pure comparative negligence applies, so a rider\u2019s own share of fault reduces but does not erase a recovery. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1), and a claim against a public entity is far shorter at six months, so acting early matters.'

export const LA_EBIKE_SLUG = '/los-angeles-e-bike-accident'
export const SD_EBIKE_SLUG = '/san-diego-e-bike-accident'
export const SF_EBIKE_SLUG = '/san-francisco-e-bike-accident'
export const SJ_EBIKE_SLUG = '/san-jose-e-bike-accident'
export const SAC_EBIKE_SLUG = '/sacramento-e-bike-accident'
export const FRESNO_EBIKE_SLUG = '/fresno-e-bike-accident'
export const LB_EBIKE_SLUG = '/long-beach-e-bike-accident'
export const OAK_EBIKE_SLUG = '/oakland-e-bike-accident'
export const RIV_EBIKE_SLUG = '/riverside-e-bike-accident'
export const SB_EBIKE_SLUG = '/san-bernardino-e-bike-accident'
export const BAK_EBIKE_SLUG = '/bakersfield-e-bike-accident'
export const ANA_EBIKE_SLUG = '/anaheim-e-bike-accident'

export const ebikeCityGuidePages: LandingPage[] = [
  {
    slug: LA_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles E-Bike Accident Claims',
    title: 'Los Angeles E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in Los Angeles? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike in LA and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'class 3 e-bike helmet law california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `E-bike ridership has surged across Los Angeles \u2014 on Westside beach paths, in DTLA, and on arterial bike lanes \u2014 and riders hit by cars are often told, wrongly, that they need motorcycle coverage. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether a helmet was worn (for a Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need motorcycle or moped insurance for an e-bike?',
        a: 'Generally no. California treats e-bikes as bicycles, not motor vehicles (Vehicle Code 312.5), so a driver license and plate are not required. A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'I wasn\u2019t wearing a helmet. Does that end my claim?',
        a: 'Not automatically. A helmet is required for Class 3 e-bikes and for riders under 18. Not wearing one can factor into comparative fault but does not, by itself, bar a claim under California\u2019s pure comparative-negligence rule.',
      },
      {
        q: 'A driver passed too close and clipped me. Is that their fault?',
        a: 'It can be. An e-bike rider has the same rights as a driver (Vehicle Code 21200) and the protection of the three-foot passing law (Vehicle Code 21760), so a driver who passes too closely, doors you, or turns across you can be at fault.',
      },
      {
        q: 'My battery caught fire / my brakes failed. Is that separate?',
        a: 'Yes. A defective battery, motor, throttle, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'San Diego E-Bike Accident Claims',
    title: 'San Diego E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in San Diego? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike in San Diego and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'class 3 e-bike helmet law california',
      'e-bike battery fire injury claim california',
      'coastal bike lane e-bike crash san diego',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s coastal boardwalks, beach communities, and dense e-bike use \u2014 especially among teens \u2014 have made e-bike crashes a growing local concern, and riders are often misinformed about coverage. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in San Diego County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether the rider was 16+ and helmeted (Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My teen was hit on a Class 3 e-bike. Does the age rule matter?',
        a: 'It can. A Class 3 rider must be at least 16 and wear a helmet (Vehicle Code 21213). A violation can factor into comparative fault, but it does not automatically bar the injured rider\u2019s claim.',
      },
      {
        q: 'Do I need motorcycle insurance for an e-bike?',
        a: 'Generally no. E-bikes are treated as bicycles (Vehicle Code 312.5). A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A car turned across the bike lane and hit me. Whose fault is that?',
        a: 'Often the driver\u2019s. An e-bike rider has the same rights as a driver (Vehicle Code 21200), and turning across a rider or passing within three feet (Vehicle Code 21760) can be negligence.',
      },
      {
        q: 'My battery caught fire. Is that a separate claim?',
        a: 'Yes. A defective battery, motor, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'San Francisco E-Bike Accident Claims',
    title: 'San Francisco E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in San Francisco? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike in SF and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'e-bike delivery rider injury california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense traffic, delivery-rider economy, and extensive bike-lane network mean e-bike riders \u2014 including gig couriers \u2014 face doorings, hook turns, and close passes daily. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} A delivery rider may also have a work-related layer to analyze. Civil cases are filed in San Francisco County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'Whether you were working (delivery) at the time',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, flags any work-related layer for a delivery rider, and preserves the battery for a possible product claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was delivering food on my e-bike when hit. Does that change things?',
        a: 'It can add a layer. Alongside the driver\u2019s liability, there may be a workers\u2019-compensation or occupational-coverage question depending on your work arrangement \u2014 which should be analyzed early.',
      },
      {
        q: 'Do I need motorcycle insurance for an e-bike?',
        a: 'Generally no. E-bikes are treated as bicycles (Vehicle Code 312.5). A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A driver doored me in the bike lane. Is that their fault?',
        a: 'Often yes. An e-bike rider has the same rights as a driver (Vehicle Code 21200); dooring and passing within three feet (Vehicle Code 21760) can be negligence.',
      },
      {
        q: 'My battery caught fire. Is that separate?',
        a: 'Yes. A defective battery, motor, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'San Jose E-Bike Accident Claims',
    title: 'San Jose E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in San Jose? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike in San Jose and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'class 3 e-bike helmet law california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s Silicon Valley commuting culture, wide arterials, and growing bike-lane network have driven heavy e-bike adoption, and riders hit by cars are frequently misinformed about coverage. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether the rider was 16+ and helmeted (Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need motorcycle insurance for an e-bike?',
        a: 'Generally no. E-bikes are treated as bicycles (Vehicle Code 312.5). A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A pothole in the bike lane caused my crash. Can I claim?',
        a: 'Possibly, against the responsible public entity for a dangerous condition of public property \u2014 but that carries a short six-month Government Claims Act deadline (Government Code 911.2), so it must be identified early.',
      },
      {
        q: 'A car passed within a foot of me. Is that illegal?',
        a: 'Yes. The three-foot passing law (Vehicle Code 21760) requires a driver to give at least three feet, and a rider has the same rights as a driver (Vehicle Code 21200).',
      },
      {
        q: 'My brakes failed. Is that a separate claim?',
        a: 'It can be. A defective brake, battery, or motor can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'Sacramento E-Bike Accident Claims',
    title: 'Sacramento E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in Sacramento? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike near the American River Trail and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'american river bike trail e-bike crash',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s flat grid, state-worker commuting, and the American River bike trail have made e-bikes a common way to move around the capital \u2014 and riders hit by cars are often told, wrongly, that they need motorcycle coverage. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in Sacramento County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether a helmet was worn (for a Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need motorcycle or moped insurance for an e-bike?',
        a: 'Generally no. California treats e-bikes as bicycles, not motor vehicles (Vehicle Code 312.5), so a driver license and plate are not required. A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'I was hurt on the American River Trail. Does a public entity matter?',
        a: 'It can. Where a pavement defect or dangerous condition on public property contributes, a public entity may be liable \u2014 but that path carries a short six-month Government Claims Act deadline (Government Code 911.2), so it must be identified early.',
      },
      {
        q: 'A car passed within a foot of me. Is that illegal?',
        a: 'Yes. The three-foot passing law (Vehicle Code 21760) requires a driver to give at least three feet, and a rider has the same rights as a driver (Vehicle Code 21200).',
      },
      {
        q: 'My battery caught fire / my brakes failed. Is that separate?',
        a: 'Yes. A defective battery, motor, throttle, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'Fresno E-Bike Accident Claims',
    title: 'Fresno E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in Fresno? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike on a wide Fresno arterial and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'class 3 e-bike helmet law california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s wide, fast arterials and growing e-bike adoption \u2014 including among teens commuting to school \u2014 put riders alongside heavy traffic, and many are misinformed about coverage after a crash. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether the rider was 16+ and helmeted (Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My teen was hit on a Class 3 e-bike. Does the age rule matter?',
        a: 'It can. A Class 3 rider must be at least 16 and wear a helmet (Vehicle Code 21213). A violation can factor into comparative fault, but it does not automatically bar the injured rider\u2019s claim.',
      },
      {
        q: 'Do I need motorcycle insurance for an e-bike?',
        a: 'Generally no. E-bikes are treated as bicycles (Vehicle Code 312.5). A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A driver turned across me on a wide arterial. Whose fault is that?',
        a: 'Often the driver\u2019s. An e-bike rider has the same rights as a driver (Vehicle Code 21200), and turning across a rider or passing within three feet (Vehicle Code 21760) can be negligence.',
      },
      {
        q: 'My battery caught fire. Is that a separate claim?',
        a: 'Yes. A defective battery, motor, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'Long Beach E-Bike Accident Claims',
    title: 'Long Beach E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in Long Beach? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike on the Long Beach bike path and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'beach path e-bike crash long beach',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s beach bike path, dense downtown, and port-area traffic put e-bike riders alongside cars and pedestrians daily, and riders hit by drivers are often wrongly told they need motorcycle coverage. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether a helmet was worn (for a Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need motorcycle or moped insurance for an e-bike?',
        a: 'Generally no. California treats e-bikes as bicycles, not motor vehicles (Vehicle Code 312.5), so a driver license and plate are not required. A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'I was hit on the beach bike path. Does that change anything?',
        a: 'The same rules apply. A rider has the same rights and duties as a driver (Vehicle Code 21200); if a pavement defect on public property contributed, a public entity may be liable under a short six-month deadline (Government Code 911.2).',
      },
      {
        q: 'A driver doored me or passed too close. Is that their fault?',
        a: 'It can be. The three-foot passing law (Vehicle Code 21760) and the rules against dooring protect an e-bike rider just as they protect a traditional bicyclist.',
      },
      {
        q: 'My battery caught fire / my brakes failed. Is that separate?',
        a: 'Yes. A defective battery, motor, throttle, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'Oakland E-Bike Accident Claims',
    title: 'Oakland E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in Oakland? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike near Lake Merritt and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'e-bike delivery rider injury california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s East Bay commuting, Lake Merritt loop, and delivery-rider economy mean e-bike riders \u2014 including gig couriers \u2014 face close passes, hook turns, and doorings, and many are misinformed about coverage after a crash. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} A delivery rider may also have a work-related layer to analyze. Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'Whether you were working (delivery) at the time',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, flags any work-related layer for a delivery rider, and preserves the battery for a possible product claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was delivering on my e-bike when hit. Does that change things?',
        a: 'It can add a layer. Alongside the driver\u2019s liability, there may be a workers\u2019-compensation or occupational-coverage question depending on your work arrangement \u2014 which should be analyzed early.',
      },
      {
        q: 'Do I need motorcycle insurance for an e-bike?',
        a: 'Generally no. E-bikes are treated as bicycles (Vehicle Code 312.5). A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A driver doored me in the bike lane. Is that their fault?',
        a: 'Often yes. An e-bike rider has the same rights as a driver (Vehicle Code 21200); dooring and passing within three feet (Vehicle Code 21760) can be negligence.',
      },
      {
        q: 'My battery caught fire. Is that separate?',
        a: 'Yes. A defective battery, motor, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'Riverside E-Bike Accident Claims',
    title: 'Riverside E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in Riverside? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike on a wide Inland Empire road and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'class 3 e-bike helmet law california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s wide Inland Empire arterials, university commuting, and warm-weather riding have driven fast e-bike adoption, and riders hit by cars are frequently misinformed about coverage. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in Riverside County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether the rider was 16+ and helmeted (Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need motorcycle or moped insurance for an e-bike?',
        a: 'Generally no. California treats e-bikes as bicycles, not motor vehicles (Vehicle Code 312.5), so a driver license and plate are not required. A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A car passed within a foot of me. Is that illegal?',
        a: 'Yes. The three-foot passing law (Vehicle Code 21760) requires a driver to give at least three feet, and a rider has the same rights as a driver (Vehicle Code 21200).',
      },
      {
        q: 'I wasn\u2019t wearing a helmet. Does that end my claim?',
        a: 'Not automatically. A helmet is required for Class 3 e-bikes and for riders under 18. Not wearing one can factor into comparative fault but does not, by itself, bar a claim under California\u2019s pure comparative-negligence rule.',
      },
      {
        q: 'My battery caught fire / my brakes failed. Is that separate?',
        a: 'Yes. A defective battery, motor, throttle, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'San Bernardino E-Bike Accident Claims',
    title: 'San Bernardino E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in San Bernardino? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike in San Bernardino and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'class 3 e-bike helmet law california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s wide arterials, hot climate, and rising e-bike use \u2014 particularly among teens and commuters \u2014 place riders alongside fast traffic, and many are wrongly told they need motorcycle coverage after a crash. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in San Bernardino County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether the rider was 16+ and helmeted (Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My teen was hit on a Class 3 e-bike. Does the age rule matter?',
        a: 'It can. A Class 3 rider must be at least 16 and wear a helmet (Vehicle Code 21213). A violation can factor into comparative fault, but it does not automatically bar the injured rider\u2019s claim.',
      },
      {
        q: 'Do I need motorcycle insurance for an e-bike?',
        a: 'Generally no. E-bikes are treated as bicycles (Vehicle Code 312.5). A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A pothole in the bike lane caused my crash. Can I claim?',
        a: 'Possibly, against the responsible public entity for a dangerous condition of public property \u2014 but that carries a short six-month Government Claims Act deadline (Government Code 911.2), so it must be identified early.',
      },
      {
        q: 'My battery caught fire. Is that a separate claim?',
        a: 'Yes. A defective battery, motor, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAK_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield E-Bike Accident Claims',
    title: 'Bakersfield E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in Bakersfield? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike on a wide Bakersfield road and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'class 3 e-bike helmet law california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s wide, high-speed arterials and growing e-bike use put riders alongside fast Central Valley traffic, and riders hit by cars are often misinformed about what insurance applies. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in Kern County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether a helmet was worn (for a Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need motorcycle or moped insurance for an e-bike?',
        a: 'Generally no. California treats e-bikes as bicycles, not motor vehicles (Vehicle Code 312.5), so a driver license and plate are not required. A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A driver turned across me on a wide road. Whose fault is that?',
        a: 'Often the driver\u2019s. An e-bike rider has the same rights as a driver (Vehicle Code 21200), and turning across a rider or passing within three feet (Vehicle Code 21760) can be negligence.',
      },
      {
        q: 'I wasn\u2019t wearing a helmet. Does that end my claim?',
        a: 'Not automatically. A helmet is required for Class 3 e-bikes and for riders under 18. Not wearing one can factor into comparative fault but does not, by itself, bar a claim under California\u2019s pure comparative-negligence rule.',
      },
      {
        q: 'My battery caught fire / my brakes failed. Is that separate?',
        a: 'Yes. A defective battery, motor, throttle, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANA_EBIKE_SLUG,
    category: 'Cities',
    cluster: 'Anaheim E-Bike Accident Claims',
    title: 'Anaheim E-Bike Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit while riding an e-bike in Anaheim? An e-bike is treated as a bicycle, not a motor vehicle \u2014 which shapes whose insurance pays and whether a defective battery adds a claim.',
    psychology: 'I was hit on my e-bike near an Anaheim resort corridor and don\u2019t know whose insurance covers me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim e-bike accident lawyer',
      'e-bike hit by car insurance california',
      'class 3 e-bike helmet law california',
      'e-bike battery fire injury claim california',
      'three foot passing law e-bike california',
    ],
    signals: [
      'E-bike classification (312.5)',
      'Driver\u2019s auto policy + UM/UIM',
      'Class 3 helmet / age rules',
      'Three-foot passing law',
      'Battery / motor product claim',
      'Two-year deadline (6 mo. vs. public entity)',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s resort corridors, wide boulevards, and heavy tourist traffic put e-bike riders \u2014 including teens on Class 3 models \u2014 alongside cars and rideshare pickups, and riders are often misinformed about coverage after a crash. ${CLASSIFICATION} ${RIGHTS} ${CLASS3} ${PRODUCT} ${ROADWAY} ${DEADLINE} Civil cases are filed in Orange County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The e-bike\u2019s class (1, 2, or 3) and top assisted speed',
        'The at-fault driver and their insurer',
        'Your own auto UM/UIM coverage',
        'The bike and battery (preserve them)',
        'Any pothole, pavement edge, or bike-lane defect',
        'Whether the rider was 16+ and helmeted (Class 3)',
        'Witness contact information and any video',
        'Medical treatment from the crash onward',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the e-bike, identifies the driver\u2019s policy and your UM/UIM coverage, preserves the battery for a possible product claim, and flags the six-month public-entity deadline for any roadway defect. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My teen was hit on a Class 3 e-bike. Does the age rule matter?',
        a: 'It can. A Class 3 rider must be at least 16 and wear a helmet (Vehicle Code 21213). A violation can factor into comparative fault, but it does not automatically bar the injured rider\u2019s claim.',
      },
      {
        q: 'Do I need motorcycle insurance for an e-bike?',
        a: 'Generally no. E-bikes are treated as bicycles (Vehicle Code 312.5). A rider hurt by a car usually looks to the driver\u2019s auto policy and to their own uninsured/underinsured coverage.',
      },
      {
        q: 'A rideshare stopped suddenly and I hit the door. Whose fault is that?',
        a: 'It can be shared. Dooring and unsafe stops can be negligence, and an e-bike rider has the same rights as a driver (Vehicle Code 21200) plus the three-foot passing protection (Vehicle Code 21760).',
      },
      {
        q: 'My battery caught fire. Is that a separate claim?',
        a: 'Yes. A defective battery, motor, or brake can support a strict product-liability claim against the manufacturer or seller, independent of any driver. Preserve the bike and battery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the bike and identifies coverage so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const ebikeCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_EBIKE_SLUG]: {
    scenario: `A Los Angeles commuter on a Class 2 e-bike was hit by a car turning across the bike lane. Because the e-bike is treated as a bicycle, the claim looked to the driver\u2019s auto policy and the rider\u2019s UM/UIM coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and coverage.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Classification shapes which rules apply.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Product', 'A defect adds a manufacturer.'],
      ['Roadway', 'A defect adds a public entity (6 mo.).'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and speed',
      'Whether a product defect contributed',
      'Whether a roadway defect contributed',
      'The rider\u2019s share of fault',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'UM/UIM', copy: 'Your own coverage fills gaps.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Deadline', copy: 'A public-entity claim is only six months.' },
    ],
    insuranceProblems: [
      'The rider is told to use motorcycle coverage.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'A roadway-defect deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is your e-bike?' },
      { label: 'Step 2', question: 'Who hit you and were they insured?' },
      { label: 'Step 3', question: 'Do you have auto UM/UIM coverage?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
  [SD_EBIKE_SLUG]: {
    scenario: `A San Diego teen on a Class 3 e-bike was struck near a coastal bike path. The age and helmet rules affected comparative fault but did not bar the claim against the driver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and rider age/helmet.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Class 3 carries age and helmet rules.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Fault', 'A rule violation is comparative, not a bar.'],
      ['Product', 'A defect adds a manufacturer.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and rider age/helmet',
      'Whether a product defect contributed',
      'The rider\u2019s share of fault',
      'Whether a roadway defect contributed',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Class 3', copy: 'Age and helmet affect comparative fault.' },
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'Fault', copy: 'Pure comparative negligence still allows recovery.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
    ],
    insuranceProblems: [
      'A helmet or age issue is treated as a total bar.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'The rider is told to use motorcycle coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is the e-bike?' },
      { label: 'Step 2', question: 'How old is the rider and was a helmet worn?' },
      { label: 'Step 3', question: 'Who hit the rider and were they insured?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
  [SF_EBIKE_SLUG]: {
    scenario: `A San Francisco delivery rider on an e-bike was doored in a bike lane. The claim combined the driver\u2019s liability with a work-related coverage question. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver; note you were working.'],
      ['First weeks', 'Analyze the work-related coverage layer.'],
      ['Longer term', 'Develop driver, work, and product claims.'],
    ],
    severityLadder: [
      ['Class', 'Classification shapes which rules apply.'],
      ['Driver', 'Dooring is often driver negligence.'],
      ['Work', 'A delivery layer may add coverage.'],
      ['Product', 'A defect adds a manufacturer.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver doored or turned across',
      'Whether a work-related layer applies',
      'Which driver policy and UM/UIM apply',
      'Whether a product defect contributed',
      'The rider\u2019s share of fault',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Driver', copy: 'Dooring is often negligence.' },
      { label: 'Work', copy: 'A delivery layer may add coverage.' },
      { label: 'UM/UIM', copy: 'Your own coverage fills gaps.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
    ],
    insuranceProblems: [
      'The work-related layer is never analyzed.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'The rider is told to use motorcycle coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you working when hit?' },
      { label: 'Step 2', question: 'How did the crash happen?' },
      { label: 'Step 3', question: 'Who hit you and were they insured?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
  [SJ_EBIKE_SLUG]: {
    scenario: `A San Jose commuter crashed when an e-bike brake failed near an arterial bike lane. A product claim against the manufacturer ran alongside any roadway analysis. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; preserve the bike immediately.'],
      ['First days', 'Document the failure; note any roadway defect.'],
      ['First weeks', 'Identify the manufacturer and seller.'],
      ['Longer term', 'Develop product and roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Classification shapes which rules apply.'],
      ['Product', 'A brake or battery failure is a product claim.'],
      ['Roadway', 'A defect adds a public entity (6 mo.).'],
      ['Driver', 'Any driver policy also responds.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a product defect caused the crash',
      'Whether the bike was preserved',
      'Whether a roadway defect contributed',
      'Which driver policy and UM/UIM apply',
      'The rider\u2019s share of fault',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Product', copy: 'A failure adds a manufacturer.' },
      { label: 'Evidence', copy: 'The preserved bike drives the case.' },
      { label: 'Roadway', copy: 'A defect adds a public entity (6 mo.).' },
      { label: 'Deadline', copy: 'The public-entity claim is short.' },
    ],
    insuranceProblems: [
      'The bike is discarded and the defect is lost.',
      'A roadway-defect deadline is missed.',
      'UM/UIM coverage is never checked.',
      'The rider is told to use motorcycle coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the bike malfunction?' },
      { label: 'Step 2', question: 'Have you preserved the bike?' },
      { label: 'Step 3', question: 'Was a roadway defect involved?' },
      { label: 'Step 4', question: 'What class is your e-bike?' },
    ],
  },
  [SAC_EBIKE_SLUG]: {
    scenario: `A Sacramento commuter on a Class 2 e-bike was hit by a car near the American River trail crossing. Because the e-bike is treated as a bicycle, the claim looked to the driver\u2019s auto policy and the rider\u2019s UM/UIM coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and coverage.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Classification shapes which rules apply.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Product', 'A defect adds a manufacturer.'],
      ['Roadway', 'A defect adds a public entity (6 mo.).'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and speed',
      'Whether a product defect contributed',
      'Whether a roadway defect contributed',
      'The rider\u2019s share of fault',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'UM/UIM', copy: 'Your own coverage fills gaps.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Deadline', copy: 'A public-entity claim is only six months.' },
    ],
    insuranceProblems: [
      'The rider is told to use motorcycle coverage.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'A roadway-defect deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is your e-bike?' },
      { label: 'Step 2', question: 'Who hit you and were they insured?' },
      { label: 'Step 3', question: 'Do you have auto UM/UIM coverage?' },
      { label: 'Step 4', question: 'Did a roadway defect contribute?' },
    ],
  },
  [FRESNO_EBIKE_SLUG]: {
    scenario: `A Fresno teen on a Class 3 e-bike was struck turning onto a wide arterial. The age and helmet rules affected comparative fault but did not bar the claim against the driver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and rider age/helmet.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Class 3 carries age and helmet rules.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Fault', 'A rule violation is comparative, not a bar.'],
      ['Product', 'A defect adds a manufacturer.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and rider age/helmet',
      'Whether a product defect contributed',
      'The rider\u2019s share of fault',
      'Whether a roadway defect contributed',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Class 3', copy: 'Age and helmet affect comparative fault.' },
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'Fault', copy: 'Pure comparative negligence still allows recovery.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
    ],
    insuranceProblems: [
      'A helmet or age issue is treated as a total bar.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'The rider is told to use motorcycle coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is the e-bike?' },
      { label: 'Step 2', question: 'How old is the rider and was a helmet worn?' },
      { label: 'Step 3', question: 'Who hit the rider and were they insured?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
  [LB_EBIKE_SLUG]: {
    scenario: `A Long Beach rider on a Class 2 e-bike was hit where the beach bike path meets a street crossing. Because the e-bike is treated as a bicycle, the claim looked to the driver\u2019s auto policy and the rider\u2019s UM/UIM coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and coverage.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Classification shapes which rules apply.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Product', 'A defect adds a manufacturer.'],
      ['Roadway', 'A defect adds a public entity (6 mo.).'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and speed',
      'Whether a product defect contributed',
      'Whether a roadway defect contributed',
      'The rider\u2019s share of fault',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'UM/UIM', copy: 'Your own coverage fills gaps.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Deadline', copy: 'A public-entity claim is only six months.' },
    ],
    insuranceProblems: [
      'The rider is told to use motorcycle coverage.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'A roadway-defect deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is your e-bike?' },
      { label: 'Step 2', question: 'Who hit you and were they insured?' },
      { label: 'Step 3', question: 'Do you have auto UM/UIM coverage?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
  [OAK_EBIKE_SLUG]: {
    scenario: `An Oakland delivery rider on an e-bike was doored in a bike lane near Lake Merritt. The claim combined the driver\u2019s liability with a work-related coverage question. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver; note you were working.'],
      ['First weeks', 'Analyze the work-related coverage layer.'],
      ['Longer term', 'Develop driver, work, and product claims.'],
    ],
    severityLadder: [
      ['Class', 'Classification shapes which rules apply.'],
      ['Driver', 'Dooring is often driver negligence.'],
      ['Work', 'A delivery layer may add coverage.'],
      ['Product', 'A defect adds a manufacturer.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver doored or turned across',
      'Whether a work-related layer applies',
      'Which driver policy and UM/UIM apply',
      'Whether a product defect contributed',
      'The rider\u2019s share of fault',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Driver', copy: 'Dooring is often negligence.' },
      { label: 'Work', copy: 'A delivery layer may add coverage.' },
      { label: 'UM/UIM', copy: 'Your own coverage fills gaps.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
    ],
    insuranceProblems: [
      'The work-related layer is never analyzed.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'The rider is told to use motorcycle coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you working when hit?' },
      { label: 'Step 2', question: 'How did the crash happen?' },
      { label: 'Step 3', question: 'Who hit you and were they insured?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
  [RIV_EBIKE_SLUG]: {
    scenario: `A Riverside student on a Class 2 e-bike was hit by a car turning across a wide arterial near campus. Because the e-bike is treated as a bicycle, the claim looked to the driver\u2019s auto policy and the rider\u2019s UM/UIM coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and coverage.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Classification shapes which rules apply.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Product', 'A defect adds a manufacturer.'],
      ['Roadway', 'A defect adds a public entity (6 mo.).'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and speed',
      'Whether a product defect contributed',
      'Whether a roadway defect contributed',
      'The rider\u2019s share of fault',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'UM/UIM', copy: 'Your own coverage fills gaps.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Deadline', copy: 'A public-entity claim is only six months.' },
    ],
    insuranceProblems: [
      'The rider is told to use motorcycle coverage.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'A roadway-defect deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is your e-bike?' },
      { label: 'Step 2', question: 'Who hit you and were they insured?' },
      { label: 'Step 3', question: 'Do you have auto UM/UIM coverage?' },
      { label: 'Step 4', question: 'Did a roadway defect contribute?' },
    ],
  },
  [SB_EBIKE_SLUG]: {
    scenario: `A San Bernardino teen on a Class 3 e-bike was struck on a wide boulevard. The age and helmet rules affected comparative fault but did not bar the claim against the driver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and rider age/helmet.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Class 3 carries age and helmet rules.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Fault', 'A rule violation is comparative, not a bar.'],
      ['Product', 'A defect adds a manufacturer.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and rider age/helmet',
      'Whether a product defect contributed',
      'The rider\u2019s share of fault',
      'Whether a roadway defect contributed',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Class 3', copy: 'Age and helmet affect comparative fault.' },
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'Fault', copy: 'Pure comparative negligence still allows recovery.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
    ],
    insuranceProblems: [
      'A helmet or age issue is treated as a total bar.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'The rider is told to use motorcycle coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is the e-bike?' },
      { label: 'Step 2', question: 'How old is the rider and was a helmet worn?' },
      { label: 'Step 3', question: 'Who hit the rider and were they insured?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
  [BAK_EBIKE_SLUG]: {
    scenario: `A Bakersfield commuter on a Class 2 e-bike was hit by a car on a high-speed arterial. Because the e-bike is treated as a bicycle, the claim looked to the driver\u2019s auto policy and the rider\u2019s UM/UIM coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and coverage.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Classification shapes which rules apply.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Product', 'A defect adds a manufacturer.'],
      ['Roadway', 'A defect adds a public entity (6 mo.).'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and speed',
      'Whether a product defect contributed',
      'Whether a roadway defect contributed',
      'The rider\u2019s share of fault',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'UM/UIM', copy: 'Your own coverage fills gaps.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
      { label: 'Deadline', copy: 'A public-entity claim is only six months.' },
    ],
    insuranceProblems: [
      'The rider is told to use motorcycle coverage.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'A roadway-defect deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is your e-bike?' },
      { label: 'Step 2', question: 'Who hit you and were they insured?' },
      { label: 'Step 3', question: 'Do you have auto UM/UIM coverage?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
  [ANA_EBIKE_SLUG]: {
    scenario: `An Anaheim teen on a Class 3 e-bike was struck near a resort corridor where a rideshare stopped abruptly. The age and helmet rules affected comparative fault but did not bar the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the bike and scene.'],
      ['First days', 'Identify the driver and insurer; preserve the bike.'],
      ['First weeks', 'Confirm the e-bike class and rider age/helmet.'],
      ['Longer term', 'Develop driver, product, or roadway claims.'],
    ],
    severityLadder: [
      ['Class', 'Class 3 carries age and helmet rules.'],
      ['Driver', 'The auto policy usually responds.'],
      ['Fault', 'A rule violation is comparative, not a bar.'],
      ['Product', 'A defect adds a manufacturer.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Which driver policy and UM/UIM apply',
      'The e-bike\u2019s class and rider age/helmet',
      'Whether a rideshare or product layer applies',
      'The rider\u2019s share of fault',
      'Whether a roadway defect contributed',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Class 3', copy: 'Age and helmet affect comparative fault.' },
      { label: 'Driver', copy: 'The auto policy usually responds.' },
      { label: 'Fault', copy: 'Pure comparative negligence still allows recovery.' },
      { label: 'Product', copy: 'A defect adds a manufacturer.' },
    ],
    insuranceProblems: [
      'A helmet or age issue is treated as a total bar.',
      'The bike and battery are discarded.',
      'UM/UIM coverage is never checked.',
      'The rider is told to use motorcycle coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What class is the e-bike?' },
      { label: 'Step 2', question: 'How old is the rider and was a helmet worn?' },
      { label: 'Step 3', question: 'Who hit the rider and were they insured?' },
      { label: 'Step 4', question: 'Did the bike malfunction?' },
    ],
  },
}
