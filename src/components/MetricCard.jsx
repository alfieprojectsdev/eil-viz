import "./MetricCard.css";

export default function MetricCard({ label, value, unit, highlight }) {
  return (
    <div className={`metric-card ${highlight ? "metric-highlight" : ""}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}<span className="metric-unit">{unit}</span></div>
    </div>
  );
}
