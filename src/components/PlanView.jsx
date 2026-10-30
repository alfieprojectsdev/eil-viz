import { useMemo, useState } from "react";
import { formatMetres, transectsOf, searchRadius, slopeRules, finite } from "../lib/assessment";
import {
  makeProjection, outerRing, isLonLat, lonLatOf, centroidOf, bboxOf, growBox, fitBox, niceLength, svgPath,
} from "../lib/geo";
import { makeSlopeColor } from "../lib/slopeColor";
import "./PlanView.css";

const W = 820;
const PAD = 24;
const INSET = 170;
// Below this many pixels across, the lot gets a zoomed inset.
const INSET_BELOW_PX = 48;

// Everything in metres east/north of the lot's centroid. Returns null when
// the response has no plan-view fields (eil-calc before 328408b).
function buildModel(compliance, rules, withSlope) {
  const ringLL = outerRing(compliance?._viz_parcel);
  if (!ringLL) return null;
  const [lon0, lat0] = centroidOf(ringLL);
  const proj = makeProjection(lon0, lat0);
  const dep = compliance.depositional_hazard;

  const lot = ringLL.map(proj);
  const siteLL = lonLatOf(dep?._viz_site);

  const contourSet = compliance._viz_contours;
  const interval = finite(contourSet?.interval_m);
  const contours = (Array.isArray(contourSet?.lines) ? contourSet.lines : [])
    .filter(l => Array.isArray(l?.coordinates) && l.coordinates.length >= 2 && l.coordinates.every(isLonLat))
    .map(l => ({
      pts: l.coordinates.map(proj),
      // Every fifth line is drawn heavier, as on a topographic map.
      index: interval !== null && finite(l.elev_m) !== null && l.elev_m % (interval * 5) === 0,
    }));

  const paths = transectsOf(dep).map((t, i) => {
    const pathLL = (t?.path ?? []).map(lonLatOf);
    const peakLL = lonLatOf(t?.peak);
    if (!peakLL || pathLL.length < 2 || pathLL.some(p => !p)) return null;
    const edgeLL = lonLatOf(t.edge_point);
    const pts = pathLL.map(proj);
    const peak = proj(peakLL);
    const m = t.metrics ?? {};
    let tick = null;
    if (edgeLL && finite(m.required_runout_3x) !== null) {
      // 3 × ΔE measured from the peak along the straight line to the edge.
      const edge = proj(edgeLL);
      const len = Math.hypot(edge[0] - peak[0], edge[1] - peak[1]);
      if (len > 0) {
        const k = m.required_runout_3x / len;
        tick = [peak[0] + (edge[0] - peak[0]) * k, peak[1] + (edge[1] - peak[1]) * k];
      }
    }
    return {
      i, pts, peak, tick,
      edge: edgeLL ? proj(edgeLL) : null,
      jumped: typeof t.closure_m === "number",
      ok: t.assessment?.is_compliant === true,
      h: finite(m.horizontal_distance_h),
      reach: finite(m.required_runout_3x),
    };
  });

  let cells = [];
  const grid = compliance.slope_stability?._viz_grid;
  const b = compliance.slope_stability?._viz_grid_bounds;
  if (withSlope && Array.isArray(grid) && b && b.row0_north === true
      && [b.west, b.south, b.east, b.north].every(Number.isFinite) && grid.length && Array.isArray(grid[0])) {
    const color = makeSlopeColor(rules);
    const rows = grid.length, cols = grid[0].length;
    const dLon = (b.east - b.west) / cols, dLat = (b.north - b.south) / rows;
    grid.forEach((row, r) => row.forEach((v, c) => {
      if (typeof v !== "number") return;
      const [x0, y1] = proj([b.west + c * dLon, b.north - r * dLat]);
      const [x1, y0] = proj([b.west + (c + 1) * dLon, b.north - (r + 1) * dLat]);
      cells.push({ x0, y0, x1, y1, fill: color(v) });
    }));
  }

  return { lot, site: siteLL ? proj(siteLL) : null, contours, paths, cells, interval, source: contourSet?.source };
}

