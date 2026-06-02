import type { LandingPage, LandingPageCategory } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

type PriorityPageSeed = {
  slug: string
  category: LandingPageCategory
  cluster: string
  title: string
  eyebrow: string
  description: string
  psychology: string
  cta: string
  queries: string[]
  signals: string[]
  track: string[]
  why: string
  help: string
  faqs: Array<{ q: string; a: string }>
  scenario: string
  timeline: Array<[string, string]>
  severity: Array<[string, string]>
  treatment: Array<{ label: string; copy: string }>
  drivers: string[]
  valueDetails: Array<{ label: string; copy: string }>
  insuranceProblems: string[]
  intake: Array<{ label: string; question: string }>
}

const toLandingPage = (seed: PriorityPageSeed): LandingPage => ({
  slug: seed.slug,
  category: seed.category,
  cluster: seed.cluster,
  title: seed.title,
  eyebrow: seed.eyebrow,
  description: seed.description,
  psychology: seed.psychology,
  cta: seed.cta,
  exampleQueries: seed.queries,
  signals: seed.signals,
  sections: {
    whyItMatters: seed.why,
    whatToTrack: seed.track,
    howClearCaseHelps: seed.help,
  },
  faqs: seed.faqs,
})

const toTopicContent = (seed: PriorityPageSeed): TopicContent => ({
  scenario: seed.scenario,
  timeline: seed.timeline,
  severityLadder: seed.severity,
  treatmentProgression: seed.treatment,
  settlementDrivers: seed.drivers,
  settlementValueDetails: seed.valueDetails,
  insuranceProblems: seed.insuranceProblems,
  intakeSteps: seed.intake,
})

