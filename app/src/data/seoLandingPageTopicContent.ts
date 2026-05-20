export type TopicTreatmentStep = {
  label: string
  copy: string
}

export type TopicSettlementValueDetail = {
  label: string
  copy: string
}

export type TopicContent = {
  scenario: string
  timeline: Array<[string, string]>
  severityLadder: Array<[string, string]>
  treatmentProgression: TopicTreatmentStep[]
  settlementDrivers: string[]
  settlementValueDetails: TopicSettlementValueDetail[]
  insuranceProblems: string[]
  intakeSteps: Array<{ label: string; question: string }>
}

export const topicContentBySlug: Record<string, TopicContent> = {
  '/injuries/lower-back-pain-after-accident': {
    scenario: 'A driver felt lower-back soreness after a rear-end collision and assumed it would resolve. Ten days later the pain began traveling into the leg, an MRI showed a lumbar disc protrusion, and the treatment plan escalated from medication to PT and possible injections.',
    timeline: [
      ['Same day', 'Low-back soreness, stiffness, pain when bending, or discomfort sitting in the car.'],
      ['24-72 hours', 'Radiating leg pain, numbness, spasms, or pain that increases after sleep or work activity.'],
      ['1-2 weeks', 'PT referral, reduced lifting tolerance, missed work, or MRI discussion if symptoms persist.'],
      ['Longer term', 'Disc protrusion, sciatica, injections, orthopedic/neurosurgery referral, or work restrictions.'],
    ],
    severityLadder: [
      ['Mild', 'Temporary lumbar strain with limited treatment and no radiating symptoms.'],
      ['Moderate', 'PT or chiropractic care with persistent pain and possible imaging.'],
      ['Serious', 'MRI-confirmed disc injury, sciatica, injections, or specialist care.'],
      ['Severe', 'Surgery recommendation, permanent restrictions, or major wage loss tied to back limits.'],
    ],
    treatmentProgression: [
      { label: 'Initial exam', copy: 'ER, urgent care, or primary care notes documenting low-back pain and accident timing.' },
      { label: 'Conservative care', copy: 'Medication, PT, chiropractic care, home exercises, and documented range-of-motion limits.' },
      { label: 'Advanced diagnostics', copy: 'Lumbar MRI when pain radiates, persists, or suggests nerve involvement.' },
      { label: 'Escalation', copy: 'Pain management, epidural injections, orthopedic/neurosurgical referral, or surgery discussion.' },
    ],
    settlementDrivers: ['Lumbar MRI findings', 'Sciatica or leg numbness', 'Treatment continuity', 'Injections or surgery recommendation', 'Missed work from lifting or sitting limits', 'Clear rear-end liability'],
    settlementValueDetails: [
      { label: 'Lumbar MRI', copy: 'A disc protrusion, herniation, annular tear, or nerve impingement can materially change the value discussion.' },
      { label: 'Radiating symptoms', copy: 'Sciatica, numbness, or weakness can support a more serious severity band when documented consistently.' },
      { label: 'Work limitations', copy: 'Restrictions on lifting, driving, standing, or sitting help show functional impact.' },
    ],
    insuranceProblems: ['The adjuster calls the back pain degenerative.', 'The insurer argues delayed MRI means the injury was not crash-related.', 'A treatment gap is used to claim the pain resolved.', 'The carrier undervalues soft-tissue pain before imaging is complete.'],
    intakeSteps: [
      { label: 'Step 1', question: 'Where is the back pain, and does it travel into the hip, leg, or foot?' },
      { label: 'Step 2', question: 'Did a provider order X-ray, MRI, PT, injections, or specialist care?' },
      { label: 'Step 3', question: 'What daily activities or work tasks are limited by the back pain?' },
      { label: 'Step 4', question: 'Has insurance disputed causation, degeneration, or treatment gaps?' },
    ],
  },
  '/injuries/whiplash-after-rear-end': {
    scenario: 'A person felt neck stiffness the night of a rear-end crash. Over several days the pain turned into headaches and arm tingling, making cervical imaging, PT attendance, and pain-management notes important to the claim.',
    timeline: [
      ['Same day', 'Neck stiffness, upper-back tightness, headache, or soreness after impact.'],
      ['24-72 hours', 'Reduced range of motion, headaches, dizziness, arm tingling, or shoulder referral pain.'],
      ['1-2 weeks', 'PT, chiropractic care, cervical X-ray or MRI discussion, and ongoing pain scores.'],
      ['Longer term', 'Cervical disc findings, injections, persistent headaches, or neurological symptoms.'],
    ],
    severityLadder: [
      ['Mild', 'Short-lived stiffness with brief treatment.'],
      ['Moderate', 'Ongoing PT or chiropractic care with limited neck motion.'],
      ['Serious', 'Arm numbness, cervical MRI findings, or pain-management referral.'],
      ['Severe', 'Surgery recommendation, chronic headaches, or permanent cervical restrictions.'],
    ],
    treatmentProgression: [
      { label: 'First visit', copy: 'Documentation of neck pain, range of motion, headache, and crash mechanism.' },
      { label: 'Therapy', copy: 'PT or chiropractic notes tracking stiffness, headaches, and functional limits.' },
      { label: 'Imaging', copy: 'Cervical X-ray or MRI when symptoms persist or radiate into the arm.' },
      { label: 'Escalation', copy: 'Pain management, injections, neurology, or spine specialist referral.' },
    ],
    settlementDrivers: ['Cervical MRI findings', 'Arm numbness or tingling', 'Headache frequency', 'Treatment duration', 'Rear-end liability', 'Work or driving limitations'],
    settlementValueDetails: [
      { label: 'Neurological symptoms', copy: 'Arm tingling, numbness, or weakness can make a whiplash case more than ordinary stiffness.' },
      { label: 'Treatment duration', copy: 'Consistent care over time helps counter the argument that symptoms were minor.' },
      { label: 'Cervical imaging', copy: 'MRI findings can improve diagnostic support when symptoms match the affected level.' },
    ],
    insuranceProblems: ['The insurer calls whiplash subjective.', 'The carrier says vehicle damage was too minor.', 'Delayed neck pain is treated as unrelated.', 'Chiropractic care is challenged as excessive.'],
    intakeSteps: [
      { label: 'Step 1', question: 'Did neck pain start immediately or appear later?' },
      { label: 'Step 2', question: 'Do headaches, dizziness, or arm symptoms accompany the neck pain?' },
      { label: 'Step 3', question: 'Have you had cervical imaging, PT, chiropractic care, or injections?' },
      { label: 'Step 4', question: 'Is insurance minimizing the crash or calling symptoms subjective?' },
    ],
  },
  '/injuries/concussion-after-accident': {
    scenario: 'A claimant left the crash scene without obvious bleeding but later developed headaches, dizziness, light sensitivity, and concentration problems. ER records, neurology follow-up, and a symptom diary became central to proving the injury pattern.',
    timeline: [
      ['Same day', 'Headache, confusion, nausea, fogginess, or memory gap.'],
      ['24-72 hours', 'Dizziness, light sensitivity, sleep disruption, worsening headache, or trouble focusing.'],
      ['1-2 weeks', 'Neurology referral, missed work or school, driving limits, or cognitive complaints.'],
      ['Longer term', 'Persistent post-concussion symptoms, vestibular therapy, neuropsych testing, or work restrictions.'],
    ],
    severityLadder: [
      ['Mild', 'Brief headache or fogginess that resolves quickly.'],
      ['Moderate', 'Persistent symptoms requiring follow-up or therapy.'],
      ['Serious', 'Cognitive impairment, neurology care, or prolonged work/school disruption.'],
      ['Severe', 'Hospitalization, significant neurological findings, or lasting cognitive limitations.'],
    ],
    treatmentProgression: [
      { label: 'Immediate care', copy: 'ER or urgent care notes documenting head impact, confusion, headache, or dizziness.' },
      { label: 'Symptom tracking', copy: 'Daily notes on headache, memory, sleep, light sensitivity, and work impact.' },
      { label: 'Specialty review', copy: 'Neurology, vestibular therapy, concussion clinic, or neuropsychological testing.' },
      { label: 'Functional proof', copy: 'Work, school, driving, and household limitations tied to cognitive symptoms.' },
    ],
    settlementDrivers: ['Persistent cognitive symptoms', 'Neurology treatment', 'Documented work or school disruption', 'Hospital or ER records', 'Witness observations', 'Objective functional limitations'],
    settlementValueDetails: [
      { label: 'Duration of symptoms', copy: 'Longer-lasting cognitive symptoms can materially affect value and review urgency.' },
      { label: 'Functional impact', copy: 'Missed work, school problems, and driving limits help show real-life consequences.' },
      { label: 'Specialist care', copy: 'Neurology or concussion-clinic care can strengthen documentation.' },
    ],
    insuranceProblems: ['The insurer says imaging was normal.', 'Cognitive symptoms are dismissed as subjective.', 'Delayed reporting is used against the claimant.', 'Prior headaches or anxiety are blamed instead of the crash.'],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you hit your head, lose consciousness, or feel confused?' },
      { label: 'Step 2', question: 'Are headaches, dizziness, light sensitivity, or memory issues continuing?' },
      { label: 'Step 3', question: 'Have you seen ER, neurology, or concussion specialists?' },
      { label: 'Step 4', question: 'Has the injury affected work, school, driving, or sleep?' },
    ],
  },
  '/injuries/shoulder-pain-after-accident': {
    scenario: 'After a side-impact crash, a claimant noticed shoulder pain when lifting the arm and knee pain on stairs. Orthopedic evaluation, MRI findings, PT progress, and possible surgery discussions became the main value signals.',
    timeline: [
      ['Same day', 'Shoulder soreness, knee pain, swelling, bruising, or difficulty moving the joint.'],
      ['24-72 hours', 'Reduced range of motion, instability, clicking, weakness, or pain with stairs or lifting.'],
      ['1-2 weeks', 'Orthopedic referral, PT plan, brace, injection discussion, or imaging order.'],
      ['Longer term', 'Rotator cuff tear, meniscus/ACL injury, surgery recommendation, or permanent limits.'],
    ],
    severityLadder: [
      ['Mild', 'Joint soreness without instability or imaging findings.'],
      ['Moderate', 'PT, limited motion, or persistent pain requiring imaging.'],
      ['Serious', 'MRI-confirmed tear, injections, brace, or orthopedic treatment.'],
      ['Severe', 'Surgery recommendation, major mobility limits, or job-impacting restrictions.'],
    ],
    treatmentProgression: [
      { label: 'Exam', copy: 'Provider documents pain location, swelling, strength, instability, and range of motion.' },
      { label: 'Therapy', copy: 'PT tracks mobility, pain scores, and functional improvement or plateau.' },
      { label: 'Imaging', copy: 'MRI or X-ray evaluates rotator cuff, labrum, meniscus, ACL, fracture, or cartilage injury.' },
      { label: 'Escalation', copy: 'Orthopedic injections, bracing, arthroscopy, repair, or future-care recommendations.' },
    ],
    settlementDrivers: ['MRI-confirmed tear', 'Orthopedic treatment', 'Surgery recommendation', 'PT duration', 'Mobility restrictions', 'Job duties requiring lifting or walking'],
    settlementValueDetails: [
      { label: 'Tear confirmation', copy: 'Rotator cuff, labral, meniscus, or ACL findings can substantially change severity.' },
      { label: 'Functional limitation', copy: 'Difficulty lifting, walking, kneeling, or climbing stairs connects injury to daily life.' },
      { label: 'Surgery risk', copy: 'Arthroscopy or repair recommendations often increase seriousness and future-cost analysis.' },
    ],
    insuranceProblems: ['The insurer blames arthritis or degeneration.', 'PT is treated as excessive.', 'The carrier disputes whether the crash caused the tear.', 'Low offers ignore work and mobility impact.'],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the pain in the shoulder, knee, or both?' },
      { label: 'Step 2', question: 'Do you have weakness, instability, swelling, or limited range of motion?' },
      { label: 'Step 3', question: 'Have you had MRI, orthopedic care, PT, injections, or surgery discussion?' },
      { label: 'Step 4', question: 'Does the injury limit lifting, walking, kneeling, driving, or work?' },
    ],
  },
  '/treatment/mri-after-accident': {
    scenario: 'A patient completed several weeks of conservative care but still had radiating pain. The provider ordered an MRI, which documented disc pathology and changed the treatment plan from therapy alone to pain-management referral.',
    timeline: [
      ['Before MRI', 'Persistent pain, radiating symptoms, weakness, or limited improvement after initial care.'],
      ['MRI ordered', 'Provider documents medical reason for advanced imaging.'],
      ['MRI result', 'Radiology impression identifies disc, ligament, soft-tissue, or joint findings.'],
      ['After MRI', 'Treatment may shift to specialist care, injections, surgery review, or continued therapy.'],
    ],
    severityLadder: [
      ['Mild', 'Normal imaging or minor findings with improving symptoms.'],
      ['Moderate', 'Imaging supports persistent pain and ongoing conservative care.'],
      ['Serious', 'Disc, tear, or nerve-related finding with specialist referral.'],
      ['Severe', 'Finding supports injections, surgery recommendation, or permanent impairment.'],
    ],
    treatmentProgression: [
      { label: 'Clinical symptoms', copy: 'The MRI is strongest when symptoms and exam findings explain why imaging was needed.' },
      { label: 'Radiology report', copy: 'The impression section usually matters most for early case review.' },
      { label: 'Provider interpretation', copy: 'A treating doctor should connect the imaging to symptoms and next steps.' },
      { label: 'Escalated plan', copy: 'Injections, surgery review, or specialist care after MRI can raise severity.' },
    ],
    settlementDrivers: ['Radiology impression', 'Symptoms matching image level', 'Specialist referral after MRI', 'Injections or surgery after imaging', 'Prior imaging history', 'Treatment timeline before and after MRI'],
    settlementValueDetails: [
      { label: 'Matching symptoms', copy: 'The MRI is more persuasive when symptoms match the injured level or structure.' },
      { label: 'Treatment change', copy: 'A new referral or injection plan after MRI shows the result affected care.' },
      { label: 'Prior history', copy: 'Prior imaging can either complicate causation or help show a new change.' },
    ],
    insuranceProblems: ['The insurer calls MRI findings degenerative.', 'The carrier says imaging was unnecessary.', 'Symptoms and imaging are argued not to match.', 'The adjuster ignores treatment escalation after MRI.'],
    intakeSteps: [
      { label: 'Step 1', question: 'Who ordered the MRI and why?' },
      { label: 'Step 2', question: 'What does the MRI impression say?' },
      { label: 'Step 3', question: 'Did the MRI lead to injections, specialist care, or surgery discussion?' },
      { label: 'Step 4', question: 'Has insurance disputed degeneration, necessity, or causation?' },
    ],
  },
  '/treatment/physical-therapy-after-accident': {
    scenario: 'A claimant began PT after urgent care noted neck and back pain. Missed visits, pain scores, progress notes, and discharge status became important because the insurer focused heavily on treatment continuity.',
    timeline: [
      ['PT referral', 'Provider recommends therapy after initial exam or persistent symptoms.'],
      ['First visits', 'Baseline pain, range of motion, strength, and functional limits are recorded.'],
      ['Mid-treatment', 'Progress, flare-ups, missed visits, and home-exercise compliance become important.'],
      ['Discharge/plateau', 'Final status shows recovery, need for more care, or escalation to imaging/specialist.'],
    ],
    severityLadder: [
      ['Mild', 'Brief PT with quick symptom resolution.'],
      ['Moderate', 'Several weeks of PT with measurable limits and gradual improvement.'],
      ['Serious', 'PT plateau, worsening symptoms, imaging referral, or pain-management escalation.'],
      ['Severe', 'Therapy fails and provider recommends injections, surgery review, or long-term restrictions.'],
    ],
    treatmentProgression: [
      { label: 'Start date', copy: 'The first PT date helps measure treatment delay and continuity.' },
      { label: 'Visit pattern', copy: 'Attendance, missed visits, and reasons for gaps shape insurer arguments.' },
      { label: 'Objective measures', copy: 'Range of motion, strength, pain scores, and functional scales add support.' },
      { label: 'Outcome', copy: 'Discharge, plateau, or escalation explains whether conservative care worked.' },
    ],
    settlementDrivers: ['Consistent PT attendance', 'Documented pain scores', 'Objective range-of-motion findings', 'Explained treatment gaps', 'Provider escalation after failed therapy', 'Discharge status'],
    settlementValueDetails: [
      { label: 'Continuity', copy: 'Regular attendance helps show the injury was persistent enough to require care.' },
      { label: 'Objective measures', copy: 'Measured limitations are stronger than generic pain complaints.' },
      { label: 'Gap explanations', copy: 'Work, insurance delay, transportation, or referral delays should be documented.' },
    ],
    insuranceProblems: ['The insurer uses missed visits to argue recovery.', 'The carrier says PT was excessive.', 'A delayed start is used against causation.', 'The adjuster ignores objective PT findings.'],
    intakeSteps: [
      { label: 'Step 1', question: 'When did PT start after the accident?' },
      { label: 'Step 2', question: 'How many visits did you attend and were any missed?' },
      { label: 'Step 3', question: 'Did PT improve symptoms, plateau, or lead to imaging/specialist care?' },
      { label: 'Step 4', question: 'Can you explain any treatment gaps?' },
    ],
  },
  '/treatment/spinal-surgery-after-accident': {
    scenario: 'A claimant tried medication, PT, and injections after a crash-related spine injury. Persistent nerve symptoms led a specialist to discuss decompression or fusion, making future treatment cost and causation central issues.',
    timeline: [
      ['Initial care', 'Back or neck symptoms are documented after the crash.'],
      ['Conservative care', 'PT, medication, or chiropractic care fails to fully resolve symptoms.'],
      ['Pain management', 'Epidural injections or nerve blocks indicate treatment escalation.'],
      ['Surgical review', 'Spine specialist discusses decompression, fusion, or future surgery risk.'],
    ],
    severityLadder: [
      ['Mild', 'Soreness improves without escalation.'],
      ['Moderate', 'Conservative care and imaging support ongoing symptoms.'],
      ['Serious', 'Injections and specialist care indicate persistent nerve-related injury.'],
      ['Severe', 'Surgery recommendation, fusion discussion, or permanent restrictions.'],
    ],
    treatmentProgression: [
      { label: 'Conservative phase', copy: 'PT and medication help show whether less invasive care was attempted.' },
      { label: 'Imaging', copy: 'MRI findings should connect to symptoms and provider recommendations.' },
      { label: 'Injections', copy: 'Epidural or facet injections show escalation and document response.' },
      { label: 'Surgical opinion', copy: 'A written recommendation or future-care estimate can be a major value driver.' },
    ],
    settlementDrivers: ['Surgery recommendation', 'Injection history', 'MRI nerve compression', 'Future medical cost', 'Permanent restrictions', 'Clear causation and liability'],
    settlementValueDetails: [
      { label: 'Future care', copy: 'Projected surgery or repeat injections can increase medical damages.' },
      { label: 'Nerve compression', copy: 'Imaging plus nerve symptoms can support a serious spine injury narrative.' },
      { label: 'Specialist opinion', copy: 'A spine specialist recommendation is usually stronger than a generic complaint of pain.' },
    ],
    insuranceProblems: ['The insurer blames degeneration.', 'Future surgery is called speculative.', 'Prior spine treatment is used against causation.', 'The adjuster disputes medical necessity for injections.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What spine level or diagnosis did the provider identify?' },
      { label: 'Step 2', question: 'Have injections been recommended or performed?' },
      { label: 'Step 3', question: 'Was surgery recommended, discussed, or scheduled?' },
      { label: 'Step 4', question: 'Are there prior spine records or degeneration arguments?' },
    ],
  },
  '/tools/settlement-calculator': {
    scenario: 'A claimant had medical bills, missed work, disputed fault, and an early insurance offer. The estimate changed as objective injury proof, liability evidence, and policy information were added.',
    timeline: [
      ['Early estimate', 'Symptoms, crash type, first treatment, and obvious liability facts set a rough baseline.'],
      ['Records added', 'Medical bills, imaging, PT, and wage loss make the range more grounded.'],
      ['Disputes identified', 'Treatment gaps, prior injuries, or comparative fault affect confidence.'],
      ['Final posture', 'Coverage, future care, liens, and attorney review shape practical value.'],
    ],
    severityLadder: [
      ['Low', 'Short treatment, minor symptoms, low bills, and clear recovery.'],
      ['Medium', 'Consistent care, moderate bills, and documented limitations.'],
      ['High', 'Imaging, injections, missed work, or long treatment duration.'],
      ['Very high', 'Surgery, catastrophic injury, commercial coverage, or major wage loss.'],
    ],
    treatmentProgression: [
      { label: 'Facts', copy: 'Incident type, injury, treatment, liability, and insurance facts create the first estimate.' },
      { label: 'Documents', copy: 'Bills, records, photos, and reports improve confidence.' },
      { label: 'Adjustments', copy: 'Gaps, disputes, prior conditions, and policy limits can move the range.' },
      { label: 'Review', copy: 'Attorney review may be appropriate when severity or disputes are significant.' },
    ],
    settlementDrivers: ['Medical specials', 'Injury severity', 'Liability clarity', 'Treatment duration', 'Lost wages', 'Policy limits or commercial coverage'],
    settlementValueDetails: [
      { label: 'Medical economics', copy: 'Bills, paid amounts, liens, and future care are core value inputs.' },
      { label: 'Liability', copy: 'Clear fault generally improves leverage; comparative fault reduces confidence.' },
      { label: 'Coverage', copy: 'Available insurance often determines whether a theoretical value is collectible.' },
    ],
    insuranceProblems: ['The offer arrives before treatment is complete.', 'Policy limits are unknown.', 'Fault is disputed.', 'The insurer challenges bills, liens, or treatment necessity.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What injuries and treatment do you have so far?' },
      { label: 'Step 2', question: 'What are the medical bills, liens, and lost wages?' },
      { label: 'Step 3', question: 'Is liability clear, disputed, or shared?' },
      { label: 'Step 4', question: 'Do you know the policy limits or commercial coverage?' },
    ],
  },
  '/settlements/herniated-disc': {
    scenario: 'A claimant with ongoing back pain received a lumbar MRI showing a herniated disc with nerve contact. The value analysis depended on radiculopathy, injections, prior spine history, and whether the crash caused or aggravated the condition.',
    timeline: [
      ['Pain begins', 'Back or neck pain appears after impact.'],
      ['Radiation develops', 'Pain travels into arm or leg, suggesting possible nerve involvement.'],
      ['MRI confirms', 'Disc herniation, protrusion, extrusion, or nerve impingement is documented.'],
      ['Treatment escalates', 'Injections, surgery review, or long-term restrictions affect value.'],
    ],
    severityLadder: [
      ['Mild', 'Small bulge with short treatment and no nerve symptoms.'],
      ['Moderate', 'Herniation with PT and persistent pain.'],
      ['Serious', 'Radiculopathy, injections, or specialist care.'],
      ['Severe', 'Surgery recommendation, fusion discussion, or permanent impairment.'],
    ],
    treatmentProgression: [
      { label: 'Symptoms', copy: 'Pain pattern, numbness, and weakness should match the suspected disc level.' },
      { label: 'MRI', copy: 'The radiology impression is central to disc injury valuation.' },
      { label: 'Pain management', copy: 'Epidural injections can support treatment escalation.' },
      { label: 'Surgical review', copy: 'Surgery discussion often changes the value band and attorney interest.' },
    ],
    settlementDrivers: ['MRI-confirmed herniation', 'Radiculopathy', 'Epidural injections', 'Surgical recommendation', 'Prior spine history', 'Treatment continuity'],
    settlementValueDetails: [
      { label: 'Nerve involvement', copy: 'Disc findings with radiculopathy usually carry more weight than imaging alone.' },
      { label: 'Escalation', copy: 'Injections or surgical consults show the injury did not resolve with basic care.' },
      { label: 'Causation', copy: 'Prior degeneration must be addressed carefully when valuing disc claims.' },
    ],
    insuranceProblems: ['The insurer calls the herniation preexisting.', 'Degeneration is used to reduce value.', 'Symptoms and MRI level are disputed.', 'The carrier ignores future treatment risk.'],
    intakeSteps: [
      { label: 'Step 1', question: 'Which disc level is listed in the MRI impression?' },
      { label: 'Step 2', question: 'Do symptoms radiate into an arm, hand, leg, or foot?' },
      { label: 'Step 3', question: 'Have injections or surgery been recommended?' },
      { label: 'Step 4', question: 'Do you have prior spine imaging or treatment?' },
    ],
  },
  '/settlements/whiplash': {
    scenario: 'A claimant received a low offer for neck pain after a rear-end collision. The analysis improved after PT notes, headache complaints, cervical range-of-motion limits, and photos of vehicle damage were organized.',
    timeline: [
      ['Crash week', 'Neck stiffness and headache begin.'],
      ['Early care', 'Urgent care, PT, or chiropractic visits document symptoms.'],
      ['Persistent symptoms', 'Ongoing pain, limited motion, or arm symptoms increase seriousness.'],
      ['Valuation', 'Duration of care, liability, and documentation determine whether the offer is low.'],
    ],
    severityLadder: [
      ['Mild', 'Short stiffness and limited care.'],
      ['Moderate', 'Several weeks of therapy and pain documentation.'],
      ['Serious', 'Neurological symptoms or imaging findings.'],
      ['Severe', 'Chronic headaches, injections, or long-term restrictions.'],
    ],
    treatmentProgression: [
      { label: 'Documentation', copy: 'Neck pain onset, headache, and motion limits should be recorded early.' },
      { label: 'Therapy', copy: 'PT or chiropractic care shows whether symptoms persisted.' },
      { label: 'Imaging', copy: 'Cervical imaging may matter when symptoms escalate.' },
      { label: 'Offer review', copy: 'The offer should be compared against treatment duration, bills, liability, and documentation.' },
    ],
    settlementDrivers: ['Treatment duration', 'Headaches or arm symptoms', 'Cervical imaging', 'Vehicle damage proof', 'Clear rear-end liability', 'Medical bills'],
    settlementValueDetails: [
      { label: 'Duration', copy: 'Longer documented symptoms can support a higher range than brief soreness.' },
      { label: 'Objective support', copy: 'Range-of-motion findings and imaging can strengthen soft-tissue claims.' },
      { label: 'Liability', copy: 'Rear-end liability usually helps, but insurers may still dispute severity.' },
    ],
    insuranceProblems: ['The offer undervalues ongoing symptoms.', 'The adjuster claims minimal vehicle damage.', 'Soft-tissue symptoms are treated as minor.', 'Chiropractic bills are reduced or challenged.'],
    intakeSteps: [
      { label: 'Step 1', question: 'How long have neck symptoms continued?' },
      { label: 'Step 2', question: 'Do you have headaches, dizziness, or arm symptoms?' },
      { label: 'Step 3', question: 'What treatment and bills support the claim?' },
      { label: 'Step 4', question: 'What offer did insurance make and when?' },
    ],
  },
  '/settlements/tbi-settlement': {
    scenario: 'A person with post-crash headaches and memory issues struggled at work for months. Treatment records, family observations, neurology notes, and work disruption became key because brain injury symptoms were not visible on photos.',
    timeline: [
      ['Initial symptoms', 'Headache, confusion, nausea, or dizziness.'],
      ['Persistent phase', 'Memory, sleep, concentration, and mood changes continue.'],
      ['Specialty care', 'Neurology, therapy, or neuropsych testing documents function.'],
      ['Long-term impact', 'Work limits, daily-life changes, or continuing treatment drive value.'],
    ],
    severityLadder: [
      ['Mild', 'Short concussion symptoms with quick recovery.'],
      ['Moderate', 'Symptoms last weeks with medical follow-up.'],
      ['Serious', 'Neurology care, cognitive deficits, or work disruption.'],
      ['Severe', 'Hospitalization, permanent deficits, or major life-care impact.'],
    ],
    treatmentProgression: [
      { label: 'Initial care', copy: 'ER or urgent care documents head injury symptoms.' },
      { label: 'Symptom log', copy: 'Headache, memory, sleep, and mood tracking helps prove duration.' },
      { label: 'Specialists', copy: 'Neurology, concussion clinic, vestibular therapy, or neuropsych testing adds depth.' },
      { label: 'Function', copy: 'Work, school, driving, and family observations show real-world harm.' },
    ],
    settlementDrivers: ['Duration of cognitive symptoms', 'Neurology records', 'Work disruption', 'Family or coworker observations', 'Hospitalization', 'Therapy or neuropsych testing'],
    settlementValueDetails: [
      { label: 'Functional change', copy: 'Real-life cognitive limits can be more important than normal imaging.' },
      { label: 'Medical continuity', copy: 'Follow-up care is critical because symptoms can be invisible.' },
      { label: 'Witness support', copy: 'Family, employer, or school observations can strengthen the narrative.' },
    ],
    insuranceProblems: ['Normal imaging is used to deny seriousness.', 'The adjuster calls symptoms subjective.', 'Preexisting anxiety or headaches are blamed.', 'Cognitive limitations are undervalued.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What cognitive, headache, dizziness, or sleep symptoms continue?' },
      { label: 'Step 2', question: 'Have you had ER, neurology, therapy, or testing?' },
      { label: 'Step 3', question: 'How has work, school, driving, or family life changed?' },
      { label: 'Step 4', question: 'Is insurance denying seriousness because imaging was normal?' },
    ],
  },
  '/insurance/claim-denial': {
    scenario: 'An insurer denied a claim by arguing the claimant caused the accident and treated too late. The file became stronger after police-report details, photos, witness information, medical records, and the denial letter were organized together.',
    timeline: [
      ['Denial received', 'Adjuster cites fault, coverage, causation, treatment delay, or insufficient proof.'],
      ['Evidence review', 'Police report, photos, witnesses, and medical records are gathered.'],
      ['Gap analysis', 'Missing records, inconsistent statements, and weak liability facts are identified.'],
      ['Response posture', 'Attorney review may be appropriate if the denial involves serious injury or disputed fault.'],
    ],
    severityLadder: [
      ['Low friction', 'Minor document request or incomplete bill issue.'],
      ['Moderate', 'Low offer or treatment challenge.'],
      ['Serious', 'Fault denial, causation dispute, or coverage problem.'],
      ['Severe', 'Serious injury plus denial, bad-faith concerns, or multiple policy issues.'],
    ],
    treatmentProgression: [
      { label: 'Denial reason', copy: 'The exact wording of the denial determines what evidence is needed.' },
      { label: 'Liability proof', copy: 'Photos, police reports, witnesses, and admissions answer fault arguments.' },
      { label: 'Medical proof', copy: 'Records, bills, and timelines answer causation and treatment arguments.' },
      { label: 'Review', copy: 'Serious denials often need structured attorney-facing summaries.' },
    ],
    settlementDrivers: ['Denial reason', 'Liability evidence', 'Medical documentation', 'Policy coverage', 'Treatment timing', 'Severity of injury'],
    settlementValueDetails: [
      { label: 'Denial letter', copy: 'The written reason helps identify whether the dispute is liability, coverage, causation, or damages.' },
      { label: 'Evidence quality', copy: 'Stronger evidence can convert a denied claim into a reviewable dispute.' },
      { label: 'Serious injury', copy: 'The more serious the injury, the more important it is to challenge weak denial logic.' },
    ],
    insuranceProblems: ['The adjuster blames you without evidence.', 'Treatment delay is used to deny causation.', 'The carrier ignores records or bills.', 'A low offer is made after denial pressure.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What exact reason did insurance give for the denial or low offer?' },
      { label: 'Step 2', question: 'Do you have the police report, photos, or witnesses?' },
      { label: 'Step 3', question: 'What medical records and bills support injury causation?' },
      { label: 'Step 4', question: 'Did the adjuster request a recorded statement or blame you?' },
    ],
  },
  '/insurance/rideshare-commercial-coverage': {
    scenario: 'A passenger injured in a rideshare crash had confusing letters from multiple insurers. The key facts were trip status, driver app activity, police report details, and whether commercial coverage applied.',
    timeline: [
      ['Crash moment', 'Driver role, passenger status, app status, and trip phase matter immediately.'],
      ['Claims opened', 'Personal auto, rideshare, commercial, or company policies may all appear.'],
      ['Coverage dispute', 'Insurers may shift responsibility based on app status or employment status.'],
      ['Review', 'Coverage layers and injury severity determine practical recovery potential.'],
    ],
    severityLadder: [
      ['Simple', 'One policy and clear driver status.'],
      ['Moderate', 'Rideshare app activity or employer use must be confirmed.'],
      ['Serious', 'Multiple insurers dispute coverage or limits.'],
      ['Severe', 'Serious injury with commercial layers, policy disputes, or multiple defendants.'],
    ],
    treatmentProgression: [
      { label: 'Role', copy: 'Identify whether you were passenger, rideshare driver, other driver, pedestrian, or cyclist.' },
      { label: 'App status', copy: 'Trip receipt, screenshots, and timing can determine policy layer.' },
      { label: 'Insurance letters', copy: 'Coverage positions from each carrier should be preserved.' },
      { label: 'Medical severity', copy: 'Serious injury makes coverage identification more urgent.' },
    ],
    settlementDrivers: ['App status', 'Commercial policy layer', 'Trip receipt or screenshots', 'Driver role', 'Injury severity', 'Multiple insurer positions'],
    settlementValueDetails: [
      { label: 'Coverage layer', copy: 'Commercial or rideshare coverage can change available recovery.' },
      { label: 'Trip proof', copy: 'Screenshots and receipts may establish the policy period.' },
      { label: 'Insurer conflict', copy: 'Coverage disputes can delay payment but also reveal important policy issues.' },
    ],
    insuranceProblems: ['Insurers shift responsibility to each other.', 'App status is unclear or disputed.', 'The driver gives incomplete insurance information.', 'A personal auto carrier denies commercial use.'],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger, driver, pedestrian, cyclist, or another motorist?' },
      { label: 'Step 2', question: 'Was the app on, waiting, en route, or carrying a passenger?' },
      { label: 'Step 3', question: 'Do you have trip receipts, screenshots, or insurance letters?' },
      { label: 'Step 4', question: 'Which insurers have accepted or denied coverage?' },
    ],
  },
  '/liability/disputed-fault': {
    scenario: 'The other driver denied fault after a lane-change crash. Photos, dashcam clips, the police narrative, and witness statements became more important than the injury description because liability was the first barrier.',
    timeline: [
      ['Crash scene', 'Photos, vehicle positions, statements, and witnesses are freshest.'],
      ['Police report', 'Narrative, diagram, citations, and party statements shape early liability view.'],
      ['Insurance dispute', 'Adjusters compare versions and may assign comparative fault.'],
      ['Review', 'Evidence strength determines leverage and attorney-fit quality.'],
    ],
    severityLadder: [
      ['Clear', 'Rear-end, admission, citation, or strong video evidence.'],
      ['Moderate', 'Photos and report support you but some facts are disputed.'],
      ['Disputed', 'Conflicting stories, no witnesses, or unclear scene evidence.'],
      ['High risk', 'Comparative fault, adverse report language, or missing evidence.'],
    ],
    treatmentProgression: [
      { label: 'Scene facts', copy: 'Photos, road layout, impact points, and vehicle positions are key.' },
      { label: 'Report', copy: 'Police narrative and citations influence early case review.' },
      { label: 'Witnesses', copy: 'Neutral witness support can overcome conflicting driver stories.' },
      { label: 'Comparative fault', copy: 'Any shared-fault argument should be identified early.' },
    ],
    settlementDrivers: ['Police report support', 'Witness statements', 'Photos or video', 'Admissions or citations', 'Comparative fault percentage', 'Consistency of statements'],
    settlementValueDetails: [
      { label: 'Clear fault', copy: 'Strong liability often improves settlement leverage even before damages are fully known.' },
      { label: 'Comparative fault', copy: 'Shared fault can reduce value and confidence.' },
      { label: 'Independent proof', copy: 'Video, photos, or neutral witnesses can resolve story disputes.' },
    ],
    insuranceProblems: ['The other driver denies fault.', 'The adjuster assigns partial blame.', 'The police report is incomplete.', 'Witness information is missing or not contacted.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What does each driver say happened?' },
      { label: 'Step 2', question: 'Do photos, video, witnesses, or citations support your version?' },
      { label: 'Step 3', question: 'Does the police report contain mistakes or unfavorable language?' },
      { label: 'Step 4', question: 'Has insurance assigned you any percentage of fault?' },
    ],
  },
  '/liability/police-report-errors': {
    scenario: 'A police report listed the wrong lane and omitted a witness. The claimant preserved photos and witness contact details, helping explain why the report did not fully match the crash evidence.',
    timeline: [
      ['Report received', 'Wrong location, vehicle, lane, narrative, or witness omission is identified.'],
      ['Evidence gathered', 'Photos, dashcam, witness details, and scene facts are preserved.'],
      ['Supplement requested', 'Agency procedures may allow supplemental statements or corrections.'],
      ['Claim review', 'Insurers and attorneys compare the report against supporting evidence.'],
    ],
    severityLadder: [
      ['Minor', 'Typo or clerical error with little liability impact.'],
      ['Moderate', 'Incomplete witness or vehicle detail.'],
      ['Serious', 'Wrong fault narrative or missing citation/admission.'],
      ['High risk', 'Report strongly contradicts your version without supporting evidence.'],
    ],
    treatmentProgression: [
      { label: 'Identify error', copy: 'Pinpoint the exact mistake and why it matters.' },
      { label: 'Preserve proof', copy: 'Photos, videos, witnesses, and repair evidence help challenge the report.' },
      { label: 'Supplement', copy: 'Ask about procedures for supplemental information where appropriate.' },
      { label: 'Explain', copy: 'The claim file should explain the discrepancy clearly.' },
    ],
    settlementDrivers: ['Type of report error', 'Supporting photos/video', 'Witness availability', 'Citation or narrative impact', 'Insurer reliance on report', 'Consistency of your statement'],
    settlementValueDetails: [
      { label: 'Fault impact', copy: 'Errors affecting fault are much more important than clerical mistakes.' },
      { label: 'Supporting evidence', copy: 'A report error is easier to address with independent proof.' },
      { label: 'Clear explanation', copy: 'A concise explanation helps attorney and insurer review.' },
    ],
    insuranceProblems: ['The insurer relies on an incorrect report.', 'Witnesses are missing from the narrative.', 'Scene facts are misstated.', 'The other driver benefits from the error.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What specific police report detail is wrong?' },
      { label: 'Step 2', question: 'Does the mistake affect fault, damages, parties, or witnesses?' },
      { label: 'Step 3', question: 'What photos, video, or witnesses prove the correction?' },
      { label: 'Step 4', question: 'Has insurance used the report against you?' },
    ],
  },
  '/commercial/truck-accident-settlement': {
    scenario: 'A collision with a delivery truck caused serious injuries and multiple insurance letters. Company identity, driver employment status, police findings, medical severity, and possible corporate policies became central to valuation.',
    timeline: [
      ['Crash scene', 'Truck company name, DOT numbers, photos, and witnesses should be captured.'],
      ['Early claim', 'Commercial insurer, employer, contractor, and driver information are identified.'],
      ['Evidence phase', 'Driver logs, maintenance, company policies, and citations may matter.'],
      ['Valuation', 'Serious injury plus commercial coverage can create high-value review potential.'],
    ],
    severityLadder: [
      ['Simple', 'Minor injury with clear commercial carrier.'],
      ['Moderate', 'Ongoing treatment and commercial policy identification.'],
      ['Serious', 'Hospitalization, surgery risk, or disputed corporate responsibility.'],
      ['Catastrophic', 'Severe injury, multiple defendants, high coverage, or long-term care.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Truck crashes often involve higher forces, so immediate medical documentation matters.' },
      { label: 'Commercial facts', copy: 'Company name, driver status, vehicle markings, and insurance letters should be preserved.' },
      { label: 'Evidence preservation', copy: 'Video, logs, maintenance, and dispatch facts may disappear without prompt action.' },
      { label: 'High-value review', copy: 'Severity and coverage determine whether specialized attorney review is needed.' },
    ],
    settlementDrivers: ['Commercial policy limits', 'Company responsibility', 'Serious injury or hospitalization', 'Driver logs or violations', 'Maintenance issues', 'Multiple defendants'],
    settlementValueDetails: [
      { label: 'Commercial coverage', copy: 'Higher coverage can change practical settlement potential.' },
      { label: 'Corporate fault', copy: 'Employer, contractor, training, or maintenance issues can expand responsibility.' },
      { label: 'Severe damages', copy: 'Surgery, hospitalization, and wage loss drive high-value analysis.' },
    ],
    insuranceProblems: ['The company disputes driver employment status.', 'Multiple insurers delay responsibility.', 'Evidence preservation is time-sensitive.', 'The carrier minimizes injury despite truck-impact severity.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What company, truck markings, or DOT information do you have?' },
      { label: 'Step 2', question: 'Were there serious injuries, hospitalization, surgery, or missed work?' },
      { label: 'Step 3', question: 'Do you have photos, witnesses, police report, or insurance letters?' },
      { label: 'Step 4', question: 'Is any insurer disputing company responsibility or coverage?' },
    ],
  },
  '/commercial/rideshare-accidents': {
    scenario: 'An injured rideshare passenger had a trip receipt, driver information, and two insurance claim numbers. The strongest path depended on app status, passenger role, injury documentation, and which policy layer applied.',
    timeline: [
      ['Trip active', 'Passenger receipt, route, driver identity, and app status are key.'],
      ['Crash report', 'Police report and insurance letters identify involved parties.'],
      ['Coverage review', 'Rideshare, personal auto, or third-party coverage may apply.'],
      ['Medical value', 'Treatment severity determines whether coverage layers matter economically.'],
    ],
    severityLadder: [
      ['Simple', 'Minor injury and accepted coverage.'],
      ['Moderate', 'PT or imaging with clear app status.'],
      ['Serious', 'Injections, surgery risk, or multiple insurers.'],
      ['Complex', 'Serious injury plus disputed app status or multiple responsible parties.'],
    ],
    treatmentProgression: [
      { label: 'Trip proof', copy: 'Screenshots, receipts, and route details help establish status.' },
      { label: 'Medical proof', copy: 'Records and bills show whether the case needs deeper review.' },
      { label: 'Insurance layer', copy: 'Rideshare and personal auto carriers may take different positions.' },
      { label: 'Attorney routing', copy: 'Complex coverage and serious injury should be summarized clearly.' },
    ],
    settlementDrivers: ['Trip status', 'Passenger vs driver role', 'Coverage layer', 'Medical severity', 'Fault evidence', 'Insurance acceptance or denial'],
    settlementValueDetails: [
      { label: 'App status', copy: 'The exact trip phase can determine available coverage.' },
      { label: 'Passenger role', copy: 'Passengers may have different liability issues than rideshare drivers.' },
      { label: 'Policy conflict', copy: 'Conflicting carrier positions can delay resolution and increase complexity.' },
    ],
    insuranceProblems: ['Rideshare and personal insurers point at each other.', 'Trip status is unclear.', 'The app receipt is missing.', 'Coverage is delayed while medical bills grow.'],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you the passenger, rideshare driver, or another driver?' },
      { label: 'Step 2', question: 'Do you have trip screenshots, receipts, route, or driver details?' },
      { label: 'Step 3', question: 'Which insurers have contacted you?' },
      { label: 'Step 4', question: 'What treatment and bills exist so far?' },
    ],
  },
  '/legal/california-personal-injury': {
    scenario: 'A California claimant was unsure whether to contact an attorney. The file became easier to evaluate after injury severity, treatment records, liability evidence, insurance letters, and deadline concerns were organized.',
    timeline: [
      ['Accident date', 'Incident location, parties, fault facts, and immediate symptoms are recorded.'],
      ['Treatment begins', 'Medical records, bills, and referrals shape damages.'],
      ['Insurance contact', 'Adjuster communications, offers, denials, and coverage facts are tracked.'],
      ['Attorney readiness', 'Serious injury, disputed fault, liens, or deadlines may support review.'],
    ],
    severityLadder: [
      ['Basic', 'Minor symptoms and no dispute.'],
      ['Developing', 'Ongoing care, bills, or unclear liability.'],
      ['Attorney-ready', 'Serious injury, disputed fault, low offer, or commercial coverage.'],
      ['Urgent', 'Surgery, catastrophic injury, approaching deadline, or minor/complex lien issues.'],
    ],
    treatmentProgression: [
      { label: 'Facts', copy: 'Incident date, location, fault, and injury type establish the case frame.' },
      { label: 'Medical story', copy: 'Treatment records and bills turn symptoms into documentation.' },
      { label: 'Insurance story', copy: 'Offers, denials, and adjuster messages reveal claim posture.' },
      { label: 'Review package', copy: 'A clean chronology helps attorneys triage quickly.' },
    ],
    settlementDrivers: ['California liability facts', 'Medical treatment', 'Insurance coverage', 'Deadlines', 'Liens or medical bills', 'Attorney-readiness indicators'],
    settlementValueDetails: [
      { label: 'Readiness', copy: 'Attorneys can evaluate faster when the file has facts, records, and damages organized.' },
      { label: 'Deadline risk', copy: 'Timing matters because statutes and notice rules can affect rights.' },
      { label: 'Complexity', copy: 'Commercial coverage, liens, disputed fault, or serious injuries increase need for review.' },
    ],
    insuranceProblems: ['The adjuster pushes for a quick statement.', 'A low offer arrives before treatment is complete.', 'Fault is disputed.', 'Medical liens or bills are unclear.'],
    intakeSteps: [
      { label: 'Step 1', question: 'When and where did the accident happen in California?' },
      { label: 'Step 2', question: 'What injuries, treatment, and bills exist so far?' },
      { label: 'Step 3', question: 'What has insurance offered, denied, or disputed?' },
      { label: 'Step 4', question: 'Are there deadlines, liens, minors, or commercial coverage issues?' },
    ],
  },
  '/education/delayed-accident-symptoms': {
    scenario: 'A person felt fine at the scene but developed back pain and numbness two days later. The key was creating a symptom timeline and getting medical evaluation before the insurer framed the delay as unrelated.',
    timeline: [
      ['Immediately', 'Adrenaline may mask soreness, headache, stiffness, or anxiety.'],
      ['24-72 hours', 'Pain, numbness, dizziness, or stiffness may emerge.'],
      ['1 week', 'Persistent symptoms should be documented and medically evaluated.'],
      ['Longer term', 'Delayed symptoms can lead to MRI, PT, specialist care, or insurance disputes.'],
    ],
    severityLadder: [
      ['Watch', 'Mild soreness that improves quickly.'],
      ['Document', 'Symptoms persist beyond a few days or interfere with activity.'],
      ['Evaluate', 'Numbness, dizziness, headache, weakness, or worsening pain.'],
      ['Escalate', 'Imaging, specialist care, injections, or major work limits.'],
    ],
    treatmentProgression: [
      { label: 'Symptom log', copy: 'Write down when each symptom started and how it changed.' },
      { label: 'Medical visit', copy: 'Evaluation helps protect health and document timing.' },
      { label: 'Follow-up', copy: 'Persistent symptoms may need PT, imaging, or specialist care.' },
      { label: 'Claim context', copy: 'Clear timing helps answer delayed-symptom insurance arguments.' },
    ],
    settlementDrivers: ['Symptom timing', 'Medical evaluation date', 'Worsening pattern', 'Numbness or neurological symptoms', 'Treatment continuity', 'Insurance delay arguments'],
    settlementValueDetails: [
      { label: 'Timing clarity', copy: 'A clear timeline makes delayed symptoms easier to explain.' },
      { label: 'Medical support', copy: 'Provider documentation matters when symptoms appear after the scene.' },
      { label: 'Escalation', copy: 'Symptoms that worsen or require imaging may change severity.' },
    ],
    insuranceProblems: ['The insurer says delay means unrelated.', 'Early statements are used to claim no injury.', 'The adjuster minimizes symptoms that appeared later.', 'Treatment gaps are exaggerated.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What symptoms appeared later and when?' },
      { label: 'Step 2', question: 'Are symptoms worsening, spreading, or causing numbness/dizziness?' },
      { label: 'Step 3', question: 'When did you first seek medical care?' },
      { label: 'Step 4', question: 'Did insurance use the delay against you?' },
    ],
  },
  '/education/insurance-settlement-tactics': {
    scenario: 'An adjuster asked for a recorded statement and made a quick offer before medical treatment was complete. The claimant needed to understand how treatment gaps, prior injuries, and low early offers can reduce settlement leverage.',
    timeline: [
      ['First contact', 'Adjuster asks for statement, photos, medical authorization, or quick facts.'],
      ['Early offer', 'A low offer may arrive before full treatment and bills are known.'],
      ['Dispute phase', 'The carrier questions gaps, prior injuries, causation, or bill amounts.'],
      ['Response posture', 'Organized evidence and timing help protect claim value.'],
    ],
    severityLadder: [
      ['Low pressure', 'Routine document request.'],
      ['Moderate', 'Quick low offer or recorded statement pressure.'],
      ['Serious', 'Causation, treatment, or liability dispute.'],
      ['High risk', 'Serious injury plus denial, policy dispute, or aggressive blame tactics.'],
    ],
    treatmentProgression: [
      { label: 'Communication log', copy: 'Save adjuster calls, emails, letters, and offers.' },
      { label: 'Medical status', copy: 'Avoid valuing the claim before diagnosis and treatment are clear.' },
      { label: 'Dispute tracking', copy: 'Identify whether the carrier attacks liability, causation, bills, or gaps.' },
      { label: 'Evidence package', copy: 'Records, bills, photos, and explanations improve response quality.' },
    ],
    settlementDrivers: ['Low-offer timing', 'Recorded statement risk', 'Treatment gap explanations', 'Prior injury arguments', 'Medical bill disputes', 'Liability evidence'],
    settlementValueDetails: [
      { label: 'Offer timing', copy: 'An offer before treatment ends may not reflect full damages.' },
      { label: 'Statement risk', copy: 'Unsupported guesses can be used later to reduce value.' },
      { label: 'Document control', copy: 'Keeping records organized helps answer common adjuster tactics.' },
    ],
    insuranceProblems: ['The adjuster pushes for a quick statement.', 'The carrier highlights old injuries.', 'The offer ignores future care.', 'Bills or treatment are reduced without explanation.'],
    intakeSteps: [
      { label: 'Step 1', question: 'What has the adjuster asked you to sign or say?' },
      { label: 'Step 2', question: 'Was an offer made before treatment was complete?' },
      { label: 'Step 3', question: 'Is insurance challenging gaps, prior injuries, or bills?' },
      { label: 'Step 4', question: 'Do you have all letters, emails, and offer details?' },
    ],
  },
  '/education/post-accident-medical-care': {
    scenario: 'A claimant delayed care because pain seemed manageable, then symptoms worsened. The recovery timeline became stronger when the first visit, referrals, imaging, PT, and reasons for delay were documented clearly.',
    timeline: [
      ['First hours', 'Check for urgent symptoms and document pain, dizziness, numbness, or weakness.'],
      ['First days', 'Medical evaluation can connect symptoms to the accident and identify warning signs.'],
      ['Following weeks', 'Follow-up care, PT, imaging, and specialist referrals build the recovery timeline.'],
      ['Ongoing', 'Gaps, plateau, future care, and work limits affect claim readiness.'],
    ],
    severityLadder: [
      ['Minor', 'Symptoms improve quickly with minimal care.'],
      ['Documented', 'Provider visit and follow-up support the injury timeline.'],
      ['Escalating', 'PT, imaging, referral, or worsening symptoms.'],
      ['Serious', 'Injections, surgery discussion, hospitalization, or long-term restrictions.'],
    ],
    treatmentProgression: [
      { label: 'Initial care', copy: 'The first visit anchors timing and symptoms.' },
      { label: 'Follow-up', copy: 'Returning as recommended prevents unexplained gaps.' },
      { label: 'Specialty care', copy: 'Imaging, PT, neurology, orthopedic, or pain management may be needed.' },
      { label: 'Timeline review', copy: 'The recovery story should explain improvement, plateau, or worsening.' },
    ],
    settlementDrivers: ['First visit timing', 'Treatment continuity', 'Referral history', 'Symptom escalation', 'Explained delays', 'Work and activity limits'],
    settlementValueDetails: [
      { label: 'Prompt care', copy: 'Early documentation helps connect symptoms to the accident.' },
      { label: 'Follow-up', copy: 'Consistent care makes the medical story easier to trust.' },
      { label: 'Delay explanation', copy: 'If care was delayed, the reason should be documented.' },
    ],
    insuranceProblems: ['The insurer uses delayed care against causation.', 'Missed appointments are framed as recovery.', 'The adjuster ignores referral delays.', 'Symptoms are minimized before diagnosis is complete.'],
    intakeSteps: [
      { label: 'Step 1', question: 'When was your first medical visit after the accident?' },
      { label: 'Step 2', question: 'What symptoms were documented at each visit?' },
      { label: 'Step 3', question: 'Were you referred to PT, imaging, or specialists?' },
      { label: 'Step 4', question: 'Are there delays or gaps that need explanation?' },
    ],
  },
}
