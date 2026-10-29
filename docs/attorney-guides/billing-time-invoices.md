<!-- Generated from app/src/data/attorneyGuides.ts. Do not edit by hand; run `pnpm --dir app guides:export`. -->

# Billing, time and invoices

Track time on each case, set firm billing rates and approve time, invoice clients and record payments, and manage your own ClearCaseIQ account billing.

_Last updated: 2026-10-12 · About 6 min read_

## Contents

- [Two kinds of billing](#two-kinds-of-billing)
- [Logging time on a case](#logging-time-on-a-case)
- [Firm billing rates](#firm-billing-rates)
- [Reviewing and approving time](#reviewing-and-approving-time)
- [Invoicing a client](#invoicing-a-client)
- [Recurring invoices](#recurring-invoices)
- [The Billing hub](#the-billing-hub)
- [Your ClearCaseIQ account billing](#your-clearcaseiq-account-billing)

## Two kinds of billing

There are two separate things called billing. Client billing is the time, invoices and payments for your cases, handled inside each case and on the Firm Dashboard. Account billing is what your firm pays ClearCaseIQ, such as routing fees and subscriptions, handled on the account billing page.

## Logging time on a case

Open a case and go to Billing → Time. The tab shows logged hours, billable value and the number of entries, with a list of every entry below.

1. To use the timer: choose an activity, add a description, tick or untick Billable, and click start. The timer keeps running if you reload the page. Stop it to log the time, or discard it.
2. To log time by hand: enter the hours, activity, date and description, tick Billable if it applies, and save.
3. Remove an entry from the list if it was logged by mistake.

> **Tip:** Firm admins can log time on a teammate’s behalf.

> **Tip:** Time is useful even on contingency cases: it supports profitability tracking, fee petitions and lien or fee disputes.

## Firm billing rates

On Firm Dashboard → Time & Billing, click Configure under "Billing rates" to set a default hourly rate for each firm role, plus optional overrides for individual people. Click "Save rates" when you are done.

> **Tip:** Rates are copied onto each time entry when it is logged, so changing a rate only affects new time, not entries already recorded.

Where in the app: **Open the Firm Dashboard** (`/firm-dashboard`)

## Reviewing and approving time

The same tab shows firm-wide totals: Total hours, Billable hours, Billable value, Unbilled WIP and the number of entries Awaiting approval.

1. Filter the list by status (Submitted, Approved, Rejected, Draft or Invoiced) and by person.
2. Approve or reject each entry from its row.
3. Click Export CSV to download the entries for payroll, accounting or a fee petition.

## Invoicing a client

Open a case and go to Billing → Invoices. The Billing & Payments section lists the case’s invoices and payments.

1. Enter an invoice number, amount, status (Open, Paid or Overdue), due date and any notes, then click Add Invoice.
2. Download any invoice as a PDF or a Word document.
3. For unpaid invoices, use "Pay with Stripe" to collect payment by card.
4. Record payments received another way (for example ACH or check) with the amount, method, date, reference and notes, then click Add Payment. Each payment has a downloadable receipt.

## Recurring invoices

Under Recurring Invoices on the same tab, set up an invoice that repeats: enter the amount, the interval in days, the next run date and notes, then click Add Recurring Invoice. Each one shows how often it runs and when it runs next. Click "Run Due" to generate any recurring invoices that are due now.

## The Billing hub

Case Management → Billing shows your fees collected year-to-date, totaled from client payments recorded on all your cases since January 1, with a "Fees by case" table. To raise invoices or record payments, open the case itself.

Where in the app: **Open the Billing hub** (`/attorney-dashboard/cases/billing`)

## Your ClearCaseIQ account billing

The account billing page is where you manage what you pay ClearCaseIQ. All charges are processed by Stripe, and Stripe emails a receipt after each one.

1. Payment Method: add or update the card used for routing fees, subscriptions and lead credits.
2. Subscription: choose a plan that includes a number of accepted cases each month. Billing Status shows your current plan and how many included cases remain.
3. Use "Manage Subscription & Cards" to change your plan or cards in Stripe.
4. Fees & Payments lists everything you have paid: routing fees, subscriptions and lead credits.

> **Tip:** Accepting a case charges the routing fee shown on the case review screen, and all sales are final.

> **Tip:** With a card saved, future routing fees are charged to it automatically instead of asking you to check out each time.

Where in the app: **Open account billing** (`/attorney-billing`)