const injuryPages: PriorityPageSeed[] = [
  {
    slug: '/injuries/sciatica-after-accident',
    category: 'Symptoms',
    cluster: 'Sciatica After an Accident',
    title: 'Sciatica After an Accident',
    eyebrow: 'Radiating leg pain guide',
    description: 'Sciatica after an accident can involve low-back pain that travels into the hip, buttock, leg, calf, or foot. This page explains how radiating pain, MRI findings, nerve symptoms, injections, and work limits affect case evaluation.',
    psychology: 'My back pain is shooting down my leg.',
    cta: 'Review My Sciatica Symptoms',
    queries: ['sciatica after accident', 'leg pain after car crash', 'sciatica settlement after accident', 'lumbar radiculopathy after crash'],
    signals: ['Radiating leg pain', 'Lumbar MRI', 'Numbness or weakness', 'Epidural injections', 'Work restrictions', 'Prior back history'],
    track: ['Where pain travels in the leg or foot', 'Numbness, tingling, weakness, or foot drop', 'Lumbar MRI findings and affected levels', 'PT, pain management, epidural injections, or surgical referrals', 'Work restrictions involving sitting, standing, lifting, or driving'],
    why: 'Sciatica is often treated as more serious than ordinary back soreness because it can signal nerve irritation or compression. The strongest claims connect the accident, pain distribution, exam findings, imaging, and treatment escalation.',
    help: 'ClearCaseIQ captures radiating pain, MRI status, treatment, future care, wage impact, and insurer degeneration arguments in a structured report.',
    faqs: [
      { q: 'Can a car accident cause sciatica?', a: 'It can when trauma irritates or compresses lumbar nerves, but medical timing, imaging, symptoms, and prior history matter.' },
      { q: 'What makes sciatica more serious?', a: 'Weakness, numbness, MRI-confirmed nerve compression, injections, surgery discussion, or work restrictions can increase seriousness.' },
      { q: 'Will insurance blame preexisting back problems?', a: 'Often. Prior records and a clear before-and-after symptom timeline help address that argument.' },
    ],
    scenario: 'A claimant had low-back pain after a rear-end crash, then developed burning pain down the leg. MRI showed a lumbar disc protrusion near a nerve root, and pain management recommended an epidural injection.',
    timeline: [['Same day', 'Low-back soreness or spasm begins.'], ['24-72 hours', 'Pain may travel into the buttock, thigh, calf, or foot.'], ['1-3 weeks', 'Provider may recommend PT, medication, MRI, or specialist care.'], ['Longer term', 'Epidural injections, surgical review, or permanent restrictions may change value.']],
    severity: [['Mild', 'Short-lived leg discomfort without neurological findings.'], ['Moderate', 'Persistent sciatica requiring PT or imaging.'], ['Serious', 'MRI correlation, numbness, weakness, or injections.'], ['Severe', 'Surgery recommendation, foot drop, or lasting work limits.']],
    treatment: [{ label: 'Initial care', copy: 'Documents back pain and leg symptoms after the accident.' }, { label: 'Conservative treatment', copy: 'PT, medication, and home exercises track response.' }, { label: 'Lumbar MRI', copy: 'Imaging helps identify disc or nerve involvement.' }, { label: 'Escalation', copy: 'Epidural injections or spine referral can raise severity.' }],
    drivers: ['Lumbar MRI correlation', 'Numbness or weakness', 'Epidural injections', 'Treatment duration', 'Work restrictions', 'Clear liability'],
    valueDetails: [{ label: 'Nerve symptoms', copy: 'Leg radiation can support a more serious spine narrative.' }, { label: 'Objective support', copy: 'MRI findings and exam notes strengthen causation.' }, { label: 'Function', copy: 'Sitting, standing, and lifting restrictions support damages.' }],
    insuranceProblems: ['The adjuster calls sciatica degenerative.', 'Symptoms and MRI level are disputed.', 'Treatment gaps are used against causation.', 'Prior back complaints are emphasized.'],
    intake: [{ label: 'Step 1', question: 'Where does the pain travel in your leg or foot?' }, { label: 'Step 2', question: 'Do you have numbness, tingling, or weakness?' }, { label: 'Step 3', question: 'Have you had MRI, PT, injections, or spine care?' }, { label: 'Step 4', question: 'Has insurance blamed degeneration or prior back problems?' }],
  },
  {
    slug: '/injuries/radiculopathy-after-accident',
    category: 'Symptoms',
    cluster: 'Radiculopathy After an Accident',
    title: 'Radiculopathy After an Accident',
    eyebrow: 'Nerve root injury guide',
    description: 'Radiculopathy after an accident means nerve-root symptoms such as radiating pain, numbness, tingling, weakness, or reflex changes. This guide explains cervical and lumbar radiculopathy evidence, testing, treatment, and settlement factors.',
    psychology: 'My symptoms follow a nerve path.',
    cta: 'Analyze My Radiculopathy',
    queries: ['radiculopathy after accident', 'cervical radiculopathy car accident', 'lumbar radiculopathy settlement', 'nerve root injury after crash'],
    signals: ['Radiating symptoms', 'MRI correlation', 'EMG testing', 'Weakness', 'Pain management', 'Surgery discussion'],
    track: ['Whether symptoms travel into an arm, hand, leg, or foot', 'Strength, reflex, sensation, or grip changes', 'MRI, EMG, or nerve conduction results', 'Medication, PT, injections, or surgical referrals', 'Functional effects on work, driving, walking, or lifting'],
    why: 'Radiculopathy can materially change a case because it suggests nerve involvement. Insurers often scrutinize whether symptoms match imaging and whether objective testing supports the diagnosis.',
    help: 'ClearCaseIQ links symptom distribution, imaging, EMG testing, treatment escalation, and insurer disputes into a readable case summary.',
    faqs: [
      { q: 'Is radiculopathy the same as nerve damage?', a: 'Radiculopathy usually refers to irritation or compression of a spinal nerve root, often causing radiating symptoms.' },
      { q: 'Does EMG prove radiculopathy?', a: 'EMG can support the diagnosis, but results must be interpreted with symptoms, exam findings, imaging, and timing.' },
      { q: 'Can radiculopathy increase settlement value?', a: 'It can when documented and connected to the accident, especially with weakness, imaging, injections, or surgery recommendations.' },
    ],
    scenario: 'A claimant developed arm tingling after a side-impact crash. Cervical MRI and EMG testing supported nerve-root irritation, which led to pain-management care and stronger documentation.',
    timeline: [['Initial symptoms', 'Neck or back pain begins after trauma.'], ['Radiating pattern', 'Pain, numbness, or weakness travels into an extremity.'], ['Testing', 'MRI, EMG, or specialist exam evaluates nerve involvement.'], ['Escalation', 'Injections, surgery review, or restrictions may follow.']],
    severity: [['Mild', 'Intermittent tingling with normal exam.'], ['Moderate', 'Persistent radiating symptoms and therapy.'], ['Serious', 'Objective findings, injections, or specialist care.'], ['Severe', 'Weakness, surgical recommendation, or permanent deficit.']],
    treatment: [{ label: 'Symptom mapping', copy: 'Tracks which nerve path is involved.' }, { label: 'Imaging/testing', copy: 'MRI and EMG may support nerve-root diagnosis.' }, { label: 'Specialist care', copy: 'Neurology, pain management, or spine care clarifies severity.' }, { label: 'Restrictions', copy: 'Work and activity limits show functional loss.' }],
    drivers: ['MRI and symptom match', 'EMG support', 'Weakness or sensory loss', 'Epidural injections', 'Surgical consult', 'Functional restrictions'],
    valueDetails: [{ label: 'Correlation', copy: 'Symptoms should line up with diagnostic findings.' }, { label: 'Objective findings', copy: 'Weakness, reflex changes, or testing improve support.' }, { label: 'Treatment escalation', copy: 'Injections and surgery review raise seriousness.' }],
    insuranceProblems: ['The carrier says symptoms do not match imaging.', 'Testing is disputed.', 'Degeneration is blamed.', 'Subjective complaints are minimized.'],
    intake: [{ label: 'Step 1', question: 'Where do symptoms radiate?' }, { label: 'Step 2', question: 'Do you have weakness, numbness, or reflex changes?' }, { label: 'Step 3', question: 'What MRI, EMG, or specialist records exist?' }, { label: 'Step 4', question: 'Has insurance disputed nerve involvement?' }],
  },
  {
    slug: '/injuries/bulging-disc-after-accident',
    category: 'Symptoms',
    cluster: 'Bulging Disc After an Accident',
    title: 'Bulging Disc After an Accident',
    eyebrow: 'Disc injury guide',
    description: 'A bulging disc after an accident can be painful, but insurers often argue it is degenerative or preexisting. This page explains how symptoms, MRI wording, radiculopathy, treatment, and prior records affect claim strength.',
    psychology: 'My MRI says bulging disc.',
    cta: 'Review My Bulging Disc',
    queries: ['bulging disc after accident', 'disc bulge car accident settlement', 'MRI bulging disc after crash', 'bulging disc nerve pain accident'],
    signals: ['MRI disc bulge', 'Pain distribution', 'Radiculopathy', 'Prior imaging', 'Treatment escalation', 'Causation dispute'],
    track: ['MRI impression and disc levels', 'Whether symptoms are local or radiating', 'Prior spine symptoms or imaging', 'PT, chiropractic, injections, or specialist care', 'Any insurer argument about degeneration'],
    why: 'Bulging disc cases require careful documentation because disc bulges may be age-related. The claim is stronger when symptoms changed after the accident and treatment records connect the finding to functional limitations.',
    help: 'ClearCaseIQ compares symptoms, MRI findings, treatment, prior history, and insurer causation arguments to identify readiness.',
    faqs: [
      { q: 'Is a bulging disc valuable?', a: 'It depends on symptoms, treatment, causation, objective support, liability, and insurance coverage.' },
      { q: 'Is a bulging disc different from a herniated disc?', a: 'Yes. The terms describe different disc findings, though both can be disputed and must be tied to symptoms.' },
      { q: 'Why does prior imaging matter?', a: 'Prior imaging can show whether the finding existed before or whether symptoms changed after the accident.' },
    ],
    scenario: 'A claimant had no prior leg pain before a crash. After the accident, MRI showed a lumbar disc bulge and PT records documented new sciatica, helping address the insurer degeneration argument.',
    timeline: [['Pain begins', 'Back or neck symptoms appear after crash.'], ['MRI result', 'Radiology identifies a disc bulge or protrusion.'], ['Treatment', 'Therapy, medication, or injections are used if symptoms persist.'], ['Causation review', 'Prior history and symptom change become central.']],
    severity: [['Mild', 'Incidental bulge with short-lived symptoms.'], ['Moderate', 'Persistent pain and conservative care.'], ['Serious', 'Radiating symptoms, injections, or specialist care.'], ['Severe', 'Surgery discussion or lasting neurological limits.']],
    treatment: [{ label: 'Clinical symptoms', copy: 'Pain pattern explains why the MRI matters.' }, { label: 'MRI interpretation', copy: 'The impression and levels should be reviewed.' }, { label: 'Conservative care', copy: 'PT and medication show treatment continuity.' }, { label: 'Escalation', copy: 'Injections or surgery review increase severity.' }],
    drivers: ['Symptom change after accident', 'MRI level', 'Radiculopathy', 'Prior imaging comparison', 'Treatment duration', 'Injections or surgery risk'],
    valueDetails: [{ label: 'Causation', copy: 'Before-and-after symptoms are critical.' }, { label: 'Symptoms', copy: 'Radiating pain increases seriousness.' }, { label: 'Treatment', copy: 'Escalation supports value beyond mild soreness.' }],
    insuranceProblems: ['The bulge is called degenerative.', 'Prior records are used against causation.', 'Symptoms are said not to match MRI.', 'The carrier undervalues conservative care.'],
    intake: [{ label: 'Step 1', question: 'What disc level and finding are listed?' }, { label: 'Step 2', question: 'Were symptoms new or worse after the crash?' }, { label: 'Step 3', question: 'Do symptoms radiate or cause numbness?' }, { label: 'Step 4', question: 'Has insurance raised degeneration or prior history?' }],
  },
  {
    slug: '/injuries/degenerative-disc-after-accident',
    category: 'Symptoms',
    cluster: 'Degenerative Disc Aggravation',
    title: 'Degenerative Disc Disease After an Accident',
    eyebrow: 'Preexisting spine condition guide',
    description: 'Degenerative disc disease after an accident often raises aggravation questions. This page explains how new symptoms, worsened function, MRI findings, treatment escalation, and prior records affect accident-related claims.',
    psychology: 'Insurance says it was preexisting.',
    cta: 'Analyze My Disc Aggravation',
    queries: ['degenerative disc after accident', 'accident aggravated degenerative disc', 'preexisting disc condition car accident', 'DDD settlement accident'],
    signals: ['Preexisting disc disease', 'Aggravation', 'New symptoms', 'Treatment escalation', 'Prior records', 'Causation dispute'],
    track: ['Symptoms and function before the accident', 'New or worsened pain, numbness, or weakness after the accident', 'MRI findings and provider interpretation', 'New treatment, injections, referrals, or surgery discussion', 'Insurer arguments about degeneration or prior history'],
    why: 'The legal and medical issue is often aggravation, not whether degeneration existed. A strong file shows how the accident changed symptoms, treatment needs, work ability, or daily function.',
    help: 'ClearCaseIQ structures before-and-after symptoms, prior history, treatment escalation, and causation disputes for review.',
    faqs: [
      { q: 'Can an accident aggravate degenerative disc disease?', a: 'It may. The analysis depends on prior symptoms, new symptoms, provider notes, imaging, and treatment changes.' },
      { q: 'Does preexisting degeneration destroy a claim?', a: 'Not necessarily, but it creates causation issues that need documentation.' },
      { q: 'What records are useful?', a: 'Prior records, post-accident MRI, treatment notes, restrictions, and provider causation opinions can help.' },
    ],
    scenario: 'A claimant had occasional back soreness before a crash but no leg pain or injections. After impact, radiculopathy developed and pain management recommended epidural injections, creating an aggravation argument.',
    timeline: [['Before crash', 'Baseline symptoms and prior treatment are identified.'], ['After crash', 'New or worsened symptoms are documented.'], ['Treatment change', 'New therapy, imaging, injections, or specialist care begins.'], ['Claim review', 'Aggravation and causation become central.']],
    severity: [['Baseline', 'No meaningful change from pre-accident condition.'], ['Aggravated', 'Symptoms worsen and require care.'], ['Serious', 'New radiculopathy or injections.'], ['Severe', 'Surgery discussion or lasting restrictions.']],
    treatment: [{ label: 'Prior history', copy: 'Establishes baseline before the accident.' }, { label: 'Post-crash symptoms', copy: 'Documents what changed.' }, { label: 'Imaging', copy: 'MRI may show degenerative and traumatic-relevant findings.' }, { label: 'Escalation', copy: 'New procedures or surgery review support aggravation.' }],
    drivers: ['Before-and-after symptoms', 'New neurological complaints', 'Treatment escalation', 'Provider causation opinion', 'Prior imaging comparison', 'Functional change'],
    valueDetails: [{ label: 'Aggravation proof', copy: 'The strongest evidence shows a meaningful post-crash change.' }, { label: 'Prior baseline', copy: 'Knowing the old condition helps explain the new claim.' }, { label: 'Escalation', copy: 'New injections or restrictions can support damages.' }],
    insuranceProblems: ['The carrier blames all symptoms on aging.', 'Prior records are overemphasized.', 'New symptoms are minimized.', 'Future treatment is disputed.'],
    intake: [{ label: 'Step 1', question: 'What symptoms existed before the crash?' }, { label: 'Step 2', question: 'What changed afterward?' }, { label: 'Step 3', question: 'Did treatment escalate after the accident?' }, { label: 'Step 4', question: 'Has insurance denied causation because of degeneration?' }],
  },
]

