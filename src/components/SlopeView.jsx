import { useMemo, useState } from "react";
import { slopeRules, slopeCoverage, formatPct } from "../lib/assessment";
import { slopeGradient, slopeScaleMax, slopeScalePosition } from "../lib/slopeColor";
import { SLOPE_STATUS } from "../constants/status";
import { contourLines, gridProjection } from "../lib/geo";
import SlopeHeatmap from "./SlopeHeatmap";
import CoverageBar from "./CoverageBar";
import "./SlopeView.css";

function SlopeLegend({ rules }) {
  const max = slopeScaleMax(rules);
  const at = (deg) => slopeScalePosition(deg, rules);
  return (
    <div className="slope-legend">
      <div className="slope-legend-bar" aria-hidden="true" style={{ background: slopeGradient(rules) }} />
      <div className="slope-legend-ticks mono" aria-hidden="true">
        <span style={{ left: 0 }}>0°</span>
        <span className="slope-legend-flag" style={{ left: at(rules.flagDeg) }}>{rules.flagDeg}°</span>
        <span className="slope-legend-susceptible" style={{ left: at(rules.susceptibleDeg) }}>{rules.susceptibleDeg}°</span>
        <span style={{ right: 0 }}>{max}°+</span>
      </div>
      <div className="key-list">
        <span className="key-item"><span className="slope-swatch slope-swatch-safe" />Safe, {rules.flagDeg}° or less</span>
        <span className="key-item"><span className="slope-swatch slope-swatch-flag" />Review band, over {rules.flagDeg}° to {rules.susceptibleDeg}°</span>
        <span className="key-item"><span className="slope-swatch slope-swatch-susceptible" />Susceptible, over {rules.susceptibleDeg}°</span>
        <span className="key-item"><span className="slope-swatch slope-swatch-max" />Steepest pixel</span>
      </div>
    </div>
  );
}

function Coverage({ slope, rules }) {
  const cov = slopeCoverage(slope);
  if (!cov) {
    return (
      <section className="card coverage" aria-labelledby="coverage-heading">
        <h2 id="coverage-heading">What decides the verdict</h2>
        <p className="text-low">This version of eil-calc doesn't report the share of the lot in each slope band. Update eil-calc to see them here.</p>
      </section>
    );
  }
  const susceptible = slope.assessment.status === SLOPE_STATUS.SUSCEPTIBLE;
  const susOver = cov.susceptible > rules.susceptibleLimit;
  const flagOver = cov.flag > rules.flagLimit;
  // One scale for both bars, so their lengths compare. At least 0–20%, and
  // wide enough for the larger value.
  const scale = Math.max(0.2, Math.ceil(Math.max(cov.susceptible, cov.flag) * 10) / 10);

  let flagNote;
  if (susceptible) flagNote = flagOver ? "Over the limit, but the lot is already susceptible." : "Under the limit. Not checked once the lot is already susceptible.";
  else flagNote = flagOver ? "Over the limit: FLAG FOR REVIEW" : "Under the limit";

  return (
    <section className="card coverage" aria-labelledby="coverage-heading">
      <div className="coverage-head">
        <h2 id="coverage-heading">What decides the verdict</h2>
        <span className="text-low">Share of the lot in each band, against its limit</span>
      </div>
      <CoverageBar
        label={`Steeper than ${rules.susceptibleDeg}°`}
        value={cov.susceptible}
        limit={rules.susceptibleLimit}
        scale={scale}
        tone={susOver ? "danger" : "neutral"}
        note={susOver ? "Over the limit: SUSCEPTIBLE" : "Under the limit"}
      />
      <CoverageBar
        label={`Between ${rules.flagDeg}° and ${rules.susceptibleDeg}°`}
        value={cov.flag}
        limit={rules.flagLimit}
        scale={scale}
        tone={flagOver && !susceptible ? "review" : "neutral"}
        barTone="review"
        note={flagNote}
      />
      <span className="coverage-scale text-low">Bar scale: 0 to {formatPct(scale)}% of the lot.</span>
    </section>
  );
}

