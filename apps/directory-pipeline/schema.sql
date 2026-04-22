-- Attorney Directory Ingestion Pipeline
-- Standalone schema - NOT associated with ClearCaseIQ
-- PostgreSQL 14+
-- Run against a separate database (e.g. directory_pipeline)

-- =============================================================================
-- 1. SOURCE REGISTRY
-- =============================================================================
CREATE TABLE sources (
  source_id       TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  source_type     TEXT NOT NULL,  -- 'licensing' | 'firm_website' | 'directory' | 'specialization_board'
  source_family   TEXT NOT NULL DEFAULT 'directory', -- 'state_bar' | 'directory' | 'firm_website' | 'specialization_board'
  coverage_scope  TEXT NOT NULL DEFAULT 'national', -- 'national' | 'state'
  jurisdiction_code TEXT, -- e.g. CA, NY, US
  priority_tier   INT DEFAULT 1,
  base_url        TEXT,
  crawl_method    TEXT NOT NULL,  -- 'sitemap' | 'search_pagination' | 'directory_listing' | 'profile_page' | 'api' | 'detail_lookup'
  parser_name     TEXT NOT NULL,
  active          BOOLEAN DEFAULT true,
  refresh_frequency_days INT DEFAULT 30,
  rate_limit_rpm  INT DEFAULT 60,
  robots_respected BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sources_active ON sources(active) WHERE active = true;
CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_scope ON sources(coverage_scope, jurisdiction_code);
CREATE INDEX idx_sources_family ON sources(source_family);

-- =============================================================================
-- 2. FETCH LAYER
-- =============================================================================
CREATE TABLE fetch_jobs (
  job_id          TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL REFERENCES sources(source_id),
  url             TEXT NOT NULL,
  http_method     TEXT NOT NULL DEFAULT 'GET',
  request_body    TEXT NOT NULL DEFAULT '',
  priority        INT DEFAULT 5,  -- 1=highest, 10=lowest
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed | blocked
  attempts        INT DEFAULT 0,
  max_attempts    INT DEFAULT 3,
  next_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  error_message   TEXT,
  response_code   INT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fetch_jobs_status ON fetch_jobs(status);
CREATE INDEX idx_fetch_jobs_next_attempt ON fetch_jobs(next_attempt_at) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_fetch_jobs_source ON fetch_jobs(source_id);
CREATE UNIQUE INDEX idx_fetch_jobs_source_request ON fetch_jobs(source_id, url, http_method, request_body);

-- =============================================================================
-- 3. RAW STORAGE
-- =============================================================================
CREATE TABLE raw_records (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL REFERENCES sources(source_id),
  source_name     TEXT NOT NULL,
  source_url      TEXT NOT NULL,
  fetch_job_id    TEXT REFERENCES fetch_jobs(job_id),
  fetched_at      TIMESTAMPTZ DEFAULT now(),
  raw_html        TEXT,
  raw_json        JSONB,
  status          TEXT NOT NULL DEFAULT 'stored',  -- stored | parsed | failed | skipped
  checksum        TEXT,  -- SHA256 of content for change detection
  parse_error     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_raw_records_source ON raw_records(source_id);
CREATE INDEX idx_raw_records_status ON raw_records(status);
CREATE INDEX idx_raw_records_checksum ON raw_records(checksum);
CREATE INDEX idx_raw_records_fetched ON raw_records(fetched_at DESC);

-- =============================================================================
-- 4. FIRMS (canonical)
-- =============================================================================
CREATE TABLE firms (
  firm_id         TEXT PRIMARY KEY,
  firm_name       TEXT NOT NULL,
  website         TEXT,
  phone           TEXT,
  address_1       TEXT,
  address_2       TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  practice_summary TEXT,
  source_count    INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_firms_name ON firms(firm_name);
CREATE INDEX idx_firms_state ON firms(state);
CREATE INDEX idx_firms_website ON firms(website) WHERE website IS NOT NULL;

-- =============================================================================
-- 5. ATTORNEYS (canonical)
-- =============================================================================
CREATE TABLE attorneys (
  attorney_id     TEXT PRIMARY KEY,
  first_name      TEXT,
  last_name       TEXT,
  full_name       TEXT NOT NULL,
  bar_number      TEXT,
  bar_state       TEXT,
  license_status  TEXT,  -- Active | Inactive | Suspended | etc.
  admission_date  DATE,
  firm_id         TEXT REFERENCES firms(firm_id),
  firm_name       TEXT,  -- denormalized for display
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  address_1       TEXT,
  address_2       TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  claimed         BOOLEAN DEFAULT false,
  profile_status  TEXT NOT NULL DEFAULT 'draft',  -- draft | published | hidden | flagged
  claim_status    TEXT DEFAULT 'unclaimed',  -- unclaimed | claim_requested | verified | rejected
  is_pi_attorney  BOOLEAN,
  pi_confidence   DECIMAL(3,2),  -- 0.00-1.00
  case_type_tags  TEXT[],  -- auto_accident, slip_and_fall, etc.
  headshot_url    TEXT,
  bio_summary     TEXT,
  languages       TEXT[],
  free_consultation BOOLEAN,
  contingency_fee  BOOLEAN,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attorneys_bar ON attorneys(bar_number, bar_state) WHERE bar_number IS NOT NULL;
CREATE INDEX idx_attorneys_email ON attorneys(email) WHERE email IS NOT NULL;
CREATE INDEX idx_attorneys_firm ON attorneys(firm_id);
CREATE INDEX idx_attorneys_state ON attorneys(state);
CREATE INDEX idx_attorneys_pi ON attorneys(is_pi_attorney) WHERE is_pi_attorney = true;
CREATE INDEX idx_attorneys_claimed ON attorneys(claimed);
CREATE INDEX idx_attorneys_profile_status ON attorneys(profile_status);
CREATE INDEX idx_attorneys_full_name ON attorneys(full_name);

-- =============================================================================
-- 5B. ATTORNEY LICENSES (multi-jurisdiction licensing / status history)
-- =============================================================================
CREATE TABLE attorney_licenses (
  license_id       TEXT PRIMARY KEY,
  attorney_id      TEXT NOT NULL REFERENCES attorneys(attorney_id) ON DELETE CASCADE,
  jurisdiction_code TEXT NOT NULL,
  bar_number       TEXT,
  license_status   TEXT,
  admission_date   DATE,
  status_date      DATE,
  is_primary       BOOLEAN DEFAULT false,
  source_id        TEXT REFERENCES sources(source_id),
  source_url       TEXT,
  raw_record_id    TEXT REFERENCES raw_records(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attorney_licenses_attorney ON attorney_licenses(attorney_id);
CREATE INDEX idx_attorney_licenses_jurisdiction ON attorney_licenses(jurisdiction_code, license_status);
CREATE INDEX idx_attorney_licenses_bar ON attorney_licenses(jurisdiction_code, bar_number) WHERE bar_number IS NOT NULL;
CREATE UNIQUE INDEX idx_attorney_licenses_unique_identity
  ON attorney_licenses(attorney_id, jurisdiction_code, COALESCE(bar_number, ''));

-- =============================================================================
-- 6. ATTORNEY-FIRM JUNCTION (many-to-many)
-- =============================================================================
CREATE TABLE attorney_firms (
  attorney_id     TEXT NOT NULL REFERENCES attorneys(attorney_id) ON DELETE CASCADE,
  firm_id         TEXT NOT NULL REFERENCES firms(firm_id) ON DELETE CASCADE,
  role            TEXT,  -- partner | associate | of_counsel
  is_primary      BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (attorney_id, firm_id)
);

CREATE INDEX idx_attorney_firms_firm ON attorney_firms(firm_id);

-- =============================================================================
-- 7. PROVENANCE (field-level source tracking)
-- =============================================================================
CREATE TABLE attorney_field_sources (
  id              TEXT PRIMARY KEY,
  attorney_id     TEXT NOT NULL REFERENCES attorneys(attorney_id) ON DELETE CASCADE,
  field_name      TEXT NOT NULL,
  field_value     TEXT,
  source_id       TEXT REFERENCES sources(source_id),
  source_name     TEXT NOT NULL,
  source_url      TEXT,
  confidence      DECIMAL(3,2),  -- 0.00-1.00
  extracted_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (attorney_id, field_name, source_id)
);

CREATE INDEX idx_attorney_field_sources_attorney ON attorney_field_sources(attorney_id);

-- =============================================================================
-- 8. DEDUPLICATION
-- =============================================================================
CREATE TABLE merge_log (
  merge_id        TEXT PRIMARY KEY,
  primary_id      TEXT NOT NULL REFERENCES attorneys(attorney_id),
  merged_id       TEXT NOT NULL REFERENCES attorneys(attorney_id),
  merge_reason    TEXT,  -- bar_match | email_match | fuzzy_score
  merge_score     DECIMAL(4,2),
  merged_at       TIMESTAMPTZ DEFAULT now(),
  merged_by       TEXT  -- system | human | rule_name
);

CREATE INDEX idx_merge_log_primary ON merge_log(primary_id);

CREATE TABLE duplicate_candidates (
  id              TEXT PRIMARY KEY,
  attorney_id_1   TEXT NOT NULL REFERENCES attorneys(attorney_id),
  attorney_id_2   TEXT NOT NULL REFERENCES attorneys(attorney_id),
  match_type      TEXT,  -- strong | secondary | fuzzy
  match_score     DECIMAL(4,2),
  status          TEXT DEFAULT 'pending',  -- pending | merged | rejected | conflict
  reviewed_at    TIMESTAMPTZ,
  reviewed_by    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (attorney_id_1, attorney_id_2)
);

CREATE INDEX idx_duplicate_candidates_status ON duplicate_candidates(status);

-- =============================================================================
-- 9. CLAIM WORKFLOW
-- =============================================================================
CREATE TABLE claim_requests (
  request_id      TEXT PRIMARY KEY,
  attorney_id     TEXT NOT NULL REFERENCES attorneys(attorney_id) ON DELETE CASCADE,
  claimant_email  TEXT NOT NULL,
  bar_number      TEXT,
  bar_state       TEXT,
  verification_status TEXT DEFAULT 'pending',  -- pending | verified | failed | manual_review
  claimed_at      TIMESTAMPTZ DEFAULT now(),
  verified_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_claim_requests_attorney ON claim_requests(attorney_id);
CREATE INDEX idx_claim_requests_email ON claim_requests(claimant_email);
CREATE INDEX idx_claim_requests_status ON claim_requests(verification_status);

-- =============================================================================
-- 10. ENRICHMENT & PARSER JOBS
-- =============================================================================
CREATE TABLE enrichment_jobs (
  job_id          TEXT PRIMARY KEY,
  attorney_id     TEXT NOT NULL REFERENCES attorneys(attorney_id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL,  -- practice_areas | coverage | headshot | bio | firm_size
  status          TEXT DEFAULT 'pending',  -- pending | running | completed | failed
  source_url      TEXT,
  result_json     JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_enrichment_jobs_attorney ON enrichment_jobs(attorney_id);
CREATE INDEX idx_enrichment_jobs_status ON enrichment_jobs(status);

-- =============================================================================
-- 10B. ATTORNEY CERTIFICATIONS / SPECIALIZATIONS
-- =============================================================================
CREATE TABLE attorney_certifications (
  certification_id TEXT PRIMARY KEY,
  attorney_id      TEXT NOT NULL REFERENCES attorneys(attorney_id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  issuing_body     TEXT NOT NULL,
  jurisdiction_code TEXT,
  practice_area_code TEXT,
  status           TEXT DEFAULT 'active', -- active | inactive | expired | unknown
  certified_at     DATE,
  expires_at       DATE,
  source_id        TEXT REFERENCES sources(source_id),
  source_url       TEXT,
  confidence       DECIMAL(3,2),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attorney_certifications_attorney ON attorney_certifications(attorney_id);
CREATE INDEX idx_attorney_certifications_practice ON attorney_certifications(practice_area_code);
CREATE INDEX idx_attorney_certifications_issuer ON attorney_certifications(issuing_body);
CREATE UNIQUE INDEX idx_attorney_certifications_unique_identity
  ON attorney_certifications(attorney_id, certification_name, issuing_body, COALESCE(jurisdiction_code, ''));

CREATE TABLE parse_results (
  id              TEXT PRIMARY KEY,
  raw_record_id   TEXT NOT NULL REFERENCES raw_records(id) ON DELETE CASCADE,
  attorney_id     TEXT REFERENCES attorneys(attorney_id) ON DELETE SET NULL,
  firm_id         TEXT REFERENCES firms(firm_id) ON DELETE SET NULL,
  parsed_json     JSONB NOT NULL,
  parse_status    TEXT NOT NULL,  -- success | partial | failed
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_parse_results_raw ON parse_results(raw_record_id);
CREATE INDEX idx_parse_results_attorney ON parse_results(attorney_id);

-- =============================================================================
-- 11. HUMAN REVIEW QUEUE
-- =============================================================================
CREATE TABLE review_queue (
  id              TEXT PRIMARY KEY,
  entity_type     TEXT NOT NULL,  -- attorney | firm | duplicate | claim
  entity_id       TEXT NOT NULL,
  queue_type      TEXT NOT NULL,  -- duplicate_conflict | missing_bar | low_pi_confidence | conflicting_firm | broken_address
  priority        INT DEFAULT 5,
  payload         JSONB,
  status          TEXT DEFAULT 'pending',  -- pending | in_review | resolved
  assigned_to     TEXT,
  resolved_at     TIMESTAMPTZ,
  resolution      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_type ON review_queue(queue_type);
CREATE INDEX idx_review_queue_priority ON review_queue(priority);

-- =============================================================================
-- 12. REFRESH & OBSERVABILITY
-- =============================================================================
CREATE TABLE refresh_schedule (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL REFERENCES sources(source_id),
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  run_status      TEXT,  -- success | partial | failed
  records_processed INT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pipeline_metrics (
  id              TEXT PRIMARY KEY,
  metric_date     DATE NOT NULL,
  source_id       TEXT REFERENCES sources(source_id),
  metric_name     TEXT NOT NULL,  -- fetch_success_rate | parse_success_rate | pi_classified | etc.
  metric_value    DECIMAL(10,4),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (metric_date, source_id, metric_name)
);

CREATE INDEX idx_pipeline_metrics_date ON pipeline_metrics(metric_date);
CREATE INDEX idx_pipeline_metrics_name ON pipeline_metrics(metric_name);

-- =============================================================================
-- 13. PRACTICE AREA TAXONOMY (controlled vocabulary)
-- =============================================================================
CREATE TABLE practice_area_taxonomy (
  code            TEXT PRIMARY KEY,  -- auto_accident, slip_and_fall, etc.
  label           TEXT NOT NULL,
  parent_code     TEXT REFERENCES practice_area_taxonomy(code),
  pi_relevant     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE attorney_certifications
  ADD CONSTRAINT fk_attorney_certifications_practice_area
  FOREIGN KEY (practice_area_code) REFERENCES practice_area_taxonomy(code);

-- Seed common PI taxonomy
INSERT INTO practice_area_taxonomy (code, label, pi_relevant) VALUES
  ('auto_accident', 'Auto Accident', true),
  ('slip_and_fall', 'Slip and Fall', true),
  ('wrongful_death', 'Wrongful Death', true),
  ('dog_bite', 'Dog Bite', true),
  ('medical_malpractice', 'Medical Malpractice', true),
  ('product_liability', 'Product Liability', true),
  ('truck_accident', 'Truck Accident', true),
  ('motorcycle_accident', 'Motorcycle Accident', true),
  ('premises_liability', 'Premises Liability', true),
  ('criminal_defense', 'Criminal Defense', false),
  ('immigration', 'Immigration', false),
  ('estate_planning', 'Estate Planning', false),
  ('bankruptcy', 'Bankruptcy', false);

-- =============================================================================
-- 14. RAW RECORD → ATTORNEY MAPPING (for traceability)
-- =============================================================================
CREATE TABLE raw_record_attorney_links (
  raw_record_id   TEXT NOT NULL REFERENCES raw_records(id) ON DELETE CASCADE,
  attorney_id     TEXT NOT NULL REFERENCES attorneys(attorney_id) ON DELETE CASCADE,
  link_type       TEXT NOT NULL,  -- created | enriched | matched
  created_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (raw_record_id, attorney_id)
);

CREATE INDEX idx_raw_record_attorney_links_attorney ON raw_record_attorney_links(attorney_id);

-- =============================================================================
-- 15. HELPER VIEWS
-- =============================================================================
CREATE VIEW v_publishable_attorneys AS
SELECT a.*, f.firm_name AS canonical_firm_name, f.website AS firm_website
FROM attorneys a
LEFT JOIN firms f ON a.firm_id = f.firm_id
WHERE a.profile_status = 'published'
  AND (a.is_pi_attorney = true OR a.claimed = true)
  AND a.full_name IS NOT NULL;

CREATE VIEW v_stale_profiles AS
SELECT a.attorney_id, a.full_name, a.updated_at, a.profile_status,
       (SELECT MAX(fetched_at) FROM raw_records rr
        JOIN raw_record_attorney_links rral ON rr.id = rral.raw_record_id
        WHERE rral.attorney_id = a.attorney_id) AS last_source_fetch
FROM attorneys a
WHERE a.profile_status = 'published'
  AND a.updated_at < now() - interval '90 days';

-- =============================================================================
-- 16. UPDATED_AT TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER fetch_jobs_updated_at BEFORE UPDATE ON fetch_jobs
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER firms_updated_at BEFORE UPDATE ON firms
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER attorneys_updated_at BEFORE UPDATE ON attorneys
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER claim_requests_updated_at BEFORE UPDATE ON claim_requests
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER refresh_schedule_updated_at BEFORE UPDATE ON refresh_schedule
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
