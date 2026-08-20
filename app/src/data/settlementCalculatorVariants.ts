/**
 * Per-injury configuration for the settlement calculator.
 *
 * These five URLs were titled as calculators but rendered a generic SEO landing
 * page with template-generated FAQs that differed only by the injury name. That
 * is the pattern search engines treat as scaled content, and it fails the visitor
 * twice: the promised tool is missing and the copy says nothing specific.
 *
 * Each variant therefore has to carry facts that only apply to that claim type —
 * the coverage that attaches, the defense the carrier actually runs, the evidence
 * that decides causation. Where the underlying method is a poor fit for an injury
 * (see the traumatic brain injury `methodWarning`) the page says so rather than
 * presenting a confident number.
 *
 * FAQs live here so the visible questions and the FAQPage structured data built
 * from `seoRequestedPages` come from one source.
 */
import type { EstimateClaimType, InjurySeverity } from '../lib/settlementEstimate'
import type { CalculatorVariantSlug } from './settlementCalculatorVariantSlugs'

export type CalculatorVariant = {
  slug: CalculatorVariantSlug
  h1: string
  eyebrow: string
  intro: string
  defaultSeverity: InjurySeverity
  defaultClaimType?: EstimateClaimType
  /** Relabels the wage field where lost earning capacity dominates the claim. */
  wageLabel?: string
  wageHint?: string
  /** Guidance shown beside the policy limit field. */
  coverageHint: string
  /** Prominent warning when the multiplier method fits this injury badly. */
  methodWarning?: string
  valueDrivers: Array<{ label: string; copy: string }>
  /** Shown with the result: what the arithmetic cannot see. */
  caveats: string[]
  faqs: Array<{ q: string; a: string }>
  relatedTools: Array<{ label: string; to: string }>
}

