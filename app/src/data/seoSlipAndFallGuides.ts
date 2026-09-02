import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The four slip-and-fall (premises liability) guides.
 *
 * Unlike dog bites, slip-and-fall claims in California are not strict liability
 * — they turn on negligence, and specifically on notice: whether the property
 * owner knew or should have known about the hazard and had a reasonable chance
 * to fix it. That single requirement is why so many slip-and-fall claims fail,
 * and it is the thing a searcher is not told by a page quoting an average.
 *
 * Four pages cover the premises-liability queries: value, liability/notice,
 * filing deadline, and whether to hire a lawyer. No page states an average or a
 * typical payout. Deadlines mirror the two-year injury period used by the SOL
 * guides and the deadline checker, including the six-month government clock that
 * matters here because sidewalk and public-property falls are common.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A slip-and-fall claim turns on notice, the condition of the property, and medical facts particular to you, which a licensed California attorney can review.'

export const SLIP_VALUE_SLUG = '/how-much-is-a-slip-and-fall-case-worth'
export const SLIP_LIABILITY_SLUG = '/who-is-liable-for-a-slip-and-fall-in-california'
export const SLIP_SOL_SLUG = '/california-slip-and-fall-statute-of-limitations'
export const SLIP_HIRE_SLUG = '/do-i-need-a-lawyer-for-a-slip-and-fall-in-california'

