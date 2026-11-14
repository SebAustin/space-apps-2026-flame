# PSI combustion investigations: gaps and conflicts

Collected 2026-11-14 from the PSI API (`/geode-py/ws/repo/investigations/PSI-xx` and `/versions`), the Glenn
Combustion Science page, and the eight fact-sheet PDFs linked from that page. Every comparison-field quote in
investigations.json was checked by script as a verbatim substring of its source (0 failures).

## Coverage
- All 20 requested names map to a public PSI record (19 distinct accessions; DAFT and DAFT-2 share PSI-47).
- PSI's search endpoint (`/geode-py/ws/repo/search?q=...`) ignores `q` and returns the whole public catalog (133 records).
  Filtering on Research Area = Combustion Science gives 24 records: the 19 above plus 5 ground/modeling projects
  (PSI-60 SPICE data analysis, PSI-62 BASS flamelet modeling, PSI-115 SAME smoke modeling, PSI-117 cool-flame CFD,
  PSI-142 counterflow cool flames). They are included with metadata only.
- PSI-11, 14, 53–56, 61, 63, 65, 92, 104 return HTTP 403 (not public); contents unknown. PSI-161..191 were not iterated
  one by one, but the full catalog listing covers all public records.
- Not in PSI: Saffire-IV, -V, -VI, FLEX-2J, FLEX-ICE-GA, SoFIE, FLARE, FM2 (named on Glenn page or fact sheets only).
- Comparison-field coverage over the 20 requested: objective 20, fuel/sample 20, sensors 20, varied 17,
  flow speed 9, O2 range 4 (BASS-II, FLEX, FLEX-2, BRE), pressure 4 (FLEX, FLEX-2, CFI, BRE).
  O2 and pressure are mostly absent from PSI text; they likely live in each record's Experimental table CSV,
  which was not parsed (data, not narrative text).
- PSI `description` is empty for every record; `short_description` is the first sentences of `objective`.
- Readme/docx files (e.g. BASS-II_ReadMe.docx, SAFFIRE-I and SAFFIRE-III Readme.docx) were not downloaded.

## Metadata gaps
- PSI-10 (Flame Design): `licenseIdentifier` empty (all others CC0-1.0).
- PSI-25 (BASS-II): no contact has the PI role (all five are Co-I); the BASS fact sheet names Paul Ferkul as BASS PI.
- PSI-106 (SLICE): `experimentHardware` empty; filled from the ACME fact sheet (MSG, early 2012, SPICE hardware).
- PSI-107, 106, 159: start/end dates empty. PSI-60/62 have no data files (metadata zip only).
- File counts via the latest record's `added` list are misleading (FLEX/FLEX-2/E-FIELD show 0); counts in
  investigations.json come from the union of all versions.

## Conflicts between sources
- BASS flow: PSI "as high as 40 cm/s" vs fact sheet "5 to 50 cm/s".
- Saffire-I sample: PSI "0.94 meters long and 0.4 meters wide" vs fact sheet "0.4 m wide by 1 meter long".
- Saffire-I dates: PSI start/end 03-02-2001 to 02-28-2008 (identical to SAME, likely copied) vs fact sheet
  "Mission Completed July 2016".
- Saffire-II `flightProgram` "Cygnus Spacecraft" vs Saffire-I/III "International Space Station (ISS)".
- Saffire-III `researchImpacts` text says "The Saffire-I experiment" (copied).
- FLEX pressure: PSI "0.5 − 1.5 atm" vs fact sheet "0.5 to 1.0 atm"; suppressants PSI "CO2, He, and SF6" vs fact
  sheet "carbon dioxide and helium". Fact-sheet values are worded as planned ("will vary").
- CFI pressure, internal to PSI-39: objective "0.25 atm to 5 atm" vs approach "0.25 to 0.5 atm". Its approach also
  says fuels were "diluted with molecular oxygen, atomic nitrogen" (likely an error). CFI analyzed-data files are
  named FLEX-12xx.
- SPICE test count: PSI "526 flames" vs fact sheet "250 combustion tests", "more than 70 smoke points".
- ACME count, internal to the ACME fact sheet: "five independent experiments" and "six independent experiments".
- BASS-II: fact sheet "100 fuel samples"; the project's own notes say the matrix has 129 tests (not checked here).

## Relevant to the Mission
- BRE (PSI-20) states flames in elevated-O2 atmospheres burned on without air flow, "whereas such flames in a normal
  atmosphere of 21% oxygen self-extinguished in a short time" (researchImpacts; results called preliminary).
- BRE objective lists the 14.7 psia/21%, 10.2 psia/26.5% and 8.2 psia/34% atmospheres.
