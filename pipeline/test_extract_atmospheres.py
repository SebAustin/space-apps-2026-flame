from pathlib import Path

import pytest

from extract_atmospheres import extract_all, parse_numbers, parse_percentages, to_psia

TABLES = Path(__file__).resolve().parent.parent / "data" / "raw" / "tables"


@pytest.mark.parametrize(
    "text, expected",
    [
        ("22.2", [22.2]),
        ("21.5 - 21.7", [21.5, 21.7]),
        ("~ 21.5", [21.5]),
        ("0.17; 0.21;0.25; 0.3", [0.17, 0.21, 0.25, 0.3]),
        ("0.5; 1.0; 1.5; 2.0; or 3.0 ", [0.5, 1.0, 1.5, 2.0, 3.0]),
        ("21; 26.5; 40", [21.0, 26.5, 40.0]),
        ("", []),
        ("-", []),
        ("n/a", []),
    ],
)
def test_parse_numbers(text, expected):
    assert parse_numbers(text) == expected


def test_to_psia_converts_each_unit():
    assert to_psia(1.0, "atm") == pytest.approx(14.696, abs=1e-3)
    assert to_psia(760.0, "mmHg") == pytest.approx(14.696, abs=1e-3)
    assert to_psia(1.0, "bar") == pytest.approx(14.504, abs=1e-3)
    assert to_psia(10.2, "psia") == 10.2


@pytest.mark.skipif(not TABLES.exists(), reason="raw PSI tables not downloaded")
def test_flex_ranges_come_from_its_table():
    flex = extract_all(TABLES)["PSI-69"]
    assert flex["o2_pct"]["min"] == pytest.approx(12.0, abs=0.01)
    assert flex["o2_pct"]["max"] <= 50.0
    assert flex["o2_pct"]["source_file"] == "PSI-69_Experimental table_FLEX.csv"
    assert 0.5 * 14.5 < flex["pressure_psia"]["min"] < flex["pressure_psia"]["max"]


@pytest.mark.parametrize(
    "text, expected",
    [
        ("~21% O2 with N4", [21.0]),
        ("~30% and ~21% O2 with He", [30.0, 21.0]),
    ],
)
def test_percent_cells_ignore_gas_names(text, expected):
    assert parse_percentages(text) == expected


@pytest.mark.skipif(not TABLES.exists(), reason="raw PSI tables not downloaded")
def test_s_flame_o2_is_21_to_30_percent():
    s_flame = extract_all(TABLES)["PSI-23"]["o2_pct"]
    assert (s_flame["min"], s_flame["max"]) == (21.0, 30.0)


@pytest.mark.skipif(not TABLES.exists(), reason="raw PSI tables not downloaded")
def test_records_without_atmosphere_columns_stay_unknown():
    out = extract_all(TABLES)
    assert out["PSI-26"]["o2_pct"] is None
    assert out["PSI-26"]["pressure_psia"] is None
