# ClearCaseIQ brand guidelines

Everything here is extracted from the production codebase, so the colours and
type are the real values the live site renders, not an approximation.

Last compiled: 1 September 2026.

---

## 1. Company facts

| Field | Value |
| --- | --- |
| Legal name | ClearCaseIQ Corp. |
| Display name | ClearCaseIQ (one word, capital C, capital C, capital I, capital Q) |
| Category | Legal technology. **Not a law firm.** |
| Headquarters | Los Angeles, California |
| Website | https://www.clearcaseiq.com |
| Media contact | partnerships@clearcaseiq.com |
| Support | support@clearcaseiq.com |
| Founder | Sri Reddy |

**Never write** ClearCase IQ, Clearcaseiq, CCIQ, or ClearcaseIQ. The wordmark
splits as `ClearCase` + `IQ`, where the `IQ` takes the gold accent colour.

### Approved boilerplate

> ClearCaseIQ is a California legal technology company that helps injury
> victims understand their case in plain English, organize medical records,
> and — only with consent — share a documented file with participating
> personal injury attorneys. ClearCaseIQ Corp. is not a law firm and does not
> provide legal advice.

---

## 2. Logo

### Files

| File | Format | Size | Use for |
| --- | --- | --- | --- |
| `logos/clearcaseiq-mark.svg` | Vector | Scalable | **Preferred.** The shield mark as true vector. Matches what the live product renders. |
| `logos/clearcaseiq-mark-512.png` | Raster | 512×512 | Transparent-background mark, small placements |
| `logos/clearcaseiq-mark-1024.png` | Raster | 1024×1024 | Transparent-background mark, large placements |
| `logos/clearcaseiq-logo-transparent.png` | Raster | 794×244 | Horizontal lockup, mark + wordmark, transparent |
| `logos/clearcaseiq-logo-on-black.png` | Raster | 1024×682 | Same lockup flattened onto black |

### The mark

A navy shield containing gold scales of justice, overlaid by a magnifying lens
with a gold check. The three ideas are legal protection, case analysis, and
verified readiness.

### Clear space and minimum size

Leave clear space on all sides equal to the height of the shield's crown. The
mark should not be reproduced below 24 px tall; below that the lens check stops
resolving. The horizontal lockup should not go below 120 px wide.

### Don'ts

- Do not recolour the shield or the scales.
- Do not place the navy-wordmark lockup on a dark background. It has no dark
  variant that works, see the gaps in section 6.
- Do not stretch the horizontal lockup to fill a square.
- Do not add effects, outlines, or drop shadows.

---

## 3. Colour

The palette is two families plus neutrals. `brand` and `primary` are defined as
identical scales in the codebase; treat `brand` as canonical.

### Brand navy — primary

Trust, authority, the legal register. Carries most of the interface.

| Token | Hex | Typical use |
| --- | --- | --- |
| `brand-50` | `#f0f4f8` | Tinted section backgrounds |
| `brand-100` | `#d9e6f0` | |
| `brand-200` | `#b8cfe0` | |
| `brand-300` | `#8fadcb` | |
| `brand-400` | `#6487b2` | |
| `brand-500` | `#456997` | |
| `brand-600` | `#34547a` | Primary buttons |
| `brand-700` | `#2a4665` | **Link and body accent colour** |
| `brand-800` | `#263b54` | |
| `brand-900` | `#1e3045` | |
| `brand-950` | `#0f1b2b` | Deepest navy |

### Accent gold — secondary

Used sparingly, for the `IQ` in the wordmark, the scales, verification checks,
and primary calls to action. It signals intelligence and confirmation. It should
never carry large areas of a layout.

| Token | Hex | Typical use |
| --- | --- | --- |
| `accent-50` | `#fffbeb` | |
| `accent-100` | `#fef3c7` | |
| `accent-200` | `#fde68a` | Gradient highlight |
| `accent-300` | `#fcd34d` | Wordmark `IQ` on dark |
| `accent-400` | `#fbbf24` | Verification check |
| `accent-500` | `#f59e0b` | **Core gold** |
| `accent-600` | `#d97706` | Wordmark `IQ` on light, CTA |
| `accent-700` | `#b45309` | |
| `accent-800` | `#92400e` | |
| `accent-900` | `#78350f` | |
| `accent-950` | `#451a03` | |

