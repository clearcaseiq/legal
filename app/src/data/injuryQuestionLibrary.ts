/**
 * Injury question library — the "rules engine as data" behind Step 3.
 *
 * Intake Step 3 is not a fixed questionnaire. Which symptoms, findings, and
 * treatments a claimant is asked about should change with:
 *
 *     incidentType  ×  bodyRegion  ×  prior answers
 *
 * so a head injury from an auto crash asks about airbags and loss of
 * consciousness, while a back injury asks about radiating leg pain and disc
 * findings. Rather than hardcode every combination into the UI (the old
 * approach: three bespoke head/shoulder/back blocks), this module expresses the
 * questions declaratively. The UI (`DynamicInjuryCards`) is generic and simply
 * renders whatever the library returns for the current selections, so new
 * regions/rules can be added here without touching the wizard.
 *
 * Provenance: everything captured here is `user_reported`. The AI document
 * pipeline later confirms/overrides these from actual medical records
 * (`medical_record`), so downstream valuation can weight documented findings
 * above self-reported ones. See `InjurySource`.
 *
 * NOTE: labels are inline English for now. Localisation of this content is a
 * follow-up phase; the existing i18n option lists elsewhere are untouched.
 */

export type InjurySource = 'user_reported' | 'medical_record' | 'provider_reported' | 'ai_extracted'

export type Side = 'left' | 'right' | 'both'

export type OptionItem = { id: string; label: string }

/** One conditional follow-up question layered on top of a region by incident type. */
export type OverlayQuestion = {
  id: string
  label: string
  /** yesno renders a two-button toggle; text reveals a short free-text field when the paired yesno is "yes". */
  type: 'yesno' | 'text'
  /** For a text follow-up, the id of the yesno question that must be "yes" to reveal it. */
  showIfYes?: string
}

export type RegionConfig = {
  id: string
  label: string
  /** Whether to ask which side (left/right/both). Omitted for midline regions (neck, back, head, hip). */
  side?: boolean
  symptoms: OptionItem[]
  /** Findings / diagnoses the claimant may have been told about. */
  findings: OptionItem[]
  /** Treatments prioritised for this region (a subset/reorder of the master taxonomy). */
  treatments: OptionItem[]
}

// --- Shared option pools ----------------------------------------------------
// Treatment ids reuse the canonical treatment vocabulary so region cards and
// the master treatment list speak the same language.
const TX = {
  pt: { id: 'pt', label: 'Physical therapy' },
  chiro: { id: 'chiropractic', label: 'Chiropractic' },
  pain: { id: 'pain_management', label: 'Pain management' },
  injection: { id: 'injection', label: 'Injection' },
  mri: { id: 'mri', label: 'MRI' },
  ct: { id: 'ct', label: 'CT scan' },
  xray: { id: 'xray', label: 'X-ray' },
  ortho: { id: 'orthopedist', label: 'Orthopedic specialist' },
  neuro: { id: 'neurologist', label: 'Neurologist' },
  specialist: { id: 'specialist', label: 'Specialist' },
  brace: { id: 'brace', label: 'Brace / splint' },
  other_tx: { id: 'other_tx', label: 'Other treatment' },
  surgery: { id: 'surgery', label: 'Surgery' },
  arthroscopy: { id: 'arthroscopy', label: 'Arthroscopy' },
  stitches: { id: 'stitches', label: 'Stitches / wound care' },
  skin_graft: { id: 'skin_graft', label: 'Skin graft' },
  plastic_surgery: { id: 'plastic_surgery', label: 'Plastic surgery' },
  dental: { id: 'dental', label: 'Dental treatment' },
  therapy: { id: 'therapy', label: 'Therapy / counseling' },
  psychiatry: { id: 'psychiatry', label: 'Psychiatry' },
  medication: { id: 'medication', label: 'Medication' },
} as const

/**
 * Region library keyed by the body-part values the wizard already uses
 * (`BODY_PART_OPTION_DEFS`): neck, lower_back, shoulder, knee, head_concussion,
 * hand_wrist, hip, other. Keeping the same keys means the expanded question set
 * layers on top of the existing body-part picker with no migration.
 */
