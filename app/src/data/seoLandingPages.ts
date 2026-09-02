import type { LanguageCode } from '../i18n'
import { requestedLandingPages } from './seoRequestedPages'
import { priorityLandingPages } from './seoPriorityPages'
import { cityGuidePages } from './seoCityGuides'
import { cityGuidePages2 } from './seoCityGuides2'
import { cityGuidePages3 } from './seoCityGuides3'
import { medicalMalpracticeCityGuidePages } from './seoMedicalMalpracticeCityGuides'
import { medicalMalpracticeCityGuidePages2 } from './seoMedicalMalpracticeCityGuides2'
import { medicalMalpracticeCityGuidePages3 } from './seoMedicalMalpracticeCityGuides3'
import { medicalMalpracticeCityGuidePages4 } from './seoMedicalMalpracticeCityGuides4'
import { injuryDemandGuidePages } from './seoInjuryDemandGuides'
import { injuryValueGuidePages } from './seoInjuryValueGuides'
import { expansionLandingPages } from './seoExpansionPages'
import { insuranceGuidePages } from './seoInsuranceGuides'
import { caseStrengthGuidePages } from './seoCaseStrengthGuide'
import { attorneyGuidePages } from './seoAttorneyGuides'
import { solGuidePages } from './seoSolGuides'
import { medicalRecordsGuidePages } from './seoMedicalRecordsGuides'
import { dogBiteGuidePages } from './seoDogBiteGuides'
import { slipAndFallGuidePages } from './seoSlipAndFallGuides'
import { productLiabilityGuidePages } from './seoProductLiabilityGuides'
import { wrongfulDeathGuidePages } from './seoWrongfulDeathGuides'
import { rideshareGuidePages } from './seoRideshareGuides'
import { bicycleGuidePages } from './seoBicycleGuides'
import { pedestrianGuidePages } from './seoPedestrianGuides'
import { motorcycleGuidePages } from './seoMotorcycleGuides'
import { elderAbuseGuidePages } from './seoElderAbuseGuides'
import { truckAccidentGuidePages } from './seoTruckAccidentGuides'
import { medicalMalpracticeGuidePages } from './seoMedicalMalpracticeGuides'
import { workInjuryThirdPartyGuidePages } from './seoWorkInjuryThirdPartyGuides'
import { localPracticeGuidePages } from './seoLocalPracticeGuides'
import { localPracticeGuidePages2 } from './seoLocalPracticeGuides2'
import { localPracticeGuidePages3 } from './seoLocalPracticeGuides3'
import { motorcycleCityGuidePages } from './seoMotorcycleCityGuides'
import { rideshareCityGuidePages } from './seoRideshareCityGuides'
import { localPracticeGuidePages4 } from './seoLocalPracticeGuides4'
import { dogBiteCityGuidePages } from './seoDogBiteCityGuides'
import { slipAndFallCityGuidePages } from './seoSlipAndFallCityGuides'
import { truckAccidentCityGuidePages } from './seoTruckAccidentCityGuides'
import { motorcycleCityGuidePages2 } from './seoMotorcycleCityGuides2'
import { rideshareCityGuidePages2 } from './seoRideshareCityGuides2'
import { transitCityGuidePages } from './seoTransitCityGuides'
import { scooterCityGuidePages } from './seoScooterCityGuides'
import { constructionCityGuidePages } from './seoConstructionCityGuides'
import { constructionCityGuidePages2 } from './seoConstructionCityGuides2'
import { constructionCityGuidePages3 } from './seoConstructionCityGuides3'
import { negligentSecurityCityGuidePages } from './seoNegligentSecurityCityGuides'
import { negligentSecurityCityGuidePages2 } from './seoNegligentSecurityCityGuides2'
import { negligentSecurityCityGuidePages3 } from './seoNegligentSecurityCityGuides3'
import { boatingCityGuidePages } from './seoBoatingCityGuides'
import { boatingCityGuidePages2 } from './seoBoatingCityGuides2'
import { burnInjuryCityGuidePages } from './seoBurnInjuryCityGuides'
import { burnInjuryCityGuidePages2 } from './seoBurnInjuryCityGuides2'
import { burnInjuryCityGuidePages3 } from './seoBurnInjuryCityGuides3'
import { wrongfulDeathCityGuidePages } from './seoWrongfulDeathCityGuides'
import { wrongfulDeathCityGuidePages2 } from './seoWrongfulDeathCityGuides2'
import { wrongfulDeathCityGuidePages3 } from './seoWrongfulDeathCityGuides3'
import { duiVictimCityGuidePages } from './seoDuiVictimCityGuides'
import { duiVictimCityGuidePages2 } from './seoDuiVictimCityGuides2'
import { duiVictimCityGuidePages3 } from './seoDuiVictimCityGuides3'
import { themeParkCityGuidePages } from './seoThemeParkCityGuides'
import { poolDrowningCityGuidePages } from './seoPoolDrowningCityGuides'
import { poolDrowningCityGuidePages2 } from './seoPoolDrowningCityGuides2'
import { poolDrowningCityGuidePages3 } from './seoPoolDrowningCityGuides3'
import { deliveryVehicleCityGuidePages } from './seoDeliveryVehicleCityGuides'
import { deliveryVehicleCityGuidePages2 } from './seoDeliveryVehicleCityGuides2'
import { uninsuredMotoristCityGuidePages } from './seoUninsuredMotoristCityGuides'
import { uninsuredMotoristCityGuidePages2 } from './seoUninsuredMotoristCityGuides2'
import { uninsuredMotoristCityGuidePages3 } from './seoUninsuredMotoristCityGuides3'
import { foodPoisoningCityGuidePages } from './seoFoodPoisoningCityGuides'
import { foodPoisoningCityGuidePages2 } from './seoFoodPoisoningCityGuides2'
import { wildfireCityGuidePages } from './seoWildfireCityGuides'
import { wildfireCityGuidePages2 } from './seoWildfireCityGuides2'
import { dangerousRoadwayCityGuidePages } from './seoDangerousRoadwayCityGuides'
import { dangerousRoadwayCityGuidePages2 } from './seoDangerousRoadwayCityGuides2'
import { dangerousRoadwayCityGuidePages3 } from './seoDangerousRoadwayCityGuides3'
import { elderAbuseCityGuidePages } from './seoElderAbuseCityGuides'
import { elderAbuseCityGuidePages2 } from './seoElderAbuseCityGuides2'
import { elderAbuseCityGuidePages3 } from './seoElderAbuseCityGuides3'
import { apartmentInjuryCityGuidePages } from './seoApartmentInjuryCityGuides'
import { apartmentInjuryCityGuidePages2 } from './seoApartmentInjuryCityGuides2'
import { trainAccidentCityGuidePages } from './seoTrainAccidentCityGuides'
import { trainAccidentCityGuidePages2 } from './seoTrainAccidentCityGuides2'
import { warehouseInjuryCityGuidePages } from './seoWarehouseInjuryCityGuides'
import { warehouseInjuryCityGuidePages2 } from './seoWarehouseInjuryCityGuides2'
import { farmInjuryCityGuidePages } from './seoFarmInjuryCityGuides'
import { farmInjuryCityGuidePages2 } from './seoFarmInjuryCityGuides2'
import { birthInjuryCityGuidePages } from './seoBirthInjuryCityGuides'
import { birthInjuryCityGuidePages2 } from './seoBirthInjuryCityGuides2'
import { birthInjuryCityGuidePages3 } from './seoBirthInjuryCityGuides3'
import { brainInjuryCityGuidePages } from './seoBrainInjuryCityGuides'
import { brainInjuryCityGuidePages2 } from './seoBrainInjuryCityGuides2'
import { brainInjuryCityGuidePages3 } from './seoBrainInjuryCityGuides3'
import { spinalInjuryCityGuidePages } from './seoSpinalInjuryCityGuides'
import { spinalInjuryCityGuidePages2 } from './seoSpinalInjuryCityGuides2'
import { spinalInjuryCityGuidePages3 } from './seoSpinalInjuryCityGuides3'
import { childInjuryCityGuidePages } from './seoChildInjuryCityGuides'
import { childInjuryCityGuidePages2 } from './seoChildInjuryCityGuides2'
import { vehicleDefectCityGuidePages } from './seoVehicleDefectCityGuides'
import { vehicleDefectCityGuidePages2 } from './seoVehicleDefectCityGuides2'
import { carbonMonoxideCityGuidePages } from './seoCarbonMonoxideCityGuides'
import { carbonMonoxideCityGuidePages2 } from './seoCarbonMonoxideCityGuides2'
import { trampolineParkCityGuidePages } from './seoTrampolineParkCityGuides'
import { aviationCityGuidePages } from './seoAviationCityGuides'
import { aviationCityGuidePages2 } from './seoAviationCityGuides2'
import { electrocutionCityGuidePages } from './seoElectrocutionCityGuides'
import { electrocutionCityGuidePages2 } from './seoElectrocutionCityGuides2'
import { securityForceCityGuidePages } from './seoSecurityForceCityGuides'
import { securityForceCityGuidePages2 } from './seoSecurityForceCityGuides2'
import { elevatorCityGuidePages } from './seoElevatorCityGuides'
import { elevatorCityGuidePages2 } from './seoElevatorCityGuides2'
import { moldHabitabilityCityGuidePages } from './seoMoldHabitabilityCityGuides'
import { moldHabitabilityCityGuidePages2 } from './seoMoldHabitabilityCityGuides2'
import { scooterCityGuidePages2 } from './seoScooterCityGuides2'
import { scooterCityGuidePages3 } from './seoScooterCityGuides3'
import { offRoadVehicleCityGuidePages } from './seoOffRoadVehicleCityGuides'
import { offRoadVehicleCityGuidePages2 } from './seoOffRoadVehicleCityGuides2'
import { dramShopCityGuidePages } from './seoDramShopCityGuides'
import { dramShopCityGuidePages2 } from './seoDramShopCityGuides2'
import { consumerProductCityGuidePages } from './seoConsumerProductCityGuides'
import { consumerProductCityGuidePages2 } from './seoConsumerProductCityGuides2'
import { hotelInjuryCityGuidePages } from './seoHotelInjuryCityGuides'
import { hotelInjuryCityGuidePages2 } from './seoHotelInjuryCityGuides2'
import { gymInjuryCityGuidePages } from './seoGymInjuryCityGuides'
import { gymInjuryCityGuidePages2 } from './seoGymInjuryCityGuides2'
import { eventCrowdCityGuidePages } from './seoEventCrowdCityGuides'
import { eventCrowdCityGuidePages2 } from './seoEventCrowdCityGuides2'
import { themeParkCityGuidePages2 } from './seoThemeParkCityGuides2'
import { trampolineParkCityGuidePages2 } from './seoTrampolineParkCityGuides2'
import { vacationRentalCityGuidePages } from './seoVacationRentalCityGuides'
import { vacationRentalCityGuidePages2 } from './seoVacationRentalCityGuides2'
import { skiResortCityGuidePages } from './seoSkiResortCityGuides'
import { skiResortCityGuidePages2 } from './seoSkiResortCityGuides2'
import { equestrianCityGuidePages } from './seoEquestrianCityGuides'
import { equestrianCityGuidePages2 } from './seoEquestrianCityGuides2'
import { ebikeCityGuidePages } from './seoEbikeCityGuides'
import { dogBiteCityGuidePages2 } from './seoDogBiteCityGuides2'
import { slipAndFallCityGuidePages2 } from './seoSlipAndFallCityGuides2'
import { truckAccidentCityGuidePages2 } from './seoTruckAccidentCityGuides2'
import { truckAccidentCityGuidePages3 } from './seoTruckAccidentCityGuides3'
import { transitCityGuidePages2 } from './seoTransitCityGuides2'
import { transitCityGuidePages3 } from './seoTransitCityGuides3'
import { rideshareCityGuidePages3 } from './seoRideshareCityGuides3'
import { motorcycleCityGuidePages3 } from './seoMotorcycleCityGuides3'
import { dogBiteCityGuidePages3 } from './seoDogBiteCityGuides3'
import { slipAndFallCityGuidePages3 } from './seoSlipAndFallCityGuides3'
import { CONTENT_PUBLISHED_ES, CONTENT_UPDATED_ES, landingPagesEs } from './seoLandingPagesEs'
import { CONTENT_PUBLISHED_ZH, CONTENT_UPDATED_ZH, landingPagesZh } from './seoLandingPagesZh'
import {
  SETTLEMENT_CALCULATOR_FAQS,
  SETTLEMENT_CALCULATOR_WHAT_TO_TRACK,
  SETTLEMENT_CALCULATOR_WHY_IT_MATTERS,
} from './settlementCalculatorContent'

