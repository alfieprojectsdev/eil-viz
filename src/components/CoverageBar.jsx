import { formatPct } from "../lib/assessment";
import "./CoverageBar.css";

// One coverage share against its limit. `tone` colours the value and note
// (danger, review or neutral); `barTone` colours the bar when it differs.
export default function CoverageBar({ label, value, limit, scale, tone, barTone = tone, note }) {
  const width = `${Math.min(100, (value / scale) * 100)}%`;
  const marker = `${Math.min(100, (limit / scale) * 100)}%`;
  return (
    <div className="coverage-bar">
      <div className="coverage-bar-row">
        <span>{label}</span>
        <span className={`mono coverage-bar-value coverage-tone-${tone}`}>
          {formatPct(value, limit)}% <span className="text-low">/ limit {formatPct(limit)}%</span>
        </span>
      </div>
      <div className="coverage-bar-track" role="presentation">
        <div className={`coverage-bar-fill coverage-fill-${barTone}`} style={{ width }} />
        <div className="coverage-bar-limit" style={{ left: marker }} title={`Limit ${formatPct(limit)}%`} />
      </div>
      <span className={`coverage-bar-note coverage-tone-${tone}`}>{note}</span>
    </div>
  );
}
