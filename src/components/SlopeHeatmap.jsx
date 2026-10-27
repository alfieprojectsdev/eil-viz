import { useState, useEffect, useRef, useCallback } from "react";
import { slopeColor } from "../lib/slopeColor";
import { readToken } from "../lib/tokens";
import "./SlopeHeatmap.css";

export default function SlopeHeatmap({ data }) {
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

    ctx.strokeStyle = readToken("--color-heatmap-frame");
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cw - 2, ch - 2);

    ctx.strokeStyle = readToken("--color-heatmap-grid");
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
      ctx.strokeStyle = readToken("--color-heatmap-max");
      ctx.lineWidth = 2.5;
      ctx.strokeRect((maxValC - minC) * cellW + 1, (maxValR - minR) * cellH + 1, cellW - 2, cellH - 2);
    }

    ctx.fillStyle = readToken("--color-heatmap-label");
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
    <div className="heatmap-wrap">
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        className="heatmap-canvas"
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