// _viz_contours in the heatmap's cell units, keeping only lines whose extent
// overlaps the lot's cells (the heatmap crops to those). null when the
// response has no contours or no usable grid bounds (eil-calc before 328408b).
function gridContours(slope, contourSet) {
  const grid = slope?._viz_grid;
  const set = contourLines(contourSet);
  const toCell = Array.isArray(grid) && grid.every(Array.isArray)
    ? gridProjection(slope._viz_grid_bounds, grid.length, grid[0]?.length) : null;
  if (!set || !toCell) return null;
  let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
  grid.forEach((row, r) => row.forEach((v, c) => {
    if (typeof v !== "number") return;
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }));
  const lines = set.lines.map(l => ({ cells: l.coords.map(toCell), index: l.index })).filter(l => {
    const xs = l.cells.map(p => p[0]), ys = l.cells.map(p => p[1]);
    return Math.max(...xs) >= minC && Math.min(...xs) <= maxC + 1
      && Math.max(...ys) >= minR && Math.min(...ys) <= maxR + 1;
  });
  return { ...set, lines };
}

export default function SlopeView({ slope, contours: contourSet }) {
  // Stable across renders, so the heatmap doesn't redraw on every hover.
  const rules = useMemo(() => slopeRules(slope), [slope]);
  const contours = useMemo(() => gridContours(slope, contourSet), [slope, contourSet]);
  const [showContours, setShowContours] = useState(false);
  return (
    <>
      <section className="card result-figure" aria-labelledby="heatmap-heading">
        <div className="result-figure-head">
          <h2 id="heatmap-heading">Slope across the lot</h2>
          <span className="text-low">One square per elevation pixel · hover for the exact slope</span>
        </div>
        <SlopeHeatmap grid={slope._viz_grid} rules={rules} contours={showContours ? contours : null} />
        <SlopeLegend rules={rules} />
        {contours && (
          <div className="slope-contours">
            <label className="slope-contours-toggle no-print">
              <input type="checkbox" checked={showContours} onChange={e => setShowContours(e.target.checked)} />
              Show contours
            </label>
            {showContours && (
              <span className="key-item text-low">
                <span className="slope-key-contour" />
                {contours.lines.length === 0
                  ? `No ${contours.interval === null ? "" : `${contours.interval} m `}contour crosses the lot.`
                  : <>Every {contours.interval ?? "?"} m, {contours.source ? contours.source.replace(/^Contours from /, "from ") : "from eil-calc"}. The slope colours come from a smoothed copy, so the two can disagree slightly.</>}
              </span>
            )}
          </div>
        )}
      </section>

      <aside className="result-side">
        <Coverage slope={slope} rules={rules} />

        <section className="slope-figures" aria-label="Slope figures">
          <div className="card slope-figure">
            <span className="text-low">Steepest pixel</span>
            <span className="mono text-high">{slope.metrics.max_slope_degrees.toFixed(1)}°</span>
          </div>
          <div className="card slope-figure">
            <span className="text-low">Average slope</span>
            <span className="mono text-high">{slope.metrics.avg_slope_degrees.toFixed(1)}°</span>
          </div>
        </section>

        <details className="card explainer">
          <summary>How the slope check works</summary>
          <div className="explainer-body">
            <p>
              Slope is computed for every elevation pixel inside the lot. The lot is SUSCEPTIBLE if more
              than {formatPct(rules.susceptibleLimit)}% of it is steeper than {rules.susceptibleDeg}°; otherwise
              FLAG FOR REVIEW if more than {formatPct(rules.flagLimit)}% is over {rules.flagDeg}° and up
              to {rules.susceptibleDeg}°; otherwise SAFE.
            </p>
            <p className="text-low">Shares are used instead of the single steepest pixel, so a few isolated steep pixels don't fail an otherwise flat lot.</p>
          </div>
        </details>
      </aside>
    </>
  );
}
