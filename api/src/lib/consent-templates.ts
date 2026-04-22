/**
 * Single source of truth for consent/legal document text served to plaintiffs
 * (modal + public pages). Bump version when content changes to trigger re-consent.
 */

export type ConsentTemplateKey = 'hipaa' | 'terms' | 'privacy' | 'marketing'

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

export const CONSENT_TEMPLATES: Record<ConsentTemplateKey, ConsentTemplateRecord> = {
  hipaa: {
    version: '1.0',
    documentId: 'hipaa-v1.0',
    title: 'HIPAA authorization',
    effectiveDate: '2026-03-01',
    plainLanguageSummary: `This authorization lets us request, use, and share health information that is relevant to your injury case—typically with your lawyers, providers, insurers, and others involved in evaluating or pursuing your claim. You can revoke it in writing; it lasts until you revoke it, your case ends, or the expiration in the full document—whichever comes first. Signing is voluntary and is not a condition of receiving medical treatment or benefits.`,
    content: `
# HIPAA authorization

## Authorization for use and disclosure of protected health information

I authorize ClearCaseIQ / Injury Intelligence and legal professionals I choose to work with to use and disclose my protected health information (PHI) as described below.

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
This authorization remains valid until my case is resolved, I revoke it in writing, or two (2) years from the date of signature, whichever occurs first—unless a shorter period is required by law.

### Right to revoke
I may revoke this authorization in writing. Revocation does not undo actions already taken in good faith before revocation.

### Acknowledgment
I have had the opportunity to read this authorization. Information disclosed may be redisclosed by a recipient and may no longer be protected by HIPAA. I understand I may refuse to sign; refusal does not bar treatment, payment, enrollment, or eligibility for benefits solely on that basis, as described in applicable law.
    `.trim(),
  },
  terms: {
    version: '1.0',
    documentId: 'terms-v1.0',
    title: 'Terms of Service',
    effectiveDate: '2026-03-01',
    plainLanguageSummary: `These Terms are the rules for using the platform: you’ll provide accurate information, use the service lawfully, and keep your login private. The platform helps with intake and connections—it is not your own lawyer and does not guarantee outcomes. Liability limits and governing law apply as described in the full Terms.`,
    content: `
# Terms of Service

## Agreement
By using this service, you agree to these Terms. If you do not agree, do not use the service.

## Description of service
This legal technology platform may provide case intake, assessment tools, attorney matching or introductions, document or evidence organization, and communications between you and professionals you engage. Features vary by product configuration.

## Your responsibilities
- Provide accurate information to the best of your knowledge
- Keep your account credentials confidential
- Use the service only for lawful purposes
- Not interfere with security or availability of the service

## Not legal advice; no attorney–client relationship
Using the platform does not create an attorney–client relationship with the platform operator. A relationship is formed only with an attorney you separately engage.

## Disclaimers and limitation of liability
The service is provided “as available.” To the maximum extent permitted by law, the operator is not liable for indirect or consequential damages arising from use of the service.

## Changes
We may update these Terms. Material changes may be communicated through the service. Continued use after changes may constitute acceptance.

## Governing law
These Terms are governed by applicable law in the jurisdiction specified in your agreement with us, or where none is specified, the laws of the state in which the operator principally provides the service.
    `.trim(),
  },
  privacy: {
    version: '1.0',
    documentId: 'privacy-v1.0',
    title: 'Privacy Policy',
    effectiveDate: '2026-03-01',
    plainLanguageSummary: `We collect what you give us (contact, case details, files you upload) and some technical data to run and secure the service. We use it to deliver features you request. We do not sell your personal information. Sharing with attorneys or vendors happens only as described here and to operate the service, or when required by law. You may have rights to access, correct, or delete data depending on where you live.`,
    content: `
# Privacy Policy

## Information we collect
- Contact and account details you provide (name, email, phone)
- Case information, assessments, and materials you submit or upload
- Technical data (IP, device/browser type, cookies) for security and reliability

## How we use information
- Provide and improve the service
- Communicate with you about your account or case
- Meet legal and security obligations

## Sharing
- With attorneys and professionals you choose to involve
- With service providers under contract who assist our operations
- When required by law or to protect rights and safety

## Security
We implement administrative, technical, and organizational measures designed to protect personal data, including encryption in transit where appropriate and access controls.

## Retention
We retain information as long as needed to provide the service and comply with law, then delete or de-identify where appropriate.

## Your rights
Depending on your location, you may have rights to access, correct, delete, or export your data, or to opt out of certain processing. Contact us using the details below.

## Contact
For privacy questions: privacy@injuryintelligence.com (placeholder—update before production).

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
}

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
