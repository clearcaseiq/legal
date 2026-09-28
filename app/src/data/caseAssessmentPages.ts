/**
 * Paid-search landing pages: one per ad group, each opening the assessment with
 * its case type already answered.
 *
 * These exist for message match. An ad that promises "find out if you have a
 * case" should land on a page that says exactly that and starts the assessment,
 * not on an SEO article about lawyer fees. The articles stay the organic entry
 * point; these pages are `noindex` so they never compete with them in search.
 */
import { START_ASSESSMENT_HREF } from './appRoutes'

export type CaseAssessmentPage = {
  path: string
  /** `caseTypePreset` slug for the wizard. Absent opens the case-type question. */
  presetType?: string
  metaTitle: string
  metaDescription: string
  eyebrow: string
  headline: string
  intro: string
  /** The three questions every ad in the group answers, in this order. */
  haveCase: string
  worth: string
  nextSteps: string
  /** What the assessment weighs for this case type. */
  factors: string[]
  deadline: string
  faq: Array<{ q: string; a: string }>
}

export const CASE_ASSESSMENT_CONTENT_UPDATED = '2026-09-28'

export const caseAssessmentPages: CaseAssessmentPage[] = [
  {
    path: '/case-assessment/personal-injury',
    metaTitle: 'Free Personal Injury Case Assessment | ClearCaseIQ',
    metaDescription:
      'Were you hurt in California? Answer a few questions to see whether you may have an injury case, a possible value range, and your next steps. Free, no obligation.',
    eyebrow: 'Free personal injury case assessment',
    headline: 'Do you have an injury case? Find out in minutes.',
    intro:
      'Answer a few plain-language questions about what happened and your injuries. You get a preliminary assessment of your claim, a possible value range, and clear next steps — before you talk to anyone.',
    haveCase:
      'Most injury claims come down to three things: someone else was at fault, you were hurt, and the injury cost you something — medical bills, lost pay, or pain that changed your daily life. The assessment checks each one.',
    worth:
      'Value depends on your medical treatment, lost income, how long recovery takes, and the insurance available. You see a preliminary range based on the details you give, with the factors that move it up or down.',
    nextSteps:
      'You get a checklist of what to gather — medical records, photos, the police or incident report — and the deadline that likely applies. If you want a lawyer to review it, you choose which ones see your case.',
    factors: [
      'Who was at fault and what evidence shows it',
      'Your injuries, treatment, and recovery time',
      'Medical bills and wages lost so far',
      'Insurance coverage that may apply',
    ],
    deadline:
      'In California you generally have two years from the injury to file a personal injury lawsuit, and only six months to file a claim if a government agency was involved.',
    faq: [
      {
        q: 'Does the assessment cost anything?',
        a: 'No. The assessment is free, and you are under no obligation to hire anyone afterward.',
      },
      {
        q: 'Will a lawyer call me?',
        a: 'Only if you ask. Your case is shared with an attorney only after you choose one and consent.',
      },
      {
        q: 'Is the value range a guarantee?',
        a: 'No. It is a preliminary estimate from the details you enter. The actual outcome depends on evidence, insurance, and negotiation.',
      },
    ],
  },
  {
    path: '/case-assessment/car-accident',
    presetType: 'car',
    metaTitle: 'Free Car Accident Case Assessment | ClearCaseIQ',
    metaDescription:
      'Hurt in a California car accident? See whether you may have a claim, what it could be worth, and what to do next. A free car accident case assessment in minutes.',
    eyebrow: 'Free car accident case assessment',
    headline: 'Hurt in a car accident? See if you have a case.',
    intro:
      'Tell us how the crash happened and how you were hurt. You get a preliminary assessment of your car accident claim, a possible value range, and the steps to take next — before the insurance adjuster calls again.',
    haveCase:
      'You may have a claim if another driver caused the crash and you were injured. California uses comparative fault, so you can often still recover even if you were partly to blame — your share is reduced by your percentage of fault.',
    worth:
      'Car accident claims are valued on your medical bills, lost wages, pain and suffering, vehicle damage, and the at-fault driver\'s policy limits. You see a preliminary range and what is driving it.',
    nextSteps:
      'Get checked by a doctor, keep every medical record, and be careful what you say to the other driver\'s insurer. The assessment lists what to collect and when your filing deadline likely falls.',
    factors: [
      'How the crash happened and who was at fault',
      'The police report, photos, and witnesses',
      'Your injuries and treatment so far',
      'The other driver\'s insurance and your own coverage',
    ],
    deadline:
      'California generally allows two years from the crash to file an injury lawsuit, and six months to file a claim if a government vehicle or road condition was involved.',
    faq: [
      {
        q: 'Should I accept the insurance company\'s first offer?',
        a: 'Not before you understand what your claim may be worth. Early offers often come before the full cost of treatment is known.',
      },
      {
        q: 'What if I was partly at fault?',
        a: 'California\'s comparative fault rule means you can usually still recover, reduced by your share of fault.',
      },
      {
        q: 'Does the assessment cost anything?',
        a: 'No. It is free, and there is no obligation to hire an attorney afterward.',
      },
    ],
  },
  {
    path: '/case-assessment/dog-bite',
    presetType: 'dog_bite',
    metaTitle: 'Free Dog Bite Case Assessment | ClearCaseIQ',
    metaDescription:
      'Bitten by a dog in California? Find out whether you may have a claim against the owner, what it could be worth, and your next steps. Free dog bite case assessment.',
    eyebrow: 'Free dog bite case assessment',
    headline: 'Bitten by a dog? Find out if you have a claim.',
    intro:
      'Answer a few questions about the bite and your injuries. You get a preliminary assessment of your dog bite claim, a possible value range, and what to do next.',
    haveCase:
      'California holds dog owners responsible for bites in most cases, even if the dog never bit anyone before. The key questions are whether you were in a public place or lawfully on private property, and whether you provoked the dog.',
    worth:
      'Dog bite claims are valued on medical treatment, scarring, infection or nerve damage, lost income, and emotional impact. Homeowner\'s or renter\'s insurance often pays these claims. You see a preliminary range.',
    nextSteps:
      'Get medical care, photograph the wounds as they heal, report the bite to animal control, and get the owner\'s name and insurance. The assessment lists what else to collect.',
    factors: [
      'Where the bite happened and why you were there',
      'The owner and any insurance they carry',
      'Your wounds, scarring, and treatment',
      'Animal control or medical reports',
    ],
    deadline:
      'California generally allows two years from the bite to file a lawsuit. Report the bite and gather records now, while details are fresh.',
    faq: [
      {
        q: 'Does the dog need a history of biting?',
        a: 'Usually not. California\'s dog bite statute holds owners responsible even for a first bite, with limited exceptions.',
      },
      {
        q: 'Who pays for a dog bite claim?',
        a: 'Often the owner\'s homeowner\'s or renter\'s insurance, not the owner personally.',
      },
      {
        q: 'Does the assessment cost anything?',
        a: 'No. It is free, and you are under no obligation afterward.',
      },
    ],
  },
  {
    path: '/case-assessment/pedestrian-accident',
    presetType: 'pedestrian',
    metaTitle: 'Free Pedestrian Accident Case Assessment | ClearCaseIQ',
    metaDescription:
      'Hit by a car while walking in California? See whether you may have a pedestrian accident claim, a possible value range, and next steps. Free and confidential.',
    eyebrow: 'Free pedestrian accident case assessment',
    headline: 'Hit by a car while walking? See if you have a case.',
    intro:
      'Tell us where it happened and how you were hurt. You get a preliminary assessment of your pedestrian accident claim, a possible value range, and clear next steps.',
    haveCase:
      'Drivers in California must yield to pedestrians in crosswalks and take care around people on foot everywhere else. If a driver\'s carelessness caused the collision, you may have a claim — even if you were outside a crosswalk.',
    worth:
      'Pedestrian injuries are often serious, so value turns on your treatment, time off work, long-term effects, and the insurance available — including your own auto policy\'s coverage. You see a preliminary range.',
    nextSteps:
      'Keep the police report number, photograph the scene and your injuries, and follow your treatment plan. The assessment lists what to gather and the deadline that likely applies.',
    factors: [
      'Where you were crossing or walking',
      'The driver\'s conduct and the police report',
      'Your injuries and ongoing treatment',
      'The driver\'s insurance and your own coverage',
    ],
    deadline:
      'California generally allows two years to file an injury lawsuit, and six months to file a claim if a city or county vehicle or road design was involved.',
    faq: [
      {
        q: 'What if I was not in a crosswalk?',
        a: 'You may still have a claim. Drivers owe care to pedestrians everywhere; your recovery may be reduced by any share of fault.',
      },
      {
        q: 'What if the driver drove off?',
        a: 'Your own auto policy\'s uninsured motorist coverage may apply even though you were walking.',
      },
      {
        q: 'Does the assessment cost anything?',
        a: 'No. It is free, and there is no obligation to hire anyone.',
      },
    ],
  },
  {
    path: '/case-assessment/slip-and-fall',
    presetType: 'slip_fall',
    metaTitle: 'Free Slip and Fall Case Assessment | ClearCaseIQ',
    metaDescription:
      'Injured in a slip and fall in California? See whether the property owner may be responsible, what your claim could be worth, and what to do next. Free assessment.',
    eyebrow: 'Free slip and fall case assessment',
    headline: 'Hurt in a slip and fall? Find out if you have a case.',
    intro:
      'Tell us where you fell and what caused it. You get a preliminary assessment of your slip and fall claim, a possible value range, and the next steps to take.',
    haveCase:
      'Property owners must keep their premises reasonably safe. You may have a claim if a hazard — a wet floor, broken step, or poor lighting — caused your fall and the owner knew or should have known about it.',
    worth:
      'Slip and fall claims are valued on your injuries, medical care, lost wages, and how clearly the hazard can be shown. Photos and an incident report make a large difference. You see a preliminary range.',
    nextSteps:
      'Photograph the hazard, ask for an incident report, keep the shoes you wore, and get the names of witnesses. The assessment lists what to collect and your likely deadline.',
    factors: [
      'What caused the fall and how long it was there',
      'Whether the owner knew or should have known',
      'Photos, incident reports, and witnesses',
      'Your injuries and treatment',
    ],
    deadline:
      'California generally allows two years to file a lawsuit, and only six months to file a claim if the fall happened on public property.',
    faq: [
      {
        q: 'Is every fall on someone\'s property a case?',
        a: 'No. The claim depends on a dangerous condition the owner knew or should have known about and failed to fix or warn of.',
      },
      {
        q: 'What if I fell at a store?',
        a: 'Businesses must inspect for hazards. Ask for an incident report before you leave and write down what you saw.',
      },
      {
        q: 'Does the assessment cost anything?',
        a: 'No. It is free, and you are under no obligation afterward.',
      },
    ],
  },
  {
    path: '/case-assessment/medical-malpractice',
    presetType: 'medmal',
    metaTitle: 'Free Medical Malpractice Case Assessment | ClearCaseIQ',
    metaDescription:
      'Harmed by medical care in California? See whether you may have a malpractice claim, a possible value range, and the strict deadlines that apply. Free assessment.',
    eyebrow: 'Free medical malpractice case assessment',
    headline: 'Harmed by medical care? Find out if you have a case.',
    intro:
      'Tell us what treatment you received and what went wrong. You get a preliminary assessment of your medical malpractice claim, a possible value range, and the deadlines to watch.',
    haveCase:
      'A bad outcome alone is not malpractice. A claim generally needs a provider who fell below the accepted standard of care, and that failure caused you harm — such as a missed diagnosis, surgical error, or medication mistake.',
    worth:
      'Malpractice claims are valued on the added harm the error caused, future care, lost earnings, and pain and suffering, which California caps in these cases. You see a preliminary range and what drives it.',
    nextSteps:
      'Request copies of your medical records, write down a timeline of your care, and avoid delaying — the deadlines are short. The assessment lists what to gather.',
    factors: [
      'The treatment you received and what went wrong',
      'How the error changed your health',
      'Your medical records and timeline',
      'Additional care and costs the error caused',
    ],
    deadline:
      'California generally allows one year from when you discovered the injury, and no more than three years from the injury itself. Claims against public hospitals have a six-month claim deadline.',
    faq: [
      {
        q: 'Is a bad result from surgery malpractice?',
        a: 'Not by itself. A claim requires care below the accepted standard that caused harm a competent provider would have avoided.',
      },
      {
        q: 'Why do the deadlines matter so much?',
        a: 'Malpractice deadlines are shorter than most injury claims, and missing them usually ends the claim.',
      },
      {
        q: 'Does the assessment cost anything?',
        a: 'No. It is free, and there is no obligation to hire an attorney.',
      },
    ],
  },
]

export const caseAssessmentPagesByPath = new Map(caseAssessmentPages.map((page) => [page.path, page]))

/** Where the page's CTAs go: a fresh assessment with the case type answered. */
export function caseAssessmentStartHref(page: CaseAssessmentPage): string {
  return page.presetType ? `${START_ASSESSMENT_HREF}&type=${page.presetType}` : START_ASSESSMENT_HREF
}