const additionalInjuries = [
  ['torn-meniscus-after-accident', 'Torn Meniscus After an Accident', 'Knee meniscus injuries', 'locking, swelling, instability, MRI findings, orthopedic care, and arthroscopy discussion', ['MRI-confirmed meniscus tear', 'Locking or catching', 'Swelling', 'Orthopedic care', 'Surgery discussion', 'Walking limits']],
  ['hip-pain-after-accident', 'Hip Pain After an Accident', 'Hip injuries', 'groin pain, bursitis, labral injury, fracture evaluation, gait changes, and mobility limits', ['Hip or groin pain', 'Gait change', 'X-ray or MRI', 'Orthopedic care', 'Walking limits', 'Prior hip history']],
  ['ankle-injury-after-accident', 'Ankle Injury After an Accident', 'Ankle injuries', 'sprains, fractures, instability, swelling, bracing, imaging, and walking restrictions', ['Swelling', 'Instability', 'X-ray or MRI', 'Brace or boot', 'PT', 'Walking limits']],
  ['foot-injury-after-accident', 'Foot Injury After an Accident', 'Foot injuries', 'fractures, crush injuries, plantar pain, nerve symptoms, footwear limits, and mobility restrictions', ['Foot pain', 'Fracture imaging', 'Walking limits', 'Boot or brace', 'Nerve symptoms', 'Work standing limits']],
  ['elbow-injury-after-accident', 'Elbow Injury After an Accident', 'Elbow injuries', 'fractures, tendon injury, nerve symptoms, range-of-motion loss, and lifting restrictions', ['Elbow pain', 'Range-of-motion loss', 'X-ray or MRI', 'Nerve symptoms', 'Orthopedic care', 'Lifting limits']],
  ['wrist-injury-after-accident', 'Wrist Injury After an Accident', 'Wrist injuries', 'sprains, fractures, TFCC injury, carpal symptoms, bracing, imaging, and hand-use limitations', ['Wrist pain', 'X-ray or MRI', 'Brace or cast', 'Grip weakness', 'Hand numbness', 'Work restrictions']],
  ['hand-injury-after-accident', 'Hand Injury After an Accident', 'Hand injuries', 'fractures, tendon injury, nerve symptoms, grip loss, dexterity problems, and work limitations', ['Hand pain', 'Fracture imaging', 'Grip loss', 'Numbness', 'Splinting', 'Dexterity limits']],
  ['facial-injury-after-accident', 'Facial Injury After an Accident', 'Facial injuries', 'lacerations, fractures, scarring, dental trauma, vision symptoms, and cosmetic impact', ['Facial laceration', 'Fracture imaging', 'Scarring', 'Dental injury', 'Vision symptoms', 'ER care']],
  ['jaw-injury-after-accident', 'Jaw Injury After an Accident', 'Jaw and TMJ injuries', 'jaw pain, TMJ dysfunction, clicking, dental trauma, chewing limits, and facial impact evidence', ['Jaw pain', 'TMJ symptoms', 'Dental trauma', 'CT or X-ray', 'Chewing limits', 'Specialist care']],
  ['migraines-after-accident', 'Migraines After an Accident', 'Post-accident migraines', 'headache frequency, light sensitivity, concussion overlap, neurology care, medication, and work disruption', ['Migraine frequency', 'Light sensitivity', 'Neurology care', 'Medication', 'Missed work', 'TBI overlap']],
  ['dizziness-after-accident', 'Dizziness After an Accident', 'Dizziness and balance symptoms', 'concussion, vestibular dysfunction, neck injury, neurology care, balance therapy, and driving limits', ['Dizziness', 'Balance problems', 'Vestibular therapy', 'Neurology care', 'Concussion symptoms', 'Driving limits']],
] as const

