import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, dog-bite practice area: city-specific dog-bite guides for Los
 * Angeles, San Francisco, San Diego, and Sacramento.
 *
 * These complement the statewide dog-bite hub (value, liability, SOL, hiring)
 * with genuinely local context rather than interpolated copy:
 *  - Los Angeles: the highest volume of bites in the state, a large share of
 *    delivery and postal-worker bites, and a renter-heavy population where the
 *    owner's renter's policy (and sometimes the landlord) is the coverage
 *    source.
 *  - San Francisco: dense multi-unit housing that raises landlord liability
 *    when a landlord knew of a dangerous dog, and a strong off-leash dog
 *    culture around the city's parks.
 *  - San Diego: the military bases, where a bite involving a federal or
 *    on-base dog can route the claim through the Federal Tort Claims Act, plus
 *    the police-and-military-dog exception to strict liability and the county's
 *    dog beaches.
 *  - Sacramento: high single-family homeownership, so the owner's homeowner's
 *    liability coverage is usually the source of recovery, across a suburban
 *    and rural county with high dog ownership and heavy delivery traffic.
 *
 * California dog-bite law, applied accurately:
 *  - Civil Code section 3342 imposes strict liability on a dog owner for a bite
 *    in a public place or while the victim is lawfully on private property,
 *    regardless of the dog's history or the owner's knowledge; the victim need
 *    not prove carelessness.
 *  - The statute has an exception for governmental police and military dogs used
 *    in the line of duty.
 *  - Non-bite injuries (for example, being knocked down) fall under ordinary
 *    negligence rather than section 3342.
 *  - Most claims are paid by homeowner's or renter's liability coverage; a
 *    landlord may be liable if they knew of a dangerous dog and did nothing.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    (Code of Civil Procedure section 335.1), with the six-month Government
 *    Claims Act deadline where a public entity is involved.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether strict liability, a landlord\u2019s liability, a governmental exception, or the FTCA applies depends on facts a licensed California attorney should review promptly.'

const STRICT =
  'California Civil Code section 3342 makes a dog owner strictly liable for a bite that happens in a public place or while the victim is lawfully on private property, regardless of whether the dog had ever bitten before or the owner knew it could be dangerous. The victim does not have to prove the owner was careless \u2014 only that the bite happened and they were lawfully present. The old idea that every dog gets \u201cone free bite\u201d is not California law.'

const COVERAGE =
  'Most dog-bite claims are paid not out of the owner\u2019s pocket but by their homeowner\u2019s or renter\u2019s insurance liability coverage, so identifying that policy is usually the practical key to recovery. Where the owner rents, the landlord can sometimes be liable too \u2014 but generally only if the landlord actually knew the dog was dangerous and had the ability to remove or control it and failed to act.'

const NON_BITE =
  'If the injury was not a bite \u2014 for example, a large dog knocking someone down \u2014 strict liability under section 3342 does not apply, but an ordinary negligence claim still can, based on the owner\u2019s failure to control the animal. The distinction changes what must be proved, not whether a claim exists.'

export const LA_DOGBITE_SLUG = '/los-angeles-dog-bite'
export const SF_DOGBITE_SLUG = '/san-francisco-dog-bite'
export const SD_DOGBITE_SLUG = '/san-diego-dog-bite'
export const SAC_DOGBITE_SLUG = '/sacramento-dog-bite'

