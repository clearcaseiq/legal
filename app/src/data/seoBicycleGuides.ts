import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The four bicycle-accident guides.
 *
 * Bicycle currently has only a general accident-type page
 * (`/commercial/bicycle-accident`, "Bicycle Accident Injury Claims"), which is
 * about severity and documentation. This hub adds the four question-shaped
 * pages a searcher actually types — value, fault, deadline, and hiring — with
 * California-specific bicycle law: cyclists have the same rights and duties as
 * drivers (CVC 21200), the three-foot passing law (CVC 21760), dooring
 * (CVC 22517), and the helmet rules that insurers misuse.
 *
 * No page states an average or a typical payout. Deadlines mirror the two-year
 * injury period used elsewhere, including the six-month government clock that
 * matters because roadway and bike-lane defects are common in these crashes.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A bicycle claim turns on right-of-way, the coverage available, and medical facts particular to you, which a licensed California attorney can review.'

export const BIKE_VALUE_SLUG = '/how-much-is-a-bicycle-accident-case-worth'
export const BIKE_LIABILITY_SLUG = '/who-is-at-fault-in-a-bicycle-accident-in-california'
export const BIKE_SOL_SLUG = '/california-bicycle-accident-statute-of-limitations'
export const BIKE_HIRE_SLUG = '/do-i-need-a-lawyer-for-a-bicycle-accident-in-california'