additionalInjuries.forEach(([slugPart, title, cluster, focus, signals]) => {
  injuryPages.push({
    slug: `/injuries/${slugPart}`,
    category: 'Symptoms',
    cluster,
    title,
    eyebrow: 'Accident injury guide',
    description: `${title} can affect medical treatment, daily function, wage loss, and settlement evaluation. This page explains ${focus}, plus the records and insurance arguments that commonly matter after a collision.`,
    psychology: 'I need to understand whether this injury matters.',
    cta: 'Review My Injury',
    queries: [title.toLowerCase(), `${title.toLowerCase()} settlement`, `${cluster.toLowerCase()} after car accident`, `${slugPart.replace(/-/g, ' ')}`],
    signals: [...signals],
    track: ['When symptoms started and whether they worsened', `Specific signs related to ${cluster.toLowerCase()}`, 'X-ray, CT, MRI, specialist exams, or therapy records', 'Bracing, injections, surgery recommendations, medication, or follow-up care', 'Work restrictions, daily-life limits, bills, and insurance disputes'],
    why: `${title} should be evaluated through timing, diagnosis, treatment, function, and causation. The claim becomes stronger when records show a consistent path from accident to symptoms to medical findings and practical limitations.`,
    help: 'ClearCaseIQ captures symptoms, treatment, records, bills, liability facts, and insurer defenses to identify case readiness and missing documentation.',
    faqs: [
      { q: `Can ${title.toLowerCase()} affect settlement value?`, a: 'Yes, if the injury is documented, causally connected, and affects treatment, work, daily life, or future care.' },
      { q: 'What records help most?', a: 'Medical records, imaging reports, therapy notes, specialist findings, bills, work restrictions, and photos can all help.' },
      { q: 'Why might insurance dispute this injury?', a: 'Insurers may argue delay, degeneration, prior condition, minor impact, excessive treatment, or lack of objective proof.' },
    ],
    scenario: `A claimant developed ${cluster.toLowerCase()} after a crash. The file became stronger when medical records, imaging, treatment notes, bills, and work-limit documentation showed how the injury progressed and why it mattered.`,
    timeline: [['Initial symptoms', 'Pain, swelling, dizziness, weakness, or functional limits are first noticed.'], ['Medical evaluation', 'Provider exam and imaging or testing document the injury pattern.'], ['Treatment phase', 'Therapy, bracing, medication, injections, or specialist care may be recommended.'], ['Claim review', 'Recovery duration, work impact, and future care affect value.']],
    severity: [['Mild', 'Short-lived symptoms with limited care.'], ['Moderate', 'Persistent symptoms requiring therapy or imaging.'], ['Serious', 'Objective findings, specialist care, or procedure recommendations.'], ['Severe', 'Surgery, permanent limits, visible scarring, or major work impact.']],
    treatment: [{ label: 'Initial exam', copy: 'Documents accident timing and symptoms.' }, { label: 'Diagnostics', copy: 'Imaging, testing, or specialist evaluation clarifies severity.' }, { label: 'Treatment plan', copy: 'Therapy, bracing, medication, or procedures show progression.' }, { label: 'Functional proof', copy: 'Work and daily-life limits support damages.' }],
    drivers: [...signals],
    valueDetails: [{ label: 'Diagnosis', copy: 'A clear diagnosis makes the injury easier to evaluate.' }, { label: 'Function', copy: 'Limits on work and daily life affect damages.' }, { label: 'Treatment path', copy: 'Escalation and future care can increase seriousness.' }],
    insuranceProblems: ['The carrier minimizes symptoms.', 'Causation is disputed.', 'Treatment is challenged as excessive.', 'Bills or wage loss are questioned.'],
    intake: [{ label: 'Step 1', question: 'When did symptoms start after the accident?' }, { label: 'Step 2', question: 'What diagnosis or imaging supports the injury?' }, { label: 'Step 3', question: 'What treatment and restrictions exist?' }, { label: 'Step 4', question: 'Has insurance disputed causation or value?' }],
  })
})

const treatmentPageRows = [
  ['acupuncture-after-accident', 'Acupuncture After an Accident', 'Acupuncture Treatment', 'alternative pain treatment, care continuity, medical necessity, records, bills, and insurer scrutiny', ['Acupuncture visits', 'Pain relief', 'Referral source', 'Treatment duration', 'Bills', 'Insurance dispute']],
  ['spinal-fusion-surgery', 'Spinal Fusion Surgery After an Accident', 'Spinal Fusion Surgery', 'fusion recommendations, failed conservative care, MRI findings, future medical costs, recovery time, and permanent restrictions', ['Fusion recommendation', 'MRI findings', 'Failed injections', 'Future medical', 'Wage loss', 'Permanent restrictions']],
  ['discectomy-after-accident', 'Discectomy After an Accident', 'Discectomy Surgery', 'disc removal surgery, herniation, radiculopathy, failed conservative care, surgical bills, and recovery restrictions', ['Discectomy recommendation', 'Disc herniation', 'Radiculopathy', 'Surgical bills', 'Recovery time', 'Work restrictions']],
  ['shoulder-surgery-after-accident', 'Shoulder Surgery After an Accident', 'Shoulder Surgery', 'rotator cuff repair, labral repair, arthroscopy, orthopedic records, future care, and work restrictions', ['Shoulder surgery', 'MRI tear', 'Orthopedic care', 'PT plateau', 'Future care', 'Lifting limits']],
  ['knee-surgery-after-accident', 'Knee Surgery After an Accident', 'Knee Surgery', 'arthroscopy, meniscus repair, ligament reconstruction, orthopedic records, future care, and mobility limits', ['Knee surgery', 'MRI tear', 'Instability', 'Orthopedic care', 'Mobility limits', 'Work impact']],
  ['pain-medication-after-accident', 'Pain Medication After an Accident', 'Pain Medication', 'prescriptions, medication management, side effects, treatment continuity, pain severity, and insurer scrutiny', ['Medication history', 'Pain severity', 'Side effects', 'Provider follow-up', 'Treatment duration', 'Medical necessity']],
  ['occupational-therapy-after-accident', 'Occupational Therapy After an Accident', 'Occupational Therapy', 'hand, wrist, shoulder, brain injury, daily function, work tasks, therapy progress, and impairment documentation', ['OT visits', 'Functional limits', 'Hand use', 'Work tasks', 'Progress notes', 'Adaptive equipment']],
  ['nerve-conduction-study', 'Nerve Conduction Study After an Accident', 'Nerve Conduction Study', 'nerve testing, numbness, tingling, weakness, EMG correlation, specialist care, and objective support', ['NCS findings', 'Numbness', 'Weakness', 'EMG correlation', 'Neurology care', 'Treatment changes']],
] as const