export const dogBiteCityGuidePages: LandingPage[] = [
  {
    slug: LA_DOGBITE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Dog Bite Claims',
    title: 'Los Angeles Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'Los Angeles sees more dog bites than anywhere in the state, and many involve delivery and postal workers. California\u2019s strict-liability law means you usually need not prove the owner was careless \u2014 and the owner\u2019s renter\u2019s policy often pays.',
    psychology: 'I was bitten by a dog in LA \u2014 maybe on the job delivering \u2014 and do not know who pays or how strong my claim is.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles dog bite claim',
      'delivery driver bitten by a dog california',
      'california dog bite strict liability law',
      'does renters insurance cover a dog bite',
      'bitten by a dog at an apartment los angeles',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Delivery / postal-worker bite',
      'Renter\u2019s or homeowner\u2019s coverage',
      'Landlord liability (multi-unit)',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `Los Angeles generates more dog-bite injuries than any other part of California, and the local pattern has a distinctive shape. A large share of serious bites happen to people doing their jobs \u2014 delivery drivers, postal and package carriers, meter readers and in-home service workers \u2014 who are lawfully on the property when a dog reaches them, which places them squarely within California\u2019s strict-liability rule. ${STRICT} That matters enormously in LA, because the owner\u2019s account of the dog as gentle or the claim that the worker \u201cprovoked\u201d it is usually beside the point: what counts is that the person was lawfully present and was bitten. The second local feature is housing. LA is heavily renter-occupied and dense with apartments, so the coverage question is central. ${COVERAGE} In an apartment or condo, that means looking at both the dog owner\u2019s renter\u2019s policy and, where the facts support it, the landlord\u2019s liability for a known dangerous dog. ${NON_BITE} Los Angeles Animal Services and the county\u2019s animal-control agencies keep bite reports and dangerous-dog records that can corroborate a claim, so reporting the bite and obtaining the record matters. The ordinary two-year personal-injury deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence means that even if the injured person is assigned some share \u2014 for example, for how they approached the dog \u2014 it reduces rather than bars recovery. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether you were lawfully on the property when bitten',
        'Whether you were working (delivery, postal, service) at the time',
        'The dog owner\u2019s name and their renter\u2019s or homeowner\u2019s insurer',
        'In an apartment, the landlord and any knowledge of a dangerous dog',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The animal-control report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies California\u2019s strict-liability rule to an LA bite \u2014 so a lawfully present delivery or service worker is not sidetracked by the owner\u2019s \u201cgentle dog\u201d story \u2014 and drives straight to the coverage question, identifying the renter\u2019s or homeowner\u2019s policy and any landlord exposure. It distinguishes a bite from a non-bite injury and prompts to secure the animal-control record. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was bitten while delivering a package. Do I have a claim even though I entered the property?',
        a: 'Usually yes. Delivery and postal workers are lawfully on the property to do their jobs, which places them within California\u2019s strict-liability rule under Civil Code section 3342. You generally do not have to prove the owner was careless or that the dog had bitten before \u2014 only that you were lawfully present and were bitten.',
      },
      {
        q: 'Does the owner\u2019s "he\u2019s never bitten anyone" defense matter?',
        a: 'Generally no. California does not follow a \u201cone free bite\u201d rule; under section 3342 an owner is strictly liable for a bite even if the dog had never shown aggression before. The dog\u2019s prior history and the owner\u2019s knowledge, which matter in many states, do not defeat a California strict-liability bite claim.',
      },
      {
        q: 'The dog\u2019s owner rents an apartment. Who pays?',
        a: 'Most often the owner\u2019s renter\u2019s insurance liability coverage. The landlord can also be liable, but generally only if the landlord actually knew the dog was dangerous and could have removed or controlled it and did not. Identifying both the renter\u2019s policy and any landlord knowledge is the practical key to recovery.',
      },
      {
        q: 'The dog knocked me down but did not bite me. Do I still have a claim?',
        a: 'Possibly, under ordinary negligence rather than strict liability. Section 3342 covers bites; a non-bite injury like a knock-down requires showing the owner failed to control the animal. That changes what must be proved, not whether a claim can exist.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_DOGBITE_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Dog Bite Claims',
    title: 'San Francisco Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Francisco\u2019s dense apartments and strong off-leash dog culture shape its bite claims: strict liability usually applies, the owner\u2019s renter\u2019s policy often pays, and a landlord may be liable for a known dangerous dog.',
    psychology: 'I was bitten by a dog in San Francisco, maybe at an apartment or an off-leash park, and do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco dog bite claim',
      'california dog bite strict liability law',
      'bitten by an off leash dog san francisco',
      'landlord liability dog bite apartment california',
      'does renters insurance cover a dog bite',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Off-leash park bite',
      'Renter\u2019s coverage',
      'Landlord liability (multi-unit)',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `San Francisco dog-bite claims are shaped by how the city lives with dogs: densely, in apartments, and often off-leash. San Francisco has one of the highest dog-to-resident ratios of any large American city and an entrenched off-leash culture around its parks and open spaces, so bites frequently happen in shared and public settings. In those settings California\u2019s strict-liability rule is usually decisive. ${STRICT} A bite in a public park or on a sidewalk, or while lawfully visiting someone\u2019s building, generally triggers the owner\u2019s liability without any need to prove the dog was known to be dangerous. Because San Francisco is overwhelmingly a renter city of multi-unit buildings, two coverage questions follow. ${COVERAGE} In an apartment building, a landlord who knew a tenant\u2019s dog was dangerous and had the ability to act can share liability, so the building\u2019s history of complaints matters. ${NON_BITE} San Francisco Animal Care and Control maintains bite and dangerous-dog records that can corroborate a claim, and reporting the bite creates that record. The ordinary two-year personal-injury deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence means any share assigned to the injured person \u2014 for instance, for approaching an unfamiliar dog \u2014 reduces rather than bars recovery. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Where the bite happened \u2014 a park, sidewalk, or building',
        'Whether you were lawfully present at the location',
        'The dog owner\u2019s name and their renter\u2019s or homeowner\u2019s insurer',
        'In an apartment building, the landlord and any complaint history',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The Animal Care and Control report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies strict liability to a San Francisco park or apartment bite, so the owner\u2019s liability does not turn on the dog\u2019s prior record, and pursues the coverage question through the renter\u2019s policy and any landlord knowledge in a multi-unit building. It distinguishes a bite from a non-bite injury and prompts to secure the Animal Care and Control record. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An off-leash dog bit me in a park. Is the owner liable even in an off-leash area?',
        a: 'Usually yes. California\u2019s strict-liability rule under Civil Code section 3342 applies to a bite in a public place while you are lawfully present, and an off-leash area does not change that. Whether the area allowed off-leash dogs may affect a comparative-fault argument, but it does not remove the owner\u2019s strict liability for the bite.',
      },
      {
        q: 'Does the owner\u2019s "she has never bitten before" defense matter?',
        a: 'Generally no. California does not follow a \u201cone free bite\u201d rule; under section 3342 an owner is strictly liable for a bite even if the dog had never shown aggression. The dog\u2019s prior history does not defeat a California strict-liability bite claim.',
      },
      {
        q: 'The dog\u2019s owner rents. Can the landlord be responsible too?',
        a: 'Sometimes. In San Francisco\u2019s multi-unit buildings a landlord can share liability, but generally only if the landlord actually knew the dog was dangerous and had the ability to remove or control it and did not act. A building history of complaints can be important, alongside the owner\u2019s renter\u2019s insurance.',
      },
      {
        q: 'The dog knocked me over but did not bite. Do I have a claim?',
        a: 'Possibly, under ordinary negligence rather than strict liability. Section 3342 covers bites; a non-bite injury requires showing the owner failed to control the animal. That changes what must be proved, not whether a claim can exist.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_DOGBITE_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Dog Bite Claims',
    title: 'San Diego Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego\u2019s military presence gives its dog-bite claims a twist: a bite involving a federal or on-base dog can run through the Federal Tort Claims Act, and police-dog bites fall under a statutory exception \u2014 while ordinary bites are strict-liability claims.',
    psychology: 'I was bitten by a dog in San Diego, maybe on a base or by a police dog, and do not know how my claim works.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego dog bite claim',
      'california dog bite strict liability law',
      'bitten by a dog on a military base claim',
      'police k9 bite claim california',
      'does homeowners insurance cover a dog bite',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Federal / on-base dog (FTCA)',
      'Police-dog statutory exception',
      'Homeowner\u2019s or renter\u2019s coverage',
      'Dog-beach / off-leash bite',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Diego dog-bite claims mostly follow California\u2019s ordinary strict-liability rule, but the region\u2019s military footprint adds two distinctive paths. ${STRICT} That rule governs the everyday case \u2014 a bite at a home, on a sidewalk, or at one of the county\u2019s well-known dog beaches and off-leash areas \u2014 where the owner\u2019s homeowner\u2019s or renter\u2019s coverage is the source of recovery. ${COVERAGE} The first distinctive path is federal. With Camp Pendleton, the Navy and Marine bases, and extensive military housing, a bite involving a dog owned by the federal government, or occurring on a federal enclave in circumstances that make the United States responsible, can fall under the Federal Tort Claims Act rather than an ordinary claim \u2014 which means presenting an administrative claim on Standard Form 95 to the responsible agency, typically within two years, before any lawsuit. Identifying a federal connection early is therefore decisive. The second is the statutory exception: California\u2019s strict-liability law does not apply to governmental police and military dogs bites when the dog is being used in the line of duty in a manner the statute protects, so a police-K9 bite is analysed differently and may turn on the agency\u2019s policies and the reasonableness of the force. ${NON_BITE} County and city animal-control agencies keep bite records that corroborate ordinary claims. The two-year personal-injury deadline applies to private claims (Code of Civil Procedure section 335.1); a public-entity claim runs on the six-month Government Claims Act deadline, and a federal claim on the FTCA process. Pure comparative negligence applies. Civil cases against private parties are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether the dog was federally owned or the bite occurred on a base',
        'Whether it was a police or military dog used in the line of duty',
        'For an ordinary bite, the owner\u2019s homeowner\u2019s or renter\u2019s insurer',
        'Whether you were lawfully present at the location',
        'Whether the bite happened at a dog beach or off-leash area',
        'The animal-control report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ checks first for a federal or on-base connection, which can route a San Diego bite through the FTCA and its Standard Form 95 deadline, and for a police-K9 situation that falls under the statutory exception. For the ordinary case it applies strict liability and drives to the homeowner\u2019s or renter\u2019s coverage. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was bitten by a dog on a military base. Is that an ordinary claim?',
        a: 'Not necessarily. If the dog was federally owned, or the bite occurred on a federal enclave in circumstances that make the United States responsible, the claim can fall under the Federal Tort Claims Act, which requires an administrative claim on Standard Form 95 to the responsible agency, usually within two years, before any lawsuit. Because San Diego has so many federal facilities, identifying that connection early is essential.',
      },
      {
        q: 'A police K9 bit me. Does strict liability apply?',
        a: 'Generally not in the same way. California\u2019s strict-liability statute has an exception for governmental police and military dogs used in the line of duty, so a police-K9 bite is analysed differently \u2014 often around the agency\u2019s policies and the reasonableness of the force used \u2014 rather than as an automatic strict-liability claim.',
      },
      {
        q: 'A neighbor\u2019s dog bit me at home. Who pays?',
        a: 'For an ordinary bite, California\u2019s strict-liability rule under Civil Code section 3342 usually applies, and the owner\u2019s homeowner\u2019s or renter\u2019s insurance liability coverage is typically the source of recovery. You generally need not prove the dog had bitten before or that the owner was careless.',
      },
      {
        q: 'I was bitten at a dog beach. Does that change things?',
        a: 'The strict-liability rule still applies to a bite while you are lawfully present, so an owner is generally liable. Whether an off-leash beach allowed the dog off-leash may feed a comparative-fault argument, but under pure comparative negligence any share assigned to you reduces rather than bars recovery.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage and process questions \u2014 including whether the FTCA or the police-dog exception applies \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_DOGBITE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Dog Bite Claims',
    title: 'Sacramento Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sacramento\u2019s high single-family homeownership means most dog-bite claims are paid by the owner\u2019s homeowner\u2019s insurance \u2014 and California\u2019s strict-liability law usually means you need not prove the owner was careless.',
    psychology: 'I was bitten by a dog in the Sacramento area and do not know who pays or how strong my claim is.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento dog bite claim',
      'california dog bite strict liability law',
      'does homeowners insurance cover a dog bite',
      'delivery driver bitten by a dog california',
      'bitten by a dog at a house sacramento',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Homeowner\u2019s liability coverage',
      'Delivery / service-worker bite',
      'Suburban / rural county',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `Sacramento dog-bite claims are shaped by how the region houses people and dogs: in single-family homes, across a large suburban and rural county, with high dog ownership. That housing pattern makes the coverage question more straightforward than in the renter-heavy coastal cities. ${COVERAGE} In Sacramento, that usually means the dog owner\u2019s homeowner\u2019s insurance liability coverage, which is the source of recovery in most cases and is why identifying the policy is the practical first step. The legal foundation is the same statewide strict-liability rule. ${STRICT} A frequent local scenario is the service or delivery worker \u2014 lawfully on the property to deliver a package, read a meter, or perform a service \u2014 who is bitten by a dog in a yard; because they were lawfully present, strict liability generally applies regardless of the dog\u2019s history. The suburban and rural spread of the county also means larger properties, loose or roaming dogs, and occasional livestock-guardian or working dogs, which can raise questions about where the bite occurred and whether the victim was lawfully present. ${NON_BITE} Sacramento County and city animal-control agencies keep bite and dangerous-dog records that corroborate a claim, so reporting the bite matters. The ordinary two-year personal-injury deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence means any share assigned to the injured person reduces rather than bars recovery. Civil cases are filed in Sacramento County Superior Court at the Gordon D. Schaber Downtown Courthouse.`,
      whatToTrack: [
        'The dog owner\u2019s name and their homeowner\u2019s or renter\u2019s insurer',
        'Whether you were lawfully on the property when bitten',
        'Whether you were working (delivery, service) at the time',
        'Where exactly the bite happened on the property',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The animal-control report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies California\u2019s strict-liability rule to a Sacramento bite \u2014 keeping a lawfully present delivery or service worker from being sidetracked by the owner\u2019s \u201cgentle dog\u201d story \u2014 and drives straight to the homeowner\u2019s coverage that pays most claims here. It distinguishes a bite from a non-bite injury and prompts to secure the animal-control record. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A neighbor\u2019s dog bit me. Will their homeowner\u2019s insurance pay?',
        a: 'Usually a dog-bite claim is paid by the owner\u2019s homeowner\u2019s insurance liability coverage, and in Sacramento\u2019s single-family neighbourhoods that is the most common source of recovery. Identifying the policy early is the practical key, and California\u2019s strict-liability rule means you generally need not prove the owner was careless.',
      },
      {
        q: 'I was bitten while delivering a package to a house. Do I have a claim?',
        a: 'Usually yes. A delivery or service worker is lawfully on the property to do their job, which places them within California\u2019s strict-liability rule under Civil Code section 3342. You generally do not have to prove the owner was careless or that the dog had bitten before \u2014 only that you were lawfully present and were bitten.',
      },
      {
        q: 'Does the owner\u2019s "he\u2019s never bitten anyone" defense matter?',
        a: 'Generally no. California does not follow a \u201cone free bite\u201d rule; under section 3342 an owner is strictly liable for a bite even if the dog had never shown aggression before. The dog\u2019s prior history does not defeat a California strict-liability bite claim.',
      },
      {
        q: 'The dog knocked me down but did not bite me. Do I still have a claim?',
        a: 'Possibly, under ordinary negligence rather than strict liability. Section 3342 covers bites; a non-bite injury like a knock-down requires showing the owner failed to control the animal. That changes what must be proved, not whether a claim can exist.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const dogBiteCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_DOGBITE_SLUG]: {
    scenario: `A delivery driver was bitten reaching a doorstep in LA, and the owner insisted the dog was gentle and had never bitten. Because the driver was lawfully present, strict liability applied regardless, and the owner\u2019s renter\u2019s policy covered the wound care and scarring treatment. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; get the owner and any insurer.'],
      ['First days', 'Report the bite to animal control; obtain the report number.'],
      ['First weeks', 'The renter\u2019s or homeowner\u2019s policy, and any landlord exposure, identified.'],
      ['Longer term', 'Scarring and any reconstructive care documented.'],
    ],
    severityLadder: [
      ['Minor', 'A single bite treated and healed without scarring.'],
      ['Moderate', 'Puncture wounds needing wound care or stitches.'],
      ['Serious', 'Deep bites, nerve or tissue damage, or infection.'],
      ['Disfiguring', 'Permanent scarring, especially facial, or a child victim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Wound care and any rabies protocol are documented.' },
      { label: 'Follow-up', copy: 'Infection monitoring and suture care.' },
      { label: 'Specialist', copy: 'Plastic or reconstructive consultation for scarring.' },
      { label: 'Documentation', copy: 'Photographs over time show the permanent result.' },
    ],
    settlementDrivers: [
      'Whether you were lawfully present when bitten',
      'The owner\u2019s renter\u2019s or homeowner\u2019s coverage',
      'Any landlord knowledge of a dangerous dog',
      'The severity and permanence of scarring',
      'The animal-control report and any prior incidents',
      'Whether the victim was a child',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Section 3342 removes the need to prove carelessness.' },
      { label: 'Coverage is the key', copy: 'The renter\u2019s or homeowner\u2019s policy usually pays.' },
      { label: 'Scarring matters', copy: 'Permanent, visible scars raise the stakes.' },
      { label: 'No free bite', copy: 'A clean prior record is not a defense in California.' },
    ],
    insuranceProblems: [
      'The owner\u2019s \u201cgentle dog\u201d story is treated as a defense.',
      'The worker is wrongly blamed for entering the property.',
      'No animal-control report is ever made.',
      'A landlord\u2019s knowledge of a dangerous dog is never explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you lawfully on the property when bitten?' },
      { label: 'Step 2', question: 'Who owns the dog, and do they rent or own?' },
      { label: 'Step 3', question: 'Was the bite reported to animal control?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
  [SF_DOGBITE_SLUG]: {
    scenario: `A resident was bitten by an off-leash dog in a San Francisco park, and the owner argued the area allowed off-leash dogs. Strict liability still applied to the bite, the owner\u2019s renter\u2019s policy responded, and the off-leash point only fed a modest comparative-fault argument. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; get the owner and any insurer.'],
      ['First days', 'Report the bite to Animal Care and Control; obtain the report.'],
      ['First weeks', 'The renter\u2019s policy, and any landlord exposure, identified.'],
      ['Longer term', 'Scarring and any reconstructive care documented.'],
    ],
    severityLadder: [
      ['Minor', 'A single bite treated and healed without scarring.'],
      ['Moderate', 'Puncture wounds needing wound care or stitches.'],
      ['Serious', 'Deep bites, nerve or tissue damage, or infection.'],
      ['Disfiguring', 'Permanent scarring, especially facial, or a child victim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Wound care and any rabies protocol are documented.' },
      { label: 'Follow-up', copy: 'Infection monitoring and suture care.' },
      { label: 'Specialist', copy: 'Plastic or reconstructive consultation for scarring.' },
      { label: 'Documentation', copy: 'Photographs over time show the permanent result.' },
    ],
    settlementDrivers: [
      'Whether you were lawfully present when bitten',
      'The owner\u2019s renter\u2019s or homeowner\u2019s coverage',
      'Any landlord knowledge of a dangerous dog in the building',
      'The severity and permanence of scarring',
      'The Animal Care and Control report and any prior incidents',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Section 3342 applies to a bite in a public place.' },
      { label: 'Off-leash is not a bar', copy: 'It may feed comparative fault, not defeat the claim.' },
      { label: 'Coverage is the key', copy: 'The renter\u2019s policy usually pays.' },
      { label: 'Landlord may share', copy: 'Known dangerous dog in a building can add exposure.' },
    ],
    insuranceProblems: [
      'The off-leash area is treated as a complete defense.',
      'The owner\u2019s clean prior record is treated as a defense.',
      'No Animal Care and Control report is made.',
      'A building\u2019s complaint history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where did the bite happen, and were you lawfully there?' },
      { label: 'Step 2', question: 'Who owns the dog, and do they rent?' },
      { label: 'Step 3', question: 'Was the bite reported to Animal Care and Control?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
  [SD_DOGBITE_SLUG]: {
    scenario: `A visitor was bitten on a base by a dog connected to the facility, and an ordinary insurance claim went nowhere. Recognising a federal connection, a Standard Form 95 was presented to the agency in time, keeping the claim alive on the FTCA track. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the dog or location was federal or on-base.'],
      ['First days', 'Report the bite; the correct track \u2014 FTCA, ordinary, or K9 \u2014 confirmed.'],
      ['Within two years', 'Standard Form 95 presented if a federal connection exists.'],
      ['Longer term', 'Scarring and any reconstructive care documented.'],
    ],
    severityLadder: [
      ['Ordinary bite', 'A strict-liability claim on the owner\u2019s coverage.'],
      ['Federal', 'An FTCA claim on a Standard Form 95 process.'],
      ['Police K9', 'The statutory exception; force reasonableness at issue.'],
      ['Disfiguring', 'Permanent scarring, especially facial, or a child victim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Wound care and any rabies protocol are documented.' },
      { label: 'Follow-up', copy: 'Infection monitoring and suture care.' },
      { label: 'Specialist', copy: 'Plastic or reconstructive consultation for scarring.' },
      { label: 'Documentation', copy: 'Photographs over time show the permanent result.' },
    ],
    settlementDrivers: [
      'Whether a federal or on-base connection triggers the FTCA',
      'Whether it was a police or military dog in the line of duty',
      'For an ordinary bite, the owner\u2019s homeowner\u2019s or renter\u2019s coverage',
      'Whether you were lawfully present',
      'The severity and permanence of scarring',
      'The animal-control report and any prior incidents',
    ],
    settlementValueDetails: [
      { label: 'Federal is different', copy: 'The FTCA and Form 95 replace an ordinary claim.' },
      { label: 'K9 exception', copy: 'Police dogs fall outside ordinary strict liability.' },
      { label: 'Strict liability', copy: 'Ordinary bites need no proof of carelessness.' },
      { label: 'Coverage is the key', copy: 'Homeowner\u2019s or renter\u2019s coverage usually pays.' },
    ],
    insuranceProblems: [
      'A federal-connected bite is filed as an ordinary claim and stalls.',
      'The Standard Form 95 deadline is missed.',
      'A police-K9 bite is misanalysed as automatic strict liability.',
      'The owner\u2019s clean prior record is treated as a defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the dog federally owned or the bite on a base?' },
      { label: 'Step 2', question: 'Was it a police or military dog in the line of duty?' },
      { label: 'Step 3', question: 'For an ordinary bite, who owns the dog and their insurer?' },
      { label: 'Step 4', question: 'Was the bite reported, and is there scarring?' },
    ],
  },
  [SAC_DOGBITE_SLUG]: {
    scenario: `A meter reader was bitten in a Sacramento back yard, and the owner claimed the dog was harmless. Because the worker was lawfully present, strict liability applied, and the owner\u2019s homeowner\u2019s policy covered the treatment and scarring care. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; get the owner and insurer.'],
      ['First days', 'Report the bite to animal control; obtain the report number.'],
      ['First weeks', 'The homeowner\u2019s policy identified as the coverage source.'],
      ['Longer term', 'Scarring and any reconstructive care documented.'],
    ],
    severityLadder: [
      ['Minor', 'A single bite treated and healed without scarring.'],
      ['Moderate', 'Puncture wounds needing wound care or stitches.'],
      ['Serious', 'Deep bites, nerve or tissue damage, or infection.'],
      ['Disfiguring', 'Permanent scarring, especially facial, or a child victim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Wound care and any rabies protocol are documented.' },
      { label: 'Follow-up', copy: 'Infection monitoring and suture care.' },
      { label: 'Specialist', copy: 'Plastic or reconstructive consultation for scarring.' },
      { label: 'Documentation', copy: 'Photographs over time show the permanent result.' },
    ],
    settlementDrivers: [
      'Whether you were lawfully present when bitten',
      'The owner\u2019s homeowner\u2019s or renter\u2019s coverage',
      'Where on the property the bite happened',
      'The severity and permanence of scarring',
      'The animal-control report and any prior incidents',
      'Whether the victim was a child',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Section 3342 removes the need to prove carelessness.' },
      { label: 'Homeowner\u2019s pays', copy: 'Single-family ownership makes coverage clearer.' },
      { label: 'Scarring matters', copy: 'Permanent, visible scars raise the stakes.' },
      { label: 'No free bite', copy: 'A clean prior record is not a defense in California.' },
    ],
    insuranceProblems: [
      'The owner\u2019s \u201cgentle dog\u201d story is treated as a defense.',
      'The worker is wrongly blamed for entering the yard.',
      'No animal-control report is ever made.',
      'A loose or roaming-dog history is never explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you lawfully on the property when bitten?' },
      { label: 'Step 2', question: 'Who owns the dog, and do they own the home?' },
      { label: 'Step 3', question: 'Was the bite reported to animal control?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
}
