<!-- Generated from app/src/data/attorneyGuides.ts. Do not edit by hand; run `pnpm --dir app guides:export`. -->

# Getting started

Create your attorney account, verify your bar license, add a payment method, set up your profile and bring your team into the Firm Dashboard.

_Last updated: 2026-10-12 · About 6 min read_

## Contents

- [Create your attorney account](#create-your-attorney-account)
- [Verify your bar license](#verify-your-bar-license)
- [Add a payment method](#add-a-payment-method)
- [Set up your profile](#set-up-your-profile)
- [Set up your firm](#set-up-your-firm)
- [Invite your team](#invite-your-team)
- [Roles and permissions](#roles-and-permissions)

## Create your attorney account

Registration is a short four-step form. Your answers are kept as you move between steps, so you can go back and change anything before you submit.

1. Account: enter your first and last name, email, phone, password and firm name. You can also add your State Bar number and licensing state and click "Check with the State Bar" to preview the result.
2. Practice & Service Area: choose the case types you want (the same incident types clients pick when they start a case), the states where you practice, and whether you want cases from the entire state or only selected counties.
3. Capacity & Availability: tell us roughly how many new cases you can take each month.
4. License Verification: optionally attach your bar card, a government ID or your firm website. You can finish without uploading anything and verify later.
5. Submit, then confirm your email address from the message we send you.

> **Tip:** If your email already has an account, the form tells you on the first step and offers "Sign in instead" or a password reset.

> **Tip:** The bar check is optional at sign-up. If the name on the bar record does not match the name you entered, you can still register and our team will review it.

> **Tip:** Your phone number is used for text alerts about case offers and case activity. Reply STOP to any text to opt out.

Where in the app: **Attorney registration** (`/attorney-register`)

## Verify your bar license

A verified license is what earns your verified badge. If you skipped verification during sign-up, open the license upload screen and pick one of two methods.

1. State Bar Lookup: enter your license number and state, then click "Verify License". This automatically checks active California State Bar licenses.
2. Manual Upload: upload a PDF or image of your license document and click "Upload License". Our team reviews manual uploads.

> **Tip:** If the State Bar cannot be reached at that moment, you can continue and try again later from your profile.

Where in the app: **Upload attorney license** (`/attorney-license-upload`)

## Add a payment method

Before you reach the dashboard you are asked to save a card. You are not charged when you save it. A per-case routing fee is charged only when you accept a case, and a saved card is required to accept cases. Card details are stored by Stripe; ClearCaseIQ never sees your full card number.

Where in the app: **Add a payment method** (`/attorney-onboarding/payment`)

## Set up your profile

Your profile controls what clients see and which cases are routed to you. It has four tabs.

1. Profile: your name, contact details and the information shown to clients.
2. Practice: the case types you handle and the states and counties you serve.
3. Case Preferences: the kinds of cases you want to receive and how many.
4. Performance: how your matched and accepted cases are doing over time.

> **Tip:** Keep Practice and Case Preferences current. Matching uses them, so an out-of-date service area means fewer or less relevant offers.

Where in the app: **Open your profile** (`/attorney-profile?tab=practice`)

## Set up your firm

The Firm Dashboard is where a firm admin manages the firm as a whole. Its tabs are Overview, New Leads, Active Cases, Team & Roles, Firm Templates, Workflow and Time & Billing. Which tabs a person sees depends on their role and permissions; firm admins see everything.

Where in the app: **Open the Firm Dashboard** (`/firm-dashboard`)

## Invite your team

Add attorneys and staff from the Team & Roles tab. Each new member gets an invitation email to set their password, and shows as "Pending" until they accept.

1. Open Firm Dashboard → Team & Roles.
2. Add the member with their name, email and firm role.
3. Optionally adjust their permissions beyond what the role gives them.
4. If they did not receive the email, click "Resend invite" next to their name. They can also use "Forgot password" on the sign-in page to set a password.

> **Tip:** Staff sign in at the staff login page and only see the screens their permissions allow.

Where in the app: **Open Team & Roles** (`/firm-dashboard`)

## Roles and permissions

There are nine firm roles: Firm Admin, Attorney, Case Manager, Intake Specialist, Paralegal, Billing/Admin, Legal Assistant, Demand Writer and Medical Records. Each role comes with a default set of permissions, and you can grant or remove individual permissions for a member. The eight permissions are:

1. Manage firm: add, edit and remove members and set their roles; configure routing and workflow; change the plan and seats; view firm performance, fees and spend.
2. Billing & payments: invoices, payments and firm billing.
3. View All Cases: see every case in the firm.
4. Assign cases: assign or reassign cases to attorneys and staff.
5. Work on active cases: day-to-day work on active cases, including tasks and the medical chronology.
6. Review, accept & decline cases: open and review incoming cases and accept or decline them on behalf of the firm.
7. Client communication: message clients, and book and manage their consultations on the attorneys’ calendars.
8. Documents, records & demands: upload and request documents, draft demand letters, and manage firm templates and send them for signature.

> **Tip:** The Team & Roles tab shows a role-by-permission matrix so you can see at a glance what each role can do.

> **Tip:** Firm admins always hold every permission.
