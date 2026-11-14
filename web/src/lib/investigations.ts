import raw from "../data/investigations.json";
import atmospheres from "../data/atmospheres.json";
import type { Balance, Range, Tested, TestPoint } from "./match";

type Sourced = { value: unknown; source_url: string; locator: string | null; quote: string } | null;
type RawRecord = Record<string, Sourced> & { challenge_name: string; scope: string };

export type Extracted =
  | { basis: "table"; min: number; max: number; n_values: number; source_file: string; source_column: string }
  | { basis: "description"; min: number; max: number; source_url: string; locator: string; quote: string }
  | null;

export type Note = {
  quantity: "o2" | "pressure";
  kind: "conflict";
  statements: { source_url: string; locator: string; quote: string }[];
};

type Point = TestPoint & { balance: Balance; source_file: string };

export type Investigation = Tested & {
  name: string;
  title: string | null;
  hardware: string | null;
  objective: Sourced;
  doiUrl: string | null;
  o2Source: Extracted;
  pressureSource: Extracted;
  tests: Point[];
  notes: Note[];
};

const text = (s: Sourced) => (s && typeof s.value === "string" ? s.value : null);
const range = (e: Extracted): Range | null => (e ? { min: e.min, max: e.max } : null);

/** The investigations named in the challenge statement, one per PSI record. */
export function loadInvestigations(): Investigation[] {
  const byId = new Map<string, Investigation>();
  for (const r of raw as unknown as RawRecord[]) {
    if (r.scope !== "requested") continue;
    const id = text(r.psi_accession);
    if (!id) continue;
    const existing = byId.get(id);
    if (existing) {
      existing.name = `${existing.name} / ${r.challenge_name}`;
      continue;
    }
    const atm = (
      atmospheres as unknown as Record<
        string,
        { o2_pct: Extracted; pressure_psia: Extracted; tests: Point[]; notes: Note[] }
      >
    )[id];
    const doi = text(r.doi);
    byId.set(id, {
      id,
      name: r.challenge_name,
      title: text(r.title),
      hardware: text(r.platform_hardware),
      objective: r.objective,
      doiUrl: doi ? `https://doi.org/${doi.replace(/^https?:\/\/doi\.org\//, "")}` : null,
      o2_pct: range(atm?.o2_pct ?? null),
      pressure_psia: range(atm?.pressure_psia ?? null),
      o2Source: atm?.o2_pct ?? null,
      pressureSource: atm?.pressure_psia ?? null,
      tests: atm?.tests ?? [],
      notes: atm?.notes ?? [],
    });
  }
  return [...byId.values()];
}
