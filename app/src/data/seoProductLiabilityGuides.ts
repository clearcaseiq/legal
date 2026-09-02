import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The four product-liability (defective product) guides.
 *
 * California is a strict-liability state for defective products: an injured
 * person does not have to prove the manufacturer was careless, only that the
 * product was defective and caused the harm while used in a reasonably
 * foreseeable way. Most searchers do not know that, and it is the fact that
 * separates a defective-product claim from an ordinary negligence claim.
 *
 * Four pages cover the defective-product queries: value, liability (who is
 * responsible across the distribution chain and the three kinds of defect),
 * filing deadline (with the discovery rule that matters for latent defects),
 * and whether to hire a lawyer. No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A defective-product claim turns on the type of defect, the chain of sellers, and technical facts particular to your product, which a licensed California attorney can review.'

export const PRODUCT_VALUE_SLUG = '/how-much-is-a-defective-product-case-worth'
export const PRODUCT_LIABILITY_SLUG = '/who-is-liable-for-a-defective-product-in-california'
export const PRODUCT_SOL_SLUG = '/california-product-liability-statute-of-limitations'
export const PRODUCT_HIRE_SLUG = '/do-i-need-a-lawyer-for-a-defective-product-claim-in-california'

export const productLiabilityGuidePages: LandingPage[] = [
  {
    slug: PRODUCT_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Product Liability Claim Value',
    title: 'How Much Is a Defective Product Case Worth in California?',
    eyebrow: 'Product liability value guide',
    description:
      'A defective-product claim is worth your documented injuries, the strength of the proof that the product was defective, and how many solvent companies sit in the chain that sold it. The engineering proof, not the injury alone, is usually what decides the number.',
    psychology: 'A product injured me and I want to know what the claim is realistically worth.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a defective product case worth in California',
      'defective product injury settlement California',
      'what is a product liability claim worth',
      'can I sue for an injury from a defective product',
      'how are product liability damages calculated',
    ],
    signals: [
      'Injury severity',
      'Type of defect',
      'Product preserved as evidence',
      'Existence of a recall',
      'Number of solvent defendants',
      'Expert support',
    ],
    sections: {
      whyItMatters:
        'A defective-product claim is valued on the same layers as any injury claim — documented losses, the effect on your life, and collectability — but two features unique to product cases dominate the number. The first is that California applies strict liability, which changes the entire proof burden in the injured person\u2019s favor. You do not have to prove the manufacturer was careless; you have to prove the product was defective, that the defect existed when it left the defendant\u2019s hands, and that it caused your injury while you were using the product in a reasonably foreseeable way. That lower bar makes strong product claims valuable, but it comes with a catch: proving a defect almost always requires expert engineering or medical testimony and the physical product itself, which is why the second feature — evidence — so often sets the ceiling. A claim where the defective product has been preserved, and where an engineer can demonstrate the defect, is worth far more than an identical injury where the product was discarded and the defect can only be described. There is also a collectability advantage particular to product cases: strict liability reaches everyone in the chain of distribution — the manufacturer, the distributor, and the retailer that sold it — so even where the manufacturer is insolvent or overseas and unreachable, a solvent retailer or distributor may still be liable. The number of solvent defendants can matter as much as the injury. Recalls and prior incidents raise value too, because they help establish the defect and sometimes the defendant\u2019s knowledge of it, which can open the door to punitive damages in cases of conscious disregard for safety. Against all of that, the injury still anchors the economic and non-economic layers: a defect that caused a minor injury is a minor claim no matter how clear the defect, while a defect that caused burns, amputation, or a permanent disability is where these claims reach their largest values. The honest early questions are whether the product still exists, what kind of defect it was, and who in the chain can be reached.',
      whatToTrack: [
        'The product itself, preserved and unaltered — do not discard or repair it',
        'The packaging, manual, receipt, and any warning labels',
        'Photographs of the product, the defect, and the injury',
        'Where and when the product was bought, and from whom',
        'Whether the product has been recalled or had prior complaints',
        'Every provider seen, starting with the first visit after the injury',
        'How you were using the product when the injury happened',
        'The manufacturer, distributor, and retailer in the chain of sale',
      ],
      howClearCaseHelps:
        `ClearCaseIQ builds the range from your documented injuries and then weights it by the two things that move a product claim most — how provable the defect is and how many solvent defendants sit in the chain — rather than from an average. It flags the single most valuable early step, preserving the product, and separates a claim limited by lost evidence from one limited by the injury itself. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is there an average defective product settlement in California?',
        a: 'No usable one. Product claims range from modest to enormous depending on the severity of the injury, how clearly the defect can be proven, whether the product was preserved, and how many solvent companies are in the chain of sale. An average across such different cases tells you nothing about a specific claim.',
      },
      {
        q: 'Do I have to prove the company was careless?',
        a: 'Not for a strict-liability claim, which is the main advantage of a California product case. You have to prove the product was defective, that the defect existed when it left the defendant, and that it caused your injury during reasonably foreseeable use. You do not have to prove negligence, though a negligence theory can be added where it fits.',
      },
      {
        q: 'What happens if I threw the product away?',
        a: 'It seriously weakens the claim and can end it. Proving a defect usually requires the physical product and expert examination, so discarding, repairing, or altering it — even innocently — can amount to spoliation of evidence. Preserving the product exactly as it was after the injury is the single most valuable thing you can do.',
      },
      {
        q: 'Who can I recover from if the manufacturer is overseas?',
        a: 'Often the distributor or the retailer that sold the product. California strict liability reaches the whole chain of distribution, so an unreachable or insolvent manufacturer does not necessarily defeat the claim — a solvent seller in the chain may still be responsible, which is a major difference from many other injury claims.',
      },
      {
        q: 'Can I get punitive damages in a product case?',
        a: 'Sometimes. Where the evidence shows a company knew of a danger and consciously disregarded it — an ignored recall, buried complaints, a known design flaw left in the market — punitive damages may be available on top of compensatory damages. They are not routine and require clear proof of that state of mind.',
      },
    ],
  },
  {
    slug: PRODUCT_LIABILITY_SLUG,
    category: 'Liability',
    cluster: 'Product Liability',
    title: 'Who Is Liable for a Defective Product in California?',
    eyebrow: 'Product liability',
    description:
      'California strict liability reaches everyone in the chain that put a defective product in your hands — manufacturer, distributor, and retailer. The claim turns on which of three defect types applies: manufacturing, design, or failure to warn.',
    psychology: 'I want to know who is responsible for the product that injured me.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'who is responsible for a defective product in California',
      'can I sue the store for a defective product',
      'types of product defects California',
      'manufacturing vs design defect',
      'failure to warn product liability California',
    ],
    signals: [
      'Manufacturing defect',
      'Design defect',
      'Failure to warn',
      'Chain of distribution',
      'Foreseeable use',
      'Product alteration',
    ],
    sections: {
      whyItMatters:
        'California product liability is strict, which means the question is not whether a company was careless but whether the product was defective and who put it into the stream of commerce. Two things follow, and both work in the injured person\u2019s favor. First, liability reaches the entire chain of distribution. The manufacturer that made the product, the distributor or wholesaler that moved it, and the retailer that sold it can each be strictly liable for a defect, regardless of which one actually created it. That matters enormously in practice: when the manufacturer is overseas, dissolved, or judgment-proof, a solvent California retailer or distributor may still answer for the injury, so a claim that looks uncollectable against the maker can be very much alive against the seller. Second, the claim turns on establishing which of three kinds of defect applies, because each is proven differently. A manufacturing defect is where the individual product departed from its intended design — a flaw introduced in production, so this unit was dangerous even though the design was sound. A design defect is where the design itself is unreasonably dangerous, judged in California either by whether it performed as safely as an ordinary consumer would expect, or by weighing the risk of the design against the feasibility and cost of a safer alternative; this is the most technical and most contested category, and it is where expert engineering testimony does the heavy lifting. A failure-to-warn defect is where the product carried inadequate instructions or warnings about a non-obvious danger, so a product that is safe when used correctly becomes defective because the risk was never communicated. Around these sit the defenses. The defect must have existed when the product left the defendant\u2019s control, so a product that was substantially altered or misused in an unforeseeable way may fall outside the claim — though foreseeable misuse is still covered, which is a distinction insurers exploit. Comparative fault can reduce recovery if the user contributed to the injury. Establishing the defect type, mapping the chain of sellers, and preserving the product so an expert can examine it are the work that turns an injury into a claim.',
      whatToTrack: [
        'What the product is, its make, model, and any serial or lot number',
        'Whether the defect is in manufacture, design, or the warnings',
        'The manufacturer, distributor, and retailer in the chain of sale',
        'Whether the product was modified or repaired after purchase',
        'How the product was being used when the injury occurred',
        'The instructions and warnings that came with it',
        'Any recall, safety notice, or prior complaints about the product',
        'The preserved product itself, unaltered, for expert examination',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps identify which defect theory fits and maps the chain of sellers who may be liable, so a claim is not abandoned just because the manufacturer is unreachable. It also flags the facts that create defenses — alteration, unforeseeable misuse, a discarded product — so the strength of the claim is assessed on the evidence rather than on the injury alone. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the store that sold me a defective product?',
        a: 'Yes. California strict liability applies to every business in the chain of distribution, so the retailer that sold the product can be liable even though it did not make it. This is often how injured people recover when the manufacturer is overseas, out of business, or otherwise unreachable.',
      },
      {
        q: 'What are the three types of product defect?',
        a: 'A manufacturing defect, where the individual unit departed from its intended design; a design defect, where the design itself is unreasonably dangerous; and a failure to warn, where inadequate instructions or warnings left a non-obvious danger uncommunicated. Which type applies determines how the claim is proven and what evidence it needs.',
      },
      {
        q: 'How is a design defect proven in California?',
        a: 'California allows two approaches. The consumer-expectations test asks whether the product performed as safely as an ordinary consumer would expect. The risk-benefit test weighs the danger of the design against the feasibility and cost of a safer alternative, with the burden shifting to the manufacturer to justify the design. Design-defect claims are the most technical and rely heavily on expert testimony.',
      },
      {
        q: 'What if I was using the product in a way it was not meant to be used?',
        a: 'It depends on whether the use was foreseeable. Strict liability covers reasonably foreseeable uses and even foreseeable misuse, so an off-label use the maker could have anticipated may still be covered. A substantial alteration or a genuinely unforeseeable misuse can defeat or reduce the claim, which is a line insurers push hard.',
      },
      {
        q: 'Does a recall help my claim?',
        a: 'Often, yes. A recall can help establish that the product was defective and, depending on its timing and the company\u2019s knowledge, can support a claim that the danger was known and disregarded, which is relevant to punitive damages. A recall does not automatically win the case, but it is strong corroboration.',
      },
    ],
  },
  {
    slug: PRODUCT_SOL_SLUG,
    category: 'Statute of Limitations',
    cluster: 'Product Liability Filing Deadlines',
    title: 'California Product Liability Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the injury for a California defective-product claim — but the discovery rule matters more here than almost anywhere, because a product can injure you long before you realize the product was the cause.',
    psychology: 'I need to know how long I have to file a defective-product claim.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'how long do I have to sue for a defective product in California',
      'product liability statute of limitations California',
      'discovery rule product liability California',
      'is it too late to file a defective product claim',
    ],
    signals: [
      'Date of injury',
      'Date the cause was discovered',
      'Latent or delayed injury',
      'Product preserved',
      'Victim under 18',
      'Recall date',
    ],
    sections: {
      whyItMatters:
        'A California defective-product injury claim runs on the standard two-year personal-injury deadline, but the starting point is where product cases differ from most others, and the difference can be decisive. The two years generally runs from the date of injury — but the discovery rule can delay that start to when you discovered, or reasonably should have discovered, both the injury and its cause. Product injuries are exactly the situation the discovery rule exists for, because a product can harm you long before you connect the harm to the product. A component that fails and causes an injury on a specific day starts the clock plainly. But a medical device that slowly causes damage, a chemical exposure whose effects surface years later, or a defect that is only identified after an engineer examines the product can all mean the two years starts later than the injury itself. The rule is fact-specific and heavily contested — the defendant will argue you should have connected the dots sooner — so it is never something to rely on casually, but it is often the reason a claim that looks time-barred is not. Two practical points sit alongside the deadline. First, where the victim was under eighteen, the period is generally paused until they turn eighteen. Second, and unique to product cases, the evidence deadline can be far shorter than the legal one: the physical product has to be preserved to prove the defect, and a product that is discarded, repaired, or returned to the seller is often gone for good long before two years elapse. A claim filed within the deadline can still fail because the one thing an expert needed to examine no longer exists. So the operative deadlines are two: the legal one, two years from injury or from reasonable discovery of the cause, and the practical one, which is to preserve the product and identify the chain of sellers before either disappears.',
      whatToTrack: [
        'The date of the injury, and separately when you learned the product caused it',
        'Whether the injury was immediate or developed over time',
        'The victim\u2019s age at the time of injury',
        'Whether the product has been preserved unaltered',
        'The date of any recall or safety notice for the product',
        'When and where the product was purchased, for the chain of sellers',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from the injury date and claim type, and ClearCaseIQ records both the injury date and the date the cause was discovered, which is what the discovery rule turns on. It also flags the practical deadline that legal ones ignore — preserving the product and identifying the sellers — because in product cases that is what most often decides whether a claim can be proven at all.',
    },
    faqs: [
      {
        q: 'How long do I have to sue for a defective product in California?',
        a: 'Generally two years from the date of injury. The discovery rule can push the start later — to when you discovered or reasonably should have discovered both the injury and that the product caused it — which matters for injuries that develop over time. If the victim was a child, the period is generally paused until they turn eighteen.',
      },
      {
        q: 'What is the discovery rule and why does it matter for products?',
        a: 'It delays the start of the clock until you knew, or reasonably should have known, both that you were injured and what caused it. Product injuries often surface long after exposure or require an expert to link the harm to a defect, so the discovery rule frequently determines whether a claim is timely. It is fact-specific and contested, so it needs review rather than assumption.',
      },
      {
        q: 'My injury developed slowly. Is it too late?',
        a: 'Not necessarily. Where an injury developed over time or its cause was not apparent, the two years may have started when you reasonably connected the injury to the product rather than when the harm began. This is precisely the situation the discovery rule addresses, and it is worth checking quickly rather than assuming the claim is gone.',
      },
      {
        q: 'Why does preserving the product affect the deadline?',
        a: 'It does not change the legal deadline, but it creates a practical one that is often much shorter. Proving a defect usually requires expert examination of the actual product, so discarding, repairing, or returning it can end a claim long before two years pass. Preserving the product unaltered is urgent regardless of how much legal time remains.',
      },
      {
        q: 'Does a recall change my filing deadline?',
        a: 'It does not extend the deadline by itself, but the timing of a recall can be evidence of when you reasonably should have discovered the defect, which bears on the discovery rule. It can also strengthen the underlying claim, so a recall date is worth recording alongside the injury date.',
      },
    ],
  },
  {
    slug: PRODUCT_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Product Liability Hiring',
    title: 'Do I Need a Lawyer for a Defective Product Claim in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'Defective-product claims almost always require expert testimony and go up against well-funded corporate defendants, which makes them the kind of case few people can pursue alone. A contingency-fee lawyer costs nothing up front and usually advances the expert costs.',
    psychology: 'I want to know whether a defective-product claim needs a lawyer.',
    cta: 'Get Matched With a Product Liability Lawyer',
    exampleQueries: [
      'do I need a lawyer for a defective product claim in California',
      'how much does a product liability lawyer cost',
      'is a defective product case worth pursuing',
      'when to hire a product liability attorney California',
    ],
    signals: [
      'Serious injury',
      'Need for expert testimony',
      'Corporate defendant',
      'Product preserved',
      'Recall or prior incidents',
      'Multiple defendants in the chain',
    ],
    sections: {
      whyItMatters:
        'Defective-product claims are, in practical terms, the hardest category of injury claim to pursue without a lawyer, and the reasons are specific rather than general. Proving a defect nearly always requires expert testimony — an engineer to explain the manufacturing or design flaw, a medical expert to tie the defect to the injury — and those experts are expensive, which is why a viable product case usually needs a firm willing to advance the costs and wait to be repaid from the recovery. You are also up against a well-resourced opponent: manufacturers and their insurers defend product claims aggressively, because a finding of defect can expose them to every other person the product injured, so they invest heavily in fighting even a single case. And the claim itself is technical in a way a car-accident or dog-bite claim is not, requiring the right defect theory, the right defendants across the chain of distribution, and the physical product preserved for examination. All of this points the same direction: for anything beyond a minor injury, a product claim generally needs representation to be pursued at all. The economics work because these lawyers take the case on contingency — nothing up front, a percentage of the recovery (commonly a third or more, higher in litigation), case and expert costs advanced and repaid from the recovery, and no fee if there is no recovery. That structure exists precisely because ordinary people cannot fund expert engineering testimony out of pocket. A few features raise the value enough to make representation clearly worthwhile: a serious or permanent injury, a product that has been preserved so the defect can be shown, a recall or a history of similar incidents that helps prove the defect and sometimes opens punitive damages, and multiple solvent defendants in the chain. The rare case that might not need a lawyer is a very minor injury with an obvious, undisputed defect and a cooperative seller offering fair value — but even then, because the evaluation is free on contingency, the downside of getting reviewed is only time, and the risk of discarding a valuable claim by handling it wrong is high.',
      whatToTrack: [
        'How serious and lasting the injury is',
        'Whether the product has been preserved for expert examination',
        'Whether the claim will need engineering or medical experts',
        'The manufacturer, distributor, and retailer who may be defendants',
        'Any recall or prior incidents involving the product',
        'Any offer already made by a seller or insurer',
        'The injury date and when the cause was discovered, for the deadline',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you judge whether a defective-product claim is viable before you commit — it weighs the injury against the provability of the defect and whether the product still exists, and identifies the chain of sellers who could be defendants. When it makes sense, it matches you with California product-liability attorneys who work on contingency and advance the expert costs these cases require. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need a lawyer for a defective product claim?',
        a: 'For almost anything beyond a minor injury, yes. These claims require expert testimony to prove the defect, go up against well-funded corporate defendants, and are technically complex, which makes them very difficult to pursue alone. The main exception is a minor injury with an obvious defect and a cooperative seller offering fair value.',
      },
      {
        q: 'How much does a product liability lawyer cost in California?',
        a: 'Typically nothing up front. These lawyers work on contingency — a percentage of the recovery, commonly a third or more and higher in litigation — and crucially they advance the expert and case costs, repaid from the recovery, with no fee if there is no recovery. That is essential here because the engineering and medical experts these cases require are costly.',
      },
      {
        q: 'Why do product claims need experts?',
        a: 'Because proving a defect is a technical question. An engineer typically has to demonstrate the manufacturing or design flaw, and a medical expert often has to tie the defect to the specific injury. Manufacturers defend with their own experts, so a claim without expert support rarely survives, which is why these cases are not practical to bring alone.',
      },
      {
        q: 'Is my defective product case worth pursuing?',
        a: 'It depends most on the severity of the injury, whether the product was preserved so the defect can be proven, and whether solvent defendants exist in the chain of sale. A serious injury with a preserved product and a recall is a strong candidate; a minor injury with a discarded product is much weaker. A contingency review will tell you without cost.',
      },
      {
        q: 'What should I ask a product liability lawyer before hiring them?',
        a: 'Whether they advance expert and case costs, what experts the case will need, how they identify all defendants in the chain of distribution, how they will preserve and examine the product, the contingency percentage before and after a lawsuit, and their experience with your type of product. Whether they advance costs is often the deciding answer.',
      },
    ],
  },
]

export const productLiabilityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [PRODUCT_VALUE_SLUG]: {
    scenario: `A pressure cooker\u2019s lid released while under pressure and caused burns. The burns anchored the damages, but the value multiplied once the cooker was preserved, an engineer identified a defective locking mechanism, and a prior recall of the same model surfaced — evidence that reached the retailer as well as the maker. ${NOT_ADVICE}`,
    timeline: [
      ['Day of injury', 'Get medical care and, critically, preserve the product exactly as it is.'],
      ['First weeks', 'Treatment defines the injury; an engineer can begin examining the preserved product.'],
      ['Investigation', 'The defect theory, the chain of sellers, and any recall come into focus.'],
      ['Before settling', 'The claim can be valued once the injury stabilises and the defect is established.'],
    ],
    severityLadder: [
      ['Minor', 'A small injury even with a clear defect; a modest claim.'],
      ['Moderate', 'An injury needing sustained treatment, with a provable defect.'],
      ['Serious', 'Burns, fractures, or an injury requiring surgery.'],
      ['Severe', 'Amputation, disfigurement, permanent disability, or death.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Immediate treatment for burns, lacerations, or trauma from the failure.' },
      { label: 'Specialist care', copy: 'Burn units, surgery, or reconstruction depending on the injury.' },
      { label: 'Expert examination', copy: 'An engineer examines the preserved product to establish the defect.' },
      { label: 'Lasting impact', copy: 'Permanent scarring or disability that drives the largest values.' },
    ],
    settlementDrivers: [
      'The severity and permanence of the injury',
      'How provable the defect is',
      'Whether the product was preserved',
      'Whether a recall or prior incidents exist',
      'How many solvent defendants are in the chain',
      'Whether the defendant knew of the danger',
    ],
    settlementValueDetails: [
      { label: 'Provable defect sets it', copy: 'A preserved product and an expert opinion can multiply the value of the same injury.' },
      { label: 'The injury anchors it', copy: 'Burns, amputation and disability are where these claims reach their largest values.' },
      { label: 'The chain adds collectability', copy: 'Solvent distributors and retailers can be reached even when the maker cannot.' },
      { label: 'Knowledge opens punitives', copy: 'A known, disregarded danger can add punitive damages.' },
    ],
    insuranceProblems: [
      'The company argues the product was misused or altered.',
      'The claim is delayed until the product is discarded and the defect unprovable.',
      'A recall is downplayed as unrelated to this unit.',
      'The injury is blamed on the user rather than the product.',
      'A quick offer is made before an engineer examines the product.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the product, and do you still have it?' },
      { label: 'Step 2', question: 'How were you using it when the injury happened?' },
      { label: 'Step 3', question: 'Has the product been recalled or had prior complaints?' },
      { label: 'Step 4', question: 'How serious is the injury?' },
    ],
  },
  [PRODUCT_LIABILITY_SLUG]: {
    scenario: `A space heater started a fire. The importer had dissolved and the manufacturer was overseas, which looked fatal to the claim — until the analysis turned to the national retailer that sold it, strictly liable in the chain of distribution regardless of who made the defect. ${NOT_ADVICE}`,
    timeline: [
      ['Identify the defect', 'Manufacturing flaw, dangerous design, or inadequate warning.'],
      ['Map the chain', 'Manufacturer, distributor, and retailer who put the product in your hands.'],
      ['Preserve the product', 'The physical unit is what an expert needs to prove the defect.'],
      ['Assess defenses', 'Alteration, unforeseeable misuse, or comparative fault.'],
    ],
    severityLadder: [
      ['Clear manufacturing defect', 'The unit departed from its design; often the most provable.'],
      ['Design defect', 'The design itself is unreasonably dangerous; technical and contested.'],
      ['Failure to warn', 'A non-obvious danger was not adequately communicated.'],
      ['Contested', 'Alteration or misuse arguments complicate the claim.'],
    ],
    treatmentProgression: [
      { label: 'Manufacturing defect', copy: 'A flaw introduced in production made this unit dangerous.' },
      { label: 'Design defect', copy: 'Judged by consumer expectations or a risk-benefit analysis of a safer design.' },
      { label: 'Failure to warn', copy: 'Inadequate instructions or warnings about a non-obvious risk.' },
      { label: 'Chain liability', copy: 'Manufacturer, distributor, and retailer can each be strictly liable.' },
    ],
    settlementDrivers: [
      'Which defect type applies',
      'Whether the product was preserved',
      'How many solvent defendants are in the chain',
      'Whether the use was reasonably foreseeable',
      'Whether the product was altered after purchase',
      'Any recall or prior incidents',
    ],
    settlementValueDetails: [
      { label: 'The chain is the reach', copy: 'A solvent retailer can answer when the manufacturer cannot.' },
      { label: 'The defect type is the path', copy: 'Each of the three defect types is proven differently.' },
      { label: 'The product is the proof', copy: 'Preserving the unit is what lets an expert establish the defect.' },
      { label: 'Foreseeable use is covered', copy: 'Even foreseeable misuse is within strict liability.' },
    ],
    insuranceProblems: [
      'The seller argues it only sold the product and did not make it.',
      'The company claims the product was altered after purchase.',
      'An unforeseeable-misuse defense is raised for a foreseeable use.',
      'The manufacturer being overseas is used to discourage the claim.',
      'The defect is characterised as ordinary wear rather than a flaw.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What kind of defect do you think caused the injury?' },
      { label: 'Step 2', question: 'Who made, distributed, and sold the product?' },
      { label: 'Step 3', question: 'Was the product modified or repaired after you got it?' },
      { label: 'Step 4', question: 'How were you using it when the injury happened?' },
    ],
  },
  [PRODUCT_SOL_SLUG]: {
    scenario: `A patient linked years of joint damage to a metal hip implant only after a surgeon explained it during a revision surgery. The injury was old, but the two years arguably ran from that discovery, not from when the damage began — the reason the claim was not dead on arrival. ${NOT_ADVICE}`,
    timeline: [
      ['Date of injury', 'The default start, where cause and injury are obvious at once.'],
      ['Date of discovery', 'Where the cause was not apparent, the clock may start here instead.'],
      ['Preserve the product', 'The practical deadline: the unit must survive to be examined.'],
      ['Two years', 'The general filing period from injury or reasonable discovery.'],
    ],
    severityLadder: [
      ['Clearly timely', 'Injury and cause were obvious and less than two years ago.'],
      ['Discovery in play', 'A latent injury or a cause identified late; fact-specific and contested.'],
      ['Evidence at risk', 'The product may be discarded before the legal deadline.'],
      ['May have passed', 'Beyond two years with no discovery-rule argument available.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'The general period for a defective-product injury claim.' },
      { label: 'Discovery rule', copy: 'The clock may start when you reasonably connected the injury to the product.' },
      { label: 'Paused for minors', copy: 'A child\u2019s period is generally paused until they turn eighteen.' },
      { label: 'Evidence clock', copy: 'Preserving the product is often far more urgent than the legal deadline.' },
    ],
    settlementDrivers: [
      'The date of injury and the date the cause was discovered',
      'Whether the injury was immediate or latent',
      'The victim\u2019s age at the time',
      'Whether the product has been preserved',
      'Any recall date bearing on discovery',
      'How quickly the chain of sellers is identified',
    ],
    settlementValueDetails: [
      { label: 'Discovery can revive it', copy: 'A latent injury may be timely even years after the harm began.' },
      { label: 'Preservation is separate', copy: 'The product can be lost long before the legal deadline.' },
      { label: 'Contested by design', copy: 'Defendants argue you should have discovered the cause sooner.' },
      { label: 'Minors get more time', copy: 'A child\u2019s clock is generally paused until eighteen.' },
    ],
    insuranceProblems: [
      'The defendant argues the cause should have been obvious sooner.',
      'The product is discarded while the claimant waits.',
      'A latent-injury claim is assumed to be time-barred and abandoned.',
      'A recall date is used to argue earlier discovery.',
      'Negotiation runs past the deadline on the injury claim.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'When were you injured, and when did you learn the product caused it?' },
      { label: 'Step 2', question: 'Did the injury appear at once or develop over time?' },
      { label: 'Step 3', question: 'Do you still have the product?' },
      { label: 'Step 4', question: 'How old was the victim at the time?' },
    ],
  },
  [PRODUCT_HIRE_SLUG]: {
    scenario: `A homeowner with a minor burn from a faulty appliance and a fair offer from the retailer handled it directly. A neighbour with a severe injury from the same appliance did not — proving the defect needed an engineer and a medical expert, costs a contingency firm advanced and the neighbour never could have. ${NOT_ADVICE}`,
    timeline: [
      ['Right after the injury', 'Get treatment and preserve the product unaltered.'],
      ['First weeks', 'The defect theory and the need for experts become clear.'],
      ['Deciding on counsel', 'A serious injury or the need for expert proof are the signals.'],
      ['Before accepting', 'An early offer usually precedes any expert examination.'],
    ],
    severityLadder: [
      ['Handle it yourself', 'Minor injury, obvious defect, cooperative seller, fair offer.'],
      ['Worth a review', 'Any injury needing treatment, or a contested defect.'],
      ['Get representation', 'Serious injury, expert proof needed, corporate defendant.'],
      ['Move quickly', 'A latent injury near the deadline, or a product at risk of being lost.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; a percentage of the recovery, no fee if there is no recovery.' },
      { label: 'Costs advanced', copy: 'The firm typically fronts the expensive experts and repays from the recovery.' },
      { label: 'Expert proof', copy: 'Engineering and medical experts establish the defect and the injury link.' },
      { label: 'Litigation', copy: 'Manufacturers defend hard, so many product claims are litigated.' },
    ],
    settlementDrivers: [
      'How serious the injury is',
      'Whether expert testimony is required',
      'Whether the product was preserved',
      'Whether solvent defendants exist in the chain',
      'Any recall or prior incidents',
      'Any offer already made',
    ],
    settlementValueDetails: [
      { label: 'Costs are the barrier', copy: 'A firm that advances expert costs is what makes the claim possible at all.' },
      { label: 'Complexity needs counsel', copy: 'Defect theory and multiple defendants are hard to handle alone.' },
      { label: 'Corporate opponents', copy: 'Manufacturers defend aggressively to avoid precedent for other victims.' },
      { label: 'Free to be evaluated', copy: 'A contingency review costs only time.' },
    ],
    insuranceProblems: [
      'The victim is offered a quick settlement before experts are involved.',
      'The complexity is used to discourage the claim entirely.',
      'The product is allowed to be discarded, gutting the case.',
      'The manufacturer being overseas is framed as the end of the claim.',
      'The injury is downplayed before it has fully developed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How serious is the injury?' },
      { label: 'Step 2', question: 'Do you still have the product for an expert to examine?' },
      { label: 'Step 3', question: 'Who made and sold the product?' },
      { label: 'Step 4', question: 'Has a seller or insurer made any offer?' },
    ],
  },
}
