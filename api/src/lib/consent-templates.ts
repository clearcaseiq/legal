/**
 * Single source of truth for consent/legal document text served to plaintiffs
 * (modal + public pages). Bump version when content changes to trigger re-consent.
 */

export type ConsentTemplateKey =
  | 'hipaa'
  | 'terms'
  | 'privacy'
  | 'marketing'
  | 'call_recording'
  | 'attorney_share'
  | 'platform_disclosure'

export type ConsentTemplateRecord = {
  version: string
  documentId: string
  title: string
  /** ISO date YYYY-MM-DD — shown on documents and status APIs */
  effectiveDate: string
  /** Short plain-language summary shown above full text (HIPAA + policy pages) */
  plainLanguageSummary: string
  content: string
}

export const PLAINTIFF_REQUIRED_CONSENT_TYPES = ['hipaa', 'terms', 'privacy'] as const
export type PlaintiffRequiredConsentType = (typeof PLAINTIFF_REQUIRED_CONSENT_TYPES)[number]

/**
 * The consent that authorizes disclosing a case to a law firm.
 *
 * Separate from terms/privacy on purpose: those gate use of the platform and are
 * accepted before the consumer has seen a single attorney, so accepting them
 * cannot stand in for permission to hand an identified person's injury facts to
 * a third party. This one is granted per case, names the firms it covers, and is
 * the record the routing gate checks.
 */
export const SHARE_AUTHORIZATION_CONSENT_TYPE = 'attorney_share'

