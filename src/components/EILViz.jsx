import { useState, useEffect, useRef, useCallback } from "react";
import { SLOPE_THRESHOLDS, SLOPE_STATUS, DEPOSITIONAL_STATUS, OVERALL_STATUS } from "../constants/status";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from "recharts";
// https://claude.ai/share/979250ce-03c9-4459-b1bf-095a3b49ed07
// ─── Mock backend data (matches your real JSON output schema) ───────────────
const MOCK_RESULT = {
  project_id: "LOT-2024-001",
  data_source: "ifsar",
  phase_1_compliance: {
    slope_stability: {
      metrics: { max_slope_degrees: 12.4, avg_slope_degrees: 8.1 },
      assessment: { status: SLOPE_STATUS.SAFE, threshold_used: "max_slope" },
      // pixel grid: row-major array of slope values in degrees
      _viz_grid: [
        [1.2, 5.5, 9.1],
        [4.3, 14.8, 12.1],
        [8.9, 11.2, 17.5]
      ]
    },
    depositional_hazard: {
      metrics: {
        elevation_peak: 480.0,
        elevation_site: 310.0,
        delta_e: 170.0,
        horizontal_distance_h: 620.0,
        required_runout_3x: 510.0,
      },
      assessment: { status: DEPOSITIONAL_STATUS.SAFE, is_compliant: true },
      // Now an array of objects representing paths
      _viz_transects: [
        {
          metrics: { elevation_peak: 480.0, elevation_site: 310.0, delta_e: 170.0, horizontal_distance_h: 620.0, required_runout_3x: 510.0 },
          assessment: { status: DEPOSITIONAL_STATUS.SAFE, is_compliant: true },
          path: [
            { dist_m: 0, elev_m: 480.0 },
            { dist_m: 310, elev_m: 400.0 },
            { dist_m: 620, elev_m: 310.0 }
          ],
          threat_ratio: 0.82
        }
      ]
    },
    overall_status: OVERALL_STATUS.REVIEW,
  },
};

// ─── Color utilities ─────────────────────────────────────────────────────────
function slopeColor(deg) {
  // SAFE < 14°: blue-green | FLAG 14-16°: amber | SUSCEPTIBLE > 16°: crimson
  if (deg < SLOPE_THRESHOLDS.flag) {
    const t = deg / SLOPE_THRESHOLDS.flag;
    const r = Math.round(20 + t * 30);
    const g = Math.round(160 - t * 40);
    const b = Math.round(130 - t * 50);
    return `rgb(${r},${g},${b})`;
  } else if (deg < SLOPE_THRESHOLDS.susceptible) {
    const t = (deg - SLOPE_THRESHOLDS.flag) / (SLOPE_THRESHOLDS.susceptible - SLOPE_THRESHOLDS.flag);
    const r = Math.round(50 + t * 200);
    const g = Math.round(120 - t * 60);
    const b = Math.round(80 - t * 60);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = Math.min((deg - SLOPE_THRESHOLDS.susceptible) / 9, 1);
    const r = Math.round(250 - t * 20);
    const g = Math.round(60 - t * 40);
    const b = Math.round(20);
    return `rgb(${r},${g},${b})`;
  }
}

function statusBadge(status) {
  if (status.includes("SAFE") || status.includes("CERTIFIED")) return "badge-safe";
  if (status.includes("REVIEW") || status.includes("FLAG")) return "badge-review";
  return "badge-danger";
}

