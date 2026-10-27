import { DATA_SOURCE_LABELS } from "../constants/status";
import StatusBadge from "./StatusBadge";
import "./Header.css";

function dataSourceLabel(source) {
  return DATA_SOURCE_LABELS[source] ?? String(source ?? "unknown").toUpperCase();
}

export default function Header({ projectId, dataSource, overallStatus }) {
  return (
    <>
      <div className="header">
        <div>
          <div className="header-heading">
            <span className="header-badge">PHASE 1</span>
            <span className="header-title">EIL-Calc Hazard Visualization</span>
          </div>
          <div className="header-sub">Project: {projectId}</div>
        </div>
        <div className="header-status">
          <span className="source-chip">
            <span className="source-dot" />
            {dataSourceLabel(dataSource)}
          </span>
          <StatusBadge status={overallStatus} />
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
    </>
  );
}
