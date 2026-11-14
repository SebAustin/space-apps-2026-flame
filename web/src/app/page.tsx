import { loadInvestigations } from "@/lib/investigations";
import AtmosphereRanker from "./AtmosphereRanker";

export default function Home() {
  const investigations = loadInvestigations();
  return (
    <main className="page">
      <header className="masthead">
        <p className="kicker">NASA Space Apps 2026 · Flame in Freefall</p>
        <h1>Which PSI combustion investigations tested your habitat&apos;s atmosphere?</h1>
        <p className="lede">
          For aerospace engineers. Pick a habitat; {investigations.length} PSI combustion investigations are ranked
          by how closely their tested oxygen and pressure match it. Every range comes from the investigation&apos;s own
          PSI experimental table.
        </p>
      </header>
      <AtmosphereRanker investigations={investigations} />
      <footer className="footer">
        Data: NASA Physical Sciences Informatics (PSI). Ranges are min–max of values in each experimental table;
        “not in PSI table” means the table has no such column. O₂ and pressure ranges are checked separately: a
        match on both does not mean a single test ran at that exact combination. Not a certification tool.
      </footer>
    </main>
  );
}