export const REGION_LIBRARY: Record<string, RegionConfig> = {
  neck: {
    id: 'neck',
    label: 'Neck',
    symptoms: [
      { id: 'neck_pain', label: 'Neck pain' },
      { id: 'stiffness', label: 'Stiffness' },
      { id: 'limited_rom', label: 'Limited range of motion' },
      { id: 'radiating_arm', label: 'Pain into shoulder/arm' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
      { id: 'weakness', label: 'Weakness' },
    ],
    findings: [
      { id: 'cervical_strain', label: 'Cervical strain' },
      { id: 'disc_bulge', label: 'Disc bulge' },
      { id: 'disc_protrusion', label: 'Disc protrusion' },
      { id: 'herniation', label: 'Herniation' },
      { id: 'radiculopathy', label: 'Radiculopathy' },
    ],
    treatments: [TX.pt, TX.chiro, TX.pain, TX.injection, TX.mri, TX.surgery],
  },
  lower_back: {
    id: 'lower_back',
    label: 'Back',
    symptoms: [
      { id: 'back_pain', label: 'Pain' },
      { id: 'spasm', label: 'Spasm' },
      { id: 'limited_rom', label: 'Limited movement' },
      { id: 'radiating_leg', label: 'Radiating leg pain' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
      { id: 'weakness', label: 'Weakness' },
    ],
    findings: [
      { id: 'strain_sprain', label: 'Strain / sprain' },
      { id: 'disc_bulge', label: 'Disc bulge' },
      { id: 'disc_protrusion', label: 'Disc protrusion' },
      { id: 'herniation', label: 'Herniation' },
      { id: 'radiculopathy', label: 'Radiculopathy' },
      { id: 'sciatica', label: 'Sciatica' },
      { id: 'fracture', label: 'Fracture' },
    ],
    treatments: [TX.pt, TX.chiro, TX.mri, TX.injection, TX.specialist, TX.surgery],
  },
  shoulder: {
    id: 'shoulder',
    label: 'Shoulder',
    side: true,
    symptoms: [
      { id: 'pain_lifting', label: 'Pain lifting arm' },
      { id: 'overhead_pain', label: 'Overhead pain' },
      { id: 'limited_rom', label: 'Limited range of motion' },
      { id: 'weakness', label: 'Weakness' },
      { id: 'night_pain', label: 'Night pain' },
    ],
    findings: [
      { id: 'sprain', label: 'Sprain' },
      { id: 'rotator_cuff_tendinopathy', label: 'Rotator cuff tendinopathy' },
      { id: 'rotator_cuff_tear', label: 'Rotator cuff tear' },
      { id: 'labral_tear', label: 'Labral tear' },
      { id: 'impingement', label: 'Impingement' },
      { id: 'ac_joint', label: 'AC joint injury' },
      { id: 'fracture_dislocation', label: 'Fracture / dislocation' },
    ],
    treatments: [TX.pt, TX.injection, TX.mri, TX.specialist, TX.arthroscopy, TX.surgery],
  },
  knee: {
    id: 'knee',
    label: 'Knee',
    side: true,
    symptoms: [
      { id: 'swelling', label: 'Swelling' },
      { id: 'instability', label: 'Instability' },
      { id: 'difficulty_walking', label: 'Difficulty walking' },
      { id: 'difficulty_stairs', label: 'Difficulty with stairs' },
      { id: 'locking_catching', label: 'Locking / catching' },
    ],
    findings: [
      { id: 'sprain', label: 'Sprain' },
      { id: 'meniscus_tear', label: 'Meniscus tear' },
      { id: 'acl_pcl_mcl', label: 'ACL / PCL / MCL injury' },
      { id: 'fracture', label: 'Fracture' },
      { id: 'patellar', label: 'Patellar injury' },
    ],
    treatments: [TX.brace, TX.pt, TX.injection, TX.arthroscopy, TX.surgery],
  },
  head_concussion: {
    id: 'head_concussion',
    label: 'Head / Brain',
    symptoms: [
      { id: 'loss_of_consciousness', label: 'Loss of consciousness' },
      { id: 'memory_loss', label: 'Memory loss' },
      { id: 'confusion', label: 'Confusion' },
      { id: 'dizziness', label: 'Dizziness' },
      { id: 'headaches', label: 'Headaches' },
      { id: 'nausea_vomiting', label: 'Nausea / vomiting' },
      { id: 'light_sensitivity', label: 'Light sensitivity' },
      { id: 'noise_sensitivity', label: 'Noise sensitivity' },
      { id: 'balance_problems', label: 'Balance problems' },
      { id: 'difficulty_concentrating', label: 'Difficulty concentrating' },
      { id: 'sleep_changes', label: 'Sleep changes' },
      // Red-flag trigger (see RED_FLAG_RULES).
      { id: 'worsening_headache', label: 'Worsening headache' },
    ],
    findings: [
      { id: 'concussion', label: 'Concussion' },
      { id: 'tbi', label: 'Traumatic brain injury' },
      { id: 'post_concussion', label: 'Post-concussion syndrome' },
      { id: 'facial_fracture', label: 'Facial fracture' },
    ],
    treatments: [TX.specialist, TX.pt, TX.pain, TX.surgery],
  },
  hand_wrist: {
    id: 'hand_wrist',
    label: 'Hand / Wrist',
    side: true,
    symptoms: [
      { id: 'grip_weakness', label: 'Grip weakness' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
      { id: 'limited_rom', label: 'Reduced movement' },
      { id: 'difficulty_typing', label: 'Difficulty typing / writing' },
    ],
    findings: [
      { id: 'sprain', label: 'Sprain' },
      { id: 'fracture', label: 'Fracture' },
      { id: 'tendon_injury', label: 'Tendon injury' },
      { id: 'nerve_injury', label: 'Nerve injury' },
      { id: 'carpal_tunnel', label: 'Carpal tunnel' },
      { id: 'laceration', label: 'Laceration' },
    ],
    treatments: [TX.brace, TX.pt, TX.injection, TX.specialist, TX.surgery],
  },
  hip: {
    id: 'hip',
    label: 'Hip / Leg / Foot',
    side: true,
    symptoms: [
      { id: 'difficulty_walking', label: 'Walking difficulty' },
      { id: 'weight_bearing', label: 'Trouble bearing weight' },
      { id: 'assistive_device', label: 'Using an assistive device' },
      { id: 'mobility_limited', label: 'Mobility limitations' },
      { id: 'pain', label: 'Pain' },
    ],
    findings: [
      { id: 'strain_sprain', label: 'Strain / sprain' },
      { id: 'fracture', label: 'Fracture' },
      { id: 'labral_tear', label: 'Labral tear' },
      { id: 'dislocation', label: 'Dislocation' },
    ],
    treatments: [TX.brace, TX.pt, TX.injection, TX.specialist, TX.surgery],
  },
  upper_back: {
    id: 'upper_back',
    label: 'Upper back',
    symptoms: [
      { id: 'back_pain', label: 'Pain' },
      { id: 'spasm', label: 'Spasm' },
      { id: 'stiffness', label: 'Stiffness' },
      { id: 'limited_rom', label: 'Limited movement' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
      { id: 'weakness', label: 'Weakness' },
    ],
    findings: [
      { id: 'strain_sprain', label: 'Strain / sprain' },
      { id: 'disc_bulge', label: 'Disc bulge' },
      { id: 'disc_protrusion', label: 'Disc protrusion' },
      { id: 'herniation', label: 'Herniation' },
      { id: 'fracture', label: 'Fracture' },
    ],
    treatments: [TX.pt, TX.chiro, TX.mri, TX.injection, TX.specialist, TX.surgery],
  },
  arm_elbow: {
    id: 'arm_elbow',
    label: 'Arm / Elbow',
    side: true,
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'limited_rom', label: 'Limited range of motion' },
      { id: 'weakness', label: 'Weakness' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
      { id: 'swelling', label: 'Swelling' },
    ],
    findings: [
      { id: 'strain_sprain', label: 'Strain / sprain' },
      { id: 'fracture', label: 'Fracture' },
      { id: 'tendon_injury', label: 'Tendon injury' },
      { id: 'nerve_injury', label: 'Nerve injury' },
      { id: 'dislocation', label: 'Dislocation' },
    ],
    treatments: [TX.brace, TX.pt, TX.injection, TX.specialist, TX.surgery],
  },
  leg: {
    id: 'leg',
    label: 'Leg (thigh / shin)',
    side: true,
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'difficulty_walking', label: 'Difficulty walking' },
      { id: 'weight_bearing', label: 'Trouble bearing weight' },
      { id: 'swelling', label: 'Swelling' },
      { id: 'weakness', label: 'Weakness' },
    ],
    findings: [
      { id: 'strain_sprain', label: 'Strain / sprain' },
      { id: 'fracture', label: 'Fracture' },
      { id: 'tear', label: 'Muscle / tendon tear' },
      { id: 'nerve_injury', label: 'Nerve injury' },
    ],
    treatments: [TX.brace, TX.pt, TX.injection, TX.specialist, TX.surgery],
  },
  ankle_foot: {
    id: 'ankle_foot',
    label: 'Ankle / Foot',
    side: true,
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'swelling', label: 'Swelling' },
      { id: 'difficulty_walking', label: 'Difficulty walking' },
      { id: 'weight_bearing', label: 'Trouble bearing weight' },
      { id: 'instability', label: 'Instability' },
    ],
    findings: [
      { id: 'sprain', label: 'Sprain' },
      { id: 'fracture', label: 'Fracture' },
      { id: 'tendon_injury', label: 'Tendon injury' },
      { id: 'ligament_tear', label: 'Ligament tear' },
    ],
    treatments: [TX.brace, TX.pt, TX.injection, TX.specialist, TX.surgery],
  },
  face: {
    id: 'face',
    label: 'Face',
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'swelling', label: 'Swelling' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
      { id: 'difficulty_chewing', label: 'Difficulty chewing' },
      { id: 'scarring', label: 'Scarring' },
    ],
    findings: [
      { id: 'facial_fracture', label: 'Facial fracture' },
      { id: 'laceration', label: 'Laceration' },
      { id: 'dental_injury', label: 'Dental injury' },
      { id: 'nerve_injury', label: 'Nerve injury' },
    ],
    treatments: [TX.specialist, TX.surgery, TX.dental, TX.plastic_surgery],
  },
  vision: {
    id: 'vision',
    label: 'Vision / Eye',
    symptoms: [
      { id: 'blurred_vision', label: 'Blurred vision' },
      { id: 'vision_loss', label: 'Vision loss' },
      { id: 'double_vision', label: 'Double vision' },
      { id: 'light_sensitivity', label: 'Light sensitivity' },
      { id: 'eye_pain', label: 'Eye pain' },
    ],
    findings: [
      { id: 'eye_injury', label: 'Eye injury' },
      { id: 'retinal_injury', label: 'Retinal injury' },
      { id: 'orbital_fracture', label: 'Orbital fracture' },
    ],
    treatments: [TX.specialist, TX.surgery],
  },
  hearing: {
    id: 'hearing',
    label: 'Hearing / Ear',
    symptoms: [
      { id: 'hearing_loss', label: 'Hearing loss' },
      { id: 'tinnitus', label: 'Ringing (tinnitus)' },
      { id: 'ear_pain', label: 'Ear pain' },
      { id: 'balance_problems', label: 'Balance problems' },
      { id: 'dizziness', label: 'Dizziness' },
    ],
    findings: [
      { id: 'eardrum_injury', label: 'Eardrum injury' },
      { id: 'hearing_loss_dx', label: 'Diagnosed hearing loss' },
    ],
    treatments: [TX.specialist, TX.surgery],
  },
  chest_ribs: {
    id: 'chest_ribs',
    label: 'Chest / Ribs',
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'pain_breathing', label: 'Pain when breathing' },
      { id: 'difficulty_breathing', label: 'Difficulty breathing' },
      { id: 'bruising', label: 'Bruising' },
      { id: 'tenderness', label: 'Tenderness' },
    ],
    findings: [
      { id: 'rib_fracture', label: 'Rib fracture' },
      { id: 'sternum_fracture', label: 'Sternum fracture' },
      { id: 'contusion', label: 'Contusion' },
      { id: 'punctured_lung', label: 'Punctured lung' },
    ],
    treatments: [TX.pain, TX.specialist, TX.surgery],
  },
  abdomen: {
    id: 'abdomen',
    label: 'Abdomen',
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'tenderness', label: 'Tenderness' },
      { id: 'bruising', label: 'Bruising' },
      { id: 'nausea_vomiting', label: 'Nausea / vomiting' },
      { id: 'swelling', label: 'Swelling' },
    ],
    findings: [
      { id: 'contusion', label: 'Contusion' },
      { id: 'internal_injury', label: 'Internal injury' },
      { id: 'hernia', label: 'Hernia' },
    ],
    treatments: [TX.specialist, TX.surgery],
  },
  internal_organs: {
    id: 'internal_organs',
    label: 'Internal organs',
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'nausea_vomiting', label: 'Nausea / vomiting' },
      { id: 'fatigue', label: 'Fatigue' },
      { id: 'internal_bleeding_signs', label: 'Signs of internal bleeding' },
    ],
    findings: [
      { id: 'organ_damage', label: 'Organ damage' },
      { id: 'internal_bleeding', label: 'Internal bleeding' },
    ],
    treatments: [TX.specialist, TX.surgery],
  },
  burns: {
    id: 'burns',
    label: 'Burns',
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'blistering', label: 'Blistering' },
      { id: 'swelling', label: 'Swelling' },
      { id: 'scarring', label: 'Scarring' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
    ],
    findings: [
      { id: 'first_degree', label: 'First-degree' },
      { id: 'second_degree', label: 'Second-degree' },
      { id: 'third_degree', label: 'Third-degree' },
      { id: 'infection', label: 'Infection' },
    ],
    treatments: [TX.specialist, TX.skin_graft, TX.plastic_surgery, TX.surgery],
  },
  lacerations: {
    id: 'lacerations',
    label: 'Lacerations / Cuts',
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'bleeding', label: 'Bleeding' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
      { id: 'scarring', label: 'Scarring' },
    ],
    findings: [
      { id: 'laceration', label: 'Laceration' },
      { id: 'stitches_required', label: 'Required stitches' },
      { id: 'infection', label: 'Infection' },
      { id: 'nerve_injury', label: 'Nerve injury' },
    ],
    treatments: [TX.stitches, TX.specialist, TX.plastic_surgery, TX.surgery],
  },
  scarring: {
    id: 'scarring',
    label: 'Scarring / Disfigurement',
    symptoms: [
      { id: 'visible_scar', label: 'Visible scar' },
      { id: 'discoloration', label: 'Discoloration' },
      { id: 'tightness', label: 'Tightness' },
      { id: 'sensitivity', label: 'Sensitivity' },
    ],
    findings: [
      { id: 'permanent_scarring', label: 'Permanent scarring' },
      { id: 'keloid', label: 'Keloid' },
    ],
    treatments: [TX.specialist, TX.plastic_surgery],
  },
  bite_wounds: {
    id: 'bite_wounds',
    label: 'Bite wounds',
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'puncture_wounds', label: 'Puncture wounds' },
      { id: 'bleeding', label: 'Bleeding' },
      { id: 'swelling', label: 'Swelling' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
    ],
    findings: [
      { id: 'skin_broken', label: 'Skin broken' },
      { id: 'infection', label: 'Infection' },
      { id: 'nerve_damage', label: 'Nerve damage' },
      { id: 'scarring', label: 'Scarring' },
    ],
    treatments: [TX.stitches, TX.specialist, TX.plastic_surgery, TX.surgery],
  },
  psychological: {
    id: 'psychological',
    label: 'Emotional / Psychological',
    symptoms: [
      { id: 'anxiety', label: 'Anxiety' },
      { id: 'depression', label: 'Depression' },
      { id: 'ptsd_symptoms', label: 'PTSD symptoms / flashbacks' },
      { id: 'sleep_disturbance', label: 'Sleep disturbance' },
      { id: 'fear', label: 'Fear / avoidance' },
      { id: 'panic', label: 'Panic attacks' },
    ],
    findings: [
      { id: 'anxiety_dx', label: 'Anxiety' },
      { id: 'ptsd_dx', label: 'PTSD' },
      { id: 'depression_dx', label: 'Depression' },
      { id: 'sleep_disorder', label: 'Sleep disorder' },
    ],
    treatments: [TX.therapy, TX.psychiatry, TX.medication],
  },
  other: {
    id: 'other',
    label: 'Other injury',
    symptoms: [
      { id: 'pain', label: 'Pain' },
      { id: 'stiffness', label: 'Stiffness' },
      { id: 'limited_rom', label: 'Limited movement' },
      { id: 'numbness_tingling', label: 'Numbness / tingling' },
      { id: 'weakness', label: 'Weakness' },
      { id: 'swelling', label: 'Swelling' },
    ],
    findings: [
      { id: 'strain_sprain', label: 'Strain / sprain' },
      { id: 'tear', label: 'Tear' },
      { id: 'fracture', label: 'Fracture' },
      { id: 'other_diagnosis', label: 'Other diagnosis' },
    ],
    treatments: [TX.pt, TX.injection, TX.specialist, TX.surgery],
  },
}

