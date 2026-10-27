# EIL-Viz: Earthquake-Induced Landslide Visualization

`eil-viz` is the React frontend for the [`eil-calc`](https://github.com/alfieprojectsdev/eil-calc) Python engine. You give it a land parcel as GeoJSON; it sends the parcel to eil-calc's `POST /api/v1/assess` and draws the result as a slope heatmap and a runout elevation profile.

Built with [Vite 7](https://vitejs.dev/), React 19 and Recharts 3.

## Features

- Accepts a GeoJSON Feature, a FeatureCollection (the first Polygon feature is used, so a leading LineString is skipped) or a bare Polygon geometry.
- Slope heatmap drawn on an HTML5 canvas from `_viz_grid`. Blue-green below 14°, amber from 14° to 16°, crimson above 16°, using the breakpoints in `src/constants/status.js`. Hovering shows the slope of one pixel; the steepest pixel gets a white outline; pixels outside the parcel are cropped away.
- Elevation profile (Recharts `AreaChart`) for each steepest-descent path in `_viz_transects`. eil-calc returns at most three, sorted worst first, and a dropdown switches between them. The overall status badge always shows the worst case, whichever path is selected.
- Self-hosted DM Sans and Space Mono webfonts in `public/fonts/`, so the page renders on a LAN with no route to Google Fonts. The production build makes no runtime requests to any other origin.

## Prerequisites

- Node.js 20.19 or later (Vite 7's minimum; the `Dockerfile` builds on `node:22-alpine`).
- A running eil-calc backend. By default the dev server expects it at `http://127.0.0.1:8000`.

## Installation and setup

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

The app is served at `http://localhost:5173`.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with the `/api` proxy |
| `npm run build` | Static production build into `dist/` |
| `npm run preview` | Serves `dist/` locally, reusing the dev `/api` proxy |
| `npm run lint` | ESLint over the repo |

There is no test suite.

## How the frontend reaches the backend

The app fetches a relative path, `/api/v1/assess`, so the browser only ever talks to the origin that served the page. Whatever serves the page is responsible for forwarding `/api/` to eil-calc:

| Environment | Who forwards `/api/` | Where to | Configured by |
|---|---|---|---|
| `npm run dev` | Vite's dev-server proxy | `http://127.0.0.1:8000` | `VITE_DEV_API_TARGET` (read by `vite.config.js`) |
| Docker image | nginx | `http://backend:8000` | `EIL_API_UPSTREAM` at container start |

Because everything is same-origin, eil-calc runs with CORS off (`EIL_CORS_ALLOW_ORIGINS` empty).

To point the dev server at a backend on another machine:

```bash
VITE_DEV_API_TARGET=http://192.168.1.10:8000 npm run dev
```

`VITE_API_URL` is a build-time escape hatch: if set, the request goes to `${VITE_API_URL}/api/v1/assess` instead of the relative path. You'd then need eil-calc's CORS allow-list to include this app's origin. Leave it unset unless you have a reason.

## Running with eil-calc

1. Start eil-calc. It refuses to start unless a DEM resolves, so set `EIL_DEM_IFSAR_URI` and/or `EIL_DEM_SRTM_URI` first (see eil-calc's `.env.example`), then:
   ```bash
   uv run uvicorn api:app --host 127.0.0.1 --port 8000 --reload
   ```
   `curl http://127.0.0.1:8000/readyz` reports which DEM it loaded.
2. Run `npm run dev` here and open `http://localhost:5173`.
3. Paste a GeoJSON Polygon (or a Feature or FeatureCollection containing one) into the sidebar.
4. Click **Run Assessment**.

The app can also be opened from the PHAST Chrome extension (Map Tools → EIL Analysis). PHAST base64-encodes the drawn parcel into a `?geo=` query parameter; on load, `App.jsx` decodes it, strips it from the URL and runs the assessment.

## Deployment (Docker)

The `Dockerfile` builds the app with `VITE_API_URL=""` and serves `dist/` from `nginx:alpine`. At container start the nginx image renders `nginx.conf.template`, substituting only `EIL_API_UPSTREAM` (default `backend:8000`, which suits a compose service named `backend`).

```bash
docker build -t eil-viz .
docker run -p 8080:80 -e EIL_API_UPSTREAM=host.docker.internal:8000 eil-viz
```

eil-calc binds `127.0.0.1` by default, so for the example above start it with `EIL_HOST=0.0.0.0` or the container can't reach it.

The `/api/` location has a 300 s proxy timeout because a nationwide-DEM assessment can run past nginx's 60 s default. No compose file is checked in to this repo.

## Backend contract

The request body sent by `App.jsx`:

```json
{ "project_id": "web-ui-assessment", "geometry": { "type": "Polygon", "coordinates": [...] }, "config": { "mode": "compliance" } }
```

The fields of the 200 response that the UI reads (defined by `AssessmentResponse` in eil-calc's `api.py`):

```text
project_id                     header
data_source                    "ifsar" | "srtm" | "local_override" → header chip
phase_1_compliance
  overall_status               "CERTIFIED SAFE" | "MANUAL REVIEW REQUIRED" | "NOT CERTIFIED" → top-right badge
  slope_stability
    metrics.max_slope_degrees, metrics.avg_slope_degrees
    assessment.status          "SAFE" | "FLAG FOR REVIEW" | "SUSCEPTIBLE"
    _viz_grid                  2-D array of slope degrees; null outside the parcel
  depositional_hazard
    assessment.status          "SAFE (Beyond Runout)" | "PRONE (Within Runout Zone)"
    _viz_transects[]           up to 3, worst first
      metrics                  elevation_peak, elevation_site, delta_e, horizontal_distance_h, required_runout_3x
      assessment               status, is_compliant
      path[]                   { dist_m, elev_m }
```

The response also carries fields the UI ignores: `final_decision` (always `"PENDING"`), `phase_2_scientific` (`null` in compliance mode) and each transect's `threat_ratio`.

Errors: 400 for invalid geometry, 503 when the DEM is missing, 500 otherwise, all with a string `detail`. When a module can't produce a verdict, eil-calc returns **422** with an object `detail` of `{ "error": "assessment_incomplete", "module", "reason" }` rather than a partial 200.

Status strings and thresholds are copied by hand into `src/constants/status.js`. When eil-calc's `eil_status.py` or `slope_stability.py` changes, update that file to match.

## What you see on screen (plain-language guide for reviewers)

This section is for hazard assessors reviewing the interface: what each element means and where it comes from, so you can judge whether it communicates the assessment clearly. No coding needed. The screen is one dashboard (`src/components/EILViz.jsx`) fed by the eil-calc result, beside a sidebar where you paste the parcel.

### Top bar

- The project name and a data-source chip (for example `IFSAR 5m`) telling you which elevation map produced the result.
- The overall status badge (top-right) shows the parcel's worst-case verdict, whichever path you're viewing below. Intended colours: green for **CERTIFIED SAFE**, amber for **MANUAL REVIEW REQUIRED**, red for **NOT CERTIFIED**. See known limitations: **NOT CERTIFIED** currently shows green.
- A breadcrumb shows **Phase 1** (the slope and runout checks running today) and that **Phase 2** (the machine-learning model) is deferred.

### Tab 1: Slope Stability Heatmap

Answers "is the ground inside the lot too steep?"

- The coloured grid is the lot, one square per elevation pixel. Blue-green is gentle (below 14°), amber is the review band (14–16°), red is susceptible (above 16°). Hovering shows the exact slope at that square, and the steepest square has a white outline.
- The legend bar and the colour key under it show the same bands.
- The right-hand cards show max slope, average slope and the threshold band.
- The Assessment Logic card states the rule eil-calc applies. The lot is **SUSCEPTIBLE** if more than 1.5% of it is steeper than 16°, otherwise **FLAG FOR REVIEW** if more than 10% is between 14° and 16°, otherwise **SAFE**. A few isolated steep pixels don't condemn an otherwise flat lot, which is why max slope alone doesn't decide.

### Tab 2: Depositional Elevation Profile

Answers "could a landslide from higher ground reach the lot?"

- The green area chart is a side view of the steepest path from a nearby peak (red dot, left) down to the lot (blue dot). The X-axis is horizontal distance from the peak; the Y-axis is elevation.
- The red dashed line labelled `3×ΔE limit` marks the runout rule: debris is assumed to travel up to three times its fall height. If the lot (blue dot) sits beyond the dashed line it is **SAFE (Beyond Runout)**; if it falls short of it, **PRONE (Within Runout Zone)**.
- When there's more than one threatening path, a dropdown switches between up to three "critical paths" (path 1 is the worst). The small box restates the comparison in numbers, for example `620m > 510m`.
- The right-hand cards list peak elevation, site elevation, **ΔE** (the drop), **H** (horizontal travel) and the **3×ΔE limit**.

### How to give feedback

Name the tab and element (for example "Slope tab → Assessment Logic card") so the change can be found in `EILViz.jsx`.

## Project structure

```text
eil-viz/
├── public/
│   └── fonts/                  # Vendored woff2 files + fonts.css (generated)
├── scripts/
│   └── vendor-fonts.sh         # Regenerates public/fonts/ from Google Fonts
├── src/
│   ├── components/
│   │   └── EILViz.jsx          # Dashboard: header, both tabs, chart/canvas, and its own CSS in a <style> block
│   ├── constants/
│   │   └── status.js           # Thresholds and status strings mirrored from eil-calc
│   ├── data/
│   │   └── sample_payload.json # Old captured response; not imported anywhere
│   ├── App.jsx                 # Sidebar, GeoJSON parsing, ?geo= handling, fetch
│   ├── App.css                 # Sidebar and layout styles
│   ├── index.css               # Design tokens (--color-*) and global resets
│   └── main.jsx                # React mount point
├── Dockerfile                  # node:22 build → nginx:alpine serve
├── nginx.conf.template         # SPA fallback + /api/ reverse proxy
├── vite.config.js              # React plugin + dev /api proxy
├── eslint.config.js
├── index.html
├── start.bat                   # Windows dev launcher
└── package.json
```

## Known limitations

- **NOT CERTIFIED shows a green badge.** `statusBadge()` in `EILViz.jsx` checks `status.includes("CERTIFIED")`, which matches `"NOT CERTIFIED"`. A parcel that failed certification gets the same green badge as a certified one. `OVERALL_STATUS` in `status.js` also lacks the `NOT CERTIFIED` value.
- **422 errors show `[object Object]`.** `App.jsx` passes `errData.detail` straight to `new Error()`, but eil-calc's 422 `detail` is an object, so the assessor sees no reason.
- **The data-source chip always says `5m`.** It's hard-coded, so an SRTM (30 m) result reads `SRTM 5m` and a local override reads `LOCAL_OVERRIDE 5m`.
- **The runout legend mentions a shaded zone that isn't drawn.** Only the dashed line is rendered.
- **No error boundary.** An empty or malformed `_viz_grid` throws in `SlopeHeatmap` (it reads `grid[0].length`), and with no boundary the whole dashboard goes blank.
- **Elevation clamp.** Path points above 5000 m are replaced with the previous valid value, which can hide a corrupt DEM read.
- **Dead mock data.** `EILViz` has an inline `MOCK_RESULT` fallback, but `App.jsx` only renders it once real data exists, so the mock never shows. `src/data/sample_payload.json` isn't imported and predates the coverage-fraction rule (`threshold_used: "max_slope"`).
- **Legacy key fallback.** The UI still accepts the old single `_viz_transect` key from pre-`_viz_transects` responses.
- **One 564 kB JS bundle** (171 kB gzipped). Vite warns about it on every build; Recharts is most of it.
