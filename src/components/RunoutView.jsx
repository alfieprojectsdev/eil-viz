import { transectsOf, noRunoutSource, searchRadius, formatMetres } from "../lib/assessment";
import TransectProfile from "./TransectProfile";
import "./RunoutView.css";

function Explainer() {
  return (
    <details className="card explainer">
      <summary>How the runout check works</summary>
      <div className="explainer-body">
        <p>eil-calc walks uphill from the lot to nearby peaks, then follows the steepest way back down. For each path, debris is assumed to travel up to three times the drop (ΔE) horizontally.</p>
        <p>A path is SAFE if the lot is farther than that from the peak (H &gt; 3 × ΔE), otherwise PRONE. Up to three of the most threatening paths are shown; any PRONE path fails the check.</p>
      </div>
    </details>
  );
}

export default function RunoutView({ dep, pathIndex, onSelectPath }) {
  const transects = transectsOf(dep);

  if (noRunoutSource(dep, transects)) {
    const radius = searchRadius(dep);
    return (
      <>
        <section className="card result-figure" aria-labelledby="profile-heading">
          <div className="result-figure-head">
            <h2 id="profile-heading">No path from higher ground</h2>
          </div>
          <p>eil-calc found no ground higher than the lot {radius === null ? "nearby" : `within ${formatMetres(radius)} of it`}, so no debris path reaches the lot. The runout check passes on that basis.</p>
        </section>
        <aside className="result-side"><Explainer /></aside>
      </>
    );
  }

  const index = pathIndex < transects.length ? pathIndex : 0;
  const t = transects[index];
  const m = t.metrics;
  // Missing or non-boolean counts as not compliant, so the view fails to PRONE.
  const compliant = t.assessment?.is_compliant === true;

  const figures = [
    ["Peak elevation", formatMetres(m.elevation_peak)],
    ["Lot elevation", formatMetres(m.elevation_site)],
    ["Drop, ΔE", formatMetres(m.delta_e)],
    ["Distance, H", formatMetres(m.horizontal_distance_h)],
    ["Debris reach, 3 × ΔE", formatMetres(m.required_runout_3x)],
  ];

  return (
    <>
      <section className="card result-figure" aria-labelledby="profile-heading">
        <div className="result-figure-head">
          <h2 id="profile-heading">Steepest path from the peak down to the lot</h2>
          <span className="text-low">Side view · paths ranked by threat</span>
        </div>

        {transects.length > 1 && (
          <div className="path-tabs no-print" role="radiogroup" aria-label="Critical paths">
            {transects.map((p, i) => {
              const ok = p.assessment?.is_compliant === true;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={i === index}
                  className={`path-tab ${i === index ? "path-tab-active" : ""}`}
                  onClick={() => onSelectPath(i)}
                >
                  <span className="path-tab-name">Path {i + 1}{i === 0 ? " · worst" : ""}</span>
                  <span className={`mono path-tab-verdict ${ok ? "tone-safe" : "tone-danger"}`}>{ok ? "SAFE" : "PRONE"}</span>
                </button>
              );
            })}
          </div>
        )}

        <TransectProfile
          transect={t}
          label={`Elevation profile of path ${index + 1}: drop of ${formatMetres(m.delta_e)}, lot ${formatMetres(m.horizontal_distance_h)} from the peak, debris reach ${formatMetres(m.required_runout_3x)}.`}
        />

        <div className="key-list">
          <span className="key-item"><span className="runout-key-peak" />Peak where the path starts</span>
          <span className="key-item"><span className="runout-key-site" />Nearest edge of the lot</span>
          <span className="key-item"><span className="runout-key-zone" />Debris reach: 3 × the drop</span>
        </div>
      </section>

      <aside className="result-side">
        <section className={`path-verdict ${compliant ? "path-verdict-safe" : "path-verdict-prone"}`} aria-label="Path verdict">
          <span className="eyebrow path-verdict-title">Path {index + 1}</span>
          <span className="path-verdict-status">{compliant ? "SAFE (beyond runout)" : "PRONE (within runout zone)"}</span>
          <span className="text-high">{compliant ? "Debris from this peak stops before the lot." : "Debris from this peak could reach the lot."}</span>
          <span className="mono path-verdict-formula">
            H {formatMetres(m.horizontal_distance_h)} {compliant ? ">" : "≤"} 3 × ΔE {formatMetres(m.required_runout_3x)}
          </span>
        </section>

        <section className="card path-figures" aria-label="Path figures">
          <dl>
            {figures.map(([k, v]) => (
              <div key={k} className="path-figure">
                <dt className="text-low">{k}</dt>
                <dd className="mono text-high">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Explainer />
      </aside>
    </>
  );
}
