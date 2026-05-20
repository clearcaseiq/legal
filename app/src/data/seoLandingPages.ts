export type LandingPageCategory =
  | 'Symptoms'
  | 'Treatment'
  | 'Settlement'
  | 'Insurance'
  | 'Liability'
  | 'Commercial'
  | 'Attorney Intent'
  | 'Educational / SEO Moat'

export type LandingPage = {
  slug: string
  category: LandingPageCategory
  cluster: string
  title: string
  eyebrow: string
  description: string
  psychology: string
  cta: string
  exampleQueries: string[]
  signals: string[]
  sections: {
    whyItMatters: string
    whatToTrack: string[]
    howClearCaseHelps: string
  }
  faqs: Array<{ q: string; a: string }>
}

export const landingPages: LandingPage[] = [
  {
    slug: '/injuries/lower-back-pain-after-accident',
    category: 'Symptoms',
    cluster: 'Lower Back Injuries',
    title: 'Lower Back Pain After an Accident',
    eyebrow: 'Back injury case signals',
    description: 'Lower back pain after a crash can be a simple strain, a disc injury, or early sciatica. ClearCaseIQ helps organize your symptoms, treatment path, and documents so you can understand whether your injury may support a claim.',
    psychology: 'Something feels wrong.',
    cta: 'Get Free AI Case Assessment',
    exampleQueries: ['lower back pain after accident', 'lower back pain after rear end accident', 'sciatica after car accident', 'herniated disc after crash', 'MRI for back pain after accident'],
    signals: ['Pain severity', 'MRI status', 'Treatment progression', 'Numbness or radiating pain', 'Mobility limitations'],
    sections: {
      whyItMatters: 'Back injuries often develop over days or weeks. The value and seriousness of the claim usually depend on whether pain resolves, progresses into radiating symptoms, or is confirmed by imaging and consistent treatment.',
      whatToTrack: ['When the pain started and whether it was delayed', 'Any leg numbness, tingling, weakness, or sciatica', 'Whether an MRI or specialist referral was recommended', 'Physical therapy, chiropractic care, injections, or surgery discussions', 'Missed work or limits on lifting, sitting, walking, or driving'],
      howClearCaseHelps: 'The assessment captures symptom severity, treatment escalation, medical records, and billing signals to estimate readiness and a preliminary case value range.',
    },
    faqs: [
      { q: 'Is lower back pain after a crash serious?', a: 'It can be. Persistent pain, radiating pain, numbness, weakness, or MRI findings may indicate a more significant injury than a simple strain.' },
      { q: 'Does an MRI matter for a back injury claim?', a: 'MRI evidence can help confirm disc injuries, nerve involvement, and treatment escalation, but the full story also depends on symptoms, timing, and care continuity.' },
    ],
  },
  {
    slug: '/injuries/whiplash-after-rear-end',
    category: 'Symptoms',
    cluster: 'Neck / Whiplash',
    title: 'Whiplash and Neck Pain After a Rear-End Collision',
    eyebrow: 'Neck injury review',
    description: 'Neck pain after a crash can start immediately or appear later. ClearCaseIQ helps evaluate whiplash symptoms, neurological warning signs, treatment timing, and whether your file is strong enough for attorney review.',
    psychology: 'Could this become serious?',
    cta: 'Check Potential Settlement Value',
    exampleQueries: ['neck pain after crash', 'delayed neck pain after accident', 'whiplash symptoms after rear end collision', 'numbness in arm after crash'],
    signals: ['Cervical pain', 'Delayed symptoms', 'MRI indicators', 'Arm numbness or tingling', 'Treatment continuity'],
    sections: {
      whyItMatters: 'Whiplash claims are often disputed unless symptoms, treatment, and functional limits are documented. Neurological symptoms or imaging findings can materially change the posture of the claim.',
      whatToTrack: ['When neck pain began', 'Headaches, dizziness, arm numbness, or hand tingling', 'Doctor visits, PT, chiropractic care, or specialist referrals', 'MRI or X-ray findings', 'Work or daily activity restrictions'],
      howClearCaseHelps: 'The platform weighs symptom progression, treatment history, and document support to estimate claim strength and value confidence.',
    },
    faqs: [
      { q: 'Can whiplash symptoms be delayed?', a: 'Yes. Neck pain, headaches, and stiffness can appear hours or days later, which is why treatment timing and documentation matter.' },
      { q: 'What makes a whiplash case stronger?', a: 'Consistent treatment, objective findings, neurological symptoms, and clear liability evidence generally make the file stronger.' },
    ],
  },
  {
    slug: '/injuries/concussion-after-accident',
    category: 'Symptoms',
    cluster: 'Head / Concussion / TBI',
    title: 'Concussion Symptoms After an Accident',
    eyebrow: 'Head injury warning signs',
    description: 'Headaches, dizziness, confusion, memory issues, and light sensitivity after a crash can be signs of concussion or traumatic brain injury. ClearCaseIQ helps organize symptoms and treatment details before you decide what to do next.',
    psychology: 'I’m worried something is wrong.',
    cta: 'Free AI Injury Review',
    exampleQueries: ['concussion symptoms after crash', 'headache days after accident', 'dizziness after rear end collision', 'memory loss after accident'],
    signals: ['Cognitive symptoms', 'ER visits', 'Imaging', 'Treatment continuity', 'Work/school disruption'],
    sections: {
      whyItMatters: 'Brain injury claims can be difficult because symptoms may be subjective and evolve over time. Consistent medical documentation and cognitive symptom tracking are important.',
      whatToTrack: ['Loss of consciousness, confusion, or memory gaps', 'Headache, dizziness, nausea, light sensitivity, or sleep disruption', 'ER, urgent care, neurology, or imaging visits', 'Missed work, school, or driving limitations', 'Symptom changes over the first days and weeks'],
      howClearCaseHelps: 'ClearCaseIQ captures concussion indicators, treatment history, and missing-document risks so your report can highlight whether the injury needs deeper review.',
    },
    faqs: [
      { q: 'Do I need imaging for a concussion claim?', a: 'Not always. Many concussions do not show on standard imaging, but medical evaluation and symptom documentation still matter.' },
      { q: 'What symptoms should not be ignored?', a: 'Worsening headache, confusion, vomiting, weakness, seizure, repeated dizziness, or memory problems should be medically evaluated promptly.' },
    ],
  },
  {
    slug: '/injuries/shoulder-pain-after-accident',
    category: 'Symptoms',
    cluster: 'Shoulder / Knee Injuries',
    title: 'Shoulder or Knee Pain After an Accident',
    eyebrow: 'Orthopedic injury review',
    description: 'Shoulder and knee injuries can affect work, mobility, and long-term recovery. ClearCaseIQ helps identify whether orthopedic treatment, imaging, PT, or surgery recommendations may affect claim value.',
    psychology: 'Will this affect my recovery?',
    cta: 'See If Your Injury Qualifies',
    exampleQueries: ['shoulder pain after accident', 'rotator cuff injury settlement', 'knee pain after crash', 'ACL tear settlement accident'],
    signals: ['Orthopedic treatment', 'Surgery recommendations', 'PT duration', 'MRI findings', 'Mobility limits'],
    sections: {
      whyItMatters: 'Orthopedic cases often become stronger when pain is tied to imaging, specialist care, functional limitations, and treatment duration.',
      whatToTrack: ['Pain location and movement limits', 'MRI, X-ray, or orthopedic findings', 'PT attendance and progress', 'Injection, brace, or surgery recommendations', 'Work restrictions and activity limitations'],
      howClearCaseHelps: 'The assessment organizes orthopedic treatment signals and missing evidence so the report can estimate readiness and next steps.',
    },
    faqs: [
      { q: 'Can shoulder or knee pain increase case value?', a: 'Yes, especially when supported by imaging, PT, specialist care, or surgical recommendations.' },
      { q: 'What documents help most?', a: 'Orthopedic records, imaging reports, PT notes, bills, work restrictions, and photos can all help.' },
    ],
  },
  {
    slug: '/treatment/mri-after-accident',
    category: 'Treatment',
    cluster: 'MRI Intent',
    title: 'MRI After an Accident',
    eyebrow: 'Advanced imaging and injury severity',
    description: 'An MRI can reveal disc injuries, soft-tissue damage, and treatment escalation that may not appear on basic exams. ClearCaseIQ helps you understand why MRI findings may matter for case value.',
    psychology: 'Do I need advanced medical care?',
    cta: 'Analyze My Injury Severity',
    exampleQueries: ['should I get MRI after accident', 'MRI shows herniated disc', 'MRI after rear end accident'],
    signals: ['MRI confirmation', 'Disc injury', 'Treatment escalation', 'Specialist referral'],
    sections: {
      whyItMatters: 'MRI findings can move a claim from subjective pain to documented injury, especially where there are disc findings, nerve symptoms, or specialist treatment.',
      whatToTrack: ['Who ordered the MRI', 'MRI findings and impression section', 'Whether symptoms match the imaging level', 'Follow-up referrals or treatment changes', 'Injections, PT, or surgery discussions after imaging'],
      howClearCaseHelps: 'ClearCaseIQ can include MRI status, injury severity, and treatment escalation signals in the case report.',
    },
    faqs: [
      { q: 'Does an MRI automatically make a case valuable?', a: 'No. Value depends on findings, symptoms, causation, treatment, liability, and insurance coverage.' },
      { q: 'Should I upload the MRI report?', a: 'Yes, the written radiology report is often more useful for early review than the image file alone.' },
    ],
  },
  {
    slug: '/treatment/physical-therapy-after-accident',
    category: 'Treatment',
    cluster: 'Physical Therapy',
    title: 'Physical Therapy After an Accident',
    eyebrow: 'Treatment continuity analysis',
    description: 'Physical therapy can document pain, limitations, progress, and gaps in recovery. ClearCaseIQ helps spot whether treatment continuity supports or weakens your injury story.',
    psychology: 'Am I recovering correctly?',
    cta: 'Free Treatment Gap Analysis',
    exampleQueries: ['physical therapy after accident', 'how long should PT last after accident', 'treatment gaps after accident'],
    signals: ['Treatment continuity', 'Compliance', 'Gaps in care', 'Functional progress'],
    sections: {
      whyItMatters: 'Insurers often focus on treatment gaps. A consistent PT timeline can help explain injury progression and recovery limits.',
      whatToTrack: ['PT start date', 'Number of visits', 'Missed visits and reasons', 'Pain scores and range-of-motion findings', 'Discharge status and home exercise plan'],
      howClearCaseHelps: 'The platform compares treatment timing and missing records to identify gaps that may need explanation before attorney review.',
    },
    faqs: [
      { q: 'Do treatment gaps hurt a claim?', a: 'They can. A gap may be explainable, but it should be documented so it does not look like the injury resolved.' },
      { q: 'How long should PT last?', a: 'It depends on the injury and provider recommendations. The important signal is whether care is medically supported and consistent.' },
    ],
  },
  {
    slug: '/treatment/spinal-surgery-after-accident',
    category: 'Treatment',
    cluster: 'Injections / Surgery',
    title: 'Spinal Injections or Surgery After an Accident',
    eyebrow: 'Serious treatment escalation',
    description: 'Epidural injections, specialist referrals, and spinal surgery recommendations can materially change case value and attorney interest. ClearCaseIQ helps summarize these high-impact treatment signals.',
    psychology: 'This may be more serious than expected.',
    cta: 'Estimate Case Value',
    exampleQueries: ['epidural injection after accident', 'spinal surgery settlement', 'fusion surgery after accident'],
    signals: ['Surgery indicators', 'Injections', 'Specialist referrals', 'Future treatment'],
    sections: {
      whyItMatters: 'Treatment escalation often signals higher injury severity, higher medical costs, and more complex causation questions.',
      whatToTrack: ['Pain management referrals', 'Injection dates and outcomes', 'Surgical recommendations', 'Future treatment estimates', 'Work restrictions and permanent limitations'],
      howClearCaseHelps: 'ClearCaseIQ highlights escalation signals and uses them in readiness, severity, and value-band analysis.',
    },
    faqs: [
      { q: 'Do injections increase settlement value?', a: 'They can, especially when tied to objective findings, ongoing symptoms, and provider recommendations.' },
      { q: 'Is surgery always a high-value signal?', a: 'Surgery is significant, but value still depends on liability, causation, insurance coverage, and recovery.' },
    ],
  },
  {
    slug: '/tools/settlement-calculator',
    category: 'Settlement',
    cluster: 'General Settlement Value',
    title: 'Accident Settlement Calculator',
    eyebrow: 'Preliminary value estimate',
    description: 'Wondering how much your case may be worth? ClearCaseIQ uses injury severity, liability, treatment, documents, venue, and damages to create a preliminary settlement range.',
    psychology: 'What is this financially worth?',
    cta: 'Get Settlement Estimate',
    exampleQueries: ['how much is my case worth', 'accident settlement calculator', 'average accident payout California'],
    signals: ['Economic intent', 'Injury severity', 'Policy concerns', 'Treatment costs'],
    sections: {
      whyItMatters: 'Settlement value is not a single number. It usually depends on liability strength, injury proof, medical expenses, treatment duration, insurance coverage, and missing documents.',
      whatToTrack: ['Medical bills and paid amounts', 'Wage loss and out-of-pocket costs', 'Treatment duration and future care', 'Police reports, photos, and witnesses', 'Insurance limits or commercial coverage'],
      howClearCaseHelps: 'The platform produces a range and explains what could raise or lower confidence in that range.',
    },
    faqs: [
      { q: 'Is this a guaranteed settlement amount?', a: 'No. It is a preliminary estimate for education and preparation, not legal advice or a guaranteed outcome.' },
      { q: 'What improves estimate confidence?', a: 'Medical records, bills, police reports, photos, liability facts, and treatment continuity improve confidence.' },
    ],
  },
  {
    slug: '/settlements/herniated-disc',
    category: 'Settlement',
    cluster: 'Disc / Spine Settlements',
    title: 'Herniated Disc Settlement Analysis',
    eyebrow: 'Spine injury valuation',
    description: 'Disc injury settlement value depends on MRI findings, symptoms, treatment escalation, injections, surgery discussions, and liability. ClearCaseIQ helps organize those signals into a preliminary range.',
    psychology: 'How valuable is my injury?',
    cta: 'Free AI Settlement Analysis',
    exampleQueries: ['herniated disc settlement', 'bulging disc settlement amount', 'lumbar fusion surgery settlement'],
    signals: ['Surgical indicators', 'MRI findings', 'Future treatment', 'Neurological symptoms'],
    sections: {
      whyItMatters: 'Disc cases vary widely. A mild bulge with short treatment is very different from a nerve-compression case with injections or surgery.',
      whatToTrack: ['MRI impression and affected levels', 'Radiculopathy, numbness, or weakness', 'Pain management or orthopedic referrals', 'Injection/surgery recommendations', 'Prior injury history and treatment continuity'],
      howClearCaseHelps: 'ClearCaseIQ weighs spine-specific severity, treatment path, and missing proof to estimate confidence and value range.',
    },
    faqs: [
      { q: 'Are herniated disc cases valuable?', a: 'They can be, especially with objective imaging, consistent symptoms, treatment escalation, and strong liability.' },
      { q: 'What can reduce value?', a: 'Prior degeneration, treatment gaps, disputed liability, low insurance limits, or weak causation can reduce value.' },
    ],
  },
  {
    slug: '/settlements/whiplash',
    category: 'Settlement',
    cluster: 'Whiplash / Soft Tissue',
    title: 'Whiplash Settlement Value',
    eyebrow: 'Soft-tissue claim review',
    description: 'Whiplash settlement value depends on treatment duration, pain persistence, liability, medical documentation, and whether symptoms escalate into neurological findings.',
    psychology: 'Am I being undervalued?',
    cta: 'See Potential Settlement Range',
    exampleQueries: ['whiplash settlement value', 'neck injury settlement after rear end crash'],
    signals: ['Treatment duration', 'Chiropractic care', 'Liability strength', 'Neurological symptoms'],
    sections: {
      whyItMatters: 'Soft-tissue claims are often undervalued when documentation is thin. The more consistent the treatment and clearer the liability, the stronger the posture.',
      whatToTrack: ['Pain onset and duration', 'Doctor/PT/chiropractic visits', 'Any neurological symptoms', 'Work and activity limits', 'Photos, police report, or vehicle damage proof'],
      howClearCaseHelps: 'The report explains whether the file looks under-documented and what would improve confidence.',
    },
    faqs: [
      { q: 'Why do insurers challenge whiplash?', a: 'Because symptoms can be subjective and may not show on imaging. Treatment consistency and liability evidence help.' },
      { q: 'Can delayed symptoms still count?', a: 'Yes, but documenting timing and medical evaluation helps explain the delay.' },
    ],
  },
  {
    slug: '/settlements/tbi-settlement',
    category: 'Settlement',
    cluster: 'TBI / Brain Injury',
    title: 'Concussion and TBI Settlement Review',
    eyebrow: 'Brain injury valuation',
    description: 'Brain injury cases can involve long-term cognitive, emotional, and work-life effects. ClearCaseIQ helps collect the early signals that determine whether deeper review is needed.',
    psychology: 'This could affect my life long term.',
    cta: 'Evaluate My Case',
    exampleQueries: ['concussion settlement amount', 'traumatic brain injury settlement'],
    signals: ['Cognitive impairment', 'Imaging', 'Hospitalization', 'Neurology treatment'],
    sections: {
      whyItMatters: 'TBI value depends on symptom severity, duration, documentation, functional effects, and whether symptoms are medically connected to the accident.',
      whatToTrack: ['Memory, focus, headaches, dizziness, or personality changes', 'ER or neurology visits', 'Imaging or neuropsychological testing', 'Work, school, or driving disruption', 'Ongoing therapy or medication'],
      howClearCaseHelps: 'ClearCaseIQ organizes cognitive symptoms and medical support so the report can flag long-term risk and missing documentation.',
    },
    faqs: [
      { q: 'Can a concussion have settlement value?', a: 'Yes, particularly when symptoms persist and are documented by medical providers.' },
      { q: 'What makes TBI claims complex?', a: 'Symptoms can be invisible, delayed, or disputed, so treatment continuity and functional impact documentation are critical.' },
    ],
  },
  {
    slug: '/insurance/claim-denial',
    category: 'Insurance',
    cluster: 'Claim Denials',
    title: 'Insurance Denied or Lowballed Your Accident Claim',
    eyebrow: 'Insurance dispute review',
    description: 'If an adjuster denied your claim, blamed you, or offered too little, ClearCaseIQ can help organize liability facts, evidence, and missing documents before attorney review.',
    psychology: 'Insurance is treating me unfairly.',
    cta: 'Get Free Case Review',
    exampleQueries: ['insurance denied my claim', 'insurance says accident was my fault', 'adjuster offering low settlement'],
    signals: ['Liability disputes', 'Adjuster behavior', 'Denial reasons', 'Offer posture'],
    sections: {
      whyItMatters: 'Claim denials often turn on evidence quality, comparative fault, policy issues, or missing medical proof.',
      whatToTrack: ['Denial letter or adjuster explanation', 'Recorded statements or admissions', 'Police report and witness details', 'Photos and scene evidence', 'Medical treatment and bills'],
      howClearCaseHelps: 'The platform highlights disputed-liability and documentation gaps so you know what to strengthen first.',
    },
    faqs: [
      { q: 'Should I accept a low settlement?', a: 'Do not rely on this page as legal advice. Consider the evidence, medical status, deadlines, and whether attorney review is appropriate.' },
      { q: 'What if the insurer says I was at fault?', a: 'Liability evidence such as police reports, photos, witnesses, and scene facts can change the analysis.' },
    ],
  },
  {
    slug: '/insurance/rideshare-commercial-coverage',
    category: 'Insurance',
    cluster: 'Rideshare / Commercial Coverage',
    title: 'Rideshare and Commercial Insurance Coverage After an Accident',
    eyebrow: 'Coverage layer analysis',
    description: 'Uber, Lyft, delivery, trucking, and commercial vehicle accidents may involve larger or layered insurance coverage. ClearCaseIQ helps identify coverage signals early.',
    psychology: 'Is there larger insurance coverage available?',
    cta: 'Check Coverage Eligibility',
    exampleQueries: ['Uber accident insurance coverage', 'Lyft accident settlement', 'commercial truck accident insurance'],
    signals: ['Commercial policies', 'Rideshare status', 'Policy limits', 'Coverage layers'],
    sections: {
      whyItMatters: 'Coverage can change the practical value of a case. Commercial and rideshare claims often depend on app status, work status, and who controlled the vehicle.',
      whatToTrack: ['Whether the driver was working', 'App status at the time of crash', 'Vehicle owner/employer', 'Insurance letters and policy information', 'Police report and company names'],
      howClearCaseHelps: 'The assessment captures commercial coverage signals and routes the case posture toward the right next action.',
    },
    faqs: [
      { q: 'Why does app status matter?', a: 'Rideshare insurance often changes depending on whether the driver was offline, waiting, en route, or carrying a passenger.' },
      { q: 'Are commercial vehicle cases higher value?', a: 'They can be, especially where injuries are serious and higher insurance coverage is available.' },
    ],
  },
  {
    slug: '/liability/disputed-fault',
    category: 'Liability',
    cluster: 'Fault / Negligence',
    title: 'Disputed Fault After an Accident',
    eyebrow: 'Liability strength analysis',
    description: 'When the other side denies fault, evidence becomes critical. ClearCaseIQ helps organize police reports, witness facts, photos, and comparative negligence signals.',
    psychology: 'Who is legally responsible?',
    cta: 'Analyze Liability Strength',
    exampleQueries: ['rear end accident fault California', 'comparative negligence California', 'other driver denied fault'],
    signals: ['Police reports', 'Witnesses', 'Liability strength', 'Comparative fault'],
    sections: {
      whyItMatters: 'Even a strong injury claim can weaken if fault is disputed. Liability evidence affects attorney interest, settlement leverage, and valuation.',
      whatToTrack: ['Police report findings', 'Witness names and statements', 'Photos, video, or dashcam evidence', 'Traffic citations or admissions', 'What each driver says happened'],
      howClearCaseHelps: 'The platform scores liability signals and explains what could strengthen or challenge fault.',
    },
    faqs: [
      { q: 'What is comparative negligence?', a: 'It means fault may be divided between parties. In some states, your recovery can be reduced by your share of fault.' },
      { q: 'Does a police report decide fault?', a: 'Not always, but it can be persuasive evidence and is useful for early case review.' },
    ],
  },
  {
    slug: '/liability/police-report-errors',
    category: 'Liability',
    cluster: 'Police Reports / Evidence',
    title: 'Police Report Errors After an Accident',
    eyebrow: 'Evidence quality review',
    description: 'A police report mistake can affect early claim evaluation. ClearCaseIQ helps you identify inconsistencies and upload supporting details before attorney review.',
    psychology: 'Will evidence affect my case?',
    cta: 'Upload Accident Details',
    exampleQueries: ['police report mistake accident', 'witness statements after crash'],
    signals: ['Documentation quality', 'Witness support', 'Report inconsistencies', 'Scene evidence'],
    sections: {
      whyItMatters: 'Incorrect reports can create unnecessary liability disputes. Supporting evidence may help explain or correct the record.',
      whatToTrack: ['Wrong location, time, vehicle, or party details', 'Incorrect fault description', 'Missing witness statements', 'Photos or dashcam evidence', 'Any supplemental report request'],
      howClearCaseHelps: 'ClearCaseIQ captures report issues and evidence gaps so attorneys can quickly see what needs review.',
    },
    faqs: [
      { q: 'Can a police report be corrected?', a: 'Sometimes supplemental information can be added, but procedures vary. Evidence supporting the correction matters.' },
      { q: 'Should I upload the report?', a: 'Yes. The report helps liability review and may reveal missing or disputed facts.' },
    ],
  },
  {
    slug: '/commercial/truck-accident-settlement',
    category: 'Commercial',
    cluster: 'Trucking Accidents',
    title: 'Truck Accident Settlement Review',
    eyebrow: 'Commercial injury case analysis',
    description: 'Truck accidents can involve severe injuries, commercial insurance, multiple defendants, and complex evidence. ClearCaseIQ helps identify whether the case may need high-value review.',
    psychology: 'This may be a major case.',
    cta: 'High-Value Case Review',
    exampleQueries: ['trucking accident settlement', 'Amazon truck accident', 'semi truck injury settlement'],
    signals: ['Commercial insurance', 'Catastrophic injuries', 'Multi-defendant potential', 'Policy layers'],
    sections: {
      whyItMatters: 'Commercial vehicle cases often involve higher coverage, company policies, driver logs, maintenance issues, and more complex liability analysis.',
      whatToTrack: ['Truck/company names', 'Police report and citations', 'Serious injury or hospitalization', 'Photos, video, and witness information', 'Employer, contractor, or delivery platform involvement'],
      howClearCaseHelps: 'The report flags commercial coverage and high-severity signals that can affect routing and attorney review.',
    },
    faqs: [
      { q: 'Are truck accident cases different?', a: 'Yes. They often involve commercial coverage, corporate defendants, and evidence beyond the driver’s personal insurance.' },
      { q: 'What evidence matters most?', a: 'Police reports, photos, company identity, injury records, witness statements, and insurance information are important early signals.' },
    ],
  },
  {
    slug: '/commercial/rideshare-accidents',
    category: 'Commercial',
    cluster: 'Uber / Lyft Accidents',
    title: 'Uber and Lyft Accident Injury Claims',
    eyebrow: 'Rideshare coverage review',
    description: 'Rideshare accidents can involve the driver, the platform, another vehicle, and different insurance layers. ClearCaseIQ helps capture app status and coverage facts.',
    psychology: 'Who pays in rideshare accidents?',
    cta: 'Verify Rideshare Coverage',
    exampleQueries: ['Uber accident injury claim', 'Lyft accident settlement'],
    signals: ['App status', 'Coverage layers', 'Liability complexity', 'Passenger vs driver role'],
    sections: {
      whyItMatters: 'Who pays may depend on whether you were a passenger, another driver, pedestrian, or rideshare driver, and what the app status was at the moment of the crash.',
      whatToTrack: ['Your role in the crash', 'Driver app status', 'Trip screenshots or receipts', 'Insurance letters', 'Police report and vehicle information'],
      howClearCaseHelps: 'The intake asks coverage and liability questions that help identify potential rideshare insurance layers.',
    },
    faqs: [
      { q: 'Does Uber or Lyft always cover the accident?', a: 'Not always. Coverage depends on app status, trip phase, role, and fault.' },
      { q: 'Should I keep trip screenshots?', a: 'Yes. Trip receipts, app screenshots, and driver details may help establish coverage.' },
    ],
  },
  {
    slug: '/legal/california-personal-injury',
    category: 'Attorney Intent',
    cluster: 'General Legal Intent',
    title: 'California Personal Injury Case Review',
    eyebrow: 'Attorney-readiness screening',
    description: 'If you think you may need legal help after an accident, ClearCaseIQ helps organize your facts, documents, injury signals, and readiness before attorney review.',
    psychology: 'I may need legal help now.',
    cta: 'Speak With a Case Specialist',
    exampleQueries: ['personal injury lawyer California', 'rear end accident attorney', 'truck accident lawyer'],
    signals: ['Legal readiness', 'Urgency', 'Geography', 'Injury seriousness'],
    sections: {
      whyItMatters: 'Attorneys evaluate liability, damages, insurance, venue, deadlines, and documentation. A clearer file can improve triage and reduce back-and-forth.',
      whatToTrack: ['Incident date and location', 'Injury and treatment details', 'Insurance and adjuster communications', 'Police reports, photos, bills, and records', 'Whether deadlines may be approaching'],
      howClearCaseHelps: 'ClearCaseIQ creates a structured case report and can route attorney-ready cases for review.',
    },
    faqs: [
      { q: 'Is ClearCaseIQ a law firm?', a: 'No. It helps organize and analyze case information and may help with attorney review where available.' },
      { q: 'When should I talk to an attorney?', a: 'Consider attorney review for serious injuries, disputed liability, low offers, commercial coverage, minors, liens, or approaching deadlines.' },
    ],
  },
  {
    slug: '/education/delayed-accident-symptoms',
    category: 'Educational / SEO Moat',
    cluster: 'Symptom Education',
    title: 'Delayed Pain and Symptoms After an Accident',
    eyebrow: 'Early injury education',
    description: 'Pain, numbness, headaches, dizziness, and stiffness may appear after the adrenaline wears off. ClearCaseIQ helps you track delayed symptoms and understand what documentation may matter.',
    psychology: 'I need information.',
    cta: 'Free AI Injury Assessment',
    exampleQueries: ['delayed pain after accident', 'numbness after collision', 'signs of spinal injury after crash'],
    signals: ['Early-stage injury signals', 'Educational engagement', 'Delayed symptoms', 'Medical urgency'],
    sections: {
      whyItMatters: 'Delayed symptoms can still be related to an accident, but timing and medical evaluation are important for both health and claim documentation.',
      whatToTrack: ['When each symptom began', 'Whether symptoms are worsening', 'Numbness, weakness, dizziness, or confusion', 'Doctor visits and recommendations', 'Work or activity limits'],
      howClearCaseHelps: 'The assessment captures symptom timing and treatment status so the report can flag potential gaps or urgency.',
    },
    faqs: [
      { q: 'Can accident symptoms show up later?', a: 'Yes. Some symptoms appear hours or days later, but persistent or serious symptoms should be medically evaluated.' },
      { q: 'Why does timing matter?', a: 'Timing helps connect symptoms to the accident and explains treatment decisions.' },
    ],
  },
  {
    slug: '/education/insurance-settlement-tactics',
    category: 'Educational / SEO Moat',
    cluster: 'Insurance Education',
    title: 'Insurance Settlement Tactics After an Accident',
    eyebrow: 'Protect your claim',
    description: 'Insurance companies may question liability, treatment gaps, prior injuries, or medical costs. ClearCaseIQ helps you understand which facts and documents may protect your claim.',
    psychology: 'I don’t trust the insurance company.',
    cta: 'Protect My Claim',
    exampleQueries: ['how insurance companies reduce settlements', 'what not to say to insurance adjuster'],
    signals: ['Litigation readiness', 'Emotional urgency', 'Adjuster pressure', 'Low-offer concern'],
    sections: {
      whyItMatters: 'Adjusters often evaluate inconsistencies, missing documents, recorded statements, and treatment gaps. Being organized can improve your posture.',
      whatToTrack: ['Adjuster calls and emails', 'Settlement offers', 'Denial reasons', 'Medical bills and records', 'Photos, police reports, and witness details'],
      howClearCaseHelps: 'The report identifies file weaknesses and next steps before you decide how to respond.',
    },
    faqs: [
      { q: 'What should I avoid saying to an adjuster?', a: 'Avoid guessing, minimizing injuries too early, or giving unsupported statements. Consider getting advice for serious or disputed claims.' },
      { q: 'Why are treatment gaps important?', a: 'Insurers may argue a gap means the injury resolved or was unrelated, unless there is a clear explanation.' },
    ],
  },
  {
    slug: '/education/post-accident-medical-care',
    category: 'Educational / SEO Moat',
    cluster: 'Recovery / Medical Education',
    title: 'Medical Care After an Accident',
    eyebrow: 'Recovery timeline review',
    description: 'Knowing when to see a doctor, what to document, and how to handle delayed symptoms can affect both recovery and case readiness.',
    psychology: 'Am I handling this correctly?',
    cta: 'Review My Recovery Timeline',
    exampleQueries: ['how long after accident should I see doctor', 'delayed symptoms after crash'],
    signals: ['Treatment timing', 'Medical urgency', 'Delay patterns', 'Recovery uncertainty'],
    sections: {
      whyItMatters: 'Prompt medical care documents symptoms, identifies serious conditions, and helps avoid unexplained treatment gaps.',
      whatToTrack: ['First medical visit date', 'Symptoms at each visit', 'Referrals and follow-up plans', 'Missed appointments and reasons', 'Bills, records, and discharge instructions'],
      howClearCaseHelps: 'ClearCaseIQ organizes your recovery timeline and identifies missing medical story details.',
    },
    faqs: [
      { q: 'How soon should I see a doctor?', a: 'If symptoms are serious or worsening, seek care promptly. Documentation also helps clarify the timeline.' },
      { q: 'Can delayed treatment hurt a claim?', a: 'It can create questions, but clear explanations and consistent follow-up may help.' },
    ],
  },
]

export const landingPagesBySlug = new Map(landingPages.map((page) => [page.slug, page]))