/**
 * The bucket a page belongs to. One category, one topic hub — see
 * `seoTopicHubDefs`.
 *
 * `Attorney Intent` was once the catch-all for anything with commercial intent,
 * and it grew to 544 of the 674 English pages: the entire city layer, every
 * filing-deadline page, and the do-I-have-a-claim pages all sat under a hub
 * titled "Working With an Injury Attorney". That put a wrong breadcrumb and a
 * wrong hub link on 80% of the corpus, and it collapsed the sibling-link cycle
 * into one undifferentiated ring, so a Fresno scooter page offered a Fresno
 * theme-park page as its related reading. The three categories below carve it
 * back down to what its name actually claims — the decision to hire a lawyer.
 */
export type LandingPageCategory =
  | 'Symptoms'
  | 'Treatment'
  | 'Settlement'
  | 'Insurance'
  | 'Liability'
  | 'Commercial'
  /** Geo pages: "<city> <claim type>". The largest layer by far. */
  | 'Cities'
  /** Statewide "do I have a claim, and what kind" pages. */
  | 'Claim Types'
  /** Filing deadlines. High intent, and wrong answers here are unrecoverable. */
  | 'Statute of Limitations'
  /** Hiring, fees, and switching firms. */
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
  /** UI language this page is written in. Absent means the default, English. */
  locale?: LanguageCode
  /** The default-language page this one translates, which pairs the two for hreflang. */
  translationOf?: string
  /** Slices of the locale dictionary this page's chrome reads, for translated pages. */
  namespaces?: string[]
  /** ISO date this page's content was last revised. Defaults per content set. */
  contentUpdated?: string
  /** ISO date this page first published. Defaults per content set. */
  contentPublished?: string
  /**
   * Id in `CONTENT_REVIEWERS` of the person who reviewed this page.
   *
   * Left unset means unreviewed, and unreviewed pages say so rather than
   * implying an expert read them. Never populate this without an actual named
   * reviewer who actually reviewed the page — a fabricated credential is both a
   * misrepresentation to the reader and the kind of signal search engines
   * penalise when it turns out to be false.
   */
  reviewedBy?: string
  /**
   * Keep the page live but ask search engines to drop it from the index.
   *
   * For thinning: a page too thin to rank competes with the pages that can,
   * because a library judged as a whole is dragged down by its weakest members.
   * Setting this serves `noindex, follow` and withholds the URL from the
   * sitemap, while the page keeps answering 200 and keeps its internal links —
   * `follow` is what lets the links out of it still count, and a crawler has to
   * be able to fetch the page to ever read the tag.
   *
   * Prefer improving or merging a page over hiding it. Deleting the route
   * instead would turn every existing link and every crawled URL into a 404,
   * which is a worse signal than a thin page and cannot be undone by editing
   * one field.
   *
   * Deliberately unset everywhere today: the duplication audit finds no page
   * below 40% unique content and no two pages with identical bodies, so nothing
   * currently qualifies. This exists so the decision is one field rather than a
   * refactor when it does.
   */
  noindex?: boolean
}

