import { MODULE_LABELS } from "../constants/status";
import AppHeader from "./AppHeader";
import { WarningIcon } from "./Icons";
import "./ErrorScreen.css";

// Title and advice per AssessmentError kind (src/lib/api.js). Every one of
// them states that the parcel is not certified.
const COPY = {
  invalid: {
    title: "The boundary isn't valid",
    advice: "Fix the GeoJSON and run the assessment again.",
  },
  incomplete: {
    title: "The assessment could not be completed",
  },
  unavailable: {
    title: "Elevation data is unavailable",
    advice: "Tell the administrator. Trying again won't help until the elevation data is back.",
  },
  timeout: {
    title: "The assessment took too long",
    advice: "Try again. If it keeps timing out, report it with the parcel boundary.",
  },
  server: {
    title: "The server couldn't finish the assessment",
    advice: "Try again. If it happens again, report it.",
  },
  network: {
    title: "The server couldn't be reached",
    advice: "Check the connection and try again.",
  },
  display: {
    title: "The result couldn't be displayed",
    advice: "eil-calc answered, but the answer couldn't be drawn. Report this with the parcel boundary.",
  },
};

// eil-calc raises a 422 from these modules when the parcel has no usable
// elevation pixels, or from the orchestrator when it gets a status it
// doesn't recognise.
function incompleteAdvice(module) {
  if (module === "orchestrator") {
    return "This is a fault in eil-calc, not in the boundary. Report it; trying again won't help.";
  }
  return "This happens when the boundary covers no usable elevation pixels, for example when it's smaller than one pixel or lies outside the elevation map. Check the boundary is in the right place.";
}

export default function ErrorScreen({ error, onEdit, onRetry }) {
  const copy = COPY[error.kind] ?? COPY.server;
  const isIncomplete = error.kind === "incomplete";
  const advice = isIncomplete ? incompleteAdvice(error.module) : copy.advice;
  let response;
  if (error.kind === "display") response = "Received";
  else if (error.status) response = `${error.status}${isIncomplete ? " assessment_incomplete" : ""}`;
  else response = error.kind === "invalid" ? "Not sent: checked in the browser" : "No response";
  // Only text eil-calc itself sent is labelled as its reason.
  const fromServer = error.reason !== undefined && error.kind !== "display";

  return (
    <div className="screen">
      <AppHeader />
      <main className="error-page">
        <section className="error-body" role="alert" aria-labelledby="error-heading">
          <div className="error-head">
            <span className="error-icon"><WarningIcon size={28} /></span>
            <div className="error-title">
              <h1 id="error-heading">{copy.title}</h1>
              <p>No verdict was produced, so this parcel is <strong className="text-high">not certified</strong>. Nothing from an earlier parcel is shown.</p>
            </div>
          </div>

          <div className="card error-detail">
            <div className="error-facts">
              {isIncomplete && (
                <div className="error-fact">
                  <span className="text-low">Check that stopped</span>
                  <span className="text-high">{MODULE_LABELS[error.module] ?? error.module ?? "Not given"}</span>
                </div>
              )}
              <div className="error-fact">
                <span className="text-low">Server response</span>
                <span className="mono text-high">{response}</span>
              </div>
            </div>
            <div className="error-fact">
              <span className="text-low">{fromServer ? "Reason given by eil-calc" : "What happened"}</span>
              <span className="mono text-high error-reason">{error.message}</span>
            </div>
            {advice && <p className="error-advice">{advice}</p>}
          </div>

          <div className="error-actions">
            <button type="button" className="btn btn-primary" onClick={onEdit}>Edit the boundary</button>
            {onRetry && error.kind !== "invalid" && error.kind !== "unavailable" && (
              <button type="button" className="btn btn-secondary" onClick={onRetry}>Try again</button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
