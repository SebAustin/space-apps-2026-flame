export type Range = { min: number; max: number };

export type Tested = {
  id: string;
  o2_pct: Range | null;
  pressure_psia: Range | null;
};

export type Target = { o2_pct: number; pressure_psia: number };

export type DimensionMatch =
  | { status: "covered"; gap: 0 }
  | { status: "gap"; gap: number }
  | { status: "unknown"; gap: null };

export type Ranked<T extends Tested> = T & {
  o2: DimensionMatch;
  pressure: DimensionMatch;
  unknownCount: number;
  relativeGap: number;
};

export type TestPoint = { test: string; o2_pct: number; pressure_psia: number };

export type Nearest<P extends TestPoint> = {
  test: P;
  o2Diff: number;
  pressureDiff: number;
  relativeDistance: number;
};

/**
 * The single test whose O2 and pressure together lie closest to the target, each
 * difference taken as a fraction of the target value so O2 points and psia weigh alike.
 */
export function nearestTest<P extends TestPoint>(tests: P[], target: Target): Nearest<P> | null {
  let best: Nearest<P> | null = null;
  for (const test of tests) {
    const o2Diff = test.o2_pct - target.o2_pct;
    const pressureDiff = test.pressure_psia - target.pressure_psia;
    const relativeDistance = Math.abs(o2Diff) / target.o2_pct + Math.abs(pressureDiff) / target.pressure_psia;
    if (best === null || relativeDistance < best.relativeDistance) {
      best = { test, o2Diff, pressureDiff, relativeDistance };
    }
  }
  return best;
}

/** Does a tested range include the target? If not, how far is its nearest edge? */
export function dimensionMatch(target: number, range: Range | null): DimensionMatch {
  if (range === null) return { status: "unknown", gap: null };
  if (target >= range.min && target <= range.max) return { status: "covered", gap: 0 };
  const gap = target < range.min ? range.min - target : target - range.max;
  return { status: "gap", gap };
}

/**
 * Orders investigations by how well their tested O2 and pressure match a habitat's.
 * Fewer unknown values ranks first; then the smaller sum of gaps, each as a
 * fraction of the target value so O2 points and psia weigh alike.
 */
export function rankByAtmosphere<T extends Tested>(records: T[], target: Target): Ranked<T>[] {
  return records
    .map((rec) => {
      const o2 = dimensionMatch(target.o2_pct, rec.o2_pct);
      const pressure = dimensionMatch(target.pressure_psia, rec.pressure_psia);
      const dims = [
        [o2, target.o2_pct],
        [pressure, target.pressure_psia],
      ] as const;
      const unknownCount = dims.filter(([d]) => d.status === "unknown").length;
      const relativeGap = dims.reduce((sum, [d, t]) => sum + (d.gap ?? 0) / t, 0);
      return { ...rec, o2, pressure, unknownCount, relativeGap };
    })
    .sort((a, b) => a.unknownCount - b.unknownCount || a.relativeGap - b.relativeGap || a.id.localeCompare(b.id));
}
