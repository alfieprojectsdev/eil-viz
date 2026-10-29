import { transectsOf, noRunoutSource, searchRadius, formatMetres, straightLineH, finite } from "../lib/assessment";
import TransectProfile from "./TransectProfile";
import RunoutCaution from "./RunoutCaution";
import "./RunoutView.css";

function finiteMetres(v) {
  return finite(v) === null ? null : formatMetres(v);
}

function Explainer({ straight }) {
  return (
    <details className="card explainer">
      <summary>How the runout check works</summary>
      <div className="explainer-body">
        <p>eil-calc walks uphill from the lot to nearby peaks, then follows the steepest way back down. For each path, debris is assumed to travel up to three times the drop (ΔE) horizontally.</p>
        {straight ? (
          <p>A path is SAFE if the nearest edge of the lot is farther than that from the peak in a straight horizontal line (H &gt; 3 × ΔE), otherwise PRONE. OHAS slide 30 measures from roughly where the slope changes most; eil-calc measures from the peak its walk found. Up to three of the most threatening paths are shown; any PRONE path fails the check.</p>
        ) : (
          <p>A path is SAFE if the lot is farther than that from the peak (H &gt; 3 × ΔE), otherwise PRONE. eil-calc measures H along the path it walked, not in a straight line. Up to three of the most threatening paths are shown; any PRONE path fails the check.</p>
        )}
      </div>
    </details>
  );
}

// H and the debris reach on one scale. With a straight-line H the side
// profile can't show this comparison: its axis is distance along the walk.
function ReachBars({ h, reach }) {
  const max = Math.max(h, reach, 1);
  return (
    <div className="reach-bars" aria-hidden="true">
      <div className="reach-row">
        <span className="reach-name text-low">Straight line to lot edge, H</span>
        <span className="reach-track"><span className="reach-fill reach-fill-h" style={{ width: `${(h / max) * 100}%` }} /></span>
        <span className="mono reach-value">{formatMetres(h)}</span>
      </div>
      <div className="reach-row">
        <span className="reach-name text-low">Debris reach, 3 × ΔE</span>
        <span className="reach-track"><span className="reach-fill reach-fill-reach" style={{ width: `${(reach / max) * 100}%` }} /></span>
        <span className="mono reach-value">{formatMetres(reach)}</span>
      </div>
    </div>
  );
}

export default function RunoutView({ dep, pathIndex, onSelectPath }) {
  const transects = transectsOf(dep);
  const straight = straightLineH(dep);

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
        <aside className="result-side"><Explainer straight={straight} /></aside>
      </>
    );
  }

  const index = pathIndex < transects.length ? pathIndex : 0;
  const t = transects[index];
  const m = t.metrics;
  // Missing or non-boolean counts as not compliant, so the view fails to PRONE.
  const compliant = t.assessment?.is_compliant === true;
  const jumped = typeof t.closure_m === "number";

  const figures = [
    ["Peak elevation", formatMetres(m.elevation_peak)],
    ["Lot elevation", formatMetres(m.elevation_site)],
    ["Drop, ΔE", formatMetres(m.delta_e)],
    [straight ? "Straight line to lot edge, H" : "Distance along path, H", formatMetres(m.horizontal_distance_h)],
    ["Debris reach, 3 × ΔE", formatMetres(m.required_runout_3x)],
  ];
  if (straight) {
    figures.push(
      ["Straight line to lowest point", finiteMetres(t.straight_line_m)],
      ["Walked path length", finiteMetres(t.path_length_m)],
    );
  }

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
          straight={straight}
          label={straight
            ? `Elevation along path ${index + 1}, ${formatMetres(m.delta_e)} drop. The lot's edge is ${formatMetres(m.horizontal_distance_h)} from the peak in a straight line; debris reach ${formatMetres(m.required_runout_3x)}.`
            : `Elevation profile of path ${index + 1}: drop of ${formatMetres(m.delta_e)}, lot ${formatMetres(m.horizontal_distance_h)} from the peak, debris reach ${formatMetres(m.required_runout_3x)}.`}
        />

        <div className="key-list">
          <span className="key-item"><span className="runout-key-peak" />Peak where the path starts</span>
          <span className="key-item"><span className="runout-key-site" />Where the path ends in the lot</span>
          {!straight && <span className="key-item"><span className="runout-key-zone" />Debris reach: 3 × the drop</span>}
          {jumped && <span className="key-item"><span className="runout-key-jump" />Straight jump where the walk stalled</span>}
        </div>

        {straight && <ReachBars h={m.horizontal_distance_h} reach={m.required_runout_3x} />}
      </section>

      <aside className="result-side">
        <section className={`path-verdict ${compliant ? "path-verdict-safe" : "path-verdict-prone"}`} aria-label="Path verdict">
          <span className="eyebrow path-verdict-title">Path {index + 1}</span>
          <span className="path-verdict-status">{compliant ? "SAFE (beyond runout)" : "PRONE (within runout zone)"}</span>
          <span className="text-high">
            {!compliant ? "Debris from this peak could reach the lot."
              : straight ? "Debris from this peak stops before the lot."
              : "Along eil-calc's path, debris from this peak stops before the lot."}
          </span>
          <span className="mono path-verdict-formula">
            H {formatMetres(m.horizontal_distance_h)} {compliant ? ">" : "≤"} 3 × ΔE {formatMetres(m.required_runout_3x)}
          </span>
        </section>

        {compliant && !straight && (
          <RunoutCaution title="Check this distance">
            In Google Earth, measure the straight horizontal line from the source (roughly where the slope changes most, below this path's high point at elevation {formatMetres(m.elevation_peak)}) to the edge of the lot. The path is only SAFE if that line is more than 3 × the drop along it. eil-calc's 3 × ΔE for this path is {formatMetres(m.required_runout_3x)}, measured from the high point.
          </RunoutCaution>
        )}

        <section className="card path-figures" aria-label="Path figures">
          <dl>
            {figures.filter(([, v]) => v !== null).map(([k, v]) => (
              <div key={k} className="path-figure">
                <dt className="text-low">{k}</dt>
                <dd className="mono text-high">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Explainer straight={straight} />
      </aside>
    </>
  );
}
