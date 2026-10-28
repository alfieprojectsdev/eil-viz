import { useState, useEffect, useRef, useMemo } from "react";
import { makeSlopeColor } from "../lib/slopeColor";
import { readTokens } from "../lib/tokens";
import "./SlopeHeatmap.css";

const MAX_HEIGHT = 560;
const MAX_CELL = 48;

// Rows and columns that hold parcel pixels, the steepest pixel, and the count.
function summarise(grid) {
  let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
  let max = null, count = 0;
  grid.forEach((row, r) => {
    row.forEach((v, c) => {
      if (typeof v !== "number") return;
      count++;
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      if (!max || v > max.v) max = { v, r, c };
    });
  });
  return count ? { minR, maxR, minC, maxC, max, count } : null;
}

function band(deg, rules) {
  if (deg <= rules.flagDeg) return "safe";
  if (deg <= rules.susceptibleDeg) return "review band";
  return "susceptible";
}

export default function SlopeHeatmap({ grid, rules }) {
  const wellRef = useRef(null);
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(null);

  const valid = Array.isArray(grid) && grid.every(Array.isArray);
  const info = useMemo(() => (valid ? summarise(grid) : null), [grid, valid]);

  useEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = info ? info.maxR - info.minR + 1 : 0;
  const cols = info ? info.maxC - info.minC + 1 : 0;
  const cell = info && width ? Math.min(width / cols, MAX_HEIGHT / rows, MAX_CELL) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !info || !cell) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cols * cell * dpr);
    canvas.height = Math.round(rows * cell * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cols * cell, rows * cell);

    const slopeColor = makeSlopeColor(rules);
    // A 1px gap reads as a pixel grid; below 6px cells it would swamp them.
    const gap = cell >= 6 ? 1 : 0;
    for (let r = info.minR; r <= info.maxR; r++) {
      for (let c = info.minC; c <= info.maxC; c++) {
        const v = grid[r][c];
        if (typeof v !== "number") continue;
        ctx.fillStyle = slopeColor(v);
        ctx.fillRect((c - info.minC) * cell, (r - info.minR) * cell, cell - gap, cell - gap);
      }
    }

    const { max } = info;
    const lw = Math.max(1.5, Math.min(2.5, cell / 6));
    ctx.strokeStyle = readTokens(["--color-heatmap-max"])["--color-heatmap-max"];
    ctx.lineWidth = lw;
    ctx.strokeRect(
      (max.c - info.minC) * cell + lw / 2, (max.r - info.minR) * cell + lw / 2,
      cell - gap - lw, cell - gap - lw,
    );
  }, [grid, info, rules, rows, cols, cell]);

  if (!info) {
    return (
      <div className="heatmap-well heatmap-empty" ref={wellRef}>
        <p className="text-low">The response has no slope pixels to draw.</p>
      </div>
    );
  }

  const handleMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = info.minR + Math.floor(y / cell);
    const c = info.minC + Math.floor(x / cell);
    const v = grid[r]?.[c];
    setHovered(typeof v === "number" ? { v, x, y } : null);
  };

  return (
    <div className="heatmap-well" ref={wellRef}>
      <div className="heatmap-stage" style={{ width: cols * cell, height: rows * cell }}>
        <canvas
          ref={canvasRef}
          className="heatmap-canvas"
          style={{ width: cols * cell, height: rows * cell }}
          role="img"
          aria-label={`Slope heatmap of the lot: ${info.count} pixels, the steepest ${info.max.v.toFixed(1)}° (outlined).`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHovered(null)}
        />
        {hovered && (
          <div className="heatmap-tooltip" style={{ left: hovered.x + 14, top: hovered.y - 40 }}>
            <span className="mono text-high">{hovered.v.toFixed(1)}°</span>
            <span className="text-low">{band(hovered.v, rules)}</span>
          </div>
        )}
      </div>
      <span className="heatmap-north mono" aria-hidden="true">N ↑</span>
    </div>
  );
}
