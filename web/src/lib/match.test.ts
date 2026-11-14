import { describe, expect, it } from "vitest";
import { dimensionMatch, nearestAirTest, nearestTest, rankByAtmosphere, type Tested } from "./match";

describe("nearestAirTest", () => {
  const target = { o2_pct: 30, pressure_psia: 10.2 };
  const pt = (test: string, o2_pct: number, pressure_psia: number, balance: "N2" | "other" | "unknown") => ({
    test,
    o2_pct,
    pressure_psia,
    balance,
  });

  it("ignores CO2 and helium tests even when they are closer, and counts them", () => {
    const r = nearestAirTest([pt("helium", 30, 10.2, "other"), pt("air", 29, 10.4, "N2")], target)!;
    expect(r.nearest.test.test).toBe("air");
    expect(r.balance).toBe("N2");
    expect(r.excludedOther).toBe(1);
  });

  it("falls back to tests whose balance gas is not stated, and says so", () => {
    const r = nearestAirTest([pt("unstated", 30, 10.2, "unknown")], target)!;
    expect(r.balance).toBe("unknown");
  });

  it("is null when only non-air tests exist", () => {
    expect(nearestAirTest([pt("helium", 30, 10.2, "other")], target)).toBeNull();
  });
});

describe("nearestTest", () => {
  const target = { o2_pct: 30, pressure_psia: 10.2 };
  const pt = (test: string, o2_pct: number, pressure_psia: number) => ({ test, o2_pct, pressure_psia });

  it("is null when the table lists no single tests", () => {
    expect(nearestTest([], target)).toBeNull();
  });

  it("picks the test closest on both values together, not on one", () => {
    const tests = [pt("o2-only", 30, 14.7), pt("both-near", 29, 10.3), pt("p-only", 21, 10.2)];
    expect(nearestTest(tests, target)?.test.test).toBe("both-near");
  });

  it("reports each value's difference from the target", () => {
    const n = nearestTest([pt("t", 29, 10.3)], target)!;
    expect(n.o2Diff).toBeCloseTo(-1);
    expect(n.pressureDiff).toBeCloseTo(0.1);
  });
});

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
