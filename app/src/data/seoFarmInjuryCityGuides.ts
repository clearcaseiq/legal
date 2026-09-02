import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, agricultural / farm-injury practice area: location-specific guides
 * for California\u2019s agricultural heartland \u2014 Fresno, Bakersfield, Salinas, and
 * Modesto.
 *
 * A farm or agricultural worker hurt on the job is usually limited to workers\u2019
 * compensation against the employer, but a separate third-party claim \u2014 against
 * the manufacturer of a defective tractor or harvester, a chemical or pesticide
 * maker or applicator, another contractor, or a property owner \u2014 can recover
 * damages that comp does not. This is a distinct claim type, carefully scoped to
 * third-party liability rather than a claim against the employer, and it is
 * distinct from a general warehouse claim.
 *
 * Local context, genuine rather than interpolated:
 *  - Fresno: the country\u2019s leading agricultural county, with diverse crops,
 *    heavy machinery use, and extreme summer heat.
 *  - Bakersfield (Kern): a major agricultural and oil county, with grapes,
 *    almonds, machinery, and significant pesticide use.
 *  - Salinas (Monterey): the \u201cSalad Bowl,\u201d dominated by lettuce and berry
 *    harvesting, mechanized harvest equipment, and farm-labor-contractor crews.
 *  - Modesto (Stanislaus): almonds, dairy, and nut-processing operations.
 *
 * Applied accurately:
 *  - Workers\u2019 compensation is generally the exclusive remedy against the
 *    employer (Labor Code section 3602); agricultural workers are covered by
 *    comp. It does not bar a claim against a negligent third party.
 *  - A defective tractor (for example, one lacking rollover protection), an
 *    unguarded power-take-off (PTO) shaft, or a defective harvester can support a
 *    strict product-liability claim against the manufacturer.
 *  - Pesticide and chemical exposure can support claims against the chemical
 *    manufacturer or a negligent applicator, alongside Department of Pesticide
 *    Regulation requirements.
 *  - California\u2019s Cal/OSHA heat-illness standard requires shade, water, and rest
 *    breaks; a heat-illness injury can implicate the employer and, where a farm-
 *    labor contractor or another entity controlled conditions, a third party.
 *  - Farm-labor-contractor arrangements complicate who the \u201cemployer\u201d is under
 *    the special-employer doctrine, an analysis that must be done early. A third-
 *    party recovery is subject to the workers\u2019-comp lien; comparative negligence
 *    applies.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a third-party claim exists alongside workers\u2019 compensation, and who counts as an employer versus a third party, depend on facts a licensed California attorney should review promptly.'

const COMP_THIRD =
  'Workers\u2019 compensation is generally the exclusive remedy against your employer (Labor Code section 3602), and agricultural workers are covered by it regardless of fault. But comp does not bar a separate claim against a negligent third party who is not your employer \u2014 and that third-party claim can recover damages, such as full pain and suffering, that workers\u2019 compensation does not.'

const EQUIPMENT =
  'Farm machinery causes many of the most serious injuries. A tractor that lacks rollover protection (ROPS), an unguarded power-take-off (PTO) shaft, or a defective harvester or auger can support a strict product-liability claim against the manufacturer or distributor for a design or manufacturing defect or a failure to warn \u2014 without proof of ordinary negligence. Preserving the machine and its maintenance history is essential.'

const CHEMICAL =
  'Pesticide and chemical exposure \u2014 from drift, mixing, or entering a field too soon after application \u2014 can support claims against the chemical manufacturer for a defective or inadequately labeled product, or against a negligent applicator. California\u2019s Department of Pesticide Regulation and county agricultural-commissioner records can document the application and any violations.'

const HEAT =
  'California\u2019s Cal/OSHA heat-illness prevention standard requires employers to provide shade, cool water, and rest breaks and to train and monitor workers. A serious heat-illness injury can implicate the employer through comp and, where a farm-labor contractor or another entity controlled the conditions, a third party \u2014 and Cal/OSHA citation records can document the failure.'

