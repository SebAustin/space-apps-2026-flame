"""Extract the tested oxygen and pressure ranges of each PSI combustion record.

Reads the "Experimental table" CSVs in data/raw/tables and writes
web/src/data/atmospheres.json: for each PSI accession, the min and max ambient
O2 (percent by volume) and pressure (psia) found in its table, with the file and
column each range came from. A record whose table has no such column gets null,
never a guess.

Where a table has no such column, a value stated in the record's PSI description is used
and marked as such; a description that contradicts itself is reported, not ranked.
Each single test also records its balance gas (N2, other, or unknown).

Inverse flames (oxygen flowing out of the burner into a fuel atmosphere) are
skipped for O2: their O2 column describes the burner stream, not the ambient.

Run: python3 -I pipeline/extract_atmospheres.py
"""

import csv
import io
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TABLES = ROOT / "data" / "raw" / "tables"
OUT = ROOT / "web" / "src" / "data" / "atmospheres.json"
# The app is deployed from web/, so it reads its own copy of the PSI metadata.
METADATA = ROOT / "data" / "psi" / "investigations.json"
METADATA_COPY = ROOT / "web" / "src" / "data" / "investigations.json"

PSIA_PER = {"psia": 1.0, "atm": 14.6959, "bar": 14.5038, "mmHg": 14.6959 / 760.0}

# (accession, file, quantity, column, unit). Units: "pct" or "fraction" for O2,
# a PSIA_PER key for pressure. Columns are exact header text from each CSV.
COLUMNS = [
    ("PSI-25", "PSI-25_Experimental table_BASS-II.csv", "o2", "Calibrated  initial O2 % by vol ", "pct"),
    ("PSI-98", "PSI-98_Experimental table_SAFFIRE-1.csv", "o2", "Percent O2", "pct"),
    ("PSI-99", "PSI-99_Experimental table_SAFFIRE-2.csv", "o2", "Percent O2 (Note 1)", "pct"),
    ("PSI-69", "PSI-69_Experimental table_FLEX.csv", "o2", "O initial ambient composition; mole fraction", "fraction"),
    ("PSI-69", "PSI-69_Experimental table_FLEX.csv", "pressure", "Ambient pressure; mmHg", "mmHg"),
    ("PSI-68", "PSI-68_Experimental table_Flex2.csv", "o2", "Oxygen Mole Fraction", "fraction"),
    ("PSI-68", "PSI-68_Experimental table_Flex2.csv", "pressure", "Ambient Pressure (atm)", "atm"),
    ("PSI-23", "PSI-23_Experimental table_ACME s-Flame.csv", "o2", "Atmosphere*", "pct"),
    ("PSI-10", "PSI-10_Experimental table_Flame Design_Normal Flame.csv", "o2", "XO2 (init)", "fraction"),
    ("PSI-10", "PSI-10_Experimental table_Flame Design_Normal Flame.csv", "pressure", "pmean (atm)", "atm"),
    ("PSI-10", "PSI-10_Experimental table_Flame Design_Inverse Flame.csv", "pressure", "pmean (atm)", "atm"),
    ("PSI-20", "PSI-20_Experimental table_ACME BRE.csv", "o2", "Oxygen Conc (percent)", "pct"),
    ("PSI-159", "PSI-159_Experimental table_CFI-G_Normal Flames.csv", "o2", " XO2 before test", "fraction"),
    ("PSI-159", "PSI-159_Experimental table_CFI-G_Normal Flames.csv", "pressure", "approx p (bar)", "bar"),
    ("PSI-159", "PSI-159_Experimental table_CFI-G_Inverse Flames.csv", "pressure", "approx p (bar)", "bar"),
]

# Tables with one row per test and both values on that row:
# (accession, file, test-id columns, O2 column, O2 unit, pressure column, pressure unit,
#  columns of non-nitrogen diluents, or None when the table states no diluent).
PER_TEST = [
    ("PSI-69", "PSI-69_Experimental table_FLEX.csv", ("FLEX Test #", "FLEX Identifier"),
     "O initial ambient composition; mole fraction", "fraction", "Ambient pressure; mmHg", "mmHg",
     ("CO initial ambient composition; mole fraction", "He initial ambient composition; mole fraction")),
    ("PSI-10", "PSI-10_Experimental table_Flame Design_Normal Flame.csv", ("Test",),
     "XO2 (init)", "fraction", "pmean (atm)", "atm", None),
    ("PSI-159", "PSI-159_Experimental table_CFI-G_Normal Flames.csv", ("Test",),
     " XO2 before test", "fraction", "approx p (bar)", "bar", None),
]

PSI_API = "https://psi.nasa.gov/geode-py/ws/repo/investigations/"

# Values stated in a PSI record's description (not its table), used only when the
# table has no such column. Quotes are verbatim from the record's objective.
STATED = [
    ("PSI-20", "pressure", [14.7, 10.2, 8.2], "objective",
     "NASA - considered atmosphere for human space missions will be examined: 14.7 psia, 21 % oxygen: "
     "10.2 psia, 26.5 %; and 8.2 psia, 34 % oxygen."),
]

# Descriptions that contradict themselves: shown on the page, never ranked.
CONFLICTS = [
    ("PSI-39", "pressure", [
        ("objective", "at pressures ranging from 0.25 atm to 5 atm"),
        ("approach", "delivers the desired gas mixture to the combustion chamber ranging from 0.25 to 0.5 atm"),
    ]),
]

ALL_RECORDS = [
    "PSI-26", "PSI-25", "PSI-98", "PSI-99", "PSI-100", "PSI-102", "PSI-101", "PSI-47",
    "PSI-69", "PSI-68", "PSI-39", "PSI-23", "PSI-10", "PSI-20", "PSI-22", "PSI-21",
    "PSI-159", "PSI-107", "PSI-106",
]

