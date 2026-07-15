"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/create-full-cases.ts
var import_client = require("@prisma/client");
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_uuid = require("uuid");
var prisma = new import_client.PrismaClient();
var sharp = null;
var PDFDocument = null;
try {
  sharp = require("sharp");
} catch {
}
try {
  PDFDocument = require("pdfkit");
} catch {
}
var ATTORNEY_EMAIL = process.env.ATTORNEY_EMAIL || "sreddy20871@gmail.com";
var ATTORNEY_NAME = (process.env.ATTORNEY_NAME || "").trim();
var NUM_ACTIVE = Number(process.env.NUM_ACTIVE || 6);
var NUM_NEW = Number(process.env.NUM_NEW || 4);
var FORCE = process.env.FORCE === "1";
var SLOT_OFFSET = Number(process.env.SLOT_OFFSET || 0);
var FIRM_NAME = process.env.FIRM_NAME || "Reddy Law Firm";
var FIRM_SLUG = process.env.FIRM_SLUG || "reddy-law-firm";
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password123";
var ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || "S";
var ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || "Reddy";
var LEAD_ATTORNEY_NAME = process.env.LEAD_ATTORNEY_NAME || `${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`;
var CASE_TYPES = [
  "auto",
  "slip_and_fall",
  "dog_bite",
  "medmal",
  "product",
  "nursing_home_abuse",
  "wrongful_death",
  "high_severity_surgery"
];
var NEW_CASE_TYPES = (process.env.NEW_CASE_TYPES ? process.env.NEW_CASE_TYPES.split(",").map((s) => s.trim()).filter(Boolean) : ["auto", "slip_and_fall", "dog_bite", "medmal", "product"]).filter((t) => CASE_TYPES.includes(t));
var CA_COUNTIES = [
  "Los Angeles",
  "Orange",
  "San Diego",
  "San Francisco",
  "Alameda",
  "Riverside",
  "San Bernardino",
  "Santa Clara",
  "Sacramento",
  "Contra Costa"
];
var CA_CITIES = {
  "Los Angeles": ["Los Angeles", "Long Beach", "Glendale", "Pasadena", "Torrance"],
  "Orange": ["Anaheim", "Santa Ana", "Irvine", "Huntington Beach", "Fullerton"],
  "San Diego": ["San Diego", "Chula Vista", "Oceanside", "Escondido", "Carlsbad"],
  "San Francisco": ["San Francisco"],
  "Alameda": ["Oakland", "Fremont", "Hayward", "Berkeley", "Alameda"],
  "Riverside": ["Riverside", "Moreno Valley", "Corona", "Temecula", "Murrieta"],
  "San Bernardino": ["San Bernardino", "Fontana", "Rancho Cucamonga", "Ontario", "Rialto"],
  "Santa Clara": ["San Jose", "Sunnyvale", "Santa Clara", "Mountain View", "Palo Alto"],
  "Sacramento": ["Sacramento", "Elk Grove", "Folsom", "Citrus Heights", "Rancho Cordova"],
  "Contra Costa": ["Concord", "Richmond", "Antioch", "Walnut Creek", "San Ramon"]
};
var FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Priya", "Wei", "Fatima", "Carlos", "Maria", "Emily"];
var LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Nguyen", "Patel", "Kim", "Chen", "Gonzalez", "Ramirez", "Torres"];
var INSURERS = ["State Farm", "Allstate", "Progressive", "GEICO", "Farmers", "Liberty Mutual", "Nationwide", "Mercury", "USAA", "Travelers"];
var HEALTH_PLANS = ["Aetna", "Blue Cross Blue Shield", "Cigna", "Kaiser Permanente", "Anthem", "Health Net"];
var ADJUSTERS = ["Dana Whitfield", "Marcus Reyes", "Priya Nair", "Kevin O'Brien", "Sofia Almeida", "Trevor Banks", "Lena Kowalski", "Andre Dupont"];
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randDate(startYear) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = (/* @__PURE__ */ new Date()).getTime() - 30 * 24 * 3600 * 1e3;
  return new Date(start + Math.random() * (end - start));
}
function money(n) {
  return `$${n.toLocaleString("en-US")}`;
}
function addDays(d, days) {
  return new Date(d.getTime() + days * 24 * 3600 * 1e3);
}
function iso(d) {
  return d.toISOString().split("T")[0];
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}
var TEMPLATES = {
  auto: {
    label: "Auto Accident",
    locations: (city, county) => [`${randInt(100, 9999)} ${rand(["Wilshire Blvd", "Ventura Blvd", "El Camino Real", "Mission St", "Broadway", "Harbor Blvd"])}, ${city}, CA`, `I-${rand(["5", "10", "405", "110", "210", "80"])} near ${city}, ${county} County`],
    narrative: (p, city) => `${p} was lawfully stopped at a red light on ${city}'s surface streets when the defendant, traveling at an unsafe speed and distracted, failed to brake and rear-ended ${p}'s vehicle. The impact pushed ${p}'s car forward several feet. ${p} experienced immediate neck and lower-back pain and was transported by ambulance for evaluation. The defendant was cited by responding officers for following too closely.`,
    fault: "other_party",
    liabilityEvidence: ["Traffic collision report (CHP/PD)", "Independent witness statements", "Vehicle damage photographs", "EDR / black-box data", "Dashcam footage"],
    injuries: [
      { type: "Cervical strain / whiplash", body: "neck", icd: "S13.4XXA", severity: 2 },
      { type: "Lumbar disc herniation", body: "lower back", icd: "M51.26", severity: 3 },
      { type: "Post-concussive headaches", body: "head", icd: "S06.0X0A", severity: 2 }
    ],
    providers: [
      { name: "City General ER", type: "emergency", cpt: "99284", base: 4200 },
      { name: "Advanced Imaging Center (MRI)", type: "imaging", cpt: "72148", base: 2600 },
      { name: "Golden State Orthopedics", type: "specialist", cpt: "99204", base: 1800 },
      { name: "Pacific Physical Therapy", type: "therapy", cpt: "97110", base: 3400 }
    ],
    wantsPolice: true,
    photoScenes: ["Rear-end collision damage", "Vehicle interior / airbag", "Skid marks at intersection"],
    bg: "#1f3a5f"
  },
  slip_and_fall: {
    label: "Slip & Fall (Premises)",
    locations: (city, county) => [`${rand(["SaveMore Grocery", "Harbor Mall", "Bayside Restaurant", "MegaMart", "Sunrise Plaza"])} \u2014 ${city}, CA`, `Common area, ${city}, ${county} County`],
    narrative: (p, city) => `While shopping at a retail premises in ${city}, ${p} slipped on an unmarked spill of liquid that had been left unattended for an extended period with no wet-floor warning signage. ${p} fell violently onto the tile floor, striking the right hip and wrist. Store surveillance confirmed the hazard existed well before the fall and that employees walked past it repeatedly. ${p} required emergency care and follow-up orthopedic treatment.`,
    fault: "premises_owner",
    liabilityEvidence: ["Store surveillance footage", "Incident report", "Witness statements", "Photos of the hazard", "Maintenance / inspection logs"],
    injuries: [
      { type: "Distal radius (wrist) fracture", body: "right wrist", icd: "S52.501A", severity: 3 },
      { type: "Hip contusion", body: "right hip", icd: "S70.01XA", severity: 2 },
      { type: "Lumbar sprain", body: "lower back", icd: "S33.5XXA", severity: 2 }
    ],
    providers: [
      { name: "City General ER", type: "emergency", cpt: "99283", base: 3600 },
      { name: "Radiology Associates (X-ray)", type: "imaging", cpt: "73110", base: 900 },
      { name: "Coastal Orthopedic Group", type: "specialist", cpt: "25607", base: 5200 },
      { name: "Restore PT & Rehab", type: "therapy", cpt: "97140", base: 2800 }
    ],
    wantsPolice: true,
    photoScenes: ["Unmarked wet-floor hazard", "Casted wrist injury", "Bruising to hip"],
    bg: "#5f4b1f"
  },
  dog_bite: {
    label: "Dog Bite / Animal Attack",
    locations: (city, county) => [`Residential sidewalk, ${city}, CA`, `Neighbor's property, ${city}, ${county} County`],
    narrative: (p, city) => `${p} was walking on a public sidewalk in ${city} when the defendant's dog, which had a known history of aggression and was not properly restrained, escaped an unlatched gate and attacked. ${p} sustained multiple deep puncture wounds and lacerations to the arms and leg requiring emergency wound care, sutures, and a course of antibiotics and rabies prophylaxis. Animal Control documented the incident and prior complaints about the same animal.`,
    fault: "dog_owner",
    liabilityEvidence: ["Animal Control report", "Prior complaint records", "Photographs of injuries", "Witness statements", "Emergency room records"],
    injuries: [
      { type: "Multiple puncture wounds", body: "left forearm", icd: "S51.851A", severity: 3 },
      { type: "Laceration requiring sutures", body: "right calf", icd: "S81.811A", severity: 2 },
      { type: "Post-traumatic anxiety", body: "psychological", icd: "F43.10", severity: 2 }
    ],
    providers: [
      { name: "City General ER", type: "emergency", cpt: "99285", base: 5400 },
      { name: "Wound Care & Plastics", type: "specialist", cpt: "12034", base: 3100 },
      { name: "Infectious Disease (rabies ppx)", type: "specialist", cpt: "90675", base: 2900 },
      { name: "Behavioral Health Counseling", type: "therapy", cpt: "90837", base: 1800 }
    ],
    wantsPolice: true,
    photoScenes: ["Puncture wounds to forearm", "Sutured calf laceration", "The unrestrained dog / gate"],
    bg: "#3f1f2f"
  },
  medmal: {
    label: "Medical Malpractice",
    locations: (city, county) => [`${rand(["Mercy Medical Center", "St. Jude Hospital", "Valley Regional Hospital"])} \u2014 ${city}, CA`, `Surgical suite, ${city}, ${county} County`],
    narrative: (p, city) => `During a procedure at a ${city}-area hospital, the treating physician deviated from the accepted standard of care, resulting in an avoidable surgical injury and a delayed diagnosis of the resulting complication. ${p} required corrective surgery, an extended inpatient stay, and prolonged rehabilitation. A retained medical expert has opined that competent care would more likely than not have avoided the injury.`,
    fault: "medical_provider",
    liabilityEvidence: ["Complete medical records", "Operative reports", "Pathology reports", "Retained expert opinion", "Informed-consent documentation"],
    injuries: [
      { type: "Iatrogenic organ injury", body: "abdomen", icd: "S36.90XA", severity: 4 },
      { type: "Post-surgical infection (sepsis)", body: "systemic", icd: "T81.4XXA", severity: 4 },
      { type: "Chronic pain syndrome", body: "abdomen", icd: "G89.28", severity: 3 }
    ],
    providers: [
      { name: "Corrective Surgery (inpatient)", type: "surgery", cpt: "49002", base: 42e3 },
      { name: "ICU / Critical Care", type: "inpatient", cpt: "99291", base: 28e3 },
      { name: "Infectious Disease consult", type: "specialist", cpt: "99223", base: 6200 },
      { name: "Rehabilitation services", type: "therapy", cpt: "97530", base: 7400 }
    ],
    wantsPolice: false,
    photoScenes: ["Surgical incision / scarring", "Hospital inpatient stay", "Imaging of complication"],
    bg: "#123a2f"
  },
  product: {
    label: "Defective Product",
    locations: (city, county) => [`Plaintiff's residence \u2014 ${city}, CA`, `${city}, ${county} County`],
    narrative: (p, city) => `${p} was using a consumer product in ${city} in its ordinary and intended manner when the product failed due to a design and/or manufacturing defect, causing ${rand(["severe burns", "deep lacerations", "an electrical shock", "a crush injury"])}. The manufacturer failed to provide adequate warnings and there were feasible safer alternative designs. ${p} required emergency treatment and specialist follow-up.`,
    fault: "product_manufacturer",
    liabilityEvidence: ["The product itself (preserved)", "Engineering / defect analysis", "Prior recall / complaint history", "Purchase records", "Medical records"],
    injuries: [
      { type: "Second-degree burns", body: "hand & forearm", icd: "T23.201A", severity: 3 },
      { type: "Deep laceration", body: "hand", icd: "S61.411A", severity: 2 },
      { type: "Permanent scarring", body: "forearm", icd: "L90.5", severity: 2 }
    ],
    providers: [
      { name: "Regional Burn Center", type: "specialist", cpt: "16020", base: 14800 },
      { name: "City General ER", type: "emergency", cpt: "99284", base: 3900 },
      { name: "Hand & Reconstructive Surgery", type: "surgery", cpt: "26418", base: 8700 },
      { name: "Occupational Therapy", type: "therapy", cpt: "97535", base: 3200 }
    ],
    wantsPolice: false,
    photoScenes: ["The defective product", "Burn injury to hand", "Product failure point / close-up"],
    bg: "#5f2f10"
  },
  nursing_home_abuse: {
    label: "Nursing Home Abuse / Neglect",
    locations: (city, county) => [`${rand(["Sunset", "Golden Years", "Maple Grove", "Bayview"])} Care Center \u2014 ${city}, CA`, `Skilled nursing facility, ${city}, ${county} County`],
    narrative: (p, city) => `While a resident of a skilled nursing facility in ${city}, ${p}'s family member suffered neglect that fell below mandated care standards, including ${rand(["stage III/IV pressure ulcers (bedsores)", "an unwitnessed fall with fracture", "dehydration and malnutrition", "medication errors"])}. Facility records reflect understaffing and missed care documentation. State inspection findings corroborate a pattern of deficiencies.`,
    fault: "nursing_home",
    liabilityEvidence: ["Facility care records", "State (CDPH) inspection reports", "Photographs", "Staffing records", "Medical records"],
    injuries: [
      { type: "Stage IV pressure ulcer", body: "sacrum", icd: "L89.154", severity: 4 },
      { type: "Dehydration / malnutrition", body: "systemic", icd: "E86.0", severity: 3 },
      { type: "Fall-related hip fracture", body: "hip", icd: "S72.001A", severity: 4 }
    ],
    providers: [
      { name: "Wound Care Center", type: "specialist", cpt: "11043", base: 12600 },
      { name: "Hospital admission", type: "inpatient", cpt: "99223", base: 18900 },
      { name: "Orthopedic (hip repair)", type: "surgery", cpt: "27130", base: 34e3 },
      { name: "Skilled rehab", type: "therapy", cpt: "97110", base: 6100 }
    ],
    wantsPolice: false,
    photoScenes: ["Pressure ulcer documentation", "Facility conditions", "Resident during hospital stay"],
    bg: "#3a2f5f"
  },
  wrongful_death: {
    label: "Wrongful Death",
    locations: (city, county) => [`${rand(["Highway 101", "Intersection of 3rd & Main", "Construction site"])} \u2014 ${city}, CA`, `${city}, ${county} County`],
    narrative: (p, city) => `${p}'s ${rand(["spouse", "parent", "adult child"])} was killed in ${city} due to the defendant's negligence in a ${rand(["multi-vehicle collision", "workplace accident", "pedestrian collision"])}. The decedent is survived by ${p} and dependents who have suffered profound economic and non-economic losses, including loss of financial support, guidance, and companionship. Liability is well documented by the investigating agency.`,
    fault: "other_party",
    liabilityEvidence: ["Death certificate", "Coroner / autopsy report", "Police / agency investigation", "Economic-loss expert report", "Wage & support records"],
    injuries: [
      { type: "Fatal traumatic injuries", body: "multiple", icd: "T07", severity: 4 }
    ],
    providers: [
      { name: "Emergency & trauma response", type: "emergency", cpt: "99285", base: 9800 },
      { name: "Hospital (final admission)", type: "inpatient", cpt: "99223", base: 26500 },
      { name: "Funeral & burial expenses", type: "other", cpt: "N/A", base: 14500 }
    ],
    wantsPolice: true,
    photoScenes: ["Scene of the fatal incident", "Vehicle / site documentation", "Memorial (family exhibit)"],
    bg: "#2a2a2a"
  },
  high_severity_surgery: {
    label: "High-Severity Surgical Injury",
    locations: (city, county) => [`${rand(["Neuro Spine Institute", "Cardiac Center", "Regional Trauma Center"])} \u2014 ${city}, CA`, `${city}, ${county} County`],
    narrative: (p, city) => `${p} underwent a high-acuity ${rand(["spinal fusion", "cardiac", "neurosurgical"])} procedure in ${city} that was complicated by a preventable intraoperative error, resulting in serious permanent impairment. ${p} has required additional surgeries, lengthy hospitalization, and ongoing specialized care, with significant future medical needs and diminished earning capacity.`,
    fault: "medical_provider",
    liabilityEvidence: ["Operative and anesthesia records", "Imaging studies", "Life-care plan", "Retained surgical expert", "Billing ledgers"],
    injuries: [
      { type: "Spinal cord / nerve injury", body: "spine", icd: "S14.109A", severity: 4 },
      { type: "Partial paralysis", body: "lower extremities", icd: "G82.20", severity: 4 },
      { type: "Chronic neuropathic pain", body: "systemic", icd: "G89.4", severity: 4 }
    ],
    providers: [
      { name: "Revision surgery (inpatient)", type: "surgery", cpt: "22633", base: 88e3 },
      { name: "ICU / prolonged stay", type: "inpatient", cpt: "99291", base: 62e3 },
      { name: "Inpatient rehabilitation", type: "therapy", cpt: "97530", base: 24500 },
      { name: "Durable medical equipment", type: "other", cpt: "E1161", base: 9600 }
    ],
    wantsPolice: false,
    photoScenes: ["Surgical hardware imaging", "Extended inpatient care", "Assistive equipment"],
    bg: "#0f2f4f"
  }
};
var LIMITS_BY_TYPE = {
  auto: [5e4, 1e5, 25e4, 3e5],
  slip_and_fall: [1e5, 25e4, 5e5],
  dog_bite: [1e5, 3e5, 5e5],
  product: [5e5, 1e6, 2e6],
  medmal: [1e6, 2e6, 3e6],
  nursing_home_abuse: [5e5, 1e6, 2e6],
  wrongful_death: [1e6, 2e6, 5e6],
  high_severity_surgery: [1e6, 2e6]
};
async function writePhoto(destPath, title, subtitle, lines, bg) {
  if (sharp) {
    try {
      const W = 1e3, H = 750;
      const textLines = lines.map((l, i) => `<text x="60" y="${360 + i * 46}" font-family="Arial, sans-serif" font-size="30" fill="#e8eef6">${esc(l)}</text>`).join("");
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="#0b1220"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#4a5a72" stroke-width="3"/>
  <text x="60" y="120" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#ffffff">${esc(title)}</text>
  <text x="60" y="180" font-family="Arial, sans-serif" font-size="30" fill="#9fb3cc">${esc(subtitle)}</text>
  <line x1="60" y1="210" x2="${W - 60}" y2="210" stroke="#4a5a72" stroke-width="2"/>
  ${textLines}
  <text x="60" y="${H - 60}" font-family="Arial, sans-serif" font-size="24" fill="#7f93ac">${esc(FIRM_NAME)} \u2014 evidence exhibit (demo)</text>
</svg>`;
      await sharp(Buffer.from(svg)).jpeg({ quality: 72 }).toFile(destPath);
      return { mimetype: "image/jpeg", ok: true };
    } catch {
    }
  }
  const txt = destPath.replace(/\.jpg$/, ".txt");
  import_fs.default.writeFileSync(txt, `${title}
${subtitle}

${lines.join("\n")}

${FIRM_NAME} \u2014 evidence exhibit (demo placeholder)
`);
  return { mimetype: "text/plain", ok: false };
}
async function writePdf(destPath, title, subtitle, sections) {
  if (PDFDocument) {
    try {
      await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "LETTER", margin: 54 });
        const stream = import_fs.default.createWriteStream(destPath);
        doc.pipe(stream);
        doc.fontSize(20).fillColor("#0b1220").text(title);
        doc.moveDown(0.2).fontSize(11).fillColor("#555").text(subtitle);
        doc.moveDown(0.5).strokeColor("#cccccc").moveTo(54, doc.y).lineTo(558, doc.y).stroke();
        doc.moveDown(0.6);
        for (const s of sections) {
          if (s.heading) {
            doc.moveDown(0.3).fontSize(13).fillColor("#122a4f").text(s.heading);
            doc.moveDown(0.2);
          }
          doc.fontSize(10.5).fillColor("#222");
          for (const r of s.rows) doc.text(r);
        }
        doc.moveDown(1).fontSize(8).fillColor("#888").text(`This is a demo document generated for the ${FIRM_NAME} sample case book. Not a real medical or legal record.`, { align: "left" });
        doc.end();
        stream.on("finish", () => resolve());
        stream.on("error", reject);
      });
      return { mimetype: "application/pdf", ok: true };
    } catch {
    }
  }
  const txt = destPath.replace(/\.pdf$/, ".txt");
  const body = sections.map((s) => `${s.heading ? s.heading + "\n" : ""}${s.rows.join("\n")}`).join("\n\n");
  import_fs.default.writeFileSync(txt, `${title}
${subtitle}

${body}
`);
  return { mimetype: "text/plain", ok: false };
}
function buildFacts(claimType, county, city, incidentDate, first, last, firmName) {
  const t = TEMPLATES[claimType];
  const plaintiff = `${first} ${last}`;
  const inj = t.injuries;
  const treatment = t.providers.map((p, idx) => {
    const charges = Math.round(p.base * (0.8 + Math.random() * 0.6));
    return {
      date: iso(addDays(incidentDate, idx * randInt(5, 25))),
      provider: p.name,
      type: p.type,
      cpt: p.cpt,
      diagnosis: inj[Math.min(idx, inj.length - 1)]?.type || "Injury evaluation",
      treatment: `${p.type} services`,
      charges
    };
  });
  const medCharges = treatment.reduce((s, x) => s + x.charges, 0);
  const medPaid = Math.round(medCharges * (0.15 + Math.random() * 0.25));
  const futureMedical = ["medmal", "high_severity_surgery", "nursing_home_abuse", "wrongful_death"].includes(claimType) ? Math.round(medCharges * (0.5 + Math.random())) : Math.round(medCharges * Math.random() * 0.4);
  const lostDays = randInt(3, claimType === "high_severity_surgery" || claimType === "wrongful_death" ? 320 : 60);
  const dailyWage = randInt(150, 650);
  const wageLoss = lostDays * dailyWage;
  const propertyDamage = claimType === "auto" ? randInt(3500, 28e3) : claimType === "product" ? randInt(200, 3e3) : 0;
  const policyLimit = rand(LIMITS_BY_TYPE[claimType] || [1e5, 25e4, 5e5]);
  return {
    claimType,
    venue: { state: "CA", county },
    incident: {
      date: iso(incidentDate),
      time: `${randInt(6, 21)}:${String(randInt(0, 59)).padStart(2, "0")}`,
      location: t.locations(city, county)[0],
      city,
      narrative: t.narrative(plaintiff, city),
      parties: [`${plaintiff} (plaintiff)`, "Defendant", ...t.wantsPolice ? ["Investigating agency"] : []],
      weather: rand(["Clear", "Overcast", "Light rain", "Foggy", "Sunny"]),
      policeCalled: t.wantsPolice
    },
    emergencyResponse: {
      nineOneOneCalled: t.wantsPolice,
      responders: t.wantsPolice ? rand([["Police"], ["Police", "EMS/ambulance"], ["Police", "EMS/ambulance", "Fire department"]]) : []
    },
    liability: {
      fault: t.fault,
      comparativeFault: `${randInt(0, 15)}%`,
      evidence: t.liabilityEvidence,
      notes: "Liability well supported; defendant primarily at fault."
    },
    injuries: inj.map((i) => ({ type: i.type, bodyPart: i.body, icd10: i.icd, severity: i.severity, diagnosed: true, ongoing: i.severity >= 3, date: iso(incidentDate) })),
    treatment,
    damages: {
      med_charges: medCharges,
      med_paid: medPaid,
      med_charges_source: "documented",
      future_medical: futureMedical,
      wage_loss: wageLoss,
      lost_days: lostDays,
      daily_wage: dailyWage,
      estimated_property_damage: propertyDamage,
      services: randInt(500, 4e3),
      pain_suffering_narrative: "Ongoing pain, limited activities of daily living, sleep disruption, and emotional distress."
    },
    insurance: {
      at_fault_party: rand(INSURERS),
      policy_limit: policyLimit,
      own_insurance: rand(INSURERS),
      uninsured: Math.random() < 0.1,
      um_uim: Math.random() < 0.5,
      pip_coverage: Math.random() < 0.3,
      plaintiff_auto_carrier: claimType === "auto" ? rand(INSURERS) : null,
      health_coverage: rand(HEALTH_PLANS),
      other_party_insured: Math.random() < 0.85
    },
    plaintiffContext: {
      age: randInt(19, 84),
      occupation: rand(["Teacher", "Driver", "Nurse", "Engineer", "Retail associate", "Contractor", "Retired", "Student", "Accountant", "Chef"]),
      priorInjuries: Math.random() < 0.2 ? "Minor prior history, unrelated" : "None relevant",
      household: rand(["Single", "Married", "Married w/ children", "Supports dependents"])
    },
    caseTypeValidation: { validatedType: claimType, confidence: Number((0.8 + Math.random() * 0.2).toFixed(2)) },
    consents: { tos: true, privacy: true, ml_use: true, hipaa: true },
    firm: { name: firmName, routedTo: firmName, jurisdiction: "CA" }
  };
}
async function attachEvidence(params) {
  const { userId, assessmentId, claimType, uploadDir, plaintiff, incidentDate, facts, caseLabel } = params;
  const t = TEMPLATES[claimType];
  const scenes = t.photoScenes;
  for (let s = 0; s < scenes.length; s++) {
    const base = `${claimType}-photo-${s + 1}.jpg`;
    const finalName = `${(0, import_uuid.v4)()}-${base}`;
    const finalPath = import_path.default.join(uploadDir, finalName);
    const res = await writePhoto(finalPath, scenes[s], `${caseLabel} \u2022 ${plaintiff}`, [
      `Incident date: ${iso(incidentDate)}`,
      `Location: ${facts.incident.location}`,
      `Exhibit ${s + 1} of ${scenes.length}`
    ], t.bg);
    const actualPath = res.ok ? finalPath : finalPath.replace(/\.jpg$/, ".txt");
    const actualName = import_path.default.basename(actualPath);
    const stats = import_fs.default.statSync(actualPath);
    await prisma.evidenceFile.create({
      data: {
        userId,
        assessmentId,
        originalName: res.ok ? base : base.replace(/\.jpg$/, ".txt"),
        filename: actualName,
        mimetype: res.mimetype,
        size: stats.size,
        filePath: actualPath,
        fileUrl: `/uploads/evidence/${actualName}`,
        category: "photos",
        subcategory: s === 1 ? "injury_photo" : "scene_photo",
        description: `${t.label} \u2014 ${scenes[s]}`,
        dataType: "unstructured",
        tags: JSON.stringify([claimType, "photos"]),
        relevanceScore: Number((0.75 + Math.random() * 0.25).toFixed(2)),
        uploadMethod: "camera",
        captureDate: incidentDate,
        location: "CA",
        processingStatus: "completed",
        aiSummary: `${scenes[s]} documented for ${plaintiff}.`,
        isHIPAA: s === 1,
        accessLevel: "attorney",
        isVerified: true,
        verifiedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  const billRows = facts.treatment.map((tr) => `${tr.date}   ${tr.provider.padEnd(34).slice(0, 34)}  CPT ${tr.cpt}   ${money(tr.charges)}`);
  const totalCharges = facts.damages.med_charges;
  const billName = `${claimType}-medical-bill.pdf`;
  const billFinal = `${(0, import_uuid.v4)()}-${billName}`;
  const billPath = import_path.default.join(uploadDir, billFinal);
  const billRes = await writePdf(billPath, "ITEMIZED MEDICAL BILL / STATEMENT", `${caseLabel} \u2022 Patient: ${plaintiff} \u2022 DOI: ${iso(incidentDate)}`, [
    { heading: "Charges", rows: [...billRows, "", `TOTAL BILLED: ${money(totalCharges)}`, `AMOUNT PAID/ADJUSTED: ${money(facts.damages.med_paid)}`, `BALANCE: ${money(totalCharges - facts.damages.med_paid)}`] },
    { heading: "Diagnosis Codes (ICD-10)", rows: facts.injuries.map((i) => `${i.icd10}  ${i.type}`) }
  ]);
  const billActual = billRes.ok ? billPath : billPath.replace(/\.pdf$/, ".txt");
  const billActualName = import_path.default.basename(billActual);
  const billStats = import_fs.default.statSync(billActual);
  const billEv = await prisma.evidenceFile.create({
    data: {
      userId,
      assessmentId,
      originalName: billRes.ok ? billName : billName.replace(/\.pdf$/, ".txt"),
      filename: billActualName,
      mimetype: billRes.mimetype,
      size: billStats.size,
      filePath: billActual,
      fileUrl: `/uploads/evidence/${billActualName}`,
      category: "bills",
      subcategory: "medical_bill",
      description: `${t.label} \u2014 itemized medical bill`,
      dataType: "structured",
      tags: JSON.stringify([claimType, "bills", "medical"]),
      relevanceScore: 0.95,
      uploadMethod: "file_picker",
      processingStatus: "completed",
      ocrText: [`ITEMIZED MEDICAL BILL \u2014 ${plaintiff}`, ...billRows, `TOTAL BILLED: ${money(totalCharges)}`].join("\n"),
      aiSummary: `Documented medical specials totaling ${money(totalCharges)} across ${facts.treatment.length} providers.`,
      isHIPAA: true,
      accessLevel: "attorney",
      isVerified: true,
      verifiedAt: /* @__PURE__ */ new Date()
    }
  });
  await prisma.extractedData.create({
    data: {
      evidenceFileId: billEv.id,
      icdCodes: JSON.stringify(facts.injuries.map((i) => i.icd10)),
      cptCodes: JSON.stringify(facts.treatment.map((tr) => tr.cpt).filter((c) => c && c !== "N/A")),
      dollarAmounts: JSON.stringify(facts.treatment.map((tr) => tr.charges)),
      totalAmount: totalCharges,
      currency: "USD",
      dates: JSON.stringify(facts.treatment.map((tr) => tr.date)),
      entities: JSON.stringify({ patient: plaintiff, providers: facts.treatment.map((tr) => tr.provider) }),
      keywords: JSON.stringify(["medical bill", "itemized", "specials"]),
      confidence: 0.93
    }
  });
  const recName = `${claimType}-medical-records.pdf`;
  const recFinal = `${(0, import_uuid.v4)()}-${recName}`;
  const recPath = import_path.default.join(uploadDir, recFinal);
  const recRes = await writePdf(recPath, "MEDICAL RECORDS SUMMARY", `${caseLabel} \u2022 Patient: ${plaintiff}`, [
    { heading: "History of Present Illness", rows: [facts.incident.narrative] },
    { heading: "Assessment", rows: facts.injuries.map((i) => `${i.type} (${i.bodyPart}) \u2014 ICD-10 ${i.icd10}, severity ${i.severity}/4`) },
    { heading: "Treatment Plan", rows: facts.treatment.map((tr) => `${tr.date}: ${tr.provider} \u2014 ${tr.treatment}`) }
  ]);
  const recActual = recRes.ok ? recPath : recPath.replace(/\.pdf$/, ".txt");
  const recActualName = import_path.default.basename(recActual);
  const recStats = import_fs.default.statSync(recActual);
  await prisma.evidenceFile.create({
    data: {
      userId,
      assessmentId,
      originalName: recRes.ok ? recName : recName.replace(/\.pdf$/, ".txt"),
      filename: recActualName,
      mimetype: recRes.mimetype,
      size: recStats.size,
      filePath: recActual,
      fileUrl: `/uploads/evidence/${recActualName}`,
      category: "medical_records",
      subcategory: "clinical_summary",
      description: `${t.label} \u2014 medical records summary`,
      dataType: "unstructured",
      tags: JSON.stringify([claimType, "medical_records"]),
      relevanceScore: 0.9,
      uploadMethod: "file_picker",
      processingStatus: "completed",
      aiSummary: `Clinical summary documenting ${facts.injuries.length} injuries and ${facts.treatment.length} treatment encounters.`,
      isHIPAA: true,
      accessLevel: "attorney",
      isVerified: true,
      verifiedAt: /* @__PURE__ */ new Date()
    }
  });
  if (t.wantsPolice) {
    const polName = `${claimType}-incident-report.pdf`;
    const polFinal = `${(0, import_uuid.v4)()}-${polName}`;
    const polPath = import_path.default.join(uploadDir, polFinal);
    const polRes = await writePdf(polPath, "INVESTIGATING AGENCY / INCIDENT REPORT", `${caseLabel} \u2022 ${iso(incidentDate)}`, [
      { heading: "Summary", rows: [facts.incident.narrative] },
      { heading: "Findings", rows: [`Primary fault: defendant`, `Comparative fault (plaintiff): ${facts.liability.comparativeFault}`, `Weather: ${facts.incident.weather}`, `Location: ${facts.incident.location}`] },
      { heading: "Evidence Collected", rows: facts.liability.evidence }
    ]);
    const polActual = polRes.ok ? polPath : polPath.replace(/\.pdf$/, ".txt");
    const polActualName = import_path.default.basename(polActual);
    const polStats = import_fs.default.statSync(polActual);
    await prisma.evidenceFile.create({
      data: {
        userId,
        assessmentId,
        originalName: polRes.ok ? polName : polName.replace(/\.pdf$/, ".txt"),
        filename: polActualName,
        mimetype: polRes.mimetype,
        size: polStats.size,
        filePath: polActual,
        fileUrl: `/uploads/evidence/${polActualName}`,
        category: "police_report",
        subcategory: "incident_report",
        description: `${t.label} \u2014 incident report`,
        dataType: "unstructured",
        tags: JSON.stringify([claimType, "police_report"]),
        relevanceScore: 0.88,
        uploadMethod: "file_picker",
        processingStatus: "completed",
        aiSummary: "Investigating agency report supporting liability.",
        accessLevel: "attorney",
        isVerified: true,
        verifiedAt: /* @__PURE__ */ new Date()
      }
    });
  }
}
async function loadEngine() {
  const candidates = ["./dist/lib/prediction.js", "../dist/lib/prediction.js", "./lib/prediction.js", "../src/lib/prediction", "./src/lib/prediction"];
  for (const candidate of candidates) {
    try {
      const imported = await import(candidate);
      const mod = imported?.computeFeatures ? imported : imported?.default ?? imported;
      if (mod?.computeFeatures && mod?.predictViabilityHeuristic) return mod;
    } catch {
    }
  }
  return null;
}
async function addPrediction(engine, assessmentId) {
  if (!engine) return;
  const a = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, claimType: true, venueState: true, venueCounty: true, facts: true }
  });
  if (!a) return;
  try {
    const features = engine.computeFeatures(a);
    const resp = engine.predictViabilityHeuristic(features);
    await prisma.prediction.create({
      data: {
        assessmentId: a.id,
        modelVersion: resp.modelVersion,
        viability: JSON.stringify(resp.viability),
        bands: JSON.stringify(resp.value_bands),
        explain: JSON.stringify(resp.explainability)
      }
    });
    const v = resp.viability || {};
    await prisma.leadSubmission.updateMany({
      where: { assessmentId: a.id },
      data: { viabilityScore: clamp01(v.overall), liabilityScore: clamp01(v.liability), causationScore: clamp01(v.causation), damagesScore: clamp01(v.damages) }
    });
  } catch (err) {
    console.warn(`  ! prediction failed for ${assessmentId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
async function addInsurance(assessmentId, facts) {
  const existing = await prisma.insuranceDetail.findFirst({ where: { assessmentId } });
  if (existing) return;
  await prisma.insuranceDetail.create({
    data: {
      assessmentId,
      carrierName: facts.insurance?.at_fault_party || rand(INSURERS),
      policyLimit: Number(facts.insurance?.policy_limit) || 1e5,
      policyNumber: `POL-${Math.floor(1e5 + Math.random() * 899999)}`,
      claimNumber: `CLM-${Math.floor(1e5 + Math.random() * 899999)}`,
      adjusterName: rand(ADJUSTERS),
      insuredParty: "defendant",
      coverageType: "liability",
      claimStatus: "open",
      claimOpenedAt: /* @__PURE__ */ new Date(),
      coverageConfirmed: true,
      notes: "Coverage confirmed via dec page (demo book)."
    }
  });
}
async function routeCase(params) {
  const { assessmentId, attorneyId, firmId, officeId, adminUserId, pending, firmName, claimType } = params;
  const lifecycleState = pending ? "attorney_matched" : rand(["attorney_matched", "consultation_scheduled", "engaged"]);
  const status = pending ? "submitted" : lifecycleState === "engaged" ? "retained" : lifecycleState === "consultation_scheduled" ? "consulted" : "contacted";
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { lawFirmId: firmId ?? void 0, officeId: officeId ?? void 0, status: "COMPLETED" }
  });
  if (pending) {
    const requestedAt = new Date(Date.now() - randInt(1, 18) * 60 * 1e3);
    await prisma.introduction.create({ data: { assessmentId, attorneyId, status: "PENDING", message: `New match routed to ${firmName}.`, requestedAt, waveNumber: 1 } });
  } else {
    await prisma.introduction.create({ data: { assessmentId, attorneyId, status: "ACCEPTED", message: `Assigned to ${firmName}.`, respondedAt: /* @__PURE__ */ new Date(), waveNumber: 1 } });
  }
  await prisma.leadSubmission.upsert({
    where: { assessmentId },
    update: { assignedAttorneyId: attorneyId, assignmentType: "exclusive", status, lifecycleState, routingLocked: !pending },
    create: {
      assessmentId,
      viabilityScore: Number((0.55 + Math.random() * 0.4).toFixed(2)),
      liabilityScore: Number((0.6 + Math.random() * 0.4).toFixed(2)),
      causationScore: Number((0.55 + Math.random() * 0.4).toFixed(2)),
      damagesScore: Number((0.5 + Math.random() * 0.45).toFixed(2)),
      sourceType: rand(["organic_search", "referral", "paid_ad", "direct"]),
      hotnessLevel: rand(["hot", "warm"]),
      assignedAttorneyId: attorneyId,
      assignmentType: "exclusive",
      status,
      lifecycleState,
      routingLocked: !pending,
      evidenceChecklist: JSON.stringify({ photos: true, bills: true, medical_records: true, police_report: TEMPLATES[claimType].wantsPolice })
    }
  });
  if (!pending && firmId) {
    try {
      await prisma.firmCaseAssignment.create({
        data: {
          lawFirmId: firmId,
          assessmentId,
          assignedAttorneyId: attorneyId,
          assignedUserId: adminUserId ?? void 0,
          role: "lead_attorney",
          status: "active",
          assignedById: adminUserId ?? void 0,
          notes: "Lead attorney assignment."
        }
      });
    } catch {
    }
  }
}
async function contextFor(att) {
  let firmId = att.lawFirmId ?? null;
  let officeId = null;
  let firmName = "the firm";
  if (firmId) {
    const firm = await prisma.lawFirm.findUnique({ where: { id: firmId }, select: { name: true } });
    firmName = firm?.name ?? firmName;
    const office = await prisma.firmOffice.findFirst({ where: { lawFirmId: firmId }, select: { id: true } });
    officeId = office?.id ?? null;
  }
  const adminUser = att.email ? await prisma.user.findFirst({ where: { email: { equals: att.email, mode: "insensitive" } }, select: { id: true } }) : null;
  return { attorneyId: att.id, attorneyName: att.name, attorneyEmail: att.email, firmId, officeId, firmName, adminUserId: adminUser?.id ?? null, created: false };
}
async function resolveByName(name) {
  const matches = await prisma.attorney.findMany({
    where: { name: { contains: name, mode: "insensitive" } },
    select: { id: true, name: true, email: true, lawFirmId: true },
    orderBy: { createdAt: "asc" }
  });
  if (matches.length === 0) {
    throw new Error(`No attorney found matching name "${name}". Pass ATTORNEY_EMAIL to create one, or check the spelling.`);
  }
  if (matches.length > 1) {
    console.log(`Multiple attorneys match "${name}":`);
    matches.forEach((m) => console.log(`  - ${m.name} <${m.email || "no-email"}> (${m.id})`));
    console.log(`Using the first: ${matches[0].name}. Narrow ATTORNEY_NAME or use ATTORNEY_EMAIL to target a specific one.`);
  }
  return contextFor(matches[0]);
}
async function ensureAttorney(email) {
  const existing = await prisma.attorney.findFirst({
    where: { OR: [{ email }, { email: email.toLowerCase() }, { email: email.toUpperCase() }] },
    select: { id: true, name: true, email: true, lawFirmId: true }
  });
  if (existing) {
    return contextFor(existing);
  }
  console.log(`No attorney found for ${email} \u2014 creating firm "${FIRM_NAME}", login user, and attorney...`);
  const specialties = [...CASE_TYPES];
  const firm = await prisma.lawFirm.upsert({
    where: { slug: FIRM_SLUG },
    update: { name: FIRM_NAME, state: "CA", city: "Los Angeles", isPublic: true, practiceAreas: JSON.stringify(specialties) },
    create: {
      name: FIRM_NAME,
      slug: FIRM_SLUG,
      primaryEmail: email,
      phone: "(213) 555-0100",
      city: "Los Angeles",
      state: "CA",
      zip: "90017",
      tagline: "California personal injury advocates",
      description: `${FIRM_NAME} represents injured Californians across auto, premises, medical malpractice, product liability, elder abuse, and wrongful death matters.`,
      practiceAreas: JSON.stringify(specialties),
      isPublic: true
    }
  });
  const office = await prisma.firmOffice.findFirst({ where: { lawFirmId: firm.id } }) ?? await prisma.firmOffice.create({
    data: {
      lawFirmId: firm.id,
      name: "Los Angeles HQ",
      city: "Los Angeles",
      state: "CA",
      address: "600 Wilshire Blvd, Suite 1500",
      phone: "(213) 555-0100",
      countiesServed: JSON.stringify(CA_COUNTIES),
      languages: JSON.stringify(["English", "Spanish"]),
      practiceAreas: JSON.stringify(specialties),
      capacity: 500,
      isActive: true
    }
  });
  const passwordHash = await import_bcryptjs.default.hash(ADMIN_PASSWORD, 12);
  const adminUser = await prisma.user.upsert({
    where: { email },
    update: { role: "attorney", isActive: true, emailVerified: true },
    create: {
      email,
      passwordHash,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      phone: "(213) 555-0100",
      role: "attorney",
      isActive: true,
      emailVerified: true,
      provider: "local"
    }
  });
  const attorney = await prisma.attorney.create({
    data: {
      name: LEAD_ATTORNEY_NAME,
      email,
      phone: "(213) 555-0100",
      specialties: JSON.stringify(specialties),
      venues: JSON.stringify(["CA"]),
      isActive: true,
      isVerified: true,
      claimStatus: "claimed",
      claimedByUserId: adminUser.id,
      claimedAt: /* @__PURE__ */ new Date(),
      responseTimeHours: 4,
      averageRating: 4.8,
      totalReviews: 42,
      lawFirmId: firm.id
    }
  });
  await prisma.attorneyProfile.upsert({
    where: { attorneyId: attorney.id },
    update: { firmName: FIRM_NAME },
    create: {
      attorneyId: attorney.id,
      bio: `${LEAD_ATTORNEY_NAME} leads ${FIRM_NAME}'s California personal injury practice.`,
      specialties: JSON.stringify(specialties),
      languages: JSON.stringify(["English", "Spanish"]),
      yearsExperience: 12,
      totalCases: 320,
      totalSettlements: 185e5,
      averageSettlement: 165e3,
      successRate: 90,
      firmName: FIRM_NAME,
      jurisdictions: JSON.stringify([{ state: "CA", counties: CA_COUNTIES, cities: [] }]),
      verifiedVerdicts: JSON.stringify([]),
      totalReviews: 42,
      averageRating: 4.8
    }
  });
  await prisma.attorneyDashboard.upsert({
    where: { attorneyId: attorney.id },
    update: {},
    create: {
      attorneyId: attorney.id,
      leadFilters: JSON.stringify({ caseTypes: specialties, venues: ["CA"] }),
      exclusivitySettings: JSON.stringify({ preferredAssignment: "exclusive" }),
      pricingModel: "per_retainer"
    }
  });
  await prisma.firmMember.upsert({
    where: { lawFirmId_userId: { lawFirmId: firm.id, userId: adminUser.id } },
    update: { attorneyId: attorney.id, role: "firm_admin", officeId: office.id, status: "active" },
    create: {
      lawFirmId: firm.id,
      userId: adminUser.id,
      attorneyId: attorney.id,
      officeId: office.id,
      role: "firm_admin",
      title: "Managing Partner",
      status: "active",
      joinedAt: /* @__PURE__ */ new Date()
    }
  });
  console.log(`Created attorney "${attorney.name}" (${attorney.id}) \u2014 login: ${email} / ${ADMIN_PASSWORD}`);
  return { attorneyId: attorney.id, attorneyName: attorney.name, attorneyEmail: email, firmId: firm.id, officeId: office.id, firmName: FIRM_NAME, adminUserId: adminUser.id, created: true };
}
async function main() {
  const target = ATTORNEY_NAME ? `name "${ATTORNEY_NAME}"` : `"${ATTORNEY_EMAIL}"`;
  console.log(`
=== Creating FULL cases for attorney ${target} (${NUM_ACTIVE} active + ${NUM_NEW} new matches) ===`);
  console.log(`Image generation: ${sharp ? "sharp (JPEG)" : "TEXT fallback"} | PDF generation: ${PDFDocument ? "pdfkit (PDF)" : "TEXT fallback"}`);
  const resolved = ATTORNEY_NAME ? await resolveByName(ATTORNEY_NAME) : await ensureAttorney(ATTORNEY_EMAIL);
  const email = resolved.attorneyEmail || ATTORNEY_EMAIL;
  const attorney = { id: resolved.attorneyId, name: resolved.attorneyName };
  const { firmId, officeId, firmName } = resolved;
  const emailNs = (process.env.EMAIL_NS || resolved.attorneyEmail?.split("@")[0] || resolved.attorneyName || "full-cases").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const adminUser = resolved.adminUserId ? { id: resolved.adminUserId } : null;
  console.log(`Attorney: ${attorney.name} (${attorney.id})${resolved.created ? " [newly created]" : ""}`);
  console.log(`Firm: ${firmId ? `${firmName} (${firmId})` : "none \u2014 cases attach to the attorney directly"}${officeId ? `, office ${officeId}` : ""}`);
  const existingCount = await prisma.leadSubmission.count({ where: { assignedAttorneyId: attorney.id } });
  const existingIntros = await prisma.introduction.count({ where: { attorneyId: attorney.id } });
  if ((existingCount > 0 || existingIntros > 0) && !FORCE) {
    console.log(`
Attorney already has ${existingCount} lead submission(s) and ${existingIntros} introduction(s).`);
    console.log(`Refusing to add more without FORCE=1 (avoids accidental duplicates). Re-run with FORCE=1 to proceed anyway.`);
    process.exit(0);
  }
  const uploadDir = import_path.default.join(process.cwd(), "uploads", "evidence");
  import_fs.default.mkdirSync(uploadDir, { recursive: true });
  const engine = await loadEngine();
  console.log(`Valuation engine: ${engine ? "loaded (Est. Value + viability will populate)" : "NOT found \u2014 cases created without predictions"}
`);
  const total = NUM_ACTIVE + NUM_NEW;
  let created = 0;
  for (let n = 0; n < total; n++) {
    const pending = n >= NUM_ACTIVE;
    const claimType = NEW_CASE_TYPES[n % NEW_CASE_TYPES.length];
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    const county = rand(CA_COUNTIES);
    const city = rand(CA_CITIES[county]);
    const incidentDate = randDate(2023);
    const plaintiff = `${first} ${last}`;
    const slot = n + 1 + SLOT_OFFSET;
    const caseLabel = `${TEMPLATES[claimType].label} #${slot}`;
    const plaintiffEmail = `plaintiff.${emailNs}.${slot}@${emailNs}-demo.clearcaseiq.test`;
    const user = await prisma.user.upsert({
      where: { email: plaintiffEmail },
      update: {},
      create: {
        email: plaintiffEmail,
        firstName: first,
        lastName: last,
        phone: `(213) 555-${String(randInt(1e3, 9999))}`,
        role: "client",
        isActive: true,
        emailVerified: true
      }
    });
    const already = await prisma.assessment.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (already) {
      console.log(`  slot ${slot}: already seeded (${plaintiffEmail}) \u2014 skipping`);
      continue;
    }
    const facts = buildFacts(claimType, county, city, incidentDate, first, last, firmName);
    const assessment = await prisma.assessment.create({
      data: {
        userId: user.id,
        claimType,
        venueState: "CA",
        venueCounty: county,
        status: "COMPLETED",
        facts: JSON.stringify(facts),
        lawFirmId: firmId ?? void 0,
        officeId: officeId ?? void 0
      }
    });
    await attachEvidence({ userId: user.id, assessmentId: assessment.id, claimType, uploadDir, plaintiff, incidentDate, facts, caseLabel });
    await routeCase({ assessmentId: assessment.id, attorneyId: attorney.id, firmId, officeId, adminUserId: adminUser?.id ?? null, pending, firmName, claimType });
    await addPrediction(engine, assessment.id);
    await addInsurance(assessment.id, facts);
    created++;
    console.log(`  slot ${slot}: ${pending ? "NEW MATCH" : "ACTIVE   "}  ${TEMPLATES[claimType].label.padEnd(30)} ${plaintiff} (${county} County)`);
  }
  console.log(`
=== Done. Created ${created} fully-populated case(s) for ${email}. ===`);
  console.log(`Each has evidence (photos + bill + records${""}), an InsuranceDetail (policy limit), and a valuation Prediction.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
