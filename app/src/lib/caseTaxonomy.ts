/**
 * Second level of the incident taxonomy: what kind of incident it was, asked
 * immediately after the claimant picks the broad type.
 *
 * A type appears here only when the answer changes something downstream — later
 * intake questions, valuation, which documents we ask for, or which attorneys
 * the case matches. Types with nothing riding on the distinction are absent, and
 * the claimant goes straight from the tile to the next step rather than being
 * made to answer a question that leads nowhere.
 *
 * `value` is stored on the assessment as `incidentSubtype` and becomes
 * `caseSubtype`, so these slugs share a namespace with the values
 * `buildCaseTaxonomy` derives from branch answers. Anything added here needs a
 * matching entry in CASE_SUBTYPE_LABELS (app/src/pages/Results.tsx) and under
 * `results.caseSubtypes` in all three locale files, or it renders to the
 * claimant as a de-underscored slug.
 */

import {
  AlertTriangle,
  Baby,
  Bike,
  Bone,
  Brain,
  BusFront,
  Building2,
  Car,
  CarFront,
  CarTaxiFront,
  Cat,
  ClipboardList,
  Construction,
  Factory,
  Flame,
  Gauge,
  HardHat,
  Heart,
  HelpCircle,
  Home,
  Hotel,
  Landmark,
  MapPin,
  Package,
  Pencil,
  PersonStanding,
  Pill,
  Route,
  Scissors,
  ShieldAlert,
  ShoppingBag,
  Skull,
  Stethoscope,
  Syringe,
  Truck,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type IncidentSubtype = {
  value: string
  labelKey: string
  /**
   * Short form for the chips, where a row of them is meant to be scanned rather
   * than read. The full `labelKey` is what gets echoed back on the incident card
   * afterwards, since by then it stands alone and has to say what it means.
   */
  chipLabelKey?: string
  icon: LucideIcon
  /**
   * Rendered apart from and below the real answers. "I'm not sure" is an escape
   * hatch, and giving it the same weight as an answer invites it to be picked by
   * anyone in a hurry — which costs us the whole point of asking.
   */
  secondary?: boolean
}

/**
 * "I'm not sure" maps to the generic `auto_accident` rather than a sentinel of
 * its own. A claimant who cannot characterise the collision has told us exactly
 * what the generic slug already means, and inventing an "unknown" subtype would
 * only give downstream code a third thing to handle alongside "absent".
 */
export const INCIDENT_SUBTYPES: Record<string, IncidentSubtype[]> = {
  vehicle: [
    { value: 'car_accident', labelKey: 'subtype_vehicle_car', chipLabelKey: 'subtype_vehicle_car_short', icon: Car },
    { value: 'truck_accident', labelKey: 'subtype_vehicle_truck', chipLabelKey: 'subtype_vehicle_truck_short', icon: Truck },
    { value: 'motorcycle_accident', labelKey: 'subtype_vehicle_motorcycle', chipLabelKey: 'subtype_vehicle_motorcycle_short', icon: Gauge },
    { value: 'rideshare_accident', labelKey: 'subtype_vehicle_rideshare', chipLabelKey: 'subtype_vehicle_rideshare_short', icon: CarTaxiFront },
    { value: 'pedestrian_accident', labelKey: 'subtype_vehicle_pedestrian', chipLabelKey: 'subtype_vehicle_pedestrian_short', icon: PersonStanding },
    { value: 'bicycle_accident', labelKey: 'subtype_vehicle_bicycle', chipLabelKey: 'subtype_vehicle_bicycle_short', icon: Bike },
    { value: 'bus_accident', labelKey: 'subtype_vehicle_bus', chipLabelKey: 'subtype_vehicle_bus_short', icon: BusFront },
    { value: 'multi_vehicle_accident', labelKey: 'subtype_vehicle_multi', chipLabelKey: 'subtype_vehicle_multi_short', icon: CarFront },
    { value: 'other_vehicle_accident', labelKey: 'subtype_vehicle_other', chipLabelKey: 'subtype_vehicle_other_short', icon: Route },
  ],
  slip_fall: [
    { value: 'slip_store', labelKey: 'subtype_slip_store', chipLabelKey: 'subtype_slip_store_short', icon: ShoppingBag },
    { value: 'slip_apartment', labelKey: 'subtype_slip_apartment', chipLabelKey: 'subtype_slip_apartment_short', icon: Building2 },
    { value: 'slip_sidewalk', labelKey: 'subtype_slip_sidewalk', chipLabelKey: 'subtype_slip_sidewalk_short', icon: MapPin },
    { value: 'slip_workplace', labelKey: 'subtype_slip_workplace', chipLabelKey: 'subtype_slip_workplace_short', icon: HardHat },
    { value: 'slip_hotel', labelKey: 'subtype_slip_hotel', chipLabelKey: 'subtype_slip_hotel_short', icon: Hotel },
    { value: 'slip_private_home', labelKey: 'subtype_slip_private_home', chipLabelKey: 'subtype_slip_private_home_short', icon: Home },
  ],
  workplace: [
    { value: 'work_construction', labelKey: 'subtype_work_construction', chipLabelKey: 'subtype_work_construction_short', icon: Construction },
    { value: 'work_warehouse', labelKey: 'subtype_work_warehouse', chipLabelKey: 'subtype_work_warehouse_short', icon: Warehouse },
    { value: 'work_office', labelKey: 'subtype_work_office', chipLabelKey: 'subtype_work_office_short', icon: Landmark },
    { value: 'work_delivery', labelKey: 'subtype_work_delivery', chipLabelKey: 'subtype_work_delivery_short', icon: Truck },
    { value: 'work_repetitive', labelKey: 'subtype_work_repetitive', chipLabelKey: 'subtype_work_repetitive_short', icon: Wrench },
  ],
  medmal: [
    { value: 'medmal_misdiagnosis', labelKey: 'subtype_medmal_misdiagnosis', chipLabelKey: 'subtype_medmal_misdiagnosis_short', icon: ClipboardList },
    { value: 'medmal_surgery_error', labelKey: 'subtype_medmal_surgery_error', chipLabelKey: 'subtype_medmal_surgery_error_short', icon: Scissors },
    { value: 'medmal_medication_error', labelKey: 'subtype_medmal_medication_error', chipLabelKey: 'subtype_medmal_medication_error_short', icon: Pill },
    { value: 'medmal_birth_injury', labelKey: 'subtype_medmal_birth_injury', chipLabelKey: 'subtype_medmal_birth_injury_short', icon: Baby },
    { value: 'medmal_delayed_treatment', labelKey: 'subtype_medmal_delayed_treatment', chipLabelKey: 'subtype_medmal_delayed_treatment_short', icon: Stethoscope },
  ],
  dog_bite: [
    { value: 'dog_bite_attack', labelKey: 'subtype_dog_bite_attack', chipLabelKey: 'subtype_dog_bite_attack_short', icon: AlertTriangle },
    { value: 'dog_knockdown', labelKey: 'subtype_dog_knockdown', chipLabelKey: 'subtype_dog_knockdown_short', icon: PersonStanding },
    { value: 'animal_other', labelKey: 'subtype_animal_other', chipLabelKey: 'subtype_animal_other_short', icon: Cat },
  ],
  product: [
    { value: 'product_vehicle', labelKey: 'subtype_product_vehicle', chipLabelKey: 'subtype_product_vehicle_short', icon: Car },
    { value: 'product_medication', labelKey: 'subtype_product_medication', chipLabelKey: 'subtype_product_medication_short', icon: Pill },
    { value: 'product_medical_device', labelKey: 'subtype_product_medical_device', chipLabelKey: 'subtype_product_medical_device_short', icon: Syringe },
    { value: 'product_consumer', labelKey: 'subtype_product_consumer', chipLabelKey: 'subtype_product_consumer_short', icon: Package },
  ],
  assault: [
    { value: 'assault_apartment', labelKey: 'subtype_assault_apartment', chipLabelKey: 'subtype_assault_apartment_short', icon: Building2 },
    { value: 'assault_hotel', labelKey: 'subtype_assault_hotel', chipLabelKey: 'subtype_assault_hotel_short', icon: Hotel },
    { value: 'assault_nightclub', labelKey: 'subtype_assault_nightclub', chipLabelKey: 'subtype_assault_nightclub_short', icon: AlertTriangle },
    { value: 'assault_parking', labelKey: 'subtype_assault_parking', chipLabelKey: 'subtype_assault_parking_short', icon: MapPin },
    { value: 'assault_business', labelKey: 'subtype_assault_business', chipLabelKey: 'subtype_assault_business_short', icon: Landmark },
  ],
  toxic: [
    { value: 'toxic_workplace', labelKey: 'subtype_toxic_workplace', chipLabelKey: 'subtype_toxic_workplace_short', icon: Factory },
    { value: 'toxic_chemical_spill', labelKey: 'subtype_toxic_chemical_spill', chipLabelKey: 'subtype_toxic_chemical_spill_short', icon: AlertTriangle },
    { value: 'toxic_mold', labelKey: 'subtype_toxic_mold', chipLabelKey: 'subtype_toxic_mold_short', icon: Home },
    { value: 'toxic_asbestos', labelKey: 'subtype_toxic_asbestos', chipLabelKey: 'subtype_toxic_asbestos_short', icon: ShieldAlert },
    { value: 'toxic_contaminated_product', labelKey: 'subtype_toxic_contaminated_product', chipLabelKey: 'subtype_toxic_contaminated_product_short', icon: Package },
  ],
  nursing_home_abuse: [
    { value: 'nh_fall', labelKey: 'subtype_nh_fall', chipLabelKey: 'subtype_nh_fall_short', icon: PersonStanding },
    { value: 'nh_neglect', labelKey: 'subtype_nh_neglect', chipLabelKey: 'subtype_nh_neglect_short', icon: Heart },
    { value: 'nh_pressure_sore', labelKey: 'subtype_nh_pressure_sore', chipLabelKey: 'subtype_nh_pressure_sore_short', icon: Bone },
    { value: 'nh_medication_error', labelKey: 'subtype_nh_medication_error', chipLabelKey: 'subtype_nh_medication_error_short', icon: Pill },
    { value: 'nh_physical_abuse', labelKey: 'subtype_nh_physical_abuse', chipLabelKey: 'subtype_nh_physical_abuse_short', icon: ShieldAlert },
  ],
  wrongful_death: [
    { value: 'wd_vehicle', labelKey: 'subtype_wd_vehicle', chipLabelKey: 'subtype_wd_vehicle_short', icon: Car },
    { value: 'wd_medical', labelKey: 'subtype_wd_medical', chipLabelKey: 'subtype_wd_medical_short', icon: Stethoscope },
    { value: 'wd_workplace', labelKey: 'subtype_wd_workplace', chipLabelKey: 'subtype_wd_workplace_short', icon: HardHat },
    { value: 'wd_premises', labelKey: 'subtype_wd_premises', chipLabelKey: 'subtype_wd_premises_short', icon: Building2 },
    { value: 'wd_product', labelKey: 'subtype_wd_product', chipLabelKey: 'subtype_wd_product_short', icon: Package },
  ],
  // "other" uses a free-text description instead of subtype chips — see
  // INCIDENT_SUBTYPE_FREE_TEXT below.
}

/**
 * Injury types that ask for a short free-text description instead of offering
 * predefined subtype chips.
 */
export const INCIDENT_SUBTYPE_FREE_TEXT: Set<string> = new Set(['other'])

/** The question heading, per incident type. */
export const INCIDENT_SUBTYPE_PROMPTS: Record<string, string> = {
  vehicle: 'subtype_prompt_vehicle',
  slip_fall: 'subtype_prompt_slip_fall',
  workplace: 'subtype_prompt_workplace',
  medmal: 'subtype_prompt_medmal',
  dog_bite: 'subtype_prompt_dog_bite',
  product: 'subtype_prompt_product',
  assault: 'subtype_prompt_assault',
  toxic: 'subtype_prompt_toxic',
  nursing_home_abuse: 'subtype_prompt_nursing_home',
  wrongful_death: 'subtype_prompt_wrongful_death',
  other: 'subtype_prompt_other',
}

export function getIncidentSubtypes(injuryType: string): IncidentSubtype[] {
  return INCIDENT_SUBTYPES[injuryType] || []
}

export function hasIncidentSubtypes(injuryType: string): boolean {
  return getIncidentSubtypes(injuryType).length > 0 || INCIDENT_SUBTYPE_FREE_TEXT.has(injuryType)
}

export function isValidIncidentSubtype(injuryType: string, subtype: string): boolean {
  return getIncidentSubtypes(injuryType).some((entry) => entry.value === subtype)
}

/**
 * Tags carried by a subtype, on top of the subtype slug itself.
 *
 * These exist because the underwriting engine pattern-matches a text blob built
 * from the subtype and tags, and it already recognises `commercial_vehicle` and
 * `rideshare` from the (now superseded) defendant-type question. Emitting the
 * same tags from the subtype keeps those rules firing.
 */
export const INCIDENT_SUBTYPE_TAGS: Record<string, string[]> = {
  truck_accident: ['commercial_vehicle'],
  rideshare_accident: ['rideshare'],
  motorcycle_accident: ['motorcycle'],
  bus_accident: ['public_transit'],
  pedestrian_accident: ['pedestrian'],
  bicycle_accident: ['bicycle'],
  work_construction: ['construction'],
  work_warehouse: ['warehouse'],
  work_delivery: ['delivery'],
  work_repetitive: ['repetitive_stress'],
  medmal_birth_injury: ['birth_injury'],
  medmal_surgery_error: ['surgical_malpractice'],
  toxic_asbestos: ['asbestos'],
  toxic_mold: ['mold'],
  nh_physical_abuse: ['abuse'],
  nh_neglect: ['neglect'],
  assault_nightclub: ['nightclub_security'],
}
