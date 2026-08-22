import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, dog-bite practice area (batch 2): city-specific dog-bite guides for
 * San Jose, Fresno, Long Beach, and Oakland, extending the batch-1 hub (Los
 * Angeles, San Francisco, San Diego, Sacramento).
 *
 * Genuinely local context rather than interpolated copy:
 *  - San Jose: Silicon Valley\u2019s mix of suburban single-family homeownership and
 *    dense apartment corridors, heavy delivery-driver traffic, and busy off-leash
 *    trails, so both homeowner\u2019s and renter\u2019s coverage recur.
 *  - Fresno: a Central Valley county with very high dog ownership, many loose and
 *    unlicensed dogs, rural and agricultural properties, and heavy delivery and
 *    utility-worker exposure.
 *  - Long Beach: a dense, renter-heavy port city whose apartment living makes
 *    landlord liability and the owner\u2019s renter\u2019s policy central; the city runs
 *    its own animal-control agency.
 *  - Oakland: a dense, renter-heavy East Bay city with strong off-leash culture
 *    around its regional parks and high delivery volume, again raising renter\u2019s
 *    coverage and landlord exposure.
 *
 * California dog-bite law, applied accurately (identical to the batch-1 hub):
 *  - Civil Code section 3342 imposes strict liability on a dog owner for a bite
 *    in a public place or while the victim is lawfully on private property,
 *    regardless of the dog\u2019s history or the owner\u2019s knowledge.
 *  - The statute has an exception for governmental police and military dogs used
 *    in the line of duty.
 *  - Non-bite injuries fall under ordinary negligence rather than section 3342.
 *  - Most claims are paid by homeowner\u2019s or renter\u2019s liability coverage; a
 *    landlord may be liable if they knew of a dangerous dog and did nothing.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    (Code of Civil Procedure section 335.1), with the six-month Government Claims
 *    Act deadline where a public entity is involved.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether strict liability, a landlord\u2019s liability, or a governmental exception applies depends on facts a licensed California attorney should review promptly.'

const STRICT =
  'California Civil Code section 3342 makes a dog owner strictly liable for a bite that happens in a public place or while the victim is lawfully on private property, regardless of whether the dog had ever bitten before or the owner knew it could be dangerous. The victim does not have to prove the owner was careless \u2014 only that the bite happened and they were lawfully present. The old idea that every dog gets \u201cone free bite\u201d is not California law.'

const COVERAGE =
  'Most dog-bite claims are paid not out of the owner\u2019s pocket but by their homeowner\u2019s or renter\u2019s insurance liability coverage, so identifying that policy is usually the practical key to recovery. Where the owner rents, the landlord can sometimes be liable too \u2014 but generally only if the landlord actually knew the dog was dangerous and had the ability to remove or control it and failed to act.'

const NON_BITE =
  'If the injury was not a bite \u2014 for example, a large dog knocking someone down \u2014 strict liability under section 3342 does not apply, but an ordinary negligence claim still can, based on the owner\u2019s failure to control the animal. The distinction changes what must be proved, not whether a claim exists.'

export const SJ_DOGBITE_SLUG = '/san-jose-dog-bite'
export const FRESNO_DOGBITE_SLUG = '/fresno-dog-bite'
export const LB_DOGBITE_SLUG = '/long-beach-dog-bite'
export const OAK_DOGBITE_SLUG = '/oakland-dog-bite'

