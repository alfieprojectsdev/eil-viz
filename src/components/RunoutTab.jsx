import TransectChart from "./TransectChart";
import MetricCard from "./MetricCard";
import StatusBadge from "./StatusBadge";
import "./RunoutTab.css";

export default function RunoutTab({ dep, selectedPathIndex, onSelectPath }) {
  // Fallback for old single-transect structure in cached API hits
  const transects = dep._viz_transects || [{ metrics: dep.metrics, assessment: dep.assessment, path: dep._viz_transect || [] }];
  const activeTransect = transects[selectedPathIndex] || transects[0];

  // If we have an override in dep.assessment, use it
  const depStatus = activeTransect?.assessment?.status || dep.assessment.status;

  return (
    <div className="content">
      {/* Left: transect */}
      <div className="panel panel-grow">
        <div className="panel-header runout-header">
          <div className="runout-title">
            <span>Elevation Transect: Peak → Site (Topographic Runout Routing)</span>
            {transects.length > 1 && (
              <select
                className="path-select"
                value={selectedPathIndex}
                onChange={(e) => onSelectPath(Number(e.target.value))}
              >
                {transects.map((t, i) => (
                  <option key={i} value={i}>
                    Critical Path {i + 1} {i === 0 ? "(Highest Threat Severity)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <StatusBadge status={depStatus} />
        </div>
        <div className="panel-body">
          <TransectChart data={activeTransect} />
          <div className="annot-list">
            <div className="annot-row"><div className="annot-dot runout-key-peak" /><span>Peak: Trace origin from uphill walker</span></div>
            <div className="annot-row"><div className="annot-dot runout-key-site" /><span>Site: Closest parcel encroachment</span></div>
            <div className="annot-row"><div className="annot-dot runout-key-zone" /><span>3×ΔE runout zone (shaded red): anything left of dashed line is PRONE</span></div>
          </div>
        </div>
      </div>

      {/* Right: metrics */}
      <div className="side-column side-column-narrow">
        <div className="panel">
          <div className="panel-header">Runout Metrics</div>
          <div className="panel-body">
            <div className="metrics-grid metrics-grid-single">
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
          <div className="runout-status">{activeTransect.assessment.status}</div>
        </div>

        <div className="panel">
          <div className="panel-header">Algorithm</div>
          <div className="panel-body algorithm-body">
            <div>1. Walk uphill from parcel</div>
            <div>2. Map multiple ridge peaks</div>
            <div>3. ΔE = E_peak − E_site</div>
            <div>4. Route flow down to site</div>
            <div>5. Check H &gt; 3 × ΔE per path</div>
          </div>
        </div>
      </div>
    </div>
  );
}
