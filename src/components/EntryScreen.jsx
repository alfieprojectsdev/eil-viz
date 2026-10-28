import { useMemo } from "react";
import { extractPolygon } from "../lib/geojson";
import AppHeader from "./AppHeader";
import { TickIcon, ExclaimIcon } from "./Icons";
import "./EntryScreen.css";

export default function EntryScreen({ input, onInputChange, onRun }) {
  const check = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return { ok: true, corners: extractPolygon(input).corners };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }, [input]);

  const submit = (e) => {
    e.preventDefault();
    if (check?.ok) onRun();
  };

  return (
    <div className="screen">
      <AppHeader tagline="Earthquake-induced landslide check, Phase 1" />
      <main className="entry">
        <form className="entry-form" onSubmit={submit} aria-labelledby="entry-heading">
          <div className="entry-intro">
            <h1 id="entry-heading">Assess a parcel</h1>
            <p className="text-low">Paste the parcel boundary as GeoJSON. The result shows whether it can be certified safe from earthquake-induced landslides.</p>
          </div>

          <div className="entry-field">
            <label htmlFor="geojson">Parcel boundary (GeoJSON)</label>
            <textarea
              id="geojson"
              rows={14}
              spellCheck={false}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={'{"type": "Polygon", "coordinates": [[[121.05, 14.52], ...]]}'}
              aria-describedby="geojson-check geojson-help"
            />
            <span id="geojson-check" className="entry-check" aria-live="polite">
              {check?.ok && (
                <span className="entry-check-ok"><TickIcon size={16} />Polygon found, {check.corners} corners</span>
              )}
              {check && !check.ok && (
                <span className="entry-check-bad"><ExclaimIcon size={16} />{check.message}</span>
              )}
            </span>
            <span id="geojson-help" className="entry-help text-low">
              Accepts a Polygon, a Feature, or a FeatureCollection (its first Polygon is used). Coordinates in WGS84 longitude, latitude.
            </span>
          </div>

          <div className="entry-actions">
            <button type="submit" className="btn btn-primary btn-large" disabled={!check?.ok}>Run assessment</button>
            <span className="text-low">A large parcel can take a few minutes.</span>
          </div>
        </form>

        <aside className="card entry-aside" aria-labelledby="phast-heading">
          <h2 id="phast-heading">Coming from PHAST?</h2>
          <p>Draw the parcel in PHAST, then choose Map Tools, then EIL Analysis. This page opens with the parcel filled in and runs the assessment straight away.</p>
          <div className="entry-aside-rule" />
          <h2>What gets checked</h2>
          <ol>
            <li>Slope stability: how much of the lot is steeper than the review and susceptible thresholds.</li>
            <li>Depositional runout: whether debris from higher ground could reach the lot.</li>
          </ol>
          <p className="text-low">Both must pass for the parcel to be certified safe.</p>
        </aside>
      </main>
    </div>
  );
}
