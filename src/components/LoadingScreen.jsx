import { useEffect, useState } from "react";
import { ASSESS_TIMEOUT_MS } from "../lib/api";
import AppHeader from "./AppHeader";
import "./LoadingScreen.css";

function clock(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function LoadingScreen({ startedAt, onCancel }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="screen">
      <AppHeader />
      <main className="loading">
        <section className="loading-body" role="status" aria-live="polite" aria-labelledby="loading-heading">
          <div className="loading-intro">
            <h1 id="loading-heading">Running the assessment</h1>
            <p className="text-low">Both checks run together on the server. Keep this page open.</p>
          </div>

          <div className="loading-progress">
            <div className="loading-track" aria-hidden="true"><div className="loading-sweep" /></div>
            <div className="loading-times">
              {/* Announcing every tick would flood a screen reader. */}
              <span aria-hidden="true">Elapsed <span className="mono text-high">{clock(Math.max(0, now - startedAt))}</span></span>
              <span className="text-low">Stops waiting after {clock(ASSESS_TIMEOUT_MS)}</span>
            </div>
          </div>

          <div className="card loading-steps">
            <span className="eyebrow">Being computed</span>
            <span><span className="mono loading-step-no">1</span>Slope of every elevation pixel inside the lot</span>
            <span><span className="mono loading-step-no">2</span>Steepest paths from nearby peaks down to the lot</span>
          </div>

          <div>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          </div>
        </section>
      </main>
    </div>
  );
}
