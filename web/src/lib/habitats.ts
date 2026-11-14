export type Habitat = {
  id: string;
  name: string;
  o2_pct: number | null;
  pressure_psia: number | null;
  source: { label: string; url: string; quote: string } | null;
  note?: string;
};

const CABIN_AIR = {
  label: "PSI-20 (ACME BRE), objective",
  url: "https://psi.nasa.gov/geode-py/ws/repo/investigations/PSI-20",
  quote:
    "NASA - considered atmosphere for human space missions will be examined: 14.7 psia, 21 % oxygen: 10.2 psia, 26.5 %; and 8.2 psia, 34 % oxygen.",
};

const MOON_BASE = {
  label: "Challenge statement, Potential Considerations",
  url: "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/",
  quote:
    "The intermediate oxygen concentration used on the Moon will likely be 30% or greater, with a corresponding pressure of 10.2 psi or less.",
};

export const HABITATS: Habitat[] = [
  { id: "spacecraft", name: "Spacecraft", o2_pct: 21, pressure_psia: 14.7, source: CABIN_AIR },
  { id: "station", name: "Space station", o2_pct: 21, pressure_psia: 14.7, source: CABIN_AIR },
  { id: "moon-base", name: "Moon base", o2_pct: 30, pressure_psia: 10.2, source: MOON_BASE, note: "The statement gives a range (30% O₂ or more, 10.2 psi or less); this checks its boundary values, 30% and 10.2 psia." },
  { id: "rover", name: "Pressurized rover", o2_pct: 30, pressure_psia: 10.2, source: MOON_BASE, note: "The statement gives a range (30% O₂ or more, 10.2 psi or less); this checks its boundary values, 30% and 10.2 psia." },
  { id: "mars-base", name: "Mars base", o2_pct: null, pressure_psia: null, source: null },
];
