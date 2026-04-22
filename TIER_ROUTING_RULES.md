# Tier 1, Tier 2, Tier 3 & Tier 4 Routing Rules - Exact Specification

This document provides the exact rules for Tier 1-4 case routing as implemented in the codebase.

---

## TIER 1 ROUTING RULES

### Tier 1 Case Definition

A case qualifies as **Tier 1** if **ALL** of the following conditions are met:

1. **Claim Type**: Must be one of:
   - `auto_minor`
   - `premises_minor`
   - `dog_bite_minor`

2. **Injury Severity Score**: Must be **≤ 1** (0-4 scale)
   - Calculated as: `max(injuries[].severity, med_charges > $5k ? 1 : 0)`

3. **No Surgery**: Must **NOT** have any surgery
   - Check: `treatment[].surgery === true` must be false for all treatments

4. **Medical Paid**: Must be **< $10,000**
   - Check: `damages.med_paid < 10000`

5. **No Catastrophic Flags**:
   - No permanent disability: `injuries[].permanent === true` must be false for all
   - Medical charges: `damages.med_charges < $50,000`

6. **Venue Supported**: State must be in supported states list
   - Supported states: `CA`, `NY`, `TX`, `FL`, `IL`, `PA`, `OH`, `GA`, `NC`, `MI`

---

### Tier 1 Routing Configuration

- **Subscription Timeout**: 45 seconds
- **Fixed-Price Timeout**: 30 seconds
- **Max Subscription Attempts**: 3
- **Max Fixed-Price Attempts**: 5
- **Max Simultaneous Offers**: 1 (Critical safeguard - no mass blasting)
- **Fixed Price**: $200 (configurable)

---

### Tier 1 Routing Steps

#### STEP 0: Build Eligible Firm Pool

A firm is eligible if **ALL** of the following are true:

1. **Active**: `firm.active === true` AND `attorney.isActive === true`
2. **Verified**: `attorney.isVerified === true`
3. **State Coverage**: Firm's jurisdictions include the case state
   - Check: `jurisdictions[].state` includes `case.venueState`
4. **Practice Area**: Firm's specialties include the case claim type
   - Check: `specialties[]` includes `case.claimType`
5. **Tier 1 Enabled**: One of:
   - `subscriptionTier` includes "Tier1" OR
   - `pricingModel === 'fixed_price'` OR `pricingModel === 'both'` OR
   - `paymentModel === 'pay_per_case'` OR `paymentModel === 'both'`
6. **Daily Cap**: `dailyCapRemaining > 0`
   - Calculated as: `dailyCap = ceil(maxCasesPerWeek / 5)` minus `casesToday`
7. **Account Balance OR Subscription**: 
   - `accountBalance > 0` OR `subscriptionActive === true`

**If pool is empty** → Mark case as `TIER1_HOLD` (Inventory Hold)

---

#### STEP 1: Subscription Allocation (FIRST PRIORITY)

**Subscription Eligibility Rules:**
A firm is eligible for Tier 1 subscription routing if:
- `subscriptionActive === true`
- `subscriptionTier` includes "Tier1" OR `subscriptionTier === 'basic'`
- `subscriptionRemainingCases > 0`

**Subscription Ranking Formula:**
```
rankScore = 
  (normalizedRemainingCases) +
  (historicalAcceptanceRate * 0.4) +
  (responseSpeedScore * 0.3) +
  (recentConversionScore * 0.3)

where normalizedRemainingCases = min(subscriptionRemainingCases / 100, 1)
```

**Routing Logic:**
1. Filter eligible subscription firms
2. Rank by `rankScore` (descending)
3. Select TOP 1 firm
4. Send exclusive offer
5. Wait 45 seconds for response
6. If accepted → Decrement `subscriptionRemainingCases`, route case → **DONE**
7. If declined/timeout → Move to next subscription firm
8. After max 3 subscription attempts → Fall through to fixed-price

---

#### STEP 2: Fixed-Price Routing

