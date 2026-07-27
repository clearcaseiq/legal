# California attorney roll — public records request

Phase 1 of the California attorney database needs one thing we cannot build
ourselves: an authoritative list of every licensed California attorney, keyed by
bar number. This document is the request that gets it, plus what to do with the
answer.

Everything else in Phase 1 (schema, entity resolution, county resolution, the
staging importer) is already built and merged, so this is the only remaining
blocker — and it is the long-lead item, so send it first.

---

## What we found

**There is no bulk download.** The State Bar publishes the licensee directory as
a public record and serves it one attorney at a time through Attorney Search at
`apps.calbar.ca.gov`. It does not offer a roster export, a data product, or an
API. Bulk access goes through a formal records request.

**The State Bar is subject to the CPRA.** It is a public corporation brought
under the California Public Records Act by Business and Professions Code
sections 6026.7 and 6026.11. Requests go through its NextRequest portal:

> https://calbarca.nextrequest.com

**Their stated timeline** is 10 days to respond, with a possible 14-day
extension. The response tells you whether responsive records exist, when they
will be available, and what they will cost.

**Their stated fees** are 10 cents per page for copies, plus postage and "the
cost of data extraction to produce the record." The per-page rate is the thing to
avoid: at roughly 200,000 active licensees, anything priced per page is absurd,
so the request below asks for a native electronic export and cites the CPRA's
electronic-records provision. Expect to pay a data-extraction fee. Budget for it
and ask for the estimate in writing before they run the job.

**The record probably already contains the fields we most want.** Under the
Bar's reporting rules, attorneys must report and annually verify their address,
phone, email, **professional website**, **practice sector**, and **law firm
size**. If practice sector and firm size are in the roll, that is a large part of
our PI segmentation and firm-enrichment work arriving for free, so the request
asks for them explicitly rather than assuming we will have to infer them.

**Licensee opt-outs do not block this.** Business and Professions Code section
6001(d) lets attorneys limit the *sale or disclosure* of licensee information not
reasonably related to regulatory purposes, and the State Bar does not sell
licensee data. Per the Bar's own guidance, that opt-out "does not affect whether
such information is subject to disclosure under the California Public Records
Act." Expect them to withhold nonpublic email addresses provided under
California Rules of Court rule 9.9(a)(2); that is a real exemption and we should
concede it rather than fight it.

---

## Before you send

- [ ] Decide who the requester is. A CPRA request needs no reason and no
      standing, but the requester's name and email become part of a public log on
      NextRequest. Use a company address, not a personal one.
- [ ] Have your counsel glance at the citations below. Section numbers here use
      the post-2023 recodification of the CPRA, with the former numbering in
      parentheses.
- [ ] Set an internal owner and a follow-up date at day 11. Agencies miss the
      10-day deadline routinely and a polite nudge on the portal thread works.

---

## The request

Paste this into the NextRequest portal as the request description.

