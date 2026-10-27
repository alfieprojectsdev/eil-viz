import { SLOPE_THRESHOLDS, COVERAGE_THRESHOLDS } from "../constants/status";
import SlopeHeatmap from "./SlopeHeatmap";
import SlopeLegend from "./SlopeLegend";
import MetricCard from "./MetricCard";
import StatusBadge from "./StatusBadge";
import "./SlopeTab.css";

export default function SlopeTab({ slope }) {
  return (
    <div className="content">
      {/* Left: heatmap */}
      <div className="panel panel-fixed">
        <div className="panel-header">
          <span>Pixel-level Gradient Map: Parcel Bounds</span>
          <StatusBadge status={slope.assessment.status} />
        </div>
        <div className="panel-body">
          <SlopeHeatmap data={slope} />
          <SlopeLegend />
          <div className="annot-list slope-key">
            <div className="annot-row"><div className="annot-dot slope-key-safe" /><span>Safe zone (&lt; {SLOPE_THRESHOLDS.flag}°)</span></div>
            <div className="annot-row"><div className="annot-dot slope-key-flag" /><span>Flag for review ({SLOPE_THRESHOLDS.flag}°–{SLOPE_THRESHOLDS.susceptible}°)</span></div>
            <div className="annot-row"><div className="annot-dot slope-key-susceptible" /><span>Susceptible (&gt; {SLOPE_THRESHOLDS.susceptible}°)</span></div>
            <div className="annot-row"><div className="annot-dot slope-key-max" /><span>Max slope pixel (white outline)</span></div>
          </div>
        </div>
      </div>

      {/* Right: metrics */}
      <div className="side-column">
        <div className="panel">
          <div className="panel-header">Computed Metrics</div>
          <div className="panel-body">
            <div className="metrics-grid">
              <MetricCard label="Max Slope" value={slope.metrics.max_slope_degrees.toFixed(1)} unit="°" highlight />
              <MetricCard label="Avg Slope" value={slope.metrics.avg_slope_degrees.toFixed(1)} unit="°" />
              <MetricCard label="Threshold" value={`${SLOPE_THRESHOLDS.flag}–${SLOPE_THRESHOLDS.susceptible}`} unit="°" />
              <MetricCard label="Algorithm" value="∇z" unit="" />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Assessment Logic</div>
          <div className="panel-body logic-body">
            <div><span className="logic-danger">IF</span> area &gt; {SLOPE_THRESHOLDS.susceptible}° exceeds {(COVERAGE_THRESHOLDS.susceptible * 100).toFixed(1)}% → <span className="logic-danger">SUSCEPTIBLE</span></div>
            <div><span className="logic-review">ELIF</span> area in {SLOPE_THRESHOLDS.flag}–{SLOPE_THRESHOLDS.susceptible}° exceeds {(COVERAGE_THRESHOLDS.flag * 100).toFixed(0)}% → <span className="logic-review">FLAG FOR REVIEW</span></div>
            <div><span className="logic-safe">ELSE</span> → <span className="logic-safe">SAFE</span></div>
            <div className="logic-note">
              Decision uses the coverage fraction (share of parcel pixels in each slope band), not a single max-slope value, so isolated steep pixels don't condemn an otherwise flat lot. Slope computed via np.gradient() over every pixel within the parcel.
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Why a Heatmap?</div>
          <div className="panel-body prose-body">
            Slope stability evaluates the entire 2D surface. A single profile line would under-report hazard if the steepest pixels are off-axis. Every pixel inside the parcel boundary is assessed independently: this view surfaces those hotspots directly.
          </div>
        </div>
      </div>
    </div>
  );
}