**Fixed-Price Rules:**
- Fixed price: $200 per case
- Max exposure: 5 firms
- Sequential routing (one at a time)

**Fixed-Price Ranking Formula:**
```
rankScore = 
  (historicalAcceptanceRate * 0.35) +
  (responseSpeedScore * 0.25) +
  (recentTier1ConversionRate * 0.25) +
  (accountBalanceWeight * 0.15)
```

**Routing Logic:**
1. Filter out subscription firms (they already had their chance)
2. Rank remaining eligible firms by `rankScore` (descending)
3. Take top 5 firms
4. For each firm (sequential):
   - Send offer
   - Wait 30 seconds
   - If accepted → Charge firm, route case → **DONE** (break loop)
   - If declined/timeout → Move to next firm
5. After max 5 fixed-price attempts → Failover

---

#### STEP 3: Failover Logic

If no firm accepts after:
- 3 subscription attempts
- 5 fixed-price attempts

Then:
- Mark case as: `status = "TIER1_HOLD"`
- Case is eligible for:
  - Later routing
  - Bundling
  - Discount routing

---

### Tier 1 Global Safeguards

1. **No Mass Blast Rule**: `MAX_SIMULTANEOUS_OFFERS = 1`
   - ❌ Never send Tier 1 to multiple firms at once
   - ❌ Never expose to more than 5 firms total

2. **Firm Caps**: 
   - Daily cap: Derived from `maxCasesPerWeek / 5` (assumes 5 days/week)
   - Enforced in STEP 0 eligibility check

3. **Anti-Gaming Protection**: (Structure in place)
   - If `firm.accepts > X but converts < Y` → downgrade ranking
   - Currently implemented via ranking metrics

4. **Price Protection**: (Structure in place)
   - If Tier 1 acceptance rate < threshold → auto-adjust price
   - Currently uses fixed $200 price

---

## TIER 2 ROUTING RULES

### Tier 2 Objectives

Goal: assign the case quickly to a qualified firm at a predictable price while
preserving fairness and avoiding PII overexposure.

Primary constraints:
- Correct jurisdiction + practice fit
- Firm capacity / preferences
- Response speed
- Fairness (avoid “always the biggest firm wins”)
- Compliance: progressive disclosure (no PII in offers)

---

### Tier 2 Case Definition

A case qualifies as **Tier 2** if **ALL** of the following conditions are met:

1. **Estimated Settlement Value**: **$25,000 - $100,000**
   - Check: `25000 <= estimatedValue <= 100000`
2. **Injury Severity Score**: Typically 2-3 (can be lower)
   - `max(injuries[].severity, med_charges > $25k ? 2 : 1)`
3. **Surgery**: Allowed (minor surgery is OK)
4. **Medical Paid**: **≤ $50,000**
5. **No Catastrophic Flags**:
   - No permanent disability
   - `damages.med_charges < $100,000`
6. **Venue Supported**: State in supported list

---

### Tier 2 Pricing (single model)

Base price: **$300** (configurable)

Modifiers:
- **+ $50** if docs included (police report / med bills / photos)
- **+ $50** if liability score > 0.70
- **- $50** if timeSinceIncidentDays > 180

Auctions are only a fallback (Phase C).

---

### Eligibility Filter (hard rules)

A firm is eligible only if **ALL** are true:

1. **Jurisdiction match**
   - `state ∈ firm.licensedStates`
   - If county targeting enabled: `county ∈ firm.countiesServed`
2. **Practice match**
   - `caseType ∈ firm.practiceAreas`
3. **Tier enabled**
   - `tier2Enabled === true`
4. **Capacity**
   - `capacity.openSlots > 0`
   - Not over daily/weekly caps
5. **Commercial eligibility**
   - Subscription phase: `subscription.active && subscriptionRemaining > 0`
   - Fixed-price phase: `fixedEnabled && maxPriceByTier >= price`
   - Auction phase: `auctionEnabled && maxPriceByTier >= price`

If < 5 eligible firms, expand in this order:
- Allow statewide firms
- Allow adjacent counties
- Allow “general PI” mapping (if configured)

