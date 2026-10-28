import { DATA_SOURCE_LABELS, DEFAULT_PROJECT_ID } from "../constants/status";
import { LogoIcon } from "./Icons";
import "./AppHeader.css";

function dataSourceLabel(source) {
  return DATA_SOURCE_LABELS[source] ?? String(source ?? "unknown DEM").toUpperCase();
}

// Results pass projectId, dataSource and onNewAssessment; the other screens
// pass a tagline or nothing.
export default function AppHeader({ tagline, projectId, dataSource, onNewAssessment }) {
  const showParcel = projectId && projectId !== DEFAULT_PROJECT_ID;
  const showRight = dataSource !== undefined || onNewAssessment;
  return (
    <header className="app-header">
      <div className="app-header-group">
        <div className="app-header-brand">
          <LogoIcon size={22} />
          <span>EIL-Viz</span>
        </div>
        {tagline && <span className="text-low">{tagline}</span>}
        {showParcel && (
          <>
            <span className="app-header-rule" aria-hidden="true" />
            <span className="text-low">Parcel</span>
            <span className="mono text-high app-header-parcel">{projectId}</span>
          </>
        )}
      </div>
      {showRight && (
        <div className="app-header-group">
          {dataSource !== undefined && (
            <span className="source-chip mono">
              <span className="source-chip-dot" aria-hidden="true" />
              {dataSourceLabel(dataSource)}
            </span>
          )}
          {onNewAssessment && (
            <button type="button" className="btn btn-primary no-print" onClick={onNewAssessment}>
              New assessment
            </button>
          )}
        </div>
      )}
    </header>
  );
}
