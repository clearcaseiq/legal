import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The geo layer: practice-area × city.
 *
 * Car-accident city pages already exist (authored ones in seoCityGuides.ts and
 * seeded metros in seoRequestedPages.ts). This file opens the non-car-accident
 * geo layer with pedestrian and bicycle guides for the top metros, which is
 * where the local angle is genuinely different rather than interpolated:
 *
 *  - Los Angeles: a nation-leading pedestrian death toll, a Vision Zero High
 *    Injury Network, and a hit-and-run rate high enough that uninsured-motorist
 *    coverage is a first-order question when a driver flees.
 *  - San Francisco: a consolidated City and County (so the six-month Government
 *    Claims Act clock is in play constantly), Muni everywhere, and a distinctive
 *    cyclist hazard — bike tires caught in embedded rail tracks.
 *  - San Diego: a large military presence, so a collision with a federal or
 *    military vehicle runs under the Federal Tort Claims Act (an administrative
 *    claim on Standard Form 95, not the state Claims Act), plus a border region
 *    and MTS trolley crossings.
 *
 * California law woven through: pedestrian right of way and crosswalks including
 * unmarked ones at intersections (Veh. Code §§ 21950, 275); the 2023 Freedom to
 * Walk Act (AB 2147) that decriminalized safe crossing outside a crosswalk and
 * bears on comparative-fault arguments; cyclists' rights and duties (Veh. Code
 * § 21200), the three-foot passing law (§ 21760) and the dooring prohibition
 * (§ 22517); pure comparative negligence; and the Government Claims Act
 * six-month presentation deadline for public entities.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a shortened public-entity or federal deadline applies, and how comparative fault is assessed, depends on facts a licensed California attorney should review promptly.'

/** Stated once so each page can apply it to its own local agencies. */
const CLAIMS_ACT =
  'Under the Government Claims Act a written claim must be presented to the public entity within six months of the collision, not the two years that applies to a private driver. The entity then has 45 days to respond; if it rejects the claim in writing you generally have six months from that notice to sue, and if it never answers, generally two years from the collision. Missing the six-month step usually bars the claim, though a late-claim application may be possible within a year.'

export const LA_PEDESTRIAN_SLUG = '/los-angeles-pedestrian-accident'
export const SF_PEDESTRIAN_SLUG = '/san-francisco-pedestrian-accident'
export const SD_PEDESTRIAN_SLUG = '/san-diego-pedestrian-accident'
export const SF_BICYCLE_SLUG = '/san-francisco-bicycle-accident'
export const LA_BICYCLE_SLUG = '/los-angeles-bicycle-accident'
export const SD_BICYCLE_SLUG = '/san-diego-bicycle-accident'