// Broaden the detailed treatment list to match the intake spec: imaging (X-ray,
// CT) and the relevant specialist are offered on the common musculoskeletal and
// neurological regions, and "Other treatment" is available everywhere. The
// region-specific ordering above is preserved; these are appended only if the
// region doesn't already list them.
{
  const MSK_REGIONS = ['neck', 'upper_back', 'lower_back', 'shoulder', 'arm_elbow', 'hand_wrist', 'hip', 'knee', 'leg', 'ankle_foot']
  const NEURO_REGIONS = ['head_concussion', 'face', 'vision', 'hearing']
  for (const [key, cfg] of Object.entries(REGION_LIBRARY)) {
    const additions: OptionItem[] = []
    if (MSK_REGIONS.includes(key)) additions.push(TX.xray, TX.ct, TX.ortho)
    if (NEURO_REGIONS.includes(key)) additions.push(TX.ct, TX.neuro)
    additions.push(TX.other_tx)
    const seen = new Set(cfg.treatments.map((t) => t.id))
    for (const t of additions) {
      if (!seen.has(t.id)) {
        cfg.treatments.push(t)
        seen.add(t.id)
      }
    }
  }
}

// --- Grouped body-region map (progressive disclosure) ----------------------
// The picker shows a small "common for your situation" row first, then the full
// grouped catalog behind a "more areas" expander. Groups float up when they
// contain regions relevant to the incident type.
export type RegionGroup = { id: string; label: string; regions: string[] }