export const CALCULATOR_VARIANTS: CalculatorVariant[] = [
  {
    slug: '/tools/whiplash-settlement-calculator',
    h1: 'Whiplash settlement calculator',
    eyebrow: 'Soft tissue claims',
    intro:
      'Whiplash claims are valued almost entirely on how long treatment lasted and how consistent it was, because there is usually no imaging finding to point to. This estimates a range from your documented costs and shows where the soft tissue arguments come in.',
    defaultSeverity: 'soft_tissue',
    coverageHint:
      'Whiplash claims often settle inside a minimum-limits policy. California’s minimum bodily injury coverage rose to $30,000 per person in 2025, and many drivers carry exactly that.',
    valueDrivers: [
      {
        label: 'Treatment duration and consistency',
        copy: 'With no objective finding, length and regularity of care become the main proxy for severity. A six-week course of therapy and an eight-month one are valued very differently, and missed appointments are read as recovery.',
      },
      {
        label: 'The minor-impact defense',
        copy: 'Carriers run programs that compare photographs of vehicle damage against the injury claimed, arguing that a low-speed impact could not produce lasting harm. Low property damage with a long treatment history draws this argument almost automatically.',
      },
      {
        label: 'Gaps in care',
        copy: 'A month with no treatment is used to argue you had recovered and that later care is unrelated. Gaps with a documented reason — insurance loss, work, childcare — are far easier to explain than unexplained ones.',
      },
      {
        label: 'Prior neck complaints',
        copy: 'Earlier neck treatment in your records invites a pre-existing condition argument. It does not defeat a claim, since aggravation of an existing condition is compensable, but it changes what has to be proven.',
      },
      {
        label: 'Early documentation',
        copy: 'Whiplash symptoms often appear a day or two later. A contemporaneous record of when pain began — an urgent care visit or a call to your doctor — closes the gap the carrier would otherwise use.',
      },
    ],
    caveats: [
      'Soft tissue claims are where billed amounts get contested hardest. Expect the carrier to argue that some of the treatment was neither reasonable nor necessary, which attacks the multiplier base itself.',
      'If imaging later shows a disc injury, this stops being a soft tissue claim and the range changes substantially. Use the herniated disc calculator instead.',
    ],
    faqs: [
      {
        q: 'What is a typical whiplash settlement range?',
        a: 'There is no reliable typical figure, which is why this tool asks for your numbers instead of quoting an average. Published averages mix minimum-limits policies with severe cases and treatment courses ranging from weeks to years, so the average describes no actual claim.',
      },
      {
        q: 'Why does whiplash get treated skeptically?',
        a: 'Because it usually cannot be confirmed by imaging. The diagnosis rests on your reported symptoms and your provider’s examination findings, so carriers scrutinize consistency: whether you reported pain immediately, treated steadily, and described the same limitations throughout.',
      },
      {
        q: 'Does low vehicle damage mean a low settlement?',
        a: 'It is used that way. Insurers rely on minor-impact soft tissue programs that compare repair estimates and photographs against the injury claimed. Occupant position, headrest height, and whether you were braced matter medically but are harder to document than a bumper photo.',
      },
      {
        q: 'How long should I treat for whiplash?',
        a: 'As long as your provider directs and no longer. Treating to build a claim is visible in records and undermines credibility, while stopping early because you feel better is legitimate and should simply be documented. Let the medical need drive it.',
      },
      {
        q: 'Should I settle before treatment ends?',
        a: 'Settling closes the claim permanently, including for symptoms that turn out to be lasting. Until you have reached maximum medical improvement or have a written opinion on future care, neither you nor the adjuster knows what the claim is worth.',
      },
    ],
    relatedTools: [
      { label: 'Herniated disc calculator', to: '/tools/herniated-disc-calculator' },
      { label: 'Whiplash claim guide', to: '/how-much-is-a-whiplash-case-worth' },
    ],
  },
  {
    slug: '/tools/herniated-disc-calculator',
    h1: 'Herniated disc settlement calculator',
    eyebrow: 'Spine injury claims',
    intro:
      'Disc claims turn on what the MRI shows, whether your symptoms match the level of the finding, and how far treatment escalated. This estimates a range and explains the degeneration argument you should expect.',
    defaultSeverity: 'serious',
    coverageHint:
      'Disc claims frequently exceed a minimum-limits policy, especially once injections or surgery are involved. Check for umbrella coverage and your own underinsured motorist coverage.',
    valueDrivers: [
      {
        label: 'Herniation versus bulge, and matching symptoms',
        copy: 'A documented herniation with radicular symptoms that follow the affected nerve root is valued very differently from an incidental bulge. The correlation between the imaging level and where your pain, numbness, or weakness actually travels is what carries weight.',
      },
      {
        label: 'The degenerative changes defense',
        copy: 'Disc desiccation and degeneration appear on the imaging of most adults regardless of trauma, and carriers use that to argue the finding predates the collision. Prior imaging showing a normal disc is the strongest response available.',
      },
      {
        label: 'Treatment escalation',
        copy: 'Value rises at each step of the ladder — therapy, then epidural steroid injections, then a surgical consultation, then discectomy or fusion. Escalation documents that conservative care failed, which is the medical record a carrier responds to.',
      },
      {
        label: 'Objective confirmation of nerve involvement',
        copy: 'Electromyography and nerve conduction studies can corroborate radiculopathy independently of your reported symptoms. Positive findings substantially strengthen causation.',
      },
      {
        label: 'Recommended but unperformed surgery',
        copy: 'A surgical recommendation you have not acted on is a legitimate future medical cost, but a carrier will not pay it on the recommendation alone. It generally needs a written physician opinion on necessity and cost.',
      },
    ],
    caveats: [
      'If surgery has already been performed with lasting restrictions, select a higher severity — the range above understates a post-surgical claim.',
      'Fusion cases often involve future care over decades. A range built from bills to date will understate them badly without a life care plan.',
    ],
    faqs: [
      {
        q: 'Is a herniated disc worth more than a bulging disc?',
        a: 'Usually, though the label matters less than the correlation. A herniation contacting a nerve root with symptoms that match that root is strong. A herniation with no corresponding symptoms is weak, and a bulge causing documented radiculopathy can outperform a herniation that causes nothing.',
      },
      {
        q: 'How do insurers argue my disc injury is pre-existing?',
        a: 'By pointing to degenerative findings on your own MRI, since disc degeneration is nearly universal in adults and is not dated by imaging. Prior imaging, a clean prior treatment history, and a physician’s opinion distinguishing acute from chronic findings are the usual responses.',
      },
      {
        q: 'Does surgery guarantee a larger settlement?',
        a: 'No. Surgery raises the medical specials and documents severity, but liability, causation, and available coverage still govern. A surgical case with disputed fault and a minimum-limits policy can resolve for less than a conservatively treated case with clear liability and ample coverage.',
      },
      {
        q: 'What if I had back problems before the accident?',
        a: 'Aggravation of a pre-existing condition is compensable. The claim shifts from proving a new injury to proving a measurable worsening, which makes your prior records helpful rather than fatal — they establish the baseline the aggravation is measured against.',
      },
      {
        q: 'Do I need an MRI to make a disc claim?',
        a: 'Practically, yes for a disc claim specifically. Without imaging there is no documented disc finding, and the claim is evaluated as soft tissue. Whether imaging is medically warranted is a decision for your physician, not a claim strategy.',
      },
    ],
    relatedTools: [
      { label: 'Whiplash calculator', to: '/tools/whiplash-settlement-calculator' },
      { label: 'Herniated disc guide', to: '/how-much-is-a-herniated-disc-case-worth' },
    ],
  },
  {
    slug: '/tools/tbi-settlement-calculator',
    h1: 'Traumatic brain injury settlement calculator',
    eyebrow: 'Brain injury claims',
    intro:
      'Brain injury claims are the case where treatment cost tells you least about the harm. This produces a range from your documented losses, but read the warning below before giving that range much weight.',
    defaultSeverity: 'severe',
    wageLabel: 'Lost income and diminished earning capacity',
    wageHint:
      'Often the largest component of a brain injury claim. Usually requires a vocational assessment rather than a pay stub.',
    coverageHint:
      'Brain injury claims routinely exceed available coverage. Identify every applicable policy — the at-fault driver, any employer or commercial policy, umbrella coverage, and your own underinsured motorist coverage.',
    methodWarning:
      'The multiplier method understates brain injuries more than any other category. It derives non-economic damages from treatment cost, and a mild traumatic brain injury can involve modest medical bills while permanently changing someone’s memory, temperament, and ability to work. Treat the figure below as a floor for orientation, not a valuation.',
    valueDrivers: [
      {
        label: 'Neuropsychological testing',
        copy: 'CT and MRI are frequently normal after a mild traumatic brain injury, which carriers present as evidence nothing happened. Formal neuropsychological evaluation measures memory, processing speed, and executive function against population norms, and is often the only objective evidence available.',
      },
      {
        label: 'Lost earning capacity, not just lost wages',
        copy: 'The dominant economic loss is usually the gap between what you could have earned and what you can earn now. Establishing it takes a vocational expert and often an economist, and it can exceed medical bills by an order of magnitude.',
      },
      {
        label: 'Before-and-after witnesses',
        copy: 'Family members, coworkers, and supervisors describing concrete changes — missed deadlines, lost routines, uncharacteristic anger — carry real weight precisely because the injury is invisible on imaging. Specific incidents persuade; general statements do not.',
      },
      {
        label: 'The earliest records',
        copy: 'Loss of consciousness, disorientation, amnesia surrounding the event, and Glasgow Coma Scale scores recorded by paramedics and emergency staff are the contemporaneous evidence of a brain injury. They are difficult to reconstruct later.',
      },
      {
        label: 'What "mild" actually classifies',
        copy: 'Mild describes the severity of the initial injury event, not the outcome. A substantial share of mild traumatic brain injuries produce persistent symptoms, and the terminology is regularly used against claimants who do not know this.',
      },
    ],
    caveats: [
      'If cognitive symptoms have persisted beyond a year or have changed your work, this range is very likely too low. Claims like these are not suited to calculator arithmetic.',
      'Brain injury claims often require expert testimony that costs real money to develop. That shapes which cases a firm can take, separately from what the claim is worth.',
    ],
    faqs: [
      {
        q: 'Why is a brain injury hard to value with a calculator?',
        a: 'Because the method ties non-economic damages to medical spending, and brain injuries break that link. Someone with permanent cognitive deficits may have relatively modest bills, so a multiplier applied to those bills produces a figure unrelated to the actual loss.',
      },
      {
        q: 'Can I have a brain injury if my CT scan was normal?',
        a: 'Yes. CT detects bleeding and skull fracture, not diffuse axonal injury or the microstructural damage typical of a concussion. Normal imaging is expected in mild traumatic brain injury, which is why neuropsychological testing and documented symptoms matter so much.',
      },
      {
        q: 'What documents a brain injury best?',
        a: 'Emergency records noting loss of consciousness or confusion, a neurologist or neuropsychologist’s evaluation, formal cognitive testing, and specific accounts from people who knew you before. Together they establish both that an injury occurred and what it cost you.',
      },
      {
        q: 'How does lost earning capacity differ from lost wages?',
        a: 'Lost wages are pay you already missed and can prove with records. Lost earning capacity is the reduction in what you are able to earn going forward — a projection built by a vocational expert and an economist, and typically the largest single element of a serious brain injury claim.',
      },
      {
        q: 'Should I handle a brain injury claim myself?',
        a: 'This tool exists to help you understand the terrain, and it is not our place to tell you what to do. But brain injury claims turn on expert evidence, invisible harm, and coverage that is usually inadequate, and those are the conditions where self-representation goes worst.',
      },
    ],
    relatedTools: [
      { label: 'General settlement calculator', to: '/tools/settlement-calculator' },
      { label: 'Medical records checklist', to: '/tools/medical-records-checklist' },
    ],
  },
  {
    slug: '/tools/truck-accident-calculator',
    h1: 'Truck accident settlement calculator',
    eyebrow: 'Commercial vehicle claims',
    intro:
      'Commercial trucking claims differ from car crashes in two ways that matter more than the injury: far more insurance is usually available, and several parties beyond the driver may be responsible. This estimates a range and explains both.',
    defaultSeverity: 'severe',
    coverageHint:
      'Federal rules require interstate carriers hauling general freight to maintain at least $750,000 in liability coverage, and considerably more for hazardous materials. Actual policies are often well above the minimum, so this is rarely the binding constraint it is in a car crash.',
    valueDrivers: [
      {
        label: 'Substantially higher available coverage',
        copy: 'Because federal minimums start at $750,000 and real policies are frequently layered above that, a trucking claim is less likely to be capped by coverage. The valuation itself, rather than the policy limit, tends to decide the outcome.',
      },
      {
        label: 'More than one responsible party',
        copy: 'The driver, the motor carrier, a broker, the shipper, a maintenance contractor, and the trailer owner may each bear a share. Multiple defendants can mean multiple policies and separate theories of fault.',
      },
      {
        label: 'Claims against the carrier itself',
        copy: 'Beyond vicarious liability for its driver, a carrier can be directly liable for negligent hiring, inadequate training, poor supervision, or pressuring schedules that encourage hours-of-service violations. These reach the company’s own conduct.',
      },
      {
        label: 'Evidence that disappears quickly',
        copy: 'Electronic logging device data, engine control module downloads, dashcam video, driver qualification files, and inspection records are all subject to retention periods measured in months. A written preservation demand sent early is often decisive.',
      },
      {
        label: 'Rapid response by the other side',
        copy: 'Carriers and their insurers commonly dispatch investigators to serious crash scenes within hours. The evidentiary record is being built immediately, whether or not you are participating in building it.',
      },
    ],
    caveats: [
      'The evidence in a trucking case has a shelf life. Of everything on this page, sending a preservation letter promptly is the item most likely to change the outcome.',
      'With several defendants, apportionment among them becomes its own dispute. That affects timeline and complexity more than the total figure.',
    ],
    faqs: [
      {
        q: 'Why are truck accident settlements typically larger?',
        a: 'Two reasons compound. Impacts involving a vehicle twenty to thirty times heavier produce more severe injuries, and the coverage available is far greater — federal minimums begin at $750,000 against state auto minimums measured in tens of thousands.',
      },
      {
        q: 'Who can be held responsible besides the driver?',
        a: 'The motor carrier, for its driver’s conduct and for its own hiring, training, and supervision. Potentially also the broker who arranged the load, the shipper if loading caused the crash, a maintenance contractor, and the trailer’s owner if separate from the tractor.',
      },
      {
        q: 'What evidence should be preserved immediately?',
        a: 'Electronic logging device records, hours-of-service logs, the engine control module download, dashcam footage, the driver qualification file, drug and alcohol testing records, maintenance and inspection history, and the dispatch record. Retention periods are short and a preservation demand should not wait.',
      },
      {
        q: 'Does the federal minimum tell me what my claim is worth?',
        a: 'No — it tells you what coverage must exist, not what the claim is worth. Its practical significance is that trucking claims are less often limited by available insurance, so valuation drives the result more than coverage does.',
      },
      {
        q: 'The trucking company already contacted me. What does that mean?',
        a: 'It means their claims process is active, which is routine. Recorded statements taken early, before your injuries are fully diagnosed, tend to be used later to argue your condition is unrelated or overstated. You are not obligated to give one on their schedule.',
      },
    ],
    relatedTools: [
      { label: 'General settlement calculator', to: '/tools/settlement-calculator' },
      { label: 'California SOL checker', to: '/tools/california-sol-checker' },
    ],
  },
  {
    slug: '/tools/uber-accident-calculator',
    h1: 'Uber and Lyft accident settlement calculator',
    eyebrow: 'Rideshare claims',
    intro:
      'In a rideshare claim, the single most important fact is what the driver’s app was doing at the moment of the collision — it can change available coverage from a personal auto policy to a million dollars. This estimates a range and explains which coverage tier applies.',
    defaultSeverity: 'moderate',
    coverageHint:
      'Coverage depends entirely on app status. Off the app, only the driver’s personal policy applies. App on but no ride accepted, a contingent policy applies with limits commonly around $50,000 per person. En route to a pickup or carrying a passenger, a $1,000,000 third-party liability policy generally applies.',
    valueDrivers: [
      {
        label: 'App status decides the coverage tier',
        copy: 'Three distinct regimes apply depending on whether the app was off, on but idle, or engaged in a trip. The difference between the idle tier and the on-trip tier is roughly twenty-fold, which usually matters more to the outcome than the injury itself.',
      },
      {
        label: 'Proof of the trip period',
        copy: 'A trip receipt, the ride history in the app, driver identity, and the timestamp of the request all establish which tier applies. Screenshot them promptly — riders lose access to app history when accounts change or are closed.',
      },
      {
        label: 'Passengers are rarely at fault',
        copy: 'As a passenger you had no control over the vehicle, so comparative fault is usually zero regardless of which driver caused the collision. That removes the reduction that often shrinks a driver’s claim.',
      },
      {
        label: 'The company disputes employment, not just fault',
        copy: 'Rideshare companies characterize drivers as independent contractors to limit vicarious liability. The dispute typically plays out through the insurance tiers rather than as a direct claim against the company.',
      },
      {
        label: 'Uninsured and underinsured coverage on the trip policy',
        copy: 'When the other driver caused the crash and has little or no insurance, the rideshare policy’s uninsured and underinsured motorist coverage may still respond during an active trip. This is regularly overlooked.',
      },
    ],
    caveats: [
      'If you were the passenger, set your share of fault to zero. The default assumes you may have been driving.',
      'A claim can involve both the rideshare policy and the other driver’s insurer, with each pointing at the other. That affects how long resolution takes more than the eventual figure.',
    ],
    faqs: [
      {
        q: 'Does Uber’s $1 million policy always apply?',
        a: 'No, and this is the most consequential misunderstanding in rideshare claims. The $1,000,000 limit generally applies only while the driver is en route to a pickup or carrying a passenger. With the app on but no ride accepted, a much smaller contingent policy applies. With the app off, only the driver’s personal insurance does.',
      },
      {
        q: 'I was an Uber passenger. Who do I claim against?',
        a: 'It depends on who caused the collision. If your driver was at fault, the rideshare trip policy generally responds. If another driver was at fault, their insurer is primary, with the rideshare policy’s uninsured or underinsured coverage potentially applying if their limits are inadequate.',
      },
      {
        q: 'What should I document right after a rideshare crash?',
        a: 'Screenshot the trip in your ride history, including the driver’s name, vehicle, and timestamps. Photograph the scene and vehicles, get the police report number, and identify witnesses. App records establish which coverage tier applies and can become unavailable later.',
      },
      {
        q: 'Am I partly at fault as a passenger?',
        a: 'Almost never, since you had no control over the vehicle’s operation. Absent something unusual — interfering with the driver, or not wearing an available seatbelt in a way that measurably worsened your injuries — comparative fault is typically zero.',
      },
      {
        q: 'Does this apply to Lyft and delivery apps too?',
        a: 'The same tiered structure applies to Lyft, with comparable limits. Delivery platforms such as DoorDash and Instacart also use period-based coverage, but the limits and terms differ, so confirm the specific policy rather than assuming the rideshare figures.',
      },
    ],
    relatedTools: [
      { label: 'General settlement calculator', to: '/tools/settlement-calculator' },
      { label: 'Rideshare and commercial claims', to: '/topics/commercial-and-rideshare' },
    ],
  },
]

/**
 * Keyed by plain string because lookups come from a URL. The variants themselves
 * still declare a `CalculatorVariantSlug`, so a typo in a definition is caught.
 */
export const calculatorVariantBySlug = new Map<string, CalculatorVariant>(
  CALCULATOR_VARIANTS.map((variant) => [variant.slug, variant]),
)

/** Consumed by the landing page seeds so FAQPage markup matches the rendered page. */
export const CALCULATOR_VARIANT_FAQS: Record<string, Array<{ q: string; a: string }>> = Object.fromEntries(
  CALCULATOR_VARIANTS.map((variant) => [variant.slug, variant.faqs]),
)
