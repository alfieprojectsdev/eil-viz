import { useState } from "react";
import {
  displayVerdict, slopeRules, slopeCoverage, formatPct, formatMetres,
  transectsOf, noRunoutSource, searchRadius, toneOf, runoutSafeNeedsCheck, straightLineH,
} from "../lib/assessment";
import { SLOPE_STATUS } from "../constants/status";
import AppHeader from "./AppHeader";
import VerdictStamp from "./VerdictStamp";
import StatusBadge from "./StatusBadge";
import SlopeView from "./SlopeView";
import RunoutView from "./RunoutView";
import RunoutCaution from "./RunoutCaution";
import { PrintIcon } from "./Icons";
import "./ResultScreen.css";

function slopeSentence(slope) {
  const rules = slopeRules(slope);
  const cov = slopeCoverage(slope);
  if (!cov) return <>Steepest pixel <strong className="mono">{slope.metrics.max_slope_degrees.toFixed(1)}°</strong>. This backend doesn't report the coverage shares.</>;
  const sus = <strong className="mono">{formatPct(cov.susceptible, rules.susceptibleLimit)}%</strong>;
  const flag = <strong className="mono">{formatPct(cov.flag, rules.flagLimit)}%</strong>;
  const status = slope.assessment.status;
  if (status === SLOPE_STATUS.SUSCEPTIBLE) {
    return <>{sus} of the lot is steeper than {rules.susceptibleDeg}°. The limit is {formatPct(rules.susceptibleLimit)}%.</>;
  }
  if (status === SLOPE_STATUS.FLAG) {
    return <>{flag} of the lot is between {rules.flagDeg}° and {rules.susceptibleDeg}°. The limit is {formatPct(rules.flagLimit)}%.</>;
  }
  const shares = <>{sus} is steeper than {rules.susceptibleDeg}° and {flag} is between {rules.flagDeg}° and {rules.susceptibleDeg}°.</>;
  if (status === SLOPE_STATUS.SAFE) return <>{shares} Both are under their limits.</>;
  return <>{shares} eil-calc returned a status this page doesn't recognise.</>;
}

function runoutSentence(dep) {
  const transects = transectsOf(dep);
  if (noRunoutSource(dep, transects)) {
    const radius = searchRadius(dep);
    return <>No higher ground {radius === null ? "near the lot" : <>within <strong className="mono">{formatMetres(radius)}</strong></>}, so no debris path reaches the lot.</>;
  }
  const m = transects[0].metrics;
  if (straightLineH(dep)) {
    return (
      <>The lot's edge is <strong className="mono">{formatMetres(m.horizontal_distance_h)}</strong> in a straight line from the worst peak; debris can travel <strong className="mono">{formatMetres(m.required_runout_3x)}</strong>.</>
    );
  }
  return (
    <>Along eil-calc's path, the lot is <strong className="mono">{formatMetres(m.horizontal_distance_h)}</strong> from the worst peak; debris can travel <strong className="mono">{formatMetres(m.required_runout_3x)}</strong>.</>
  );
}

const RUNOUT_LABEL = { safe: "SAFE (beyond runout)", danger: "PRONE (within runout)" };

export default function ResultScreen({ result, onNewAssessment }) {
  const [check, setCheck] = useState("slope");
  // Lives here so the chosen path survives switching checks.
  const [pathIndex, setPathIndex] = useState(0);

  const compliance = result.phase_1_compliance;
  const slope = compliance.slope_stability;
  const dep = compliance.depositional_hazard;
  const verdict = displayVerdict(compliance);
  const runoutTone = toneOf(dep.assessment.status);

  const cards = [
    { id: "slope", n: 1, title: "Slope stability", status: slope.assessment.status, sentence: slopeSentence(slope) },
    {
      id: "runout", n: 2, title: "Depositional runout", status: dep.assessment.status,
      label: RUNOUT_LABEL[runoutTone] ?? dep.assessment.status, sentence: runoutSentence(dep),
    },
  ];

  return (
    <div className="screen">
      <AppHeader projectId={result.project_id} dataSource={result.data_source} onNewAssessment={onNewAssessment} />

      <section className="verdict-band" aria-label="Verdict">
        <div className="verdict-row">
          <div className="verdict-main">
            <VerdictStamp status={verdict.status} tone={verdict.tone} />
            <div className="verdict-text">
              <span className="verdict-headline">{verdict.headline}</span>
              <span className="text-low">{verdict.detail}</span>
            </div>
          </div>
          <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}>
            <PrintIcon size={18} />Print report
          </button>
        </div>

        {runoutSafeNeedsCheck(dep) && (
          <RunoutCaution title="The runout pass isn't confirmed">
            eil-calc measures the distance H along its computed downhill path. The PHIVOLCS method (OHAS slide 30) measures a straight horizontal line from the source, roughly where the slope changes most, to the edge of the lot, which can be much shorter. Before relying on this result, measure that line in Google Earth for each path and check that it's more than 3 × the drop along it.
          </RunoutCaution>
        )}

        <div className="check-cards" role="tablist" aria-label="Checks">
          {cards.map(c => (
            <button
              key={c.id}
              type="button"
              role="tab"
              id={`tab-${c.id}`}
              aria-selected={check === c.id}
              aria-controls={`panel-${c.id}`}
              className={`check-card ${check === c.id ? "check-card-active" : ""}`}
              onClick={() => setCheck(c.id)}
            >
              <span className="check-card-head">
                <span className="eyebrow check-card-title">{c.n} · {c.title}</span>
                <StatusBadge status={c.status} label={c.label} />
              </span>
              <span className="check-card-sentence">{c.sentence}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Both stay mounted so the heatmap is already drawn when a printed
          report, which carries both checks, unhides the other panel. */}
      <main className="result-main" role="tabpanel" id="panel-slope" aria-labelledby="tab-slope" hidden={check !== "slope"}>
        <SlopeView slope={slope} />
      </main>
      <main className="result-main" role="tabpanel" id="panel-runout" aria-labelledby="tab-runout" hidden={check !== "runout"}>
        <RunoutView dep={dep} compliance={compliance} pathIndex={pathIndex} onSelectPath={setPathIndex} />
      </main>

      <footer className="result-footer text-low">
        <span>Phase 1 compliance: slope + runout</span>
        <span>Phase 2 (hybrid ML model): {result.phase_2_scientific ? "in the response, not shown here" : "not run"}</span>
        <span>Computed by eil-calc</span>
      </footer>
    </div>
  );
}
