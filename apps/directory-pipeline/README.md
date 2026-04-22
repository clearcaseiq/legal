# Attorney Directory Ingestion Pipeline

**Standalone system — not associated with ClearCaseIQ.**

A multi-stage pipeline for collecting, normalizing, deduplicating, classifying, and publishing attorney/firm directory data.

## Quick Start (California Attorneys)

**Test without database:**

```bash
cd apps/directory-pipeline
pip install -r requirements.txt
python -c "from scripts.fetch_ca_dry_run import main; main()"
```

Fetches sample pages and parses attorneys (~495 from "Smith" search). Output in `raw_samples/`.

**Full pipeline (PostgreSQL required):**

1. Set `DIRECTORY_PIPELINE_DATABASE_URL` in `apps/directory-pipeline/.env` (this overrides a global `DATABASE_URL=sqlite` from your IDE).
2. Create the database and apply the schema in one step:

   ```bash
   cd apps/directory-pipeline
   python scripts/init_postgres_schema.py
   ```

   Or manually: `createdb directory_pipeline` then `psql -d directory_pipeline -f schema.sql`.

3. **California-only scrape to completion (PostgreSQL only):**

   ```powershell
   cd apps/directory-pipeline
   .\run_ca_postgres.ps1 -DatabaseUrl "postgresql://USER:PASSWORD@localhost:5432/directory_pipeline"
   ```

   Equivalent:

   ```bash
   export DIRECTORY_PIPELINE_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/directory_pipeline
   python scripts/init_postgres_schema.py
   python scripts/run_ca_to_completion.py --seed --postgres-only
   ```

   Checkpoint JSON is written under `checkpoints/`.
   Omit `--postgres-only` only if you intentionally use SQLite.

4. Incremental runs: `python -m scripts.seed_ca_jobs` then `python -m scripts.run_pipeline 5 20`

## National Foundation

The pipeline now includes a national source registry for:

- all 50 state bars plus DC
- national directory enrichment sources (`Martindale`, `Justia`, `Avvo`, `FindLaw`)
- generic firm website resolution
- specialty / certification boards (currently California, Florida, Texas seeds)

Seed the registry:

```bash
python -m scripts.seed_national_sources
```

Queue enrichment work for stages 2 to 4:

```bash
python -m scripts.enqueue_enrichment_jobs 250
```

## First Operational State Sources

The pipeline now includes production-ready fetch and parse support for:

- `CA` via the existing California bar search parser
- `FL` via Florida Bar member search result pages
- `PA` via the Pennsylvania attorney lookup JSON API
- `TX` via the Texas Bar POST-backed search results flow

Seed the first live multi-state crawl jobs:

```bash
python -m scripts.seed_high_value_state_jobs --states FL PA TX --max-pages 3
```

Run a local live parser smoke test without writing to the database:

```bash
python -m scripts.fetch_state_bar_dry_run
```

Then process fetched jobs normally:

```bash
python -m scripts.run_fetcher 25
python -m scripts.run_parser 50
```

Notes:

- `TX` search pagination is supported through the hidden result form fields.
- `NY` remains intentionally uncrawled because the official public search page explicitly disallows automated extraction.

## New York Licensed Import Lane

`NY` is now set up as a compliant file-import state instead of a crawler state.

Use this path when you obtain:

- an approved bulk export from New York OCA
- a licensed third-party `NY` attorney dataset
- a manual export prepared for internal use

Supported input formats:

- `CSV`
- `XLSX`
- `JSON`
- `JSONL`

Stage an approved dataset into `raw_records`:

```bash
python -m scripts.import_ny_licensed_dataset path/to/ny_export.csv
```

Validate and preview an approved dataset before staging it:

```bash
python -m scripts.validate_ny_licensed_dataset path/to/ny_export.csv --preview 5
```

Or run the full compliant workflow in one command:

```bash
python -m scripts.run_ny_licensed_import path/to/ny_export.csv --report-path imports/ny-licensed/reports/ny_export.validation.json
```