const treatmentPages: PriorityPageSeed[] = treatmentPageRows.map(([slugPart, title, cluster, focus, signals]) => ({
  slug: `/treatment/${slugPart}`,
  category: 'Treatment' as const,
  cluster,
  title,
  eyebrow: 'Accident treatment guide',
  description: `${title} can affect settlement evaluation when it documents medical necessity, symptom severity, treatment escalation, and functional impact. This page explains ${focus}.`,
  psychology: 'I want to know how this treatment affects my claim.',
  cta: 'Review My Treatment',
  queries: [title.toLowerCase(), `${title.toLowerCase()} settlement`, `${cluster.toLowerCase()} after accident`],
  signals: [...signals],
  track: ['Who recommended the treatment and why', 'Dates, providers, procedure reports, prescriptions, or therapy notes', 'Response to treatment and remaining symptoms', 'Bills, liens, and future-care recommendations', 'Work restrictions, daily limitations, and insurer objections'],
  why: `${title} matters when it shows that symptoms persisted, conservative care failed, or function was meaningfully affected. The treatment story should explain medical necessity, response, and next steps.`,
  help: 'ClearCaseIQ organizes treatment records, bills, response, future care, restrictions, and insurer disputes into a case-readiness report.',
  faqs: [
    { q: `Does ${title.toLowerCase()} increase settlement value?`, a: 'It can when medically supported and connected to accident-related symptoms, bills, and functional limits.' },
    { q: 'What documents should I keep?', a: 'Referral notes, treatment records, procedure reports, prescriptions, bills, restrictions, and follow-up recommendations are useful.' },
    { q: 'Why would insurance dispute this treatment?', a: 'The insurer may challenge necessity, duration, causation, billing, or whether the treatment was related to the accident.' },
  ],
  scenario: `A claimant used ${cluster.toLowerCase()} after symptoms did not resolve with initial care. The records became important because they documented severity, treatment response, bills, and whether additional care was needed.`,
  timeline: [['Referral', 'A provider recommends the treatment based on symptoms or diagnosis.'], ['Treatment begins', 'Records document visits, procedure details, medication, or therapy goals.'], ['Response', 'Improvement, plateau, side effects, or failure affects next steps.'], ['Value review', 'Bills, future care, and restrictions affect claim posture.']],
  severity: [['Basic', 'Short treatment with improvement.'], ['Moderate', 'Ongoing care and documented symptoms.'], ['Serious', 'Procedure, surgery, testing, or significant restrictions.'], ['Severe', 'Major surgery, long recovery, permanent limits, or high future costs.']],
  treatment: [{ label: 'Medical reason', copy: 'The record should explain why treatment was recommended.' }, { label: 'Treatment record', copy: 'Dates, findings, and procedures document continuity.' }, { label: 'Response', copy: 'Relief or lack of improvement shapes next steps.' }, { label: 'Future plan', copy: 'Future care and restrictions influence damages.' }],
  drivers: [...signals],
  valueDetails: [{ label: 'Medical necessity', copy: 'Provider reasoning helps defend the treatment.' }, { label: 'Cost', copy: 'Bills and liens affect settlement economics.' }, { label: 'Function', copy: 'Restrictions and response show real impact.' }],
  insuranceProblems: ['Medical necessity is disputed.', 'Bills are reduced.', 'Treatment duration is challenged.', 'Causation is questioned.'],
  intake: [{ label: 'Step 1', question: 'Who recommended the treatment and why?' }, { label: 'Step 2', question: 'What records and bills document it?' }, { label: 'Step 3', question: 'Did it help, fail, or lead to more care?' }, { label: 'Step 4', question: 'Has insurance disputed the treatment?' }],
}))

const settlementPageRows = [
  ['spinal-fusion-settlement', 'Spinal Fusion Settlement Value', 'Spinal Fusion Settlements', 'fusion surgery, permanent restrictions, future medical costs, failed conservative care, liability, and policy limits', ['Fusion surgery', 'Future medical', 'Permanent restrictions', 'High medical bills', 'Wage loss', 'Policy limits']],
  ['nerve-damage-settlement', 'Nerve Damage Settlement Value', 'Nerve Damage Settlements', 'radiculopathy, EMG findings, numbness, weakness, pain management, functional impairment, and future care', ['Nerve symptoms', 'EMG findings', 'Weakness', 'Pain management', 'Future care', 'Functional loss']],
  ['broken-bone-settlement', 'Broken Bone Settlement Value', 'Broken Bone Settlements', 'fracture location, surgery, casting, hardware, recovery time, visible injury, wage loss, and complications', ['Fracture imaging', 'Surgery or hardware', 'Casting', 'Recovery time', 'Wage loss', 'Complications']],
  ['ptsd-settlement', 'PTSD Settlement Value After an Accident', 'PTSD Settlements', 'therapy, diagnosis, nightmares, driving anxiety, medication, work impact, and emotional distress documentation', ['PTSD diagnosis', 'Therapy', 'Medication', 'Driving avoidance', 'Sleep disruption', 'Work impact']],
  ['shoulder-surgery-settlement', 'Shoulder Surgery Settlement Value', 'Shoulder Surgery Settlements', 'rotator cuff repair, labral repair, arthroscopy, dominant arm, orthopedic records, and work restrictions', ['Shoulder surgery', 'Dominant arm', 'MRI tear', 'Orthopedic records', 'Future care', 'Lifting limits']],
  ['knee-surgery-settlement', 'Knee Surgery Settlement Value', 'Knee Surgery Settlements', 'meniscus surgery, ligament reconstruction, arthroscopy, mobility limits, orthopedic records, and wage loss', ['Knee surgery', 'MRI tear', 'Instability', 'Mobility limits', 'Orthopedic care', 'Wage loss']],
  ['sciatica-settlement', 'Sciatica Settlement Value', 'Sciatica Settlements', 'radiating leg pain, lumbar MRI, epidural injections, work restrictions, prior back history, and liability', ['Sciatica', 'Lumbar MRI', 'Epidural injections', 'Work restrictions', 'Prior history', 'Policy limits']],
  ['radiculopathy-settlement', 'Radiculopathy Settlement Value', 'Radiculopathy Settlements', 'nerve-root symptoms, MRI correlation, EMG findings, injections, surgery review, and functional loss', ['Radiculopathy', 'MRI correlation', 'EMG support', 'Injections', 'Weakness', 'Surgery review']],
  ['motorcycle-accident-settlement', 'Motorcycle Accident Settlement Value', 'Motorcycle Accident Settlements', 'road rash, fractures, helmet facts, liability disputes, serious injury, medical bills, and policy limits', ['Motorcycle crash', 'Fractures', 'Road rash', 'Liability dispute', 'Medical bills', 'Policy limits']],
  ['pedestrian-accident-settlement', 'Pedestrian Accident Settlement Value', 'Pedestrian Accident Settlements', 'vehicle impact, fractures, head injury, liability, crosswalk facts, medical bills, and long recovery', ['Pedestrian impact', 'Fractures', 'TBI risk', 'Crosswalk facts', 'Medical bills', 'Long recovery']],
  ['hit-and-run-settlement', 'Hit-and-Run Accident Settlement Value', 'Hit-and-Run Settlements', 'unknown driver, police report, UM/UIM coverage, injury severity, evidence, and claim deadlines', ['Hit and run', 'Police report', 'UM/UIM', 'Unknown driver', 'Video evidence', 'Claim deadlines']],
  ['rear-end-accident-settlement', 'Rear-End Accident Settlement Value', 'Rear-End Accident Settlements', 'rear-end liability, neck and back injuries, property damage, treatment duration, medical bills, and policy limits', ['Rear-end liability', 'Neck pain', 'Back pain', 'Property damage', 'Treatment duration', 'Policy limits']],
] as const