function Layers({ model, fr, selected, onSelect, searchM, detail }) {
  const { s, pt } = fr;
  const lotPath = `${svgPath(model.lot.map(pt))} Z`;
  const order = model.paths.filter(Boolean).sort((a, b) => (a.i === selected) - (b.i === selected));
  const sel = model.paths[selected];
  return (
    <>
      {model.cells.map((c, k) => {
        const [x, y] = pt([c.x0, c.y1]);
        return <rect key={k} x={x} y={y} width={(c.x1 - c.x0) * s + 0.5} height={(c.y1 - c.y0) * s + 0.5} fill={c.fill} className="plan-cell" />;
      })}
      {model.contours.map((c, k) => (
        <path key={k} d={svgPath(c.pts.map(pt))} className={c.index ? "plan-contour plan-contour-index" : "plan-contour"} />
      ))}
      {searchM !== null && (
        <path d={lotPath} className="plan-search" style={{ strokeWidth: 2 * searchM * s }} />
      )}
      <path d={lotPath} className="plan-lot" />

      {order.map(p => {
        const screen = p.pts.map(pt);
        const walked = p.jumped ? screen.slice(0, -1) : screen;
        const isSel = p.i === selected;
        const tone = p.ok ? "plan-safe" : "plan-prone";
        return (
          <g key={p.i} className={`plan-path ${tone} ${isSel ? "plan-path-selected" : ""}`}>
            <path d={svgPath(walked)} className="plan-walk" />
            {p.jumped && <path d={svgPath(screen.slice(-2))} className="plan-jump" />}
            {onSelect && <path d={svgPath(screen)} className="plan-hit" onClick={() => onSelect(p.i)} />}
          </g>
        );
      })}

      {sel && sel.edge && (() => {
        const a = pt(sel.peak), e = pt(sel.edge);
        const dx = e[0] - a[0], dy = e[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const t = sel.tick && pt(sel.tick);
        return (
          <g className="plan-h">
            <line x1={a[0]} y1={a[1]} x2={e[0]} y2={e[1]} />
            <circle cx={e[0]} cy={e[1]} r={3.5} />
            {t && detail && (
              <g className="plan-tick">
                <line x1={t[0] - nx * 9} y1={t[1] - ny * 9} x2={t[0] + nx * 9} y2={t[1] + ny * 9} />
                <text x={t[0] + nx * 14} y={t[1] + ny * 14 + 4} textAnchor={t[0] > W - 140 ? "end" : "start"} className="plan-label">3 × ΔE {sel.reach !== null ? formatMetres(sel.reach) : ""}</text>
              </g>
            )}
            {detail && sel.h !== null && (
              <text x={(a[0] + e[0]) / 2 - nx * 14} y={(a[1] + e[1]) / 2 - ny * 14 + 4} className="plan-label plan-h-label" textAnchor="middle">
                H {formatMetres(sel.h)}
              </text>
            )}
          </g>
        );
      })()}

      {model.paths.filter(Boolean).map(p => {
        const [x, y] = pt(p.peak);
        return (
          <g key={p.i} className={p.ok ? "plan-safe" : "plan-prone"}>
            <polygon className="plan-peak" points={`${x},${y - 8} ${x + 7},${y + 5} ${x - 7},${y + 5}`} />
            {detail && (
              <text x={x > W - 110 ? x - 11 : x + 11} y={y - 4} textAnchor={x > W - 110 ? "end" : "start"} className="plan-label plan-path-label">
                P{p.i + 1} {p.ok ? "SAFE" : "PRONE"}
              </text>
            )}
          </g>
        );
      })}

      {model.site && (() => {
        const [x, y] = pt(model.site);
        return <rect x={x - 4} y={y - 4} width={8} height={8} className="plan-site" />;
      })()}
    </>
  );
}

function ScaleBar({ s, height }) {
  const len = niceLength(140 / s);
  const px = len * s;
  return (
    <g className="plan-scale" transform={`translate(${PAD}, ${height - PAD})`}>
      <line x1={0} x2={px} y1={0} y2={0} />
      <line x1={0} x2={0} y1={-5} y2={5} />
      <line x1={px} x2={px} y1={-5} y2={5} />
      <text x={px / 2} y={-8} textAnchor="middle" className="plan-label">{formatMetres(len)}</text>
    </g>
  );
}

export default function PlanView({ compliance, pathIndex, onSelectPath, noSource }) {
  const [withSlope, setWithSlope] = useState(false);
  const slope = compliance?.slope_stability;
  const rules = useMemo(() => slopeRules(slope), [slope]);
  const model = useMemo(() => buildModel(compliance, rules, withSlope), [compliance, rules, withSlope]);
  if (!model) return null;

  const dep = compliance.depositional_hazard;
  const radius = noSource ? searchRadius(dep) : null;
  const drawn = model.paths.filter(Boolean);

  const lotBox = bboxOf(model.lot);
  const lotSize = Math.max(lotBox.maxX - lotBox.minX, lotBox.maxY - lotBox.minY);
  const extentPts = [...model.lot];
  for (const p of drawn) extentPts.push(...p.pts, p.peak, ...(p.edge ? [p.edge] : []), ...(p.tick ? [p.tick] : []));
  let box = bboxOf(extentPts);
  box = radius !== null ? growBox(lotBox, radius * 1.06) : growBox(box, Math.max(20, 0.06 * Math.max(box.maxX - box.minX, box.maxY - box.minY)));
  const aspect = (box.maxY - box.minY) / Math.max(box.maxX - box.minX, 1);
  const H = Math.round(Math.min(620, Math.max(360, W * aspect)));
  const fr = fitBox(box, W, H, PAD);
  const sel = pathIndex < model.paths.length ? pathIndex : 0;

  const showInset = lotSize * fr.s < INSET_BELOW_PX;
  const insetBox = growBox(lotBox, Math.max(lotSize * 0.6, 15));
  const insetFr = fitBox(insetBox, INSET, INSET, 10);

  const label = noSource
    ? `Plan view: the lot, with no higher ground within ${radius === null ? "the search area" : formatMetres(radius)}.`
    : `Plan view of ${drawn.length} path${drawn.length === 1 ? "" : "s"} from peaks down to the lot, north up.`;

  return (
    <section className="card result-figure plan" aria-labelledby="plan-heading">
      <div className="result-figure-head">
        <h2 id="plan-heading">Plan view</h2>
        <span className="text-low">North up · drawn from eil-calc's DEM, no map tiles</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="plan-svg" role="img" aria-label={label}>
        <Layers model={model} fr={fr} selected={sel} onSelect={drawn.length > 1 ? onSelectPath : null}
          searchM={radius} detail />
        <ScaleBar s={fr.s} height={H} />
        <text x={PAD} y={PAD + 6} className="plan-label plan-north">N ↑</text>
      </svg>

      <div className="plan-foot">
        {showInset && (
          <figure className="plan-inset">
            <svg viewBox={`0 0 ${INSET} ${INSET}`} className="plan-inset-svg" aria-hidden="true">
              <Layers model={model} fr={insetFr} selected={sel} onSelect={null} searchM={null} detail={false} />
            </svg>
            <figcaption className="text-low">The lot, zoomed in. The white dot is where H meets its edge; the small square is its lowest point.</figcaption>
          </figure>
        )}
        <div className="plan-foot-text">
          <div className="key-list">
            <span className="key-item"><span className="plan-key-lot" />Lot</span>
            {!noSource && (
              <>
                <span className="key-item"><span className="runout-key-peak" />Peak</span>
                <span className="key-item"><span className="plan-key-line plan-safe" />SAFE path</span>
                <span className="key-item"><span className="plan-key-line plan-prone" />PRONE path</span>
                {drawn.some(p => p.jumped) && <span className="key-item"><span className="runout-key-jump" />Straight jump where the walk stalled</span>}
                <span className="key-item"><span className="plan-key-h" />H: straight line to the lot edge, with the 3 × ΔE mark</span>
              </>
            )}
            {noSource && radius !== null && <span className="key-item"><span className="plan-key-search" />Search area, {formatMetres(radius)} from the lot</span>}
            {model.contours.length > 0 && (
              <span className="key-item"><span className="plan-key-contour" />Contours{model.interval !== null ? ` every ${formatMetres(model.interval)}` : ""}{model.source ? ` (${model.source.replace(/^Contours from /, "from ")})` : ""}</span>
            )}
          </div>

          <label className="plan-toggle no-print">
            <input type="checkbox" checked={withSlope} onChange={e => setWithSlope(e.target.checked)} />
            Show slope classes around the lot
          </label>
        </div>
      </div>
    </section>
  );
}
