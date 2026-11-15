# Project page draft (Space Apps 2026, Flame in Freefall)

Draft written by Claude Code from the built project. The team must review every line before pasting, and fill in the bracketed parts.

## Project Name

Flame in Freefall: Atmosphere Match

## High-Level Summary

Aerospace engineers designing a spacecraft, station, Moon base or pressurized rover need to know which of NASA's microgravity fire experiments were actually run in an atmosphere like theirs. Our dashboard ranks the 19 PSI combustion investigations named in the challenge by how closely their tested oxygen and pressure match a chosen habitat, using each investigation's own PSI experimental table. It names the single test closest to the habitat's air and shows where the evidence stops. For the planned Moon base (30% O₂, 10.2 psi), FLEX test #41 ran at 30% O₂ and 10.3 psia, while the BASS-II and Saffire solid-material fire tests stopped about 8 oxygen points short.

## Demo link

https://web-neon-zeta-66.vercel.app/demo.mp4

## Final Project link

- Live app: https://web-neon-zeta-66.vercel.app
- Code: https://github.com/SebAustin/space-apps-2026-flame

## Detailed Description

**What it does.** The engineer picks a habitat. Its oxygen and pressure come from a quoted source: the challenge statement for the Moon base and pressurized rover (30% O₂ or more at 10.2 psi or less; we check the boundary values), and the PSI-20 description for spacecraft and stations (14.7 psia, 21% O₂). The challenge gives no Mars base atmosphere, so the engineer enters one. Any value can be edited.

For each investigation the page shows:
- the O₂ and pressure range found in its PSI experimental table, with the file name, and whether the habitat's value is inside the range or how far away it is;
- the single test closest to the habitat on both values together, counting only oxygen–nitrogen atmospheres (FLEX also ran CO₂ and helium suppression tests, which are left out and counted);
- "not in PSI table" where a table has no such column, instead of a guess;
- values stated only in a PSI description, labelled as such and quoted (ACME BRE's planned 14.7, 10.2 and 8.2 psia atmospheres);
- descriptions that contradict themselves, shown with both quotes and not ranked (CFI's pressure range).

**Why it matters.** Flammability depends strongly on oxygen concentration and pressure, and exploration habitats are expected to run richer oxygen at lower pressure than the ISS. The ranking shows which microgravity results apply to a given habitat and where no test covers it.

**How it works.** A Python pipeline reads the 18 PSI experimental-table CSVs, converts every pressure to psia and every O₂ value to percent, drops values outside physical bounds as typos, and writes a JSON file with the source file and column of every range. The Next.js app ranks investigations by how many values are known, then by the combined relative gap, then by the nearest single test. 35 automated tests cover the parsing, unit conversion, matching and the data's source quotes.

**Limits.** O₂ and pressure ranges are checked separately; only FLEX, ACME Flame Design and ACME CFI-G list both per test. Ten of the 19 investigations have no O₂ or pressure in their PSI table. Partial-gravity data is not in PSI yet. This is a research aid, not a certification tool.

## NASA Data

- NASA Physical Sciences Informatics (PSI), combustion science records and their experimental tables: BASS (PSI-26), BASS-II (PSI-25), Saffire-I/II/III (PSI-98/99/100), SAME (PSI-102), SAME-R (PSI-101), DAFT/DAFT-2 (PSI-47), FLEX (PSI-69), FLEX-2 (PSI-68), CFI (PSI-39), ACME s-Flame (PSI-23), Flame Design (PSI-10), BRE (PSI-20), E-FIELD Flames (PSI-22), CLD Flame (PSI-21), CFI-G (PSI-159), SPICE (PSI-107), SLICE (PSI-106). https://psi.nasa.gov/physci/repo/search?q=combustion
- NASA Glenn combustion science fact sheets, linked from https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/

## Space Agency Partner and Other Data

None.

## Use of AI (SI)

[Team to confirm and complete.] We used Claude Code (Anthropic) during the event, after kickoff, for:
- collecting the PSI metadata and downloading the 18 experimental tables, with a verbatim source quote for every field;
- writing the data pipeline, the web app, the automated tests, and the deployment;
- asking us clarifying questions about how "relevance" and "atmosphere match" should be defined; the choice of user, of the challenge option and of the atmosphere-match criterion were ours;
- drafting this project page text, which we reviewed;
- [if the ElevenLabs voice is used] the demo video's narration voice is AI-generated (ElevenLabs) and the video carries a visible "AI-generated voice" label.

[Optional, team's decision.] Before the event, on October 25, 2026, we did planning work with Claude Code before reading the rule against pre-event work. When we found the rule we froze that material. This project was started from scratch at kickoff in a new repository and does not reuse it.