const settlementPages: PriorityPageSeed[] = settlementPageRows.map(([slugPart, title, cluster, focus, signals]) => ({
  slug: `/settlements/${slugPart}`,
  category: 'Settlement' as const,
  cluster,
  title,
  eyebrow: 'Settlement value guide',
  description: `${title} depends on ${focus}. This page explains the value drivers, documentation, insurer defenses, and case-readiness signals that typically matter most.`,
  psychology: 'I need to understand what this case may be worth.',
  cta: 'Estimate My Settlement',
  queries: [title.toLowerCase(), `${cluster.toLowerCase()} California`, `${slugPart.replace(/-/g, ' ')}`],
  signals: [...signals],
  track: ['Diagnosis, treatment, bills, and future care', 'Liability evidence, police report, photos, witnesses, or video', 'Wage loss, out-of-pocket costs, and liens', 'Insurance limits, UM/UIM, commercial coverage, or offers', 'Prior history, treatment gaps, and causation disputes'],
  why: `${title} is not a fixed number. Settlement value is shaped by severity, proof, liability, venue, coverage, economics, and the defenses an insurer can credibly raise.`,
  help: 'ClearCaseIQ structures the facts that affect settlement value and shows what documents or details may improve confidence.',
  faqs: [
    { q: `What affects ${title.toLowerCase()}?`, a: 'Severity, treatment, bills, future care, liability, venue, coverage, liens, wage loss, prior history, and documentation all matter.' },
    { q: 'Is there an average settlement amount?', a: 'Averages are rarely useful for a specific case because the facts and insurance coverage vary widely.' },
    { q: 'What improves settlement confidence?', a: 'Medical records, bills, imaging, procedure notes, wage proof, photos, police reports, witnesses, and insurance letters improve confidence.' },
  ],
  scenario: `A claimant searched for ${title.toLowerCase()} after receiving an early offer. The analysis changed after medical records, bills, liability evidence, wage loss, and insurance coverage details were added.`,
  timeline: [['Early range', 'Basic injury, treatment, and liability facts create a rough estimate.'], ['Documentation', 'Records, bills, imaging, and wage proof improve confidence.'], ['Risk review', 'Prior history, comparative fault, policy limits, and gaps adjust value.'], ['Next steps', 'Attorney review may be appropriate for serious injuries or low offers.']],
  severity: [['Lower', 'Short treatment, limited bills, and quick recovery.'], ['Moderate', 'Ongoing care, imaging, and documented limitations.'], ['High', 'Procedures, surgery risk, serious injury, or wage loss.'], ['Very high', 'Permanent impairment, catastrophic injury, commercial coverage, or major future care.']],
  treatment: [{ label: 'Medical proof', copy: 'Diagnosis and treatment anchor damages.' }, { label: 'Economics', copy: 'Bills, wage loss, liens, and future care shape value.' }, { label: 'Liability', copy: 'Fault evidence affects leverage.' }, { label: 'Coverage', copy: 'Policy limits determine practical recovery.' }],
  drivers: [...signals],
  valueDetails: [{ label: 'Severity', copy: 'More serious injuries with objective proof usually support higher ranges.' }, { label: 'Liability', copy: 'Clear fault improves settlement posture.' }, { label: 'Coverage', copy: 'Available insurance can cap or expand practical value.' }],
  insuranceProblems: ['The insurer makes an early low offer.', 'Treatment or causation is disputed.', 'Policy limits are unclear or low.', 'Medical liens reduce net recovery.'],
  intake: [{ label: 'Step 1', question: 'What injury and treatment records exist?' }, { label: 'Step 2', question: 'What are the bills, liens, and wage losses?' }, { label: 'Step 3', question: 'What evidence proves fault?' }, { label: 'Step 4', question: 'What insurance limits or offers are known?' }],
}))

