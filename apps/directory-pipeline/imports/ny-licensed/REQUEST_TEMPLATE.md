# New York OCA Data Request Template

Use this template to request an approved `NY` attorney registration dataset from the Office of Court Administration Attorney Registration Unit.

Reference points from the official New York rules and registration materials:

- written requests are directed to the Attorney Registration Unit, Office of Court Administration
- public access is governed by `22 NYCRR Part 118.2`
- the published fee schedule includes:
  - no charge for a single attorney inquiry
  - `$2.50` for each additional named inquiry
  - `$25` for `100` or fewer names by geographic area
  - `$1` for each additional `100` names by geographic area
  - `$100` for the full list of registered attorneys

Working contact from official registration materials:

- `attyreg@nycourts.gov`

Suggested request email:

```text
Subject: Request for New York Attorney Registration Public Data Under 22 NYCRR Part 118.2

Hello Attorney Registration Unit,

I am requesting public attorney registration information under 22 NYCRR Part 118.2.

Requested dataset:
- Scope: full list of registered attorneys in New York State
- Fields requested: attorney name, business address, registration number if available, registration status if available, and any other public registration fields included in the standard export
- Preferred delivery format: CSV or Excel

Intended use:
- internal attorney directory normalization and verification
- no automated access to the public attorney search website will be used
- records will retain source attribution and be updated if corrected

Please confirm:
- the exact fields available in the export
- the delivery format
- the total fee for this request
- the payment method and next steps

If a full statewide extract is not available in one response, we can also accept approved data by geographic area in multiple files.

Thank you,

<Requester Name>
<Organization>
<Email>
<Phone>
```

Suggested intake checklist after approval:

- save the approved file into `imports/ny-licensed/incoming/`
- save any custom field map into `imports/ny-licensed/field-maps/`
- run `python -m scripts.inventory_ny_licensed_dropzone`
- run `python -m scripts.run_ny_licensed_import "<file>" --report-path "<report>"`