/**
 * When each content set was last meaningfully revised.
 *
 * Sitemap `lastmod` and the Article schema's `dateModified` read from here. A
 * single shared date across all pages claims every page changes at once, which
 * teaches crawlers to ignore the field entirely — so each set carries its own.
 * Bump the entry for the file you edit.
 */
export const CONTENT_UPDATED = {
  core: '2026-08-06',
  requested: '2026-06-02',
  priority: '2026-06-02',
  expansion: '2026-06-02',
  insuranceGuides: '2026-08-19',
  caseStrengthGuide: '2026-08-19',
  attorneyGuides: '2026-08-19',
  solGuides: '2026-08-19',
  medicalRecordsGuides: '2026-08-19',
  injuryValueGuides: '2026-08-19',
  injuryDemandGuides: '2026-08-19',
  cityGuides: '2026-08-19',
  cityGuides2: '2026-08-21',
  cityGuides3: '2026-08-21',
  medicalMalpracticeCityGuides: '2026-08-21',
  medicalMalpracticeCityGuides2: '2026-08-21',
  medicalMalpracticeCityGuides3: '2026-08-21',
  medicalMalpracticeCityGuides4: '2026-08-21',
  dogBiteGuides: '2026-08-20',
  slipAndFallGuides: '2026-08-20',
  productLiabilityGuides: '2026-08-20',
  wrongfulDeathGuides: '2026-08-20',
  rideshareGuides: '2026-08-20',
  bicycleGuides: '2026-08-20',
  pedestrianGuides: '2026-08-20',
  motorcycleGuides: '2026-08-20',
  elderAbuseGuides: '2026-08-20',
  truckAccidentGuides: '2026-08-20',
  medicalMalpracticeGuides: '2026-08-20',
  workInjuryThirdPartyGuides: '2026-08-20',
  localPracticeGuides: '2026-08-21',
  localPracticeGuides2: '2026-08-21',
  localPracticeGuides3: '2026-08-21',
  motorcycleCityGuides: '2026-08-21',
  rideshareCityGuides: '2026-08-21',
  localPracticeGuides4: '2026-08-21',
  dogBiteCityGuides: '2026-08-21',
  slipAndFallCityGuides: '2026-08-21',
  truckAccidentCityGuides: '2026-08-21',
  motorcycleCityGuides2: '2026-08-21',
  rideshareCityGuides2: '2026-08-21',
  transitCityGuides: '2026-08-21',
  scooterCityGuides: '2026-08-21',
  constructionCityGuides: '2026-08-21',
  constructionCityGuides2: '2026-08-22',
  constructionCityGuides3: '2026-08-22',
  negligentSecurityCityGuides: '2026-08-21',
  negligentSecurityCityGuides2: '2026-08-22',
  negligentSecurityCityGuides3: '2026-08-22',
  boatingCityGuides: '2026-08-21',
  boatingCityGuides2: '2026-08-22',
  burnInjuryCityGuides: '2026-08-21',
  burnInjuryCityGuides2: '2026-08-22',
  burnInjuryCityGuides3: '2026-08-22',
  wrongfulDeathCityGuides: '2026-08-21',
  wrongfulDeathCityGuides2: '2026-08-22',
  wrongfulDeathCityGuides3: '2026-08-22',
  duiVictimCityGuides: '2026-08-21',
  duiVictimCityGuides2: '2026-08-22',
  duiVictimCityGuides3: '2026-08-22',
  themeParkCityGuides: '2026-08-21',
  themeParkCityGuides2: '2026-08-22',
  poolDrowningCityGuides: '2026-08-21',
  poolDrowningCityGuides2: '2026-08-22',
  poolDrowningCityGuides3: '2026-08-22',
  deliveryVehicleCityGuides: '2026-08-21',
  deliveryVehicleCityGuides2: '2026-08-22',
  uninsuredMotoristCityGuides: '2026-08-21',
  uninsuredMotoristCityGuides2: '2026-08-22',
  uninsuredMotoristCityGuides3: '2026-08-22',
  foodPoisoningCityGuides: '2026-08-21',
  foodPoisoningCityGuides2: '2026-08-22',
  wildfireCityGuides: '2026-08-21',
  wildfireCityGuides2: '2026-08-22',
  dangerousRoadwayCityGuides: '2026-08-21',
  dangerousRoadwayCityGuides2: '2026-08-22',
  dangerousRoadwayCityGuides3: '2026-08-22',
  elderAbuseCityGuides: '2026-08-21',
  elderAbuseCityGuides2: '2026-08-21',
  elderAbuseCityGuides3: '2026-08-22',
  apartmentInjuryCityGuides: '2026-08-21',
  apartmentInjuryCityGuides2: '2026-08-22',
  trainAccidentCityGuides: '2026-08-21',
  trainAccidentCityGuides2: '2026-08-22',
  warehouseInjuryCityGuides: '2026-08-21',
  warehouseInjuryCityGuides2: '2026-08-22',
  farmInjuryCityGuides: '2026-08-21',
  farmInjuryCityGuides2: '2026-08-22',
  birthInjuryCityGuides: '2026-08-21',
  birthInjuryCityGuides2: '2026-08-22',
  birthInjuryCityGuides3: '2026-08-22',
  brainInjuryCityGuides: '2026-08-21',
  brainInjuryCityGuides2: '2026-08-22',
  brainInjuryCityGuides3: '2026-08-22',
  spinalInjuryCityGuides: '2026-08-21',
  spinalInjuryCityGuides2: '2026-08-22',
  spinalInjuryCityGuides3: '2026-08-22',
  childInjuryCityGuides: '2026-08-21',
  childInjuryCityGuides2: '2026-08-22',
  vehicleDefectCityGuides: '2026-08-21',
  vehicleDefectCityGuides2: '2026-08-22',
  carbonMonoxideCityGuides: '2026-08-21',
  carbonMonoxideCityGuides2: '2026-08-22',
  trampolineParkCityGuides: '2026-08-21',
  trampolineParkCityGuides2: '2026-08-22',
  aviationCityGuides: '2026-08-21',
  aviationCityGuides2: '2026-08-22',
  electrocutionCityGuides: '2026-08-21',
  electrocutionCityGuides2: '2026-08-22',
  securityForceCityGuides: '2026-08-21',
  securityForceCityGuides2: '2026-08-22',
  elevatorCityGuides: '2026-08-21',
  elevatorCityGuides2: '2026-08-22',
  moldHabitabilityCityGuides: '2026-08-21',
  moldHabitabilityCityGuides2: '2026-08-22',
  scooterCityGuides2: '2026-08-22',
  scooterCityGuides3: '2026-08-22',
  offRoadVehicleCityGuides: '2026-08-21',
  offRoadVehicleCityGuides2: '2026-08-22',
  dramShopCityGuides: '2026-08-21',
  dramShopCityGuides2: '2026-08-22',
  consumerProductCityGuides: '2026-08-21',
  consumerProductCityGuides2: '2026-08-22',
  hotelInjuryCityGuides: '2026-08-21',
  hotelInjuryCityGuides2: '2026-08-22',
  gymInjuryCityGuides: '2026-08-21',
  gymInjuryCityGuides2: '2026-08-22',
  eventCrowdCityGuides: '2026-08-21',
  eventCrowdCityGuides2: '2026-08-22',
  vacationRentalCityGuides: '2026-08-21',
  vacationRentalCityGuides2: '2026-08-22',
  skiResortCityGuides: '2026-08-21',
  skiResortCityGuides2: '2026-08-22',
  equestrianCityGuides: '2026-08-21',
  equestrianCityGuides2: '2026-08-22',
  ebikeCityGuides: '2026-08-22',
  dogBiteCityGuides2: '2026-08-21',
  slipAndFallCityGuides2: '2026-08-21',
  truckAccidentCityGuides2: '2026-08-21',
  truckAccidentCityGuides3: '2026-08-22',
  transitCityGuides2: '2026-08-21',
  transitCityGuides3: '2026-08-22',
  rideshareCityGuides3: '2026-08-21',
  motorcycleCityGuides3: '2026-08-21',
  dogBiteCityGuides3: '2026-08-21',
  slipAndFallCityGuides3: '2026-08-21',
} as const