// ─── Slope Heatmap ────────────────────────────────────────────────────────────
function SlopeHeatmap({ data }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  const grid = data._viz_grid;
  const rows = grid.length;
  const cols = grid[0].length;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cw = canvas.width;
    const ch = canvas.height;

    let minR = rows, maxR = 0, minC = cols, maxC = 0;
    let hasData = false;
    grid.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val !== null) {
          hasData = true;
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      });
    });

    if (!hasData) {
      ctx.clearRect(0, 0, cw, ch);
      return;
    }

    minR = Math.max(0, minR - 1);
    maxR = Math.min(rows - 1, maxR + 1);
    minC = Math.max(0, minC - 1);
    maxC = Math.min(cols - 1, maxC + 1);

    const activeRows = maxR - minR + 1;
    const activeCols = maxC - minC + 1;
    const cellW = cw / activeCols;
    const cellH = ch / activeRows;

    ctx.clearRect(0, 0, cw, ch);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const val = grid[r][c];
        if (val !== null) {
          ctx.fillStyle = slopeColor(val);
          ctx.fillRect((c - minC) * cellW, (r - minR) * cellH, cellW + 1, cellH + 1);
        }
      }
    }

    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cw - 2, ch - 2);

    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 0.5;
    for (let r = 1; r < activeRows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(cw, r * cellH); ctx.stroke();
    }
    for (let c = 1; c < activeCols; c++) {
      ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, ch); ctx.stroke();
    }

    let maxVal = -Infinity, maxValR = 0, maxValC = 0;
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const v = grid[r][c];
        if (v !== null && v > maxVal) { maxVal = v; maxValR = r; maxValC = c; }
      }
    }
    if (maxVal !== -Infinity) {
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect((maxValC - minC) * cellW + 1, (maxValR - minR) * cellH + 1, cellW - 2, cellH - 2);
    }

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
    ctx.fillText("N↑", 8, 16);

    canvasRef.current._geoMap = { minR, minC, cellW, cellH, maxR, maxC };
  }, [grid, rows, cols]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const map = canvas?._geoMap;
    if (!map) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const logicalX = x * scaleX;
    const logicalY = y * scaleY;

    const cOffset = Math.floor(logicalX / map.cellW);
    const rOffset = Math.floor(logicalY / map.cellH);
    const c = map.minC + cOffset;
    const r = map.minR + rOffset;

    if (r >= map.minR && r <= map.maxR && c >= map.minC && c <= map.maxC && r >= 0 && r < rows && c >= 0 && c < cols) {
      const val = grid[r][c];
      if (val !== null) {
        setHovered({ r, c, val, x, y });
      } else {
        setHovered(null);
      }
    } else {
      setHovered(null);
    }
  };

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        style={{ cursor: "crosshair", borderRadius: 4, maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      {hovered && (
        <div className="map-tooltip" style={{ left: hovered.x + 12, top: hovered.y - 36 }}>
          <span className="tt-label">Slope</span>
          <span className="tt-val">{hovered.val.toFixed(1)}°</span>
          <span className="tt-sub">pixel [{hovered.r},{hovered.c}]</span>
        </div>
      )}
    </div>
  );
}