### Neutrals

Standard slate/grey ramp from `#f9fafb` at 50 through `#111827` at 900. Dark
mode surfaces sit on `slate-900` and `slate-950`.

### Signature gradients

- **Shield:** `#4d78aa` → `#173963` at 52% → `#071629`
- **Gold:** `#fde68a` → `#f59e0b` at 50% → `#d97706`
- **CTA:** `accent-600` → `orange-500` → `amber-500`, left to right

---

## 4. Typography

Both faces are Google Fonts, self-hosted at build time. Both are free for
commercial use under the SIL Open Font License, so a designer can install them
without a licence purchase.

### Display — Fraunces

Serif, used for headings, the wordmark, and anything that needs editorial
weight. It is a **variable** font and the design depends on its optical-size
(`opsz`) axis; large headings must use the optical sizing rather than a scaled
small size. **Upright only — the brand does not use Fraunces italic.**

### Body / UI — Inter

Sans-serif, used for all body copy, interface labels, and buttons.

### Interface scale

| Token | Size | Line height |
| --- | --- | --- |
| `ui-xs` | 12px | 16px |
| `ui-sm` | 13px | 20px |
| `ui-base` | 14px | 22px |
| `ui-md` | 16px | 24px |
| `ui-lg` | 18px | 24px |
| `ui-xl` | 20px | 24px |
| `ui-2xl` | 24px | 1.35 |
| `ui-3xl` | 30px | 1.2 |

Headings use tight tracking, `-0.02em`. Eyebrow labels are 11px, uppercase,
with wide `0.14em` tracking, in `slate-400`.

---

## 5. Voice, and the legal guardrails

The audience is someone who has just been injured and is dealing with
paperwork and insurance pressure at the same time. Write plainly, without legal
jargon, and without urgency tactics.

**These are compliance constraints, not style preferences:**

- ClearCaseIQ is **not a law firm** and **does not give legal advice**. Any
  creative that implies representation, or that ClearCaseIQ will "handle your
  case", is not usable.
- Never promise or imply an outcome, a settlement figure, or a payout.
- Attorney contact happens **only with the claimant's consent**. Copy should
  not suggest that submitting information sends it to lawyers automatically.
- Tools are educational. The statute-of-limitations checker in particular is
  described as giving "educational deadline estimates", never legal deadlines.

### Approved founder quotes

> Too many families face injury, paperwork, and insurance pressure at once —
> without a clear picture of their options.
>
> — Sri Reddy, Founder, ClearCaseIQ

> We built ClearCaseIQ so people can understand a claim before they talk to a
> lawyer, and so attorneys receive plaintiff-chosen, documented matters — not
> thin leads.
>
> — Sri Reddy, Founder, ClearCaseIQ

---

## 6. Known gaps and defects

Read this before commissioning anything.

1. **There are four different visual identities in circulation.** The vector
   mark, the raster lockup, the social card, and the app icon do not depict the
   same thing. See `README.md` for the breakdown.
2. **The wordmark typeface does not match the product.** The raster lockup sets
   `ClearCaseIQ` in a geometric sans, but the live application renders it in
   Fraunces, the display serif. These are two different wordmarks.
3. **No vector master for the full lockup.** Only the mark exists as SVG. The
   mark-plus-wordmark lockup is raster only, so it cannot be cleanly resized or
   recoloured.
4. **No dark-background lockup.** The transparent PNG is a navy wordmark, so it
   only works on light backgrounds. The only dark-ready file is the one
   flattened onto solid black, which needs a matching black backdrop.
5. **The horizontal lockup is used as a square app icon.** The files in
   `mobile/` pad a wide lockup into a 1024x1024 square, so the artwork is small
   and the tagline is unreadable at real icon sizes.
6. **No brand font files bundled.** Fraunces and Inter are fetched from Google
   Fonts at build time; there is no local copy in this kit.
7. **No photography, illustration library, video, or motion assets exist.**
8. **No previous advertising creative exists.** The only designed marketing
   artefact is the social card in `social/`.

### Already fixed

The tagline previously read `LEGAL INTELLIGENCE TRANSEORMED`. That letter was
repaired on 1 September 2026 in both lockups and in all three mobile icons, and
every file in this kit carries the corrected `TRANSFORMED`.