/**
 * When each content set first published, taken from the git history of its data
 * file rather than estimated.
 *
 * `datePublished` and `dateModified` were previously emitted as the same value,
 * which told search engines and readers that no page has ever been revised. For
 * health-adjacent content, where a visible revision history is part of how a page
 * is judged, that threw away a signal the content had actually earned.
 */
export const CONTENT_PUBLISHED = {
  core: '2026-05-20',
  requested: '2026-06-02',
  priority: '2026-06-02',
  expansion: '2026-06-02',
  insuranceGuides: '2026-08-19',
  attorneyGuides: '2026-08-19',
  caseStrengthGuide: '2026-08-19',
  solGuides: '2026-08-19',
  medicalRecordsGuides: '2026-08-19',
  // The URLs are not new — they published with the conversion set and were
  // rewritten in place, so the publish date stays and only `dateModified` moves.
  injuryValueGuides: '2026-06-02',
  // Likewise: these five published with the priority set and were rewritten,
  // not created.
  injuryDemandGuides: '2026-06-02',
  // The seven city URLs published with the expansion set.
  cityGuides: '2026-06-02',
  cityGuides2: '2026-08-21',
  cityGuides3: '2026-08-21',
  medicalMalpracticeCityGuides: '2026-08-21',
  medicalMalpracticeCityGuides2: '2026-08-21',
  medicalMalpracticeCityGuides3: '2026-08-21',
  medicalMalpracticeCityGuides4: '2026-08-21',
  // First dedicated practice-area hub (dog bite), published new.
  dogBiteGuides: '2026-08-20',
  // Practice-area hubs from the SEO content-gap matrix, published new.
  slipAndFallGuides: '2026-08-20',
  productLiabilityGuides: '2026-08-20',
  wrongfulDeathGuides: '2026-08-20',
  rideshareGuides: '2026-08-20',
  bicycleGuides: '2026-08-20',
  pedestrianGuides: '2026-08-20',
  motorcycleGuides: '2026-08-20',
  elderAbuseGuides: '2026-08-20',
  truckAccidentGuides: '2026-08-20',
  medicalMalpracticeGuides: '2026-08-20',
  workInjuryThirdPartyGuides: '2026-08-20',
  localPracticeGuides: '2026-08-21',
  localPracticeGuides2: '2026-08-21',
  localPracticeGuides3: '2026-08-21',
  motorcycleCityGuides: '2026-08-21',
  rideshareCityGuides: '2026-08-21',
  localPracticeGuides4: '2026-08-21',
  dogBiteCityGuides: '2026-08-21',
  slipAndFallCityGuides: '2026-08-21',
  truckAccidentCityGuides: '2026-08-21',
  motorcycleCityGuides2: '2026-08-21',
  rideshareCityGuides2: '2026-08-21',
  transitCityGuides: '2026-08-21',
  scooterCityGuides: '2026-08-21',
  constructionCityGuides: '2026-08-21',
  constructionCityGuides2: '2026-08-22',
  constructionCityGuides3: '2026-08-22',
  negligentSecurityCityGuides: '2026-08-21',
  negligentSecurityCityGuides2: '2026-08-22',
  negligentSecurityCityGuides3: '2026-08-22',
  boatingCityGuides: '2026-08-21',
  boatingCityGuides2: '2026-08-22',
  burnInjuryCityGuides: '2026-08-21',
  burnInjuryCityGuides2: '2026-08-22',
  burnInjuryCityGuides3: '2026-08-22',
  wrongfulDeathCityGuides: '2026-08-21',
  wrongfulDeathCityGuides2: '2026-08-22',
  wrongfulDeathCityGuides3: '2026-08-22',
  duiVictimCityGuides: '2026-08-21',
  duiVictimCityGuides2: '2026-08-22',
  duiVictimCityGuides3: '2026-08-22',
  themeParkCityGuides: '2026-08-21',
  themeParkCityGuides2: '2026-08-22',
  poolDrowningCityGuides: '2026-08-21',
  poolDrowningCityGuides2: '2026-08-22',
  poolDrowningCityGuides3: '2026-08-22',
  deliveryVehicleCityGuides: '2026-08-21',
  deliveryVehicleCityGuides2: '2026-08-22',
  uninsuredMotoristCityGuides: '2026-08-21',
  uninsuredMotoristCityGuides2: '2026-08-22',
  uninsuredMotoristCityGuides3: '2026-08-22',
  foodPoisoningCityGuides: '2026-08-21',
  foodPoisoningCityGuides2: '2026-08-22',
  wildfireCityGuides: '2026-08-21',
  wildfireCityGuides2: '2026-08-22',
  dangerousRoadwayCityGuides: '2026-08-21',
  dangerousRoadwayCityGuides2: '2026-08-22',
  dangerousRoadwayCityGuides3: '2026-08-22',
  elderAbuseCityGuides: '2026-08-21',
  elderAbuseCityGuides2: '2026-08-21',
  elderAbuseCityGuides3: '2026-08-22',
  apartmentInjuryCityGuides: '2026-08-21',
  apartmentInjuryCityGuides2: '2026-08-22',
  trainAccidentCityGuides: '2026-08-21',
  trainAccidentCityGuides2: '2026-08-22',
  warehouseInjuryCityGuides: '2026-08-21',
  warehouseInjuryCityGuides2: '2026-08-22',
  farmInjuryCityGuides: '2026-08-21',
  farmInjuryCityGuides2: '2026-08-22',
  birthInjuryCityGuides: '2026-08-21',
  birthInjuryCityGuides2: '2026-08-22',
  birthInjuryCityGuides3: '2026-08-22',
  brainInjuryCityGuides: '2026-08-21',
  brainInjuryCityGuides2: '2026-08-22',
  brainInjuryCityGuides3: '2026-08-22',
  spinalInjuryCityGuides: '2026-08-21',
  spinalInjuryCityGuides2: '2026-08-22',
  spinalInjuryCityGuides3: '2026-08-22',
  childInjuryCityGuides: '2026-08-21',
  childInjuryCityGuides2: '2026-08-22',
  vehicleDefectCityGuides: '2026-08-21',
  vehicleDefectCityGuides2: '2026-08-22',
  carbonMonoxideCityGuides: '2026-08-21',
  carbonMonoxideCityGuides2: '2026-08-22',
  trampolineParkCityGuides: '2026-08-21',
  trampolineParkCityGuides2: '2026-08-22',
  aviationCityGuides: '2026-08-21',
  aviationCityGuides2: '2026-08-22',
  electrocutionCityGuides: '2026-08-21',
  electrocutionCityGuides2: '2026-08-22',
  securityForceCityGuides: '2026-08-21',
  securityForceCityGuides2: '2026-08-22',
  elevatorCityGuides: '2026-08-21',
  elevatorCityGuides2: '2026-08-22',
  moldHabitabilityCityGuides: '2026-08-21',
  moldHabitabilityCityGuides2: '2026-08-22',
  scooterCityGuides2: '2026-08-22',
  scooterCityGuides3: '2026-08-22',
  offRoadVehicleCityGuides: '2026-08-21',
  offRoadVehicleCityGuides2: '2026-08-22',
  dramShopCityGuides: '2026-08-21',
  dramShopCityGuides2: '2026-08-22',
  consumerProductCityGuides: '2026-08-21',
  consumerProductCityGuides2: '2026-08-22',
  hotelInjuryCityGuides: '2026-08-21',
  hotelInjuryCityGuides2: '2026-08-22',
  gymInjuryCityGuides: '2026-08-21',
  gymInjuryCityGuides2: '2026-08-22',
  eventCrowdCityGuides: '2026-08-21',
  eventCrowdCityGuides2: '2026-08-22',
  vacationRentalCityGuides: '2026-08-21',
  vacationRentalCityGuides2: '2026-08-22',
  skiResortCityGuides: '2026-08-21',
  skiResortCityGuides2: '2026-08-22',
  equestrianCityGuides: '2026-08-21',
  equestrianCityGuides2: '2026-08-22',
  ebikeCityGuides: '2026-08-22',
  dogBiteCityGuides2: '2026-08-21',
  slipAndFallCityGuides2: '2026-08-21',
  truckAccidentCityGuides2: '2026-08-21',
  truckAccidentCityGuides3: '2026-08-22',
  transitCityGuides2: '2026-08-21',
  transitCityGuides3: '2026-08-22',
  rideshareCityGuides3: '2026-08-21',
  motorcycleCityGuides3: '2026-08-21',
  dogBiteCityGuides3: '2026-08-21',
  slipAndFallCityGuides3: '2026-08-21',
} as const

