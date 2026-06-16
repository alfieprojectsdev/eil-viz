# EIL-Viz: Earthquake-Induced Landslide Visualization

`eil-viz` is a React-based frontend web application that visually renders the geospatial topological assessments produced by the `eil-calc` Python engine. It provides an intuitive interface for assessing a land parcel's susceptibility to Earthquake-Induced Landslides (EIL).

Built with [Vite 7](https://vitejs.dev/) and React 19.

## Features

- **Dynamic GeoJSON Input:** Accepts raw GeoJSON — Feature, FeatureCollection (first Polygon used), or bare geometry.
- **Slope Heatmap:** HTML5 Canvas rendering of `_viz_grid` slope values. Colour scale: blue-green (< 14°) → amber (14–16°) → crimson (> 16°), matching the `flag`/`susceptible` breakpoints in `src/constants/status.js`. Mouse tooltip on hover; the steepest pixel is outlined in white. Non-parcel pixels are cropped.
- **Elevation Profiles:** Recharts AreaChart of steepest-descent transect paths from `_viz_transects`. Dropdown to switch between the top-3 paths; master status always reflects the worst-case path regardless of selection.
- **Live Backend Integration:** `POST`s GeoJSON to the local `eil-calc` FastAPI backend and renders results in real-time.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- The local `eil-calc` backend must be running on port 8000 (see backend instructions)

## Installation & setup

**Linux / macOS:**
```bash
git clone git@github.com:alfieprojectsdev/eil-viz.git
cd eil-viz
npm install
npm run dev
```

**Windows:**
```bat
start.bat
```
`start.bat` runs `npm install` on first launch (skipped if `node_modules` exists), then starts the dev server.

The application will be available at `http://localhost:5173`.

## API URL configuration

The app sends its assessment request directly to `${VITE_API_URL}/api/v1/assess`, defaulting to `http://127.0.0.1:8000` when `VITE_API_URL` is unset (`App.jsx`). To point at a different backend, set it before starting:

```bash
VITE_API_URL=http://192.168.1.10:8000 npm run dev
```

Because the request goes to an absolute URL, cross-origin access is handled by eil-calc's own CORS middleware, not by the dev server.

## Usage

1. Start the `eil-calc` backend:
   ```bash
   uv run uvicorn api:app --host 127.0.0.1 --port 8000 --reload
   ```
2. Open `http://localhost:5173` in your browser.
3. Paste a GeoJSON Polygon (or Feature/FeatureCollection containing a Polygon) into the sidebar.
4. Click **Run Assessment**. The slope heatmap and elevation profile will render from the backend response.

The app can also be launched directly from the **PHAST Chrome extension** (Map Tools → EIL Analysis), which base64-encodes the drawn parcel boundary into a `?geo=` URL parameter; the page decodes it and runs the assessment automatically on load (`App.jsx`).

## What you see on screen (plain-language guide for reviewers)

This section is for hazard assessors reviewing the *interface* — what each element means and where it comes from — so you can judge whether it communicates the assessment clearly and suggest changes. No coding needed. The screen is one dashboard (`src/components/EILViz.jsx`) fed by the eil-calc result.

### Top bar

- **Project name** and a **data-source chip** (e.g. `IFSAR 5m`) — tells you which elevation map produced the result.
- **Overall status badge** (top-right): green = **CERTIFIED SAFE**, amber = **MANUAL REVIEW REQUIRED**, red = anything else. This badge always shows the parcel's *worst-case* verdict, regardless of which path you're viewing below.
- A breadcrumb shows **Phase 1** (the slope + runout checks running today) and that **Phase 2** (machine-learning model) is deferred/not yet active.

### Tab 1 — Slope Stability Heatmap

Answers "is the ground inside the lot too steep?" visually.

- The **coloured grid** is the lot, one square per elevation pixel. **Blue-green = gentle (< 14°)**, **amber = flag for review (14–16°)**, **red = susceptible (> 16°)**. Hovering shows the exact slope at that square. The single steepest square gets a **white outline**.
- The **legend** and the colour key below it spell out the same bands. (Colours/thresholds live in `src/constants/status.js`.)
- The right-hand cards show **max slope**, **average slope**, and the threshold band.
- ⚠️ **For your scrutiny:** the on-screen "Assessment Logic" card currently states the *old* rule — `IF max slope < 14° → SAFE … ELSE SUSCEPTIBLE`. The backend no longer decides this way; it uses **coverage fractions** (susceptible if > 1.5% of the lot is over 16°; flag if > 10% is in the 14–16° band). The badge/verdict is correct, but this explanatory card is out of date and should be rewritten — feedback welcome on the clearest wording.

### Tab 2 — Depositional Elevation Profile

Answers "could a landslide from higher ground reach the lot?".

- The **green area chart** is a side-view of the steepest path from the highest nearby **peak** (red dot, left) down to the **lot** (blue dot). The X-axis is horizontal distance from the peak; the Y-axis is elevation.
- The **red dashed line labelled `3×ΔE limit`** marks the runout rule: debris is assumed able to travel up to three times its fall height. If the lot (blue dot) sits **beyond** the dashed line it is **SAFE (Beyond Runout)**; if it falls **before** it (left side), it is **PRONE (Within Runout Zone)**.
- When several threatening approaches exist, a **dropdown** lets you switch between the top-3 "critical paths" (path 1 = highest threat). The small fact-box restates the comparison in numbers, e.g. `H > 3 × ΔE → 620 m > 510 m`.
- Right-hand cards list the underlying numbers: peak elevation, site elevation, **ΔE** (the drop), **H** (horizontal travel), and the **3×ΔE limit**.

### How to give feedback

Each element above maps to a named region in `EILViz.jsx`. When suggesting a change — wording, colour, what's missing, what's confusing — name the tab and element (e.g. "Slope tab → Assessment Logic card") so it can be located precisely.

## Project structure

```text
eil-viz/
├── public/
├── src/
│   ├── components/
│   │   └── EILViz.jsx          # Two-tab dashboard: slope heatmap + depositional profile
│   ├── constants/
│   │   └── status.js           # Shared threshold constants (slope degree breakpoints)
│   ├── data/
│   │   └── sample_payload.json # Fallback mock payload for offline UI testing
│   ├── App.jsx                 # GeoJSON input, API fetch, top-level layout
│   ├── App.css                 # Sidebar and viewport-specific styling
│   ├── index.css               # Global theme resets
│   └── main.jsx                # React mount point
├── index.html
├── vite.config.js              # Vite + React plugin config
├── start.bat                   # Windows startup script
└── package.json
```

## Known limitations

- **`final_decision` always `"PENDING"`** — reflects the upstream eil-calc stub. The operative result is `overall_status` shown in the master status badge.
- **On-screen "Assessment Logic" card is outdated** — the Slope tab still displays the legacy `max_slope < 14° → SAFE / < 16° → FLAG / else SUSCEPTIBLE` rule. The backend (`eil-calc`) actually decides by coverage fraction (> 1.5% over 16° → SUSCEPTIBLE; > 10% in 14–16° → FLAG). The verdict badge is driven by the backend and is correct; only this explanatory card is stale.
- **Dev-first build** — `npm run build` (`vite build`) produces a static `dist/`, and a `Dockerfile` + `nginx.conf` exist for container serving, but there is no documented production deployment target or environment-specific config.
- **Elevation sanitisation is a clamp, not a rejection** — values above 5000 m are clamped rather than flagged, which can silently mask corrupt DEM reads.
- **`_viz_transects` fallback** — the app accepts both `_viz_transects` (plural, current) and the legacy `_viz_transect` (singular) key for backwards compatibility with older eil-calc responses.
- **No error boundary on the canvas** — a malformed `_viz_grid` (wrong shape, all-null) will produce a blank heatmap with no user-visible error message.
