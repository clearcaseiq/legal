import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, dog-bite practice area (batch 3): city-specific dog-bite guides for
 * Riverside, San Bernardino, Bakersfield, and Anaheim, extending the batch-1 hub
 * (LA, SF, San Diego, Sacramento) and batch-2 (San Jose, Fresno, Long Beach,
 * Oakland) into the Inland Empire, Central Valley, and Orange County.
 *
 * Genuinely local context rather than interpolated copy:
 *  - Riverside: high single-family homeownership across the Inland Empire, heavy
 *    delivery traffic serving the warehouse economy, and many loose dogs.
 *  - San Bernardino: high dog ownership, loose and unlicensed dogs across a large
 *    county, and homeowner\u2019s coverage as the usual source of recovery.
 *  - Bakersfield: a Kern County hub with very high dog ownership, rural and
 *    agricultural properties, loose dogs, and heavy delivery/utility routes.
 *  - Anaheim: a dense mix of apartments and suburban homes in Orange County, with
 *    heavy tourist foot traffic and delivery volume around the resort district.
 *
 * California dog-bite law, applied accurately (identical to batches 1-2):
 *  - Civil Code section 3342 imposes strict liability on a dog owner for a bite in
 *    a public place or while the victim is lawfully on private property.
 *  - Exception for governmental police and military dogs used in the line of duty.
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

export const RIVERSIDE_DOGBITE_SLUG = '/riverside-dog-bite'
export const SANBERNARDINO_DOGBITE_SLUG = '/san-bernardino-dog-bite'
export const BAKERSFIELD_DOGBITE_SLUG = '/bakersfield-dog-bite'
export const ANAHEIM_DOGBITE_SLUG = '/anaheim-dog-bite'