---

### Ranking Score

```
score =
  0.35 * norm(acceptanceRate30d) +
  0.25 * norm(1 / avgTimeToAcceptSeconds30d) +
  0.25 * norm(qualityScore30d) +
  0.15 * norm(capacity.openSlots)
```

Guardrails:
- **Anti-monopoly**: if firm won > X% of Tier 2 in last 7 days → `score *= 0.85`
- **New firm boost**: low volume firms → `score *= 1.05`

---

### Tier 2 Routing Phases

#### Phase A — Subscription Allocation (Exclusive)

Rules:
- Only firms with `subscriptionRemaining > 0`
- Exclusive offers (one at a time)
- Wait **45s** per offer
- **Max 3** attempts

On acceptance:
- Decrement subscription allotment **on acceptance**
- Lock case to firm
- Release full package

#### Phase B — Fixed Price “Fast Market” (Semi-Exclusive)

Rules:
- Offer fixed price to **Top K (5-10)** firms simultaneously
- First accept wins
- Offer expires in **90s**

#### Phase C — Mini-Auction (Fallback)

Rules:
- Invite top **M (10–20)** auction-enabled firms
- Floor price = Tier 2 base price
- Window: **120s**
- Winning bid = highest bid; tie-break by score

#### Phase D — Fallback

If not placed:
- Downgrade to Tier 1 pool (optional)
- Queue for manual review / ops
- Or retry after 15 minutes (if consent allows)

---

### What Firms See (Progressive Disclosure)

**Offer payload (pre-acceptance)**:
- Case ID (anonymous)
- State + County
- Case type
- Incident date / age
- Severity level (0–4)
- Liability band (low/med/high)
- Docs available (yes/no)
- Estimated value band
- Price / bid rules
- Countdown timer

**Full package (after acceptance)**:
- Contact info
- Full narrative
- Document links
- Case intelligence profile / summary

---

### Tier 2 Defaults (tunable)

- subscriptionAttempts = 3
- exclusiveWaitSeconds = 45
- fixedGroupK = 8
- fixedWaitSeconds = 90
- auctionM = 15
- auctionSeconds = 120
- tier2BasePrice = $300

Quick sanity check:
Tier 2 should mostly clear in Phase A or B. If Phase C is frequent, pricing is likely too high, eligibility too strict, or firm supply is too low.

---

## TIER 3 ROUTING RULES

### Tier 3 Objectives (High Severity / High Value)

Goal: route high-severity, high-value cases to the best-qualified firms with
the right expertise and a premium price, while keeping response time fast and
avoiding winner-take-all dynamics.

Primary constraints:
- Correct jurisdiction + practice fit
- High-quality firm match (experience, outcomes, response reliability)
- Capacity and response speed
- Fairness guardrail (anti-monopoly throttle)
- Progressive disclosure (no PII in offers)

---

### Tier 3 Case Definition

A case qualifies as **Tier 3** if **ALL** of the following conditions are met:

1. **Estimated Settlement Value**: **$100,000 - $250,000**
2. **Injury Severity Score**: Typically 3-4
3. **Surgery**: Common, allowed
4. **Catastrophic Flags**: Allowed (but Tier 4 handles $250k+)
5. **Venue Supported**: State in supported list

---

### Tier 3 Pricing (single model)

Base price: **$1,500** (configurable)

Modifiers:
- **+ $250** if docs included
- **+ $250** if liability score > 0.70
- **+ $250** if surgery present
- **- $200** if timeSinceIncidentDays > 365

Auctions are common for Tier 3 and are treated as the primary fallback.

---

### Eligibility Filter (hard rules)

A firm is eligible only if **ALL** are true:

1. **Jurisdiction match** (state + county)
2. **Practice match**
3. **Tier enabled**
4. **Capacity** (daily/weekly/monthly)
5. **Commercial eligibility**
   - `fixedEnabled && maxPriceByTier >= price` OR
   - `auctionEnabled && maxPriceByTier >= price` OR
   - subscription active with allotment

