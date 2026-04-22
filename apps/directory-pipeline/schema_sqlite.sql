-- SQLite schema for directory pipeline (when PostgreSQL unavailable)
CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_family TEXT NOT NULL DEFAULT 'directory',
  coverage_scope TEXT NOT NULL DEFAULT 'national',
  jurisdiction_code TEXT,
  priority_tier INTEGER DEFAULT 1,
  base_url TEXT,
  crawl_method TEXT NOT NULL,
  parser_name TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  refresh_frequency_days INTEGER DEFAULT 30,
  rate_limit_rpm INTEGER DEFAULT 60,
  robots_respected INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fetch_jobs (
  job_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,
  http_method TEXT NOT NULL DEFAULT 'GET',
  request_body TEXT NOT NULL DEFAULT '',
  priority INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt_at TEXT,
  last_attempt_at TEXT,
  error_message TEXT,
  response_code INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(source_id, url, http_method, request_body),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS raw_records (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  fetch_job_id TEXT,
  fetched_at TEXT DEFAULT (datetime('now')),
  raw_html TEXT,
  raw_json TEXT,
  status TEXT NOT NULL DEFAULT 'stored',
  checksum TEXT,
  parse_error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS firms (
  firm_id TEXT PRIMARY KEY,
  firm_name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  address_1 TEXT,
  address_2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  practice_summary TEXT,
  source_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attorneys (
  attorney_id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  bar_number TEXT,
  bar_state TEXT,
  license_status TEXT,
  admission_date TEXT,
  firm_id TEXT,
  firm_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address_1 TEXT,
  address_2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  claimed INTEGER DEFAULT 0,
  profile_status TEXT NOT NULL DEFAULT 'draft',
  claim_status TEXT DEFAULT 'unclaimed',
  is_pi_attorney INTEGER,
  pi_confidence REAL,
  case_type_tags TEXT,
  headshot_url TEXT,
  bio_summary TEXT,
  languages TEXT,
  free_consultation INTEGER,
  contingency_fee INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (firm_id) REFERENCES firms(firm_id)
);

CREATE TABLE IF NOT EXISTS attorney_licenses (
  license_id TEXT PRIMARY KEY,
  attorney_id TEXT NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  bar_number TEXT,
  license_status TEXT,
  admission_date TEXT,
  status_date TEXT,
  is_primary INTEGER DEFAULT 0,
  source_id TEXT,
  source_url TEXT,
  raw_record_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (attorney_id) REFERENCES attorneys(attorney_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  FOREIGN KEY (raw_record_id) REFERENCES raw_records(id)
);

CREATE TABLE IF NOT EXISTS attorney_certifications (
  certification_id TEXT PRIMARY KEY,
  attorney_id TEXT NOT NULL,
  certification_name TEXT NOT NULL,
  issuing_body TEXT NOT NULL,
  jurisdiction_code TEXT,
  practice_area_code TEXT,
  status TEXT DEFAULT 'active',
  certified_at TEXT,
  expires_at TEXT,
  source_id TEXT,
  source_url TEXT,
  confidence REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (attorney_id) REFERENCES attorneys(attorney_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS enrichment_jobs (
  job_id TEXT PRIMARY KEY,
  attorney_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  source_url TEXT,
  result_json TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (attorney_id) REFERENCES attorneys(attorney_id)
);

CREATE TABLE IF NOT EXISTS practice_area_taxonomy (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_code TEXT,
  pi_relevant INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_code) REFERENCES practice_area_taxonomy(code)
);

INSERT OR IGNORE INTO practice_area_taxonomy (code, label, pi_relevant) VALUES
  ('auto_accident', 'Auto Accident', 1),
  ('slip_and_fall', 'Slip and Fall', 1),
  ('wrongful_death', 'Wrongful Death', 1),
  ('dog_bite', 'Dog Bite', 1),
  ('medical_malpractice', 'Medical Malpractice', 1),
  ('product_liability', 'Product Liability', 1),
  ('truck_accident', 'Truck Accident', 1),
  ('motorcycle_accident', 'Motorcycle Accident', 1),
  ('premises_liability', 'Premises Liability', 1),
  ('criminal_defense', 'Criminal Defense', 0),
  ('immigration', 'Immigration', 0),
  ('estate_planning', 'Estate Planning', 0),
  ('bankruptcy', 'Bankruptcy', 0);

CREATE TABLE IF NOT EXISTS raw_record_attorney_links (
  raw_record_id TEXT NOT NULL,
  attorney_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (raw_record_id, attorney_id),
  FOREIGN KEY (raw_record_id) REFERENCES raw_records(id),
  FOREIGN KEY (attorney_id) REFERENCES attorneys(attorney_id)
);

CREATE TABLE IF NOT EXISTS parse_results (
  id TEXT PRIMARY KEY,
  raw_record_id TEXT NOT NULL,
  attorney_id TEXT,
  firm_id TEXT,
  parsed_json TEXT NOT NULL,
  parse_status TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (raw_record_id) REFERENCES raw_records(id),
  FOREIGN KEY (attorney_id) REFERENCES attorneys(attorney_id)
);

CREATE INDEX IF NOT EXISTS idx_fetch_jobs_status ON fetch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_fetch_jobs_source ON fetch_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_raw_records_source ON raw_records(source_id);
CREATE INDEX IF NOT EXISTS idx_raw_records_status ON raw_records(status);
CREATE INDEX IF NOT EXISTS idx_raw_record_attorney_links_attorney ON raw_record_attorney_links(attorney_id);
CREATE INDEX IF NOT EXISTS idx_sources_scope ON sources(coverage_scope, jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_sources_family ON sources(source_family);
CREATE INDEX IF NOT EXISTS idx_attorney_licenses_attorney ON attorney_licenses(attorney_id);
CREATE INDEX IF NOT EXISTS idx_attorney_licenses_jurisdiction ON attorney_licenses(jurisdiction_code, license_status);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_attorney ON enrichment_jobs(attorney_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_attorney_certifications_attorney ON attorney_certifications(attorney_id);
