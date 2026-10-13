<!-- Generated from app/src/data/attorneyGuides.ts. Do not edit by hand; run `pnpm --dir app guides:export`. -->

# Demand, negotiation and settlement

Know when a case is demand-ready, draft and finalize the demand letter, log negotiations and get the client’s decision, and model the settlement through to disbursement.

_Last updated: 2026-10-12 · About 6 min read_

## Contents

- [Demand readiness](#demand-readiness)
- [Valuation and the suggested opening demand](#valuation-and-the-suggested-opening-demand)
- [Drafting the demand letter](#drafting-the-demand-letter)
- [Finalizing and sending](#finalizing-and-sending)
- [Logging negotiations](#logging-negotiations)
- [Getting the client’s decision](#getting-the-clients-decision)
- [The settlement waterfall](#the-settlement-waterfall)
- [Settlement statuses](#settlement-statuses)

## Demand readiness

Open a case and go to Resolution → Demand. Until a letter exists, a banner tells you whether the case is demand-ready. If it is not, it shows the readiness percentage and lists the items still missing, so you can close them before sending. The Demand readiness meter breaks the score down by factor.

> **Tip:** Missing items that need something from the client can often be requested straight from this screen.

> **Tip:** Use Auto-generate on the Tasks tab to turn readiness blockers into tasks for your team.

## Valuation and the suggested opening demand

The "Valuation & demand anchor" card shows medical specials, the median case value, a suggested opening demand and the policy limit. A ladder plots the low, median and high values against the policy limit and any demand already made.

1. The suggested opening demand is anchored above the modeled value to leave room to negotiate: it takes the higher of the modeled high value and 1.4 times the median, then rounds it up to a clean figure.
2. If the modeled value runs above the known policy limit, you see a warning to build the demand with a policy-limits strategy and document the excess exposure.

> **Tip:** The suggestion is a starting point. Adjust it to your judgment of the case and the carrier.

## Drafting the demand letter

The demand letter workspace sits on the same tab. Rose, the AI case manager, can draft a ClearCaseIQ Super Demand from the case record: a settlement package for the carrier, plus Demand Intelligence for you covering readiness, valuation, weaknesses, statement confidence and a quality check.

1. Optionally tell Rose what to emphasize, then click "Draft Super Demand".
2. Or import a letter you already wrote in Word or Google Docs (PDF, .docx, or paste the text). The original file is kept.
3. Edit the text directly. The letter is plain text so it exports cleanly to Word.
4. Save your changes.

> **Tip:** When a case becomes demand-ready, Rose may draft a letter automatically. It stays on hold until someone reads it and clicks "Approve Rose’s draft".

> **Tip:** Staff whose role does not include demand letters see the workspace read-only.

## Finalizing and sending

Each letter moves through Drafted, Approved (for Rose’s drafts), the attorney approval gate (for Super Demands), Finalized and Sent.

1. Sign every item in the attorney approval gate in the right-hand panel. Finalize unlocks once the gate is complete.
2. Click Finalize to lock the letter.
3. Use "Download Word" to get the .docx, send it to the carrier, then click "Mark as sent".

> **Tip:** All the case’s demand letters are listed under "All demand letters" so you can find earlier versions.

## Logging negotiations

Resolution → Negotiation keeps the negotiation history for the case. Log every Offer, Counteroffer, Demand, Call or Note with its party, date, carrier, amount and terms, and attach proof such as the offer letter.

> **Tip:** The terms field is visible to the client, so write it in language they will understand.

## Getting the client’s decision

Offers, counteroffers and demands can be sent to the client to accept or decline. Tick "Send to the client to accept or decline" when logging the entry, or click "Send to client" on an existing row.

1. The row shows "Awaiting client" until the client answers.
2. It then shows "Client accepted" or "Client declined" with the date, plus any note the client left.
3. Use Resend to ask the client again.

## The settlement waterfall

Resolution → Settlement models the money from gross recovery to the client’s net: gross recovery, minus the attorney fee, minus case costs, minus medical liens (after any negotiated reductions), equals the client net.

1. Enter the settlement inputs, including whether your fee is calculated on the gross recovery or net of case costs.
2. Add case costs such as filing fees, expert fees, records retrieval, investigation, depositions and service of process.
3. Add liens by lienholder type (for example medical provider, health insurer, Medicare, Medicaid, MedPay or ERISA plan), with the asserted amount, the negotiated amount and a status of Open, Negotiating, Reduced, Resolved or Waived.

> **Tip:** Read the warnings at the top. They flag problems such as a settlement that would leave the client with nothing after liens. The client net turns red if it is zero or less.

## Settlement statuses

A settlement starts as Draft. Click "Finalize settlement" once the agreed amount is entered; it then shows "Finalized — funds pending". When the money has gone out, click "Mark disbursed" and it shows Disbursed with the date and who marked it. While finalized, you can Reopen it to make changes.