export const slipAndFallGuidePages: LandingPage[] = [
  {
    slug: SLIP_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Slip and Fall Claim Value',
    title: 'How Much Is a Slip and Fall Case Worth in California?',
    eyebrow: 'Slip and fall value guide',
    description:
      'A slip-and-fall claim is worth your documented injuries adjusted by how clearly the property owner was on notice of the hazard — and reduced by your own share of fault. Weak notice, not a small injury, is what most often holds these claims down.',
    psychology: 'I fell and got hurt, and I want to know what the claim is realistically worth.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a slip and fall case worth in California',
      'average slip and fall settlement California',
      'what is my fall injury claim worth',
      'slip and fall broken bone settlement California',
      'how is a premises liability claim valued',
    ],
    signals: [
      'Injury severity',
      'Surgery or fractures',
      'Strength of notice',
      'Comparative fault',
      'Commercial vs residential owner',
      'Available liability coverage',
    ],
    sections: {
      whyItMatters:
        'A slip-and-fall claim is valued like any injury claim — documented losses first, the effect on your life second, collectability third — but a fourth factor sits on top of all of them and quietly sets the ceiling: liability. Unlike a dog bite, a fall is not strict liability in California. You recover only if the property owner or occupier was negligent, which almost always comes down to notice: did they know, or should they reasonably have known, about the hazard, and did they have a reasonable chance to fix it or warn about it. A puddle a customer spilled thirty seconds before you fell is very different from one that had been on the floor for an hour with employees walking past it, even though the injury is identical. This is why two falls producing the same broken wrist can be worth wildly different amounts: one has a maintenance log and a witness, the other has nothing but the fall itself. The injury still matters, of course. Fractures, head injuries, and anything requiring surgery move a claim into serious territory, and older victims — who fall more and heal worse — often have the most severe injuries and the strongest damages. But an insurer valuing the claim discounts heavily for every weakness in liability and for every percentage of comparative fault it can argue: that you were looking at your phone, wearing the wrong shoes, ignored a wet-floor sign, or entered an area you should not have. California\u2019s pure comparative negligence means those arguments reduce rather than bar recovery, but they are the first thing raised and they are raised aggressively. Collectability rounds it out. A fall in a national retailer or a commercial building usually has substantial liability coverage behind it; a fall at a small business or a private home may have far less, and a fall on public property brings the six-month government-claim deadline into play. The honest early question is not just how badly you were hurt, but how well the hazard, the owner\u2019s notice of it, and your own conduct can be documented.',
      whatToTrack: [
        'Photographs of the exact hazard and the surrounding area, taken as soon as possible',
        'What the hazard was and, if known, how long it had been there',
        'Whether any warning sign was present, and where',
        'Any incident report the business created, and the name of who took it',
        'Witnesses to the fall or to the hazard existing beforehand',
        'Every provider seen, starting with the first visit after the fall',
        'The footwear you were wearing and what you were doing when you fell',
        'Whether the property is commercial, residential, or publicly owned',
      ],
      howClearCaseHelps:
        `ClearCaseIQ builds the range from your documented injuries and then weights it by the two things that actually move a premises claim — how strong the notice evidence is and how much comparative fault an insurer can argue — rather than from an average. It flags early whether the weak point is the injury, the liability, or the coverage, because a claim limited by missing notice evidence is a different problem from one limited by policy limits. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is there an average slip and fall settlement in California?',
        a: 'Averages circulating online are close to meaningless for a specific fall, because value depends less on the injury than on liability. The same broken wrist can be worth a great deal with a maintenance log showing a hazard ignored for an hour, and very little with no evidence the owner knew about it. Notice and comparative fault, not an average, decide the number.',
      },
      {
        q: 'What do I have to prove in a slip and fall claim?',
        a: 'That a dangerous condition existed, that the property owner or occupier knew or reasonably should have known about it and had time to fix or warn about it, that they failed to do so, and that this caused your injury. The middle part — notice — is where most slip-and-fall claims are won or lost, and it is why documenting how long the hazard existed matters so much.',
      },
      {
        q: 'The store says I should have seen the hazard. Does that end my claim?',
        a: 'No, but it reduces it. California uses pure comparative negligence, so if you are found partly responsible — not watching, ignoring a warning sign, wearing unsuitable shoes — your recovery is cut by your percentage rather than eliminated. An "open and obvious" hazard argument is common, but it does not automatically defeat a claim, especially where you had a reason to be distracted or the hazard was hard to avoid.',
      },
      {
        q: 'Does a more serious injury mean a bigger settlement?',
        a: 'It raises the ceiling but does not set the value on its own. A severe injury with weak liability can still settle low, while a moderate injury with clear notice and a solid witness can settle well. Fractures, head injuries and surgeries move a claim into serious territory, but only once liability is established.',
      },
      {
        q: 'I fell on a public sidewalk. Is that different?',
        a: 'Yes, and more urgent. A fall on public property generally requires a written claim presented to the government entity within six months, long before the two-year deadline, and public entities have specific defenses for sidewalk defects. It is one of the situations where acting quickly changes whether there is a claim at all.',
      },
    ],
  },
  {
    slug: SLIP_LIABILITY_SLUG,
    category: 'Liability',
    cluster: 'Premises Liability',
    title: 'Who Is Liable for a Slip and Fall in California?',
    eyebrow: 'Premises liability',
    description:
      'In California a property owner is liable for a slip and fall only if they were negligent — meaning they knew or should have known about the hazard and failed to fix it. There is no strict liability, so "notice" is the question that decides the case.',
    psychology: 'I want to know if the property owner is actually responsible for my fall.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'who is responsible for a slip and fall in California',
      'is a store liable if I slip and fall',
      'what is premises liability in California',
      'do I have a slip and fall case',
      'proving notice in a slip and fall claim',
    ],
    signals: [
      'Actual or constructive notice',
      'Length of time hazard existed',
      'Inspection records',
      'Warning signs',
      'Owner vs occupier',
      'Comparative fault',
    ],
    sections: {
      whyItMatters:
        'California premises liability is built on negligence, not strict liability, and the practical effect is that a property owner is not automatically responsible just because you were hurt on their property. Everyone who owns or controls property — a store, a landlord, a restaurant, a business tenant, a homeowner — owes a duty to use reasonable care to keep it reasonably safe and to warn of hazards they know about. The claim succeeds only if that duty was breached, and the breach almost always turns on notice. Notice comes in two forms. Actual notice means the owner knew about the hazard: an employee saw the spill, a prior complaint was made, the broken step had been reported. Constructive notice means they should have known — the hazard existed long enough that a reasonable inspection routine would have found it. This is why the length of time a hazard was present is the single most important fact in most slip-and-fall claims: a spill that had been on the floor for an hour, with staff walking past, supports constructive notice, while one that appeared moments before you fell usually does not. Businesses defend these claims by producing inspection logs showing regular sweeps, which is why their own records — or the absence of them — often decide the case. Who is liable can also be more than one party. A tenant may be responsible for the interior of a leased space while the landlord is responsible for common areas and the building structure; a property manager or a maintenance contractor may share responsibility; and on public property, a government entity is potentially liable but only under narrower rules and the six-month claim deadline. Layered on top is comparative fault: even where the owner was clearly negligent, the insurer will argue you contributed by not watching, ignoring a sign, or being somewhere you should not have been, which reduces recovery under California\u2019s pure comparative negligence rule rather than defeating it. Establishing who controlled the area, what their inspection practice was, and how long the hazard existed is the work that turns a fall into a claim.',
      whatToTrack: [
        'Exactly where you fell and who owns or controls that specific area',
        'What the hazard was and any sign of how long it had been there',
        'Whether staff were nearby or had reason to notice it',
        'Any inspection log, cleaning schedule, or prior complaint',
        'Whether a warning sign or cone was present',
        'Whether the location is a leased space, common area, or public property',
        'Witnesses who saw the hazard before you fell',
        'Anything the insurer may argue as your own share of fault',
      ],
      howClearCaseHelps:
        `ClearCaseIQ organises the facts that decide a premises claim in California — where the fall happened, who controlled the area, what notice the owner had, and how long the hazard existed — so the strength of liability is assessed alongside the injury rather than after it. It also flags the situations that change the analysis, like a public-property fall with its six-month deadline or a leased space with divided responsibility. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is a business automatically liable if I fall in their store?',
        a: 'No. California requires negligence, so the business is liable only if it knew or should have known about the hazard and failed to fix or warn about it. A spill created by another customer seconds before you fell usually does not create liability; the same spill left for an hour while employees walked past it often does.',
      },
      {
        q: 'What does "notice" mean and why does it matter so much?',
        a: 'Notice is whether the owner knew (actual notice) or should have known (constructive notice) about the hazard. It matters because it is the element most slip-and-fall claims turn on. Constructive notice usually depends on how long the hazard was present, which is why the timeline of the hazard is often more valuable evidence than the fall itself.',
      },
      {
        q: 'Who is responsible — the store or the landlord?',
        a: 'It depends on who controlled the area where you fell. A business tenant is typically responsible for its own leased space, while the landlord is responsible for common areas and the building structure. Property managers and maintenance contractors can also share responsibility. Sometimes more than one party is liable, which can matter for coverage.',
      },
      {
        q: 'Can I still recover if I was partly at fault?',
        a: 'Yes. California uses pure comparative negligence, so being partly responsible — not paying attention, wearing the wrong shoes, ignoring a warning — reduces your recovery by your percentage of fault rather than barring it. Insurers raise these arguments early and aggressively, so the circumstances of the fall matter.',
      },
      {
        q: 'How do I prove how long the hazard was there?',
        a: 'Through the owner\u2019s own records and witnesses. Inspection and cleaning logs, surveillance footage, and testimony from people who saw the hazard earlier all help establish the timeline. This evidence disappears quickly — footage is often overwritten within days — which is a reason to act before it is gone.',
      },
    ],
  },
  {
    slug: SLIP_SOL_SLUG,
    category: 'Statute of Limitations',
    cluster: 'Slip and Fall Filing Deadlines',
    title: 'California Slip and Fall Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the date of the fall for a California slip-and-fall injury claim. But a fall on public property brings a six-month government-claim deadline that comes first — and the evidence that proves these claims disappears even faster.',
    psychology: 'I need to know how long I have to file a slip-and-fall claim.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'how long do I have to file a slip and fall claim in California',
      'slip and fall statute of limitations California',
      'is it too late to file a fall injury claim',
      'deadline to sue for a fall on public property California',
    ],
    signals: [
      'Date of the fall',
      'Public vs private property',
      'Government entity involved',
      'Victim under 18',
      'Surveillance footage',
      'Incident report filed',
    ],
    sections: {
      whyItMatters:
        'A California slip-and-fall injury claim runs on the standard two-year personal-injury deadline, measured from the date of the fall. That is the deadline for filing a lawsuit, and dealing with the property owner\u2019s insurer does not extend it — an open claim and an active negotiation leave the two-year clock running, and the adjuster need not warn you when it is about to expire. But two things make timing more urgent for slip-and-fall than for many other injury claims. The first is the government-claim deadline. Falls happen on public property constantly — a broken public sidewalk, a wet floor in a government building, a hazard in a public park or transit station — and where a government entity owns or controls the property, a written claim generally has to be presented to that entity within six months, far ahead of the two years. Miss that six-month window and the claim can end regardless of how much time is left on the main clock, and public entities also have specific defenses for conditions like sidewalk defects that make early, careful handling important. The second is that the evidence these claims depend on has a much shorter life than the deadline. Slip-and-fall claims are won on notice — proving the hazard existed long enough that the owner should have caught it — and that proof lives in surveillance footage that is often overwritten within days or weeks, in inspection logs that get cycled out, and in witnesses who are strangers you may never find again. A claim filed comfortably within two years can still fail because the footage that would have shown the spill sitting there for an hour was gone within a week. So while the legal deadline is two years (paused until age eighteen where the victim is a child, and shortened to a six-month presentation where a public entity is involved), the practical deadline for preserving a winnable claim is often measured in days. Recording the date of the fall exactly, and moving quickly to preserve footage and identify witnesses, is what keeps the two years from being irrelevant.',
      whatToTrack: [
        'The exact date of the fall, which the deadline is measured from',
        'Whether the property is privately or publicly owned',
        'Whether any government entity owns or controls the location',
        'The victim\u2019s age at the time, since a child\u2019s period is generally paused',
        'Whether surveillance footage may exist, and who controls it',
        'Whether an incident report was filed and with whom',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from the date of the fall and the claim type, including the separate six-month government presentation clock where a public entity may own the property. ClearCaseIQ also records the fall date alongside the claim facts and flags the evidence — footage, inspection logs, witnesses — that has to be preserved long before the legal deadline, because that is what most often decides a premises claim.',
    },
    faqs: [
      {
        q: 'How long do I have to file a slip and fall claim in California?',
        a: 'Generally two years from the date of the fall for an injury claim. If the fall was on public property, a written claim usually has to be presented to the government entity within six months, which comes first. If the victim was a child, the period is generally paused until they turn eighteen.',
      },
      {
        q: 'Why is a fall on public property more urgent?',
        a: 'Because the six-month government-claim deadline applies and comes long before the two years. Falls on public sidewalks, in government buildings, or in public parks all trigger it, and missing it can end the claim. Public entities also have specific defenses for conditions like sidewalk defects, so these claims need early, careful handling.',
      },
      {
        q: 'Can I wait to see how my injury heals before filing?',
        a: 'You have two years to file, but waiting is risky for slip-and-fall claims specifically, because the evidence that proves them disappears fast. Surveillance footage is often overwritten within days, inspection logs get cycled out, and witnesses vanish. The legal deadline and the practical deadline to preserve a winnable claim are very different here.',
      },
      {
        q: 'Does negotiating with the insurance company extend the deadline?',
        a: 'No. An open claim, an active negotiation, and a pending offer all leave the two-year period running, and the adjuster has no obligation to warn you it is closing. Claims are lost this way while both sides are still talking.',
      },
      {
        q: 'What if the fall happened a while ago and I have no photos?',
        a: 'It is still worth checking quickly. The deadline may not have passed, and even without your own photos there may be footage or records still recoverable if acted on immediately. The longer the delay, the less likely the notice evidence survives, so the value of moving fast only increases.',
      },
    ],
  },
  {
    slug: SLIP_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Slip and Fall Hiring',
    title: 'Do I Need a Lawyer for a Slip and Fall in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'Slip-and-fall claims are harder to win than most injury claims because you have to prove the owner was negligent — and insurers know it. A contingency-fee lawyer costs nothing up front, and these are exactly the claims where liability has to be argued.',
    psychology: 'I want to know whether a slip-and-fall claim is worth hiring a lawyer for.',
    cta: 'Get Matched With a Slip and Fall Lawyer',
    exampleQueries: [
      'do I need a lawyer for a slip and fall in California',
      'how much does a slip and fall lawyer cost',
      'is a slip and fall case worth pursuing',
      'when to hire a premises liability lawyer California',
    ],
    signals: [
      'Disputed liability',
      'Serious injury',
      'Weak or missing notice evidence',
      'Public-property fall',
      'Low or denied offer',
      'Evidence that may be lost',
    ],
    sections: {
      whyItMatters:
        'Slip-and-fall claims are among the hardest injury claims to win on your own, and the reason is structural: unlike a rear-end collision or a dog bite, liability is not assumed. You have to prove the property owner was negligent, which means proving notice — that they knew or should have known about the hazard — and insurers defend these claims harder than almost any other because they know how often that proof does not exist. That difficulty is exactly why representation matters here more than in a straightforward claim. Slip-and-fall lawyers work on contingency: nothing up front, no hourly fee, a percentage of the recovery (commonly about a third before a lawsuit and more in litigation) with case costs off the top, and no fee if there is no recovery. So the cost of finding out whether you have a claim is only time. A few situations make a lawyer close to essential. When liability is disputed — the store denies knowing about the hazard, or blames you for not watching — someone has to obtain the inspection logs, the surveillance footage before it is overwritten, and the witness statements, and has to press the notice argument properly; this is the core of the case and it is hard to do alone against an insurer that does it daily. When the injury is serious — a fracture, a head injury, a surgery, or a fall by an older person who will not fully recover — the value is high enough that a discounted offer costs far more than a fee. When the fall was on public property, the six-month deadline and the government\u2019s special defenses make early expert handling important. And when an offer has already been made, it is almost always anchored to the weakest view of liability, which is precisely what a lawyer exists to move. The claims that may not need a lawyer are the mirror image: a minor injury that healed, a cooperative owner who accepts responsibility, and a fair offer already on the table. A useful rule of thumb — if liability is contested, the injury is serious, evidence is at risk, or the fall was on public property, get reviewed, and because the review is free, there is little reason not to.',
      whatToTrack: [
        'Whether the owner or insurer disputes responsibility for the fall',
        'How serious and lasting the injury is',
        'Whether notice evidence — footage, logs, witnesses — exists or is at risk',
        'Whether the fall was on public property',
        'Any offer already made and how it treats liability',
        'The victim\u2019s age and likelihood of full recovery',
        'The date of the fall, so the deadline is not quietly running out',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you judge whether a slip-and-fall claim is the kind that needs an attorney before you commit — it weighs the injury against the strength of the notice evidence and flags what is at risk of being lost. When representation makes sense, it matches you with California premises-liability attorneys who work on contingency and know how to preserve footage and prove notice. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I really need a lawyer for a slip and fall?',
        a: 'More often than for other injury claims, because you have to prove the owner was negligent and insurers defend these hard. If liability is disputed, the injury is serious, or the evidence is at risk of being lost, a lawyer materially changes the outcome. A minor injury with a cooperative owner and a fair offer can sometimes be handled directly.',
      },
      {
        q: 'How much does a slip and fall lawyer cost in California?',
        a: 'Typically nothing up front. These lawyers work on contingency — a percentage of the recovery, commonly about a third before a lawsuit and more in litigation, with case costs off the top and no fee if there is no recovery. Being evaluated does not cost anything.',
      },
      {
        q: 'Why are slip and fall claims considered hard to win?',
        a: 'Because liability is not assumed. You must prove the owner knew or should have known about the hazard and failed to act, and that notice evidence often does not exist or disappears quickly. Insurers know the odds and make low offers accordingly, which is why the notice argument has to be built and pressed deliberately.',
      },
      {
        q: 'The insurance company offered me money. Should I take it?',
        a: 'Be cautious, especially if it arrived early. A first offer is almost always anchored to the weakest view of liability and the injury before it has fully developed. Having it reviewed costs nothing on contingency, and accepting too early is the most common way fall victims are underpaid.',
      },
      {
        q: 'What should I ask before hiring a slip and fall lawyer?',
        a: 'How many California premises-liability claims they have handled, how they go about proving notice, whether they move quickly to preserve surveillance footage, what the contingency percentage is before and after a lawsuit, and how case costs are handled. Their answer on preserving evidence is the most telling.',
      },
    ],
  },
]