# Plausible ambient ranges; values outside are table typos and are dropped.
PLAUSIBLE = {"o2": (5.0, 100.0), "pressure": (0.5, 200.0)}

NUMBER = re.compile(r"\d+(?:\.\d+)?")


def parse_numbers(text: str) -> list[float]:
    """Every number in a cell: "21.5 - 21.7" -> [21.5, 21.7]; "-" -> []."""
    return [float(m) for m in NUMBER.findall(text or "")]


PERCENT = re.compile(r"(\d+(?:\.\d+)?)\s*%")


def parse_percentages(text: str) -> list[float]:
    """Only numbers written as percentages: "~21% O2 with N4" -> [21.0]."""
    return [float(m) for m in PERCENT.findall(text or "")]


def to_psia(value: float, unit: str) -> float:
    return value * PSIA_PER[unit]


def read_rows(path: Path) -> list[dict[str, str]]:
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return list(csv.DictReader(io.StringIO(text)))


def column_values(path: Path, column: str, quantity: str, unit: str) -> list[float]:
    values = []
    for row in read_rows(path):
        cell = row.get(column, "") or ""
        numbers = parse_percentages(cell) if "%" in cell else parse_numbers(cell)
        for v in numbers:
            if quantity == "o2":
                v = v * 100.0 if unit == "fraction" else v
            else:
                v = to_psia(v, unit)
            lo, hi = PLAUSIBLE[quantity]
            if lo <= v <= hi:
                values.append(v)
    return values


def extract_all(tables: Path = TABLES) -> dict:
    found: dict[str, dict[str, list]] = {acc: {"o2": [], "pressure": []} for acc in ALL_RECORDS}
    for acc, fname, quantity, column, unit in COLUMNS:
        path = tables / fname
        if not path.exists():
            continue
        vals = column_values(path, column, quantity, unit)
        if vals:
            found[acc][quantity].append((fname, column, vals))

    tests = {acc: [] for acc in ALL_RECORDS}
    for acc, fname, id_cols, o2_col, o2_unit, p_col, p_unit, diluents in PER_TEST:
        path = tables / fname
        if path.exists():
            tests[acc].extend(per_test_points(path, id_cols, o2_col, o2_unit, p_col, p_unit, diluents))

    out = {}
    for acc, q in found.items():
        out[acc] = {
            "o2_pct": summarize(q["o2"]),
            "pressure_psia": summarize(q["pressure"]),
            "tests": tests[acc],
            "notes": [],
        }
    for acc, quantity, values, locator, quote in STATED:
        key = "o2_pct" if quantity == "o2" else "pressure_psia"
        if out[acc][key] is None:
            out[acc][key] = {
                "min": min(values),
                "max": max(values),
                "basis": "description",
                "source_url": PSI_API + acc,
                "locator": locator,
                "quote": quote,
            }
    for acc, quantity, statements in CONFLICTS:
        out[acc]["notes"].append({
            "quantity": quantity,
            "kind": "conflict",
            "statements": [
                {"source_url": PSI_API + acc, "locator": loc, "quote": q} for loc, q in statements
            ],
        })
    return out


def balance_gas(row: dict, diluents) -> str:
    """ "N2" when the row lists no other diluent, "other" for CO2/He, "unknown" if not stated."""
    if diluents is None:
        return "unknown"
    other = [v for c in diluents for v in parse_numbers(row.get(c, ""))]
    return "other" if any(v > 0 for v in other) else "N2"


def per_test_points(path: Path, id_cols, o2_col, o2_unit, p_col, p_unit, diluents=None) -> list[dict]:
    """One point per table row that states a single O2 and a single pressure."""
    points = []
    for row in read_rows(path):
        o2 = parse_numbers(row.get(o2_col, ""))
        p = parse_numbers(row.get(p_col, ""))
        if len(o2) != 1 or len(p) != 1:
            continue
        o2_pct = o2[0] * 100.0 if o2_unit == "fraction" else o2[0]
        p_psia = to_psia(p[0], p_unit)
        if not (PLAUSIBLE["o2"][0] <= o2_pct <= PLAUSIBLE["o2"][1]):
            continue
        if not (PLAUSIBLE["pressure"][0] <= p_psia <= PLAUSIBLE["pressure"][1]):
            continue
        ids = [(row.get(c) or "").strip() for c in id_cols]
        label = f"FLEX #{ids[0]}, {ids[1]}" if path.name.startswith("PSI-69") else ", ".join(i for i in ids if i)
        points.append({
            "test": label,
            "o2_pct": round(o2_pct, 2),
            "pressure_psia": round(p_psia, 2),
            "balance": balance_gas(row, diluents),
            "source_file": path.name,
        })
    return points


def summarize(parts: list) -> dict | None:
    if not parts:
        return None
    vals = [v for _, _, vs in parts for v in vs]
    return {
        "min": round(min(vals), 2),
        "max": round(max(vals), 2),
        "n_values": len(vals),
        "source_file": "; ".join(sorted({f for f, _, _ in parts})),
        "source_column": "; ".join(sorted({c.strip() for _, c, _ in parts})),
        "basis": "table",
    }


if __name__ == "__main__":
    result = extract_all()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2) + "\n")
    METADATA_COPY.write_bytes(METADATA.read_bytes())
    for acc, r in result.items():
        print(acc, r["o2_pct"] and (r["o2_pct"]["min"], r["o2_pct"]["max"]),
              r["pressure_psia"] and (r["pressure_psia"]["min"], r["pressure_psia"]["max"]))