const insurancePages: PriorityPageSeed[] = ['State Farm', 'GEICO', 'Progressive', 'Allstate', 'USAA'].map((carrier) => ({
  slug: `/insurance/${carrier.toLowerCase().replace(/\s+/g, '-')}-settlement-process`,
  category: 'Insurance',
  cluster: `${carrier} Settlement Process`,
  title: `${carrier} Settlement Process After an Accident`,
  eyebrow: 'Insurance settlement guide',
  description: `The ${carrier} settlement process may involve claim intake, liability review, medical records, bills, recorded statements, coverage checks, offers, negotiations, and release paperwork. This guide explains what to track before accepting any offer.`,
  psychology: `${carrier} is handling my settlement and I need clarity.`,
  cta: 'Review My Insurance Claim',
  queries: [`${carrier} settlement process`, `${carrier} accident settlement`, `${carrier} injury claim offer`, `${carrier} negotiation process`],
  signals: ['Claim number', 'Adjuster communications', 'Liability review', 'Medical records', 'Settlement offer', 'Release timing'],
  track: ['Claim number, adjuster name, and all communications', 'Liability decision, police report, photos, witnesses, and statements', 'Medical records, bills, liens, future care, and wage loss', 'All offers, counteroffers, and release documents', 'Policy limits, UM/UIM, and coverage issues'],
  why: `${carrier} may evaluate liability, causation, treatment, bills, gaps, prior history, and policy limits before making or increasing an offer. Organized records help prevent decisions based on incomplete information.`,
  help: `ClearCaseIQ organizes ${carrier} communications, medical proof, liability evidence, settlement offers, and missing documents into a case-readiness report.`,
  faqs: [
    { q: `How does the ${carrier} settlement process work?`, a: 'The carrier usually investigates liability, reviews medical documentation, evaluates damages and coverage, then makes or responds to settlement offers.' },
    { q: `Should I send medical records to ${carrier}?`, a: 'Records support the claim, but serious or disputed claims may benefit from careful review before broad authorizations or final settlement.' },
    { q: 'What should I review before signing a release?', a: 'Treatment status, total bills, liens, future care, wage loss, policy limits, and whether the offer resolves all claims.' },
  ],
  scenario: `${carrier} made an offer before treatment was complete. The claimant organized records, bills, wage loss, liability photos, and policy information before deciding whether the offer reflected the full claim.`,
  timeline: [['Claim opened', 'Carrier assigns claim number and adjuster.'], ['Investigation', 'Liability, coverage, statements, and evidence are reviewed.'], ['Medical review', 'Records, bills, treatment gaps, and causation are evaluated.'], ['Settlement', 'Offer, negotiation, release, and payment steps occur.']],
  severity: [['Simple', 'Clear liability, minor injury, complete treatment.'], ['Developing', 'Ongoing treatment or missing records.'], ['Disputed', 'Fault, causation, bills, or treatment gaps challenged.'], ['High risk', 'Serious injury, low limits, liens, or release pressure.']],
  treatment: [{ label: 'Evidence package', copy: 'Medical records, bills, photos, and reports support the demand.' }, { label: 'Offer review', copy: 'Compare the offer to total damages and future care.' }, { label: 'Negotiation', copy: 'Counteroffers should address specific disputes.' }, { label: 'Release', copy: 'Final paperwork usually ends the claim.' }],
  drivers: ['Liability decision', 'Medical records', 'Bills and liens', 'Policy limits', 'Treatment completeness', 'Offer timing'],
  valueDetails: [{ label: 'Completeness', copy: 'Offers before treatment ends may be premature.' }, { label: 'Coverage', copy: 'Policy limits affect negotiation range.' }, { label: 'Documentation', copy: 'Records and bills are central to settlement review.' }],
  insuranceProblems: [`${carrier} disputes fault.`, `${carrier} challenges treatment gaps.`, `${carrier} makes a low early offer.`, `${carrier} requests broad releases or statements.`],
  intake: [{ label: 'Step 1', question: `What stage is your ${carrier} claim in?` }, { label: 'Step 2', question: 'Has liability been accepted or disputed?' }, { label: 'Step 3', question: 'Are treatment and bills complete?' }, { label: 'Step 4', question: 'Has an offer or release been sent?' }],
}))

const liabilityPageRows = [
  ['rear-end-accident-fault', 'Rear-End Accident Fault', 'Rear-End Liability', 'rear-end presumptions, sudden stops, multi-car impacts, comparative fault, police reports, and property damage', ['Rear-end impact', 'Police report', 'Vehicle damage', 'Comparative fault', 'Witnesses', 'Dashcam']],
  ['red-light-accident-fault', 'Red Light Accident Fault', 'Red Light Liability', 'signal timing, citations, witnesses, video, intersection layout, comparative fault, and T-bone crash evidence', ['Red light violation', 'Citation', 'Intersection video', 'Witnesses', 'T-bone impact', 'Comparative fault']],
  ['left-turn-accident-fault', 'Left-Turn Accident Fault', 'Left-Turn Liability', 'right of way, turn arrows, speed disputes, witness statements, intersection photos, and comparative fault', ['Left turn', 'Right of way', 'Signal phase', 'Speed dispute', 'Witnesses', 'Police report']],
  ['hit-and-run-liability', 'Hit-and-Run Liability', 'Hit-and-Run Liability', 'unknown drivers, police reports, video, witness canvassing, UM/UIM claims, and deadlines', ['Unknown driver', 'Police report', 'Video evidence', 'Witnesses', 'UM/UIM', 'Claim deadlines']],
  ['uninsured-driver-accident', 'Uninsured Driver Accident', 'Uninsured Driver Liability', 'uninsured motorists, UM/UIM coverage, policy notices, liability proof, medical damages, and claim deadlines', ['Uninsured driver', 'UM/UIM', 'Policy notice', 'Liability evidence', 'Medical damages', 'Coverage dispute']],
] as const

const liabilityPages: PriorityPageSeed[] = liabilityPageRows.map(([slugPart, title, cluster, focus, signals]) => ({
  slug: `/liability/${slugPart}`,
  category: 'Liability' as const,
  cluster,
  title,
  eyebrow: 'Fault and liability guide',
  description: `${title} depends on ${focus}. This page explains what evidence helps prove fault and how comparative negligence or insurance issues can affect settlement value.`,
  psychology: 'I need to prove who was at fault.',
  cta: 'Analyze Liability Strength',
  queries: [title.toLowerCase(), `${title.toLowerCase()} California`, `${slugPart.replace(/-/g, ' ')}`],
  signals: [...signals],
  track: ['Police report, citations, and party statements', 'Photos, video, dashcam, vehicle damage, and scene layout', 'Witness names and contact information', 'Insurance liability decision and comparative fault percentage', 'Medical treatment, damages, and coverage details'],
  why: `${title} can determine whether a strong injury claim has settlement leverage. Evidence quality matters because insurers may assign comparative fault or deny liability when the scene facts are incomplete.`,
  help: 'ClearCaseIQ organizes liability facts, evidence, comparative fault risks, injuries, damages, and insurance posture.',
  faqs: [
    { q: `Who is at fault in ${title.toLowerCase()}?`, a: 'Fault depends on the facts, evidence, traffic laws, statements, and any comparative negligence issues.' },
    { q: 'What evidence helps prove liability?', a: 'Police reports, photos, video, witnesses, citations, admissions, and vehicle damage patterns can help.' },
    { q: 'Can shared fault reduce settlement value?', a: 'Yes. Comparative fault can reduce recovery and lower settlement leverage.' },
  ],
  scenario: `Two parties disputed ${title.toLowerCase()}. The claim became clearer after police findings, photos, witness information, vehicle damage, and insurance communications were reviewed together.`,
  timeline: [['Scene evidence', 'Photos, statements, witnesses, and vehicle positions are freshest.'], ['Report phase', 'Police report, citations, and diagrams shape early liability view.'], ['Insurance phase', 'Adjusters accept, deny, or assign comparative fault.'], ['Settlement posture', 'Liability strength affects value and attorney interest.']],
  severity: [['Clear', 'Strong evidence supports one party at fault.'], ['Moderate', 'Evidence supports liability but some facts are disputed.'], ['Disputed', 'Conflicting stories or missing evidence.'], ['High risk', 'Comparative fault or adverse report language.']],
  treatment: [{ label: 'Scene facts', copy: 'Road layout, signals, damage, and statements matter.' }, { label: 'Independent proof', copy: 'Video and witnesses can resolve disputes.' }, { label: 'Insurance decision', copy: 'Carrier liability positions affect negotiation.' }, { label: 'Damages overlay', copy: 'Injury severity determines stakes.' }],
  drivers: [...signals],
  valueDetails: [{ label: 'Fault clarity', copy: 'Clear liability improves settlement leverage.' }, { label: 'Comparative fault', copy: 'Shared fault reduces value.' }, { label: 'Independent evidence', copy: 'Video or neutral witnesses can be decisive.' }],
  insuranceProblems: ['The adjuster assigns partial fault.', 'The other party changes the story.', 'The police report is incomplete.', 'Evidence is missing or delayed.'],
  intake: [{ label: 'Step 1', question: 'What does each side say happened?' }, { label: 'Step 2', question: 'What evidence supports your version?' }, { label: 'Step 3', question: 'Has insurance accepted or disputed liability?' }, { label: 'Step 4', question: 'Is any comparative fault being alleged?' }],
}))