If < 5 eligible firms, expand in order:
- Allow statewide firms
- Allow adjacent counties
- Allow “general PI” mapping

---

### Ranking Score (quality-weighted)

```
score =
  0.35 * norm(qualityScore30d) +
  0.20 * norm(acceptanceRate30d) +
  0.15 * norm(1 / avgTimeToAcceptSeconds30d) +
  0.15 * norm(capacity.openSlots) +
  0.15 * norm(yearsExperience)
```

Guardrails:
- **Anti-monopoly**: if firm won > X% of Tier 3 in last 7 days → `score *= 0.8`

---

### Tier 3 Routing Phases

#### Phase A — Expert Match Exclusive

Rules:
- Offer exclusively to top **1–2** ranked firms
- Wait **90s** per offer
- If accepted → route immediately

#### Phase B — High-Value Auction

Rules:
- Invite top **M=10–20** firms
- Floor price = Tier 3 base price
- Auction window **180s**
- Winning bid = highest bid (tie-break by score)

#### Phase C — Concierge / Manual Review

If no acceptance:
- Escalate to manual review
- Or reattempt after 15 minutes if user consent allows

---

### Tier 3 Defaults (tunable)

- exclusiveAttempts = 2
- exclusiveWaitSeconds = 90
- auctionM = 15
- auctionSeconds = 180
- tier3BasePrice = $1,500

---

## TIER 4 ROUTING RULES

### Tier 4 Objectives (Catastrophic / Premium)

Goal: route catastrophic, high-stakes cases through a concierge flow that
prioritizes outcomes, trust, and elite matching over speed and volume.

Primary constraints:
- Explicit consent and compliance gates before routing
- Elite firm eligibility only
- Quality-first ranking (outcomes > speed)
- Progressive disclosure (no PII in offers)

---

### Tier 4 Case Definition

A case qualifies as **Tier 4** if **ANY** catastrophic trigger is present:

- Wrongful death
- Permanent disability / paralysis / TBI / amputation
- Severe med mal outcomes
- High-severity product liability
- Nursing home abuse with death or permanent harm
- ICU / long-term hospitalization
- Surgery completed or required

Tier 4 also activates for **very high value** cases (≥ $250k estimated).

---

### Tier 4 Entry Requirements (Hard Gates)

Before routing, the case must pass:

- Explicit consent to share with attorneys
- HIPAA authorization if medical records involved
- Jurisdiction validated
- Statute of limitations verified
- Identity & duplicate checks passed
- No Do-Not-Contact flags
- Minimum narrative quality threshold

Tier 4 cases do **not** auto-route without these gates.

---

### Tier 4 Pricing (premium)

Base price: **$3,000** (configurable)

Modifiers:
- **+ $500** if docs included
- **+ $500** if liability score > 0.70
- **+ $500** if surgery present
- **+ $1,000** if catastrophic flags present

Pricing is premium and value-based (no CPC-style race to the bottom).

---

### Tier 4 Lawyer Eligibility

Only explicitly Tier 4-enabled firms are eligible, plus:

- Proven catastrophic / wrongful death track record
- Trial readiness
- Venue-specific experience
- High conversion on serious cases
- Strong outcomes and client experience
- Capacity ON at time of routing

---

### Tier 4 Ranking Score (quality-first)

```
score =
  0.35 * norm(qualityScore30d) +
  0.20 * norm(acceptanceRate30d) +
  0.15 * norm(1 / avgTimeToAcceptSeconds30d) +
  0.15 * norm(capacity.openSlots) +
  0.15 * norm(yearsExperience)
```

Guardrails:
- **Anti-monopoly**: if firm won > X% of Tier 4 in last 7 days → `score *= 0.75`

---

### Tier 4 Routing Phases

#### Phase A — Concierge Exclusivity

- Offer exclusively to top **1–3** firms
- Exclusive window: **30–60 minutes**
- Full anonymized intelligence provided

#### Phase B — Limited Auction (last resort)