export const slipAndFallGuideTopicContentBySlug: Record<string, TopicContent> = {
  [SLIP_VALUE_SLUG]: {
    scenario: `A shopper broke a wrist slipping on a clear liquid in a grocery aisle. The injury alone looked like a solid claim, but value hinged on the store\u2019s inspection log, which showed the aisle had not been checked in over an hour — turning a disputed fall into strong constructive notice. ${NOT_ADVICE}`,
    timeline: [
      ['Day of the fall', 'Report it, photograph the hazard, and get medical care. Footage exists now and may not later.'],
      ['First weeks', 'Treatment defines the injury; surveillance footage is at highest risk of being overwritten.'],
      ['Months after', 'Surgery or lasting limitation becomes clear, raising the ceiling on value.'],
      ['Before settling', 'The claim can be valued once the injury has stabilised and notice evidence is secured.'],
    ],
    severityLadder: [
      ['Minor', 'Bruising or a sprain that resolves; liability still has to be proven.'],
      ['Moderate', 'A fracture or an injury needing weeks of treatment.'],
      ['Serious', 'Surgery, a head injury, or a lasting limitation.'],
      ['Severe', 'Permanent disability, a spinal or brain injury, or an older victim who will not fully recover.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Imaging and stabilisation for fractures or head injury after the fall.' },
      { label: 'Orthopedic care', copy: 'Casting, follow-up, and possible surgery for broken bones.' },
      { label: 'Physical therapy', copy: 'Rehabilitation, where continuity of treatment supports the claim.' },
      { label: 'Lasting limitation', copy: 'Permanent restrictions, common in older victims, which drive the value.' },
    ],
    settlementDrivers: [
      'The severity and permanence of the injury',
      'How strong the notice evidence is',
      'How long the hazard existed before the fall',
      'The amount of comparative fault an insurer can argue',
      'Whether the owner is a commercial entity with real coverage',
      'The victim\u2019s age and recovery prospects',
    ],
    settlementValueDetails: [
      { label: 'Liability sets the ceiling', copy: 'Weak notice can hold down the value of even a serious injury.' },
      { label: 'The injury raises it', copy: 'Fractures, surgery and head injury move a claim into serious territory once liability is shown.' },
      { label: 'Comparative fault discounts it', copy: 'Every percentage of fault the insurer argues comes off the recovery.' },
      { label: 'Coverage decides collectability', copy: 'A commercial defendant usually has real coverage; a small business or home may not.' },
    ],
    insuranceProblems: [
      'The insurer says the hazard appeared moments before the fall, defeating notice.',
      'A wet-floor sign is claimed to have been present when it was not.',
      'Surveillance footage is overwritten before it can be requested.',
      'The victim is blamed for not watching or for their footwear.',
      'A quick, low offer is made before the injury has fully developed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard, and do you know how long it had been there?' },
      { label: 'Step 2', question: 'Was an incident report made, and are there photos or witnesses?' },
      { label: 'Step 3', question: 'Is the property a business, a rental, or public property?' },
      { label: 'Step 4', question: 'How serious is the injury, and was surgery involved?' },
    ],
  },
  [SLIP_LIABILITY_SLUG]: {
    scenario: `A tenant fell on a broken stair in an apartment building\u2019s common stairwell. The landlord blamed the tenant, but the break had been reported months earlier and never repaired — actual notice that shifted responsibility squarely to the landlord who controlled the common area. ${NOT_ADVICE}`,
    timeline: [
      ['Identify the hazard', 'What the dangerous condition was and where exactly it sat.'],
      ['Establish control', 'Who owned or controlled that specific area — store, landlord, contractor, or public entity.'],
      ['Prove notice', 'Whether they knew or should have known, and for how long.'],
      ['Weigh comparative fault', 'What share of responsibility the insurer will try to place on the victim.'],
    ],
    severityLadder: [
      ['Clear notice', 'A reported hazard or one present long enough to be caught by reasonable inspection.'],
      ['Constructive notice', 'The hazard existed long enough that it should have been found.'],
      ['Disputed notice', 'No record of how long the hazard was there; the hard case.'],
      ['No notice', 'The hazard appeared moments before; usually no liability.'],
    ],
    treatmentProgression: [
      { label: 'Duty of care', copy: 'Owners and occupiers must use reasonable care to keep property reasonably safe.' },
      { label: 'Actual notice', copy: 'The owner knew — a prior complaint, an employee who saw it.' },
      { label: 'Constructive notice', copy: 'The owner should have known because the hazard was present long enough.' },
      { label: 'Divided responsibility', copy: 'Tenant, landlord, manager, or contractor may each control part of the property.' },
    ],
    settlementDrivers: [
      'Whether there was actual or constructive notice',
      'How long the hazard existed',
      'What inspection or cleaning records show',
      'Who controlled the area where the fall happened',
      'Whether a warning was present',
      'How much comparative fault applies',
    ],
    settlementValueDetails: [
      { label: 'Notice is the case', copy: 'Whether the owner knew or should have known decides most premises claims.' },
      { label: 'Time is the proxy', copy: 'How long the hazard existed is usually how constructive notice is proven.' },
      { label: 'Control assigns liability', copy: 'The party that controlled the specific area is generally the responsible one.' },
      { label: 'Records win or lose it', copy: 'Inspection logs and footage often decide the claim outright.' },
    ],
    insuranceProblems: [
      'The owner denies knowing about a hazard that had been there for hours.',
      'Inspection logs are produced selectively or claimed not to exist.',
      'The landlord and tenant each blame the other for the area.',
      'The victim is argued to have been where they should not have been.',
      'Footage that would show the timeline is not preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where exactly did you fall, and who controls that area?' },
      { label: 'Step 2', question: 'What was the hazard, and how long had it been there?' },
      { label: 'Step 3', question: 'Was there any warning sign or prior complaint?' },
      { label: 'Step 4', question: 'Are there inspection records, footage, or witnesses?' },
    ],
  },
  [SLIP_SOL_SLUG]: {
    scenario: `A man tripped on a raised public sidewalk and assumed he had two years. He did for a private claim — but the city owned the sidewalk, and the six-month government-claim window closed while he waited to see if his ankle healed. ${NOT_ADVICE}`,
    timeline: [
      ['Date of the fall', 'Every calculation starts here. Record it exactly.'],
      ['Days after', 'Surveillance footage is at highest risk of being overwritten.'],
      ['Six-month mark', 'Where a public entity owns the property, the written claim is generally due.'],
      ['Two years', 'The general filing deadline for a private slip-and-fall injury claim.'],
    ],
    severityLadder: [
      ['Within a typical window', 'More than a year remains and the property is privately owned.'],
      ['Evidence at risk', 'Footage and logs may already be gone regardless of the legal deadline.'],
      ['Urgent', 'Under ninety days, or a six-month government claim still open.'],
      ['May have passed', 'Beyond two years, or a missed government-claim window.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'The general period for a private slip-and-fall injury claim, from the fall.' },
      { label: 'Six months', copy: 'Written claim to a public entity that owns or controls the property.' },
      { label: 'Paused for minors', copy: 'A child\u2019s period is generally paused until they turn eighteen.' },
      { label: 'Evidence clock', copy: 'Footage and inspection logs often expire in days, well before any deadline.' },
    ],
    settlementDrivers: [
      'The exact date of the fall',
      'Whether the property is public or private',
      'Whether surveillance footage still exists',
      'The victim\u2019s age at the time',
      'Whether an incident report was filed',
      'How quickly evidence can be preserved',
    ],
    settlementValueDetails: [
      { label: 'Negotiation does not pause it', copy: 'An open claim file has no effect on the filing period.' },
      { label: 'The government clock comes first', copy: 'Six months arrives long before two years on public property.' },
      { label: 'Evidence expires fastest', copy: 'The practical deadline for footage is days, not years.' },
      { label: 'Filing is not resolution', copy: 'Filing starts the case; the injury timeline governs when it settles.' },
    ],
    insuranceProblems: [
      'A public-property angle is missed until six months have passed.',
      'Footage is overwritten while the claimant waits to heal.',
      'Negotiation continues while the two-year period runs out.',
      'An incident report is never obtained from the business.',
      'A minor\u2019s paused deadline is assumed to have expired.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the exact date of the fall?' },
      { label: 'Step 2', question: 'Was the property privately or publicly owned?' },
      { label: 'Step 3', question: 'Could surveillance footage exist, and who has it?' },
      { label: 'Step 4', question: 'How old was the victim at the time?' },
    ],
  },
  [SLIP_HIRE_SLUG]: {
    scenario: `Two fall victims: one with a sprained wrist, a cooperative store, and a fair offer handled it alone. The other, with a hip fracture and a store denying any knowledge of the spill, needed a lawyer to pull the inspection logs and footage before they vanished — the case existed only once that evidence was secured. ${NOT_ADVICE}`,
    timeline: [
      ['Right after the fall', 'Report it, photograph the hazard, and get treatment.'],
      ['First days', 'The window to preserve footage and identify witnesses is closing.'],
      ['Deciding on counsel', 'Disputed liability, a serious injury, or evidence at risk are the signals.'],
      ['Before accepting', 'An early offer is anchored to the weakest view of liability.'],
    ],
    severityLadder: [
      ['Handle it yourself', 'Minor injury, cooperative owner, fair offer.'],
      ['Worth a review', 'Any dispute about notice, or an injury needing treatment.'],
      ['Get representation', 'Serious injury, disputed liability, or evidence at risk.'],
      ['Move quickly', 'Public-property fall, or footage about to be overwritten.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; a percentage of the recovery, no fee if there is no recovery.' },
      { label: 'Evidence preservation', copy: 'A lawyer can move to preserve footage and logs before they are gone.' },
      { label: 'Proving notice', copy: 'The core work of the case, and hard to do alone against an insurer.' },
      { label: 'Litigation', copy: 'If a fair settlement is refused, the percentage rises and costs come off the top.' },
    ],
    settlementDrivers: [
      'Whether liability is disputed',
      'How serious the injury is',
      'Whether notice evidence exists or is at risk',
      'Whether the fall was on public property',
      'Any offer already made and how it treats liability',
      'How close the filing deadline is',
    ],
    settlementValueDetails: [
      { label: 'No cost to be evaluated', copy: 'A contingency review is effectively free, and these claims are hard to judge alone.' },
      { label: 'Evidence is time-critical', copy: 'The value of a lawyer is often in preserving footage before it disappears.' },
      { label: 'Notice must be argued', copy: 'The element that wins the case is exactly the one insurers contest.' },
      { label: 'Early offers anchor low', copy: 'A first offer reflects the weakest view of liability and injury.' },
    ],
    insuranceProblems: [
      'The victim is told a lawyer will just take a cut of an already low offer.',
      'A quick settlement is pushed before footage can be requested.',
      'Liability is denied to discourage the claim entirely.',
      'A public-property deadline is allowed to pass unnoticed.',
      'The injury is downplayed before it has fully developed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the owner or insurer disputing responsibility?' },
      { label: 'Step 2', question: 'How serious is the injury, and is it lasting?' },
      { label: 'Step 3', question: 'Could footage or logs exist, and are they at risk?' },
      { label: 'Step 4', question: 'Was the fall on public property?' },
    ],
  },
}
