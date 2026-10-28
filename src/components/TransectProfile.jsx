import { useState, useMemo } from "react";
import { formatMetres } from "../lib/assessment";
import "./TransectProfile.css";

const W = 820, H = 380;
const PLOT = { left: 64, right: 800, top: 20, bottom: 320 };

// Elevations above this are DEM read errors; each is replaced with the
// previous valid point so one bad read doesn't flatten the chart.
const MAX_PLAUSIBLE_ELEV_M = 5000;

function cleanPath(path) {
  let prev = path.find(p => p.elev_m <= MAX_PLAUSIBLE_ELEV_M)?.elev_m ?? 0;
  return path.map(p => {
    const elev = p.elev_m > MAX_PLAUSIBLE_ELEV_M ? prev : p.elev_m;
    prev = elev;
    return { dist: p.dist_m, elev };
  });
}

function niceStep(range, count) {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}

function ticks(lo, hi, count) {
  const step = niceStep(hi - lo, count);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export default function TransectProfile({ transect, label }) {
  const m = transect.metrics;
  const points = useMemo(() => cleanPath(transect.path ?? []), [transect]);
  const [hover, setHover] = useState(null);

  const lastDist = points.length ? points[points.length - 1].dist : 0;
  // Wide enough for the path, the lot and the debris reach, whichever is
  // furthest, rounded up to a whole tick.
  const span = Math.max(lastDist, m.horizontal_distance_h, m.required_runout_3x, 50) * 1.08;
  const xStep = niceStep(span, 5);
  const xMax = Math.ceil(span / xStep) * xStep;
  const elevs = points.map(p => p.elev).concat(m.elevation_peak, m.elevation_site);
  const lo0 = Math.min(...elevs), hi0 = Math.max(...elevs);
  const pad = Math.max(5, (hi0 - lo0) * 0.1);
  const yLo = lo0 - pad, yHi = hi0 + pad;

  const X = (d) => PLOT.left + (d / xMax) * (PLOT.right - PLOT.left);
  const Y = (e) => PLOT.bottom - ((e - yLo) / (yHi - yLo)) * (PLOT.bottom - PLOT.top);

  const line = points.map((p, i) => `${i ? "L" : "M"}${X(p.dist).toFixed(1)} ${Y(p.elev).toFixed(1)}`).join(" ");
  const area = points.length
    ? `${line} L${X(lastDist).toFixed(1)} ${PLOT.bottom} L${X(points[0].dist).toFixed(1)} ${PLOT.bottom} Z`
    : "";

  const limitX = X(m.required_runout_3x);
  const limitRight = limitX > 640;
  const siteX = X(m.horizontal_distance_h);
  const siteY = Y(m.elevation_site);
  const peakX = X(0);
  const peakY = Y(m.elevation_peak);

  const onMove = (e) => {
    if (!points.length) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    if (sx < PLOT.left || sx > PLOT.right) { setHover(null); return; }
    const d = ((sx - PLOT.left) / (PLOT.right - PLOT.left)) * xMax;
    let best = points[0];
    for (const p of points) if (Math.abs(p.dist - d) < Math.abs(best.dist - d)) best = p;
    setHover(best);
  };

  return (
    <div className="profile">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="profile-svg"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <rect className="profile-zone" x={PLOT.left} y={PLOT.top} width={Math.max(0, limitX - PLOT.left)} height={PLOT.bottom - PLOT.top} />
        {ticks(yLo, yHi, 4).map(v => (
          <g key={`y${v}`}>
            <line className="profile-grid" x1={PLOT.left} x2={PLOT.right} y1={Y(v)} y2={Y(v)} />
            <text className="profile-tick" x={PLOT.left - 8} y={Y(v) + 4} textAnchor="end">{v} m</text>
          </g>
        ))}
        {ticks(0, xMax, 5).map(v => (
          <text key={`x${v}`} className="profile-tick" x={X(v)} y={PLOT.bottom + 20} textAnchor="middle">{v} m</text>
        ))}
        <line className="profile-axis" x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} />
        <line className="profile-axis" x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} />

        <path className="profile-area" d={area} />
        <path className="profile-line" d={line} />

        <line className="profile-limit" x1={limitX} x2={limitX} y1={PLOT.top} y2={PLOT.bottom} />
        <text className="profile-limit-label" x={limitX + (limitRight ? -8 : 8)} y={PLOT.top + 18} textAnchor={limitRight ? "end" : "start"}>
          Debris reach {formatMetres(m.required_runout_3x)}
        </text>

        <polygon className="profile-peak" points={`${peakX},${peakY - 9} ${peakX + 8},${peakY + 5} ${peakX - 8},${peakY + 5}`} />
        <text className="profile-label" x={peakX + 14} y={peakY - 2}>Peak {formatMetres(m.elevation_peak)}</text>

        <rect className="profile-site" x={siteX - 6} y={siteY - 6} width={12} height={12} />
        <text className="profile-site-label" x={siteX - 12} y={siteY - 14} textAnchor="end">Lot {formatMetres(m.elevation_site)}</text>

        <g className="profile-h">
          <line x1={PLOT.left} x2={siteX} y1={358} y2={358} />
          <line x1={PLOT.left} x2={PLOT.left} y1={352} y2={364} />
          <line x1={siteX} x2={siteX} y1={352} y2={364} />
          <text x={(PLOT.left + siteX) / 2} y={376} textAnchor="middle">H = {formatMetres(m.horizontal_distance_h)}</text>
        </g>

        {hover && (
          <g className="profile-hover" aria-hidden="true">
            <line x1={X(hover.dist)} x2={X(hover.dist)} y1={PLOT.top} y2={PLOT.bottom} />
            <circle cx={X(hover.dist)} cy={Y(hover.elev)} r={4} />
          </g>
        )}
      </svg>
      <p className="profile-readout mono" aria-hidden="true">
        {hover ? `${formatMetres(hover.dist)} from the peak · elevation ${formatMetres(hover.elev)}` : "Hover the profile for distance and elevation"}
      </p>
    </div>
  );
}
