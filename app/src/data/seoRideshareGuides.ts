import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Three rideshare (Uber/Lyft) spokes: value, filing deadline, and hiring.
 *
 * The coverage question — who pays, and how the three app periods change the
 * available insurance — is already answered by two existing pages
 * (`/insurance/rideshare-commercial-coverage` and
 * `/commercial/rideshare-accidents`) and by the Uber accident calculator tool.
 * These three spokes complete the hub with the natural-language queries those
 * coverage pages do not target directly, and link back to them for the coverage
 * mechanics rather than repeating them.
 *
 * The defining fact of a rideshare claim is the $1,000,000 policy the platform
 * must carry while a driver is on the way to a rider or carrying one — an order
 * of magnitude above California's minimum auto limits, and the reason a
 * rideshare passenger's claim is rarely capped by a thin personal policy.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A rideshare claim turns on the app period, the layered policies, and facts particular to the trip, which a licensed California attorney can review.'

export const RIDESHARE_VALUE_SLUG = '/how-much-is-an-uber-or-lyft-accident-case-worth'
export const RIDESHARE_SOL_SLUG = '/california-rideshare-accident-statute-of-limitations'
export const RIDESHARE_HIRE_SLUG = '/do-i-need-a-lawyer-for-an-uber-or-lyft-accident-in-california'

const COVERAGE_SLUG = '/insurance/rideshare-commercial-coverage'