export const CONSENT_TEMPLATES: Record<ConsentTemplateKey, ConsentTemplateRecord> = {
  hipaa: {
    version: '1.1',
    documentId: 'hipaa-v1.1',
    title: 'HIPAA authorization',
    effectiveDate: '2026-07-30',
    plainLanguageSummary: `This authorization lets ClearCaseIQ Corp. request, use, and share health information that is relevant to your injury case, typically with your lawyers, providers, insurers, and others involved in evaluating or pursuing your claim. You can revoke it in writing at legal@clearcaseiq.com; it lasts until you revoke it, your case ends, or the expiration in the full document, whichever comes first. Signing is voluntary and is not a condition of receiving medical treatment or benefits.`,
    content: `
# HIPAA authorization

## Authorization for use and disclosure of protected health information

I authorize **ClearCaseIQ Corp.**, a California company operating the ClearCaseIQ platform, and legal professionals I choose to work with, to use and disclose my protected health information (PHI) as described below. ClearCaseIQ Corp. is not a law firm and does not provide legal advice or medical care.

### Information that may be disclosed
- Medical records and treatment history
- Diagnostic test results
- Prescription and medication information
- Healthcare provider communications
- Insurance information
- Other health-related information relevant to my legal case

### Purpose
- Evaluating my personal injury case
- Communicating with healthcare providers
- Preparing legal documentation
- Coordinating treatment and billing when relevant to my case
- Other activities directly related to my legal representation

### Recipients (as appropriate)
- My attorney and legal team
- Healthcare providers involved in my treatment
- Insurers when necessary for the case
- Medical experts and consultants
- Courts and adjudicators when required

### Duration
This authorization remains valid until my case is resolved, I revoke it in writing, or two (2) years from the date of signature, whichever occurs first, unless a shorter period is required by law.

### Right to revoke
I may revoke this authorization in writing at any time by emailing legal@clearcaseiq.com. Revocation does not undo actions already taken in good faith before revocation.

### Acknowledgment
I have had the opportunity to read this authorization. Information disclosed may be redisclosed by a recipient and may no longer be protected by HIPAA. I understand I may refuse to sign; refusal does not bar treatment, payment, enrollment, or eligibility for benefits solely on that basis, as described in applicable law.
    `.trim(),
  },
  terms: {
    version: '1.3',
    documentId: 'terms-v1.3',
    title: 'Terms of Service',
    effectiveDate: '2026-07-30',
    plainLanguageSummary: `You are contracting with ClearCaseIQ Corp., a technology company in Los Angeles, California. ClearCaseIQ is not a law firm, is not your lawyer, and does not give legal advice. These Terms are the rules for using the platform: you’ll provide accurate information, use the service lawfully, and keep your login private. Participating law firms pay ClearCaseIQ for technology and marketing services; you never do. When you pick your own firms, paying to participate does not improve a firm’s position. The Terms also explain the separate situation where a case arrives without anyone having picked firms, and how firms are ordered then. California law governs, and liability limits apply as described in the full Terms.`,
    content: `
# Terms of Service

## Who you are contracting with
These Terms are an agreement between you and **ClearCaseIQ Corp.**, a technology company with its principal place of business in Los Angeles, California ("ClearCaseIQ," "we," or "us"). You can reach us at legal@clearcaseiq.com.

**ClearCaseIQ is not a law firm.** We do not practice law, we do not provide legal advice, and no employee of ClearCaseIQ is acting as your attorney. We are a software platform. Any attorney or law firm you encounter through the platform is an independent business that we neither own nor control, and each is solely responsible for the legal services it provides.

## Agreement
By using this service, you agree to these Terms. If you do not agree, do not use the service.

## Description of service
ClearCaseIQ may provide case intake, assessment tools, attorney matching or introductions, document or evidence organization, and communications between you and professionals you engage. Features vary by product configuration.

## Your responsibilities
- Provide accurate information to the best of your knowledge
- Keep your account credentials confidential
- Use the service only for lawful purposes
- Not interfere with security or availability of the service

## Not legal advice; no attorney–client relationship
ClearCaseIQ is not a law firm and nothing on the platform is legal advice. Using the platform does not create an attorney–client relationship with ClearCaseIQ. That relationship is formed only with an attorney you separately engage, on the terms of the engagement agreement you sign with that attorney. Information you give ClearCaseIQ is not protected by the attorney–client privilege until an attorney you have engaged holds it.

## Attorney participation
Some attorneys and law firms participate in the ClearCaseIQ platform under commercial agreements with ClearCaseIQ. Those agreements may include payments for technology, marketing, or lead-generation services. What a firm pays is a flat fee per case: the same amount for every case, regardless of claim type, injury severity, or expected settlement value, and never a percentage or other share of any recovery. Consumers never pay ClearCaseIQ to use the platform.

ClearCaseIQ does not guarantee representation and does not recommend or endorse any attorney. You are free to choose any attorney, whether or not they participate on the platform.

### How firms are identified when you choose them
If you complete an assessment and ask for attorney review, you see the participating firms before any of them is contacted. They are identified using objective criteria: the state and county of your matter, the type of claim, whether the firm handles that claim type, and how quickly the firm typically responds. You set the order, you may remove any of them, and firms are contacted one at a time in the order you set. Paying to participate does not improve a firm's position in that list. If the firms you chose cannot take your case, we ask you to approve a new set before contacting anyone else.

### How firms are identified when nobody has chosen them
A case can also reach the platform without a consumer having named any firm, for example a case referred to us by a partner, or a case released by our team after a manual review. On those paths ClearCaseIQ decides which participating firms are offered the case and in what order, and a firm's commercial arrangement with us can affect that: a firm with an active subscription may be offered a case before other firms, and a firm's account standing is one input among several into the order. This is disclosed because it is a real difference between the two paths, not because it applies to a consumer who chose their own firms. It does not.

## Disclaimers and limitation of liability
The service is provided “as available.” To the maximum extent permitted by law, ClearCaseIQ is not liable for indirect or consequential damages arising from use of the service.

## Changes
We may update these Terms. Material changes may be communicated through the service. Continued use after changes may constitute acceptance.

## Governing law and venue
These Terms are governed by the laws of the State of California, without regard to its conflict-of-laws rules. Any dispute arising out of these Terms or your use of the service is subject to the exclusive jurisdiction of the state and federal courts located in Los Angeles County, California, and you and ClearCaseIQ each consent to venue there.

Nothing in this section waives any right you have under California law that cannot be waived by agreement, and nothing here limits your ability to bring a complaint before a government agency or the State Bar of California.
    `.trim(),
  },
  privacy: {
    version: '1.3',
    documentId: 'privacy-v1.3',
    title: 'Privacy Policy',
    effectiveDate: '2026-07-30',
    plainLanguageSummary: `ClearCaseIQ Corp., in Los Angeles, California, operates this platform. We collect what you give us (contact, case details, files you upload) and some technical data to run and secure the service. We use it to deliver the features you ask for. Your case information reaches a law firm only when you choose to send it, and only the firms you selected or authorized us to contact. The policy also describes the separate situation where a case arrives without anyone having selected firms, and how firms are ordered then. Participating law firms have commercial agreements with ClearCaseIQ for technology and platform services; you never pay us. California residents have specific rights under the CCPA/CPRA, including the right to opt out of the sale or sharing of personal information, described in full below.`,
    content: `
# Privacy Policy

This policy describes how **ClearCaseIQ Corp.**, a technology company with its principal place of business in Los Angeles, California, handles personal information. ClearCaseIQ is not a law firm and does not provide legal advice.

## Information we collect
- Contact and account details you provide (name, email, phone)
- Case information, assessments, and materials you submit or upload
- Technical data (IP, device/browser type, cookies) for security and reliability

## How we use information
- Provide and improve the service
- Communicate with you about your account or case
- Meet legal and security obligations

## Sharing
- With participating law firms, as described in the next section, which also explains the one situation in which the firms are not ones you named
- With service providers under contract who assist our operations
- When required by law or to protect rights and safety

## Sharing your information with law firms

**What is shared.** Your contact details, the case information you provided, and the assessment built from it. Medical records, extracted treatment details, and your medical chronology are shared only if you have separately signed a HIPAA authorization. Without that authorization, a firm sees your non-medical case summary and contact details only.

**When it is shared.** Only after you ask for attorney review and confirm that you want your case sent. Starting an assessment, uploading documents, saving a draft, or reading your own results does not send anything to a law firm.

**With whom.** Only the participating law firms you selected, or firms you separately approved after we proposed them to you. Before sending, you can reorder that list and remove any firm from it. We contact firms one at a time, in the order you set. If the firms you chose cannot take your case, we ask you to approve a new set before contacting anyone else.

**When the firms are not ones you named.** A case can reach the platform without a consumer having selected any firm, for example a case referred to us by a partner, or one released by our team after a manual review. On those paths ClearCaseIQ decides which participating firms are offered the case and in what order, and a firm's commercial arrangement with us can affect that order: a firm with an active subscription may be offered a case before other firms, and a firm's account standing is one input among several. We describe this so that the two paths are not conflated. It does not apply to a case where you chose the firms yourself.

**Why.** So that a firm can review your case and decide whether to offer to represent you. You decide whether to speak with any of them and whether to retain anyone.

**Commercial relationship.** Participating law firms have commercial agreements with ClearCaseIQ for technology and platform services. Those agreements may include payments for technology, marketing, or lead-generation services. What a firm pays is a flat fee per case: the same for every case, regardless of claim type, injury severity, or what the case may be worth, and never a share of any recovery. You never pay ClearCaseIQ to use the platform. Participating does not improve a firm's position in the list you are shown.

**Your control.** We do not disclose your information to participating law firms unless you authorize us to do so. You may decline to send your case, remove firms before sending, or contact any attorney directly outside the platform, whether or not that attorney participates here.

## California privacy rights (CCPA/CPRA)
If you are a California resident, the California Consumer Privacy Act as amended by the California Privacy Rights Act (Civil Code § 1798.100 et seq.) gives you the right to know what personal information we collect and how we use it, to request a copy of it, to correct it, to delete it, to limit our use and disclosure of sensitive personal information, and not to be discriminated against for exercising any of those rights.

**Categories we collect.** Identifiers (name, email, phone), commercial information about your matter, internet activity from your use of the service, geolocation to the level of state and county, and, as sensitive personal information, health information you or your providers give us.

**Right to opt out of sale or sharing.** Sending your case to a participating law firm is a disclosure you authorize, and participating firms pay ClearCaseIQ a flat fee per case. Rather than argue about whether that meets the statutory definition of a "sale," we treat it as a disclosure you can decline and withdraw: you may decline to send your case at all, remove any firm before it is contacted, or withdraw your authorization afterward, at which point we stop contacting firms about your case. You may also opt out in writing at the address below with the subject line "California privacy request."

**Sensitive personal information.** We use health information only to build and evaluate your case and, if you have signed a HIPAA authorization, to share it with the firms you authorized. We do not use it to infer characteristics about you for any other purpose.

**Exercising a right.** We verify your identity before acting on a request about your own information, respond within the time the statute allows, and accept requests from an authorized agent. Exercising these rights does not change the price or quality of anything we provide, because consumers never pay ClearCaseIQ.

The section above describes how information actually moves through the platform, when it moves, and the role your authorization plays, so that you can evaluate those flows directly rather than relying on a summary label.

## Security
We implement administrative, technical, and organizational measures designed to protect personal data, including encryption in transit where appropriate and access controls.

## Retention
We retain information as long as needed to provide the service and comply with law, then delete or de-identify where appropriate.

## Your rights
Depending on your location, you may have rights to access, correct, delete, or export your data, or to opt out of certain processing. Contact us using the details below.

## Contact
For privacy questions, including California privacy rights requests: legal@clearcaseiq.com

## Updates
We may update this policy and will post changes with an updated effective date.
    `.trim(),
  },
  marketing: {
    version: '1.0',
    documentId: 'marketing-v1.0',
    title: 'Marketing communications',
    effectiveDate: '2026-03-01',
    plainLanguageSummary: `If you opt in, we may send newsletters or promotional messages by email or SMS. You can unsubscribe at any time; marketing consent is optional and does not affect your access to core case features.`,
    content: `
# Marketing communications consent

You may receive occasional updates, educational content, or promotional messages about the service and related offerings. You can opt out at any time using links in email, replying STOP to SMS where applicable, or by contacting support.

Partners may receive limited contact information only where you have agreed separately.
    `.trim(),
  },
  // Bumped to 1.1 to force re-consent: the 1.0 text told people the spoken
  // notice at the start of the call gave notice to everyone on the line. The
  // Connect contact flow plays that notice to the claimant's leg only, and
  // before the attorney is transferred in, so the attorney never heard it. In an
  // all-party state that sentence was the whole basis for treating one person's
  // agreement as everyone's, and it was not true.
  call_recording: {
    version: '1.1',
    documentId: 'call-recording-v1.1',
    title: 'Call recording consent',
    effectiveDate: '2026-03-01',
    plainLanguageSummary: `When you connect with your legal team by phone through the platform, the call may be recorded and automatically transcribed so your attorney can capture case details accurately and follow up on what you discussed. You'll also hear a spoken notice at the start of the call. Some states require everyone on a call to agree before it can be recorded; where that applies, we won't place the call until your attorney has agreed too. Recordings and transcripts are treated as confidential case material, are stored securely, and are used only to support your case. You can decline recording. If you do, we won't place the recorded call.`,
    content: `
# Call recording and transcription consent

## What you're agreeing to
When you place or receive a phone call with your legal team through this platform, you consent to that call being **recorded and transcribed**. A spoken notice is played at the start of the call so everyone on the line is aware.

## Why we record
- Accurately capture facts, dates, and details about your case
- Let your attorney and their staff review what was discussed
- Automatically generate a written transcript and summary for your case file
- Reduce the risk of miscommunication

## How recordings are handled
- Recordings and transcripts are confidential case material tied to your matter
- They are stored securely and access is limited to your legal team and platform staff who support your case
- They are retained as long as needed for your case and applicable law, then deleted or de-identified
- They are not sold and are not shared for marketing

## All-party consent states
Some states require **every** person on a call to consent before it can be recorded. If your case is in one of those states, we will not place a recorded call until your attorney has separately agreed to recording as well. Your consent alone is not enough there, and we will tell you if that is why a call cannot be placed.

A spoken notice also plays at the start of the call. Treat it as a reminder, not as a substitute for consent — consent is collected from each party before we dial.

## Your choice
Providing this consent is voluntary. If you decline, we will not place a recorded call. You can still reach your legal team by other means. You may withdraw consent for future calls at any time by contacting your legal team or support.
    `.trim(),
  },
  attorney_share: {
    version: '1.0',
    documentId: 'attorney-share-v1.0',
    title: 'Authorization to share your case with law firms',
    effectiveDate: '2026-07-30',
    plainLanguageSummary: `You decide whether your case is sent to a law firm, and to which firms. This authorization covers only the firms named in it. Nothing is sent until you give it, and you can withdraw it at any time before a firm takes your case. If you do, we stop contacting firms.`,
    content: `
# Authorization to share your case with law firms

I authorize ClearCaseIQ to share my case information with the law firms I selected so that they can review my case and decide whether to offer to represent me.

## What this authorization covers
- **The firms I named.** This authorization applies only to the specific law firms listed with it. It is not permission to send my case to any other firm. If those firms cannot take my case, ClearCaseIQ will ask me to approve a new set before contacting anyone else.
- **My contact details and case information**, including the assessment built from what I provided.
- **Medical records, extracted treatment details, and my medical chronology only if I have separately signed a HIPAA authorization.** Without that authorization, a firm sees my non-medical case summary and contact details only.

## What I understand
- Participating law firms have commercial agreements with ClearCaseIQ and may pay for technology, marketing, or lead-generation services. What a firm pays is a flat fee per case: the same for every case, regardless of claim type, injury severity, or what the case may be worth, and never a share of any recovery. I never pay ClearCaseIQ.
- Paying to participate does not improve a firm's position in the list I was shown, and ClearCaseIQ does not recommend or endorse any attorney.
- ClearCaseIQ is not a law firm and does not provide legal advice. Sending my case does not create an attorney–client relationship. That is formed only if I separately engage an attorney.
- I am free to contact any attorney directly, whether or not they participate on this platform.

## Withdrawing this authorization
I may withdraw this authorization at any time. Withdrawal stops further firms from being contacted about my case. It does not undo a disclosure already made to a firm in reliance on it before I withdrew.
    `.trim(),
  },
  platform_disclosure: {
    version: '1.0',
    documentId: 'platform-disclosure-v1.0',
    title: 'About your assessment',
    effectiveDate: '2026-08-02',
    plainLanguageSummary: `ClearCaseIQ is technology, not a law firm. It organizes what you tell us about your case; it does not give legal advice and is not a substitute for an attorney.`,
    content: `
# About your assessment

ClearCaseIQ is an AI-powered legal technology platform that helps organize your case information. ClearCaseIQ is not a law firm, does not provide legal advice, and does not replace a licensed attorney.

## What this means
- The assessment is built from what you tell us. It is an organized summary, not a legal opinion, and no part of it should be relied on as advice about your rights or deadlines.
- Using this platform does not create an attorney–client relationship. That is formed only if you separately engage an attorney.
- Nothing here guarantees any outcome, and no estimate of a case's strength or value is a prediction of what any case will recover.
- You are free to contact any attorney directly, whether or not they participate on this platform.
    `.trim(),
  },
}

/**
 * The "we are not a law firm" acknowledgement taken at the top of intake.
 *
 * Recorded rather than left in the browser: it is the only point at which a
 * claimant is told this before answering questions, so the acknowledgement has
 * to survive a cleared cache to be worth anything as a record.
 */
export const PLATFORM_DISCLOSURE_CONSENT_TYPE = 'platform_disclosure'

/**
 * Version of the paid-participation disclosure shown on the attorney selection
 * screen, which is the same document the stored authorization points at. Bump the
 * template version when that wording changes so an existing record still says
 * which text the plaintiff actually agreed to.
 */
export const ATTORNEY_PARTICIPATION_DISCLOSURE_VERSION =
  CONSENT_TEMPLATES.attorney_share.version

export function getConsentTemplate(type: string): ConsentTemplateRecord | null {
  return CONSENT_TEMPLATES[type as ConsentTemplateKey] ?? null
}

export function getCurrentVersionsMap(): Record<PlaintiffRequiredConsentType, string> {
  return {
    hipaa: CONSENT_TEMPLATES.hipaa.version,
    terms: CONSENT_TEMPLATES.terms.version,
    privacy: CONSENT_TEMPLATES.privacy.version,
  }
}