export const BODY_REGION_CATALOG: RegionGroup[] = [
  {
    id: 'musculoskeletal',
    label: 'Musculoskeletal',
    regions: ['neck', 'upper_back', 'lower_back', 'shoulder', 'arm_elbow', 'hand_wrist', 'hip', 'knee', 'leg', 'ankle_foot'],
  },
  { id: 'head_neuro', label: 'Head & neurological', regions: ['head_concussion', 'face', 'vision', 'hearing'] },
  { id: 'internal', label: 'Internal & thoracic', regions: ['chest_ribs', 'abdomen', 'internal_organs'] },
  { id: 'skin', label: 'Skin & soft tissue', regions: ['burns', 'lacerations', 'scarring', 'bite_wounds'] },
  { id: 'psychological', label: 'Psychological', regions: ['psychological'] },
  { id: 'other', label: 'Other', regions: ['other'] },
]

/** Region ids to surface first, by incident type. */
const COMMON_REGIONS: Record<string, string[]> = {
  auto: ['neck', 'lower_back', 'upper_back', 'shoulder', 'knee', 'head_concussion', 'hand_wrist'],
  slip_fall: ['lower_back', 'hip', 'knee', 'shoulder', 'hand_wrist', 'ankle_foot', 'head_concussion'],
  assault: ['head_concussion', 'face', 'lacerations', 'arm_elbow', 'chest_ribs', 'psychological'],
  dog_bite: ['bite_wounds', 'lacerations', 'scarring', 'hand_wrist', 'arm_elbow', 'leg', 'psychological'],
  toxic: ['chest_ribs', 'head_concussion', 'burns', 'abdomen', 'psychological'],
  medmal: ['abdomen', 'internal_organs', 'head_concussion', 'psychological'],
  other: ['neck', 'lower_back', 'shoulder', 'knee', 'head_concussion', 'hand_wrist'],
}

