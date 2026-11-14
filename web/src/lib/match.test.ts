import { describe, expect, it } from "vitest";
import { dimensionMatch, rankByAtmosphere, type Tested } from "./match";

const r = (min: number, max: number) => ({ min, max });

describe("dimensionMatch", () => {
  it("is covered when the target lies inside the tested range", () => {
    expect(dimensionMatch(30, r(17, 40))).toEqual({ status: "covered", gap: 0 });
  });

  it("is covered at the range edges", () => {
    expect(dimensionMatch(17, r(17, 40)).status).toBe("covered");
    expect(dimensionMatch(40, r(17, 40)).status).toBe("covered");
  });

  it("reports the distance to the nearest edge when outside", () => {
    expect(dimensionMatch(30, r(13.6, 22.2))).toEqual({ status: "gap", gap: 30 - 22.2 });
    expect(dimensionMatch(10.2, r(14.7, 44))).toEqual({ status: "gap", gap: 14.7 - 10.2 });
  });

  it("is unknown when the table states no range", () => {
    expect(dimensionMatch(30, null)).toEqual({ status: "unknown", gap: null });
  });
});

describe("rankByAtmosphere", () => {
  const records: Tested[] = [
    { id: "A", o2_pct: r(13.6, 22.2), pressure_psia: null },
    { id: "B", o2_pct: r(17, 40), pressure_psia: r(7, 48) },
    { id: "C", o2_pct: null, pressure_psia: null },
    { id: "D", o2_pct: r(21, 26), pressure_psia: r(7, 48) },
  ];
  const target = { o2_pct: 30, pressure_psia: 10.2 };

  it("puts investigations that cover both values first", () => {
    expect(rankByAtmosphere(records, target)[0].id).toBe("B");
  });

  it("ranks known-but-off before partly unknown, and unknown last", () => {
    expect(rankByAtmosphere(records, target).map((x) => x.id)).toEqual(["B", "D", "A", "C"]);
  });

  it("never lets a closer O2 beat a fully known match because a value is missing", () => {
    const ranked = rankByAtmosphere(records, target);
    expect(ranked.findIndex((x) => x.id === "D")).toBeLessThan(ranked.findIndex((x) => x.id === "A"));
  });
});