const LABOR_CONTRACTOR =
  'Farm work is often staffed through a farm-labor contractor, which complicates who counts as the \u201cemployer.\u201d Under the special-employer doctrine, the grower or another entity may be an employer for comp purposes or may be a third party you can pursue \u2014 an analysis that must be done early. A third-party recovery is subject to the workers\u2019-compensation lien, and pure comparative negligence applies.'

export const FRE_FARM_SLUG = '/fresno-farm-injury-claim'
export const BAK_FARM_SLUG = '/bakersfield-farm-injury-claim'
export const SAL_FARM_SLUG = '/salinas-farm-injury-claim'
export const MOD_FARM_SLUG = '/modesto-farm-injury-claim'

export const farmInjuryCityGuidePages: LandingPage[] = [
  {
    slug: FRE_FARM_SLUG,
    category: 'Cities',
    cluster: 'Fresno Farm & Agricultural Injury Claims',
    title: 'Fresno Farm & Agricultural Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Fresno-area farm \u2014 by machinery, chemicals, or heat? Beyond workers\u2019 comp, a third-party claim against an equipment or chemical maker can recover much more.',
    psychology: 'I was hurt doing farm work near Fresno and I do not know if I have a claim beyond workers\u2019 comp.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno farm injury lawyer',
      'tractor rollover injury claim california',
      'pesticide exposure lawsuit california',
      'farm injury beyond workers comp california',
      'agricultural equipment injury california',
    ],
    signals: [
      'Comp exclusivity (3602)',
      'Third-party claim',
      'Defective machinery (product liability)',
      'Pesticide / chemical exposure',
      'Heat-illness standard (Cal/OSHA)',
      'Farm-labor contractor / special employer',
    ],
    sections: {
      whyItMatters: `Fresno is the country\u2019s leading agricultural county, with diverse crops, heavy machinery use, and extreme summer heat \u2014 the setting for serious farm injuries where a third-party claim often exists alongside workers\u2019 compensation. ${COMP_THIRD} ${EQUIPMENT} ${CHEMICAL} ${HEAT} ${LABOR_CONTRACTOR} Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The machinery involved (tractor, harvester, PTO, auger) and its maker',
        'Any pesticide or chemical exposure and the product and applicator',
        'Whether a farm-labor contractor placed you',
        'Every non-employer party (equipment maker, applicator, grower, owner)',
        'Preservation of the machine before repair or return',
        'Cal/OSHA and Department of Pesticide Regulation records',
        'The workers\u2019-comp claim and its lien',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the workers\u2019-comp claim from a potential third-party claim, identifies the equipment or chemical maker and any non-employer parties on a Fresno-area farm, moves to preserve the machine, and gathers the Cal/OSHA and pesticide records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have workers\u2019 comp. Can I also bring a claim?',
        a: 'Possibly. Workers\u2019 compensation is generally the exclusive remedy against your employer (Labor Code section 3602), but it does not bar a claim against a negligent third party who is not your employer \u2014 such as an equipment or chemical manufacturer. That claim can recover damages comp does not, including full pain and suffering.',
      },
      {
        q: 'A tractor rolled over or a PTO caught me. Who can I claim against?',
        a: 'Where defective machinery caused the injury \u2014 a tractor lacking rollover protection, an unguarded PTO shaft, a defective harvester \u2014 its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine is essential.',
      },
      {
        q: 'I was exposed to pesticides. Is that a claim?',
        a: 'It can be. Pesticide or chemical exposure can support claims against the chemical manufacturer for a defective or inadequately labeled product, or against a negligent applicator. Department of Pesticide Regulation and county agricultural-commissioner records can document the application and any violations.',
      },
      {
        q: 'A farm-labor contractor hired me. Does that change things?',
        a: 'It can. Under the special-employer doctrine, the grower or another entity may be an employer for comp purposes or may be a third party you can pursue. This must be analysed early.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the parties, and the evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAK_FARM_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield Farm & Agricultural Injury Claims',
    title: 'Bakersfield Farm & Agricultural Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Kern County farm \u2014 by machinery, pesticides, or heat? Beyond workers\u2019 comp, a third-party claim against an equipment or chemical maker can recover much more.',
    psychology: 'I was hurt doing farm work near Bakersfield and I do not know if I have a claim beyond workers\u2019 comp.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield farm injury lawyer',
      'tractor rollover injury claim california',
      'pesticide exposure lawsuit california',
      'farm injury beyond workers comp california',
      'agricultural equipment injury california',
    ],
    signals: [
      'Comp exclusivity (3602)',
      'Third-party claim',
      'Defective machinery (product liability)',
      'Pesticide / chemical exposure',
      'Heat-illness standard (Cal/OSHA)',
      'Farm-labor contractor / special employer',
    ],
    sections: {
      whyItMatters: `Kern County is a major agricultural producer \u2014 grapes, almonds, citrus \u2014 with heavy machinery and significant pesticide use, alongside oilfield operations, so a Bakersfield-area farm injury can involve defective equipment, chemical exposure, or extreme heat, each opening a possible third-party claim. ${COMP_THIRD} ${EQUIPMENT} ${CHEMICAL} ${HEAT} ${LABOR_CONTRACTOR} Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'The machinery involved and its manufacturer',
        'Any pesticide or chemical exposure and the product and applicator',
        'Whether a farm-labor contractor placed you',
        'Every non-employer party on site',
        'Preservation of the machine before repair or return',
        'Cal/OSHA and Department of Pesticide Regulation records',
        'The workers\u2019-comp claim and its lien',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the workers\u2019-comp claim from a potential third-party claim, identifies the equipment or chemical maker and any non-employer parties on a Kern County farm, moves to preserve the machine, and gathers the Cal/OSHA and pesticide records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have workers\u2019 comp. Can I also bring a claim?',
        a: 'Possibly. Workers\u2019 compensation is generally the exclusive remedy against your employer (Labor Code section 3602), but it does not bar a claim against a negligent third party who is not your employer \u2014 such as an equipment or chemical manufacturer. That claim can recover damages comp does not.',
      },
      {
        q: 'A tractor rolled over or a machine caught me. Who can I claim against?',
        a: 'Where defective machinery caused the injury, its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine and its maintenance history is essential.',
      },
      {
        q: 'I was exposed to pesticides. Is that a claim?',
        a: 'It can be. Pesticide exposure can support claims against the chemical manufacturer for a defective or inadequately labeled product, or against a negligent applicator. Department of Pesticide Regulation and county agricultural-commissioner records can document the application and any violations.',
      },
      {
        q: 'I got heat illness working in the fields. Is that actionable?',
        a: 'It can be. California\u2019s Cal/OSHA heat-illness standard requires shade, water, and rest breaks. A serious heat-illness injury can implicate the employer through comp and, where a farm-labor contractor or another entity controlled conditions, a third party. Cal/OSHA citation records can document the failure.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the parties, and the evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAL_FARM_SLUG,
    category: 'Cities',
    cluster: 'Salinas Valley Farm & Agricultural Injury Claims',
    title: 'Salinas Valley Farm & Agricultural Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt harvesting in the Salinas Valley \u2014 by machinery, a labor-contractor crew, or heat? Beyond workers\u2019 comp, a third-party claim can recover much more.',
    psychology: 'I was hurt harvesting near Salinas and I do not know if I have a claim beyond workers\u2019 comp.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'salinas farm injury lawyer',
      'harvest machine injury claim california',
      'farm labor contractor injury california',
      'farm injury beyond workers comp california',
      'agricultural equipment injury california',
    ],
    signals: [
      'Comp exclusivity (3602)',
      'Third-party claim',
      'Harvest machinery (product liability)',
      'Farm-labor contractor / special employer',
      'Heat-illness standard (Cal/OSHA)',
      'Pesticide / chemical exposure',
    ],
    sections: {
      whyItMatters: `The Salinas Valley is the \u201cSalad Bowl,\u201d dominated by lettuce and berry harvesting done with mechanized harvest equipment and by farm-labor-contractor crews \u2014 so injuries here frequently raise both defective-equipment questions and the tangled question of who the employer really is. ${COMP_THIRD} ${EQUIPMENT} ${LABOR_CONTRACTOR} ${HEAT} ${CHEMICAL} Civil cases are filed in Monterey County Superior Court.`,
      whatToTrack: [
        'The harvest machinery or conveyor involved and its maker',
        'Whether a farm-labor contractor placed you, and who the grower is',
        'Every non-employer party on site',
        'Preservation of the machine before repair or return',
        'Any pesticide or chemical exposure and the product and applicator',
        'Cal/OSHA and Department of Pesticide Regulation records',
        'The workers\u2019-comp claim and its lien',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles the farm-labor-contractor and grower relationships to find the right defendants, separates the workers\u2019-comp claim from a third-party claim, moves to preserve harvest equipment, and gathers the Cal/OSHA and pesticide records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A farm-labor contractor hired me. Who is actually the employer?',
        a: 'That is often the central question. Under the special-employer doctrine, the grower or another entity may be an employer for comp purposes or may be a third party you can pursue. Untangling the contractor-grower relationship early determines who you can claim against beyond comp.',
      },
      {
        q: 'I already have workers\u2019 comp. Can I also bring a claim?',
        a: 'Possibly. Workers\u2019 compensation is generally the exclusive remedy against your employer (Labor Code section 3602), but it does not bar a claim against a negligent third party who is not your employer \u2014 such as an equipment manufacturer or a separate contractor. That claim can recover damages comp does not.',
      },
      {
        q: 'A harvest machine caught or struck me. Who can I claim against?',
        a: 'Where defective harvest machinery caused the injury, its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine is essential.',
      },
      {
        q: 'I got heat illness in the fields. Is that actionable?',
        a: 'It can be. California\u2019s Cal/OSHA heat-illness standard requires shade, water, and rest breaks. A serious heat-illness injury can implicate the employer and, where a labor contractor or another entity controlled conditions, a third party.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the parties, and the evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: MOD_FARM_SLUG,
    category: 'Cities',
    cluster: 'Modesto Farm & Agricultural Injury Claims',
    title: 'Modesto Farm & Agricultural Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Modesto-area farm, dairy, or nut-processing operation? Beyond workers\u2019 comp, a third-party claim against an equipment maker or contractor can recover much more.',
    psychology: 'I was hurt on a Modesto-area farm or processing operation and I do not know if I have a claim beyond workers\u2019 comp.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'modesto farm injury lawyer',
      'nut processing machine injury california',
      'dairy injury third party claim california',
      'farm injury beyond workers comp california',
      'agricultural equipment injury california',
    ],
    signals: [
      'Comp exclusivity (3602)',
      'Third-party claim',
      'Processing & farm machinery (product liability)',
      'Pesticide / chemical exposure',
      'Heat-illness standard (Cal/OSHA)',
      'Farm-labor contractor / special employer',
    ],
    sections: {
      whyItMatters: `Modesto anchors an almond, dairy, and nut-processing region, so injuries here can involve field machinery, dairy equipment, or nut-processing lines \u2014 and a defective machine or a separate contractor can support a third-party claim beyond workers\u2019 compensation against the employer. ${COMP_THIRD} ${EQUIPMENT} ${CHEMICAL} ${HEAT} ${LABOR_CONTRACTOR} Civil cases are filed in Stanislaus County Superior Court.`,
      whatToTrack: [
        'The machine or equipment involved (field, dairy, processing) and its maker',
        'Any pesticide or chemical exposure and the product and applicator',
        'Whether a farm-labor contractor placed you',
        'Every non-employer party on site',
        'Preservation of the machine before repair or return',
        'Cal/OSHA and Department of Pesticide Regulation records',
        'The workers\u2019-comp claim and its lien',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the workers\u2019-comp claim from a potential third-party claim, identifies the manufacturer of field, dairy, or processing equipment and any non-employer parties near Modesto, moves to preserve the machine, and gathers the Cal/OSHA and pesticide records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have workers\u2019 comp. Can I also bring a claim?',
        a: 'Possibly. Workers\u2019 compensation is generally the exclusive remedy against your employer (Labor Code section 3602), but it does not bar a claim against a negligent third party who is not your employer \u2014 such as an equipment manufacturer or another contractor. That claim can recover damages comp does not, including full pain and suffering.',
      },
      {
        q: 'A processing line or field machine injured me. Who can I claim against?',
        a: 'Where defective machinery caused the injury \u2014 an unguarded processing line, a defective field machine, or dairy equipment \u2014 its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine is essential.',
      },
      {
        q: 'A farm-labor contractor hired me. Does that change things?',
        a: 'It can. Under the special-employer doctrine, the grower or another entity may be an employer for comp purposes or may be a third party you can pursue. This must be analysed early.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The machine or equipment itself \u2014 preserved before it is repaired or returned \u2014 plus its maintenance logs, any Cal/OSHA citation records, and, for chemical exposure, Department of Pesticide Regulation records. This evidence disappears quickly, so acting fast is critical.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the parties, and the evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const farmInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [FRE_FARM_SLUG]: {
    scenario: `A Fresno-area worker was pinned when a tractor without rollover protection tipped. Beyond the workers\u2019-comp claim, preserving the tractor opened a product-liability claim against the manufacturer. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Open the workers\u2019-comp claim; identify the machine and its maker.'],
      ['First weeks', 'Demand preservation of the machine and maintenance logs.'],
      ['Assessment', 'Map non-employer parties; analyse labor-contractor status.'],
      ['Longer term', 'Product-liability and comp-lien issues developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp covers the employer; others may be liable.'],
      ['Defect', 'A tractor without ROPS points to the manufacturer.'],
      ['Special employer', 'Labor-contractor status must be analysed.'],
      ['Preserve', 'The machine and logs must be secured.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a third party beyond the employer is liable',
      'Whether the machinery was defective',
      'Whether the machine and logs were preserved',
      'How the labor-contractor/special-employer analysis resolves',
      'How the comp lien is negotiated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'Third-party claims recover more than comp.' },
      { label: 'Product liability', copy: 'Defective machines mean strict liability.' },
      { label: 'Preserve the machine', copy: 'Evidence disappears when it is returned.' },
      { label: 'Mind the lien', copy: 'A comp lien must be negotiated.' },
    ],
    insuranceProblems: [
      'The machine is repaired or returned before it is preserved.',
      'Only the comp claim is pursued, missing the third-party claim.',
      'The labor-contractor/special-employer analysis is done wrong.',
      'The Cal/OSHA and pesticide records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What machine or chemical was involved?' },
      { label: 'Step 2', question: 'Did a farm-labor contractor place you?' },
      { label: 'Step 3', question: 'Has the machine been preserved?' },
      { label: 'Step 4', question: 'Who else, besides your employer, was on site?' },
    ],
  },
  [BAK_FARM_SLUG]: {
    scenario: `A Kern County worker developed serious symptoms after pesticide drift reached the field. The Department of Pesticide Regulation records documented the application, supporting a claim against the applicator and chemical maker. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Open the workers\u2019-comp claim; identify the chemical and applicator.'],
      ['First weeks', 'Request DPR and county agricultural-commissioner records.'],
      ['Assessment', 'Map non-employer parties; analyse labor-contractor status.'],
      ['Longer term', 'Chemical-exposure and comp-lien issues developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp covers the employer; others may be liable.'],
      ['Exposure source', 'The chemical maker and applicator may be liable.'],
      ['Records', 'DPR and commissioner records document the application.'],
      ['Special employer', 'Labor-contractor status must be analysed.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the symptoms to the exposure.' },
      { label: 'Testing', copy: 'Medical testing documents the exposure.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the chemical maker or applicator is liable',
      'Whether DPR and commissioner records document a violation',
      'Whether a defective machine also contributed',
      'How the labor-contractor/special-employer analysis resolves',
      'How the comp lien is negotiated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'Third-party claims recover more than comp.' },
      { label: 'Records prove it', copy: 'DPR records document the application.' },
      { label: 'Multiple defendants', copy: 'Chemical maker and applicator may answer.' },
      { label: 'Mind the lien', copy: 'A comp lien must be negotiated.' },
    ],
    insuranceProblems: [
      'The DPR and commissioner records are never requested.',
      'Only the comp claim is pursued, missing the third-party claim.',
      'The applicator or chemical maker is never identified.',
      'The exposure is not medically documented early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What chemical or machine was involved?' },
      { label: 'Step 2', question: 'Was there pesticide drift or application nearby?' },
      { label: 'Step 3', question: 'Did a farm-labor contractor place you?' },
      { label: 'Step 4', question: 'Has the exposure been medically documented?' },
    ],
  },
  [SAL_FARM_SLUG]: {
    scenario: `A Salinas Valley harvester was injured on a mechanized crew run by a farm-labor contractor. Untangling the contractor-grower relationship revealed a third party the worker could pursue beyond comp. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Open the workers\u2019-comp claim; identify the contractor and grower.'],
      ['First weeks', 'Preserve the harvest machine; map the employment relationships.'],
      ['Assessment', 'Resolve who is the employer and who is a third party.'],
      ['Longer term', 'Third-party liability and comp-lien issues developed.'],
    ],
    severityLadder: [
      ['Who is the employer', 'Contractor vs. grower is often the key question.'],
      ['Comp vs. third party', 'Comp covers the employer; others may be liable.'],
      ['Defect', 'A faulty harvest machine points to the manufacturer.'],
      ['Preserve', 'The machine must be secured.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'How the contractor/grower/special-employer analysis resolves',
      'Whether a third party beyond the employer is liable',
      'Whether the harvest machine was defective',
      'Whether the machine was preserved',
      'How the comp lien is negotiated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Untangle the roles', copy: 'Contractor vs. grower decides the defendants.' },
      { label: 'Beyond comp', copy: 'Third-party claims recover more than comp.' },
      { label: 'Product liability', copy: 'Defective harvesters mean strict liability.' },
      { label: 'Mind the lien', copy: 'A comp lien must be negotiated.' },
    ],
    insuranceProblems: [
      'The contractor-grower relationship is never untangled.',
      'Only the comp claim is pursued, missing the third-party claim.',
      'The harvest machine is returned before it is preserved.',
      'The Cal/OSHA records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a farm-labor contractor place you?' },
      { label: 'Step 2', question: 'Who is the grower or landowner?' },
      { label: 'Step 3', question: 'What harvest machine was involved?' },
      { label: 'Step 4', question: 'Has the machine been preserved?' },
    ],
  },
  [MOD_FARM_SLUG]: {
    scenario: `A Modesto-area worker\u2019s arm was caught in an unguarded nut-processing line. The workers\u2019-comp claim covered the employer, while preserving the line opened a product-liability claim against its manufacturer. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Open the workers\u2019-comp claim; identify the machine and its maker.'],
      ['First weeks', 'Demand preservation of the machine and maintenance logs.'],
      ['Assessment', 'Map non-employer parties; analyse labor-contractor status.'],
      ['Longer term', 'Product-liability and comp-lien issues developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp covers the employer; others may be liable.'],
      ['Defect', 'An unguarded line points to the manufacturer.'],
      ['Special employer', 'Labor-contractor status must be analysed.'],
      ['Preserve', 'The machine and logs must be secured.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a third party beyond the employer is liable',
      'Whether the machine was defective or unguarded',
      'Whether the machine and logs were preserved',
      'How the labor-contractor/special-employer analysis resolves',
      'How the comp lien is negotiated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'Third-party claims recover more than comp.' },
      { label: 'Product liability', copy: 'Unguarded machines mean strict liability.' },
      { label: 'Preserve the machine', copy: 'Evidence disappears when it is returned.' },
      { label: 'Mind the lien', copy: 'A comp lien must be negotiated.' },
    ],
    insuranceProblems: [
      'The processing line is repaired before it is preserved.',
      'Only the comp claim is pursued, missing the third-party claim.',
      'The labor-contractor/special-employer analysis is done wrong.',
      'The Cal/OSHA records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What machine or equipment was involved?' },
      { label: 'Step 2', question: 'Was it guarded, and had it malfunctioned before?' },
      { label: 'Step 3', question: 'Did a farm-labor contractor place you?' },
      { label: 'Step 4', question: 'Has the machine been preserved?' },
    ],
  },
}
