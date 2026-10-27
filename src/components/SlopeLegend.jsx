import { SLOPE_THRESHOLDS } from "../constants/status";
import { slopeColor } from "../lib/slopeColor";
import "./SlopeLegend.css";

export default function SlopeLegend() {
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
