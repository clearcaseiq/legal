/**
 * Case-type intake modules — the "not body-part driven" paths for Step 3.
 *
 * Some claims don't fit a body map. A toxic-exposure claim should lead with
 * "what symptoms developed?", a med-mal claim with "what harm resulted?", and a
 * wrongful-death claim is a different module entirely (the injured person isn't
 * answering symptom questions). Rather than fork the wizard per type, each type
 * declares its own form here and a generic renderer (`CaseTypeIntakePanel`)
 * draws it. Answers are `user_reported` and stored in
 * `injuryDetails.caseTypeDetail`, which rides along in the submitted payload.
 *
 * Keyed by the normalised incident type from `injuryQuestionLibrary`
 * (`normalizeIncidentType`): toxic, medmal, wrongful_death, dog_bite.
 *
 * NOTE: inline-English labels for now; localisation is a later phase.
 */
import { normalizeIncidentType, type OptionItem } from './injuryQuestionLibrary'

export type CaseField =
  | { kind: 'multi'; id: string; label: string; options: OptionItem[]; allowOther?: boolean }
  | { kind: 'single'; id: string; label: string; options: OptionItem[] }
  | { kind: 'yesno'; id: string; label: string }
  | { kind: 'text'; id: string; label: string; placeholder?: string; long?: boolean }
  | { kind: 'date'; id: string; label: string }

export type CaseSection = { id: string; title: string; helper?: string; fields: CaseField[] }

export type CaseTypeModule = {
  /** Whether this module should render before the body map ("lead with"). */
  leadWith: boolean
  title: string
  intro?: string
  sections: CaseSection[]
}

const opt = (id: string, label: string): OptionItem => ({ id, label })

