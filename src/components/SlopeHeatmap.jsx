import { useState, useEffect, useRef, useMemo } from "react";
import { makeSlopeColor } from "../lib/slopeColor";
import { svgPath, gridSummary } from "../lib/geo";
import { readTokens } from "../lib/tokens";
import "./SlopeHeatmap.css";

const MAX_HEIGHT = 560;
const MAX_CELL = 48;
// Drawing width while the well is hidden (the inactive tab). CSS scales the
// canvas down to whatever space it gets, e.g. on a printed page.
const FALLBACK_WIDTH = 720;

function band(deg, rules) {
  if (deg <= rules.flagDeg) return "safe";
  if (deg <= rules.susceptibleDeg) return "review band";
  return "susceptible";
}

// `contours`, when given, is gridContours() output: lines in cell units,
// drawn over the canvas in an SVG that shares its cropped cell box.
export default function SlopeHeatmap({ grid, rules, contours = null }) {
  const wellRef = useRef(null);
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(null);

  const valid = Array.isArray(grid) && grid.every(Array.isArray);
  const info = useMemo(() => (valid ? gridSummary(grid) : null), [grid, valid]);

  useEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = info ? info.maxR - info.minR + 1 : 0;
  const cols = info ? info.maxC - info.minC + 1 : 0;
  const cell = info ? Math.min((width || FALLBACK_WIDTH) / cols, MAX_HEIGHT / rows, MAX_CELL) : 0;

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
    // Drawn cell size times however much CSS has scaled the canvas.
    const shown = cell * (rect.width / (cols * cell));
    const r = info.minR + Math.floor(y / shown);
    const c = info.minC + Math.floor(x / shown);
    const v = grid[r]?.[c];
    setHovered(typeof v === "number" ? { v, x, y } : null);
  };

  return (
    <div className="heatmap-well" ref={wellRef}>
      <div className="heatmap-stage" style={{ width: cols * cell }}>
        <canvas
          ref={canvasRef}
          className="heatmap-canvas"
          role="img"
          aria-label={`Slope heatmap of the lot: ${info.count} pixels, the steepest ${info.max.v.toFixed(1)}° (outlined).`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHovered(null)}
        />
        {contours?.lines.length > 0 && (
          <svg
            className="heatmap-contours"
            viewBox={`${info.minC} ${info.minR} ${cols} ${rows}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {contours.lines.map((l, k) => (
              <path key={k} d={svgPath(l.cells)} className={l.index ? "heatmap-contour heatmap-contour-index" : "heatmap-contour"} />
            ))}
          </svg>
        )}
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
