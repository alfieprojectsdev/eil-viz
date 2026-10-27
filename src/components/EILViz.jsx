import { useState } from "react";
import Header from "./Header";
import SlopeTab from "./SlopeTab";
import RunoutTab from "./RunoutTab";
import "./EILViz.css";

export default function EILViz({ data }) {
  const [tab, setTab] = useState("slope");
  // Lives here rather than in RunoutTab so the chosen path survives a tab switch.
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);

  const compliance = data.phase_1_compliance;

  return (
    <div className="app">
      <Header
        projectId={data.project_id}
        dataSource={data.data_source}
        overallStatus={compliance.overall_status}
      />

      {/* Tabs */}
      <div className="tabs-row">
        <button className={`tab-btn ${tab === "slope" ? "active" : ""}`} onClick={() => setTab("slope")}>
          <span className="tab-icon">▦</span> Slope Stability Heatmap
        </button>
        <button className={`tab-btn ${tab === "dep" ? "active" : ""}`} onClick={() => setTab("dep")}>
          <span className="tab-icon">⛰</span> Depositional Elevation Profile
        </button>
      </div>

      {tab === "slope" && <SlopeTab slope={compliance.slope_stability} />}

      {tab === "dep" && (
        <RunoutTab
          dep={compliance.depositional_hazard}
          selectedPathIndex={selectedPathIndex}
          onSelectPath={setSelectedPathIndex}
        />
      )}
    </div>
  );
}