export const CASE_TYPE_MODULES: Record<string, CaseTypeModule> = {
  toxic: {
    leadWith: true,
    title: 'Exposure & symptoms',
    intro: 'For an exposure claim, the health effects matter more than a single body part. Tell us what developed.',
    sections: [
      {
        id: 'symptoms',
        title: 'What symptoms or health problems developed?',
        helper: 'Select all that apply across each category.',
        fields: [
          {
            kind: 'multi',
            id: 'respiratory',
            label: 'Respiratory',
            options: [opt('cough', 'Cough'), opt('shortness_of_breath', 'Shortness of breath'), opt('asthma', 'Asthma'), opt('lung_disease', 'Lung disease')],
          },
          {
            kind: 'multi',
            id: 'neurological',
            label: 'Neurological',
            options: [opt('headaches', 'Headaches'), opt('dizziness', 'Dizziness'), opt('memory_issues', 'Memory issues'), opt('neuropathy', 'Neuropathy')],
          },
          {
            kind: 'multi',
            id: 'skin',
            label: 'Skin',
            options: [opt('rash', 'Rash'), opt('burns', 'Burns'), opt('irritation', 'Irritation')],
          },
          {
            kind: 'multi',
            id: 'gi',
            label: 'Gastrointestinal',
            options: [opt('nausea', 'Nausea'), opt('vomiting', 'Vomiting'), opt('abdominal', 'Abdominal symptoms')],
          },
          {
            kind: 'multi',
            id: 'other_effects',
            label: 'Other',
            options: [opt('cancer_diagnosis', 'Cancer diagnosis'), opt('organ_damage', 'Organ damage')],
            allowOther: true,
          },
        ],
      },
      {
        id: 'exposure',
        title: 'About the exposure',
        fields: [
          { kind: 'text', id: 'substance', label: 'What substance were you exposed to?', placeholder: 'e.g. asbestos, mold, a chemical' },
          {
            kind: 'single',
            id: 'duration',
            label: 'How long were you exposed?',
            options: [opt('days', 'Days'), opt('weeks', 'Weeks'), opt('months', 'Months'), opt('years', 'Years'), opt('ongoing', 'Still ongoing'), opt('not_sure', 'Not sure')],
          },
          { kind: 'yesno', id: 'doctor_linked', label: 'Has a doctor linked your condition to the exposure?' },
          { kind: 'yesno', id: 'testing_done', label: 'Has any testing been performed (blood, imaging, air/sample)?' },
        ],
      },
    ],
  },

  medmal: {
    leadWith: true,
    title: 'What went wrong',
    intro: "For a medical claim we start with the harm, then the body systems affected — not a crash-style body map.",
    sections: [
      {
        id: 'harm',
        title: 'What harm resulted?',
        helper: 'Select all that apply.',
        fields: [
          {
            kind: 'multi',
            id: 'harm_types',
            label: 'Harm',
            options: [
              opt('additional_surgery', 'Additional surgery'),
              opt('infection', 'Infection'),
              opt('delayed_recovery', 'Delayed recovery'),
              opt('permanent_impairment', 'Permanent impairment'),
              opt('neurological_injury', 'Neurological injury'),
              opt('birth_injury', 'Birth injury'),
              opt('organ_damage', 'Organ damage'),
              opt('medication_injury', 'Medication injury'),
              opt('death', 'Death'),
            ],
            allowOther: true,
          },
        ],
      },
      {
        id: 'systems',
        title: 'Which body systems were affected?',
        fields: [
          {
            kind: 'multi',
            id: 'affected_systems',
            label: 'Body systems',
            options: [
              opt('brain_nervous', 'Brain / nervous system'),
              opt('heart_circulatory', 'Heart / circulatory'),
              opt('lungs_respiratory', 'Lungs / respiratory'),
              opt('digestive', 'Digestive'),
              opt('musculoskeletal', 'Muscles / bones / joints'),
              opt('reproductive', 'Reproductive'),
            ],
            allowOther: true,
          },
          { kind: 'text', id: 'what_happened', label: 'Briefly, what happened?', long: true, placeholder: 'In your own words' },
        ],
      },
    ],
  },

  wrongful_death: {
    leadWith: true,
    title: 'About your loved one',
    intro: "We're sorry for your loss. A few details help us evaluate the claim; financial questions come later.",
    sections: [
      {
        id: 'decedent',
        title: 'The person who passed away',
        fields: [
          { kind: 'text', id: 'decedent_name', label: 'Their name' },
          { kind: 'date', id: 'date_of_death', label: 'Date of death' },
          {
            kind: 'single',
            id: 'relationship',
            label: 'Your relationship to them',
            options: [opt('spouse', 'Spouse / partner'), opt('child', 'Child'), opt('parent', 'Parent'), opt('sibling', 'Sibling'), opt('other', 'Other')],
          },
          { kind: 'text', id: 'cause_of_death', label: 'Cause of death (if known)', placeholder: 'e.g. injuries from the crash' },
        ],
      },
      {
        id: 'care',
        title: 'Care before passing',
        fields: [
          { kind: 'yesno', id: 'treated_before_death', label: 'Did they receive medical treatment before passing?' },
          {
            kind: 'single',
            id: 'dependents',
            label: 'Did they have dependents?',
            options: [opt('yes', 'Yes'), opt('no', 'No'), opt('not_sure', 'Not sure')],
          },
        ],
      },
    ],
  },

  dog_bite: {
    // Dog-bite claims DO have a body location, so this augments the body map
    // rather than leading; it captures the bite-specific detail attorneys need.
    leadWith: false,
    title: 'Bite details',
    sections: [
      {
        id: 'bite',
        title: 'About the bite',
        fields: [
          { kind: 'text', id: 'bite_location', label: 'Where on your body were you bitten?', placeholder: 'e.g. right forearm, left calf' },
          { kind: 'yesno', id: 'skin_broken', label: 'Was the skin broken?' },
          { kind: 'yesno', id: 'puncture_wounds', label: 'Were there puncture wounds?' },
          { kind: 'yesno', id: 'stitches', label: 'Did it require stitches?' },
          { kind: 'yesno', id: 'infection', label: 'Was there an infection?' },
          { kind: 'yesno', id: 'nerve_damage', label: 'Any nerve damage?' },
          { kind: 'yesno', id: 'scarring', label: 'Is there scarring?' },
          { kind: 'yesno', id: 'plastic_surgery_rec', label: 'Was plastic surgery recommended?' },
          { kind: 'yesno', id: 'psychological', label: 'Fear or anxiety since the attack?' },
        ],
      },
    ],
  },
}

/** The case-type module for the current incident type, or null. */
export function caseTypeModuleFor(injuryType: string | undefined | null): CaseTypeModule | null {
  return CASE_TYPE_MODULES[normalizeIncidentType(injuryType)] || null
}
