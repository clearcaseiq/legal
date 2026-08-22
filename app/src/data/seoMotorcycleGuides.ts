import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Three motorcycle spokes: fault, filing deadline, and hiring.
 *
 * The value question already has a page
 * (`/how-much-is-a-motorcycle-accident-case-worth`), a general accident-type
 * page exists at `/commercial/motorcycle-accident`, and case strength at
 * `/case-strength-motorcycle-accident`. These three complete the hub with the
 * fault, deadline, and hiring queries.
 *
 * Two California specifics anchor these pages and are easy to get wrong:
 * lane splitting is lawful (Vehicle Code section 21658.1), so it is not fault
 * in itself; but unlike bicycles, a DOT helmet is mandatory for every rider and
 * passenger (Vehicle Code section 27803), so a helmet argument has real (though
 * bounded) force here and only as to head injuries.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A motorcycle claim turns on fault, the coverage available, and medical facts particular to you, which a licensed California attorney can review.'

export const MOTO_LIABILITY_SLUG = '/who-is-at-fault-in-a-motorcycle-accident-in-california'
export const MOTO_SOL_SLUG = '/california-motorcycle-accident-statute-of-limitations'
export const MOTO_HIRE_SLUG = '/do-i-need-a-lawyer-for-a-motorcycle-accident-in-california'

const MOTO_VALUE_SLUG = '/how-much-is-a-motorcycle-accident-case-worth'

