import { describe, expect, it } from "vitest";
import records from "../../../data/psi/investigations.json";

type Sourced = { value: unknown; source_url: string; locator: string | null; quote: string };

const FIELDS = [
  "psi_accession", "title", "objective", "fuel_and_sample", "o2_range", "pressure",
  "flow_speed_range", "varied_between_tests", "sensors_measurements",
] as const;

describe("PSI investigation metadata", () => {
  it("covers 25 records, each with a PSI accession", () => {
    expect(records).toHaveLength(25);
    for (const r of records as Record<string, Sourced | null>[]) {
      expect(r.psi_accession?.value).toMatch(/^PSI-\d+$/);
    }
  });

  it("gives every filled field a source URL and a verbatim quote", () => {
    for (const r of records as Record<string, Sourced | null>[]) {
      for (const f of FIELDS) {
        const v = r[f];
        if (v === null || v === undefined) continue;
        expect(v.source_url, `${r.psi_accession?.value} ${f}`).toMatch(/^https:\/\//);
        expect(v.quote.trim().length, `${r.psi_accession?.value} ${f}`).toBeGreaterThan(0);
      }
    }
  });
});