Or auto-run the newest approved file from the standard drop zone:

```bash
python -m scripts.run_ny_licensed_import_from_dropzone
```

Inventory the `NY` drop zone and see file sizes / row counts:

```bash
python -m scripts.inventory_ny_licensed_dropzone
```

If the source columns do not match the default aliases, pass a field map:

```bash
python -m scripts.import_ny_licensed_dataset path/to/ny_export.csv --field-map examples/ny_licensed_field_map.sample.json
```

Then normalize the staged records into canonical attorneys:

```bash
python -m scripts.run_parser 200 bar_ny_licensed_import
```

Implementation notes:

- the import source is `bar_ny_licensed_import`
- the parser is `parser_ny_licensed_import`
- this keeps `NY` inside the same raw-record and parser flow as the crawl-based states
- no automated access to the public OCA search page is performed
- use `examples/ny_licensed_import_template.csv` as the canonical sample shape for approved exports
- use `examples/ny_licensed_field_map.sample.json` when the licensed source uses different column names
- use `imports/ny-licensed/` as the standard drop zone for incoming files, field maps, and validation reports
- use `imports/ny-licensed/REQUEST_TEMPLATE.md` as the starting point for the official OCA request

## Architecture

```
Source discovery → fetch → parse → normalize → deduplicate → enrich → classify → verify → publish → refresh
```

Each stage is a separate service so failures do not break the whole system.

## Database Setup

### Prerequisites

- PostgreSQL 14+
- Separate database from ClearCaseIQ (e.g. `directory_pipeline`)

### Create Database

```bash
createdb directory_pipeline
```

### Run Schema

```bash
psql -d directory_pipeline -f schema.sql
```

### Connection String

```
postgresql://user:pass@localhost:5432/directory_pipeline
```

## Tables Overview

| Layer | Tables |
|-------|--------|
| **Source registry** | `sources` |
| **Fetch** | `fetch_jobs` |
| **Raw storage** | `raw_records` |
| **Canonical** | `attorneys`, `attorney_licenses`, `firms`, `attorney_firms` |
| **Provenance** | `attorney_field_sources`, `raw_record_attorney_links` |
| **Deduplication** | `merge_log`, `duplicate_candidates` |
| **Claim workflow** | `claim_requests` |
| **Enrichment** | `enrichment_jobs`, `parse_results`, `attorney_certifications` |
| **Review** | `review_queue` |
| **Observability** | `refresh_schedule`, `pipeline_metrics` |
| **Taxonomy** | `practice_area_taxonomy` |

## Source Types

- **Tier 1 (licensing)**: Bar directories, state bar APIs — identity, bar status, admission
- **Tier 2 (firm websites)**: Practice areas, bio, headshot, languages, intake phone
- **Tier 3 (directories)**: Phone, website, office hours, reviews, address cleanup
- **Tier 4 (specialization boards)**: Board certification and specialty validation

## MVP Build Order

1. **Phase 1**: Source registry → fetch jobs → raw storage → 1 licensing parser → canonical attorney table → public profile pages
2. **Phase 2**: Firm website enrichment → dedupe engine → PI classifier → claim flow
3. **Phase 3**: Refresh scheduler → analytics dashboard → human review queue → source expansion

## Deduplication Keys

- **Strong**: `bar_number + bar_state`, exact email, exact website bio URL
- **Secondary**: `full_name + firm + city`, `full_name + phone`, `full_name + website domain`
- **Fuzzy**: Similarity score (name 0.40, firm 0.25, phone 0.20, city 0.10, website 0.05)

## PI Classification

- **Rule-based**: Keywords in title, meta, bio, practice pages
- **Positive**: personal injury, car accident, slip and fall, wrongful death, truck accident
- **Negative**: criminal defense, immigration, estate planning, bankruptcy
- **ML**: Later — bio + practice text classifier

## Legal Guardrails

- Use only public/properly licensed data
- Respect robots.txt
- Rate limit aggressively
- Store source attribution
- Provide "claim / correct this profile" flow
- Provide removal/update request workflow
