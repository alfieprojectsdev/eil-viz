# EIL-Viz: Earthquake-Induced Landslide Visualization

`eil-viz` is the React frontend for the [`eil-calc`](https://github.com/alfieprojectsdev/eil-calc) Python engine. You give it a land parcel as GeoJSON; it sends the parcel to eil-calc's `POST /api/v1/assess` and shows the Phase 1 verdict with the two checks behind it: a slope heatmap and a runout elevation profile.

Built with [Vite 7](https://vitejs.dev/) and React 19. Charts are plain canvas and SVG; there's no charting library.

## Features

- Four screens, one at a time: new assessment, running, result, and could-not-complete. A run always clears the previous result, so a failed run never leaves another parcel's verdict on screen.
- Accepts a GeoJSON Feature, a FeatureCollection (the first Polygon feature is used, so a leading LineString is skipped) or a bare Polygon geometry. The entry screen checks the GeoJSON as you type and won't send anything it can't parse.
- The verdict comes first, with one sentence per check giving the numbers that decided it. CERTIFIED SAFE, MANUAL REVIEW REQUIRED and NOT CERTIFIED differ in border style, fill and icon as well as colour, and anything unrecognised shows as NOT CERTIFIED.
- Slope heatmap drawn on a canvas from `_viz_grid`, with the coverage shares (eil-calc `coverage_susceptible` / `coverage_flag`) drawn as bars against their limits. The colour scale jumps in lightness at 14° and 16°.
- Elevation profile (SVG) for each path in `_viz_transects`, with the 3×ΔE debris reach shaded and the distance H marked.
- Cancel while running, and a 5-minute client-side limit to match nginx's proxy timeout.
- Print report: printing lays out both checks on a light background.
- Self-hosted IBM Plex Sans and IBM Plex Mono in `public/fonts/`, so the page renders on a LAN with no route to Google Fonts. The production build makes no runtime requests to any other origin.

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
3. Paste a GeoJSON Polygon (or a Feature or FeatureCollection containing one) into **Parcel boundary**. The line under the box says whether a polygon was found.
4. Click **Run assessment**.

The app can also be opened from the PHAST Chrome extension (Map Tools → EIL Analysis). PHAST base64-encodes the drawn parcel into a `#geo=` fragment; on load, `App.jsx` decodes it, strips it from the URL and runs the assessment, starting on the running screen. The fragment never leaves the browser, so the parcel stays out of nginx's and any proxy's logs. The parcel is read only when the page loads, so PHAST has to open a new tab rather than change the fragment of an open one.

Older PHAST builds send a `?geo=` query parameter instead, without URL-encoding the base64. The app still reads it and turns the spaces `URLSearchParams` makes of `+` back into `+`. The nginx access log uses a format without query strings or referers, so those parcels don't reach the container log either.

## Deployment (Docker)

The `Dockerfile` builds the app with `VITE_API_URL=""` and serves `dist/` from `nginx:alpine`. At container start the nginx image renders `nginx.conf.template`, substituting only `EIL_API_UPSTREAM` (default `backend:8000`, which suits a compose service named `backend`).

```bash
docker build -t eil-viz .
docker run -p 8080:80 -e EIL_API_UPSTREAM=host.docker.internal:8000 eil-viz
```

eil-calc binds `127.0.0.1` by default, so for the example above start it with `EIL_HOST=0.0.0.0` or the container can't reach it.

The `/api/` location has a 300 s proxy timeout because a nationwide-DEM assessment can run past nginx's 60 s default. The app stops waiting at the same 5 minutes (`ASSESS_TIMEOUT_MS` in `src/lib/api.js`), so the dev server, which has no timeout, behaves the same. No compose file is checked in to this repo.

## Backend contract

The request body sent by `src/lib/api.js`:

```json
{ "project_id": "web-ui-assessment", "geometry": { "type": "Polygon", "coordinates": [...] }, "config": { "mode": "compliance" } }
```

The fields of the 200 response that the UI reads (defined by `AssessmentResponse` in eil-calc's `api.py`):

```text
project_id                     header; hidden when it's the default "web-ui-assessment"
data_source                    "ifsar" | "srtm" | "local_override" → header chip
phase_1_compliance
  overall_status               "CERTIFIED SAFE" | "MANUAL REVIEW REQUIRED" | "NOT CERTIFIED" → verdict
  slope_stability
    metrics.max_slope_degrees, metrics.avg_slope_degrees
    metrics.coverage_susceptible, metrics.coverage_flag            fractions 0-1 (eil-calc 04c6a1d+)
    assessment.status          "SAFE" | "FLAG FOR REVIEW" | "SUSCEPTIBLE"
    assessment.coverage_limit_susceptible, coverage_limit_flag     0.015, 0.10 (eil-calc 04c6a1d+)
    assessment.threshold_flag_deg, threshold_susceptible_deg       14, 16 (eil-calc 84daae6+)
    _viz_grid                  2-D array of slope degrees; null outside the parcel
  depositional_hazard
    assessment.status          "SAFE (Beyond Runout)" | "PRONE (Within Runout Zone)"
    assessment.no_source_found true only for the no-peak fallback (eil-calc 84daae6+)
    assessment.search_radius_m 1000 today; quoted in the no-peak wording
    _viz_transects[]           up to 3, worst first
      metrics                  elevation_peak, elevation_site, delta_e, horizontal_distance_h, required_runout_3x
      assessment               status, is_compliant
      path[]                   { dist_m, elev_m }
```

The response also carries fields the UI ignores: `final_decision` (always `"PENDING"`), `phase_2_scientific` (`null` in compliance mode; the footer says so if it isn't) and each transect's `threat_ratio`.

Thresholds and limits are read from the response when present. `src/constants/status.js` keeps hand-copied fallbacks for older backends, plus the status strings. When eil-calc's `eil_status.py` or `slope_stability.py` changes, update that file to match. A backend without the coverage fields still works; the coverage card says the shares aren't reported.

When eil-calc finds no higher ground near the lot it returns SAFE with a zero drop and a one-point path. The runout view shows that as "No path from higher ground" instead of `H 0 m > 3 × ΔE 0 m`. It reads `no_source_found` when the backend sends it, and otherwise recognises the case by `delta_e == 0` with a single path point. The wording says "no higher ground within `search_radius_m`"; it doesn't treat the radius as a limit on H, which is measured along the descent path and can be longer.

Errors: 400 for invalid geometry, 503 when the DEM is missing, 500 otherwise, all with a string `detail`. When a module can't produce a verdict, eil-calc returns **422** with an object `detail` of `{ "error": "assessment_incomplete", "module", "reason" }` rather than a partial 200. Each kind gets its own error screen (`src/components/ErrorScreen.jsx`), and every one says the parcel is not certified. Only text that's safe for assessors is shown as eil-calc's reason: the 400 geometry message, FastAPI's validation messages, and the fixed 422 reasons from `slope_stability` and `depositional_hazard`. The 503 and 500 strings can contain server file paths or internal state, and the `orchestrator` 422 echoes internal status strings, so those get fixed wording and the raw body goes to the browser console. A response the dashboard can't draw lands on the same screen through `ResultBoundary`.

The UI never shows CERTIFIED SAFE unless both checks are also SAFE. If `overall_status` says certified while a check failed, the verdict shows NOT CERTIFIED and says the two disagree.

## Fixtures

`fixtures/responses/` holds real eil-calc responses, copied from eil-calc's `tests/fixtures/responses/` at a1c4cde. Each file is `{ request, status_code, response }`:

| File | Outcome |
|---|---|
| `certified_safe.json` | CERTIFIED SAFE, one measured path |
| `certified_safe_no_source.json` | CERTIFIED SAFE, no higher ground (`no_source_found`) |
| `manual_review_flag.json` | MANUAL REVIEW REQUIRED, 77.6% in the 14–16° band |
| `not_certified_susceptible.json` | NOT CERTIFIED on slope, runout SAFE |
| `not_certified_prone.json` | NOT CERTIFIED on runout, worst path PRONE and the second SAFE |
| `assessment_incomplete_422.json` | 422 from `slope_stability` |

The 200s are full runs on about 31 m parcels over eil-calc's IfSAR test tile. Nothing imports them; they're for checking the UI by hand (the dev server serves them at `/fixtures/responses/<name>.json`). eil-calc regenerates its copies with `generate_response_fixtures.py`; copy them again when the contract changes.

## What you see on screen (plain-language guide for reviewers)

This section is for hazard assessors reviewing the interface: what each element means and where it comes from, so you can judge whether it communicates the assessment clearly. No coding needed.

### New assessment

Paste the parcel boundary and click **Run assessment**. The line under the box confirms a polygon was found and how many corners it has, or says what's wrong with the GeoJSON. The panel on the right explains the PHAST route and what gets checked.

### Running

Shows the time elapsed and that the app gives up after 5 minutes. **Cancel** goes back to the boundary, which is kept.

### Result

- The top bar names the elevation map that produced the result (`IfSAR DEM · 5 m`, `SRTM DEM · 30 m` or `Local DEM`).
- The verdict band shows the overall result. CERTIFIED SAFE has a green outline and a tick, MANUAL REVIEW REQUIRED a dashed amber outline and a warning sign, NOT CERTIFIED a solid red block and a stop sign. Next to it, one line says which checks failed.
- The two check cards below give each check's status and the numbers that decided it, for example "4.8% of the lot is steeper than 16°. The limit is 1.5%." Clicking a card shows that check underneath.

#### Slope stability

Answers "is the ground inside the lot too steep?"

- The coloured grid is the lot, one square per elevation pixel. Blue-green is gentle (14° or less), amber is the review band (over 14° up to 16°), red is susceptible (over 16°, darkening to 25°). Each band starts with a jump in lightness, so they can be told apart without relying on colour. Hovering shows the exact slope of a square, and the steepest square has a white outline.
- **What decides the verdict** shows the share of the lot steeper than 16° and the share between 14° and 16°, each as a bar with a white mark at its limit (1.5% and 10%). The lot is **SUSCEPTIBLE** if more than 1.5% is steeper than 16°, otherwise **FLAG FOR REVIEW** if more than 10% is between 14° and 16°, otherwise **SAFE**. A few isolated steep pixels don't condemn an otherwise flat lot, which is why the steepest pixel alone doesn't decide.
- Below that: the steepest pixel and the average slope.

#### Depositional runout

Answers "could a landslide from higher ground reach the lot?"

- The chart is a side view of the steepest path from a nearby peak (white triangle, left) down to the lot (blue square). The horizontal axis is distance from the peak; the vertical axis is elevation. Hovering gives the distance and elevation under the pointer.
- The shaded red zone, ending at the dashed line, is how far debris is assumed to travel: three times the drop (3 × ΔE). If the lot sits beyond the dashed line the path is **SAFE (beyond runout)**; inside it, **PRONE (within runout zone)**. The blue bracket under the axis is H, the distance from the peak to the lot.
- Up to three paths are shown as buttons, worst first. Any PRONE path fails the check.
- The box on the right restates the comparison, for example `H 400 m ≤ 3 × ΔE 510 m`, and the list below gives peak and lot elevation, the drop, H and the debris reach.

### Could not complete

Shown instead of a result whenever no verdict was produced. It names the kind of failure, which check stopped (for a 422), eil-calc's reason, and what to do next.

### How to give feedback

Name the screen and element (for example "Result → slope → What decides the verdict") so the change can be found in `src/components/` (the slope view is `SlopeView.jsx`, the runout view `RunoutView.jsx`).

## Project structure

```text
eil-viz/
├── public/
│   └── fonts/                  # Vendored woff2 files + fonts.css (generated)
├── scripts/
│   └── vendor-fonts.sh         # Regenerates public/fonts/ from Google Fonts
├── src/
│   ├── components/             # Each .jsx imports the .css file of the same name
│   │   ├── EntryScreen.jsx     # GeoJSON box with live check, PHAST note
│   │   ├── LoadingScreen.jsx   # Elapsed time, timeout, Cancel
│   │   ├── ErrorScreen.jsx     # One screen per failure kind; always "not certified"
│   │   ├── ResultScreen.jsx    # Verdict band, check cards, active check, print handling
│   │   ├── ResultBoundary.jsx  # Error boundary: a result that can't be drawn fails closed
│   │   ├── AppHeader.jsx       # Logo, parcel ID, DEM chip, New assessment
│   │   ├── VerdictStamp.jsx    # Overall verdict: outlined, dashed or solid
│   │   ├── StatusBadge.jsx     # Check-level status: icon + tone
│   │   ├── SlopeView.jsx       # Heatmap card, legend, coverage bars, figures
│   │   ├── SlopeHeatmap.jsx    # Canvas heatmap of _viz_grid with hover readout
│   │   ├── CoverageBar.jsx     # One coverage share against its limit
│   │   ├── RunoutView.jsx      # Path buttons, profile, path verdict and figures
│   │   ├── TransectProfile.jsx # SVG elevation profile for one path
│   │   └── Icons.jsx           # Inline SVG icons
│   ├── constants/
│   │   └── status.js           # Status strings, fallback thresholds, labels
│   ├── lib/
│   │   ├── api.js              # POST /api/v1/assess, timeout, error classification
│   │   ├── assessment.js       # Status → tone, displayed verdict, thresholds from the response
│   │   ├── geojson.js          # Pulls the Polygon out of pasted GeoJSON
│   │   ├── slopeColor.js       # Slope → colour, between the --color-slope-* tokens
│   │   └── tokens.js           # Reads --color-* tokens for canvas, which takes plain colour strings
│   ├── App.jsx                 # Screen state, #geo= handling, cancel
│   ├── index.css               # Design tokens (--color-*), fonts, shared button/card styles, print tokens
│   └── main.jsx                # React mount point
├── fixtures/responses/      # Real eil-calc responses for manual checks (see Fixtures)
├── Dockerfile                  # node:22 build → nginx:alpine serve
├── nginx.conf.template         # SPA fallback + /api/ reverse proxy
├── vite.config.js              # React plugin + dev /api proxy
├── eslint.config.js
├── index.html
├── start.bat                   # Windows dev launcher
└── package.json
```

## Known limitations

- `?geo=` is still accepted for PHAST builds that predate `#geo=`. Drop it one PHAST release after the switch. Until then a `?geo=` parcel still reaches any proxy in front of nginx, and nginx's error log, which quotes the request line when a request fails.
- Path points above 5000 m are replaced with the previous valid elevation, which can hide a corrupt DEM read.
- The UI still accepts the old single `_viz_transect` key from responses that predate `_viz_transects`.
- The layout is designed for 1280 to 1440 px. It wraps down to phone width without scrolling sideways, but the runout chart's labels get small there.
- Dark theme only on screen. The light colours exist only in the print stylesheet.
- No map: the heatmap is an abstract grid, because the app has no offline tiles and eil-calc returns no coordinates for the grid.
- Cancel stops the browser waiting, but eil-calc runs the request to completion anyway (`assess_parcel` is a sync handler, so a client disconnect doesn't stop it).
- `_viz_grid` is eil-calc's whole 500 m slope window, about 207 × 207 cells (roughly 250 KB) for a 31 m parcel's 49 values. The heatmap crops to the parcel, but the payload isn't trimmed.