// ─── Slope Legend ─────────────────────────────────────────────────────────────
function SlopeLegend() {
  const stops = [
    { deg: 0, label: "0°" },
    { deg: 5, label: "5°" },
    { deg: SLOPE_THRESHOLDS.flag, label: `${SLOPE_THRESHOLDS.flag}° ▶ FLAG` },
    { deg: SLOPE_THRESHOLDS.susceptible, label: `${SLOPE_THRESHOLDS.susceptible}° ▶ SUSCEPTIBLE` },
    { deg: 25, label: "25°" },
  ];
  return (
    <div className="legend-wrap">
      <div className="legend-bar" style={{
        background: `linear-gradient(to right, ${[0, 4, 8, 10, 12, 14, 16, 20, 25].map(d => slopeColor(d)).join(",")})`
      }} />
      <div className="legend-labels">
        {stops.map(s => (
          <span key={s.deg} style={{ left: `${(s.deg / 25) * 100}%` }} className="legend-tick">
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Depositional Transect Chart (Recharts) ───────────────────────────────────

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const ptData = payload[0].payload;
    return (
      <div className="map-tooltip" style={{ pointerEvents: 'none' }}>
        <span className="tt-label">Distance</span>
        <span className="tt-val">{Math.round(ptData.dist_m)}m</span>
        <span className="tt-sub">Elev: {Math.round(ptData.elev_m)}m</span>
      </div>
    );
  }
  return null;
};

function TransectChart({ data }) {
  const rawTransect = data.path || data._viz_transect || [];
  const initialValidE = rawTransect.find(p => p.elev_m <= 5000)?.elev_m || 0;

  const transect = rawTransect.reduce((acc, pt) => {
    const prevValid = acc.length > 0 ? acc[acc.length - 1].elev_m : initialValidE;
    const e = pt.elev_m > 5000 ? prevValid : pt.elev_m;
    acc.push({ ...pt, elev_m: e });
    return acc;
  }, []);

  const metrics = data.metrics;
  const runoutDist = metrics.required_runout_3x;

  // Enforce a minimum domain of 250m to prevent visual collapse of tiny runouts
  const maxTransectDist = transect.length > 0 ? transect[transect.length - 1].dist_m : 0;
  const axisMaxDist = Math.max(250, maxTransectDist, runoutDist);

  return (
    <div style={{ position: "relative", flex: 1, width: "100%", height: "100%", minHeight: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={transect}
          margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#50a078" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#28503c" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={true} horizontal={true} />
          <XAxis
            dataKey="dist_m"
            type="number"
            domain={[0, axisMaxDist]}
            tickCount={6}
            tickFormatter={(v) => `${Math.round(v)}m`}
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "bold", fontFamily: "system-ui, -apple-system, sans-serif" }}
            label={{ value: "HORIZONTAL DISTANCE FROM PEAK (m)", position: "insideBottom", offset: -15, fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: "bold" }}
          />
          <YAxis
            domain={['dataMin - 10', 'dataMax + 10']}
            tickCount={5}
            tickFormatter={(v) => `${Math.round(v)}m`}
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "bold", fontFamily: "system-ui, -apple-system, sans-serif" }}
            label={{ value: "ELEVATION (m)", angle: -90, position: "insideLeft", offset: 15, fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: "bold" }}
          />
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />

          {/* Runout Band Reference */}
          <ReferenceLine
            x={runoutDist}
            stroke="rgba(220,60,60,0.55)"
            strokeDasharray="6 4"
            label={{ position: 'top', value: '3×ΔE limit', fill: 'rgba(220,60,60,0.85)', fontSize: 11, fontWeight: 'bold' }}
          />

          {/* Peak and Site markers */}
          <ReferenceDot x={0} y={metrics.elevation_peak} r={6} fill="#f87171" stroke="#fff" strokeWidth={1.5} />
          <ReferenceDot x={metrics.horizontal_distance_h} y={metrics.elevation_site} r={6} fill="#60a5fa" stroke="#fff" strokeWidth={1.5} />

          <Area
            type="linear"
            dataKey="elev_m"
            stroke="rgba(100,220,150,0.95)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorElev)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, highlight }) {
  return (
    <div className={`metric-card ${highlight ? "metric-highlight" : ""}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}<span className="metric-unit">{unit}</span></div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function EILViz({ data }) {
  const [tab, setTab] = useState("slope");
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);

  const result = data || MOCK_RESULT;
  const slope = result.phase_1_compliance.slope_stability;
  const dep = result.phase_1_compliance.depositional_hazard;

  // Fallback for old single-transect structure in cached API hits
  const transects = dep._viz_transects || [{ metrics: dep.metrics, assessment: dep.assessment, path: dep._viz_transect || [] }];
  const activeTransect = transects[selectedPathIndex] || transects[0];

  const overallStat = result.phase_1_compliance.overall_status;
  // If we have an override in dep.assessment, use it
  const depStatus = activeTransect?.assessment?.status || dep.assessment.status;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: var(--color-bg-base); }

        .app {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--color-bg-base);
          color: var(--color-text-med);
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        }

        /* ── Header ── */
        .header {
          background: linear-gradient(180deg, var(--color-bg-surface) 0%, var(--color-bg-base) 100%);
          border-bottom: 1px solid var(--color-border);
          padding: 24px 32px 20px;
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .header-badge {
          background: oklch(0.68 0.16 160 / 0.1);
          border: 1px solid oklch(0.68 0.16 160 / 0.3);
          color: var(--color-primary);
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          padding: 4px 10px;
          border-radius: 4px;
        }
        .header-title {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--color-text-high);
          text-transform: uppercase;
        }
        .header-sub {
          font-size: 11px;
          color: var(--color-text-low);
          font-family: 'Space Mono', monospace;
          margin-top: 4px;
        }
        .header-status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* ── Status badge ── */
        .badge-safe { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
        .badge-review { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.3); color: #fbbf24; }
        .badge-danger { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        .status-badge {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 4px 12px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        /* ── Tabs ── */
        .tabs-row {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--color-border);
          padding: 0 32px;
          background: var(--color-bg-surface);
        }
        .tab-btn {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--color-text-low);
          cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          padding: 16px 20px 14px;
          text-transform: uppercase;
          transition: color 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; align-items: center; gap: 8px;
        }
        .tab-btn:hover { color: var(--color-text-high); }
        .tab-btn.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }
        .tab-icon { font-size: 14px; }

        /* ── Content area ── */
        .content {
          padding: 24px 32px;
          display: flex;
          gap: 24px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          align-items: stretch;
        }

        /* ── Panel ── */
        .panel {
          background: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .panel-header {
          padding: 14px 20px;
          border-bottom: 1px solid var(--color-border);
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--color-text-high);
          text-transform: uppercase;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .panel-body { 
          padding: 20px; 
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Metrics grid ── */
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 8px;
        }
        .metric-card {
          background: var(--color-bg-input);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 12px 16px;
          transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .metric-card:hover {
          border-color: var(--color-border-hover);
        }
        .metric-card.metric-highlight {
          border-color: var(--color-primary);
          background: oklch(0.68 0.16 160 / 0.04);
        }
        .metric-label {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--color-text-low);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .metric-value {
          font-family: 'Space Mono', monospace;
          font-size: 24px;
          font-weight: 700;
          color: var(--color-text-high);
          font-variant-numeric: tabular-nums;
        }
        .metric-unit {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-low);
          margin-left: 4px;
        }

        /* ── Legend ── */
        .legend-wrap {
          position: relative;
          margin-top: 8px;
        }
        .legend-bar {
          height: 8px;
          border-radius: 4px;
          width: 100%;
        }
        .legend-labels {
          position: relative;
          height: 24px;
          margin-top: 6px;
          font-family: 'Space Mono', monospace;
          font-size: 8.5px;
          color: var(--color-text-low);
        }
        .legend-tick {
          position: absolute;
          transform: translateX(-50%);
          white-space: nowrap;
        }

        /* ── Tooltip ── */
        .map-tooltip {
          position: absolute;
          background: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 8px 14px;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 100;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .tt-label { font-family: 'DM Sans', system-ui, sans-serif; font-size: 9px; font-weight: 700; color: var(--color-text-low); letter-spacing: 1px; text-transform: uppercase; }
        .tt-val { font-family: 'Space Mono', monospace; font-size: 18px; font-weight: 700; color: var(--color-text-high); }
        .tt-sub { font-family: 'Space Mono', monospace; font-size: 10px; color: var(--color-text-low); }

        /* ── Runout fact box ── */
        .runout-box {
          background: rgba(34,197,94,0.04);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 6px;
          padding: 14px 18px;
          margin-top: 8px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          color: #4ade80;
          line-height: 1.6;
        }
        .runout-box.prone {
          background: rgba(220,60,60,0.04);
          border-color: rgba(220,60,60,0.2);
          color: #f87171;
        }
        .runout-formula { font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700; margin-bottom: 6px; }

        /* ── Annotation list ── */
        .annot-list {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .annot-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          color: var(--color-text-low);
        }
        .annot-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }

        /* ── Phase indicator bar ── */
        .phase-bar {
          display: flex; align-items: center;
          padding: 10px 32px;
          gap: 16px;
          background: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border);
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 1px;
          color: var(--color-text-low);
          text-transform: uppercase;
        }
        .phase-sep { color: var(--color-border); }
        .phase-active { color: var(--color-primary); font-weight: 700; }

        /* ── Source chip ── */
        .source-chip {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 1px;
          color: var(--color-text-high);
          background: var(--color-bg-input);
          border: 1px solid var(--color-border);
          padding: 4px 10px; border-radius: 12px;
        }
        .source-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--color-primary);
          box-shadow: 0 0 6px var(--color-primary);
        }
      `}</style>

      <div className="app">
        {/* Header */}
        <div className="header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="header-badge">PHASE 1</span>
              <span className="header-title">EIL-Calc Hazard Visualization</span>
            </div>
            <div className="header-sub">Project: {result.project_id}</div>
          </div>
          <div className="header-status">
            <span className="source-chip">
              <span className="source-dot" />
              {result.data_source.toUpperCase()} 5m
            </span>
            <span className={`status-badge ${statusBadge(overallStat)}`}>
              {overallStat}
            </span>
          </div>
        </div>

        {/* Phase breadcrumb */}
        <div className="phase-bar">
          <span className="phase-active">Phase 1: Compliance</span>
          <span className="phase-sep">›</span>
          <span>Slope Stability</span>
          <span className="phase-sep">+</span>
          <span>Depositional Runout</span>
          <span className="phase-sep">›</span>
          <span>Phase 2: Hybrid ML (deferred)</span>
        </div>

        {/* Tabs */}
        <div className="tabs-row">
          <button className={`tab-btn ${tab === "slope" ? "active" : ""}`} onClick={() => setTab("slope")}>
            <span className="tab-icon">▦</span> Slope Stability Heatmap
          </button>
          <button className={`tab-btn ${tab === "dep" ? "active" : ""}`} onClick={() => setTab("dep")}>
            <span className="tab-icon">⛰</span> Depositional Elevation Profile
          </button>
        </div>

        {/* Tab content */}
        {tab === "slope" && (
          <div className="content">
            {/* Left: heatmap */}
            <div className="panel" style={{ flex: "0 0 auto" }}>
              <div className="panel-header">
                <span>Pixel-level Gradient Map: Parcel Bounds</span>
                <span className={`status-badge ${statusBadge(slope.assessment.status)}`}>{slope.assessment.status}</span>
              </div>
              <div className="panel-body">
                <SlopeHeatmap data={slope} />
                <SlopeLegend />
                <div className="annot-list" style={{ marginTop: 14 }}>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#14a37a" }} /><span>Safe zone (&lt; {SLOPE_THRESHOLDS.flag}°)</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#d97706" }} /><span>Flag for review ({SLOPE_THRESHOLDS.flag}°–{SLOPE_THRESHOLDS.susceptible}°)</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#ef4444" }} /><span>Susceptible (&gt; {SLOPE_THRESHOLDS.susceptible}°)</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "transparent", border: "2px solid white" }} /><span>Max slope pixel (white outline)</span></div>
                </div>
              </div>
            </div>

            {/* Right: metrics */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="panel">
                <div className="panel-header">Computed Metrics</div>
                <div className="panel-body">
                  <div className="metrics-grid">
                    <MetricCard label="Max Slope" value={slope.metrics.max_slope_degrees.toFixed(1)} unit="°" highlight />
                    <MetricCard label="Avg Slope" value={slope.metrics.avg_slope_degrees.toFixed(1)} unit="°" />
                    <MetricCard label="Threshold" value={`${SLOPE_THRESHOLDS.flag}–${SLOPE_THRESHOLDS.susceptible}`} unit="°" />
                    <MetricCard label="Algorithm" value="∇z" unit="" />
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">Assessment Logic</div>
                <div className="panel-body" style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, lineHeight: 2, color: "rgba(255,255,255,0.45)" }}>
                  <div><span style={{ color: "#4ade80" }}>IF</span> max_slope &lt; {SLOPE_THRESHOLDS.flag}° → <span style={{ color: "#4ade80" }}>SAFE</span></div>
                  <div><span style={{ color: "#fbbf24" }}>ELIF</span> max_slope &lt; {SLOPE_THRESHOLDS.susceptible}° → <span style={{ color: "#fbbf24" }}>FLAG FOR REVIEW</span></div>
                  <div><span style={{ color: "#f87171" }}>ELSE</span> → <span style={{ color: "#f87171" }}>SUSCEPTIBLE</span></div>
                  <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                    Gradient computed via np.gradient() over every pixel within parcel. Single-transect profiling would miss micro-topographic features.
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">Why a Heatmap?</div>
                <div className="panel-body" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
                  Slope stability evaluates the entire 2D surface. A single profile line would under-report hazard if the steepest pixels are off-axis. Every pixel inside the parcel boundary is assessed independently: this view surfaces those hotspots directly.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "dep" && (
          <div className="content">
            {/* Left: transect */}
            <div className="panel" style={{ flex: 1 }}>
              <div className="panel-header" style={{ paddingBottom: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span>Elevation Transect: Peak → Site (Topographic Runout Routing)</span>
                  {transects.length > 1 && (
                    <select
                      value={selectedPathIndex}
                      onChange={(e) => setSelectedPathIndex(Number(e.target.value))}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "#e2e8f0",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "3px 6px",
                        borderRadius: 3,
                        fontSize: 10,
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        width: "max-content",
                        outline: "none"
                      }}
                    >
                      {transects.map((t, i) => (
                        <option key={i} value={i} style={{ background: "#0f1923" }}>
                          Critical Path {i + 1} {i === 0 ? "(Highest Threat Severity)" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <span className={`status-badge ${statusBadge(depStatus)}`} style={{ alignSelf: 'flex-start' }}>{depStatus}</span>
              </div>
              <div className="panel-body">
                <TransectChart data={activeTransect} />
                <div className="annot-list">
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#f87171" }} /><span>Peak: Trace origin from uphill walker</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#60a5fa" }} /><span>Site: Closest parcel encroachment</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "rgba(220,60,60,0.5)", borderRadius: 2 }} /><span>3×ΔE runout zone (shaded red): anything left of dashed line is PRONE</span></div>
                </div>
              </div>
            </div>

            {/* Right: metrics */}
            <div style={{ flex: "0 0 230px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="panel">
                <div className="panel-header">Runout Metrics</div>
                <div className="panel-body">
                  <div className="metrics-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <MetricCard label="Elevation: Peak" value={activeTransect.metrics.elevation_peak.toFixed(0)} unit="m" />
                    <MetricCard label="Elevation: Site" value={activeTransect.metrics.elevation_site.toFixed(0)} unit="m" />
                    <MetricCard label="ΔE (drop)" value={activeTransect.metrics.delta_e.toFixed(0)} unit="m" highlight />
                    <MetricCard label="H (horiz. dist.)" value={activeTransect.metrics.horizontal_distance_h.toFixed(0)} unit="m" />
                    <MetricCard label="3×ΔE limit" value={activeTransect.metrics.required_runout_3x.toFixed(0)} unit="m" />
                  </div>
                </div>
              </div>

              <div className={`runout-box ${activeTransect.assessment.is_compliant ? "" : "prone"}`}>
                <div className="runout-formula">H {activeTransect.assessment.is_compliant ? ">" : "<"} 3 × ΔE</div>
                <div>{activeTransect.metrics.horizontal_distance_h}m {activeTransect.assessment.is_compliant ? ">" : "<"} {activeTransect.metrics.required_runout_3x}m</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>{activeTransect.assessment.status}</div>
              </div>

              <div className="panel">
                <div className="panel-header">Algorithm</div>
                <div className="panel-body" style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, lineHeight: 2, color: "rgba(255,255,255,0.4)" }}>
                  <div>1. Walk uphill from parcel</div>
                  <div>2. Map multiple ridge peaks</div>
                  <div>3. ΔE = E_peak − E_site</div>
                  <div>4. Route flow down to site</div>
                  <div>5. Check H &gt; 3 × ΔE per path</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