export const bicycleGuidePages: LandingPage[] = [
  {
    slug: BIKE_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Bicycle Claim Value',
    title: 'How Much Is a Bicycle Accident Case Worth in California?',
    eyebrow: 'Bicycle value guide',
    description:
      'A cyclist hit by a car absorbs the impact directly, so these claims start with serious injuries. Value then turns on right-of-way and on whose insurance is available — often the driver\u2019s auto policy, and sometimes the cyclist\u2019s own.',
    psychology: 'I was hit while cycling and want to know what the claim is worth.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a bicycle accident settlement worth in California',
      'bicycle accident claim value California',
      'cyclist hit by car settlement California',
      'what is my bike accident case worth',
      'bicycle vs car accident compensation California',
    ],
    signals: [
      'Injury severity',
      'Right-of-way strength',
      'Comparative fault',
      'Driver policy limits',
      'UM/UIM coverage',
      'Head or orthopedic injury',
    ],
    sections: {
      whyItMatters:
        'A bicycle claim starts from a higher injury base than most car-accident claims, because a cyclist has no protection between their body and the vehicle. Fractures, head injuries, road rash serious enough to need debridement or grafting, and orthopedic injuries that leave lasting restriction are common, and that raises the documented losses from the outset. The value from there turns on two things: right-of-way and available insurance. On fault, California treats a bicycle as a vehicle — a cyclist has the same rights and duties as a driver under Vehicle Code section 21200 — so the analysis is the ordinary one of who had the right of way, with several California rules working in the cyclist\u2019s favor. The three-foot passing law requires a driver overtaking a cyclist to leave at least three feet, and a violation of it is powerful evidence when a cyclist is struck from behind or side-swiped. Dooring — a driver or passenger opening a door into the path of a cyclist — is specifically prohibited, so the reflexive "the cyclist hit my door" framing usually inverts once the statute is applied. Left-hook and right-hook turns across a cyclist\u2019s path, and failures to yield when entering a bike lane, are frequent fault patterns that favor the rider. Against this, insurers lean hard on comparative fault, arguing the cyclist ran a light, rode against traffic, wore dark clothing, or was outside a bike lane, and they raise the helmet question aggressively. It is worth being precise about helmets: California requires them only for riders under eighteen, and for adults the failure to wear one is not the automatic value-killer insurers imply — its effect is limited and contested, and it is only arguably relevant to a head injury, not to a broken leg. California\u2019s pure comparative negligence means these arguments reduce rather than bar recovery. On coverage, the money usually comes from the at-fault driver\u2019s auto liability policy, but two sources people overlook can be decisive: the cyclist\u2019s own uninsured/underinsured motorist coverage generally protects them when hit by a car even though they were not driving, and a resident relative\u2019s policy may also respond, which matters enormously in a hit-and-run or against a minimally insured driver. The honest early questions are how serious the injury is, how clear the right-of-way was, and which policies can be reached.',
      whatToTrack: [
        'Every provider seen, starting with the first visit after the crash',
        'Photographs of the scene, the bike, the vehicle, and the injuries',
        'The point of impact and the positions in the roadway or bike lane',
        'Whether a bike lane existed and who was in it',
        'Any dooring, unsafe pass, or turn across your path',
        'Witnesses and any video from nearby cameras or a bike/helmet cam',
        'The driver\u2019s insurance, and your own and any resident relative\u2019s UM/UIM',
        'The police report and any citation issued',
      ],
      howClearCaseHelps:
        `ClearCaseIQ builds the range from your documented injuries and then weights it by right-of-way and by the coverage that can actually be reached, rather than from an average. It applies the California rules — the three-foot law, dooring, bike-lane right-of-way — instead of accepting an adjuster\u2019s comparative-fault framing, and raises the coverage most cyclists never think to ask about, their own UM/UIM. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is there an average bicycle accident settlement in California?',
        a: 'No usable average, because these claims range from modest to very large depending on injury severity, how clear the right-of-way was, and the coverage available. What is consistent is that the injuries tend to be serious, so the ceiling is often set by the driver\u2019s policy limits and by whether the cyclist\u2019s own UM/UIM coverage can be added.',
      },
      {
        q: 'Does not wearing a helmet hurt my claim?',
        a: 'Less than insurers suggest. California requires helmets only for riders under eighteen; for adults, failure to wear one is not an automatic bar and its effect is limited and contested. It is only arguably relevant to a head injury, not to other injuries, and under pure comparative negligence it could at most reduce, not eliminate, a recovery.',
      },
      {
        q: 'The driver says I came out of nowhere. Does that end my claim?',
        a: 'Usually not. A cyclist has the same right-of-way as a vehicle, and California\u2019s three-foot passing law, dooring prohibition, and bike-lane rules frequently place fault on the driver even when they claim surprise. Physical evidence — the impact point, the positions, any video — tends to answer the "came out of nowhere" framing better than the accounts do.',
      },
      {
        q: 'The driver had little or no insurance. Can I still recover?',
        a: 'Often yes, through your own auto policy. Uninsured and underinsured motorist coverage generally protects you when struck by a car while cycling, and a resident relative\u2019s policy may also apply. This is the recovery source cyclists least expect, and it is frequently what makes a claim against a hit-and-run or minimally insured driver worthwhile.',
      },
      {
        q: 'What makes a bicycle claim worth more?',
        a: 'A serious or permanent injury combined with clear right-of-way and adequate coverage. A driver\u2019s violation of the three-foot law or a dooring, strong scene evidence or video, and available UM/UIM all push value up. It is held down mainly by disputed fault and by thin policy limits, which is where adding coverage sources matters.',
      },
    ],
  },
  {
    slug: BIKE_LIABILITY_SLUG,
    category: 'Liability',
    cluster: 'Bicycle Liability',
    title: 'Who Is at Fault in a Bicycle Accident in California?',
    eyebrow: 'Bicycle liability',
    description:
      'A cyclist has the same rights and duties as a driver in California, so fault is decided by right-of-way. The three-foot passing law, the dooring prohibition, and bike-lane rules often place fault on the driver even when they claim the cyclist appeared from nowhere.',
    psychology: 'I want to know who is actually at fault for my bicycle crash.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'who is at fault in a bicycle accident California',
      'is the driver or cyclist at fault California',
      'three foot passing law California bicycle',
      'dooring accident California who is liable',
      'bicycle right of way California',
    ],
    signals: [
      'Right-of-way',
      'Three-foot passing law',
      'Dooring',
      'Bike lane position',
      'Turn across path',
      'Comparative fault',
    ],
    sections: {
      whyItMatters:
        'Fault in a California bicycle crash is decided the same way it is for two cars, because a bicycle is treated as a vehicle: under Vehicle Code section 21200 a cyclist has the same rights and the same duties as a driver, and the question is who had the right of way. Several California rules shape that answer, and most of them cut in the cyclist\u2019s favor once applied to the physical facts. The three-foot passing law (Vehicle Code section 21760) requires a driver overtaking a cyclist in the same direction to leave at least three feet, or to slow and pass only when safe; a rear-end or side-swipe of a cyclist is strong evidence this was violated. Dooring is separately prohibited (Vehicle Code section 22517): no one may open a vehicle door into moving traffic or leave it open longer than necessary, so a cyclist who strikes a suddenly opened door is generally not the party at fault, even though the driver\u2019s instinct is to say the cyclist ran into them. The common turning collisions — the "right hook," where a driver overtakes and turns right across the cyclist\u2019s path, and the "left hook," where an oncoming driver turns left in front of a cyclist with the right of way — usually place fault on the turning driver\u2019s failure to yield. Vehicles entering or crossing a bike lane must yield to a cyclist already in it. The cyclist has duties too, and where they are breached, fault shifts: riding against traffic, running a signal or stop sign, riding at night without the required lighting, or leaving a bike lane unsafely can all support a fault argument. This is where insurers concentrate, because California uses pure comparative negligence, so any share of fault they can attach to the cyclist reduces the recovery even if the driver was mostly responsible. They also reach for the helmet, which is worth treating precisely: it is required only under eighteen, its absence does not establish fault for the crash at all, and for adults its relevance is limited and contested even as to a head injury. Establishing the right-of-way from the impact point, the roadway positions, any video, and the citations is the work that fixes fault, and it usually rewards the cyclist more than the driver\u2019s account does.',
      whatToTrack: [
        'Who had the right of way at the point of the collision',
        'Whether the driver left three feet when passing',
        'Whether a door was opened into your path',
        'Whether the driver turned across your path (right or left hook)',
        'Whether you were in a bike lane and who entered it',
        'The impact point on the bike and the vehicle',
        'Any citation issued, and to whom',
        'Anything the insurer may argue as your share of fault',
      ],
      howClearCaseHelps:
        `ClearCaseIQ applies the California bicycle rules — same-as-a-vehicle right-of-way, the three-foot law, dooring, and bike-lane priority — to the physical facts, rather than accepting the driver\u2019s "came out of nowhere" account. It separates a genuine comparative-fault issue from an insurer\u2019s reflexive one, and treats the helmet question with the limited weight the law actually gives it. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is the driver or the cyclist usually at fault in California?',
        a: 'It depends entirely on right-of-way, but several California rules favor the cyclist. The three-foot passing law, the dooring prohibition, and the duty to yield when entering a bike lane place fault on drivers in many common crash patterns, even when the driver insists the cyclist appeared from nowhere. Physical evidence usually decides it.',
      },
      {
        q: 'What is the three-foot passing law?',
        a: 'Vehicle Code section 21760 requires a driver overtaking a cyclist going the same direction to leave at least three feet of space, and if that is not possible, to slow and pass only when safe. When a cyclist is hit from behind or side-swiped, a violation of this law is strong evidence the driver was at fault.',
      },
      {
        q: 'A car door hit me while I was cycling. Who is liable?',
        a: 'Generally the person who opened the door. California prohibits opening a vehicle door into traffic when it is unsafe, so the "dooring" driver or passenger is usually at fault, despite the common claim that the cyclist ran into the door. It is one of the clearest fault patterns in bicycle law once the statute is applied.',
      },
      {
        q: 'Can I be blamed for not wearing a helmet?',
        a: 'Only in a limited way. Helmets are required in California only for riders under eighteen. For adults, not wearing one does not make you at fault for the crash and its effect is limited and contested even for a head injury. Insurers raise it aggressively, but it does not carry the weight they imply.',
      },
      {
        q: 'What if we were both partly at fault?',
        a: 'California uses pure comparative negligence, so your recovery is reduced by your percentage of fault rather than barred. If you were 20 percent responsible and your losses are valued at $100,000, you recover $80,000. This is why insurers work to attach any fault they can to the cyclist.',
      },
    ],
  },
  {
    slug: BIKE_SOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bicycle Filing Deadlines',
    title: 'California Bicycle Accident Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the crash for a California bicycle injury claim. A roadway or bike-lane defect can bring a government entity into it, with a six-month claim deadline — and the scene evidence these claims rely on fades fast.',
    psychology: 'I need to know how long I have to file a bicycle accident claim.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'how long do I have to file a bicycle accident claim in California',
      'bicycle accident statute of limitations California',
      'deadline to sue after a bike crash California',
      'is it too late to file a cyclist injury claim',
    ],
    signals: [
      'Date of the crash',
      'Roadway or bike-lane defect',
      'Government entity involved',
      'Victim under 18',
      'Hit-and-run driver',
      'Scene evidence at risk',
    ],
    sections: {
      whyItMatters:
        'A California bicycle injury claim runs on the standard two-year personal-injury deadline, measured from the date of the crash, and negotiating with the driver\u2019s insurer does not extend it. Two things make timing more pressing than the two-year figure suggests. The first is that bicycle crashes frequently involve the roadway itself — a pothole, a poorly designed intersection, a bike lane that funnels riders into a hazard, a defective or missing signal — and where a public entity owns or is responsible for that condition, a written claim generally has to be presented to it within six months. That deadline arrives long before the two years, and missing it can foreclose a claim against the government even where the case against a driver survives. Because so many cycling injuries have a roadway component, this six-month clock is more often in play than people expect. The second is that bicycle claims are won on right-of-way, and the evidence that proves right-of-way is fragile: the positions in the roadway, the impact points, skid or debris marks, and independent witnesses who are strangers on the street. Nearby camera footage may be overwritten within days, a damaged bike may be repaired or discarded, and witnesses become unreachable. A claim filed comfortably within two years can still be hard to prove if the scene evidence that would have established fault was lost in the first weeks. The period is generally paused where the injured person was under eighteen, which matters because children cycle and are hit, and a parent may wrongly assume a claim expired. Hit-and-run adds its own urgency: identifying the driver, or pivoting to the cyclist\u2019s own uninsured-motorist coverage, is time-sensitive and often has its own notice requirements under the policy. So the operative deadlines are several — two years to file, six months for any public entity, a policy clock for uninsured-motorist claims, and a practical evidence deadline measured in days — and the date of the crash is what all of them are counted from.',
      whatToTrack: [
        'The exact date of the crash, which the deadline is measured from',
        'Whether a roadway, intersection, or bike-lane defect contributed',
        'Whether a government entity is responsible for that condition',
        'The victim\u2019s age at the time, since a child\u2019s period is generally paused',
        'Whether the driver fled, triggering uninsured-motorist notice rules',
        'Any nearby camera footage and who controls it',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from the crash date and claim type, including the six-month government presentation clock where a roadway or bike-lane defect may involve a public entity. ClearCaseIQ records the crash date with the claim facts and flags the scene evidence and any uninsured-motorist notice requirements that run well ahead of the two-year deadline.',
    },
    faqs: [
      {
        q: 'How long do I have to file a bicycle accident claim in California?',
        a: 'Generally two years from the date of the crash for an injury claim. If a roadway or bike-lane defect involves a government entity, a written claim usually has to be presented within six months, which comes first. If the injured cyclist was a child, the period is generally paused until they turn eighteen.',
      },
      {
        q: 'A bad road or bike lane caused my crash. Does that change the deadline?',
        a: 'For a claim against the responsible public entity, yes. It generally requires a written claim within six months, far ahead of the two years, and missing it can foreclose recovery from the government even if your claim against a driver remains. Because roadway conditions are common in cycling crashes, this deadline is often in play.',
      },
      {
        q: 'Why is scene evidence so time-sensitive in a bike claim?',
        a: 'Because these claims are won on right-of-way, which is proven by the roadway positions, impact points, video, and witnesses — all of which fade fast. Camera footage is often overwritten within days, a damaged bike may be discarded, and witnesses become unreachable. The legal deadline is two years, but the practical evidence deadline is much sooner.',
      },
      {
        q: 'The driver fled the scene. What are my deadlines?',
        a: 'You still have two years to file, but a hit-and-run usually means turning to your own uninsured-motorist coverage, which carries its own notice and reporting requirements that can be much shorter. Reporting promptly and preserving what you can about the vehicle is time-sensitive independent of the two-year clock.',
      },
      {
        q: 'Is it too late if the crash was months ago?',
        a: 'Check quickly rather than assume. The two years may not have passed, a minor\u2019s deadline may be paused, and some evidence may still be recoverable. But the value of moving fast only rises, because the right-of-way evidence and any six-month government deadline do not wait for the two years.',
      },
    ],
  },
  {
    slug: BIKE_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bicycle Hiring',
    title: 'Do I Need a Lawyer for a Bicycle Accident in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'Cyclists face a built-in bias — insurers assume the rider did something wrong — on top of serious injuries and disputed right-of-way. A contingency-fee lawyer costs nothing up front, and these claims often turn on evidence that has to be secured fast.',
    psychology: 'I want to know whether a bicycle accident claim needs a lawyer.',
    cta: 'Get Matched With a Bicycle Accident Lawyer',
    exampleQueries: [
      'do I need a lawyer for a bicycle accident in California',
      'how much does a bicycle accident lawyer cost',
      'should I get a lawyer after being hit on my bike',
      'bicycle accident attorney California',
    ],
    signals: [
      'Serious injury',
      'Disputed right-of-way',
      'Anti-cyclist bias',
      'Thin driver coverage',
      'Scene evidence at risk',
      'Hit-and-run',
    ],
    sections: {
      whyItMatters:
        'Bicycle claims combine three things that make representation valuable more often than in an ordinary fender-bender: serious injuries, disputed right-of-way, and a bias against cyclists that operates quietly in adjuster reasoning and jury attitudes alike. Insurers frequently start from the assumption that the rider did something wrong — ran a light, came out of nowhere, was not wearing a helmet — whether or not evidence supports it, and answering that assumption takes the California bicycle rules applied to hard scene evidence, which is exactly the work a lawyer does. Because the injuries are often severe, the stakes are high enough that a discounted offer costs far more than a fee. And because these claims are won on right-of-way evidence that fades within days — camera footage overwritten, a bike discarded, witnesses lost — someone has to move quickly to preserve it, which unrepresented claimants rarely do in the aftermath of a serious injury. All of this points toward getting reviewed. Bicycle lawyers work on contingency: nothing up front, no hourly fee, a percentage of the recovery (commonly about a third before a lawsuit and more in litigation) with case costs off the top, and no fee if there is no recovery, so the cost of finding out where you stand is only time. Several situations make a lawyer close to essential: a serious or permanent injury; a driver or insurer disputing right-of-way or leaning on the helmet or "came out of nowhere" arguments; a thinly insured or hit-and-run driver, where recovery depends on identifying additional coverage like your own UM/UIM; and any roadway-defect angle that brings a government entity and its six-month deadline into play. The claims that might be handled alone are the mirror image — a minor injury, an obviously at-fault driver with adequate insurance accepting responsibility, and a fair offer already on the table. Even then, because the evaluation is free and an early settlement forfeits value that cannot be reopened, a quick review costs little and can catch coverage a cyclist would never have known to look for.',
      whatToTrack: [
        'How serious and lasting the injury is',
        'Whether right-of-way or the helmet is being disputed',
        'Whether the driver is thinly insured or fled the scene',
        'Whether scene evidence or video is at risk of being lost',
        'Whether a roadway defect brings in a public entity',
        'Any offer already made and how it treats fault',
        'The crash date, so the deadline is not quietly running out',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you judge whether a bicycle claim needs an attorney before you commit — it weighs the injury against disputed right-of-way and flags the evidence and coverage that have to be secured quickly. When representation makes sense, it matches you with California bicycle attorneys who work on contingency and know how to counter anti-cyclist framing with the right-of-way rules. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need a lawyer after being hit on my bike?',
        a: 'More often than for a minor car crash, because cyclists face serious injuries, disputed right-of-way, and a built-in bias that the rider was at fault. If the injury is serious, fault is contested, or the driver is thinly insured or fled, a lawyer materially changes the outcome. A minor injury with a clearly at-fault, insured driver can sometimes be handled directly.',
      },
      {
        q: 'How much does a bicycle accident lawyer cost in California?',
        a: 'Typically nothing up front. These lawyers work on contingency — a percentage of the recovery, commonly about a third before a lawsuit and more in litigation, with case costs off the top and no fee if there is no recovery. Being evaluated does not cost anything.',
      },
      {
        q: 'The insurer is blaming me. Can a lawyer help?',
        a: 'That is one of the clearest reasons to have one. Insurers reflexively blame cyclists, and countering it takes the California rules — the three-foot law, dooring, bike-lane priority — applied to the impact point, positions, and any video. A lawyer builds that record; unrepresented cyclists are often talked into accepting fault they do not bear.',
      },
      {
        q: 'The driver had little insurance or fled. Is it worth pursuing?',
        a: 'Often yes, but it usually requires finding coverage beyond the driver — most importantly your own uninsured/underinsured motorist coverage, which generally protects you when hit while cycling, and possibly a resident relative\u2019s policy. Identifying those sources is exactly the kind of thing a lawyer does and a claimant would not know to ask about.',
      },
      {
        q: 'What should I ask a bicycle accident lawyer before hiring them?',
        a: 'How many cycling cases they have handled, how they counter anti-cyclist bias and the helmet argument, whether they move quickly to preserve video and scene evidence, how they find additional coverage like UM/UIM, the contingency percentage before and after a lawsuit, and how case costs are handled.',
      },
    ],
  },
]