export const dogBiteCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_DOGBITE_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Dog Bite Claims',
    title: 'San Jose Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Jose\u2019s mix of suburban homes and dense apartments shapes its bite claims: strict liability usually applies, and the owner\u2019s homeowner\u2019s or renter\u2019s policy typically pays.',
    psychology: 'I was bitten by a dog in San Jose \u2014 maybe delivering or on a trail \u2014 and do not know who pays.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose dog bite claim',
      'california dog bite strict liability law',
      'delivery driver bitten by a dog california',
      'does homeowners insurance cover a dog bite',
      'bitten by an off leash dog san jose',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Delivery-driver bite',
      'Homeowner\u2019s or renter\u2019s coverage',
      'Landlord liability (multi-unit)',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `San Jose spans Silicon Valley\u2019s suburban single-family neighborhoods and its dense apartment corridors, so a bite there can implicate either a homeowner\u2019s or a renter\u2019s policy, and the volume of delivery and gig drivers means many serious bites happen to workers lawfully at a doorstep. ${STRICT} That is decisive for a delivery driver, because the owner\u2019s claim that the dog is gentle or that the worker provoked it is usually beside the point once lawful presence and a bite are established. ${COVERAGE} In an apartment, that means examining both the owner\u2019s renter\u2019s policy and any landlord knowledge of a dangerous dog; in the suburbs, the homeowner\u2019s policy is usually the clearer source. ${NON_BITE} Santa Clara County\u2019s animal-services agencies keep bite and dangerous-dog records that can corroborate a claim, so reporting the bite matters. The ordinary two-year personal-injury deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Whether you were lawfully on the property when bitten',
        'Whether you were working (delivery, gig, service) at the time',
        'The dog owner\u2019s name and their homeowner\u2019s or renter\u2019s insurer',
        'In an apartment, the landlord and any knowledge of a dangerous dog',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The animal-services report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies strict liability to a San Jose bite so a lawfully present worker is not sidetracked by a \u201cgentle dog\u201d story, and drives to the coverage question across the suburban homeowner\u2019s and apartment renter\u2019s scenarios. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was bitten while making a delivery. Do I have a claim even though I entered the property?',
        a: 'Usually yes. Delivery and gig workers are lawfully on the property to do their jobs, placing them within California\u2019s strict-liability rule under Civil Code section 3342. You generally need not prove the owner was careless or that the dog had bitten before.',
      },
      {
        q: 'Does the owner\u2019s "he\u2019s never bitten anyone" defense matter?',
        a: 'Generally no. California does not follow a \u201cone free bite\u201d rule; under section 3342 an owner is strictly liable for a bite even if the dog had never shown aggression before.',
      },
      {
        q: 'The dog owner rents an apartment. Who pays?',
        a: 'Most often the owner\u2019s renter\u2019s insurance liability coverage. A landlord can also be liable, but generally only if they actually knew the dog was dangerous and could have removed or controlled it and did not.',
      },
      {
        q: 'The dog knocked me down but did not bite me. Do I still have a claim?',
        a: 'Possibly, under ordinary negligence rather than strict liability. Section 3342 covers bites; a non-bite injury requires showing the owner failed to control the animal.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_DOGBITE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Dog Bite Claims',
    title: 'Fresno Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'Fresno\u2019s high dog ownership and many loose dogs shape its bite claims: strict liability usually applies, and the owner\u2019s homeowner\u2019s policy typically pays.',
    psychology: 'I was bitten by a dog in Fresno, maybe a loose one or on a delivery, and do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno dog bite claim',
      'california dog bite strict liability law',
      'loose dog attack claim california',
      'bitten by a dog while delivering fresno',
      'does homeowners insurance cover a dog bite',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Loose / unlicensed dog attack',
      'Homeowner\u2019s coverage',
      'Delivery / utility-worker bite',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `Fresno County has very high dog ownership and a persistent problem of loose and unlicensed dogs across rural, agricultural, and suburban areas, so bites frequently involve dogs running at large as well as bites at homes. ${STRICT} For a person bitten in a public place or lawfully on a property \u2014 including delivery, postal, and utility workers who cover the Valley\u2019s spread-out routes \u2014 strict liability generally applies without proof the dog was known to be dangerous. ${COVERAGE} Fresno\u2019s high single-family homeownership usually makes the owner\u2019s homeowner\u2019s liability policy the source of recovery, though identifying the owner of a loose dog can itself be the challenge. ${NON_BITE} The Central California SPCA and county animal control keep bite and dangerous-dog records that can corroborate a claim and help identify an owner, so reporting the bite matters. The ordinary two-year personal-injury deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'Where the bite happened and whether the dog was loose',
        'Whether you were lawfully present or in a public place',
        'The dog owner\u2019s identity and their homeowner\u2019s insurer',
        'Any effort by animal control to identify a loose dog\u2019s owner',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The animal-control report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies strict liability to a Fresno bite, helps pursue identification of a loose dog\u2019s owner through the animal-control record, and drives to the homeowner\u2019s coverage question. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A loose dog bit me and I do not know the owner. Do I have a claim?',
        a: 'Potentially, but identifying the owner is the first step. Strict liability under Civil Code section 3342 attaches to the owner, so the animal-control report and any licensing or microchip records that identify the owner are central to pursuing the claim and their homeowner\u2019s coverage.',
      },
      {
        q: 'I was bitten while reading a meter or delivering. Am I covered?',
        a: 'Usually yes. Utility, postal, and delivery workers are lawfully on the property, placing them within California\u2019s strict-liability rule, and you generally need not prove the owner was careless.',
      },
      {
        q: 'Does the owner\u2019s clean prior record defeat my claim?',
        a: 'Generally no. California does not follow a \u201cone free bite\u201d rule; under section 3342 an owner is strictly liable even if the dog had never bitten before.',
      },
      {
        q: 'The dog knocked me down but did not bite me. Do I still have a claim?',
        a: 'Possibly, under ordinary negligence rather than strict liability, based on the owner\u2019s failure to control the animal.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_DOGBITE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Dog Bite Claims',
    title: 'Long Beach Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'Long Beach\u2019s dense apartments shape its bite claims: strict liability usually applies, the owner\u2019s renter\u2019s policy often pays, and a landlord may be liable for a known dangerous dog.',
    psychology: 'I was bitten by a dog at a Long Beach apartment and do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach dog bite claim',
      'california dog bite strict liability law',
      'landlord liability dog bite apartment california',
      'does renters insurance cover a dog bite',
      'bitten by a dog at an apartment long beach',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Renter\u2019s coverage',
      'Landlord liability (multi-unit)',
      'Delivery-worker bite',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `Long Beach is a dense, renter-heavy port city where much of the housing is multi-unit, so its bite claims turn heavily on renter\u2019s coverage and landlord exposure. ${STRICT} A bite on a sidewalk, in a shared apartment area, or while lawfully visiting a unit generally triggers the owner\u2019s strict liability without proof the dog was known to be dangerous. ${COVERAGE} In an apartment building, a landlord who knew a tenant\u2019s dog was dangerous and could have acted can share liability, so the building\u2019s complaint history matters alongside the owner\u2019s renter\u2019s policy. ${NON_BITE} Long Beach runs its own Animal Care Services agency, separate from Los Angeles County, and its bite and dangerous-dog records can corroborate a claim, so reporting the bite to the right agency matters. The ordinary two-year personal-injury deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Where the bite happened \u2014 a unit, shared area, or sidewalk',
        'Whether you were lawfully present at the location',
        'The dog owner\u2019s name and their renter\u2019s or homeowner\u2019s insurer',
        'In an apartment building, the landlord and any complaint history',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The Long Beach Animal Care Services report and any prior incidents',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies strict liability to a Long Beach apartment bite, pursues both the renter\u2019s policy and any landlord knowledge in a multi-unit building, and prompts to report to the city\u2019s own Animal Care Services rather than the county. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The dog\u2019s owner rents. Can the landlord be responsible too?',
        a: 'Sometimes. In Long Beach\u2019s multi-unit buildings a landlord can share liability, but generally only if the landlord actually knew the dog was dangerous and had the ability to remove or control it and did not. A complaint history can be important, alongside the owner\u2019s renter\u2019s insurance.',
      },
      {
        q: 'Where do I report a Long Beach dog bite?',
        a: 'Long Beach runs its own Animal Care Services agency, separate from Los Angeles County. Reporting the bite there creates the record that can corroborate a claim and document any prior incidents involving the dog.',
      },
      {
        q: 'Does the owner\u2019s clean prior record matter?',
        a: 'Generally no. California does not follow a \u201cone free bite\u201d rule; under section 3342 an owner is strictly liable for a bite even if the dog had never shown aggression.',
      },
      {
        q: 'The dog knocked me over but did not bite. Do I have a claim?',
        a: 'Possibly, under ordinary negligence rather than strict liability, based on the owner\u2019s failure to control the animal.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_DOGBITE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Dog Bite Claims',
    title: 'Oakland Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'Oakland\u2019s dense apartments and off-leash park culture shape its bite claims: strict liability usually applies, the owner\u2019s renter\u2019s policy often pays, and a landlord may be liable for a known dangerous dog.',
    psychology: 'I was bitten by a dog in Oakland, maybe at an off-leash park or an apartment, and do not know who pays.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland dog bite claim',
      'california dog bite strict liability law',
      'bitten by an off leash dog oakland',
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
      whyItMatters: `Oakland is a dense, renter-heavy East Bay city with strong off-leash culture around its regional parks and heavy delivery traffic, so bites happen in shared, public, and doorstep settings alike. ${STRICT} A bite in a park, on a sidewalk, or while lawfully visiting a building generally triggers the owner\u2019s strict liability without proof the dog was known to be dangerous. ${COVERAGE} Because much of Oakland is multi-unit rental housing, the renter\u2019s policy and any landlord knowledge of a dangerous dog are the central coverage questions. ${NON_BITE} Oakland Animal Services keeps bite and dangerous-dog records that can corroborate a claim, so reporting the bite matters. The ordinary two-year personal-injury deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Where the bite happened \u2014 a park, sidewalk, or building',
        'Whether you were lawfully present at the location',
        'The dog owner\u2019s name and their renter\u2019s or homeowner\u2019s insurer',
        'In an apartment building, the landlord and any complaint history',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The Oakland Animal Services report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies strict liability to an Oakland park or apartment bite so the owner\u2019s liability does not turn on the dog\u2019s prior record, and pursues the renter\u2019s policy and any landlord knowledge in a multi-unit building. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An off-leash dog bit me in a park. Is the owner liable even in an off-leash area?',
        a: 'Usually yes. California\u2019s strict-liability rule under Civil Code section 3342 applies to a bite in a public place while you are lawfully present, and an off-leash area does not change that. Whether the area allowed off-leash dogs may feed a comparative-fault argument but does not remove the owner\u2019s strict liability.',
      },
      {
        q: 'The dog\u2019s owner rents. Can the landlord be responsible too?',
        a: 'Sometimes. A landlord can share liability, but generally only if they actually knew the dog was dangerous and had the ability to remove or control it and did not act. A building complaint history can matter, alongside the owner\u2019s renter\u2019s insurance.',
      },
      {
        q: 'Does the owner\u2019s clean prior record matter?',
        a: 'Generally no. California does not follow a \u201cone free bite\u201d rule; under section 3342 an owner is strictly liable for a bite even if the dog had never shown aggression.',
      },
      {
        q: 'The dog knocked me over but did not bite. Do I have a claim?',
        a: 'Possibly, under ordinary negligence rather than strict liability, based on the owner\u2019s failure to control the animal.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const dogBiteCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_DOGBITE_SLUG]: {
    scenario: `A gig-delivery driver was bitten reaching a San Jose doorstep, and the owner insisted the dog was friendly. Because the driver was lawfully present, strict liability applied, and the homeowner\u2019s policy covered the wound care and scarring treatment. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; get the owner and any insurer.'],
      ['First days', 'Report the bite to animal services; obtain the report number.'],
      ['First weeks', 'The homeowner\u2019s or renter\u2019s policy, and any landlord exposure, identified.'],
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
      'Any landlord knowledge of a dangerous dog',
      'The severity and permanence of scarring',
      'The animal-services report and any prior incidents',
      'Whether the victim was a child',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Section 3342 removes the need to prove carelessness.' },
      { label: 'Coverage is the key', copy: 'The homeowner\u2019s or renter\u2019s policy usually pays.' },
      { label: 'Scarring matters', copy: 'Permanent, visible scars raise the stakes.' },
      { label: 'No free bite', copy: 'A clean prior record is not a defense in California.' },
    ],
    insuranceProblems: [
      'The owner\u2019s \u201cfriendly dog\u201d story is treated as a defense.',
      'The worker is wrongly blamed for entering the property.',
      'No animal-services report is ever made.',
      'A landlord\u2019s knowledge of a dangerous dog is never explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you lawfully on the property when bitten?' },
      { label: 'Step 2', question: 'Who owns the dog, and do they rent or own?' },
      { label: 'Step 3', question: 'Was the bite reported to animal services?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
  [FRESNO_DOGBITE_SLUG]: {
    scenario: `A meter reader was bitten by a loose dog on a Fresno route. The animal-control report and licensing records identified the owner, and their homeowner\u2019s policy covered the treatment. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; note the dog and direction it fled.'],
      ['First days', 'Report to animal control; seek help identifying the owner.'],
      ['First weeks', 'The owner and their homeowner\u2019s policy identified.'],
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
      'Whether the dog\u2019s owner can be identified',
      'Whether you were lawfully present or in a public place',
      'The owner\u2019s homeowner\u2019s coverage',
      'The severity and permanence of scarring',
      'The animal-control report and any prior incidents',
      'Whether the victim was a child',
    ],
    settlementValueDetails: [
      { label: 'Identify the owner', copy: 'Licensing and microchip records help.' },
      { label: 'Strict liability', copy: 'Section 3342 removes the need to prove carelessness.' },
      { label: 'Homeowner\u2019s pays', copy: 'High ownership makes coverage clearer once found.' },
      { label: 'No free bite', copy: 'A clean prior record is not a defense in California.' },
    ],
    insuranceProblems: [
      'The loose dog\u2019s owner is never identified.',
      'No animal-control report is ever made.',
      'The owner\u2019s \u201cgentle dog\u201d story is treated as a defense.',
      'The worker is wrongly blamed for entering the route.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the dog loose, and can the owner be identified?' },
      { label: 'Step 2', question: 'Were you lawfully present or in a public place?' },
      { label: 'Step 3', question: 'Was the bite reported to animal control?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
  [LB_DOGBITE_SLUG]: {
    scenario: `A visitor was bitten in the shared hallway of a Long Beach apartment building where prior complaints about the dog existed. The renter\u2019s policy responded and the building\u2019s complaint history opened landlord exposure. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; get the owner and any insurer.'],
      ['First days', 'Report the bite to Long Beach Animal Care Services; obtain the report.'],
      ['First weeks', 'The renter\u2019s policy and any landlord complaint history identified.'],
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
      'The owner\u2019s renter\u2019s coverage',
      'Any landlord knowledge of a dangerous dog in the building',
      'The severity and permanence of scarring',
      'The Animal Care Services report and any prior incidents',
      'Whether the victim was a child',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Section 3342 removes the need to prove carelessness.' },
      { label: 'Landlord may share', copy: 'A known dangerous dog in a building can add exposure.' },
      { label: 'Right agency', copy: 'Long Beach runs its own Animal Care Services.' },
      { label: 'Coverage is the key', copy: 'The renter\u2019s policy usually pays.' },
    ],
    insuranceProblems: [
      'The bite is reported to the county instead of Long Beach.',
      'The building\u2019s complaint history is never obtained.',
      'The owner\u2019s clean prior record is treated as a defense.',
      'The renter\u2019s policy is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where in the building did the bite happen?' },
      { label: 'Step 2', question: 'Who owns the dog, and do they rent?' },
      { label: 'Step 3', question: 'Were there prior complaints about the dog?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
  [OAK_DOGBITE_SLUG]: {
    scenario: `A resident was bitten by an off-leash dog in an Oakland regional park, and the owner argued the area allowed off-leash dogs. Strict liability still applied to the bite, the renter\u2019s policy responded, and the off-leash point only fed a modest comparative-fault argument. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; get the owner and any insurer.'],
      ['First days', 'Report the bite to Oakland Animal Services; obtain the report.'],
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
      'The Animal Services report and any prior incidents',
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
      'No Animal Services report is made.',
      'A building\u2019s complaint history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where did the bite happen, and were you lawfully there?' },
      { label: 'Step 2', question: 'Who owns the dog, and do they rent?' },
      { label: 'Step 3', question: 'Was the bite reported to Oakland Animal Services?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
}