/** The prioritized "common" regions for the current incident type. */
export function commonRegionsForIncident(injuryType: string | undefined | null): string[] {
  const key = normalizeIncidentType(injuryType)
  return (COMMON_REGIONS[key] || COMMON_REGIONS.other).filter((r) => REGION_LIBRARY[r])
}

/**
 * Catalog groups reordered so the groups most relevant to the incident type
 * (those containing more "common" regions) appear first — e.g. skin & soft
 * tissue floats up for dog bites, head & neurological for assault.
 */
export function orderedRegionGroups(injuryType: string | undefined | null): RegionGroup[] {
  const common = new Set(commonRegionsForIncident(injuryType))
  return [...BODY_REGION_CATALOG]
    .map((g, i) => ({ g, i, score: g.regions.filter((r) => common.has(r)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.g)
}

/** Human label for any region id (existing or expanded). */
export function regionLabel(id: string): string {
  return REGION_LIBRARY[id]?.label || id
}

/** value/label list for every region — used to resolve labels in summaries. */
export const ALL_REGION_OPTIONS: OptionItem[] = Object.values(REGION_LIBRARY).map((r) => ({ id: r.id, label: r.label }))

/**
 * Incident-type overlays. The SAME body part asks different questions depending
 * on how the injury happened (e.g. a head injury after an auto crash vs a
 * fall). Keyed by normalised incident type (see `normalizeIncidentType`) then
 * by region id.
 */
export const INCIDENT_REGION_OVERLAYS: Record<string, Record<string, OverlayQuestion[]>> = {
  auto: {
    head_concussion: [
      { id: 'head_strike', label: 'Did your head strike anything?', type: 'yesno' },
      { id: 'airbag_deploy', label: 'Did an airbag deploy?', type: 'yesno' },
      { id: 'loss_of_consciousness', label: 'Did you lose consciousness?', type: 'yesno' },
      { id: 'loc_duration', label: 'Approximately how long were you unconscious?', type: 'text', showIfYes: 'loss_of_consciousness' },
      { id: 'memory_gap', label: 'Any gap in your memory of the crash?', type: 'yesno' },
      { id: 'concussion_dx', label: 'Were you diagnosed with a concussion?', type: 'yesno' },
    ],
  },
  slip_fall: {
    head_concussion: [
      { id: 'head_hit_ground', label: 'Did your head hit the ground or an object?', type: 'yesno' },
      { id: 'loss_of_consciousness', label: 'Did you lose consciousness?', type: 'yesno' },
      { id: 'loc_duration', label: 'Approximately how long?', type: 'text', showIfYes: 'loss_of_consciousness' },
      { id: 'witnessed', label: 'Did anyone witness the fall?', type: 'yesno' },
      { id: 'ambulance', label: 'Was an ambulance called?', type: 'yesno' },
      { id: 'ct_scan', label: 'Did you have a CT scan?', type: 'yesno' },
    ],
  },
  assault: {
    head_concussion: [
      { id: 'struck_with_object', label: 'Were you struck with an object?', type: 'yesno' },
      { id: 'repeated_blows', label: 'Were there repeated blows?', type: 'yesno' },
      { id: 'loss_of_consciousness', label: 'Did you lose consciousness?', type: 'yesno' },
      { id: 'loc_duration', label: 'Approximately how long?', type: 'text', showIfYes: 'loss_of_consciousness' },
      { id: 'police_involved', label: 'Were police involved?', type: 'yesno' },
    ],
  },
}

// --- Structured per-region answer ------------------------------------------
export type RegionDetail = {
  side?: Side
  symptoms: string[]
  findings: string[]
  treatments: string[]
  /** Incident-overlay answers, keyed by OverlayQuestion.id. */
  overlays: Record<string, boolean | string>
  /** Always user_reported at intake; upgraded by the document pipeline later. */
  source: InjurySource
}

export type RegionDetailMap = Record<string, RegionDetail>

export const emptyRegionDetail = (): RegionDetail => ({
  symptoms: [],
  findings: [],
  treatments: [],
  overlays: {},
  source: 'user_reported',
})

/**
 * Normalise the wizard's raw incident type (`formData.injuryType`, e.g.
 * "vehicle", "slip_fall", "assault") to the overlay keys above. Everything with
 * no bespoke overlay falls through to a region's base questions.
 */
export function normalizeIncidentType(injuryType: string | undefined | null): string {
  const t = (injuryType || '').toLowerCase()
  if (t.includes('vehicle') || t.includes('auto') || t.includes('car')) return 'auto'
  if (t.includes('slip') || t.includes('fall') || t.includes('premises') || t.includes('trip')) return 'slip_fall'
  if (t.includes('assault')) return 'assault'
  if (t.includes('dog') || t.includes('bite')) return 'dog_bite'
  if (t.includes('toxic')) return 'toxic'
  if (t.includes('medmal') || t.includes('malpractice')) return 'medmal'
  if (t.includes('wrongful') || t.includes('death')) return 'wrongful_death'
  return t || 'other'
}

/** Overlay questions for a region under the current incident type (may be empty). */
export function overlaysFor(injuryType: string | undefined | null, regionId: string): OverlayQuestion[] {
  const key = normalizeIncidentType(injuryType)
  return INCIDENT_REGION_OVERLAYS[key]?.[regionId] || []
}

// --- Red-flag safety rules --------------------------------------------------
// These are NOT valuation signals. When a claimant reports a dangerous
// combination we surface a "seek medical care" message. Keep the copy cautious
// and non-diagnostic.
export type RedFlag = { id: string; region: string; message: string }

type RedFlagRule = {
  id: string
  region: string
  test: (d: RegionDetail) => boolean
  message: string
}

const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'head_loc_worsening',
    region: 'head_concussion',
    test: (d) =>
      (d.symptoms.includes('loss_of_consciousness') || d.overlays.loss_of_consciousness === true) &&
      (d.symptoms.includes('worsening_headache') || d.symptoms.includes('nausea_vomiting')),
    message:
      'Loss of consciousness with a worsening headache or vomiting can be a medical emergency. If this is happening now, please seek urgent medical care — this intake is not medical advice.',
  },
  {
    id: 'back_bowel_bladder',
    region: 'lower_back',
    test: (d) => d.symptoms.includes('bowel_bladder'),
    message:
      'New loss of bowel or bladder control after a back injury can signal a serious condition. Please seek urgent medical care right away.',
  },
  {
    id: 'chest_breathing',
    region: 'chest_ribs',
    test: (d) => d.symptoms.includes('difficulty_breathing'),
    message:
      'Difficulty breathing after a chest injury can be an emergency. If you are struggling to breathe, please seek urgent medical care now — this intake is not medical advice.',
  },
  {
    id: 'burn_major',
    region: 'burns',
    test: (d) => d.symptoms.includes('major_burn') || d.findings.includes('third_degree'),
    message:
      'A large or deep burn needs prompt medical attention. If you have not been treated, please seek urgent medical care.',
  },
]

/** Add a red-flag symptom to a region only where clinically relevant. */
export function extraRedFlagSymptoms(regionId: string): OptionItem[] {
  if (regionId === 'lower_back') return [{ id: 'bowel_bladder', label: 'New bowel/bladder problems' }]
  if (regionId === 'burns') return [{ id: 'major_burn', label: 'Large / hospitalized burn' }]
  return []
}

/** Compute all triggered red flags across the region map. */
export function computeRedFlags(map: RegionDetailMap): RedFlag[] {
  const out: RedFlag[] = []
  for (const [regionId, detail] of Object.entries(map || {})) {
    for (const rule of RED_FLAG_RULES) {
      if (rule.region === regionId && detail && rule.test(detail)) {
        out.push({ id: rule.id, region: regionId, message: rule.message })
      }
    }
  }
  return out
}

// --- Legacy-field derivation ------------------------------------------------
// The wizard's scoring, AI summary, and submit payload read the flat arrays
// `diagnoses`, `currentSymptoms`, `concussionSymptoms`, `shoulderFindings`, and
// `backFindings`. Rather than rewire all of that, we DERIVE those arrays from
// the richer regionDetail so every downstream consumer keeps working unchanged.

// Region finding id -> canonical diagnosis code used by DIAGNOSIS_OPTION_DEFS
// and the severity scorer (which treats tear/herniation/fracture/tbi as serious).
const FINDING_TO_DIAGNOSIS: Record<string, string> = {
  herniation: 'herniation',
  disc_protrusion: 'herniation',
  disc_bulge: 'herniation',
  radiculopathy: 'radiculopathy',
  sciatica: 'radiculopathy',
  cervical_strain: 'muscle_strain',
  strain_sprain: 'muscle_strain',
  sprain: 'muscle_strain',
  rotator_cuff_tear: 'tear',
  labral_tear: 'tear',
  meniscus_tear: 'tear',
  tear: 'tear',
  acl_pcl_mcl: 'tear',
  tendon_injury: 'tear',
  fracture: 'fracture',
  fracture_dislocation: 'fracture',
  facial_fracture: 'fracture',
  orbital_fracture: 'fracture',
  rib_fracture: 'fracture',
  sternum_fracture: 'fracture',
  ligament_tear: 'tear',
  dislocation: 'fracture',
  concussion: 'concussion',
  tbi: 'tbi',
  post_concussion: 'tbi',
  // Serious internal findings have no dedicated legacy code; map to `fracture`
  // purely so the legacy severity scorer treats them as serious. The true
  // structured finding is preserved in regionDetail.
  punctured_lung: 'fracture',
  internal_bleeding: 'fracture',
  internal_injury: 'fracture',
  organ_damage: 'fracture',
}

// Region symptom id -> canonical current-symptom code (CURRENT_SYMPTOM_OPTION_DEFS).
const SYMPTOM_TO_CANONICAL: Record<string, string> = {
  neck_pain: 'pain',
  back_pain: 'pain',
  pain: 'pain',
  pain_lifting: 'pain',
  overhead_pain: 'pain',
  night_pain: 'pain',
  radiating_arm: 'pain',
  radiating_leg: 'pain',
  spasm: 'pain',
  stiffness: 'stiffness',
  limited_rom: 'limited_rom',
  difficulty_stairs: 'limited_rom',
  difficulty_walking: 'limited_rom',
  mobility_limited: 'limited_rom',
  numbness_tingling: 'numbness',
  weakness: 'weakness',
  grip_weakness: 'weakness',
  instability: 'weakness',
  headaches: 'headaches',
  pain_breathing: 'pain',
  tenderness: 'pain',
  eye_pain: 'pain',
  ear_pain: 'pain',
  weight_bearing: 'limited_rom',
  difficulty_chewing: 'limited_rom',
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)))
}

