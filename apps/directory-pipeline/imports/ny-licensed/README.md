# New York Licensed Import Drop Zone

Place approved `NY` attorney export files here before running the import workflow.

Recommended layout:

- `incoming/` for the approved source file
- `field-maps/` for source-specific field-map JSON files
- `reports/` for validation reports
- `REQUEST_TEMPLATE.md` for the official OCA request draft
- `MANIFEST.template.json` for dataset receipt metadata

Inventory the drop zone before importing:

```bash
python -m scripts.inventory_ny_licensed_dropzone
```

Typical workflow:

```bash
python -m scripts.run_ny_licensed_import "imports/ny-licensed/incoming/ny_export.csv" --report-path "imports/ny-licensed/reports/ny_export.validation.json"
```

Auto-run from the drop zone without specifying the file name:

```bash
python -m scripts.run_ny_licensed_import_from_dropzone
```

Behavior:

- selects the most recently modified `csv/json/jsonl/xlsx` file in `incoming/`
- writes the validation report into `reports/`
- uses `field-maps/<dataset>.field-map.json` automatically when present
- uses `MANIFEST.json` or `<dataset>.manifest.json` when present

If the source columns differ from the canonical aliases:

```bash
python -m scripts.run_ny_licensed_import "imports/ny-licensed/incoming/ny_export.csv" --field-map "imports/ny-licensed/field-maps/ny_export.field-map.json" --report-path "imports/ny-licensed/reports/ny_export.validation.json"
```
