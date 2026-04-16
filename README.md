# EIL-Viz: Earthquake-Induced Landslide Visualization

`eil-viz` is a React-based frontend web application that visually renders the geospatial topological assessments produced by the `eil-calc` Python engine. It provides an intuitive interface for assessing a land parcel's susceptibility to Earthquake-Induced Landslides (EIL).

Built with [Vite 7](https://vitejs.dev/) and React 19.

## Features

- **Dynamic GeoJSON Input:** Accepts raw GeoJSON — Feature, FeatureCollection (first Polygon used), or bare geometry.
- **Slope Heatmap:** HTML5 Canvas rendering of `_viz_grid` slope values. Colour scale: blue-green (< 10°) → amber (10–16°) → crimson (> 16°). Mouse tooltip on hover. Non-parcel pixels are cropped.
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

By default, the Vite dev server proxies `/api/*` requests to `http://127.0.0.1:8000` (the eil-calc default). To point at a different backend, set `VITE_API_URL` before starting:

```bash
VITE_API_URL=http://192.168.1.10:8000 npm run dev
```

The proxy is defined in `vite.config.js` and avoids CORS issues during development. For production builds, configure your reverse proxy or set `VITE_API_URL` at build time.

## Usage

1. Start the `eil-calc` backend:
   ```bash
   uv run uvicorn api:app --host 127.0.0.1 --port 8000 --reload
   ```
2. Open `http://localhost:5173` in your browser.
3. Paste a GeoJSON Polygon (or Feature/FeatureCollection containing a Polygon) into the sidebar.
4. Click **Run Assessment**. The slope heatmap and elevation profile will render from the backend response.

The app can also be launched directly from the **PHAST Chrome extension** (Map Tools → EIL Analysis) which encodes the drawn parcel boundary and opens this page automatically.

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
├── vite.config.js              # Dev server proxy (/api → eil-calc)
├── start.bat                   # Windows startup script
└── package.json
```

## Known limitations

- **`final_decision` always `"PENDING"`** — reflects the upstream eil-calc stub. The operative result is `overall_status` shown in the master status badge.
- **No production build configuration** — the app is development-only; there is no `vite.config.js` production target or static hosting setup.
- **Elevation sanitisation is a clamp, not a rejection** — values above 5000 m are clamped rather than flagged, which can silently mask corrupt DEM reads.
- **`_viz_transects` fallback** — the app accepts both `_viz_transects` (plural, current) and the legacy `_viz_transect` (singular) key for backwards compatibility with older eil-calc responses.
- **No error boundary on the canvas** — a malformed `_viz_grid` (wrong shape, all-null) will produce a blank heatmap with no user-visible error message.