/**
 * Flatten the structured region map into the legacy flat fields the rest of the
 * wizard consumes. Returns only the derived fields — the caller merges these
 * into `injuryDetails` alongside the raw `regionDetail`.
 */
export function deriveLegacyInjuryFields(map: RegionDetailMap): {
  diagnoses: string[]
  currentSymptoms: string[]
  concussionSymptoms: string[]
  shoulderFindings: string[]
  backFindings: string[]
} {
  const diagnoses: string[] = []
  const currentSymptoms: string[] = []
  const concussionSymptoms: string[] = []
  const shoulderFindings: string[] = []
  const backFindings: string[] = []

  for (const [regionId, detail] of Object.entries(map || {})) {
    if (!detail) continue

    for (const f of detail.findings) {
      const canon = FINDING_TO_DIAGNOSIS[f]
      if (canon) diagnoses.push(canon)
    }
    for (const s of detail.symptoms) {
      const canon = SYMPTOM_TO_CANONICAL[s]
      if (canon) currentSymptoms.push(canon)
    }

    // Head → concussion symptoms (canonical: loss_of_consciousness, memory_issues, headaches, dizziness).
    if (regionId === 'head_concussion') {
      if (detail.symptoms.includes('loss_of_consciousness') || detail.overlays.loss_of_consciousness === true) {
        concussionSymptoms.push('loss_of_consciousness')
      }
      if (detail.symptoms.includes('memory_loss') || detail.overlays.memory_gap === true) concussionSymptoms.push('memory_issues')
      if (detail.symptoms.includes('headaches') || detail.symptoms.includes('worsening_headache')) concussionSymptoms.push('headaches')
      if (detail.symptoms.includes('dizziness')) concussionSymptoms.push('dizziness')
      if (detail.findings.includes('concussion') || detail.overlays.concussion_dx === true) diagnoses.push('concussion')
      if (detail.findings.includes('tbi') || detail.findings.includes('post_concussion')) diagnoses.push('tbi')
    }

    // Shoulder findings (canonical: mri_completed, tear_diagnosed, surgery_recommended).
    if (regionId === 'shoulder') {
      if (detail.treatments.includes('mri')) shoulderFindings.push('mri_completed')
      if (detail.findings.includes('rotator_cuff_tear') || detail.findings.includes('labral_tear')) shoulderFindings.push('tear_diagnosed')
      if (detail.treatments.includes('surgery') || detail.treatments.includes('arthroscopy')) shoulderFindings.push('surgery_recommended')
    }

    // Back findings (canonical: mri_completed, herniation, radiculopathy, surgery_recommended).
    if (regionId === 'lower_back') {
      if (detail.treatments.includes('mri')) backFindings.push('mri_completed')
      if (detail.findings.includes('herniation') || detail.findings.includes('disc_protrusion')) backFindings.push('herniation')
      if (detail.findings.includes('radiculopathy') || detail.findings.includes('sciatica')) backFindings.push('radiculopathy')
      if (detail.treatments.includes('surgery')) backFindings.push('surgery_recommended')
    }
  }

  return {
    diagnoses: uniq(diagnoses),
    currentSymptoms: uniq(currentSymptoms),
    concussionSymptoms: uniq(concussionSymptoms),
    shoulderFindings: uniq(shoulderFindings),
    backFindings: uniq(backFindings),
  }
}
