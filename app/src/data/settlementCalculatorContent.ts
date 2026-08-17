/**
 * Shared copy for the settlement calculator.
 *
 * Both the tool page and its `seoLandingPages` entry read from here. The landing
 * entry drives the FAQPage structured data, and Google requires that markup to
 * match FAQs actually visible on the page, so a single source keeps the schema
 * honest. It also keeps this out of the big landing page arrays, which cannot be
 * tree-shaken — the tool page would otherwise pull all 173 pages' text to render
 * six questions.
 */

export const SETTLEMENT_CALCULATOR_FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is this a guaranteed settlement amount?',
    a: 'No. It is an educational estimate for preparation, not legal advice and not an offer. Real settlements depend on evidence, venue, the adjuster, the carrier, and negotiation. ClearCaseIQ is not a law firm.',
  },
  {
    q: 'How is the range calculated?',
    a: 'It uses the multiplier method. Documented economic loss — medical bills, future care, lost wages, and out-of-pocket costs — is added to a non-economic component calculated by multiplying medical costs by a severity multiplier of roughly 1.5 to 10. The total is discounted if liability is disputed, reduced by your share of fault, and capped by any insurance limit you enter.',
  },
  {
    q: 'Why is the multiplier based on medical bills instead of my total losses?',
    a: 'Because that is how the method is conventionally applied by both plaintiff firms and insurers. Treatment cost is used as a rough proxy for how much the injury interfered with daily life. It is imperfect: it undervalues serious injuries treated cheaply and overvalues minor injuries treated expensively, which is one reason the output is a wide range.',
  },
  {
    q: 'Does being partly at fault stop me from recovering?',
    a: 'Not in California, which follows pure comparative negligence. Your recovery is reduced by your percentage of fault but is not eliminated, even if your share exceeds 50 percent. Many other states bar recovery once you cross a threshold, so this is state-specific.',
  },
  {
    q: 'Why does the insurance policy limit matter so much?',
    a: 'Because a claim worth more than the available coverage usually still settles within the coverage. Identifying every applicable policy — the at-fault party’s liability coverage, an employer or commercial policy, an umbrella policy, and your own underinsured motorist coverage — often matters more to the outcome than the valuation itself.',
  },
  {
    q: 'What would make an estimate like this more reliable?',
    a: 'Complete records. Itemized medical bills, imaging reports, a physician’s written opinion on future care, wage documentation, the police report, and photographs all move a claim from asserted to documented. Treatment gaps, missing bills, and unexplained delays reduce what a carrier will pay.',
  },
]

export const SETTLEMENT_CALCULATOR_WHY_IT_MATTERS =
  'Settlement value is not a single number. It depends on liability strength, injury proof, medical expenses, treatment duration, available insurance coverage, and which documents are missing. A calculator can show you the shape of the math, but the inputs are what decide the outcome.'

export const SETTLEMENT_CALCULATOR_WHAT_TO_TRACK = [
  'Itemized medical bills and amounts actually paid',
  'Wage loss and out-of-pocket costs, with documentation',
  'Treatment duration, gaps, and any recommended future care',
  'Police reports, photographs, and witness contacts',
  'Every insurance policy that might apply, including your own',
]