> **Subject: CPRA request — electronic roster of licensed California attorneys**
>
> Pursuant to the California Public Records Act, Government Code section
> 7920.000 et seq., and Business and Professions Code sections 6026.7 and
> 6026.11, I request copies of the following public records maintained by the
> State Bar of California.
>
> **Records requested**
>
> A single electronic export containing one record for each person currently
> holding a California law licence, with the following fields for each, to the
> extent each is part of the official licensee record maintained under Business
> and Professions Code section 6002.1 and Rules 2.2 and 2.3 of the Rules of the
> State Bar of California:
>
> 1. Bar (licence) number
> 2. Full name, including first, middle, and last name as separate fields if
>    stored that way
> 3. Licence status (for example active, inactive, suspended, resigned) and the
>    effective date of the current status
> 4. Date of admission to the California bar
> 5. Firm, organization, or employer name as reported by the licensee
> 6. Reported law firm size
> 7. Reported practice sector
> 8. Reported practice area or areas, and any certified legal specialty
> 9. Professional website address as reported by the licensee
> 10. Public business mailing address, including street, city, state, and ZIP
> 11. County
> 12. District
> 13. Public business telephone number
> 14. Public email address
> 15. Law school
> 16. Sections of the State Bar to which the licensee belongs
> 17. Languages spoken, where reported
>
> **Format**
>
> I request production in an electronic format the State Bar already uses for
> this data — a comma-separated or tab-delimited text file, or an Excel
> workbook — delivered as a download through this portal or on electronic media.
> Government Code section 7922.570 (former section 6253.9) requires production of
> electronic records in any electronic format in which the agency holds the
> information. I am not requesting a paper printout and I am not requesting the
> creation of a new record, report, or analysis.
>
> If the State Bar maintains this information in a database, I request an export
> of the existing fields rather than any reformatting, summarizing, or
> re-ordering, so that no programming or data compilation beyond a routine export
> is required.
>
> **Scope and exclusions, to keep this narrow**
>
> - I do not seek any records of discipline, State Bar Court records, or
>   investigation files. Access to State Bar Court records is governed by
>   Business and Professions Code section 6086.5 rather than the CPRA, and I make
>   no request for them here.
> - I do not seek any email address designated nonpublic under California Rules
>   of Court rule 9.9(a)(2), or any other information the State Bar is prohibited
>   by law from disclosing. Please withhold those fields and produce the
>   remainder.
> - I do not seek any information about applicants, examinees, or bar exam
>   results.
> - I do not seek dates of birth, home addresses, Social Security numbers, or any
>   other personal identifier not part of the public licensee record.
>
> If a field listed above is not disclosable, please produce the remaining fields
> rather than withholding the export in full, and identify the field withheld and
> the specific exemption claimed, as Government Code section 7922.000 requires.
>
> **Narrowing, if that helps**
>
> If producing the full roll is unduly burdensome, I would accept, in order of
> preference:
>
> 1. Licensees with active status only.
> 2. Licensees with active status and a California business address.
> 3. Licensees with active status whose reported practice sector or practice area
>    indicates private practice.
>
> Please tell me which of these reduces the burden and I will amend the request
> accordingly. Under Government Code section 7922.600 (former section 6253.1) I
> would welcome the State Bar's assistance in identifying the records and format
> that make this easiest to fulfil.
>
> **Fees**
>
> Please provide a written estimate of any data-extraction or duplication cost
> before performing the work, and treat this request as authorizing costs up to
> [**$AMOUNT**] without further approval. If the estimate exceeds that figure,
> contact me and I will either authorize the additional cost or narrow the
> request. I am requesting electronic production specifically to avoid per-page
> duplication charges.
>
> **Response**
>
> Please respond within 10 days as provided by Government Code section 7922.535
> (former section 6253(c)). If the State Bar invokes the 14-day extension, please
> state the specific basis for it. Please direct all correspondence and the
> production itself to this portal thread.
>
> Thank you for your help.
>
> [Name]
> [Title], [Company]
> [Email]

Replace `[**$AMOUNT**]` with a real number before sending — a stated cap prevents
the request stalling on a cost-approval round trip. A few hundred dollars is a
reasonable opening figure for a routine database export.

---

## When the roll arrives

The importer is already built and expects nothing in particular about the column
names. Start by looking at the file, not by importing it:

```bash
cd api
pnpm import:ca-bar-roll -- --file ./data/ca-bar-roll.csv --inspect
```

That prints the real headers, which logical field each one was matched to, and
three sample rows. Anything reported as `(not found)` needs an explicit mapping.

Then dry-run the whole file. Nothing is written, and the report tells you the two
things that decide whether this data can actually be routed on — how many rows
resolved to a county, and which practice-area labels matched no incident type:

```bash
pnpm import:ca-bar-roll -- --file ./data/ca-bar-roll.csv --dry-run
```

If the county resolution rate is poor, that is a signal to extend the city map in
`api/src/lib/ca-counties.ts` from an authoritative crosswalk before importing,
because an attorney with no county reads to the routing engine as serving the
entire state.

When the dry run looks right, stage it for real. This writes only to
`production_attorneys`; the live `Attorney` table is untouched, so a bad import
is thrown away by deleting staging rows:

```bash
pnpm import:ca-bar-roll -- --file ./data/ca-bar-roll.csv
```

Promotion into live attorney records stays a separate, reviewed step, and
promoted attorneys are created with `isVerified: false` so routing will not send
them leads until someone vets them.

---

## If they refuse or stall

- **They quote an unreasonable extraction fee.** Push back on scope, not on
  price: ask for active licensees only, and ask which fields are cheap to export.
  A narrower request is usually the faster lever.
- **They claim the export would require creating a new record.** The CPRA does
  not require an agency to create records, but extracting existing fields from a
  database is not creation. Point at section 7922.570 and offer to accept a raw
  table dump in whatever shape they already hold.
- **They go quiet past the deadline.** Follow up on the portal thread first. The
  next escalation is a letter from counsel citing the response obligation.
- **We need something before the roll arrives.** The directory is public and
  served to any browser, so a scraped sample of a few thousand records is enough
  to exercise the pipeline end to end and validate the county and practice-area
  mapping. Treat that as a test fixture, not as the database: scraping 250,000
  profiles to avoid a records request is slower, less complete, and less
  defensible than the request itself.