export const bicycleGuideTopicContentBySlug: Record<string, TopicContent> = {
  [BIKE_VALUE_SLUG]: {
    scenario: `A commuter was side-swiped by a driver who passed within a foot in a bike lane, fracturing a wrist and shoulder. The three-foot violation made right-of-way clear; the value grew further when the driver\u2019s low policy limits were supplemented by the cyclist\u2019s own underinsured-motorist coverage. ${NOT_ADVICE}`,
    timeline: [
      ['Day of the crash', 'Get treatment; photograph the scene, the bike, and the vehicle.'],
      ['First weeks', 'Treatment defines the injury; nearby video is at risk of being overwritten.'],
      ['Months after', 'Surgery or lasting restriction becomes clear, raising the ceiling.'],
      ['Before settling', 'The claim is valued once the injury stabilises and coverage is mapped.'],
    ],
    severityLadder: [
      ['Minor', 'Road rash or a sprain that resolves; value modest.'],
      ['Moderate', 'A fracture or an injury needing weeks of treatment.'],
      ['Serious', 'Surgery, a head injury, or a lasting limitation.'],
      ['Severe', 'Permanent disability, a spinal or brain injury.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Imaging and stabilisation for fractures, head injury, or road rash.' },
      { label: 'Orthopedic care', copy: 'Fixation, casting, and follow-up for broken bones.' },
      { label: 'Wound and PT care', copy: 'Debridement or grafting for road rash; physical therapy for function.' },
      { label: 'Lasting impact', copy: 'Permanent restriction that drives the largest values.' },
    ],
    settlementDrivers: [
      'The severity and permanence of the injury',
      'How clear the right-of-way was',
      'Whether the driver violated the three-foot law or doored you',
      'The driver\u2019s policy limits',
      'Available UM/UIM coverage',
      'The amount of comparative fault an insurer can argue',
    ],
    settlementValueDetails: [
      { label: 'Injuries start high', copy: 'A cyclist absorbs the impact directly, so damages begin serious.' },
      { label: 'Right-of-way sets leverage', copy: 'A three-foot or dooring violation makes fault clear.' },
      { label: 'UM/UIM adds coverage', copy: 'Your own policy can supplement a thinly insured driver.' },
      { label: 'Comparative fault discounts', copy: 'Every percentage an insurer attaches comes off the recovery.' },
    ],
    insuranceProblems: [
      'The cyclist is blamed for coming out of nowhere.',
      'The helmet is used to discount a claim that has nothing to do with the head.',
      'Nearby video is overwritten before it is requested.',
      'The driver\u2019s thin policy is treated as the whole ceiling.',
      'A quick offer is made before the injury has developed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How were you hit — from behind, a door, a turn across your path?' },
      { label: 'Step 2', question: 'Were you in a bike lane, and who had the right of way?' },
      { label: 'Step 3', question: 'What insurance does the driver have, and do you have UM/UIM?' },
      { label: 'Step 4', question: 'How serious is the injury?' },
    ],
  },
  [BIKE_LIABILITY_SLUG]: {
    scenario: `A driver turned right across a cyclist proceeding straight in a bike lane, then told police the cyclist "shot past." The right-hook pattern and the cyclist\u2019s lane position placed fault on the driver\u2019s failure to yield, and a nearby doorbell camera confirmed it before the footage cycled out. ${NOT_ADVICE}`,
    timeline: [
      ['Establish right-of-way', 'Who had priority at the point of the collision.'],
      ['Apply the rules', 'Three-foot law, dooring, bike-lane priority, and turn duties.'],
      ['Secure the evidence', 'Impact points, positions, citations, and any video.'],
      ['Weigh comparative fault', 'What share, if any, genuinely attaches to the cyclist.'],
    ],
    severityLadder: [
      ['Clear driver fault', 'A three-foot violation, dooring, or a failure to yield turning.'],
      ['Mixed', 'Both parties bear some fault; recovery reduced not barred.'],
      ['Disputed', 'Conflicting accounts with limited physical evidence.'],
      ['Cyclist-heavy', 'Riding against traffic, running a signal, or no night lighting.'],
    ],
    treatmentProgression: [
      { label: 'Same as a vehicle', copy: 'A cyclist has the same rights and duties as a driver (CVC 21200).' },
      { label: 'Three-foot law', copy: 'Overtaking drivers must leave at least three feet (CVC 21760).' },
      { label: 'Dooring', copy: 'Opening a door into a cyclist\u2019s path is prohibited (CVC 22517).' },
      { label: 'Bike-lane priority', copy: 'Vehicles entering a bike lane must yield to a cyclist in it.' },
    ],
    settlementDrivers: [
      'Who had the right of way',
      'Whether the driver left three feet',
      'Whether a door was opened into your path',
      'Whether the driver turned across your path',
      'Your lane position and lighting',
      'How much comparative fault applies',
    ],
    settlementValueDetails: [
      { label: 'Right-of-way decides it', copy: 'Fault turns on priority, the same as between two vehicles.' },
      { label: 'The rules favor cyclists', copy: 'Three-foot, dooring, and bike-lane rules often place fault on drivers.' },
      { label: 'Evidence beats accounts', copy: 'Impact points and video usually outweigh "came out of nowhere."' },
      { label: 'Helmets carry little weight', copy: 'Required only under 18; limited and contested for adults.' },
    ],
    insuranceProblems: [
      'The driver claims the cyclist appeared from nowhere.',
      'A dooring is reframed as the cyclist hitting the door.',
      'The helmet is used to imply the cyclist was reckless.',
      'A right- or left-hook turn is blamed on the cyclist\u2019s speed.',
      'Video is allowed to cycle out before it is requested.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the driver doing — passing, turning, opening a door?' },
      { label: 'Step 2', question: 'Where were you positioned, and was there a bike lane?' },
      { label: 'Step 3', question: 'Was a citation issued, and to whom?' },
      { label: 'Step 4', question: 'Is there any nearby camera or helmet-cam footage?' },
    ],
  },
  [BIKE_SOL_SLUG]: {
    scenario: `A rider hit a deep pothole thrown into his path by a car and assumed his only claim was against the driver. The road was maintained by the city, and the six-month government-claim window for the roadway defect closed while he focused on the driver\u2019s insurer. ${NOT_ADVICE}`,
    timeline: [
      ['Date of the crash', 'The two-year clock starts here. Record it exactly.'],
      ['Days after', 'Nearby video and the damaged bike are at highest risk.'],
      ['Six-month mark', 'Where a roadway defect involves a public entity, the claim is due.'],
      ['Two years', 'The general filing deadline for a bicycle injury claim.'],
    ],
    severityLadder: [
      ['Within a typical window', 'More than a year remains and no public entity is involved.'],
      ['Evidence at risk', 'Video and scene proof may already be gone.'],
      ['Urgent', 'Under ninety days, a six-month government claim, or a UM notice clock.'],
      ['May have passed', 'Beyond two years, unless the victim was a child.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'The general period for a bicycle injury claim, from the crash.' },
      { label: 'Six months', copy: 'Written claim to a public entity responsible for a roadway defect.' },
      { label: 'Paused for minors', copy: 'A child\u2019s period is generally paused until they turn eighteen.' },
      { label: 'Policy clock', copy: 'A hit-and-run turns on UM coverage with its own notice rules.' },
    ],
    settlementDrivers: [
      'The exact date of the crash',
      'Whether a roadway or bike-lane defect contributed',
      'Whether a public entity is responsible',
      'The victim\u2019s age at the time',
      'Whether the driver fled',
      'Whether scene evidence still exists',
    ],
    settlementValueDetails: [
      { label: 'Negotiation does not pause it', copy: 'An open claim with a driver\u2019s insurer does not stop the clock.' },
      { label: 'The government clock comes first', copy: 'Six months for a roadway defect arrives long before two years.' },
      { label: 'Evidence expires fastest', copy: 'Video and the bike can be gone within days.' },
      { label: 'Hit-and-run adds a clock', copy: 'UM coverage carries its own, often shorter, notice requirements.' },
    ],
    insuranceProblems: [
      'A roadway-defect claim against a public entity is missed at six months.',
      'Video is overwritten while the claimant heals.',
      'The damaged bike is repaired, losing key evidence.',
      'A hit-and-run UM notice deadline passes unnoticed.',
      'Negotiation with the driver\u2019s insurer runs past the deadline.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the exact date of the crash?' },
      { label: 'Step 2', question: 'Did a pothole, bad intersection, or bike-lane defect contribute?' },
      { label: 'Step 3', question: 'Did the driver flee the scene?' },
      { label: 'Step 4', question: 'How old was the cyclist at the time?' },
    ],
  },
  [BIKE_HIRE_SLUG]: {
    scenario: `Two cyclists: one with a scraped knee, an apologetic insured driver, and a fair offer handled it alone. The other, with a fractured pelvis and an insurer insisting she "ran the light," needed a lawyer to pull the intersection camera and apply the right-of-way rules before the footage was gone. ${NOT_ADVICE}`,
    timeline: [
      ['Right after the crash', 'Get treatment; photograph the scene and note witnesses.'],
      ['First days', 'The window to preserve video and the bike is closing.'],
      ['Deciding on counsel', 'A serious injury, disputed fault, or thin coverage are the signals.'],
      ['Before accepting', 'An early offer usually reflects an anti-cyclist view of fault.'],
    ],
    severityLadder: [
      ['Handle it yourself', 'Minor injury, clearly at-fault insured driver, fair offer.'],
      ['Worth a review', 'Any disputed fault or an injury needing treatment.'],
      ['Get representation', 'Serious injury, contested right-of-way, or thin coverage.'],
      ['Move quickly', 'Hit-and-run, roadway defect, or video about to be lost.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; a percentage of the recovery, no fee if there is no recovery.' },
      { label: 'Countering bias', copy: 'Applying the bicycle rules to rebut the "rider was at fault" assumption.' },
      { label: 'Evidence preservation', copy: 'Securing video, the bike, and witnesses before they are gone.' },
      { label: 'Finding coverage', copy: 'Identifying UM/UIM or a relative\u2019s policy for a thin or fled driver.' },
    ],
    settlementDrivers: [
      'How serious the injury is',
      'Whether right-of-way is disputed',
      'Whether the driver is thinly insured or fled',
      'Whether scene evidence is at risk',
      'Whether a roadway defect brings in a public entity',
      'Any offer already made',
    ],
    settlementValueDetails: [
      { label: 'Bias needs countering', copy: 'Insurers assume cyclist fault; the rules and evidence rebut it.' },
      { label: 'Evidence is time-critical', copy: 'Much of the value of counsel is preserving proof fast.' },
      { label: 'Coverage is hidden', copy: 'UM/UIM and relative policies are sources cyclists miss.' },
      { label: 'Free to be evaluated', copy: 'A contingency review costs only time.' },
    ],
    insuranceProblems: [
      'The cyclist is pushed to accept fault they do not bear.',
      'A quick offer is made before video can be requested.',
      'The helmet is used to justify a low offer.',
      'A hit-and-run claimant is not told about their own UM coverage.',
      'A roadway-defect deadline is allowed to pass.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the insurer disputing who had the right of way?' },
      { label: 'Step 2', question: 'How serious is the injury?' },
      { label: 'Step 3', question: 'Is the driver thinly insured, or did they flee?' },
      { label: 'Step 4', question: 'Could video or scene evidence still be preserved?' },
    ],
  },
}
