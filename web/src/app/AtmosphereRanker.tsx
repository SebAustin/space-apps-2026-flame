"use client";

import { useMemo, useState } from "react";
import { HABITATS } from "@/lib/habitats";
import type { Investigation } from "@/lib/investigations";
import { nearestTest, rankByAtmosphere, type DimensionMatch, type Nearest } from "@/lib/match";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;

type Point = Investigation["tests"][number];

function NearestTest({ nearest, hasTests }: { nearest: Nearest<Point> | null; hasTests: boolean }) {
  if (!hasTests || nearest === null) {
    return (
      <p className="nearest nearest-none">
        Exact combination not checkable: the PSI table does not give O₂ and pressure for each single test.
      </p>
    );
  }
  const { test, o2Diff, pressureDiff } = nearest;
  return (
    <p className="nearest">
      <span className="nearest-label">Nearest single test</span>{" "}
      <strong>{test.test}</strong>: {fmt(test.o2_pct)}% O₂ at {fmt(test.pressure_psia)} psia{" "}
      <span className="nearest-diff">
        ({signed(o2Diff)} pts O₂, {signed(pressureDiff)} psia)
      </span>
      <span className="range-source">{test.source_file}</span>
    </p>
  );
}

function Badge({ match, unit }: { match: DimensionMatch; unit: string }) {
  if (match.status === "covered") return <span className="badge badge-ok">within range</span>;
  const gapUnit = unit === "%" ? "pts O₂" : unit;
  if (match.status === "gap") return <span className="badge badge-gap">{fmt(match.gap)} {gapUnit} away</span>;
  return <span className="badge badge-unknown">not in PSI table</span>;
}

function RangeCell({
  label,
  unit,
  match,
  source,
}: {
  label: string;
  unit: string;
  match: DimensionMatch;
  source: Investigation["o2Source"];
}) {
  return (
    <div className="range-cell">
      <div className="range-label">{label}</div>
      <div className="range-value">
        {source ? `${fmt(source.min)}–${fmt(source.max)} ${unit}` : "—"}
      </div>
      <Badge match={match} unit={unit} />
      {source && (
        <div className="range-source" title={`Column: ${source.source_column}`}>
          {source.source_file}
        </div>
      )}
    </div>
  );
}

export default function AtmosphereRanker({ investigations }: { investigations: Investigation[] }) {
  const [habitatId, setHabitatId] = useState("moon-base");
  const habitat = HABITATS.find((h) => h.id === habitatId)!;
  const [o2, setO2] = useState<string>(String(habitat.o2_pct ?? ""));
  const [pressure, setPressure] = useState<string>(String(habitat.pressure_psia ?? ""));

  const choose = (id: string) => {
    const h = HABITATS.find((x) => x.id === id)!;
    setHabitatId(id);
    setO2(h.o2_pct === null ? "" : String(h.o2_pct));
    setPressure(h.pressure_psia === null ? "" : String(h.pressure_psia));
  };

  const o2Num = Number(o2);
  const pNum = Number(pressure);
  const valid = o2 !== "" && pressure !== "" && o2Num > 0 && o2Num <= 100 && pNum > 0;
  const edited = habitat.o2_pct !== o2Num || habitat.pressure_psia !== pNum;

  const ranked = useMemo(() => {
    if (!valid) return [];
    const target = { o2_pct: o2Num, pressure_psia: pNum };
    // Same range match: an investigation with an actual nearby test comes first.
    return rankByAtmosphere(investigations, target)
      .map((inv) => ({ ...inv, nearest: nearestTest(inv.tests, target) }))
      .sort(
        (a, b) =>
          a.unknownCount - b.unknownCount ||
          a.relativeGap - b.relativeGap ||
          (a.nearest?.relativeDistance ?? Infinity) - (b.nearest?.relativeDistance ?? Infinity),
      );
  }, [investigations, valid, o2Num, pNum]);

  return (
    <section aria-labelledby="ranker-heading">
      <h2 id="ranker-heading" className="sr-only">Rank investigations by atmosphere</h2>

      <div className="controls">
        <fieldset className="habitats">
          <legend>Habitat</legend>
          {HABITATS.map((h) => (
            <button
              key={h.id}
              type="button"
              aria-pressed={h.id === habitatId}
              className="habitat-btn"
              onClick={() => choose(h.id)}
            >
              {h.name}
            </button>
          ))}
        </fieldset>

        <div className="atmosphere">
          <label>
            O₂ (% by volume)
            <input inputMode="decimal" value={o2} onChange={(e) => setO2(e.target.value)} />
          </label>
          <label>
            Pressure (psia)
            <input inputMode="decimal" value={pressure} onChange={(e) => setPressure(e.target.value)} />
          </label>
        </div>

        <p className="atmo-source">
          {habitat.source && !edited ? (
            <>
              Source:{" "}
              <a href={habitat.source.url} target="_blank" rel="noreferrer">
                {habitat.source.label}
              </a>
              {" — "}
              <q>{habitat.source.quote}</q>
            </>
          ) : habitat.source ? (
            "Custom values entered."
          ) : (
            "The challenge statement gives no Mars base atmosphere. Enter the O₂ and pressure you want to check."
          )}
        </p>
      </div>

      {valid ? (
        <ol className="results">
          {ranked.map((inv, i) => (
            <li key={inv.id} className="result">
              <div className="result-rank">{i + 1}</div>
              <div className="result-body">
                <h3>
                  {inv.name} <span className="psi-id">{inv.id}</span>
                </h3>
                {inv.title && <p className="result-title">{inv.title}</p>}
                {inv.hardware && <p className="result-hw">{inv.hardware}</p>}
                <div className="ranges">
                  <RangeCell label="O₂ tested" unit="%" match={inv.o2} source={inv.o2Source} />
                  <RangeCell label="Pressure tested" unit="psia" match={inv.pressure} source={inv.pressureSource} />
                </div>
                {inv.o2.status !== "unknown" && inv.pressure.status !== "unknown" && (
                  <NearestTest nearest={inv.nearest} hasTests={inv.tests.length > 0} />
                )}
                {inv.objective && typeof inv.objective.value === "string" && (
                  <details>
                    <summary>Objective</summary>
                    <p>{inv.objective.value}</p>
                    <a href={inv.objective.source_url} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  </details>
                )}
                {inv.doiUrl && (
                  <a className="doi" href={inv.doiUrl} target="_blank" rel="noreferrer">
                    PSI dataset (DOI)
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty">Enter an O₂ between 0 and 100% and a pressure above 0 psia.</p>
      )}
    </section>
  );
}