- Invite top **3–5** elite firms
- Auction window: **60–120 minutes**
- Winner by bid × quality multiplier

#### Phase C — Manual Review / Concierge Ops

- Escalate to internal ops if not placed

---

### Tier 4 Defaults (tunable)

- exclusiveAttempts = 3
- exclusiveWaitSeconds = 2700 (45 minutes)
- auctionM = 5
- auctionSeconds = 5400 (90 minutes)
- tier4BasePrice = $3,000

## KEY DIFFERENCES: Tier 1 vs Tier 2 vs Tier 3 vs Tier 4

| Aspect | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|--------|--------|--------|--------|--------|
| **Settlement Range** | Low value | $25k - $100k | $100k - $250k | $250k+ / catastrophic |
| **Severity Score** | ≤ 1 | Typically 2-3 | Typically 3-4 | Catastrophic triggers |
| **Surgery** | ❌ Not allowed | ✅ Allowed (minor) | ✅ Common | ✅ Often |
| **Medical Paid** | < $10,000 | ≤ $50,000 | Higher / variable | High / long-term |
| **Catastrophic Threshold** | $50k med charges | $100k med charges | Allowed (Tier 4 handles $250k+) | Core requirement |
| **Pricing Model** | Fixed | Fixed + modifiers | Fixed + auction | Premium + concierge |
| **Primary Flow** | Sequential | Subscription → Group fixed | Exclusive → Auction | Concierge → Limited auction |
| **Exclusive Wait** | 45 seconds | 45 seconds | 90 seconds | 30–60 minutes |

---

## Routing Flow Summary

Tier 1 uses sequential routing, Tier 2 uses a multi-phase fixed-price flow,
Tier 3 prioritizes expert matching with an auction fallback, and Tier 4 uses
concierge exclusivity with a limited auction last resort:

```
Tier 1:
STEP 0: Build Eligible Firm Pool
  ↓ (if empty → TIER1_HOLD)
STEP 1: Subscription Allocation (max 3 attempts, sequential)
  ↓ (if accepted → DONE)
STEP 2: Fixed-Price Routing (max 5 attempts, sequential)
  ↓ (if accepted → DONE)
STEP 3: Failover → TIER1_HOLD

Tier 2:
STEP 0: Build Eligible Firm Pool
  ↓ (if empty → TIER2_HOLD)
PHASE A: Subscription (max 3 attempts, exclusive)
  ↓ (if accepted → DONE)
PHASE B: Fixed-Price Group (Top K, first accept wins)
  ↓ (if accepted → DONE)
PHASE C: Mini-Auction (optional fallback)
  ↓ (if accepted → DONE)
PHASE D: Fallback → TIER2_HOLD / manual review

Tier 3:
STEP 0: Build Eligible Firm Pool
  ↓ (if empty → TIER3_HOLD)
PHASE A: Expert Match Exclusive (max 2 attempts)
  ↓ (if accepted → DONE)
PHASE B: High-Value Auction
  ↓ (if accepted → DONE)
PHASE C: Concierge / Manual Review

Tier 4:
STEP 0: Hard Gates + Build Eligible Firm Pool
  ↓ (if empty → TIER4_HOLD)
PHASE A: Concierge Exclusivity (top 1–3)
  ↓ (if accepted → DONE)
PHASE B: Limited Auction (last resort)
  ↓ (if accepted → DONE)
PHASE C: Manual Review / Concierge Ops
```

---

## Implementation Notes

- Tier 1 is sequential; Tier 2 includes a **group fixed-price phase**
- Tier 2 fairness guardrails apply to scoring (anti-monopoly + new firm boost)
- Cases that cannot be routed are marked as **HOLD** status
- Routing metrics (acceptance rate, conversion rate, etc.) are stored in `AttorneyProfile`
- Account balance and subscription tracking are stored in `AttorneyProfile`

---

**Document Version**: 1.0  
**Last Updated**: Based on implementation in `api/src/lib/tier1-routing.ts` and `api/src/lib/tier2-routing.ts`