export const dogBiteCityGuidePages3: LandingPage[] = [
  {
    slug: RIVERSIDE_DOGBITE_SLUG,
    category: 'Cities',
    cluster: 'Riverside Dog Bite Claims',
    title: 'Riverside Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'Riverside\u2019s suburban homes and heavy delivery traffic shape its bite claims: strict liability usually applies, and the owner\u2019s homeowner\u2019s policy typically pays.',
    psychology: 'I was bitten by a dog in Riverside \u2014 maybe delivering or by a loose dog \u2014 and do not know who pays.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside dog bite claim',
      'california dog bite strict liability law',
      'delivery driver bitten by a dog california',
      'does homeowners insurance cover a dog bite',
      'loose dog attack claim california',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Delivery-driver bite',
      'Homeowner\u2019s coverage',
      'Loose / unlicensed dog',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `Riverside dog-bite claims reflect the Inland Empire\u2019s pattern of high single-family homeownership and enormous delivery volume. A large share of serious bites happen to delivery, postal, and service workers lawfully at a doorstep, which places them squarely within California\u2019s strict-liability rule. ${STRICT} That matters because the owner\u2019s \u201cgentle dog\u201d story or a claim that the worker provoked the dog is usually beside the point once lawful presence and a bite are established. ${COVERAGE} Riverside\u2019s high homeownership usually makes the owner\u2019s homeowner\u2019s policy the source of recovery, though the region\u2019s many loose dogs can make identifying the owner the first challenge. ${NON_BITE} Riverside County animal-services agencies keep bite and dangerous-dog records that can corroborate a claim and help identify a loose dog\u2019s owner. The ordinary two-year deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Whether you were lawfully on the property when bitten',
        'Whether you were working (delivery, postal, service) at the time',
        'Whether the dog was loose and whether the owner can be identified',
        'The dog owner\u2019s name and their homeowner\u2019s or renter\u2019s insurer',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The animal-services report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies strict liability to a Riverside bite so a lawfully present worker is not sidetracked by a \u201cgentle dog\u201d story, helps pursue identification of a loose dog\u2019s owner through the animal-services record, and drives to the homeowner\u2019s coverage question. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was bitten while making a delivery. Do I have a claim even though I entered the property?',
        a: 'Usually yes. Delivery and postal workers are lawfully on the property to do their jobs, which places them within California\u2019s strict-liability rule under Civil Code section 3342. You generally need not prove the owner was careless or that the dog had bitten before.',
      },
      {
        q: 'A loose dog bit me and I do not know the owner. Do I have a claim?',
        a: 'Potentially, but identifying the owner is the first step. Strict liability attaches to the owner, so the animal-services report and any licensing or microchip records that identify the owner are central to pursuing the claim and their homeowner\u2019s coverage.',
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
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANBERNARDINO_DOGBITE_SLUG,
    category: 'Cities',
    cluster: 'San Bernardino Dog Bite Claims',
    title: 'San Bernardino Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Bernardino\u2019s high dog ownership and many loose dogs shape its bite claims: strict liability usually applies, and the owner\u2019s homeowner\u2019s policy typically pays.',
    psychology: 'I was bitten by a dog in San Bernardino, maybe a loose one or on a delivery, and do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino dog bite claim',
      'california dog bite strict liability law',
      'loose dog attack claim california',
      'bitten by a dog while delivering san bernardino',
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
      whyItMatters: `San Bernardino County has high dog ownership and a persistent problem of loose and unlicensed dogs across a vast county of suburban, rural, and desert communities, so bites frequently involve dogs running at large as well as bites at homes. ${STRICT} For a person bitten in a public place or lawfully on a property \u2014 including the delivery, postal, and utility workers who cover the county\u2019s spread-out routes \u2014 strict liability generally applies without proof the dog was known to be dangerous. ${COVERAGE} High single-family homeownership usually makes the owner\u2019s homeowner\u2019s policy the source of recovery, though identifying the owner of a loose dog can be the challenge. ${NON_BITE} County animal control keeps bite and dangerous-dog records that can corroborate a claim and help identify an owner. The ordinary two-year deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in San Bernardino County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ applies strict liability to a San Bernardino bite, helps pursue identification of a loose dog\u2019s owner through the animal-control record, and drives to the homeowner\u2019s coverage question. ${NOT_ADVICE}`,
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
    slug: BAKERSFIELD_DOGBITE_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield Dog Bite Claims',
    title: 'Bakersfield Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bakersfield\u2019s very high dog ownership and rural properties shape its bite claims: strict liability usually applies, and the owner\u2019s homeowner\u2019s policy typically pays.',
    psychology: 'I was bitten by a dog in Bakersfield, maybe a loose or rural dog, and do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield dog bite claim',
      'california dog bite strict liability law',
      'loose dog attack claim california',
      'bitten by a dog while delivering bakersfield',
      'does homeowners insurance cover a dog bite',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Loose / rural dog attack',
      'Homeowner\u2019s coverage',
      'Delivery / utility-worker bite',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `Bakersfield and Kern County have very high dog ownership and many rural and agricultural properties where dogs are kept loose as guard or working animals, so bites often involve dogs at large or on large properties, alongside the usual suburban and delivery-route bites. ${STRICT} For a person bitten in a public place or lawfully on a property \u2014 including the delivery, postal, and utility workers who cover long Valley routes \u2014 strict liability generally applies without proof the dog was known to be dangerous. ${COVERAGE} High homeownership usually makes the owner\u2019s homeowner\u2019s policy the source of recovery, though identifying the owner of a loose or rural dog can be the challenge. ${NON_BITE} Kern County animal control keeps bite and dangerous-dog records that can corroborate a claim and help identify an owner. The ordinary two-year deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'Where the bite happened and whether the dog was loose or on a rural property',
        'Whether you were lawfully present or in a public place',
        'The dog owner\u2019s identity and their homeowner\u2019s insurer',
        'Any effort by animal control to identify a loose dog\u2019s owner',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The animal-control report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies strict liability to a Bakersfield bite, helps pursue identification of a loose or rural dog\u2019s owner through the animal-control record, and drives to the homeowner\u2019s coverage question. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A loose or rural dog bit me and I do not know the owner. Do I have a claim?',
        a: 'Potentially, but identifying the owner is the first step. Strict liability under Civil Code section 3342 attaches to the owner, so the animal-control report and any licensing or microchip records that identify the owner are central to pursuing the claim and their homeowner\u2019s coverage.',
      },
      {
        q: 'I was bitten while delivering or reading a meter. Am I covered?',
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
    slug: ANAHEIM_DOGBITE_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Dog Bite Claims',
    title: 'Anaheim Dog Bite Claims',
    eyebrow: 'California local injury guide',
    description:
      'Anaheim\u2019s mix of apartments and suburban homes shapes its bite claims: strict liability usually applies, and the owner\u2019s homeowner\u2019s or renter\u2019s policy typically pays, with landlord exposure in multi-unit housing.',
    psychology: 'I was bitten by a dog in Anaheim, maybe at an apartment or while visiting, and do not know who pays.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim dog bite claim',
      'california dog bite strict liability law',
      'landlord liability dog bite apartment california',
      'does renters insurance cover a dog bite',
      'bitten by a dog at an apartment anaheim',
    ],
    signals: [
      'Strict liability (Civ. Code 3342)',
      'Renter\u2019s or homeowner\u2019s coverage',
      'Landlord liability (multi-unit)',
      'Delivery-worker bite',
      'Two-year deadline',
      'Non-bite (negligence) injury',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s bite claims reflect a dense Orange County mix of apartment complexes and suburban single-family homes, plus heavy tourist foot traffic and delivery volume around the resort district. ${STRICT} A bite on a sidewalk, in a shared apartment area, or while lawfully visiting a home or unit generally triggers the owner\u2019s strict liability without proof the dog was known to be dangerous. ${COVERAGE} In an apartment complex, that means examining both the owner\u2019s renter\u2019s policy and any landlord knowledge of a dangerous dog; in the suburbs, the homeowner\u2019s policy is usually the clearer source. ${NON_BITE} Orange County animal-services agencies keep bite and dangerous-dog records that can corroborate a claim. The ordinary two-year deadline applies (Code of Civil Procedure section 335.1), and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Where the bite happened \u2014 a home, unit, shared area, or sidewalk',
        'Whether you were lawfully present at the location',
        'The dog owner\u2019s name and their renter\u2019s or homeowner\u2019s insurer',
        'In an apartment, the landlord and any knowledge of a dangerous dog',
        'Whether the injury was a bite or a non-bite (knock-down) injury',
        'The animal-services report and any prior-incident records',
        'Photographs of the wounds and the location',
        'Medical treatment, including any rabies protocol and scarring care',
      ],
      howClearCaseHelps: `ClearCaseIQ applies strict liability to an Anaheim bite across the apartment and suburban scenarios, pursues both the renter\u2019s or homeowner\u2019s policy and any landlord exposure in multi-unit housing, and prompts to secure the animal-services record. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The dog owner rents an apartment. Who pays?',
        a: 'Most often the owner\u2019s renter\u2019s insurance liability coverage. A landlord can also be liable, but generally only if they actually knew the dog was dangerous and could have removed or controlled it and did not.',
      },
      {
        q: 'I was bitten while making a delivery. Do I have a claim even though I entered the property?',
        a: 'Usually yes. Delivery and postal workers are lawfully on the property to do their jobs, which places them within California\u2019s strict-liability rule under Civil Code section 3342. You generally need not prove the owner was careless.',
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
]

export const dogBiteCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIVERSIDE_DOGBITE_SLUG]: {
    scenario: `A delivery driver was bitten reaching a Riverside doorstep, and the owner insisted the dog was gentle. Because the driver was lawfully present, strict liability applied, and the owner\u2019s homeowner\u2019s policy covered the wound care and scarring treatment. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; get the owner and any insurer.'],
      ['First days', 'Report the bite to animal services; obtain the report number.'],
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
      'Whether a loose dog\u2019s owner can be identified',
      'The owner\u2019s homeowner\u2019s or renter\u2019s coverage',
      'The severity and permanence of scarring',
      'The animal-services report and any prior incidents',
      'Whether the victim was a child',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Section 3342 removes the need to prove carelessness.' },
      { label: 'Homeowner\u2019s pays', copy: 'High ownership makes coverage clearer once found.' },
      { label: 'Identify the owner', copy: 'Loose-dog cases turn on identification.' },
      { label: 'No free bite', copy: 'A clean prior record is not a defense in California.' },
    ],
    insuranceProblems: [
      'The owner\u2019s \u201cgentle dog\u201d story is treated as a defense.',
      'A loose dog\u2019s owner is never identified.',
      'No animal-services report is ever made.',
      'The worker is wrongly blamed for entering the property.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you lawfully on the property when bitten?' },
      { label: 'Step 2', question: 'Was the dog loose, and can the owner be identified?' },
      { label: 'Step 3', question: 'Was the bite reported to animal services?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
  [SANBERNARDINO_DOGBITE_SLUG]: {
    scenario: `A utility worker was bitten by a loose dog on a San Bernardino route. The animal-control report and licensing records identified the owner, and their homeowner\u2019s policy covered the treatment. ${NOT_ADVICE}`,
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
  [BAKERSFIELD_DOGBITE_SLUG]: {
    scenario: `A postal carrier was bitten by a dog kept loose on a rural Bakersfield property. Because the carrier was lawfully on the route, strict liability applied, and the owner\u2019s homeowner\u2019s policy covered the treatment and scarring care. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; note the property and dog.'],
      ['First days', 'Report to animal control; obtain the report number.'],
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
      'Whether you were lawfully present when bitten',
      'Whether a loose or rural dog\u2019s owner can be identified',
      'The owner\u2019s homeowner\u2019s coverage',
      'The severity and permanence of scarring',
      'The animal-control report and any prior incidents',
      'Whether the victim was a child',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Section 3342 removes the need to prove carelessness.' },
      { label: 'Homeowner\u2019s pays', copy: 'High ownership makes coverage clearer once found.' },
      { label: 'Identify the owner', copy: 'Loose and rural dogs turn on identification.' },
      { label: 'No free bite', copy: 'A clean prior record is not a defense in California.' },
    ],
    insuranceProblems: [
      'A loose or rural dog\u2019s owner is never identified.',
      'The owner\u2019s \u201cgentle dog\u201d story is treated as a defense.',
      'No animal-control report is ever made.',
      'The worker is wrongly blamed for entering the property.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you lawfully on the property when bitten?' },
      { label: 'Step 2', question: 'Was the dog loose or on a rural property?' },
      { label: 'Step 3', question: 'Was the bite reported to animal control?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
  [ANAHEIM_DOGBITE_SLUG]: {
    scenario: `A visitor was bitten in the shared courtyard of an Anaheim apartment complex where the dog had prior complaints. The owner\u2019s renter\u2019s policy responded and the complaint history opened landlord exposure. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the wounds and location; get the owner and any insurer.'],
      ['First days', 'Report the bite to animal services; obtain the report.'],
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
      'The owner\u2019s renter\u2019s or homeowner\u2019s coverage',
      'Any landlord knowledge of a dangerous dog',
      'The severity and permanence of scarring',
      'The animal-services report and any prior incidents',
      'Whether the victim was a child',
    ],
    settlementValueDetails: [
      { label: 'Strict liability', copy: 'Section 3342 removes the need to prove carelessness.' },
      { label: 'Landlord may share', copy: 'A known dangerous dog in a complex adds exposure.' },
      { label: 'Coverage is the key', copy: 'The renter\u2019s or homeowner\u2019s policy usually pays.' },
      { label: 'No free bite', copy: 'A clean prior record is not a defense in California.' },
    ],
    insuranceProblems: [
      'The building\u2019s complaint history is never obtained.',
      'The owner\u2019s clean prior record is treated as a defense.',
      'No animal-services report is ever made.',
      'The renter\u2019s policy is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where did the bite happen \u2014 a home, unit, or shared area?' },
      { label: 'Step 2', question: 'Who owns the dog, and do they rent or own?' },
      { label: 'Step 3', question: 'Were there prior complaints about the dog?' },
      { label: 'Step 4', question: 'Is there scarring or a child victim?' },
    ],
  },
}