export const rideshareGuidePages: LandingPage[] = [
  {
    slug: RIDESHARE_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Rideshare Claim Value',
    title: 'How Much Is an Uber or Lyft Accident Case Worth?',
    eyebrow: 'Rideshare value guide',
    description:
      'A rideshare claim is valued like any injury claim, but with one decisive difference: while a driver is en route to or carrying a passenger, Uber and Lyft must carry a $1 million policy. That ceiling, not the injury alone, is often why these claims reach higher values.',
    psychology: 'I was hurt in an Uber or Lyft and want to know what the claim is worth.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is an uber accident settlement worth',
      'lyft accident settlement value California',
      'how much is a rideshare accident claim worth',
      'uber passenger injury settlement California',
      'what is my uber accident case worth',
    ],
    signals: [
      'App period at the time',
      'Passenger or driver role',
      'Injury severity',
      '$1M policy availability',
      'Multiple liable parties',
      'UM/UIM coverage',
    ],
    sections: {
      whyItMatters:
        'A rideshare injury claim is valued on the same layers as any other — documented losses, the effect on your life, and collectability — but collectability, which usually sets the ceiling, behaves very differently here, and in the injured person\u2019s favor. California requires Uber and Lyft to carry a $1,000,000 third-party liability policy whenever a driver is on the way to pick up a rider or has a passenger in the car, plus uninsured and underinsured motorist coverage during those periods. That is roughly thirty times the state minimum bodily-injury limit, and it means the most common frustration in ordinary car-accident claims — a serious injury colliding with a $30,000 policy — is often simply absent. For a passenger, who is almost never at fault, that large policy is typically available regardless of which driver caused the crash, because the rideshare coverage responds and its own UM/UIM fills gaps if the at-fault driver was underinsured. The catch is that the coverage depends on the app period, which is why establishing it is the first task in valuing the claim: with the app off, only the driver\u2019s personal policy applies; with the app on but no ride accepted, a smaller contingent policy applies; and only once a ride is accepted or a passenger is aboard does the full $1 million attach. The trip receipt, the driver\u2019s app status, and the platform\u2019s own records settle this, and the difference between periods can be the difference between a minimal recovery and a fully covered one. Beyond coverage, value still turns on the injury — the severity, the treatment, the permanence — and on the fact that rideshare crashes often involve more than one potentially liable party, which can add layers of coverage rather than compete for a single pool. What these claims are not is simple: multiple insurers frequently point at each other, coverage is denied or delayed while bills mount, and the platform\u2019s insurer is experienced and motivated to characterise the app period in whatever way narrows its exposure. The value is often high; realising it depends on nailing down the period and the layered policies. For how the coverage layers actually work period by period, see the rideshare coverage guide.',
      whatToTrack: [
        'The trip receipt and the exact time of the crash',
        'Whether the app was off, on-and-waiting, or on-a-trip',
        'Whether you were a passenger, the rideshare driver, or another motorist',
        'Every provider seen, starting with the first visit after the crash',
        'The other driver\u2019s insurance and whether it is adequate',
        'Your own auto policy\u2019s UM/UIM coverage, which may also apply',
        'Every party who may share fault, since each may carry coverage',
        'The police report and any independent witnesses',
      ],
      howClearCaseHelps:
        `ClearCaseIQ pins down the app period first — because it decides which policies attach — then builds the range from your documented injuries against the coverage that actually applies, rather than from an average. It maps the layered policies and UM/UIM so a passenger is not left chasing the wrong insurer, and links through to the coverage guide for the period-by-period mechanics. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is there an average Uber or Lyft settlement in California?',
        a: 'Averages are unhelpful because rideshare claims range widely with the injury and the app period. What makes them distinctive is that a large $1 million policy is often available, so unlike many car-accident claims the value is less likely to be capped by thin coverage. The injury and the period, not an average, determine the number.',
      },
      {
        q: 'How does the $1 million rideshare policy work?',
        a: 'California requires Uber and Lyft to carry $1 million in third-party liability coverage, plus UM/UIM, whenever a driver is on the way to a rider or carrying one. When the app is on but no ride is accepted, a smaller contingent policy applies, and when the app is off only the driver\u2019s personal policy does. Which period you were in decides how much coverage is available.',
      },
      {
        q: 'I was a passenger. Whose insurance pays?',
        a: 'As a passenger you are almost never at fault, and the rideshare $1 million policy is typically available regardless of which driver caused the crash. If the at-fault driver was someone else and underinsured, the rideshare UM/UIM coverage can fill the gap. Passengers generally have the strongest position of anyone in a rideshare crash.',
      },
      {
        q: 'Why does the app period matter so much?',
        a: 'Because it determines which policy applies, and the policies differ enormously. The full $1 million attaches only once a ride is accepted or a passenger is aboard; before that, coverage is far smaller or limited to the driver\u2019s personal policy. The trip receipt and the platform\u2019s records establish the period, which is why documenting the trip is the first step.',
      },
      {
        q: 'What makes a rideshare claim more valuable?',
        a: 'A serious injury combined with the large policy that applies during an active trip, and often multiple liable parties whose policies can stack rather than compete. Value is held down mainly when the app period is disputed or when insurers delay by pointing at each other, which is precisely what representation is for.',
      },
    ],
  },
  {
    slug: RIDESHARE_SOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Rideshare Filing Deadlines',
    title: 'California Rideshare Accident Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the crash for a California Uber or Lyft injury claim. But the trip data that proves which policy applies, and the six-month deadline when a public entity is involved, both run on much shorter clocks than the two years.',
    psychology: 'I need to know how long I have to file an Uber or Lyft accident claim.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'how long do I have to sue after an uber accident in California',
      'rideshare accident statute of limitations California',
      'lyft accident claim deadline California',
      'is it too late to file an uber injury claim',
    ],
    signals: [
      'Date of the crash',
      'App period / trip data',
      'Passenger or driver role',
      'Government entity involved',
      'Victim under 18',
      'Multiple insurers',
    ],
    sections: {
      whyItMatters:
        'A California rideshare injury claim runs on the standard two-year personal-injury deadline, measured from the date of the crash, and that is the deadline for filing a lawsuit. Dealing with Uber\u2019s, Lyft\u2019s, or another driver\u2019s insurer does not extend it, and with several insurers involved it is easy to assume that an active claim somewhere means the clock is not running — it is. But two timing pressures specific to rideshare claims run well ahead of the two years. The first is evidence. The single most important fact in a rideshare claim is the app period, because it decides which policy applies, and that is proven by the platform\u2019s trip data — the ride status, the timestamps, the driver\u2019s app activity. That data sits with Uber or Lyft, and while it is not gone in days the way surveillance footage is, securing it early through a preservation demand is what prevents a later dispute about whether the driver was really on a trip. The second is the government-claim deadline. Rideshare crashes happen on public roads, and where a public entity contributed — a dangerous intersection, a defective signal, a poorly designed roadway, or a government vehicle — a written claim generally has to be presented to that entity within six months, long before the two years, and missing it can foreclose that avenue entirely. As always, the period is generally paused where the injured person was under eighteen. The practical consequence is that while you have two years to file, the work that makes a rideshare claim winnable — locking down the trip data that fixes the app period, identifying every insurer across the layered coverage, and presenting any government claim within six months — is front-loaded. A claim filed comfortably inside two years can still be weakened if the period was left ambiguous or a public-entity avenue lapsed. Recording the crash date and the trip details exactly, and moving early to preserve the platform\u2019s records, is what keeps the deadline from being the only thing that mattered.',
      whatToTrack: [
        'The exact date and time of the crash',
        'The trip receipt and app status, which fix the coverage period',
        'Whether you were a passenger, rideshare driver, or other motorist',
        'Whether any public entity, road defect, or government vehicle contributed',
        'The victim\u2019s age at the time, since a child\u2019s period is generally paused',
        'Every insurer that may be involved across the layered policies',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from the crash date and claim type, including the six-month government presentation clock where a public entity may have contributed. ClearCaseIQ records the crash date and the trip details together, and flags the trip data that has to be preserved to fix the app period, because that is what most often decides a rideshare claim regardless of how much time remains on the main deadline.',
    },
    faqs: [
      {
        q: 'How long do I have to sue after an Uber or Lyft accident in California?',
        a: 'Generally two years from the date of the crash for an injury claim. If a government entity contributed — a road defect, a bad signal, a public vehicle — a written claim usually must be presented within six months, which comes first. If the injured person was a child, the period is generally paused until they turn eighteen.',
      },
      {
        q: 'Do multiple insurers change the deadline?',
        a: 'No. The two-year filing deadline applies regardless of how many insurers are involved, and an active claim with one carrier does not pause it. Rideshare crashes commonly involve several policies pointing at each other, which makes it easy to lose track of the clock while negotiations drag.',
      },
      {
        q: 'Why is preserving the trip data urgent if I have two years?',
        a: 'Because the app period decides which policy applies, and that is proven by Uber\u2019s or Lyft\u2019s trip data. Sending a preservation demand early prevents a later dispute about whether the driver was on a trip. The legal deadline is two years, but securing the evidence that makes the claim work is a much earlier task.',
      },
      {
        q: 'A city road or signal may have contributed. Does that shorten my time?',
        a: 'For that avenue, yes. A claim against a public entity generally requires a written claim within six months, far ahead of the two years, and missing it can foreclose recovery from the government even if your claim against the drivers remains alive. It needs to be identified quickly.',
      },
      {
        q: 'Is it too late if the crash was a while ago?',
        a: 'Check quickly rather than assume. The two years may not have passed, a minor\u2019s deadline may be paused, and the trip data may still be recoverable. The longer the delay, the more likely the app period becomes contested, so acting sooner protects the strongest part of the claim.',
      },
    ],
  },
  {
    slug: RIDESHARE_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Rideshare Hiring',
    title: 'Do I Need a Lawyer for an Uber or Lyft Accident in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'Rideshare claims involve layered policies and experienced corporate insurers that point at each other while bills mount. A contingency-fee lawyer costs nothing up front, and these are among the claims where sorting out coverage is the whole battle.',
    psychology: 'I want to know whether an Uber or Lyft accident claim needs a lawyer.',
    cta: 'Get Matched With a Rideshare Accident Lawyer',
    exampleQueries: [
      'do I need a lawyer for an uber accident in California',
      'how much does an uber accident lawyer cost',
      'should I get a lawyer for a lyft accident',
      'rideshare accident attorney California',
    ],
    signals: [
      'Disputed app period',
      'Insurers denying or delaying',
      'Serious injury',
      'Multiple liable parties',
      'Low or denied offer',
      'Government entity involved',
    ],
    sections: {
      whyItMatters:
        'Rideshare claims look like ordinary car-accident claims and are not, and the difference is exactly what makes a lawyer worth having. The value is often high because of the $1 million policy that applies during an active trip, but reaching it means navigating layered coverage and several insurers — the rideshare platform\u2019s, the driver\u2019s personal carrier, another driver\u2019s, and possibly a government entity\u2019s — who routinely point at each other, dispute the app period, and delay while medical bills accumulate. Untangling which policy applies and forcing the right one to respond is the core of the case, and it is not a fair fight to have alone against insurers who handle these daily and are motivated to characterise the trip in whatever way narrows their exposure. That is why representation matters here more than in a simple two-car crash. Rideshare lawyers work on contingency: nothing up front, no hourly fee, a percentage of the recovery (commonly about a third before a lawsuit and more in litigation) with case costs off the top, and no fee if there is no recovery — so the cost of getting the coverage sorted out is only time. A few situations make a lawyer close to essential: when the app period is disputed, because that single question can swing the available coverage from thirty thousand dollars to a million; when insurers are denying, delaying, or pointing at each other; when the injury is serious enough that the large policy is genuinely in play; and when a government entity may share fault, triggering the six-month deadline and specialised rules. The claims that might be handled alone are the mirror image — a minor injury, a clear app period with one obvious insurer accepting responsibility, and a fair offer already made. Even then, because the evaluation is free on contingency and a rushed settlement forfeits coverage that cannot be reopened, getting reviewed costs little and risks nothing. For how the coverage layers themselves work, the rideshare coverage guide explains the periods; when it comes to making an insurer actually pay under the right one, that is the work a lawyer does.',
      whatToTrack: [
        'Whether the app period is being disputed by any insurer',
        'Whether insurers are denying, delaying, or blaming each other',
        'How serious and lasting the injury is',
        'Whether multiple parties or a government entity may share fault',
        'Any offer already made and which policy it comes from',
        'The trip data and whether it has been preserved',
        'The crash date, so the deadline is not quietly running out',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you judge whether a rideshare claim needs an attorney before you commit — it flags a disputed app period, layered policies, and insurers pointing at each other, which are the signals that representation changes the outcome. When it makes sense, it matches you with California rideshare attorneys who work on contingency and know how to force the right policy to respond. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need a lawyer for an Uber or Lyft accident?',
        a: 'More often than for a simple car crash, because the coverage is layered and the insurers dispute which policy applies. If the app period is contested, insurers are delaying or blaming each other, or the injury is serious, a lawyer materially changes the outcome. A minor injury with a clear period and a cooperative insurer can sometimes be handled directly.',
      },
      {
        q: 'How much does an Uber accident lawyer cost in California?',
        a: 'Typically nothing up front. These lawyers work on contingency — a percentage of the recovery, commonly about a third before a lawsuit and more in litigation, with case costs off the top and no fee if there is no recovery. Being evaluated does not cost anything.',
      },
      {
        q: 'The insurers keep pointing at each other. What do I do?',
        a: 'That standoff is the most common reason rideshare victims need representation. Someone has to establish the app period from the trip data and force the correct policy — often the platform\u2019s $1 million coverage — to respond. A lawyer does this routinely; unrepresented claimants are frequently left waiting while bills grow.',
      },
      {
        q: 'I already got an offer. Should I take it?',
        a: 'Check which policy it came from first. An early offer from a smaller policy may leave the $1 million coverage untouched if the app period supports it, and accepting can forfeit that. A contingency review costs nothing and is the way to know whether the offer reflects the coverage that actually applies.',
      },
      {
        q: 'What should I ask a rideshare accident lawyer before hiring?',
        a: 'How they establish the app period, how they handle layered policies and UM/UIM, whether they send preservation demands for the trip data, how they deal with insurers pointing at each other, the contingency percentage before and after a lawsuit, and how case costs are handled. Their answer on the app period is the most telling.',
      },
    ],
  },
]

export const rideshareGuideTopicContentBySlug: Record<string, TopicContent> = {
  [RIDESHARE_VALUE_SLUG]: {
    scenario: `A passenger was injured when her Lyft was struck by an underinsured driver who ran a light. The at-fault driver carried the state minimum, which would have capped an ordinary claim — but because a trip was in progress, Lyft\u2019s $1 million policy and its UM/UIM coverage applied, and the value tracked the injury rather than the other driver\u2019s thin policy. ${NOT_ADVICE}`,
    timeline: [
      ['Crash during a trip', 'Save the receipt; the app period fixes which policy applies.'],
      ['First weeks', 'Treatment defines the injury; insurers begin positioning on coverage.'],
      ['Coverage sorted', 'The applicable policy is established from trip data and the layers mapped.'],
      ['Before settling', 'The claim is valued against the coverage that actually applies.'],
    ],
    severityLadder: [
      ['Minor', 'Soft-tissue injury that resolves; value modest even with coverage available.'],
      ['Moderate', 'An injury needing sustained treatment.'],
      ['Serious', 'Fractures, surgery, or a lasting limitation, where the $1M policy matters.'],
      ['Severe', 'Permanent disability or catastrophic injury, where large limits are decisive.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Assessment and imaging after the collision.' },
      { label: 'Follow-up care', copy: 'Orthopedic or specialist treatment as injuries declare themselves.' },
      { label: 'Rehabilitation', copy: 'Physical therapy, where continuity supports the claim.' },
      { label: 'Lasting impact', copy: 'Permanent restriction, which the large policy can actually cover.' },
    ],
    settlementDrivers: [
      'The app period at the time of the crash',
      'Whether you were a passenger or a driver',
      'The severity and permanence of the injury',
      'Whether the full $1 million policy applies',
      'Whether multiple liable parties add coverage',
      'Available UM/UIM coverage',
    ],
    settlementValueDetails: [
      { label: 'The period sets the coverage', copy: 'The full $1M attaches only during an active trip; before that, far less.' },
      { label: 'Passengers are strongest', copy: 'Rarely at fault and typically covered by the large policy.' },
      { label: 'Layers can stack', copy: 'Multiple liable parties may add coverage rather than compete.' },
      { label: 'UM/UIM fills gaps', copy: 'Rideshare UM/UIM covers an underinsured at-fault driver during a trip.' },
    ],
    insuranceProblems: [
      'The app period is characterised to trigger a smaller policy.',
      'The platform and the driver\u2019s personal insurer point at each other.',
      'Coverage is delayed while medical bills grow.',
      'A quick offer is made from a smaller policy before the trip data is checked.',
      'UM/UIM coverage is never mentioned to the passenger.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger, the rideshare driver, or another motorist?' },
      { label: 'Step 2', question: 'Was the app off, on-and-waiting, or on an active trip?' },
      { label: 'Step 3', question: 'Do you have the trip receipt and the crash time?' },
      { label: 'Step 4', question: 'How serious is the injury?' },
    ],
  },
  [RIDESHARE_SOL_SLUG]: {
    scenario: `A rider assumed the many insurance letters meant someone was handling the deadline. Two years later no suit had been filed, the app period was being disputed, and Lyft\u2019s trip data — never formally preserved — had become the whole fight. The two-year figure had been correct and beside the point. ${NOT_ADVICE}`,
    timeline: [
      ['Date of the crash', 'The two-year clock starts here. Record the time and trip details.'],
      ['Early', 'Send a preservation demand for the platform\u2019s trip data.'],
      ['Six-month mark', 'Where a public entity contributed, the written claim is generally due.'],
      ['Two years', 'The general filing deadline for a rideshare injury claim.'],
    ],
    severityLadder: [
      ['Within a typical window', 'More than a year remains and no public entity is involved.'],
      ['Evidence at risk', 'Trip data unpreserved and the app period increasingly contestable.'],
      ['Urgent', 'Under ninety days, or a six-month government claim still open.'],
      ['May have passed', 'Beyond two years, unless the victim was a child.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'The general period for a rideshare injury claim, from the crash.' },
      { label: 'Six months', copy: 'Written claim to a public entity that contributed to the crash.' },
      { label: 'Paused for minors', copy: 'A child\u2019s period is generally paused until they turn eighteen.' },
      { label: 'Trip data', copy: 'Not gone in days, but best secured early to fix the app period.' },
    ],
    settlementDrivers: [
      'The exact date and time of the crash',
      'Whether the trip data has been preserved',
      'Whether a public entity contributed',
      'The victim\u2019s age at the time',
      'How many insurers are involved',
      'Whether the app period is already contested',
    ],
    settlementValueDetails: [
      { label: 'Negotiation does not pause it', copy: 'Active claims with several insurers do not stop the clock.' },
      { label: 'The government clock comes first', copy: 'Six months arrives long before two years where a public entity contributed.' },
      { label: 'Preserve the period proof', copy: 'Securing trip data early prevents a later app-period dispute.' },
      { label: 'Filing is not resolution', copy: 'Filing starts the case; the injury timeline governs when it settles.' },
    ],
    insuranceProblems: [
      'Several insurers negotiate while the two-year period runs out.',
      'Trip data is left unpreserved and the app period becomes contested.',
      'A public-entity contribution is missed until six months have passed.',
      'A minor\u2019s paused deadline is assumed to have expired.',
      'A pending offer is assumed to preserve the claim.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the exact date and time of the crash?' },
      { label: 'Step 2', question: 'Do you have the trip receipt and app status?' },
      { label: 'Step 3', question: 'Could a road defect or public vehicle have contributed?' },
      { label: 'Step 4', question: 'How old was the injured person at the time?' },
    ],
  },
  [RIDESHARE_HIRE_SLUG]: {
    scenario: `Two Uber passengers: one with a sprain, a clear active trip, and a fair offer from the platform\u2019s insurer settled alone. The other faced three insurers disputing whether the driver was really on a trip; a lawyer preserved the trip data, fixed the period, and unlocked the $1 million policy the injury actually needed. ${NOT_ADVICE}`,
    timeline: [
      ['Right after the crash', 'Get treatment and save the trip receipt.'],
      ['First contact', 'Multiple insurers appear and begin positioning on coverage.'],
      ['Deciding on counsel', 'A disputed period, delay, or a serious injury are the signals.'],
      ['Before accepting', 'An early offer may come from the wrong, smaller policy.'],
    ],
    severityLadder: [
      ['Handle it yourself', 'Minor injury, clear period, cooperative insurer, fair offer.'],
      ['Worth a review', 'Any coverage ambiguity or an injury needing treatment.'],
      ['Get representation', 'Disputed period, insurers stalling, or a serious injury.'],
      ['Move quickly', 'A government entity involved, or trip data at risk of dispute.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; a percentage of the recovery, no fee if there is no recovery.' },
      { label: 'Coverage battle', copy: 'Establishing the app period and forcing the right policy to respond.' },
      { label: 'Preservation demands', copy: 'Securing the platform\u2019s trip data before it is contested.' },
      { label: 'Litigation', copy: 'If insurers will not pay under the right policy, the percentage rises.' },
    ],
    settlementDrivers: [
      'Whether the app period is disputed',
      'Whether insurers are delaying or blaming each other',
      'How serious the injury is',
      'Whether multiple parties or a public entity share fault',
      'Any offer already made and its source policy',
      'How close the filing deadline is',
    ],
    settlementValueDetails: [
      { label: 'The period is the fight', copy: 'It can swing coverage from a state minimum to a million dollars.' },
      { label: 'Insurers stall by design', copy: 'Pointing at each other delays payment while bills grow.' },
      { label: 'Free to be evaluated', copy: 'A contingency review costs only time.' },
      { label: 'Early offers can forfeit', copy: 'Settling under a smaller policy can waive the larger one.' },
    ],
    insuranceProblems: [
      'The victim is told the claim is simple when the coverage is layered.',
      'A quick offer from a small policy is pushed before the period is fixed.',
      'Insurers delay by disputing whether the driver was on a trip.',
      'A government-entity deadline is allowed to pass.',
      'The passenger is never told UM/UIM coverage applies.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is any insurer disputing the app period?' },
      { label: 'Step 2', question: 'Are insurers delaying or blaming each other?' },
      { label: 'Step 3', question: 'How serious is the injury?' },
      { label: 'Step 4', question: 'Has an offer been made, and from which policy?' },
    ],
  },
}

/** Cross-link target for the coverage mechanics these spokes intentionally omit. */
export const RIDESHARE_COVERAGE_SLUG = COVERAGE_SLUG
