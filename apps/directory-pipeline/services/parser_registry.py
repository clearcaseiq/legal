"""Registry of supported source parsers."""

from services.parser_ca_bar import run_parser_ca_bar
from services.parser_fl_bar import run_parser_fl_bar
from services.parser_ny_licensed_import import run_parser_ny_licensed_import
from services.parser_pa_bar import run_parser_pa_bar
from services.parser_tx_bar import run_parser_tx_bar

PARSER_RUNNERS = {
    "ca_bar_licensing": run_parser_ca_bar,
    "bar_fl_licensing": run_parser_fl_bar,
    "bar_ny_licensed_import": run_parser_ny_licensed_import,
    "bar_pa_licensing": run_parser_pa_bar,
    "bar_tx_licensing": run_parser_tx_bar,
}


def run_registered_parsers(batch_size: int = 20, source_ids: list[str] | None = None):
    selected = source_ids or list(PARSER_RUNNERS.keys())
    parsed_total = 0

    for source_id in selected:
        runner = PARSER_RUNNERS.get(source_id)
        if not runner:
            print(f"Skipping unsupported parser source: {source_id}")
            continue
        parsed_total += runner(batch_size=batch_size)

    return parsed_total