const commercialPageRows = [
  ['motorcycle-accident', 'Motorcycle Accident Injury Claims', 'Motorcycle Accidents', 'severe injuries, helmet facts, road conditions, bias against riders, liability disputes, medical bills, and coverage', ['Motorcycle crash', 'Helmet facts', 'Road rash', 'Fractures', 'Liability dispute', 'Policy limits']],
  ['pedestrian-accident', 'Pedestrian Accident Injury Claims', 'Pedestrian Accidents', 'crosswalks, vehicle impact, serious injuries, visibility, traffic controls, liability disputes, and long recovery', ['Pedestrian impact', 'Crosswalk facts', 'Visibility', 'Fractures', 'TBI risk', 'Medical bills']],
  ['bicycle-accident', 'Bicycle Accident Injury Claims', 'Bicycle Accidents', 'bike lane facts, dooring, visibility, helmet facts, fractures, head injury, and liability disputes', ['Bicycle crash', 'Bike lane', 'Dooring', 'Helmet facts', 'Fractures', 'Liability dispute']],
  ['drunk-driver-accident', 'Drunk Driver Accident Claims', 'Drunk Driver Accidents', 'DUI evidence, citations, punitive exposure, severe injuries, insurance coverage, and liability leverage', ['DUI evidence', 'Citation or arrest', 'Police report', 'Serious injury', 'Punitive facts', 'Coverage']],
  ['head-on-collision', 'Head-On Collision Injury Claims', 'Head-On Collisions', 'high-force impacts, severe injuries, lane departure evidence, commercial involvement, medical bills, and long-term care', ['Head-on impact', 'Severe injury', 'Lane departure', 'Vehicle damage', 'Hospital care', 'Policy limits']],
] as const

const commercialPages: PriorityPageSeed[] = commercialPageRows.map(([slugPart, title, cluster, focus, signals]) => ({
  slug: `/commercial/${slugPart}`,
  category: 'Commercial' as const,
  cluster,
  title,
  eyebrow: 'High-severity accident guide',
  description: `${title} often involve ${focus}. This page explains the liability, coverage, injury, and documentation issues that can make these accident types higher priority for review.`,
  psychology: 'This accident may be more serious than a normal claim.',
  cta: 'Review My Accident',
  queries: [title.toLowerCase(), `${title.toLowerCase()} settlement`, `${slugPart.replace(/-/g, ' ')} California`],
  signals: [...signals],
  track: ['Accident location, vehicle types, police report, and citations', 'Photos, video, witnesses, damage, and scene layout', 'Emergency care, imaging, diagnosis, surgery, and long-term treatment', 'Insurance coverage, commercial policies, UM/UIM, and policy limits', 'Wage loss, out-of-pocket costs, liens, and future care'],
  why: `${title} can involve severe injuries, complex liability, and higher insurance stakes. Early organization helps preserve evidence and identify coverage before the claim is undervalued.`,
  help: 'ClearCaseIQ captures accident type, liability evidence, treatment severity, damages, commercial or coverage issues, and missing documents.',
  faqs: [
    { q: `Are ${title.toLowerCase()} high-value claims?`, a: 'They can be when injuries are serious, liability is supported, and insurance coverage is available.' },
    { q: 'What evidence matters early?', a: 'Police reports, photos, video, witnesses, vehicle damage, medical records, bills, and coverage letters matter.' },
    { q: 'Why is coverage important?', a: 'Available insurance often determines whether a serious injury value is practically collectible.' },
  ],
  scenario: `A claimant involved in ${cluster.toLowerCase()} had serious injuries and multiple insurance questions. The case became easier to triage after liability evidence, treatment records, bills, wage loss, and coverage facts were organized.`,
  timeline: [['Scene', 'Evidence, police, photos, and witnesses are gathered.'], ['Emergency care', 'Injuries and urgent treatment are documented.'], ['Coverage review', 'Insurance limits, commercial policies, or UM/UIM are identified.'], ['High-value review', 'Severity, liability, and coverage determine next steps.']],
  severity: [['Developing', 'Moderate injury with clear evidence.'], ['Serious', 'Fracture, TBI, hospitalization, or surgery risk.'], ['High value', 'Severe injury plus strong liability and coverage.'], ['Catastrophic', 'Permanent impairment, death, commercial coverage, or long-term care.']],
  treatment: [{ label: 'Emergency proof', copy: 'ER and imaging records anchor severity.' }, { label: 'Liability evidence', copy: 'Scene facts and reports establish fault.' }, { label: 'Coverage', copy: 'Policy layers determine practical recovery.' }, { label: 'Long-term damages', copy: 'Future care and wage loss drive value.' }],
  drivers: [...signals],
  valueDetails: [{ label: 'Severity', copy: 'High-force accidents often involve higher medical stakes.' }, { label: 'Evidence', copy: 'Photos, reports, and witnesses preserve liability.' }, { label: 'Coverage', copy: 'Commercial or UM/UIM coverage may be critical.' }],
  insuranceProblems: ['Liability is disputed.', 'Coverage is unclear.', 'Injury severity is minimized.', 'Evidence preservation is delayed.'],
  intake: [{ label: 'Step 1', question: 'What type of accident happened and where?' }, { label: 'Step 2', question: 'What evidence proves fault?' }, { label: 'Step 3', question: 'What emergency care and injuries occurred?' }, { label: 'Step 4', question: 'What insurance or commercial coverage is known?' }],
}))

const priorityPageSeeds = [
  ...injuryPages,
  ...treatmentPages,
  ...settlementPages,
  ...insurancePages,
  ...liabilityPages,
  ...commercialPages,
]

export const priorityLandingPages: LandingPage[] = priorityPageSeeds.map(toLandingPage)

export const priorityTopicContentBySlug = Object.fromEntries(
  priorityPageSeeds.map((seed) => [seed.slug, toTopicContent(seed)])
) as Record<string, TopicContent>
