<!-- Generated from app/src/data/attorneyGuides.ts. Do not edit by hand; run `pnpm --dir app guides:export`. -->

# E-signatures and firm templates

Build a library of firm documents, place signature fields on them, send them from a case for e-signature, and automate the retainer and welcome packet.

_Last updated: 2026-10-12 · About 6 min read_

## Contents

- [Before you start: connect an e-signature provider](#before-you-start-connect-an-e-signature-provider)
- [The Firm Templates library](#the-firm-templates-library)
- [Placing signature fields](#placing-signature-fields)
- [Sending from a case](#sending-from-a-case)
- [Sending from the template library](#sending-from-the-template-library)
- [Auto-send the retainer](#auto-send-the-retainer)
- [The welcome packet](#the-welcome-packet)

## Before you start: connect an e-signature provider

Sending documents for signature needs a connected e-signature provider. A firm admin can connect Dropbox Sign or Documenso under Firm Settings → Integrations. Until one is connected, the "Send for signature" buttons are disabled and explain why.

Where in the app: **Open Firm Settings** (`/firm-settings`)

## The Firm Templates library

Firm Dashboard → Firm Templates holds your reusable documents: retainers, HIPAA authorizations, intake packages and more. Templates are grouped by category, and each one is labeled PDF, DOCX or Text only.

1. Add recommended: add the recommended starter set.
2. Import: upload PDF, Word, text or Markdown files, or drag and drop them onto the library.
3. New template: create one from scratch, with a name, description, category, document type and body text or an attached file.

> **Tip:** Only PDFs or templates with body text can be sent for signature. A Word file needs to be re-uploaded as a PDF, or given body text, first.

> **Tip:** You need an accepted case before you can send a template to anyone.

Where in the app: **Open the Firm Dashboard** (`/firm-dashboard`)

## Placing signature fields

Open the field editor on a PDF template to place fields exactly where they belong. There are five field types: Signature, Date signed, Initials, Text and Checkbox. Each field is assigned to either the Client or the Attorney.

1. Pick a field type and choose who fills it in: Client or Attorney.
2. Click on the page to place the field, then drag to move it or resize it.
3. Repeat for every field, then save.

> **Tip:** Every template needs at least one client signature field.

> **Tip:** Retainers and fee agreements must also have an attorney signature field (California Business and Professions Code §6147).

> **Tip:** Only retainers and fee agreements are countersigned. On any other document type, attorney fields must be reassigned to the client.

> **Tip:** Checkboxes are optional by default; the other field types are required.

## Sending from a case

Most documents are sent from the case itself: open the case, go to Documents and choose the Signatures view. The "Signature documents" card shows what the client has signed, what is still out, and what has not been sent.

1. Click a document chip (for example the retainer) to send it to the client. Chips marked "Required" still need to be sent.
2. Use "Other document" to send your own PDF or a firm template, or "Police report authorization" when you need one.
3. Use "Client packet" to send files to upload plus the retainer and HIPAA forms to sign, all in one link.
4. Check the signer, preview the filled document and send.

> **Tip:** A sent document shows as "sent" and then "viewed" once the client opens it. If it was declined or has expired, the chip turns red and offers a resend.

> **Tip:** Click Refresh in "Waiting for the client to sign" to check the latest status with the signing provider.

> **Tip:** If the client signed on paper, use "Upload signed copy" to file it.

## Sending from the template library

You can also send straight from Firm Templates: click "Send for signature" on a template, pick the client or case, check the filled preview, confirm the signer’s name and email and the document title, choose the e-signature provider and send.

## Auto-send the retainer

In Firm Settings → Intake automation, turn on "Auto-send retainer on acquire" to send the contingency-fee retainer for e-signature automatically after a case is purchased. It needs a connected e-signature provider and a client email. When it is off, attorneys get a "Send retainer to client" task instead.

> **Tip:** Set a default contingency fee in the same section. It is prefilled on retainers and can be changed per case before sending; if left blank, 33.33% is used.

Where in the app: **Open Firm Settings** (`/firm-settings`)

## The welcome packet

Also in Firm Settings, the welcome packet is the set of documents sent to every new client for e-signature. Every new case gets a "Send client welcome packet" task listing them.

1. Tick the documents to include: the built-in Retainer agreement, the built-in HIPAA authorization (which needs a HIPAA-capable signature tool) and any of your sendable firm templates.
2. Upload a PDF directly with "Upload document"; it is added to the packet and to your templates.
3. Turn on "Send the welcome packet when a case is purchased" to send it automatically. The client gets the signing link by email, text and on their dashboard.

> **Tip:** If the packet cannot be sent (no client email or no signature tool), the task stays open for your team to finish.

> **Tip:** If no documents are selected, no welcome packet task is created.
