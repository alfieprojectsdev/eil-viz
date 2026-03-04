import { useState, useEffect, useRef, useCallback } from "react";
// https://claude.ai/share/979250ce-03c9-4459-b1bf-095a3b49ed07
// ─── Mock backend data (matches your real JSON output schema) ───────────────
const MOCK_RESULT = {
  project_id: "LOT-2024-001",
  data_source: "ifsar",
  phase_1_compliance: {
    slope_stability: {
      metrics: { max_slope_degrees: 12.4, avg_slope_degrees: 8.1 },
      assessment: { status: "FLAG FOR REVIEW", threshold_used: "10–15°" },
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
      assessment: { status: "SAFE (Beyond Runout)", is_compliant: true },
      // 1D transect: array of {dist_m, elev_m} from peak → site
      _viz_transect: [
        { dist_m: 0, elev_m: 480.0 },
        { dist_m: 310, elev_m: 400.0 },
        { dist_m: 620, elev_m: 310.0 }
      ]
    },
    overall_status: "MANUAL REVIEW REQUIRED",
  },
};

// ─── Color utilities ─────────────────────────────────────────────────────────
function slopeColor(deg) {
  // SAFE < 10°: blue-green | FLAG 10-16°: amber | SUSCEPTIBLE > 16°: crimson
  if (deg < 10) {
    const t = deg / 10;
    const r = Math.round(20 + t * 30);
    const g = Math.round(160 - t * 40);
    const b = Math.round(130 - t * 50);
    return `rgb(${r},${g},${b})`;
  } else if (deg < 16) {
    const t = (deg - 10) / 6;
    const r = Math.round(50 + t * 200);
    const g = Math.round(120 - t * 60);
    const b = Math.round(80 - t * 60);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = Math.min((deg - 16) / 9, 1);
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
  const tooltipRef = useRef(null);
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
    const cellW = cw / cols;
    const cellH = ch / rows;

    ctx.clearRect(0, 0, cw, ch);

    grid.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val !== null) {
          ctx.fillStyle = slopeColor(val);
          ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
        }
      });
    });

    // Parcel outline
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cw - 2, ch - 2);

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 0.5;
    for (let r = 1; r < rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(cw, r * cellH); ctx.stroke();
    }
    for (let c = 1; c < cols; c++) {
      ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, ch); ctx.stroke();
    }

    // Highlight the max-slope cell
    let maxVal = -Infinity, maxR = 0, maxC = 0;
    grid.forEach((row, r) => row.forEach((v, c) => { if (v !== null && v > maxVal) { maxVal = v; maxR = r; maxC = c; } }));
    if (maxVal !== -Infinity) {
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(maxC * cellW + 1, maxR * cellH + 1, cellW - 2, cellH - 2);
    }

    // Compass rose (NW corner label)
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 10px 'Courier New'";
    ctx.fillText("N↑", 6, 14);
  }, [grid, rows, cols]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / (canvas.width / cols));
    const r = Math.floor(y / (canvas.height / rows));
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      const val = grid[r][c];
      if (val !== null) {
        setHovered({ r, c, val, x: e.clientX, y: e.clientY });
      } else {
        setHovered(null);
      }
    } else {
      setHovered(null);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        style={{ display: "block", cursor: "crosshair", borderRadius: 4 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      {hovered && (
        <div className="map-tooltip" style={{ left: hovered.x - canvasRef.current?.getBoundingClientRect().left + 12, top: hovered.y - canvasRef.current?.getBoundingClientRect().top - 36 }}>
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
    { deg: 10, label: "10° ▶ FLAG" },
    { deg: 16, label: "16° ▶ SUSCEPTIBLE" },
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

// ─── Depositional Transect Chart ──────────────────────────────────────────────
function TransectChart({ data }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  const transect = data._viz_transect;
  const metrics = data.metrics;

  const PAD = { top: 32, right: 28, bottom: 52, left: 64 };

  const elevs = transect.map(p => p.elev_m);
  const minE = Math.min(...elevs) - 20;
  const maxE = Math.max(...elevs) + 30;
  const maxDist = metrics.horizontal_distance_h;

  const toCanvas = (canvas, dist, elev) => {
    const cw = canvas.width - PAD.left - PAD.right;
    const ch = canvas.height - PAD.top - PAD.bottom;
    const x = PAD.left + (dist / maxDist) * cw;
    const y = PAD.top + ch - ((elev - minE) / (maxE - minE)) * ch;
    return [x, y];
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const chartW = cw - PAD.left - PAD.right;
    const chartH = ch - PAD.top - PAD.bottom;

    // Background grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + (i / 5) * chartH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(cw - PAD.right, y); ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = PAD.left + (i / 6) * chartW;
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, ch - PAD.bottom); ctx.stroke();
    }

    // ── Runout zone band ──
    const runoutDist = metrics.required_runout_3x; // 510m from peak
    const [rx0] = toCanvas(canvas, 0, 0);
    const [rx1] = toCanvas(canvas, runoutDist, 0);
    ctx.fillStyle = "rgba(220,60,60,0.10)";
    ctx.fillRect(rx0, PAD.top, rx1 - rx0, chartH);
    ctx.strokeStyle = "rgba(220,60,60,0.55)";
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(rx1, PAD.top); ctx.lineTo(rx1, ch - PAD.bottom); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(220,60,60,0.85)";
    ctx.font = "10px 'Courier New'";
    ctx.fillText("3×ΔE limit", rx1 + 4, PAD.top + 14);

    // ── Terrain fill ──
    ctx.beginPath();
    const [x0, y0] = toCanvas(canvas, transect[0].dist_m, transect[0].elev_m);
    ctx.moveTo(x0, ch - PAD.bottom);
    ctx.lineTo(x0, y0);
    transect.forEach(pt => {
      const [px, py] = toCanvas(canvas, pt.dist_m, pt.elev_m);
      ctx.lineTo(px, py);
    });
    const [xlast] = toCanvas(canvas, transect[transect.length - 1].dist_m, transect[transect.length - 1].elev_m);
    ctx.lineTo(xlast, ch - PAD.bottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, PAD.top, 0, ch - PAD.bottom);
    grad.addColorStop(0, "rgba(80,160,120,0.6)");
    grad.addColorStop(1, "rgba(40,80,60,0.2)");
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Terrain line ──
    ctx.beginPath();
    transect.forEach((pt, i) => {
      const [px, py] = toCanvas(canvas, pt.dist_m, pt.elev_m);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "rgba(100,220,150,0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Peak marker ──
    const [px, py] = toCanvas(canvas, 0, metrics.elevation_peak);
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#f87171"; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#f87171";
    ctx.font = "bold 10px 'Courier New'";
    ctx.fillText(`▲ PEAK ${metrics.elevation_peak}m`, px + 8, py + 4);

    // ── Site marker ──
    const [sx, sy] = toCanvas(canvas, metrics.horizontal_distance_h, metrics.elevation_site);
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#60a5fa"; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#60a5fa";
    ctx.font = "bold 10px 'Courier New'";
    ctx.fillText(`◆ SITE ${metrics.elevation_site}m`, sx - 90, sy - 10);

    // ── H distance arrow ──
    const arrowY = ch - PAD.bottom + 24;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, arrowY); ctx.lineTo(sx, arrowY); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    // arrowheads
    [[px, -1], [sx, 1]].forEach(([ax, dir]) => {
      ctx.beginPath(); ctx.moveTo(ax, arrowY);
      ctx.lineTo(ax + dir * 7, arrowY - 4);
      ctx.lineTo(ax + dir * 7, arrowY + 4);
      ctx.closePath(); ctx.fill();
    });
    ctx.font = "10px 'Courier New'";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "center";
    ctx.fillText(`H = ${metrics.horizontal_distance_h}m`, (px + sx) / 2, arrowY - 6);
    ctx.textAlign = "left";

    // ── Axes ──
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, ch - PAD.bottom); ctx.lineTo(cw - PAD.right, ch - PAD.bottom); ctx.stroke();

    // Y axis labels
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "10px 'Courier New'";
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const e = minE + ((maxE - minE) * (5 - i)) / 5;
      const y = PAD.top + (i / 5) * chartH;
      ctx.fillText(`${Math.round(e)}m`, PAD.left - 6, y + 4);
    }

    // X axis labels
    ctx.textAlign = "center";
    for (let i = 0; i <= 6; i++) {
      const d = (maxDist / 6) * i;
      const x = PAD.left + (i / 6) * chartW;
      ctx.fillText(`${Math.round(d)}m`, x, ch - PAD.bottom + 16);
    }
    ctx.textAlign = "left";

    // Axis titles
    ctx.save();
    ctx.translate(14, ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("ELEVATION (m)", 0, 0);
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("HORIZONTAL DISTANCE FROM PEAK (m)", PAD.left + chartW / 2, ch - 6);
    ctx.textAlign = "left";
  }, [transect, metrics]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartW = canvas.width - PAD.left - PAD.right;
    const relX = mouseX - PAD.left;
    if (relX < 0 || relX > chartW) { setHovered(null); return; }
    const dist = (relX / chartW) * maxDist;
    const closest = transect.reduce((a, b) => Math.abs(b.dist_m - dist) < Math.abs(a.dist_m - dist) ? b : a);
    setHovered({ ...closest, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top });
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={560}
        height={320}
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      {hovered && (
        <div className="map-tooltip" style={{ left: hovered.mouseX + 10, top: hovered.mouseY - 40 }}>
          <span className="tt-label">Distance</span>
          <span className="tt-val">{hovered.dist_m}m</span>
          <span className="tt-sub">Elev: {hovered.elev_m}m</span>
        </div>
      )}
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
  const result = data || MOCK_RESULT;
  const slope = result.phase_1_compliance.slope_stability;
  const dep = result.phase_1_compliance.depositional_hazard;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #0b0f14; }

        .app {
          min-height: 100vh;
          background: #0b0f14;
          color: #d4dbe8;
          font-family: 'DM Sans', sans-serif;
          padding: 0 0 48px;
        }

        /* ── Header ── */
        .header {
          background: linear-gradient(180deg, #0f1923 0%, #0b0f14 100%);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 20px 32px 16px;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .header-badge {
          background: rgba(220,60,60,0.15);
          border: 1px solid rgba(220,60,60,0.35);
          color: #f87171;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          padding: 3px 8px;
          border-radius: 3px;
        }
        .header-title {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #e2e8f0;
          text-transform: uppercase;
        }
        .header-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          font-family: 'Space Mono', monospace;
          margin-top: 2px;
        }
        .header-status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Status badge ── */
        .badge-safe { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.4); color: #4ade80; }
        .badge-review { background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.4); color: #fbbf24; }
        .badge-danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); color: #f87171; }
        .status-badge {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 4px 10px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        /* ── Tabs ── */
        .tabs-row {
          display: flex;
          gap: 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 0 32px;
          background: #0e1520;
        }
        .tab-btn {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 1.2px;
          padding: 14px 20px 12px;
          text-transform: uppercase;
          transition: all 0.18s;
          display: flex; align-items: center; gap: 8px;
        }
        .tab-btn:hover { color: rgba(255,255,255,0.65); }
        .tab-btn.active {
          color: #60a5fa;
          border-bottom-color: #60a5fa;
        }
        .tab-icon { font-size: 14px; }

        /* ── Content area ── */
        .content {
          padding: 28px 32px;
          display: flex;
          gap: 28px;
          align-items: flex-start;
        }

        /* ── Panel ── */
        .panel {
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px;
          overflow: hidden;
        }
        .panel-header {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 1.5px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-body { padding: 16px; }

        /* ── Metrics grid ── */
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }
        .metric-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 4px;
          padding: 10px 12px;
        }
        .metric-card.metric-highlight {
          border-color: rgba(251,191,36,0.3);
          background: rgba(251,191,36,0.04);
        }
        .metric-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .metric-value {
          font-family: 'Space Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: #e2e8f0;
        }
        .metric-unit {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin-left: 3px;
        }

        /* ── Legend ── */
        .legend-wrap {
          position: relative;
          margin-top: 12px;
        }
        .legend-bar {
          height: 12px;
          border-radius: 3px;
          width: 100%;
        }
        .legend-labels {
          position: relative;
          height: 24px;
          margin-top: 2px;
          font-family: 'Space Mono', monospace;
          font-size: 8.5px;
          color: rgba(255,255,255,0.4);
        }
        .legend-tick {
          position: absolute;
          transform: translateX(-50%);
          white-space: nowrap;
        }

        /* ── Tooltip ── */
        .map-tooltip {
          position: absolute;
          background: rgba(10,16,24,0.95);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 4px;
          padding: 6px 10px;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 1px;
          z-index: 10;
        }
        .tt-label { font-family: 'Space Mono', monospace; font-size: 9px; color: rgba(255,255,255,0.35); letter-spacing: 1px; text-transform: uppercase; }
        .tt-val { font-family: 'Space Mono', monospace; font-size: 15px; font-weight: 700; color: #e2e8f0; }
        .tt-sub { font-size: 10px; color: rgba(255,255,255,0.3); }

        /* ── Runout fact box ── */
        .runout-box {
          background: rgba(34,197,94,0.06);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 4px;
          padding: 10px 14px;
          margin-top: 12px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: #4ade80;
          line-height: 1.7;
        }
        .runout-box.prone {
          background: rgba(220,60,60,0.07);
          border-color: rgba(220,60,60,0.25);
          color: #f87171;
        }
        .runout-formula { font-size: 12px; font-weight: 700; margin-bottom: 4px; }

        /* ── Annotation list ── */
        .annot-list {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .annot-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
        }
        .annot-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        }

        /* ── Phase indicator bar ── */
        .phase-bar {
          display: flex; align-items: center;
          padding: 8px 32px;
          gap: 16px;
          background: rgba(255,255,255,0.015);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
        }
        .phase-sep { color: rgba(255,255,255,0.1); }
        .phase-active { color: #60a5fa; }

        /* ── Source chip ── */
        .source-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 1px;
          color: rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 2px 8px; border-radius: 10px;
        }
        .source-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 4px #4ade80;
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
            <span className={`status-badge ${statusBadge(result.phase_1_compliance.overall_status)}`}>
              {result.phase_1_compliance.overall_status}
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
                <span>Pixel-level Gradient Map — Parcel Bounds</span>
                <span className={`status-badge ${statusBadge(slope.assessment.status)}`}>{slope.assessment.status}</span>
              </div>
              <div className="panel-body">
                <SlopeHeatmap data={slope} />
                <SlopeLegend />
                <div className="annot-list" style={{ marginTop: 14 }}>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#14a37a" }} /><span>Safe zone (&lt; 10°)</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#d97706" }} /><span>Flag for review (10°–16°)</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#ef4444" }} /><span>Susceptible (&gt; 16°)</span></div>
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
                    <MetricCard label="Threshold" value="10–16" unit="°" />
                    <MetricCard label="Algorithm" value="∇z" unit="" />
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">Assessment Logic</div>
                <div className="panel-body" style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, lineHeight: 2, color: "rgba(255,255,255,0.45)" }}>
                  <div><span style={{ color: "#4ade80" }}>IF</span> max_slope &lt; 10° → <span style={{ color: "#4ade80" }}>SAFE</span></div>
                  <div><span style={{ color: "#fbbf24" }}>ELIF</span> max_slope &lt; 16° → <span style={{ color: "#fbbf24" }}>FLAG FOR REVIEW</span></div>
                  <div><span style={{ color: "#f87171" }}>ELSE</span> → <span style={{ color: "#f87171" }}>SUSCEPTIBLE</span></div>
                  <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                    Gradient computed via np.gradient() over every pixel within parcel. Single-transect profiling would miss micro-topographic features.
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">Why a Heatmap?</div>
                <div className="panel-body" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
                  Slope stability evaluates the entire 2D surface. A single profile line would under-report hazard if the steepest pixels are off-axis. Every pixel inside the parcel boundary is assessed independently — this view surfaces those hotspots directly.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "dep" && (
          <div className="content">
            {/* Left: transect */}
            <div className="panel" style={{ flex: 1 }}>
              <div className="panel-header">
                <span>Elevation Transect: Peak → Site (DEM Query Along H-Line)</span>
                <span className={`status-badge ${statusBadge(dep.assessment.status)}`}>{dep.assessment.status}</span>
              </div>
              <div className="panel-body">
                <TransectChart data={dep} />
                <div className="annot-list">
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#f87171" }} /><span>Peak — highest pixel in 1km search buffer</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "#60a5fa" }} /><span>Site — lowest pixel within parcel geometry</span></div>
                  <div className="annot-row"><div className="annot-dot" style={{ background: "rgba(220,60,60,0.5)", borderRadius: 2 }} /><span>3×ΔE runout zone (shaded red) — anything left of dashed line is PRONE</span></div>
                </div>
              </div>
            </div>

            {/* Right: metrics */}
            <div style={{ flex: "0 0 230px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="panel">
                <div className="panel-header">Runout Metrics</div>
                <div className="panel-body">
                  <div className="metrics-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <MetricCard label="Elevation Peak" value={dep.metrics.elevation_peak.toFixed(0)} unit="m" />
                    <MetricCard label="Elevation Site" value={dep.metrics.elevation_site.toFixed(0)} unit="m" />
                    <MetricCard label="ΔE (drop)" value={dep.metrics.delta_e.toFixed(0)} unit="m" highlight />
                    <MetricCard label="H (horiz. dist.)" value={dep.metrics.horizontal_distance_h.toFixed(0)} unit="m" />
                    <MetricCard label="3×ΔE limit" value={dep.metrics.required_runout_3x.toFixed(0)} unit="m" />
                  </div>
                </div>
              </div>

              <div className={`runout-box ${dep.assessment.is_compliant ? "" : "prone"}`}>
                <div className="runout-formula">H {dep.assessment.is_compliant ? ">" : "<"} 3 × ΔE</div>
                <div>{dep.metrics.horizontal_distance_h}m {dep.assessment.is_compliant ? ">" : "<"} {dep.metrics.required_runout_3x}m</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>{dep.assessment.status}</div>
              </div>

              <div className="panel">
                <div className="panel-header">Algorithm</div>
                <div className="panel-body" style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, lineHeight: 2, color: "rgba(255,255,255,0.4)" }}>
                  <div>1. Identify peak P in buffer</div>
                  <div>2. Identify site S (min elev)</div>
                  <div>3. ΔE = E_peak − E_site</div>
                  <div>4. H = geodetic dist(P, S)</div>
                  <div>5. Check H &gt; 3 × ΔE</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