export const motorcycleGuidePages: LandingPage[] = [
  {
    slug: MOTO_LIABILITY_SLUG,
    category: 'Liability',
    cluster: 'Motorcycle Liability',
    title: 'Who Is at Fault in a Motorcycle Accident in California?',
    eyebrow: 'Motorcycle liability',
    description:
      'Lane splitting is legal in California, so it is not fault by itself, and the left-turning driver who "never saw" the motorcycle is usually the one at fault. The helmet question is real here — unlike bicycles — but only touches head injuries.',
    psychology: 'I was hurt on a motorcycle and I am already being blamed for it.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'who is at fault in a motorcycle accident California',
      'is lane splitting legal in California',
      'is lane splitting my fault if I crash',
      'left turn motorcycle accident fault California',
      'does not wearing a helmet affect my motorcycle claim',
    ],
    signals: [
      'Lane splitting lawful',
      'Left-turn / failure to yield',
      '"Failure to see" the rider',
      'Helmet use (head injury only)',
      'Speed differential',
      'Comparative fault',
    ],
    sections: {
      whyItMatters:
        'Fault in a California motorcycle crash is decided by the ordinary rules of the road, but two assumptions distort how insurers apply them, and both are worth dismantling early. The first is that a rider who was lane splitting was therefore at fault. Lane splitting — riding between rows of stopped or slow-moving traffic in the same lane — is lawful in California under Vehicle Code section 21658.1, which directs the Highway Patrol to publish safety guidance rather than banning the practice. So lane splitting is not negligence in itself; the only real question is whether the rider used reasonable care, which turns on the speed differential between the motorcycle and surrounding traffic and on the conditions. Expect the insurer to treat lane splitting as fault outright, and expect that position to require evidence it usually does not have. The second assumption is the reverse of a defense the driver often offers: "the motorcycle came out of nowhere" or "I never saw it." Failure to see an approaching motorcycle is one of the most common causes of these crashes, especially in left-turn and lane-change collisions, and it generally supports a finding that the driver failed to keep a proper lookout rather than excusing them. The classic pattern — a car turning left across the path of an oncoming motorcycle with the right of way — usually places fault squarely on the turning driver. Because the physical evidence tends to answer these disputes better than the accounts do, the damage to the motorcycle and the other vehicle, the point and angle of impact, the distance traveled, skid marks, and independent witnesses do the work of rebutting a rider-fault narrative that nobody has actually proven. The helmet deserves precise treatment because California is different from bicycle law here: a DOT-compliant helmet is mandatory for every rider and passenger under Vehicle Code section 27803, so failure to wear one is a violation and can support comparative fault — but only for head injuries, and not for the crash itself or for a broken leg. California\u2019s pure comparative negligence means any fault attached to the rider reduces rather than bars recovery, which is exactly why insurers press the lane-splitting and helmet arguments hard even when the driver plainly failed to yield.',
      whatToTrack: [
        'Whether you were lane splitting, and the speed of traffic relative to yours',
        'What the other driver was doing — turning left, changing lanes, pulling out',
        'Whether the driver said they did not see you, and where that was recorded',
        'The damage to the motorcycle and the other vehicle, and the impact angle',
        'Whether you and any passenger were wearing DOT helmets',
        'Whether the injuries are to the head or elsewhere',
        'Witnesses and any dashcam, helmet-cam, or intersection video',
        'The police report and any citation issued, and to whom',
      ],
      howClearCaseHelps:
        `ClearCaseIQ records the physical evidence that answers rider-fault assumptions before it disappears, and treats lane splitting as the lawful act it is rather than as automatic fault. It separates injuries a helmet argument could touch — head injuries — from those it cannot, so a broken femur is not discounted by a helmet the law only ties to head trauma. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is lane splitting legal in California?',
        a: 'Yes. Vehicle Code section 21658.1 makes lane splitting lawful and directs the Highway Patrol to issue safety guidance rather than prohibiting it. It is not fault in itself; the only question is whether the rider used reasonable care given the speed differential and conditions. Insurers routinely treat it as fault anyway, and that position usually lacks supporting evidence.',
      },
      {
        q: 'The driver says the motorcycle came out of nowhere. Does that help them?',
        a: 'Usually not. "I never saw the motorcycle" is common in left-turn and lane-change crashes and generally supports a failure to keep a proper lookout rather than excusing the driver. It is most useful to your claim when recorded early — in the report, a recorded statement, or by a witness — before the account is revised.',
      },
      {
        q: 'Who is at fault in a left-turn motorcycle accident?',
        a: 'Typically the turning driver. A car turning left across the path of an oncoming motorcycle that has the right of way is one of the clearest fault patterns in motorcycle law, and the driver\u2019s failure to yield generally controls. The physical evidence — impact point and angle, vehicle damage — usually confirms it over the driver\u2019s account.',
      },
      {
        q: 'Does not wearing a helmet hurt my claim?',
        a: 'It can, but only in a limited way. California requires a DOT helmet for every rider and passenger (Vehicle Code section 27803), so not wearing one is a violation and can support comparative fault — but only for head injuries, not for the crash itself or for injuries elsewhere. It does not defeat a claim, and under pure comparative negligence it could at most reduce head-injury damages.',
      },
      {
        q: 'Can I recover if I was partly at fault?',
        a: 'Yes. California uses pure comparative negligence, so your recovery is reduced by your percentage of fault rather than barred. Even if some fault is assigned for the speed of a lane split or for a helmet issue affecting a head injury, you still recover the rest, which is why the size of any fault percentage is worth contesting.',
      },
    ],
  },
  {
    slug: MOTO_SOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Motorcycle Filing Deadlines',
    title: 'California Motorcycle Accident Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the crash for a California motorcycle injury claim. A road defect can bring a government entity in on a six-month clock, and the severe injuries common on a motorcycle can pull attention away from the deadline entirely.',
    psychology: 'I need to know how long I have to file a motorcycle accident claim.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'how long do I have to file a motorcycle accident claim in California',
      'motorcycle accident statute of limitations California',
      'deadline to sue after a motorcycle crash California',
      'is it too late to file a motorcycle injury claim',
    ],
    signals: [
      'Date of the crash',
      'Road or lane defect',
      'Government entity involved',
      'Victim under 18',
      'Hit-and-run driver',
      'Long hospitalization',
    ],
    sections: {
      whyItMatters:
        'A California motorcycle injury claim runs on the standard two-year personal-injury deadline, measured from the date of the crash, and negotiating with the at-fault driver\u2019s insurer does not extend it. Two features of motorcycle claims make timing harder to manage than the two-year figure suggests. The first is that motorcycle crashes are frequently caused or worsened by the road surface itself — a pothole, a badly maintained seam, gravel or debris in the lane, a poorly designed curve — because a hazard a car would shrug off can put a motorcycle down. Where a public entity is responsible for that condition, a written claim generally has to be presented to it within six months, far ahead of the two years, and missing that window can foreclose the government avenue even where a claim against a driver survives. Because the road so often plays a role in these crashes, this six-month clock is in play more than riders expect. The second feature is practical: motorcycle injuries tend to be severe — multiple fractures, surgeries, extended rehabilitation, sometimes traumatic brain injury — and during that long recovery the rider and their family are focused on getting through it, not on filing deadlines. It is precisely the most serious claims where the clock is most easily overlooked, and an insurer negotiating a catastrophic claim has no duty to warn that the period is closing. The deadline is generally paused where the injured rider was under eighteen. A hit-and-run adds its own urgency: where the driver is unidentified, recovery usually shifts to the rider\u2019s own uninsured-motorist coverage, which carries separate notice and reporting requirements that can be much shorter than two years. So several clocks run at once — two years to file, six months for any public entity, a policy clock for uninsured-motorist claims, and the simple risk of a severe injury consuming attention — all counted from the crash date, which is why recording it precisely and getting the timeline reviewed early is what keeps the deadline from becoming the whole story.',
      whatToTrack: [
        'The exact date of the crash, which the deadline is measured from',
        'Whether a road surface or lane defect contributed',
        'Whether a government entity is responsible for that condition',
        'The rider\u2019s age at the time, since a minor\u2019s period is generally paused',
        'Whether the driver fled, triggering uninsured-motorist notice rules',
        'The treatment timeline, since severe injuries can distract from the deadline',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from the crash date and claim type, including the six-month government presentation clock where a road defect may involve a public entity. ClearCaseIQ records the crash date with the claim facts and flags the government and uninsured-motorist deadlines that run well ahead of the two-year period, so a long recovery does not quietly consume the time to act.',
    },
    faqs: [
      {
        q: 'How long do I have to file a motorcycle accident claim in California?',
        a: 'Generally two years from the date of the crash for an injury claim. If a road defect involves a government entity, a written claim usually has to be presented within six months, which comes first. If the injured rider was a child, the period is generally paused until they turn eighteen.',
      },
      {
        q: 'A bad road surface caused my crash. Does that change the deadline?',
        a: 'For a claim against the responsible public entity, yes. It generally requires a written claim within six months, far ahead of the two years, and missing it can foreclose recovery from the government even if your claim against a driver remains. Because road hazards so often bring a motorcycle down, this deadline is frequently relevant.',
      },
      {
        q: 'I was badly hurt for a long time. Is it too late to file?',
        a: 'Not necessarily. The two-year period may not have passed, and a minor\u2019s deadline is paused. But severe motorcycle injuries are exactly when the clock is most easily missed, and any six-month government deadline does not wait, so it is worth checking the timeline as soon as you are able rather than assuming.',
      },
      {
        q: 'The driver fled. What are my deadlines?',
        a: 'You still have two years to sue, but a hit-and-run usually means turning to your own uninsured-motorist coverage, which has its own notice and reporting requirements that can be much shorter. Reporting promptly and preserving any detail about the vehicle is time-sensitive independent of the two-year clock.',
      },
      {
        q: 'Does negotiating with the insurer extend the deadline?',
        a: 'No. An open claim and an active negotiation leave the two-year period running, and the adjuster need not warn you it is closing. In a serious motorcycle claim, where negotiations can stretch out over a long recovery, this is a real risk.',
      },
    ],
  },
  {
    slug: MOTO_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Motorcycle Hiring',
    title: 'Do I Need a Lawyer for a Motorcycle Accident in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'Motorcycle claims combine severe injuries, a bias that blames the rider, and coverage that is usually too thin for the harm. A contingency-fee lawyer costs nothing up front, and finding enough insurance is often the whole battle.',
    psychology: 'I want to know whether a motorcycle accident claim needs a lawyer.',
    cta: 'Get Matched With a Motorcycle Accident Lawyer',
    exampleQueries: [
      'do I need a lawyer for a motorcycle accident in California',
      'how much does a motorcycle accident lawyer cost',
      'should I get a lawyer after a motorcycle crash',
      'motorcycle accident attorney California',
    ],
    signals: [
      'Severe injury',
      'Rider-fault bias',
      'Lane-splitting dispute',
      'Thin driver coverage',
      'Hit-and-run',
      'Low or denied offer',
    ],
    sections: {
      whyItMatters:
        'Motorcycle claims sit at the intersection of the three features that make representation most valuable, which is why serious ones are rarely worth handling alone. The injuries are typically severe — a rider has no cage or airbags, so fractures needing surgical fixation, extensive road rash, and head and orthopedic injuries that leave permanent restriction are common — so the stakes are high and a discounted offer is very costly. Fault is routinely disputed through a bias against riders that operates quietly in adjuster reasoning and jury attitudes alike: the assumption that the rider was speeding, weaving, or lane splitting recklessly, applied whether or not evidence supports it. Rebutting that assumption takes the lawful status of lane splitting and the physical evidence pressed properly, and it takes treating the mandatory-helmet issue accurately so it is confined to head injuries rather than used to discount the whole claim. And the coverage is usually the real constraint: a surgical motorcycle injury blows past California\u2019s $30,000 minimum bodily-injury limit almost immediately, so where the at-fault driver carries little, the recovery depends on finding other sources — the rider\u2019s own underinsured motorist coverage, an umbrella policy, a commercial policy if a vehicle was being used for work, a public entity for a road defect, or an additional at-fault party. Identifying and stacking that coverage is skilled work that unrepresented riders almost never do, and it is frequently the difference between a nominal recovery and a real one. Motorcycle lawyers work on contingency: nothing up front, no hourly fee, a percentage of the recovery (commonly about a third before a lawsuit and more in litigation) with case costs off the top, and no fee if there is no recovery, so the cost of finding out where you stand is only time. Given the severity, the bias, and the coverage puzzle, almost any motorcycle claim beyond a minor injury warrants at least a review — and the six-month government deadline a road defect can trigger means waiting has a cost. The rare claim that might be handled alone is a minor injury with a clearly at-fault, adequately insured driver accepting responsibility and offering fair value; even then, a free contingency review can surface coverage a rider would never have known to look for.',
      whatToTrack: [
        'How severe and lasting the injuries are',
        'Whether the insurer is leaning on lane splitting or the helmet to assign fault',
        'Whether the at-fault driver is thinly insured or fled',
        'Whether your own UM/UIM, an umbrella, or a commercial policy may apply',
        'Whether a road defect brings in a public entity',
        'Any offer already made and how it treats fault and coverage',
        'The crash date, so the deadline is not quietly running out',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you judge whether a motorcycle claim needs an attorney before you commit — it weighs the severity against disputed fault and, crucially, against whether the available coverage matches the harm. When representation makes sense, it matches you with California motorcycle attorneys who work on contingency and know how to counter rider bias and find the coverage these claims depend on. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need a lawyer after a motorcycle accident?',
        a: 'For almost any injury beyond a minor one, yes. Motorcycle claims combine severe injuries, a bias that blames the rider, and coverage that is often too thin for the harm, and a lawyer\u2019s work finding additional coverage is frequently what makes the claim worthwhile. A minor injury with a clearly at-fault, well-insured driver can sometimes be handled directly.',
      },
      {
        q: 'How much does a motorcycle accident lawyer cost in California?',
        a: 'Typically nothing up front. These lawyers work on contingency — a percentage of the recovery, commonly about a third before a lawsuit and more in litigation, with case costs off the top and no fee if there is no recovery. Being evaluated does not cost anything.',
      },
      {
        q: 'The insurer is blaming me for lane splitting. Can a lawyer help?',
        a: 'Yes, and it is a common reason to have one. Lane splitting is lawful in California, so an insurer treating it as automatic fault is taking a position that usually lacks evidence. A lawyer presses that, along with the physical evidence, and keeps the mandatory-helmet issue confined to head injuries rather than letting it discount the whole claim.',
      },
      {
        q: 'The driver had little insurance. Is my claim worth pursuing?',
        a: 'Often yes, but it usually depends on finding coverage beyond the driver, because surgical motorcycle injuries exceed the state-minimum policy immediately. Your own underinsured motorist coverage, an umbrella policy, a commercial policy, or a public entity for a road defect may all apply. Identifying and stacking those is exactly what a lawyer does.',
      },
      {
        q: 'What should I ask a motorcycle accident lawyer before hiring them?',
        a: 'How many motorcycle cases they have handled, how they counter rider bias and lane-splitting arguments, how they treat the helmet issue, how they find and stack coverage when the driver is underinsured, the contingency percentage before and after a lawsuit, and how case costs are handled.',
      },
    ],
  },
]

export const motorcycleGuideTopicContentBySlug: Record<string, TopicContent> = {
  [MOTO_LIABILITY_SLUG]: {
    scenario: `A car turned left across a rider proceeding straight on a green, and the driver told police the motorcycle "came out of nowhere." The lane position, the impact point on the car\u2019s front quarter, and a witness placed fault on the driver\u2019s failure to yield — and the rider\u2019s DOT helmet took the helmet argument off the table entirely. ${NOT_ADVICE}`,
    timeline: [
      ['Establish the pattern', 'Left turn, lane change, or lane split; each has a typical fault answer.'],
      ['Apply the law', 'Lane splitting lawful; helmet mandatory but head-injury-limited.'],
      ['Secure the evidence', 'Vehicle damage, impact angle, video, and witnesses.'],
      ['Weigh comparative fault', 'What share, if any, genuinely attaches to the rider.'],
    ],
    severityLadder: [
      ['Clear driver fault', 'A left turn across the rider or a failure to yield.'],
      ['Mixed', 'Both parties bear some fault; recovery reduced not barred.'],
      ['Disputed', 'Lane-splitting speed or conflicting accounts.'],
      ['Helmet issue', 'A head injury with no helmet, limited to that injury.'],
    ],
    treatmentProgression: [
      { label: 'Lane splitting', copy: 'Lawful under CVC 21658.1; a question of reasonable care, not automatic fault.' },
      { label: 'Failure to see', copy: '"I never saw the motorcycle" supports a lookout failure, not a defense.' },
      { label: 'Left-turn pattern', copy: 'A car turning across an oncoming rider usually bears the fault.' },
      { label: 'Helmet', copy: 'Mandatory (CVC 27803); relevant only to head injuries.' },
    ],
    settlementDrivers: [
      'What the other driver was doing',
      'Whether lane splitting was reasonable in the conditions',
      'The physical evidence of impact',
      'Whether a helmet was worn, for head injuries',
      'Witnesses and video',
      'How much comparative fault applies',
    ],
    settlementValueDetails: [
      { label: 'Lane splitting is legal', copy: 'It is not fault by itself, whatever the insurer asserts.' },
      { label: 'Evidence beats accounts', copy: 'Impact angle and damage answer "came out of nowhere."' },
      { label: 'Helmet is bounded', copy: 'It can touch head-injury damages only, not the crash or other injuries.' },
      { label: 'Comparative fault reduces', copy: 'Any rider fault cuts the recovery rather than ending it.' },
    ],
    insuranceProblems: [
      'Lane splitting is treated as fault in itself.',
      'The driver revises the account to "the rider was speeding."',
      'A no-helmet argument is used to discount non-head injuries.',
      'The "came out of nowhere" story is accepted without evidence.',
      'Video is allowed to be overwritten before it is requested.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the other driver doing at the moment of impact?' },
      { label: 'Step 2', question: 'Were you lane splitting, and how fast was traffic moving?' },
      { label: 'Step 3', question: 'Were you and any passenger wearing DOT helmets?' },
      { label: 'Step 4', question: 'Are the injuries to the head or elsewhere?' },
    ],
  },
  [MOTO_SOL_SLUG]: {
    scenario: `A rider went down on gravel left in a curve during county road work and spent months in surgery and rehab, dealing only with the other driver\u2019s insurer. The road-maintenance angle involved a public entity with a six-month claim deadline, which passed while he recovered. ${NOT_ADVICE}`,
    timeline: [
      ['Date of the crash', 'The two-year clock starts here. Record it exactly.'],
      ['Six-month mark', 'Where a road defect involves a public entity, the claim is due.'],
      ['During recovery', 'A long hospitalization can quietly consume the time to act.'],
      ['Two years', 'The general filing deadline for a motorcycle injury claim.'],
    ],
    severityLadder: [
      ['Within a typical window', 'More than a year remains and no public entity is involved.'],
      ['Attention at risk', 'A catastrophic injury pulls focus from the deadline.'],
      ['Urgent', 'Under ninety days, a six-month government claim, or a UM notice clock.'],
      ['May have passed', 'Beyond two years, unless the rider was a minor.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'The general period for a motorcycle injury claim, from the crash.' },
      { label: 'Six months', copy: 'Written claim to a public entity for a road-surface defect.' },
      { label: 'Paused for minors', copy: 'A minor rider\u2019s period is generally paused until eighteen.' },
      { label: 'Policy clock', copy: 'A hit-and-run turns on UM coverage with its own notice rules.' },
    ],
    settlementDrivers: [
      'The exact date of the crash',
      'Whether a road-surface defect contributed',
      'Whether a public entity is responsible',
      'The rider\u2019s age at the time',
      'Whether the driver fled',
      'The treatment timeline and its demands',
    ],
    settlementValueDetails: [
      { label: 'Negotiation does not pause it', copy: 'An open claim does not stop the two-year clock.' },
      { label: 'The government clock comes first', copy: 'Six months for a road defect arrives long before two years.' },
      { label: 'Severity distracts', copy: 'The most serious claims are where the deadline is most often missed.' },
      { label: 'Hit-and-run adds a clock', copy: 'UM coverage carries its own, often shorter, notice requirements.' },
    ],
    insuranceProblems: [
      'A public-entity road-defect claim is missed at six months.',
      'The rider is focused on recovery while the deadline runs.',
      'A hit-and-run UM notice deadline passes unnoticed.',
      'A minor\u2019s paused deadline is assumed to have expired.',
      'Negotiation on a catastrophic claim drags past the deadline.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the exact date of the crash?' },
      { label: 'Step 2', question: 'Did the road surface or a work zone contribute?' },
      { label: 'Step 3', question: 'Did the driver flee the scene?' },
      { label: 'Step 4', question: 'How old was the rider at the time?' },
    ],
  },
  [MOTO_HIRE_SLUG]: {
    scenario: `Two riders: one with a broken wrist, a clearly at-fault insured driver, and a fair offer settled alone. The other, with multiple surgeries and a driver carrying the state minimum, needed a lawyer to find his own underinsured coverage and an umbrella policy — the coverage, not the injury, was the whole case. ${NOT_ADVICE}`,
    timeline: [
      ['Right after the crash', 'Get treatment; preserve scene evidence and witnesses.'],
      ['Early', 'Coverage sources and any road-defect angle need identifying.'],
      ['Deciding on counsel', 'Severe injury, disputed fault, or thin coverage are the signals.'],
      ['Before accepting', 'An early offer rarely reflects all available coverage.'],
    ],
    severityLadder: [
      ['Handle it yourself', 'Minor injury, clearly at-fault well-insured driver, fair offer.'],
      ['Worth a review', 'Any disputed fault or an injury needing treatment.'],
      ['Get representation', 'Severe injury, contested fault, or thin coverage.'],
      ['Move quickly', 'Hit-and-run, a road defect, or a government-entity deadline.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; a percentage of the recovery, no fee if there is no recovery.' },
      { label: 'Countering bias', copy: 'Rebutting rider-fault assumptions and lane-splitting arguments.' },
      { label: 'Finding coverage', copy: 'Stacking UM/UIM, umbrella, commercial, and public-entity sources.' },
      { label: 'Litigation', copy: 'If coverage will not respond fairly, the percentage rises.' },
    ],
    settlementDrivers: [
      'How severe the injuries are',
      'Whether fault is disputed via lane splitting or the helmet',
      'Whether the driver is thinly insured or fled',
      'Whether additional coverage can be found and stacked',
      'Whether a road defect brings in a public entity',
      'Any offer already made',
    ],
    settlementValueDetails: [
      { label: 'Coverage is the puzzle', copy: 'Surgical injuries exceed a minimum policy immediately.' },
      { label: 'Bias must be countered', copy: 'Insurers assume rider fault; the law and evidence rebut it.' },
      { label: 'Free to be evaluated', copy: 'A contingency review costs only time.' },
      { label: 'Deadlines can attach', copy: 'A road-defect angle brings a six-month clock.' },
    ],
    insuranceProblems: [
      'A minimum-policy offer is framed as the most available.',
      'The rider is never told their own UM/UIM applies.',
      'Lane splitting or the helmet is used to justify a low, fast offer.',
      'A public-entity deadline is allowed to pass during recovery.',
      'An umbrella or commercial policy is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How severe are the injuries?' },
      { label: 'Step 2', question: 'Is the insurer blaming lane splitting or the helmet?' },
      { label: 'Step 3', question: 'Is the driver thinly insured or did they flee?' },
      { label: 'Step 4', question: 'Do you or a resident relative have auto or umbrella coverage?' },
    ],
  },
}

/** The existing value page these spokes complete the hub around. */
export const MOTORCYCLE_VALUE_SLUG = MOTO_VALUE_SLUG