/** Applies a set's dates without overriding page-specific ones. */
function stamp(pages: LandingPage[], contentUpdated: string, contentPublished: string): LandingPage[] {
  return pages.map((page) => ({ contentUpdated, contentPublished, ...page }))
}

export const landingPages: LandingPage[] = [
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
      { q: 'How is shoulder or knee pain evaluated in a claim?', a: 'Insurers and attorneys look at whether the pain is corroborated by imaging, specialist findings, and treatment records. Documenting the care a provider has recommended is what makes an injury legible to them; it is not a reason to seek care you do not need.' },
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
      // Shared with the calculator page so the visible FAQs and the FAQPage
      // structured data cannot drift apart.
      whyItMatters: SETTLEMENT_CALCULATOR_WHY_IT_MATTERS,
      whatToTrack: SETTLEMENT_CALCULATOR_WHAT_TO_TRACK,
      howClearCaseHelps: 'The calculator shows the arithmetic openly, then explains which documents would raise or lower confidence in the range.',
    },
    faqs: SETTLEMENT_CALCULATOR_FAQS,
  },
  // `/insurance/claim-denial` now lives in seoInsuranceGuides.ts. The URL is
  // unchanged; the content is replaced, and the ten per-carrier denial pages
  // redirect into it.
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
    category: 'Claim Types',
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