export const localPracticeGuidePages: LandingPage[] = [
  {
    slug: LA_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Pedestrian Accident Claims',
    title: 'Los Angeles Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Los Angeles has one of the nation\u2019s worst pedestrian death tolls, concentrated on a handful of wide arterials, and a hit-and-run rate high enough that whether the driver stopped often decides which insurance pays.',
    psychology: 'I was hit by a car while walking in LA and I do not know what makes a claim here different.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles pedestrian accident claim',
      'hit by a car while walking los angeles',
      'hit and run pedestrian los angeles what to do',
      'pedestrian right of way california crosswalk',
      'la metro bus hit a pedestrian claim',
    ],
    signals: [
      'Hit-and-run driver',
      'Uninsured motorist coverage',
      'High Injury Network arterial',
      'Unmarked crosswalk at an intersection',
      'LA Metro or city vehicle',
      'Comparative-fault blame',
    ],
    sections: {
      whyItMatters: `Los Angeles pedestrian claims are shaped by three local realities that rarely apply the same way elsewhere. The first is where these collisions happen. LA\u2019s traffic deaths are heavily concentrated on a small set of wide, fast arterials — the streets the city\u2019s Vision Zero program calls its High Injury Network, corridors like Vermont, Figueroa, Western and Sepulveda — where multiple lanes, long distances between signals and high speeds make a pedestrian struck there far more likely to be seriously hurt. That concentration matters because liability on those roads turns on physical facts: signal phase, crossing distance, lighting and the driver\u2019s sight lines, rather than on either party\u2019s account. The second reality is hit-and-run. Los Angeles has a hit-and-run problem well above the national norm, and a large share of pedestrian collisions here involve a driver who flees. When that happens, the practical question is no longer the driver\u2019s liability but your own coverage: an uninsured-motorist claim on your own auto policy, or a resident relative\u2019s, generally becomes the primary route to recovery, and it carries its own notice requirements and deadlines that are easy to miss while police work the hit-and-run. Preserving any detail about the vehicle, and reporting promptly, is time-sensitive for that reason. The third reality is who you may actually be claiming against. LA Metro buses and rail, the City of Los Angeles and LADOT are public entities, so a collision involving one of their vehicles, or caused by a dangerous condition of a city street, is governed by the Government Claims Act. ${CLAIMS_ACT} Two points of California law cut through the blame pedestrians routinely face. A crosswalk exists at most intersections even when it is unmarked (Vehicle Code section 275), and drivers must yield to pedestrians within one (section 21950), so being in an unmarked crossing is not the fault an insurer will suggest it is. And since 2023 the Freedom to Walk Act has meant that crossing outside a crosswalk, when done safely, is no longer an infraction, which undercuts the standard \u201cjaywalking\u201d argument. California\u2019s pure comparative negligence still applies, so any fault assigned to the pedestrian reduces rather than bars recovery. Civil cases are filed in Los Angeles County Superior Court, with personal-injury matters historically centralized at the Spring Street Courthouse, though assignments change and are worth confirming.`,
      whatToTrack: [
        'Whether the driver stopped or fled, since a hit-and-run shifts the claim to your own UM coverage',
        'Any detail about the vehicle: plate, make, color, direction of travel',
        'Your own and any resident relative\u2019s uninsured-motorist coverage',
        'The exact intersection or block, and whether it is on a major arterial',
        'Signal phase, lighting, and whether the crosswalk was marked or unmarked',
        'Whether an LA Metro, city, or LADOT vehicle was involved, which starts a six-month clock',
        'Which agency responded: LAPD on city streets, CHP on freeways',
        'Medical treatment from the first responders and hospital onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the two things that most often decide an LA pedestrian claim: whether a hit-and-run has quietly made your own uninsured-motorist coverage the main route to recovery, and whether a public entity in the mix has cut your deadline to six months. It records the vehicle detail and scene conditions while they are still available, and treats an unmarked crosswalk as the lawful crossing it is. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me ran. What can I do?',
        a: 'Report it immediately and preserve any detail about the vehicle, then look to your own uninsured-motorist coverage. In Los Angeles, where hit-and-run is common, a UM claim on your own auto policy or a resident relative\u2019s is often the primary route to recovery when the driver is never found. UM coverage has its own notice deadlines, so it should be identified early rather than after the police investigation stalls.',
      },
      {
        q: 'I was crossing where there was no painted crosswalk. Am I at fault?',
        a: 'Not necessarily. Under California law a crosswalk exists at most intersections even when unmarked, and drivers must yield to pedestrians in it. Even mid-block, the 2023 Freedom to Walk Act means crossing outside a crosswalk is not an infraction when done safely. Insurers still argue pedestrian fault, but California\u2019s pure comparative negligence reduces recovery by your share rather than barring it.',
      },
      {
        q: 'An LA Metro bus or a city vehicle hit me. Is the deadline different?',
        a: 'Yes. LA Metro and the City of Los Angeles are public entities, so the Government Claims Act applies: a written claim must be presented within six months rather than the usual two years. The agency then has 45 days to respond. Nothing about the collision signals the shorter clock, which is why it is one of the most commonly missed deadlines.',
      },
      {
        q: 'Why do these cases turn on the intersection rather than what I say?',
        a: 'Because on LA\u2019s wide arterials liability usually rests on physical facts — signal phase, crossing distance, lighting and the driver\u2019s sight lines — that can be documented, rather than on competing accounts. A driver who says they \u201cnever saw\u201d you is often describing a failure to keep a proper lookout, and the scene conditions are what establish that.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, coverage questions and deadlines of a claim so you understand what you have and a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Pedestrian Accident Claims',
    title: 'San Francisco Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Francisco is a consolidated city and county where Muni is everywhere, so a pedestrian claim runs into the six-month government deadline far more often than in most of California — and the left-turning driver is the classic cause.',
    psychology: 'I was hit while walking in San Francisco and a Muni vehicle or a turning driver was involved.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco pedestrian accident claim',
      'hit by a muni bus san francisco claim',
      'pedestrian hit by turning car san francisco',
      'claim against city and county of san francisco',
      'vision zero san francisco pedestrian',
    ],
    signals: [
      'Muni / SFMTA vehicle',
      'City and County entity',
      'Left-turn at a signal',
      'High Injury Network street',
      'Six-month agency deadline',
      'High medical costs',
    ],
    sections: {
      whyItMatters: `San Francisco pedestrian claims are unusual in how often a public entity is involved, and that single feature reshapes the deadline for a large share of them. San Francisco is a consolidated City and County, and the San Francisco Municipal Transportation Agency (Muni) operates buses, light rail, streetcars and cable cars across a dense, heavily walked city. A collision involving a Muni vehicle, a City vehicle, or a dangerous condition of a City street is governed by the Government Claims Act, so the presentation deadline is six months rather than two years. Because so much of the transportation network here is public, that shortened clock is in play far more often than in a city built around private cars and freeways. ${CLAIMS_ACT} The second local feature is the collision pattern. San Francisco\u2019s pedestrian injuries cluster on its Vision Zero High Injury Network — Market Street, the Tenderloin, Sixth Street and the South of Market corridors — and the single most common serious pattern is a driver turning left across a crosswalk at a signalized intersection while a pedestrian crosses with the walk signal. Liability in those collisions turns on signal timing and right of way, which are documentable facts rather than matters of recollection, and a pedestrian crossing lawfully with the signal usually has the right of way over a turning driver. Two points of California law matter here as everywhere: a crosswalk exists at intersections even when unmarked (Vehicle Code section 275), and drivers must yield to pedestrians in it (section 21950), while the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing. Pure comparative negligence means any pedestrian fault reduces rather than defeats a claim. A practical San Francisco wrinkle is cost: medical care here is among the most expensive in the country, which raises both the damages and any health-plan reimbursement lien that will come out of a recovery, so the net figure deserves attention from the start. Civil cases are filed in San Francisco County Superior Court at the Civic Center Courthouse on McAllister Street.`,
      whatToTrack: [
        'Whether a Muni, SFMTA, or other City vehicle was involved, and the exact date',
        'Whether the driver was turning, and the signal phase for both of you',
        'The exact intersection, and whether it is on the High Injury Network',
        'Whether the crosswalk was marked or unmarked',
        'Lighting and sight lines at the crossing',
        'Which agency responded: SFPD on city streets, CHP on freeways and bridges',
        'Every provider and the running total of care, given high local costs',
        'Any health-plan payments, which will bear on a reimbursement lien',
      ],
      howClearCaseHelps: `ClearCaseIQ checks first for the thing that most often costs San Francisco pedestrians their claim: a public entity, which cuts the deadline to six months, a live question here far more often than elsewhere because Muni and the City are so present. It documents the signal timing that decides left-turn collisions and tracks the high local medical costs against the lien that will reduce a recovery. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A Muni bus or train hit me. How long do I have to claim?',
        a: 'Six months from the collision to present a written claim, because Muni (SFMTA) is part of the City and County of San Francisco and the Government Claims Act applies. The agency then has 45 days to respond, and your deadline to sue depends on whether it rejects the claim in writing. This is far shorter than the two years for a private driver and is missed constantly.',
      },
      {
        q: 'A car turned left and hit me while I was crossing. Who is at fault?',
        a: 'Usually the turning driver, if you were crossing lawfully with the signal. A driver turning left across a crosswalk must yield to a pedestrian with the right of way, and this left-turn pattern is the most common serious pedestrian collision in San Francisco. Liability turns on the signal phase, which is a documentable fact rather than a matter of competing accounts.',
      },
      {
        q: 'Does San Francisco being a city and county change anything?',
        a: 'It broadens how often the six-month government deadline applies. Because the City and County of San Francisco is a single consolidated entity operating Muni and controlling the streets, a large share of pedestrian collisions here involve a public entity or a public roadway condition, each of which triggers the shortened Government Claims Act deadline.',
      },
      {
        q: 'Why do high medical costs matter to my claim?',
        a: 'They cut both ways. Higher treatment costs increase the medical damages, but they also increase any reimbursement claim your health plan will assert against a settlement. In an expensive market like San Francisco, quantifying that lien early is what keeps the settlement figure and the amount you actually keep from diverging sharply at the end.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, coverage questions and deadlines of a claim — particularly whether the shortened government deadline applies — so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'San Diego Pedestrian Accident Claims',
    title: 'San Diego Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego\u2019s large military presence means a pedestrian struck by a federal or military vehicle claims under the Federal Tort Claims Act, not the state process — and the border and tourist traffic make your own coverage matter more.',
    psychology: 'I was hit while walking in San Diego and a military vehicle, a visitor, or the trolley was involved.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego pedestrian accident claim',
      'hit by a military vehicle san diego claim',
      'federal tort claims act california pedestrian',
      'hit by out of state driver san diego',
      'mts trolley pedestrian accident san diego',
    ],
    signals: [
      'Federal or military vehicle',
      'Federal Tort Claims Act',
      'Out-of-state or cross-border driver',
      'Uninsured motorist coverage',
      'MTS trolley crossing',
      'Six-month agency deadline',
    ],
    sections: {
      whyItMatters: `San Diego pedestrian claims carry a set of local complications that come from the region\u2019s military presence, its border, and its transit system. The most consequential and least understood is the military one. San Diego is home to major installations — Naval Base San Diego, Coronado, Camp Pendleton to the north, MCAS Miramar — and government vehicles are common on and around them. If you are struck by a federal or military vehicle operated within the scope of a federal employee\u2019s duties, your claim does not run under California\u2019s rules at all; it runs under the Federal Tort Claims Act, which requires an administrative claim presented to the responsible federal agency on a Standard Form 95, generally within two years, before any lawsuit is possible. That is a different process, a different form, and a different timeline from the state Government Claims Act, and pursuing it incorrectly can forfeit the claim. The second complication is who is driving. San Diego draws heavy tourist traffic and sits directly on the international border, so the at-fault driver is frequently from out of state or from Mexico. Out-of-state policies often carry lower limits than California requires, and foreign policies may not respond in a way a California claimant can readily reach, which makes your own uninsured and underinsured motorist coverage a first-order question rather than an afterthought. The third is transit. The MTS trolley runs at street level through downtown and beyond, and MTS, the City of San Diego and the County are public entities, so a collision involving one of their vehicles, or a dangerous condition of a public street or crossing, carries the six-month Government Claims Act deadline. ${CLAIMS_ACT} California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing, so the fault an insurer assigns a pedestrian is often overstated. Pure comparative negligence means any genuine share of fault reduces rather than bars recovery. Civil cases are filed in San Diego County Superior Court, with civil matters heard at the central courthouse downtown.`,
      whatToTrack: [
        'Whether the vehicle was federal or military, which triggers the Federal Tort Claims Act',
        'Any markings, unit, or agency identifying a government vehicle',
        'Whether the driver was from out of state or from Mexico',
        'Your own and any resident relative\u2019s uninsured/underinsured coverage',
        'Whether an MTS trolley, bus, or city vehicle was involved, and the date',
        'The exact location, and whether it was a trolley or street crossing',
        'Whether the crosswalk was marked or unmarked, and the signal phase',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the two San Diego-specific forks that most often derail a pedestrian claim: a federal or military vehicle, which moves the case onto the Federal Tort Claims Act and its Standard Form 95 process, and an out-of-state or cross-border driver, which makes your own uninsured-motorist coverage central. It also flags the six-month clock when MTS or the City is involved. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A military or government vehicle hit me. Is the claim different?',
        a: 'Yes, substantially. If a federal or military vehicle operated within the scope of federal duties hits you, the claim runs under the Federal Tort Claims Act, which requires an administrative claim on a Standard Form 95 to the responsible federal agency, generally within two years, before you can sue. It is a different process and timeline from California\u2019s, and getting it wrong can forfeit the claim, so it needs to be identified early.',
      },
      {
        q: 'The driver was visiting or came across the border. Whose insurance applies?',
        a: 'It depends. An out-of-state policy usually follows the driver but may carry lower limits than California requires, and a foreign policy may be difficult to reach. That is why your own uninsured and underinsured motorist coverage matters so much in San Diego — it is designed for exactly the gap left when the at-fault driver\u2019s coverage is thin or unreachable.',
      },
      {
        q: 'An MTS trolley was involved. What deadline applies?',
        a: 'Six months to present a written claim, because MTS is a public entity under the Government Claims Act. The trolley runs at street level through much of San Diego, so pedestrian and crossing collisions with it are handled on the shortened government timeline rather than the ordinary two years, and the agency then has 45 days to respond.',
      },
      {
        q: 'I crossed away from a marked crosswalk. Does that end my claim?',
        a: 'No. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction under the Freedom to Walk Act. Insurers still argue pedestrian fault, but under pure comparative negligence any genuine share only reduces recovery rather than barring it.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not give legal advice or act for you. It organises the facts, coverage questions and deadlines — including whether a federal or government process applies — so you understand the claim and a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Bicycle Accident Claims',
    title: 'San Francisco Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Francisco has a cycling hazard most cities do not: bike tires caught in embedded Muni rail tracks. That, plus dooring on dense streets and a city-and-county six-month deadline, sets these claims apart.',
    psychology: 'I crashed my bike in San Francisco, maybe in the Muni tracks or on a door, and I do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco bicycle accident claim',
      'bike tire stuck in muni tracks crash',
      'doored while cycling san francisco',
      'cyclist hit by car san francisco claim',
      'three foot passing law california bicycle',
    ],
    signals: [
      'Muni track wheel-trap fall',
      'Dangerous condition / SFMTA',
      'Dooring on a dense street',
      'Three-foot passing violation',
      'City and county six-month deadline',
      'Protected bike lane',
    ],
    sections: {
      whyItMatters: `San Francisco bicycle claims include a category that barely exists in most California cities: single-vehicle falls caused by the roadway itself, specifically bike tires caught in the embedded rail tracks that Muni light rail and historic streetcars run on. Along corridors like Market, Church and the routes the J and N lines follow, a wheel dropping into the flangeway of a track at the wrong angle can throw a rider with no other vehicle involved, and where the design or maintenance of that public infrastructure is at issue, the claim is a dangerous-condition claim against the transit agency rather than an insurance claim against a driver. Because SFMTA and the City and County of San Francisco are public entities, that claim runs on the Government Claims Act\u2019s six-month presentation deadline, and it demands evidence — photographs of the track, the location, the angle — that disappears quickly. ${CLAIMS_ACT} The second local pattern is dooring. San Francisco\u2019s dense street parking on heavily cycled streets like Valencia produces a steady volume of collisions where an occupant opens a car door into a rider\u2019s path, which California law squarely prohibits: Vehicle Code section 22517 forbids opening a door into traffic when it is unsafe, so fault generally rests with the person who opened it, not the cyclist. The third is the ordinary but frequent car-versus-bike collision, governed by the rules that give cyclists the rights and duties of drivers (Vehicle Code section 21200) and require motorists to pass with at least three feet of clearance (section 21760). Liability in those cases turns on lane position, the passing distance and right of way. Two practical notes shape San Francisco cycling claims. Helmets are not required for adult cyclists in California, so their absence is not fault, though an insurer may raise it as to head injuries. And the city\u2019s high medical costs raise both the damages and any health-plan lien on a recovery. Civil cases are filed in San Francisco County Superior Court at the Civic Center Courthouse.`,
      whatToTrack: [
        'Whether the fall involved Muni or streetcar tracks, and exactly where',
        'Photographs of the track, flangeway, and your line of travel, taken promptly',
        'Whether a car door was opened into your path, and by whom',
        'For a car collision, the passing distance and your lane position',
        'Whether SFMTA or a City vehicle or roadway condition was involved, and the date',
        'Which agency responded: SFPD on city streets, CHP on freeways and bridges',
        'Every provider and the running cost of care, given high local prices',
        'Any health-plan payments, which will bear on a reimbursement lien',
      ],
      howClearCaseHelps: `ClearCaseIQ recognises the San Francisco track-fall claim for what it is — a dangerous-condition claim against a public entity on a six-month clock, needing photographs that vanish fast — rather than a no-fault accident. It applies the dooring and three-foot passing rules to car collisions, keeps the missing-helmet argument confined to head injuries, and tracks high local costs against the lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My bike tire caught in the Muni tracks and I fell. Do I have a claim?',
        a: 'Possibly, as a dangerous-condition claim against the transit agency where the design or maintenance of the embedded track is at issue. Because SFMTA and the City and County are public entities, it runs on the six-month Government Claims Act deadline and needs prompt photographs of the track, location and angle, which is evidence that disappears quickly. It is a genuinely San Francisco-specific kind of bicycle claim.',
      },
      {
        q: 'Someone opened a car door into me. Whose fault is that?',
        a: 'Generally the person who opened the door. California Vehicle Code section 22517 prohibits opening a car door into traffic when it is unsafe, so dooring liability usually rests with the occupant, not the cyclist. It is a common collision on San Francisco\u2019s densely parked cycling streets, and the position of the door and your line of travel are the facts that establish it.',
      },
      {
        q: 'A car passed too close and hit me. What does the law require?',
        a: 'California\u2019s three-foot passing law (Vehicle Code section 21760) requires drivers to leave at least three feet when passing a cyclist. Cyclists also have the rights and duties of drivers (section 21200), so liability turns on lane position, the passing distance and right of way rather than on any assumption that a cyclist should not have been there.',
      },
      {
        q: 'I was not wearing a helmet. Does that hurt my claim?',
        a: 'California does not require adult cyclists to wear helmets, so not wearing one is not a violation and is not fault for the collision. An insurer may raise it in relation to a head injury specifically, but it does not defeat a claim, and under pure comparative negligence it could at most affect head-injury damages.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the roadway or coverage questions and the deadlines — including the six-month clock for a track or roadway claim — so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LA_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Bicycle Accident Claims',
    title: 'Los Angeles Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'In Los Angeles a cyclist faces wide, fast arterials, a door zone on parked streets, and a hit-and-run rate high enough that whether the driver stopped often decides which insurance pays.',
    psychology: 'I was hit on my bike in LA, maybe by a driver who left, and I do not know what makes a claim here different.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles bicycle accident claim',
      'cyclist hit by car los angeles',
      'hit and run cyclist los angeles what to do',
      'doored while cycling los angeles',
      'three foot passing law california bike',
    ],
    signals: [
      'Hit-and-run driver',
      'Uninsured motorist coverage',
      'Door-zone collision',
      'Three-foot passing violation',
      'High Injury Network arterial',
      'LA Metro or city vehicle',
    ],
    sections: {
      whyItMatters: `Los Angeles bicycle claims are shaped by the same forces that make the city dangerous for pedestrians, applied to riders. The first is the road network. LA\u2019s cycling injuries concentrate on its wide, high-speed arterials — the Vision Zero High Injury Network — where fast-moving traffic mixes with cyclists in painted lanes, sharrows or no dedicated space at all, and where a collision tends to be severe. Liability on those roads turns on lane position, the driver\u2019s passing distance and right of way rather than on either account, and California\u2019s three-foot passing law (Vehicle Code section 21760) and the rule giving cyclists the rights and duties of drivers (section 21200) are the framework for it. The second force is hit-and-run. Los Angeles has a hit-and-run rate well above the norm, and cyclists are frequent victims; when the driver flees, the claim shifts from the driver\u2019s liability to your own coverage, so an uninsured-motorist claim on your own auto policy, or a resident relative\u2019s, often becomes the primary route to recovery. That coverage carries its own notice deadlines, and preserving any detail about the vehicle and reporting promptly is time-sensitive because the driver may never be found. The third is the door zone. On streets with parallel parking and a bike lane squeezed alongside it, an occupant opening a door into a rider\u2019s path is a common and serious collision, and California Vehicle Code section 22517 prohibits opening a door into traffic when unsafe, so fault generally rests with the person who opened it. Public entities add the familiar deadline wrinkle: LA Metro, the City of Los Angeles and LADOT are public entities, so a collision with one of their vehicles, or one caused by a dangerous condition of a street, runs on the six-month Government Claims Act deadline. ${CLAIMS_ACT} Two practical points: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it as to head injuries; and pure comparative negligence means any genuine share of fault reduces rather than bars recovery. Civil cases are filed in Los Angeles County Superior Court, with personal-injury matters historically centralized at the Spring Street Courthouse, subject to change.`,
      whatToTrack: [
        'Whether the driver stopped or fled, since a hit-and-run shifts the claim to your UM coverage',
        'Any detail about the vehicle: plate, make, color, direction',
        'Your own and any resident relative\u2019s uninsured-motorist coverage',
        'Whether a car door was opened into your path, and by whom',
        'For a passing collision, the clearance the driver left and your lane position',
        'The exact street, and whether it is on a High Injury Network arterial',
        'Whether an LA Metro, city, or LADOT vehicle or roadway condition was involved',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags whether an LA cyclist\u2019s claim has quietly become an uninsured-motorist claim because the driver fled, and applies the three-foot passing and dooring rules to fix fault where it belongs. It records the vehicle detail and lane position while they are available, keeps the missing-helmet argument confined to head injuries, and catches the six-month clock when a public entity is involved. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me on my bike fled. What now?',
        a: 'Report it immediately, preserve any vehicle detail, and look to your own uninsured-motorist coverage. In Los Angeles, where hit-and-run is common and cyclists are frequent victims, a UM claim on your own auto policy or a resident relative\u2019s is often the main route to recovery when the driver is never identified. UM coverage has its own deadlines, so identify it early.',
      },
      {
        q: 'A car passed too close and clipped me. What does California require?',
        a: 'At least three feet of clearance when passing a cyclist, under Vehicle Code section 21760. Cyclists also have the rights and duties of drivers (section 21200), so liability turns on the passing distance, lane position and right of way rather than on any assumption a cyclist should not have been in the lane.',
      },
      {
        q: 'I was doored on a street with parked cars. Whose fault is that?',
        a: 'Generally the person who opened the door. Vehicle Code section 22517 prohibits opening a car door into traffic when it is unsafe, so fault in a door-zone collision usually rests with the occupant rather than the cyclist. The position of the door and your line of travel are the facts that establish it, and they are worth documenting at the scene.',
      },
      {
        q: 'An LA Metro vehicle was involved. Is the deadline shorter?',
        a: 'Yes. LA Metro and the City of Los Angeles are public entities, so a collision involving one of their vehicles, or one caused by a dangerous street condition, runs on the Government Claims Act\u2019s six-month presentation deadline rather than two years. The agency then has 45 days to respond, and the shortened clock is easy to miss.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, coverage questions and deadlines of a claim so you understand what you have and a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'San Diego Bicycle Accident Claims',
    title: 'San Diego Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego cycling injuries split between high-speed close passes on coastal and canyon roads and turning conflicts in the commuter grid \u2014 with a military-vehicle fork and MTS trolley tracks that most cities never see.',
    psychology: 'I was hit or crashed while cycling in San Diego and a close pass, a military vehicle, or the trolley tracks were involved.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego bicycle accident claim',
      'car passed too close cyclist california three feet',
      'hit by military vehicle cyclist san diego',
      'bike tire caught trolley track san diego',
      'doored while cycling san diego',
    ],
    signals: [
      'Three-foot passing violation',
      'Coastal / canyon close pass',
      'Right hook in commuter grid',
      'Federal or military vehicle (FTCA)',
      'MTS trolley track hazard',
      'Six-month agency deadline',
    ],
    sections: {
      whyItMatters: `San Diego bicycle claims fall into two very different settings. On the open coastal and canyon roads that draw a large recreational road-cycling scene \u2014 the routes through Torrey Pines, along the coast highway, up the back-country grades \u2014 the dominant hazard is the high-speed close pass, and California\u2019s three-foot passing law (Vehicle Code section 21760) requires a driver to leave at least three feet and to slow and pass only when safe if that room is not there. In the commuter grid, the recurring mechanism is instead the turning conflict, the right hook where a vehicle turns across a cyclist proceeding straight, governed by the rule that gives cyclists the rights and duties of drivers (Vehicle Code section 21200). Two San Diego-specific forks sit on top of those. The first is the military one: with Naval Base San Diego, Coronado, Camp Pendleton and MCAS Miramar nearby, government vehicles are common, and a cyclist struck by a federal or military vehicle operated within the scope of federal duties claims under the Federal Tort Claims Act \u2014 an administrative claim on a Standard Form 95, generally within two years \u2014 not the state process, and pursuing it incorrectly can forfeit the claim. The second is transit: the MTS trolley runs at street level, and its embedded rail tracks can catch a narrow tyre and throw a rider with no other vehicle involved, which, where the track design or maintenance is at issue, is a dangerous-condition claim against a public entity. Because MTS, the City and the County are public entities, that claim and any collision with their vehicles run on the six-month Government Claims Act deadline. ${CLAIMS_ACT} Dooring is prohibited (Vehicle Code section 22517), and helmets are not required for adult cyclists, so their absence is not fault though an insurer may raise it as to head injuries. Pure comparative negligence means a genuine share of fault reduces rather than bars recovery. Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The passing distance if a vehicle overtook you, especially on open coastal or canyon roads',
        'Whether the vehicle was turning \u2014 a right hook \u2014 and who was going straight',
        'Whether the vehicle was federal or military, which triggers the Federal Tort Claims Act',
        'Whether an MTS trolley track caught your tyre, and photographs of the track and location',
        'Whether a car door was opened into your path, and by whom',
        'Whether an MTS bus, trolley, or city vehicle was involved, and the date',
        'Which agency responded: CHP on some arterials and canyons, San Diego Police on streets',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the two San Diego cycling settings \u2014 the high-speed close pass on open roads and the turning conflict in the grid \u2014 and flags the two forks that most often derail a claim: a federal or military vehicle, which moves the case onto the Standard Form 95 process, and an MTS track or vehicle, which puts it on a six-month clock. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A car passed me too close on a canyon road. Is that a violation?',
        a: 'Yes. California\u2019s three-foot passing law (Vehicle Code section 21760) requires a driver to leave at least three feet when passing a cyclist, and to slow and pass only when safe if three feet is not possible \u2014 which on a narrow canyon road often means waiting. A too-close pass at speed that causes a crash is a violation, and evidence of the distance helps establish it against an insurer\u2019s attempt to blame the rider.',
      },
      {
        q: 'A military or government vehicle hit me while I was cycling. Is the claim different?',
        a: 'Yes, substantially. If a federal or military vehicle operated within the scope of federal duties hits you, the claim runs under the Federal Tort Claims Act, which requires an administrative claim on a Standard Form 95 to the responsible agency, generally within two years, before you can sue. It is a different process and timeline from California\u2019s, and getting it wrong can forfeit the claim, so it needs to be identified early.',
      },
      {
        q: 'My tyre caught an MTS trolley track and I fell. Can I claim?',
        a: 'Possibly, as a dangerous-condition claim against the transit agency where the design or maintenance of the embedded track is at issue. Because MTS and the City and County are public entities, it runs on the six-month Government Claims Act deadline and needs prompt photographs of the track, location and angle \u2014 evidence that disappears quickly.',
      },
      {
        q: 'I was not wearing a helmet. Does that hurt my claim?',
        a: 'California does not require adult cyclists to wear helmets, so not wearing one is not a violation and is not fault for the collision. An insurer may raise it in relation to a head injury specifically, but it does not defeat a claim, and under pure comparative negligence it could at most affect head-injury damages.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the passing, turning, federal-process and deadline questions so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const localPracticeGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_PEDESTRIAN_SLUG]: {
    scenario: `A woman was struck in an unmarked crosswalk on Vermont Avenue by a driver who did not stop. Police never found the car, and the case only moved once her own uninsured-motorist coverage was identified as the route to recovery — a step nobody had taken while everyone waited on the hit-and-run investigation. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Capture any vehicle detail; a fleeing driver shifts the claim to UM coverage.'],
      ['First week', 'Report obtained; own uninsured-motorist carrier put on notice.'],
      ['Six months', 'Deadline to present a written claim if LA Metro or a city vehicle was involved.'],
      ['Longer term', 'Scene conditions and treatment documented for a comparative-fault fight.'],
    ],
    severityLadder: [
      ['Straightforward', 'An identified, insured driver who stopped and clearly failed to yield.'],
      ['Hit-and-run', 'Driver fled; the claim turns on your own UM coverage.'],
      ['Agency', 'An LA Metro or city vehicle involved, six-month clock running.'],
      ['Serious', 'High-speed arterial impact with catastrophic injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Paramedic and ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings matter where the driver disputes seeing you.' },
      { label: 'Continuing care', copy: 'Consistency answers arguments that injuries came from elsewhere.' },
      { label: 'Documentation', copy: 'Bills, wage loss and future care define the economic side.' },
    ],
    settlementDrivers: [
      'Whether the driver stopped or fled',
      'Whether your own UM coverage was identified and noticed',
      'Signal phase, lighting, and crossing markings',
      'Whether a public entity is involved',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Hit-and-run shifts it', copy: 'A fleeing driver makes your own UM coverage the main route.' },
      { label: 'Unmarked is still a crosswalk', copy: 'Crossing there is lawful, not the fault an insurer suggests.' },
      { label: 'Freedom to Walk', copy: 'Safe mid-block crossing is no longer an infraction.' },
      { label: 'Agency deadline', copy: 'A Metro or city vehicle cuts presentation to six months.' },
    ],
    insuranceProblems: [
      'The pedestrian is blamed for an unmarked or mid-block crossing.',
      'UM coverage is never identified after a hit-and-run.',
      'A government claim is rejected as untimely at six months.',
      'Injuries are attributed to a pre-existing condition where early records are thin.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the driver stop, or flee the scene?' },
      { label: 'Step 2', question: 'What uninsured-motorist coverage do you or a resident relative carry?' },
      { label: 'Step 3', question: 'Was an LA Metro or city vehicle involved?' },
      { label: 'Step 4', question: 'What were the signal phase and lighting at the crossing?' },
    ],
  },
  [SF_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian crossing Market Street with the walk signal was hit by a car turning left. Because a Muni-adjacent City intersection and signal timing were central, the six-month government clock applied — and the signal-phase evidence, not either driver\u2019s account, decided fault. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the signal phase, the turn, and whether a Muni or City vehicle was involved.'],
      ['First week', 'Report obtained from SFPD; public-entity involvement assessed.'],
      ['Six months', 'Absolute deadline to present a written claim to the City or Muni.'],
      ['Longer term', 'High medical costs tracked against any health-plan lien.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Left-turn', 'A turning driver versus a pedestrian with the signal.'],
      ['Agency', 'A Muni or City vehicle involved, six-month clock running.'],
      ['Serious', 'High-cost care and a substantial reimbursement lien.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings carry weight in a left-turn dispute.' },
      { label: 'Continuing care', copy: 'Consistency supports severity in an expensive market.' },
      { label: 'Documentation', copy: 'Bills and the growing lien are tracked together.' },
    ],
    settlementDrivers: [
      'Whether a public entity was involved',
      'The signal phase for the pedestrian and the turning driver',
      'Whether the six-month claim was presented in time',
      'The crossing markings and lighting',
      'High local medical costs and the resulting lien',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Six-month rule applies often', copy: 'A city-and-county with Muni everywhere triggers it frequently.' },
      { label: 'Signal timing decides fault', copy: 'The left-turn pattern turns on documentable phase, not accounts.' },
      { label: 'Costs raise the lien', copy: 'Expensive care increases both damages and reimbursement.' },
      { label: 'Right of way', copy: 'A pedestrian crossing with the signal usually has it.' },
    ],
    insuranceProblems: [
      'A government claim is rejected as untimely at six months.',
      'The turning driver\u2019s account is accepted over the signal evidence.',
      'A health-plan lien is quantified only at settlement.',
      'The pedestrian is blamed despite crossing with the signal.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a Muni or City of San Francisco vehicle involved?' },
      { label: 'Step 2', question: 'Was the driver turning, and what was the signal phase?' },
      { label: 'Step 3', question: 'Where exactly did it happen?' },
      { label: 'Step 4', question: 'What has your health plan paid toward treatment?' },
    ],
  },
  [SD_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian near a naval base was struck by a government vehicle. He nearly filed a state government claim; the collision actually fell under the Federal Tort Claims Act, requiring a Standard Form 95 to the federal agency on a different timeline. Identifying that early was what preserved the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify whether the vehicle was federal, military, out-of-state, or transit.'],
      ['First weeks', 'Route the claim correctly: FTCA (SF-95), state Claims Act, or a private insurer.'],
      ['Deadlines', 'Six months for a state entity; generally two years for an FTCA administrative claim.'],
      ['Longer term', 'Own UM coverage assessed where the driver is thin or unreachable.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private California driver who clearly failed to yield.'],
      ['Coverage gap', 'An out-of-state or cross-border driver; own UM coverage central.'],
      ['Agency', 'An MTS or City vehicle involved, six-month clock running.'],
      ['Federal', 'A federal or military vehicle, moving the case to the FTCA.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a federal or military vehicle was involved',
      'Whether the claim is routed correctly (FTCA vs state vs private)',
      'Whether the driver was out-of-state or cross-border',
      'Whether own UM/UIM coverage applies',
      'Whether an MTS or City vehicle was involved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'FTCA is its own track', copy: 'A federal vehicle means an SF-95 administrative claim, not the state process.' },
      { label: 'Thin coverage abroad', copy: 'Out-of-state and foreign policies make own UM coverage decisive.' },
      { label: 'Trolley at street level', copy: 'MTS collisions run on the six-month government clock.' },
      { label: 'Pedestrian protections', copy: 'Unmarked crosswalks and Freedom to Walk limit fault.' },
    ],
    insuranceProblems: [
      'A federal-vehicle claim is filed on the wrong (state) process.',
      'Own UM coverage is overlooked when the driver is uninsured abroad.',
      'A government claim is rejected as untimely at six months.',
      'The pedestrian is blamed for a lawful crossing.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the vehicle federal, military, or government-marked?' },
      { label: 'Step 2', question: 'Was the driver from out of state or from Mexico?' },
      { label: 'Step 3', question: 'What uninsured/underinsured coverage do you carry?' },
      { label: 'Step 4', question: 'Was an MTS trolley, bus, or city vehicle involved?' },
    ],
  },
  [SF_BICYCLE_SLUG]: {
    scenario: `A commuter\u2019s front wheel dropped into a Muni track flangeway on Church Street and threw her, with no car involved. Photographed that day, the track angle and location supported a dangerous-condition claim against the transit agency — on a six-month clock that would have quietly expired. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the track, flangeway, and line of travel before anything changes.'],
      ['First week', 'Report obtained; public-entity involvement assessed for a track or roadway claim.'],
      ['Six months', 'Deadline to present a written claim to SFMTA or the City.'],
      ['Longer term', 'High medical costs tracked against any health-plan lien.'],
    ],
    severityLadder: [
      ['Straightforward', 'A car-versus-bike collision with clear driver fault.'],
      ['Dooring', 'An occupant opened a door into the rider\u2019s path.'],
      ['Track fall', 'A single-vehicle fall implicating public track infrastructure.'],
      ['Agency', 'An SFMTA vehicle or roadway condition, six-month clock running.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the fall or collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and the growing lien tracked together.' },
    ],
    settlementDrivers: [
      'Whether the fall involved public track infrastructure',
      'Whether the track and location were photographed promptly',
      'Whether a door was opened into the rider\u2019s path',
      'The passing distance in a car collision',
      'Whether the six-month claim was presented in time',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Track falls are claims', copy: 'A dangerous-condition claim against the agency, not a no-fault accident.' },
      { label: 'Dooring fault is fixed', copy: 'Section 22517 places fault on the person who opened the door.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance in car collisions.' },
      { label: 'Helmet is bounded', copy: 'Not required for adults; relevant only to head injuries.' },
    ],
    insuranceProblems: [
      'A track fall is treated as a no-fault solo accident.',
      'The photographs that prove the track condition are never taken.',
      'A dooring is blamed on the cyclist.',
      'A government claim is rejected as untimely at six months.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did your wheel catch in Muni or streetcar tracks, and where?' },
      { label: 'Step 2', question: 'Do you have photographs of the track and your line of travel?' },
      { label: 'Step 3', question: 'Was a car door opened into your path?' },
      { label: 'Step 4', question: 'For a car collision, how much room did the driver leave?' },
    ],
  },
  [LA_BICYCLE_SLUG]: {
    scenario: `A cyclist in a bike lane on a High Injury Network arterial was clipped by a driver who did not stop. Police never identified the car; the claim only advanced once his own uninsured-motorist coverage was put on notice, before that deadline could pass too. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Capture any vehicle detail; a fleeing driver shifts the claim to UM coverage.'],
      ['First week', 'Report obtained; own uninsured-motorist carrier put on notice.'],
      ['Six months', 'Deadline to present a written claim if an LA Metro or city vehicle was involved.'],
      ['Longer term', 'Lane position and passing distance documented for the fault fight.'],
    ],
    severityLadder: [
      ['Straightforward', 'An identified, insured driver who clearly failed to pass safely.'],
      ['Hit-and-run', 'Driver fled; the claim turns on your own UM coverage.'],
      ['Dooring', 'An occupant opened a door into the rider\u2019s path.'],
      ['Agency', 'An LA Metro or city vehicle involved, six-month clock running.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Paramedic and ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings matter where the driver disputes seeing you.' },
      { label: 'Continuing care', copy: 'Consistency answers arguments that injuries came from elsewhere.' },
      { label: 'Documentation', copy: 'Bills, wage loss and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver stopped or fled',
      'Whether your own UM coverage was identified and noticed',
      'The passing distance and your lane position',
      'Whether a door was opened into your path',
      'Whether a public entity is involved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Hit-and-run shifts it', copy: 'A fleeing driver makes your own UM coverage the main route.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs the clearance a driver must leave.' },
      { label: 'Dooring fault is fixed', copy: 'Section 22517 places fault on the person who opened the door.' },
      { label: 'Helmet is bounded', copy: 'Not required for adults; relevant only to head injuries.' },
    ],
    insuranceProblems: [
      'UM coverage is never identified after a hit-and-run.',
      'The cyclist is blamed for being in the lane.',
      'A dooring is blamed on the rider.',
      'A government claim is rejected as untimely at six months.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the driver stop, or flee the scene?' },
      { label: 'Step 2', question: 'What uninsured-motorist coverage do you or a resident relative carry?' },
      { label: 'Step 3', question: 'How much room did the driver leave when passing?' },
      { label: 'Step 4', question: 'Was a car door opened into your path?' },
    ],
  },
  [SD_BICYCLE_SLUG]: {
    scenario: `A road cyclist on a San Diego canyon route was clipped by a car that passed within a foot at speed. The insurer argued he wobbled into the lane, but the sub-three-feet pass was itself the violation, and a following rider\u2019s camera captured the distance \u2014 before anyone asked whether the car was a government vehicle. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Capture the passing distance, any camera footage, and whether the vehicle was federal or military.'],
      ['First week', 'Report obtained; a military vehicle shifts the claim to the Standard Form 95 process.'],
      ['Six months', 'Deadline to present a written claim if an MTS or city vehicle or track condition was involved.'],
      ['Longer term', 'Lane position and passing distance documented for the fault fight.'],
    ],
    severityLadder: [
      ['Straightforward', 'An identified, insured driver who clearly failed to pass safely.'],
      ['Close pass', 'A sub-three-feet pass at speed on an open road.'],
      ['Federal fork', 'A military or federal vehicle, moving the claim to the FTCA.'],
      ['Agency', 'An MTS trolley track or vehicle, six-month clock running.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Paramedic and ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss and future care define economics.' },
    ],
    settlementDrivers: [
      'The passing distance and whether it met three feet',
      'The turning geometry if the vehicle turned across the cyclist',
      'Whether the vehicle was federal or military',
      'Whether an MTS track or vehicle was involved',
      'Whether the six-month or Standard Form 95 deadline was met',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Three-foot rule', copy: 'A too-close pass is a violation, not the cyclist\u2019s error.' },
      { label: 'Camera helps', copy: 'Footage of the pass answers the wobble argument.' },
      { label: 'Federal fork', copy: 'A military vehicle moves the claim to the Standard Form 95 process.' },
      { label: 'Track falls are claims', copy: 'A dangerous-condition claim against MTS on a six-month clock.' },
    ],
    insuranceProblems: [
      'The rider is said to have wobbled into the lane without evidence.',
      'A sub-three-feet pass is not treated as the violation it is.',
      'A federal-vehicle claim is filed as an ordinary claim and misses Form 95.',
      'A track or transit claim misses the six-month deadline.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How much room did the passing vehicle leave?' },
      { label: 'Step 2', question: 'Was the vehicle federal or military?' },
      { label: 'Step 3', question: 'Did an MTS trolley track or vehicle contribute?' },
      { label: 'Step 4', question: 'Is there camera footage or a witness to the pass?' },
    ],
  },
}
