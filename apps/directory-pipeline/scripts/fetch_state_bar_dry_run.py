#!/usr/bin/env python3
"""Fetch small live samples from high-value state sources and parse them locally."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.fetcher import fetch_url
from services.parser_fl_bar import parse_fl_bar_search_page
from services.parser_pa_bar import parse_pa_bar_response
from services.parser_tx_bar import parse_tx_bar_search_page

SAMPLES = {
    "FL": {
        "url": "https://www.floridabar.org/directories/find-mbr/?lName=Ab&pageNumber=1&pageSize=10",
        "http_method": "GET",
        "request_body": None,
        "parser": lambda result, url: parse_fl_bar_search_page(result["html"] or "", url),
    },
    "PA": {
        "url": "https://www.padisciplinaryboard.org/api/attorneysearch?last=smith&page=1",
        "http_method": "GET",
        "request_body": None,
        "parser": lambda result, url: parse_pa_bar_response(result["raw_json"] or "{}", url),
    },
    "TX": {
        "url": "https://www.texasbar.com/AM/Template.cfm?Section=Find_A_Lawyer&Template=/CustomSource/MemberDirectory/Result_form_client.cfm",
        "http_method": "POST",
        "request_body": json.dumps({"Submitted": "1", "Firstname": "", "LastName": "Smith", "CompanyName": ""}),
        "parser": lambda result, url: parse_tx_bar_search_page(result["html"] or "", url),
    },
}


def main():
    states = [state.upper() for state in sys.argv[1:]] or list(SAMPLES.keys())
    for state in states:
        sample = SAMPLES[state]
        print(f"=== {state} ===")
        result = fetch_url(
            sample["url"],
            source_id=f"dry_run_{state.lower()}",
            source_name=f"{state} Dry Run",
            http_method=sample["http_method"],
            request_body=sample["request_body"],
        )
        attorneys = sample["parser"](result, sample["url"])
        print(f"Fetched status={result.get('status')} parsed={len(attorneys)}")
        for attorney in attorneys[:5]:
            print(
                f"  - {attorney.get('full_name')} | "
                f"{attorney.get('license_status') or attorney.get('city') or 'n/a'} | "
                f"{attorney.get('bar_number') or attorney.get('external_key') or 'n/a'}"
            )


if __name__ == "__main__":
    main()