export const allLandingPages: LandingPage[] = [
  ...stamp(landingPages, CONTENT_UPDATED.core, CONTENT_PUBLISHED.core),
  ...stamp(requestedLandingPages, CONTENT_UPDATED.requested, CONTENT_PUBLISHED.requested),
  ...stamp(priorityLandingPages, CONTENT_UPDATED.priority, CONTENT_PUBLISHED.priority),
  ...stamp(expansionLandingPages, CONTENT_UPDATED.expansion, CONTENT_PUBLISHED.expansion),
  ...stamp(
    injuryValueGuidePages,
    CONTENT_UPDATED.injuryValueGuides,
    CONTENT_PUBLISHED.injuryValueGuides,
  ),
  ...stamp(
    injuryDemandGuidePages,
    CONTENT_UPDATED.injuryDemandGuides,
    CONTENT_PUBLISHED.injuryDemandGuides,
  ),
  ...stamp(cityGuidePages, CONTENT_UPDATED.cityGuides, CONTENT_PUBLISHED.cityGuides),
  ...stamp(cityGuidePages2, CONTENT_UPDATED.cityGuides2, CONTENT_PUBLISHED.cityGuides2),
  ...stamp(cityGuidePages3, CONTENT_UPDATED.cityGuides3, CONTENT_PUBLISHED.cityGuides3),
  ...stamp(medicalMalpracticeCityGuidePages, CONTENT_UPDATED.medicalMalpracticeCityGuides, CONTENT_PUBLISHED.medicalMalpracticeCityGuides),
  ...stamp(medicalMalpracticeCityGuidePages2, CONTENT_UPDATED.medicalMalpracticeCityGuides2, CONTENT_PUBLISHED.medicalMalpracticeCityGuides2),
  ...stamp(medicalMalpracticeCityGuidePages3, CONTENT_UPDATED.medicalMalpracticeCityGuides3, CONTENT_PUBLISHED.medicalMalpracticeCityGuides3),
  ...stamp(medicalMalpracticeCityGuidePages4, CONTENT_UPDATED.medicalMalpracticeCityGuides4, CONTENT_PUBLISHED.medicalMalpracticeCityGuides4),
  ...stamp(insuranceGuidePages, CONTENT_UPDATED.insuranceGuides, CONTENT_PUBLISHED.insuranceGuides),
  ...stamp(caseStrengthGuidePages, CONTENT_UPDATED.caseStrengthGuide, CONTENT_PUBLISHED.caseStrengthGuide),
  ...stamp(attorneyGuidePages, CONTENT_UPDATED.attorneyGuides, CONTENT_PUBLISHED.attorneyGuides),
  ...stamp(solGuidePages, CONTENT_UPDATED.solGuides, CONTENT_PUBLISHED.solGuides),
  ...stamp(
    medicalRecordsGuidePages,
    CONTENT_UPDATED.medicalRecordsGuides,
    CONTENT_PUBLISHED.medicalRecordsGuides,
  ),
  ...stamp(dogBiteGuidePages, CONTENT_UPDATED.dogBiteGuides, CONTENT_PUBLISHED.dogBiteGuides),
  ...stamp(
    slipAndFallGuidePages,
    CONTENT_UPDATED.slipAndFallGuides,
    CONTENT_PUBLISHED.slipAndFallGuides,
  ),
  ...stamp(
    productLiabilityGuidePages,
    CONTENT_UPDATED.productLiabilityGuides,
    CONTENT_PUBLISHED.productLiabilityGuides,
  ),
  ...stamp(
    wrongfulDeathGuidePages,
    CONTENT_UPDATED.wrongfulDeathGuides,
    CONTENT_PUBLISHED.wrongfulDeathGuides,
  ),
  ...stamp(rideshareGuidePages, CONTENT_UPDATED.rideshareGuides, CONTENT_PUBLISHED.rideshareGuides),
  ...stamp(bicycleGuidePages, CONTENT_UPDATED.bicycleGuides, CONTENT_PUBLISHED.bicycleGuides),
  ...stamp(pedestrianGuidePages, CONTENT_UPDATED.pedestrianGuides, CONTENT_PUBLISHED.pedestrianGuides),
  ...stamp(motorcycleGuidePages, CONTENT_UPDATED.motorcycleGuides, CONTENT_PUBLISHED.motorcycleGuides),
  ...stamp(elderAbuseGuidePages, CONTENT_UPDATED.elderAbuseGuides, CONTENT_PUBLISHED.elderAbuseGuides),
  ...stamp(truckAccidentGuidePages, CONTENT_UPDATED.truckAccidentGuides, CONTENT_PUBLISHED.truckAccidentGuides),
  ...stamp(medicalMalpracticeGuidePages, CONTENT_UPDATED.medicalMalpracticeGuides, CONTENT_PUBLISHED.medicalMalpracticeGuides),
  ...stamp(workInjuryThirdPartyGuidePages, CONTENT_UPDATED.workInjuryThirdPartyGuides, CONTENT_PUBLISHED.workInjuryThirdPartyGuides),
  ...stamp(localPracticeGuidePages, CONTENT_UPDATED.localPracticeGuides, CONTENT_PUBLISHED.localPracticeGuides),
  ...stamp(localPracticeGuidePages2, CONTENT_UPDATED.localPracticeGuides2, CONTENT_PUBLISHED.localPracticeGuides2),
  ...stamp(localPracticeGuidePages3, CONTENT_UPDATED.localPracticeGuides3, CONTENT_PUBLISHED.localPracticeGuides3),
  ...stamp(motorcycleCityGuidePages, CONTENT_UPDATED.motorcycleCityGuides, CONTENT_PUBLISHED.motorcycleCityGuides),
  ...stamp(rideshareCityGuidePages, CONTENT_UPDATED.rideshareCityGuides, CONTENT_PUBLISHED.rideshareCityGuides),
  ...stamp(localPracticeGuidePages4, CONTENT_UPDATED.localPracticeGuides4, CONTENT_PUBLISHED.localPracticeGuides4),
  ...stamp(dogBiteCityGuidePages, CONTENT_UPDATED.dogBiteCityGuides, CONTENT_PUBLISHED.dogBiteCityGuides),
  ...stamp(slipAndFallCityGuidePages, CONTENT_UPDATED.slipAndFallCityGuides, CONTENT_PUBLISHED.slipAndFallCityGuides),
  ...stamp(truckAccidentCityGuidePages, CONTENT_UPDATED.truckAccidentCityGuides, CONTENT_PUBLISHED.truckAccidentCityGuides),
  ...stamp(motorcycleCityGuidePages2, CONTENT_UPDATED.motorcycleCityGuides2, CONTENT_PUBLISHED.motorcycleCityGuides2),
  ...stamp(rideshareCityGuidePages2, CONTENT_UPDATED.rideshareCityGuides2, CONTENT_PUBLISHED.rideshareCityGuides2),
  ...stamp(transitCityGuidePages, CONTENT_UPDATED.transitCityGuides, CONTENT_PUBLISHED.transitCityGuides),
  ...stamp(scooterCityGuidePages, CONTENT_UPDATED.scooterCityGuides, CONTENT_PUBLISHED.scooterCityGuides),
  ...stamp(constructionCityGuidePages, CONTENT_UPDATED.constructionCityGuides, CONTENT_PUBLISHED.constructionCityGuides),
  ...stamp(constructionCityGuidePages2, CONTENT_UPDATED.constructionCityGuides2, CONTENT_PUBLISHED.constructionCityGuides2),
  ...stamp(constructionCityGuidePages3, CONTENT_UPDATED.constructionCityGuides3, CONTENT_PUBLISHED.constructionCityGuides3),
  ...stamp(negligentSecurityCityGuidePages, CONTENT_UPDATED.negligentSecurityCityGuides, CONTENT_PUBLISHED.negligentSecurityCityGuides),
  ...stamp(negligentSecurityCityGuidePages2, CONTENT_UPDATED.negligentSecurityCityGuides2, CONTENT_PUBLISHED.negligentSecurityCityGuides2),
  ...stamp(negligentSecurityCityGuidePages3, CONTENT_UPDATED.negligentSecurityCityGuides3, CONTENT_PUBLISHED.negligentSecurityCityGuides3),
  ...stamp(boatingCityGuidePages, CONTENT_UPDATED.boatingCityGuides, CONTENT_PUBLISHED.boatingCityGuides),
  ...stamp(boatingCityGuidePages2, CONTENT_UPDATED.boatingCityGuides2, CONTENT_PUBLISHED.boatingCityGuides2),
  ...stamp(burnInjuryCityGuidePages, CONTENT_UPDATED.burnInjuryCityGuides, CONTENT_PUBLISHED.burnInjuryCityGuides),
  ...stamp(burnInjuryCityGuidePages2, CONTENT_UPDATED.burnInjuryCityGuides2, CONTENT_PUBLISHED.burnInjuryCityGuides2),
  ...stamp(burnInjuryCityGuidePages3, CONTENT_UPDATED.burnInjuryCityGuides3, CONTENT_PUBLISHED.burnInjuryCityGuides3),
  ...stamp(wrongfulDeathCityGuidePages, CONTENT_UPDATED.wrongfulDeathCityGuides, CONTENT_PUBLISHED.wrongfulDeathCityGuides),
  ...stamp(wrongfulDeathCityGuidePages2, CONTENT_UPDATED.wrongfulDeathCityGuides2, CONTENT_PUBLISHED.wrongfulDeathCityGuides2),
  ...stamp(wrongfulDeathCityGuidePages3, CONTENT_UPDATED.wrongfulDeathCityGuides3, CONTENT_PUBLISHED.wrongfulDeathCityGuides3),
  ...stamp(duiVictimCityGuidePages, CONTENT_UPDATED.duiVictimCityGuides, CONTENT_PUBLISHED.duiVictimCityGuides),
  ...stamp(duiVictimCityGuidePages2, CONTENT_UPDATED.duiVictimCityGuides2, CONTENT_PUBLISHED.duiVictimCityGuides2),
  ...stamp(duiVictimCityGuidePages3, CONTENT_UPDATED.duiVictimCityGuides3, CONTENT_PUBLISHED.duiVictimCityGuides3),
  ...stamp(themeParkCityGuidePages, CONTENT_UPDATED.themeParkCityGuides, CONTENT_PUBLISHED.themeParkCityGuides),
  ...stamp(themeParkCityGuidePages2, CONTENT_UPDATED.themeParkCityGuides2, CONTENT_PUBLISHED.themeParkCityGuides2),
  ...stamp(poolDrowningCityGuidePages, CONTENT_UPDATED.poolDrowningCityGuides, CONTENT_PUBLISHED.poolDrowningCityGuides),
  ...stamp(poolDrowningCityGuidePages2, CONTENT_UPDATED.poolDrowningCityGuides2, CONTENT_PUBLISHED.poolDrowningCityGuides2),
  ...stamp(poolDrowningCityGuidePages3, CONTENT_UPDATED.poolDrowningCityGuides3, CONTENT_PUBLISHED.poolDrowningCityGuides3),
  ...stamp(deliveryVehicleCityGuidePages, CONTENT_UPDATED.deliveryVehicleCityGuides, CONTENT_PUBLISHED.deliveryVehicleCityGuides),
  ...stamp(deliveryVehicleCityGuidePages2, CONTENT_UPDATED.deliveryVehicleCityGuides2, CONTENT_PUBLISHED.deliveryVehicleCityGuides2),
  ...stamp(uninsuredMotoristCityGuidePages, CONTENT_UPDATED.uninsuredMotoristCityGuides, CONTENT_PUBLISHED.uninsuredMotoristCityGuides),
  ...stamp(uninsuredMotoristCityGuidePages2, CONTENT_UPDATED.uninsuredMotoristCityGuides2, CONTENT_PUBLISHED.uninsuredMotoristCityGuides2),
  ...stamp(uninsuredMotoristCityGuidePages3, CONTENT_UPDATED.uninsuredMotoristCityGuides3, CONTENT_PUBLISHED.uninsuredMotoristCityGuides3),
  ...stamp(foodPoisoningCityGuidePages, CONTENT_UPDATED.foodPoisoningCityGuides, CONTENT_PUBLISHED.foodPoisoningCityGuides),
  ...stamp(foodPoisoningCityGuidePages2, CONTENT_UPDATED.foodPoisoningCityGuides2, CONTENT_PUBLISHED.foodPoisoningCityGuides2),
  ...stamp(wildfireCityGuidePages, CONTENT_UPDATED.wildfireCityGuides, CONTENT_PUBLISHED.wildfireCityGuides),
  ...stamp(wildfireCityGuidePages2, CONTENT_UPDATED.wildfireCityGuides2, CONTENT_PUBLISHED.wildfireCityGuides2),
  ...stamp(dangerousRoadwayCityGuidePages, CONTENT_UPDATED.dangerousRoadwayCityGuides, CONTENT_PUBLISHED.dangerousRoadwayCityGuides),
  ...stamp(dangerousRoadwayCityGuidePages2, CONTENT_UPDATED.dangerousRoadwayCityGuides2, CONTENT_PUBLISHED.dangerousRoadwayCityGuides2),
  ...stamp(dangerousRoadwayCityGuidePages3, CONTENT_UPDATED.dangerousRoadwayCityGuides3, CONTENT_PUBLISHED.dangerousRoadwayCityGuides3),
  ...stamp(elderAbuseCityGuidePages, CONTENT_UPDATED.elderAbuseCityGuides, CONTENT_PUBLISHED.elderAbuseCityGuides),
  ...stamp(elderAbuseCityGuidePages2, CONTENT_UPDATED.elderAbuseCityGuides2, CONTENT_PUBLISHED.elderAbuseCityGuides2),
  ...stamp(elderAbuseCityGuidePages3, CONTENT_UPDATED.elderAbuseCityGuides3, CONTENT_PUBLISHED.elderAbuseCityGuides3),
  ...stamp(apartmentInjuryCityGuidePages, CONTENT_UPDATED.apartmentInjuryCityGuides, CONTENT_PUBLISHED.apartmentInjuryCityGuides),
  ...stamp(apartmentInjuryCityGuidePages2, CONTENT_UPDATED.apartmentInjuryCityGuides2, CONTENT_PUBLISHED.apartmentInjuryCityGuides2),
  ...stamp(trainAccidentCityGuidePages, CONTENT_UPDATED.trainAccidentCityGuides, CONTENT_PUBLISHED.trainAccidentCityGuides),
  ...stamp(trainAccidentCityGuidePages2, CONTENT_UPDATED.trainAccidentCityGuides2, CONTENT_PUBLISHED.trainAccidentCityGuides2),
  ...stamp(warehouseInjuryCityGuidePages, CONTENT_UPDATED.warehouseInjuryCityGuides, CONTENT_PUBLISHED.warehouseInjuryCityGuides),
  ...stamp(warehouseInjuryCityGuidePages2, CONTENT_UPDATED.warehouseInjuryCityGuides2, CONTENT_PUBLISHED.warehouseInjuryCityGuides2),
  ...stamp(farmInjuryCityGuidePages, CONTENT_UPDATED.farmInjuryCityGuides, CONTENT_PUBLISHED.farmInjuryCityGuides),
  ...stamp(farmInjuryCityGuidePages2, CONTENT_UPDATED.farmInjuryCityGuides2, CONTENT_PUBLISHED.farmInjuryCityGuides2),
  ...stamp(birthInjuryCityGuidePages, CONTENT_UPDATED.birthInjuryCityGuides, CONTENT_PUBLISHED.birthInjuryCityGuides),
  ...stamp(birthInjuryCityGuidePages2, CONTENT_UPDATED.birthInjuryCityGuides2, CONTENT_PUBLISHED.birthInjuryCityGuides2),
  ...stamp(birthInjuryCityGuidePages3, CONTENT_UPDATED.birthInjuryCityGuides3, CONTENT_PUBLISHED.birthInjuryCityGuides3),
  ...stamp(brainInjuryCityGuidePages, CONTENT_UPDATED.brainInjuryCityGuides, CONTENT_PUBLISHED.brainInjuryCityGuides),
  ...stamp(brainInjuryCityGuidePages2, CONTENT_UPDATED.brainInjuryCityGuides2, CONTENT_PUBLISHED.brainInjuryCityGuides2),
  ...stamp(brainInjuryCityGuidePages3, CONTENT_UPDATED.brainInjuryCityGuides3, CONTENT_PUBLISHED.brainInjuryCityGuides3),
  ...stamp(spinalInjuryCityGuidePages, CONTENT_UPDATED.spinalInjuryCityGuides, CONTENT_PUBLISHED.spinalInjuryCityGuides),
  ...stamp(spinalInjuryCityGuidePages2, CONTENT_UPDATED.spinalInjuryCityGuides2, CONTENT_PUBLISHED.spinalInjuryCityGuides2),
  ...stamp(spinalInjuryCityGuidePages3, CONTENT_UPDATED.spinalInjuryCityGuides3, CONTENT_PUBLISHED.spinalInjuryCityGuides3),
  ...stamp(childInjuryCityGuidePages, CONTENT_UPDATED.childInjuryCityGuides, CONTENT_PUBLISHED.childInjuryCityGuides),
  ...stamp(childInjuryCityGuidePages2, CONTENT_UPDATED.childInjuryCityGuides2, CONTENT_PUBLISHED.childInjuryCityGuides2),
  ...stamp(vehicleDefectCityGuidePages, CONTENT_UPDATED.vehicleDefectCityGuides, CONTENT_PUBLISHED.vehicleDefectCityGuides),
  ...stamp(vehicleDefectCityGuidePages2, CONTENT_UPDATED.vehicleDefectCityGuides2, CONTENT_PUBLISHED.vehicleDefectCityGuides2),
  ...stamp(carbonMonoxideCityGuidePages, CONTENT_UPDATED.carbonMonoxideCityGuides, CONTENT_PUBLISHED.carbonMonoxideCityGuides),
  ...stamp(carbonMonoxideCityGuidePages2, CONTENT_UPDATED.carbonMonoxideCityGuides2, CONTENT_PUBLISHED.carbonMonoxideCityGuides2),
  ...stamp(trampolineParkCityGuidePages, CONTENT_UPDATED.trampolineParkCityGuides, CONTENT_PUBLISHED.trampolineParkCityGuides),
  ...stamp(trampolineParkCityGuidePages2, CONTENT_UPDATED.trampolineParkCityGuides2, CONTENT_PUBLISHED.trampolineParkCityGuides2),
  ...stamp(aviationCityGuidePages, CONTENT_UPDATED.aviationCityGuides, CONTENT_PUBLISHED.aviationCityGuides),
  ...stamp(aviationCityGuidePages2, CONTENT_UPDATED.aviationCityGuides2, CONTENT_PUBLISHED.aviationCityGuides2),
  ...stamp(electrocutionCityGuidePages, CONTENT_UPDATED.electrocutionCityGuides, CONTENT_PUBLISHED.electrocutionCityGuides),
  ...stamp(electrocutionCityGuidePages2, CONTENT_UPDATED.electrocutionCityGuides2, CONTENT_PUBLISHED.electrocutionCityGuides2),
  ...stamp(securityForceCityGuidePages, CONTENT_UPDATED.securityForceCityGuides, CONTENT_PUBLISHED.securityForceCityGuides),
  ...stamp(securityForceCityGuidePages2, CONTENT_UPDATED.securityForceCityGuides2, CONTENT_PUBLISHED.securityForceCityGuides2),
  ...stamp(elevatorCityGuidePages, CONTENT_UPDATED.elevatorCityGuides, CONTENT_PUBLISHED.elevatorCityGuides),
  ...stamp(elevatorCityGuidePages2, CONTENT_UPDATED.elevatorCityGuides2, CONTENT_PUBLISHED.elevatorCityGuides2),
  ...stamp(moldHabitabilityCityGuidePages, CONTENT_UPDATED.moldHabitabilityCityGuides, CONTENT_PUBLISHED.moldHabitabilityCityGuides),
  ...stamp(moldHabitabilityCityGuidePages2, CONTENT_UPDATED.moldHabitabilityCityGuides2, CONTENT_PUBLISHED.moldHabitabilityCityGuides2),
  ...stamp(scooterCityGuidePages2, CONTENT_UPDATED.scooterCityGuides2, CONTENT_PUBLISHED.scooterCityGuides2),
  ...stamp(scooterCityGuidePages3, CONTENT_UPDATED.scooterCityGuides3, CONTENT_PUBLISHED.scooterCityGuides3),
  ...stamp(offRoadVehicleCityGuidePages, CONTENT_UPDATED.offRoadVehicleCityGuides, CONTENT_PUBLISHED.offRoadVehicleCityGuides),
  ...stamp(offRoadVehicleCityGuidePages2, CONTENT_UPDATED.offRoadVehicleCityGuides2, CONTENT_PUBLISHED.offRoadVehicleCityGuides2),
  ...stamp(dramShopCityGuidePages, CONTENT_UPDATED.dramShopCityGuides, CONTENT_PUBLISHED.dramShopCityGuides),
  ...stamp(dramShopCityGuidePages2, CONTENT_UPDATED.dramShopCityGuides2, CONTENT_PUBLISHED.dramShopCityGuides2),
  ...stamp(consumerProductCityGuidePages, CONTENT_UPDATED.consumerProductCityGuides, CONTENT_PUBLISHED.consumerProductCityGuides),
  ...stamp(consumerProductCityGuidePages2, CONTENT_UPDATED.consumerProductCityGuides2, CONTENT_PUBLISHED.consumerProductCityGuides2),
  ...stamp(hotelInjuryCityGuidePages, CONTENT_UPDATED.hotelInjuryCityGuides, CONTENT_PUBLISHED.hotelInjuryCityGuides),
  ...stamp(hotelInjuryCityGuidePages2, CONTENT_UPDATED.hotelInjuryCityGuides2, CONTENT_PUBLISHED.hotelInjuryCityGuides2),
  ...stamp(gymInjuryCityGuidePages, CONTENT_UPDATED.gymInjuryCityGuides, CONTENT_PUBLISHED.gymInjuryCityGuides),
  ...stamp(gymInjuryCityGuidePages2, CONTENT_UPDATED.gymInjuryCityGuides2, CONTENT_PUBLISHED.gymInjuryCityGuides2),
  ...stamp(eventCrowdCityGuidePages, CONTENT_UPDATED.eventCrowdCityGuides, CONTENT_PUBLISHED.eventCrowdCityGuides),
  ...stamp(eventCrowdCityGuidePages2, CONTENT_UPDATED.eventCrowdCityGuides2, CONTENT_PUBLISHED.eventCrowdCityGuides2),
  ...stamp(vacationRentalCityGuidePages, CONTENT_UPDATED.vacationRentalCityGuides, CONTENT_PUBLISHED.vacationRentalCityGuides),
  ...stamp(vacationRentalCityGuidePages2, CONTENT_UPDATED.vacationRentalCityGuides2, CONTENT_PUBLISHED.vacationRentalCityGuides2),
  ...stamp(skiResortCityGuidePages, CONTENT_UPDATED.skiResortCityGuides, CONTENT_PUBLISHED.skiResortCityGuides),
  ...stamp(skiResortCityGuidePages2, CONTENT_UPDATED.skiResortCityGuides2, CONTENT_PUBLISHED.skiResortCityGuides2),
  ...stamp(equestrianCityGuidePages, CONTENT_UPDATED.equestrianCityGuides, CONTENT_PUBLISHED.equestrianCityGuides),
  ...stamp(equestrianCityGuidePages2, CONTENT_UPDATED.equestrianCityGuides2, CONTENT_PUBLISHED.equestrianCityGuides2),
  ...stamp(ebikeCityGuidePages, CONTENT_UPDATED.ebikeCityGuides, CONTENT_PUBLISHED.ebikeCityGuides),
  ...stamp(dogBiteCityGuidePages2, CONTENT_UPDATED.dogBiteCityGuides2, CONTENT_PUBLISHED.dogBiteCityGuides2),
  ...stamp(slipAndFallCityGuidePages2, CONTENT_UPDATED.slipAndFallCityGuides2, CONTENT_PUBLISHED.slipAndFallCityGuides2),
  ...stamp(truckAccidentCityGuidePages2, CONTENT_UPDATED.truckAccidentCityGuides2, CONTENT_PUBLISHED.truckAccidentCityGuides2),
  ...stamp(truckAccidentCityGuidePages3, CONTENT_UPDATED.truckAccidentCityGuides3, CONTENT_PUBLISHED.truckAccidentCityGuides3),
  ...stamp(transitCityGuidePages2, CONTENT_UPDATED.transitCityGuides2, CONTENT_PUBLISHED.transitCityGuides2),
  ...stamp(transitCityGuidePages3, CONTENT_UPDATED.transitCityGuides3, CONTENT_PUBLISHED.transitCityGuides3),
  ...stamp(rideshareCityGuidePages3, CONTENT_UPDATED.rideshareCityGuides3, CONTENT_PUBLISHED.rideshareCityGuides3),
  ...stamp(motorcycleCityGuidePages3, CONTENT_UPDATED.motorcycleCityGuides3, CONTENT_PUBLISHED.motorcycleCityGuides3),
  ...stamp(dogBiteCityGuidePages3, CONTENT_UPDATED.dogBiteCityGuides3, CONTENT_PUBLISHED.dogBiteCityGuides3),
  ...stamp(slipAndFallCityGuidePages3, CONTENT_UPDATED.slipAndFallCityGuides3, CONTENT_PUBLISHED.slipAndFallCityGuides3),
  // The Spanish set is dated separately: restamping it with an English content
  // date would claim these pages changed on a day they did not exist.
  ...stamp(landingPagesEs, CONTENT_UPDATED_ES, CONTENT_PUBLISHED_ES),
  // The Chinese set, dated separately for the same reason.
  ...stamp(landingPagesZh, CONTENT_UPDATED_ZH, CONTENT_PUBLISHED_ZH),
]

export const landingPagesBySlug = new Map(allLandingPages.map((page) => [page.slug, page]))

/**
 * The pages this site asks search engines to index.
 *
 * The sitemap builds from this rather than `allLandingPages`, because listing a
 * URL that serves `noindex` sends two contradictory instructions about the same
 * page — the sitemap nominates it as worth indexing and the page refuses. That
 * is the specific mistake that makes thinning look like a bug in the site.
 *
 * Pages excluded here are still routed, still rendered, and still linked from
 * their topic hub. Only the nomination is withdrawn.
 *
 * A function rather than a constant so it reads the flags as they are now. The
 * sitemap rebuilds per request regardless, and a snapshot taken at module load
 * is a quiet way for the two signals to drift apart.
 */
export function indexableLandingPages(): LandingPage[] {
  return allLandingPages.filter((page) => !page.noindex)
}
