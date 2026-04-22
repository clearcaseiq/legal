"""Pipeline configuration."""
import os
try:
    from dotenv import load_dotenv
    _env = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(_env):
        load_dotenv(_env)
except Exception:
    pass

DATABASE_URL = os.getenv(
    "DIRECTORY_PIPELINE_DATABASE_URL",
    os.getenv("DATABASE_URL", "sqlite"),
)

# Rate limiting - be conservative with CA Bar
RATE_LIMIT_DELAY_SECONDS = 3  # Min seconds between requests
MAX_CONCURRENT_FETCHES = 1
USER_AGENT = "ClearCaseIQ-DirectoryPipeline/1.0 (+https://clearcaseiq.com; research)"

# CA Bar search
CA_BAR_BASE = "https://apps.calbar.ca.gov"
CA_BAR_SEARCH = f"{CA_BAR_BASE}/attorney/LicenseeSearch"
